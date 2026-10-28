"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./configuracoes-pagamento.module.css";

type Forma = { id: string; nome: string; codigo: string; ativo: boolean };
type Condicao = Forma & { dias_vencimento: number[] };
type Tipo = "formas" | "condicoes";
const mensagem = (erro: unknown) => erro instanceof Error ? erro.message : "Não foi possível concluir a operação.";
const codigoDe = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
const lerDias = (valor: string) => {
  if (!/^\s*\d+(\s*,\s*\d+)*\s*$/.test(valor)) throw new Error("Informe dias separados por vírgula, como 0,30,60.");
  const dias = valor.split(",").map(v => Number(v.trim()));
  if (dias.length < 1 || dias.length > 60 || dias.some(v => !Number.isInteger(v) || v < 0 || v > 3650)) throw new Error("Informe de 1 a 60 prazos, entre 0 e 3650 dias.");
  if (new Set(dias).size !== dias.length || dias.some((v, i) => i > 0 && v <= dias[i - 1])) throw new Error("Informe os dias em ordem crescente, sem repetição.");
  return dias;
};

export default function ConfiguracoesPagamento({ empresaId }: { empresaId: string }) {
  const [tipo, setTipo] = useState<Tipo>("formas");
  const [formas, setFormas] = useState<Forma[]>([]);
  const [condicoes, setCondicoes] = useState<Condicao[]>([]);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [dias, setDias] = useState("0");
  const [editando, setEditando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const [f, c] = await Promise.all([
      supabase.from("gc_formas_pagamento").select("id,nome,codigo,ativo").eq("empresa_id", empresaId).order("nome"),
      supabase.from("gc_condicoes_pagamento").select("id,nome,codigo,ativo,dias_vencimento").eq("empresa_id", empresaId).order("nome"),
    ]);
    if (f.error || c.error) setErro(f.error?.message || c.error?.message || "Erro ao carregar cadastros.");
    else { setFormas((f.data || []) as Forma[]); setCondicoes((c.data || []) as Condicao[]); }
    setCarregando(false);
  }, [empresaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  function limpar() { setNome(""); setCodigo(""); setDias("0"); setEditando(null); setErro(""); }
  function mudarTipo(novo: Tipo) { setTipo(novo); limpar(); setSucesso(""); }
  function editar(item: Forma | Condicao) {
    setEditando(item.id); setNome(item.nome); setCodigo(item.codigo);
    setDias("dias_vencimento" in item ? item.dias_vencimento.join(",") : "0");
    setErro(""); setSucesso("");
  }
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(""); setSucesso("");
    const nomeFinal = nome.trim();
    const codigoFinal = codigo.trim().toLowerCase();
    if (nomeFinal.length < 2 || nomeFinal.length > (tipo === "formas" ? 80 : 100)) { setErro("Confira o nome informado."); return; }
    if (!/^[a-z0-9_]{2,40}$/.test(codigoFinal)) { setErro("O código deve ter de 2 a 40 caracteres: letras minúsculas, números ou _. "); return; }
    let vencimentos: number[] = [];
    try { if (tipo === "condicoes") vencimentos = lerDias(dias); } catch (err) { setErro(mensagem(err)); return; }
    setSalvando(true);
    try {
      const tabela = tipo === "formas" ? "gc_formas_pagamento" : "gc_condicoes_pagamento";
      const campos = { nome: nomeFinal, codigo: codigoFinal, ...(tipo === "condicoes" ? { dias_vencimento: vencimentos } : {}) };
      const resultado = editando
        ? await supabase.from(tabela).update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", editando).eq("empresa_id", empresaId).select("id")
        : await supabase.from(tabela).insert({ ...campos, empresa_id: empresaId }).select("id");
      if (resultado.error) throw resultado.error;
      if (!resultado.data?.length) throw new Error("Nenhum registro alterado. Verifique as permissões.");
      limpar(); setSucesso(editando ? "Cadastro atualizado." : "Cadastro criado."); await carregar();
    } catch (err) { setErro(mensagem(err)); } finally { setSalvando(false); }
  }
  async function alternar(item: Forma | Condicao) {
    setErro(""); setSucesso(""); setSalvando(true);
    try {
      const tabela = tipo === "formas" ? "gc_formas_pagamento" : "gc_condicoes_pagamento";
      const { data, error } = await supabase.from(tabela).update({ ativo: !item.ativo, atualizado_em: new Date().toISOString() }).eq("id", item.id).eq("empresa_id", empresaId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Nenhum registro alterado. Verifique as permissões.");
      setSucesso(item.ativo ? "Cadastro desativado." : "Cadastro ativado."); await carregar();
    } catch (err) { setErro(mensagem(err)); } finally { setSalvando(false); }
  }
  const itens = tipo === "formas" ? formas : condicoes;
  return <section className={styles.container}>
    <div className={styles.intro}><h2>Configurações de pagamento</h2><p>Personalize as opções disponíveis para esta empresa. Desativar não apaga o histórico.</p></div>
    <div className={styles.tabs} role="group" aria-label="Tipo de cadastro">
      <button type="button" className={tipo === "formas" ? styles.active : ""} onClick={() => mudarTipo("formas")}>Formas de pagamento</button>
      <button type="button" className={tipo === "condicoes" ? styles.active : ""} onClick={() => mudarTipo("condicoes")}>Condições de pagamento</button>
    </div>
    {erro && <p role="alert" className={styles.error}>{erro}</p>}
    {sucesso && <p role="status" className={styles.success}>{sucesso}</p>}
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={e => void salvar(e)}>
        <h3>{editando ? "Editar cadastro" : tipo === "formas" ? "Nova forma de pagamento" : "Nova condição de pagamento"}</h3>
        <label>Nome<input required maxLength={tipo === "formas" ? 80 : 100} value={nome} onChange={e => { setNome(e.target.value); if (!editando) setCodigo(codigoDe(e.target.value)); }} placeholder={tipo === "formas" ? "Ex.: Pix" : "Ex.: Entrada + 30/60 dias"} /></label>
        <label>Código<input required maxLength={40} value={codigo} onChange={e => setCodigo(e.target.value.toLowerCase())} placeholder="Ex.: pix ou entrada_30_60" /><small>Identificador único nesta empresa. Use letras minúsculas, números e _.</small></label>
        {tipo === "condicoes" && <label>Dias de vencimento<input required value={dias} onChange={e => setDias(e.target.value)} placeholder="0,30,60" /><small>0 = entrada/à vista. Exemplo: 0,30,60. Define prazos, não valores.</small></label>}
        <div className={styles.actions}><button type="submit" className={styles.primary} disabled={salvando}>{salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}</button>{editando && <button type="button" onClick={limpar} disabled={salvando}>Cancelar edição</button>}</div>
      </form>
      <div className={styles.list}><h3>{tipo === "formas" ? "Formas cadastradas" : "Condições cadastradas"}</h3>
        {carregando ? <p>Carregando cadastros…</p> : itens.length === 0 ? <p className={styles.empty}>Nenhum cadastro ainda. Utilize o formulário ao lado.</p> : <div className={styles.items}>{itens.map(item => <div key={item.id} className={styles.item}><div className={styles.itemText}><strong>{item.nome}</strong><small>{item.codigo}{"dias_vencimento" in item && Array.isArray(item.dias_vencimento)
  ? `· ${item.dias_vencimento.join(" / ")} dias`
  : ""}</small><span className={item.ativo ? styles.enabled : styles.disabled}>{item.ativo ? "Ativo" : "Inativo"}</span></div><div className={styles.actions}><button type="button" disabled={salvando} onClick={() => editar(item)}>Editar</button><button type="button" disabled={salvando} onClick={() => void alternar(item)}>{item.ativo ? "Desativar" : "Ativar"}</button></div></div>)}</div>}
      </div>
    </div>
  </section>;
}
