"use client";
import { useState } from "react";
import ConfiguracaoModal from "./ConfiguracaoModal";
import { supabase } from "@/lib/supabaseClient";
import { compararPrecosOrcamento, aplicarPrecosOrcamento, type ProjetoPreco, type MaterialPreco, type AlteracaoPreco, type PrecoAtual } from "@/utils/atualizarPrecosOrcamento";
import { identificarTabelaCliente } from "@/utils/tabelaClienteOrcamento";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function AtualizarPrecosOrcamento<T extends ProjetoPreco, M extends MaterialPreco>({ empresaId, cliente, projetos, avulsos, aplicar, calcularTotal }: {
  empresaId: string; cliente: string; projetos: T[]; avulsos: M[]; calcularTotal: (projetos: T[], avulsos: M[]) => number;
  aplicar: (projetos: T[], avulsos: M[]) => void;
}) {
  const [aberto, setAberto] = useState(false), [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [linhas, setLinhas] = useState<AlteracaoPreco[]>([]);
  const [selecionadas, setSelecionadas] = useState(new Set<string>());
  const [tabelas, setTabelas] = useState<{ id: string; nome: string }[]>([]);
  const [tabela, setTabela] = useState("");
  const [aviso, setAviso] = useState("");
  const [catalogos, setCatalogos] = useState<Record<string, PrecoAtual[]>>({});
  const escolherTabela = (id: string) => {
    setTabela(id); setSelecionadas(new Set());
    setLinhas(compararPrecosOrcamento(projetos, avulsos, catalogos[id] || []));
  };
  const consultar = async () => {
    setAberto(true); setOcupado(true); setErro(""); setAviso(""); setTabela(""); setCatalogos({}); setTabelas([]);
    setLinhas(compararPrecosOrcamento(projetos, avulsos, [])); setSelecionadas(new Set());
    try {
      const respostas = await Promise.all([
        supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId),
        supabase.from("vidros").select("id, nome, espessura, tipo, preco").eq("empresa_id", empresaId),
        supabase.from("vidro_precos_grupos").select("vidro_id, grupo_preco_id, preco").eq("empresa_id", empresaId),
        ...["perfis", "ferragens", "kits"].map(t => supabase.from(t).select("id, codigo, nome, cores, preco").eq("empresa_id", empresaId)),
        supabase.from("tabelas").select("id, nome").eq("empresa_id", empresaId).order("nome"),
      ]);
      if (respostas.some(r => r.error)) throw new Error("Não foi possível consultar todos os preços. Tente novamente.");
      const clientes = respostas[0].data as unknown as { nome: string; grupo_preco_id?: string | null }[];
      const grupoCliente = identificarTabelaCliente(clientes, cliente);
      const tabelasAtuais = respostas[6].data as unknown as { id: string; nome: string }[];
      setTabelas(tabelasAtuais);
      const precos = respostas[2].data as unknown as { vidro_id: string; grupo_preco_id: string; preco: number }[];
      const porTabela: Record<string, PrecoAtual[]> = {};
      for (const escolha of ["padrao", ...tabelasAtuais.map(t => String(t.id))]) {
      const grupo = escolha === "padrao" ? null : escolha;
      const catalogo: PrecoAtual[] = (respostas[1].data as unknown as { id: string; nome: string; espessura: string; tipo: string; preco: number | null }[]).map(v => {
        const vinculados = precos.filter(p => String(p.vidro_id) === String(v.id) && p.grupo_preco_id === grupo);
        return { id: String(v.id), vidro: true, descricao: [v.nome, v.espessura ? `${String(v.espessura).replace(/mm$/i, "").trim()}mm` : "", v.tipo].filter(Boolean).join(" "),
          preco: grupo ? vinculados.length === 1 ? vinculados[0].preco : null : v.preco };
      });
      respostas.slice(3, 6).forEach((r, index) => (r.data as unknown as { codigo: string; nome: string; cores: string; preco: number | null }[]).forEach(m => catalogo.push({ descricao: [m.codigo, m.nome, m.cores].filter(Boolean).join(" - "), alternativas: index === 2 ? [[m.nome, m.cores].filter(Boolean).join(" - ")] : [], preco: m.preco })));
      porTabela[escolha] = catalogo;
      }
      setCatalogos(porTabela);
      const identificada = grupoCliente === null ? "padrao" : grupoCliente;
      if (identificada && porTabela[identificada]) {
        setTabela(identificada);
        setLinhas(compararPrecosOrcamento(projetos, avulsos, porTabela[identificada]));
      } else {
        setAviso("Não foi possível identificar uma única tabela para este cliente. Escolha abaixo a tabela que deseja comparar. Os valores salvos estão mantidos.");
      }
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha na consulta."); }
    finally { setOcupado(false); }
  };
  const resultado = aplicarPrecosOrcamento(projetos, avulsos, linhas, selecionadas);
  const totalAnterior = calcularTotal(projetos, avulsos);
  const totalNovo = calcularTotal(resultado.projetos, resultado.avulsos);
  const diferenca = totalNovo - totalAnterior;
  return <>
    <button type="button" onClick={consultar} disabled={ocupado || (!projetos.length && !avulsos.length)} className="rounded-xl border border-border px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary disabled:opacity-50">Atualizar preços</button>
    <ConfiguracaoModal aberto={aberto} fechar={() => setAberto(false)} titulo="Comparar com os preços atuais" ocupado={ocupado}>
      <p className="mb-4 text-sm text-text-secondary">Selecione os materiais que deseja atualizar. Confira valores negociados e descontos antes de aplicar. Os demais preços serão mantidos. A nova revisão será registrada ao salvar o orçamento.</p>
      {ocupado && <p role="status">Consultando as tabelas disponíveis…</p>}
      {erro && <p role="alert" className="mb-3">{erro} Os valores abaixo são os que estão no orçamento. <button type="button" onClick={consultar} className="underline">Tentar novamente</button></p>}
      {!ocupado && !erro && <label className="mb-4 block text-sm">Tabela para comparação
        <select value={tabela} onChange={e => escolherTabela(e.target.value)} className="mt-2 block w-full rounded-lg border border-border bg-surface p-2">
          <option value="">Escolha uma tabela</option>
          <option value="padrao">Tabela padrão — preços do cadastro de vidros</option>
          {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        {aviso && !tabela && <span className="mt-2 block text-xs text-text-secondary">{aviso}</span>}
        <span className="mt-2 block text-xs text-text-secondary">A escolha vale somente para esta atualização e não altera o cadastro do cliente.</span>
      </label>}
      <>
        <label className="flex gap-2 text-sm mb-4"><input type="checkbox" checked={linhas.some(l => l.atual !== null) && linhas.filter(l => l.atual !== null).every(l => selecionadas.has(l.chave))} onChange={e => setSelecionadas(e.target.checked ? new Set(linhas.filter(l => l.atual !== null).map(l => l.chave)) : new Set())} />Selecionar todos os preços encontrados</label>
        <div className="max-h-80 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Material</th><th>Anterior</th><th>Atual</th></tr></thead><tbody>{linhas.map(l => <tr key={l.chave} className="border-t border-border"><td className="p-2"><label className="flex gap-2"><input type="checkbox" disabled={l.atual === null} checked={selecionadas.has(l.chave)} onChange={e => setSelecionadas(s => { const n = new Set(s); if (e.target.checked) n.add(l.chave); else n.delete(l.chave); return n; })} />{l.descricao}</label>{l.motivo && <p className="text-xs text-text-secondary mt-1">{l.motivo}</p>}</td><td className="p-2 whitespace-nowrap">{moeda(l.anterior)}</td><td className="p-2 whitespace-nowrap">{l.atual === null ? "Mantido" : moeda(l.atual)}</td></tr>)}</tbody></table></div>
        <p className="mt-4 text-sm">Total do orçamento: {moeda(totalAnterior)} → {moeda(totalNovo)} · Diferença: {moeda(diferenca)}</p>
        <p className="mt-2 text-xs text-text-secondary">O total considera o aproveitamento de barras configurado e mantém ajustes monetários existentes.</p>
        <button type="button" disabled={ocupado || !!erro || !tabela || !selecionadas.size || totalNovo < 0} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50 hover:bg-surface-secondary" onClick={() => { aplicar(resultado.projetos, resultado.avulsos); setAberto(false); }}>Aplicar preços selecionados</button>
      </>
    </ConfiguracaoModal>
  </>;
}
