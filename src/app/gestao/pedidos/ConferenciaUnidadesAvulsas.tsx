"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Situacao = "pendente" | "conferida" | "liberada";
type Unidade = {
  id: string;
  pedido_id: string;
  empresa_id: string;
  projeto_id: string;
  projeto_tipo: string | null;
  origem_campo: string;
  origem_linha_id: string;
  origem_linha_indice: number;
  numero_unidade: number;
  descricao: string | null;
  medida_original: string | null;
  largura_original_mm: number | null;
  altura_original_mm: number | null;
  largura_conferida_mm: number | null;
  altura_conferida_mm: number | null;
  observacao_conferencia: string | null;
  situacao: Situacao;
  versao: number;
};

const cores: Record<Situacao, string> = {
  pendente: "#8a641d",
  conferida: "#1c415b",
  liberada: "#2b8b7f",
};
const rotulos: Record<Situacao, string> = {
  pendente: "Pendente",
  conferida: "Conferida",
  liberada: "Liberada",
};
const borda = "1px solid #d5e0e4";
const botao = { border: borda, borderRadius: 8, padding: "8px 12px", cursor: "pointer" };

function medidaNumero(valor: string): number | null {
  const normalizado = valor.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 && numero <= 9999999999 ? numero : null;
}

function medidaOriginal(unidade: Unidade): string {
  if (unidade.largura_original_mm != null && unidade.altura_original_mm != null) {
    return `${unidade.largura_original_mm} × ${unidade.altura_original_mm} mm`;
  }
  return unidade.medida_original || "Não informada";
}

export default function ConferenciaUnidadesAvulsas({ pedidoId, empresaId, situacaoPedido, projetoId, origemCampo, integrado = false }: {
  pedidoId: string;
  empresaId: string;
  situacaoPedido: string;
  projetoId?: string;
  origemCampo?: string;
  integrado?: boolean;
}) {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [reabrindo, setReabrindo] = useState<string | null>(null);
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      // Paginação explícita: evita esconder unidades após o limite padrão da API.
      const todas: Unidade[] = [];
      for (let inicio = 0; ; inicio += 500) {
        const { data, error } = await supabase
          .from("gc_pedido_unidades")
          .select("id,pedido_id,empresa_id,projeto_id,projeto_tipo,origem_campo,origem_linha_id,origem_linha_indice,numero_unidade,descricao,medida_original,largura_original_mm,altura_original_mm,largura_conferida_mm,altura_conferida_mm,observacao_conferencia,situacao,versao")
          .eq("pedido_id", pedidoId)
          .eq("empresa_id", empresaId)
          .order("id", { ascending: true })
          .range(inicio, inicio + 499);
        if (error) throw error;
        const pagina = (data || []) as Unidade[];
        todas.push(...pagina);
        if (pagina.length < 500) break;
      }
      setUnidades(todas.filter(u => (!projetoId || u.projeto_id === projetoId) && (!origemCampo || u.origem_campo === origemCampo)));
      setErro("");
    } catch (e) {
      setErro((e as Error).message || "Não foi possível consultar as unidades.");
      setUnidades([]);
    } finally {
      setCarregando(false);
    }
  }, [pedidoId, empresaId, projetoId, origemCampo]);

  useEffect(() => { void carregar(); }, [carregar]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: Unidade[] }>();
    for (const unidade of unidades) {
      const chave = `${unidade.origem_campo}:${unidade.projeto_id}`;
      if (!mapa.has(chave)) mapa.set(chave, {
        nome: unidade.projeto_tipo || "Projeto sem identificação",
        itens: [],
      });
      mapa.get(chave)!.itens.push(unidade);
    }
    return Array.from(mapa.entries()).map(([chave, grupo]) => ({
      chave,
      ...grupo,
      itens: [...grupo.itens].sort((a, b) =>
        a.origem_linha_indice - b.origem_linha_indice ||
        a.numero_unidade - b.numero_unidade ||
        a.id.localeCompare(b.id)),
    }));
  }, [unidades]);

  const pendentes = unidades.filter(u => u.situacao === "pendente").length;
  const conferidas = unidades.filter(u => u.situacao === "conferida").length;
  const liberadas = unidades.filter(u => u.situacao === "liberada").length;
  const podeEditar = situacaoPedido === "conferencia";

  function iniciarConferencia(unidade: Unidade) {
    setErro("");
    setEditando(unidade.id);
    setReabrindo(null);
    setLargura(String(unidade.largura_conferida_mm ?? unidade.largura_original_mm ?? ""));
    setAltura(String(unidade.altura_conferida_mm ?? unidade.altura_original_mm ?? ""));
    setObservacao(unidade.observacao_conferencia ?? "");
  }

  async function conferir(unidade: Unidade) {
    if (!podeEditar || executando || unidade.situacao !== "pendente") return;
    const l = medidaNumero(largura);
    const a = medidaNumero(altura);
    if (l === null || a === null) {
      setErro("Informe largura e altura válidas e maiores que zero, em milímetros.");
      return;
    }
    setExecutando(true);
    setErro("");
    setAviso("");
    try {
      const { error } = await supabase.rpc("gc_conferir_unidade", {
        p_unidade_id: unidade.id,
        p_versao: unidade.versao,
        p_largura_mm: l,
        p_altura_mm: a,
        p_observacao: observacao.trim() || null,
      });
      if (error) throw error;
      setEditando(null);
      setAviso("Medidas conferidas e registradas no histórico.");
      await carregar();
    } catch (e) {
      setErro((e as Error).message || "Não foi possível conferir a unidade.");
    } finally {
      setExecutando(false);
    }
  }

  async function reabrir(unidade: Unidade) {
    if (!podeEditar || executando || unidade.situacao !== "conferida") return;
    if (motivo.trim().length < 10 || motivo.trim().length > 500) {
      setErro("Informe um motivo de 10 a 500 caracteres.");
      return;
    }
    setExecutando(true);
    setErro("");
    setAviso("");
    try {
      const { error } = await supabase.rpc("gc_reabrir_unidade", {
        p_unidade_id: unidade.id,
        p_versao: unidade.versao,
        p_motivo: motivo.trim(),
      });
      if (error) throw error;
      setReabrindo(null);
      setMotivo("");
      setAviso("Conferência reaberta com histórico.");
      await carregar();
    } catch (e) {
      setErro((e as Error).message || "Não foi possível reabrir a unidade.");
    } finally {
      setExecutando(false);
    }
  }

  return (
    <section aria-label="Conferência individual das peças deste projeto" style={{ border: borda, borderRadius: 12, padding: 12, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ color: "#1c415b", margin: "0 0 6px", fontSize: 13, fontWeight: 500 }}>Conferência das peças</h3>
          {!integrado && <p style={{ margin: 0, fontSize: 13 }}>Unidades físicas cadastradas para conferência.</p>}
        </div>
        <button type="button" style={{ ...botao, padding: "5px 8px", fontSize: 11 }} disabled={carregando || executando} onClick={() => void carregar()}>Atualizar</button>
      </div>

      <p style={{ fontSize: 12, marginTop: 10, color: "#4d6a70" }}>
        {unidades.length} peças · {pendentes} pendentes · {conferidas} conferidas · {liberadas} liberadas
      </p>
      {!integrado && <p style={{ fontSize: 12, color: "#8a641d" }}>Liberação parcial para produção ainda indisponível: depende das proteções de revisão e transição do pedido no banco.</p>}
      {erro && <p role="alert" style={{ color: "#b42318" }}>{erro}</p>}
      {aviso && <p role="status" style={{ color: "#2b8b7f" }}>{aviso}</p>}
      {carregando ? <p>Carregando unidades…</p> : unidades.length === 0 ? (
        <p>Nenhuma unidade encontrada. Verifique a inicialização do pedido e as permissões de leitura.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {grupos.map(grupo => {
            const pendentesGrupo = grupo.itens.filter(u => u.situacao === "pendente").length;
            return (
              <section key={grupo.chave} style={integrado ? {} : { border: borda, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {!integrado && <h4 style={{ margin: 0, color: "#1c415b" }}>{grupo.nome}</h4>}
                  <span style={{ fontSize: 12 }}>{grupo.itens.length} peças · {pendentesGrupo} pendentes</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {grupo.itens.map(u => (
                    <article key={u.id} style={{ borderBottom: borda, padding: "8px 4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <strong style={{ fontSize: 12, fontWeight: 500, color: "#1c415b" }}>
                          {u.descricao || `Vidro ${u.origem_linha_indice + 1}`} · Peça {u.numero_unidade}
                        </strong>
                        <span style={{ color: cores[u.situacao], fontSize: 11, fontWeight: 500 }}>{rotulos[u.situacao]}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#4d6a70", margin: "6px 0" }}>
                        Original: {medidaOriginal(u)} · Conferida: {u.largura_conferida_mm != null && u.altura_conferida_mm != null
                          ? `${u.largura_conferida_mm} × ${u.altura_conferida_mm} mm` : "—"}
                      </p>
                      {editando === u.id && podeEditar && u.situacao === "pendente" ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label>Largura (mm)<input style={{ display: "block", maxWidth: 160 }} inputMode="decimal" value={largura} onChange={e => setLargura(e.target.value)} disabled={executando} /></label>
                            <label>Altura (mm)<input style={{ display: "block", maxWidth: 160 }} inputMode="decimal" value={altura} onChange={e => setAltura(e.target.value)} disabled={executando} /></label>
                          </div>
                          <label>Observação (opcional)<textarea style={{ display: "block", width: "100%" }} maxLength={2000} value={observacao} onChange={e => setObservacao(e.target.value)} disabled={executando} /></label>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={botao} disabled={executando} onClick={() => void conferir(u)}>Confirmar medida</button>
                            <button type="button" style={botao} disabled={executando} onClick={() => setEditando(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : reabrindo === u.id && podeEditar && u.situacao === "conferida" ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <label>Motivo da reabertura<textarea style={{ display: "block", width: "100%" }} maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={executando} /></label>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={botao} disabled={executando} onClick={() => void reabrir(u)}>Confirmar reabertura</button>
                            <button type="button" style={botao} disabled={executando} onClick={() => setReabrindo(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : podeEditar ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {u.situacao === "pendente" && <button type="button" style={{ ...botao, padding: "5px 9px", fontSize: 12 }} disabled={executando} onClick={() => iniciarConferencia(u)}>Conferir</button>}
                          {u.situacao === "conferida" && <button type="button" style={botao} disabled={executando} onClick={() => { setReabrindo(u.id); setEditando(null); setMotivo(""); setErro(""); }}>Reabrir conferência</button>}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
