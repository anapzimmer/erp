
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calcularConjuntoBox2Folhas } from "@/utils/calculos-projetos/box2Folhas";
import { supabase } from "@/lib/supabaseClient";
import styles from "./pedidos.module.css";

type Projeto = Record<string, unknown>;
type Trilho = "Padrão" | "Até o teto";
type Contexto = { pedidoId: string; versaoPedido: number; situacaoPedido: string; projetoId: string; campo: string };
type Salvo = { versao: number; largura_conferida_mm: number | null; altura_conferida_mm: number | null };
function mensagemErro(erro: { message?: string; code?: string }) {
  return erro.code === "PGRST202" || erro.code === "42883"
    ? "A gravação da conferência ainda precisa ser ativada no banco. Suas medidas continuam nesta tela."
    : erro.message || "Não foi possível salvar. Suas medidas continuam nesta tela.";
}

function numeroPositivo(valor: unknown): number | null {
  if (typeof valor !== "number" && typeof valor !== "string") {
    return null;
  }

  const texto = String(valor).trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);

  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function trilhoValido(valor: unknown): Trilho | null {
  return valor === "Padrão" || valor === "Até o teto"
    ? valor
    : null;
}

function dimensao(largura: number, altura: number): string {
  return `${largura} × ${altura} mm`;
}

function Vao({
  numero,
  larguraOriginal,
  alturaOriginal,
  trilho,
  contexto,
}: {
  numero: number;
  larguraOriginal: number;
  alturaOriginal: number;
  trilho: Trilho;
  contexto: Contexto;
}) {
  const [largura, setLargura] = useState(String(larguraOriginal));
  const [altura, setAltura] = useState(String(alturaOriginal));
  const [salvo, setSalvo] = useState<Salvo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [motivo, setMotivo] = useState("");
  const [consulta, setConsulta] = useState(0);
  const [falhaLeitura, setFalhaLeitura] = useState(false);
  const trava = useRef(false);
  const motivoInput = useRef<HTMLInputElement>(null);
  const { pedidoId, projetoId, campo, versaoPedido, situacaoPedido } = contexto;
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data, error } = await supabase.from("gc_pedido_conjuntos")
        .select("versao,largura_conferida_mm,altura_conferida_mm")
        .eq("pedido_id", pedidoId).eq("projeto_id", projetoId).eq("origem_campo", campo)
        .eq("numero_conjunto", numero).maybeSingle();
      if (!ativo) return;
      if (error) { setErro(mensagemErro(error)); setFalhaLeitura(true); }
      else {
        setSalvo(data as Salvo | null); setErro(""); setFalhaLeitura(false);
        setLargura(String(data?.largura_conferida_mm ?? larguraOriginal));
        setAltura(String(data?.altura_conferida_mm ?? alturaOriginal));
      }
      setCarregando(false);
    }
    void carregar().catch(() => { if (ativo) { setErro("Não foi possível consultar a conferência. Tente novamente."); setFalhaLeitura(true); setCarregando(false); } });
    return () => { ativo = false; };
  }, [pedidoId, projetoId, campo, numero, larguraOriginal, alturaOriginal, consulta]);

  const larguraAtual = numeroPositivo(largura);
  const alturaAtual = numeroPositivo(altura);

  const alterado =
    larguraAtual !== Number(salvo?.largura_conferida_mm ?? larguraOriginal) ||
    alturaAtual !== Number(salvo?.altura_conferida_mm ?? alturaOriginal);
  const bloqueado = carregando || salvando || falhaLeitura || situacaoPedido !== "conferencia" || !projetoId;
  const motivoBloqueio = carregando ? "Aguarde o carregamento da conferência."
    : salvando ? "Gravando as medidas…"
    : falhaLeitura ? "Não foi possível carregar os dados. Clique em Tentar carregar novamente."
    : situacaoPedido !== "conferencia" ? "O pedido precisa estar em conferência para salvar."
    : !projetoId ? "Este projeto não possui identificação. Reabra o pedido para conferir."
    : salvo && !alterado ? "As medidas já estão salvas. Altere uma medida para salvar uma nova versão."
    : "";

  const previa = useMemo(() => {
    const l = numeroPositivo(largura);
    const a = numeroPositivo(altura);

    if (l === null || a === null) {
      return {
        erro: "Informe largura e altura positivas em milímetros.",
      } as const;
    }

    try {
      const original = calcularConjuntoBox2Folhas({
        largura: larguraOriginal,
        altura: alturaOriginal,
        trilho,
      });

      const conferido = calcularConjuntoBox2Folhas({
        largura: l,
        altura: a,
        trilho,
      });

      return { original, conferido } as const;
    } catch (erro) {
      return {
        erro:
          erro instanceof Error
            ? erro.message
            : "Medidas inválidas.",
      } as const;
    }
  }, [
    largura,
    altura,
    larguraOriginal,
    alturaOriginal,
    trilho,
  ]);

  function cancelarEdicao() {
    setLargura(String(salvo?.largura_conferida_mm ?? larguraOriginal));
    setAltura(String(salvo?.altura_conferida_mm ?? alturaOriginal));
    setMotivo("");
  }

  async function salvar() {
    if (trava.current || bloqueado || "erro" in previa || (salvo && !alterado)) return;
    if (motivo.trim().length < 3) {
      setErro("Preencha o motivo da conferência com pelo menos 3 caracteres. Ex.: Medição final na obra.");
      motivoInput.current?.focus();
      return;
    }
    trava.current = true; setSalvando(true); setErro("");
    try {
      const { data, error } = await supabase.rpc("gc_salvar_medidas_conjunto", {
        p_pedido: pedidoId, p_versao_pedido: versaoPedido, p_projeto: projetoId, p_campo: campo,
        p_numero: numero, p_versao_conjunto: salvo?.versao ?? 0,
        p_largura: larguraAtual, p_altura: alturaAtual, p_motivo: motivo.trim(),
      });
      if (error) { setErro(mensagemErro(error)); return; }
      const resultado = Array.isArray(data) ? (data.length === 1 ? data[0] : null) : data;
      if (!resultado || !Number.isInteger(resultado.versao)) throw new Error("Resposta de gravação inválida. Reabra a conferência para verificar.");
      setSalvo(resultado as Salvo);
      setLargura(String(resultado.largura_conferida_mm)); setAltura(String(resultado.altura_conferida_mm)); setMotivo("");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente."); }
    finally { trava.current = false; setSalvando(false); }
  }

  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <h4 style={{ margin: 0 }}>Vão {numero}</h4>

        <p style={{ fontSize: 12, margin: "6px 0" }}>
          Original: {dimensao(larguraOriginal, alturaOriginal)}
          {" · "}
          Trilho: {trilho}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <label>
          Largura conferida (mm)
          <input
            type="number"
            min="0.01"
            step="any"
            value={largura}
            disabled={bloqueado}
            onChange={(e) => setLargura(e.target.value)}
            style={{
              display: "block",
              maxWidth: 180,
            }}
          />
        </label>

        <label>
          Altura conferida (mm)
          <input
            type="number"
            min="0.01"
            step="any"
            value={altura}
            disabled={bloqueado}
            onChange={(e) => setAltura(e.target.value)}
            style={{
              display: "block",
              maxWidth: 180,
            }}
          />
        </label>
      </div>

      {"erro" in previa ? (
        <p role="alert" style={{ color: "#b42318" }}>
          {previa.erro}
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                fontSize: 12,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>
                    Peça
                  </th>
                  <th style={{ textAlign: "left" }}>
                    Fabricação original
                  </th>
                  <th style={{ textAlign: "left" }}>
                    Fabricação recalculada
                  </th>
                  <th style={{ textAlign: "left" }}>
                    Cobrança técnica*
                  </th>
                </tr>
              </thead>

              <tbody>
                {previa.conferido.pecas.map((peca, i) => (
                  <tr key={peca.tipo}>
                    <td style={{ padding: "9px 4px" }}>
                      {peca.tipo === "fixo"
                        ? "Vidro fixo"
                        : "Vidro móvel"}
                    </td>

                    <td>
                      {dimensao(
                        previa.original.pecas[i].fabricacao.largura,
                        previa.original.pecas[i].fabricacao.altura
                      )}
                    </td>

                    <td>
                      <strong>
                        {dimensao(
                          peca.fabricacao.largura,
                          peca.fabricacao.altura
                        )}
                      </strong>
                    </td>

                    <td>
                      {dimensao(
                        peca.cobranca.largura,
                        peca.cobranca.altura
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, margin: 0 }}>
            *Arredondamento técnico de 50 mm, apenas
            informativo. Não altera o preço contratado.
          </p>

          <p
            style={{
              fontSize: 12,
              margin: 0,
              color: "#8a641d",
            }}
          >
            {salvo && !alterado ? "Medidas do vão registradas no banco." : "Prévia: salve para registrar as medidas deste vão."}
            {" "}Produção não liberada. As peças individuais mantêm sua situação atual.
          </p>
        </>
      )}

      <label style={{ fontSize: 12 }}>Motivo da conferência (obrigatório)
        <input ref={motivoInput} value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={500}
          disabled={bloqueado} placeholder="Ex.: Medição final na obra" style={{ display: "block", width: "100%" }} />
        <span>Informe pelo menos 3 caracteres para registrar no histórico.</span>
      </label>
      {erro && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{erro}</p>}
      {falhaLeitura && <button type="button" onClick={() => { setCarregando(true); setConsulta(v => v + 1); }}>Tentar carregar novamente</button>}
      {situacaoPedido !== "conferencia" && <p role="status">A gravação está disponível somente enquanto o pedido estiver em conferência.</p>}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          borderTop: "1px solid var(--border)",
          paddingTop: 12,
        }}
      >
        <button type="button" className={styles.primary} onClick={() => void salvar()}
          disabled={bloqueado || "erro" in previa || (!!salvo && !alterado)}>
          {salvando ? "Salvando…" : "Salvar conferência"}
        </button>
        <button
          type="button"
          onClick={cancelarEdicao}
          disabled={bloqueado || !alterado}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "9px 14px",
            cursor: alterado ? "pointer" : "not-allowed",
            opacity: alterado ? 1 : 0.5,
          }}
        >
          Cancelar edição
        </button>

        <span
          role="status"
          style={{
            fontSize: 12,
            color: alterado ? "#8a641d" : "#2b8b7f",
          }}
        >
          {carregando ? "Carregando conferência…" : alterado
            ? "Alterações não salvas"
            : salvo ? `Conferência salva · versão ${salvo.versao}` : "Conferência ainda não salva"}
        </span>
      </div>
      {motivoBloqueio && <p role="status" style={{ fontSize: 12, margin: 0 }}>{motivoBloqueio}</p>}
    </article>
  );
}

export default function ConferenciaConjuntosBox2Folhas({
  projeto,
  pedidoId, versaoPedido, situacaoPedido, campo,
}: {
  projeto: Projeto;
} & Omit<Contexto, "projetoId">) {
  const largura = numeroPositivo(projeto.largura);
  const altura = numeroPositivo(projeto.altura);
  const trilho = trilhoValido(projeto.trilho);
  const quantidade = numeroPositivo(projeto.quantidade);

  const quantidadeInteira =
    quantidade !== null && Number.isSafeInteger(quantidade)
      ? quantidade
      : null;

  if (
    largura === null ||
    altura === null ||
    trilho === null ||
    quantidadeInteira === null ||
    quantidadeInteira > 100
  ) {
    return (
      <p
        role="alert"
        style={{
          fontSize: 12,
          color: "#8a641d",
        }}
      >
        Não foi possível gerar a prévia automaticamente:
        confira largura, altura, trilho e quantidade no
        projeto original. Nenhuma peça será liberada.
      </p>
    );
  }

  return (
    <section
      aria-label="Prévia de conferência por vão do Box 2 folhas"
      style={{
        display: "grid",
        gap: 12,
        marginTop: 12,
      }}
    >
      <p style={{ fontSize: 12, margin: 0 }}>
        Prévia de {quantidadeInteira} vão(s).
        Cada vão possui um vidro fixo e um móvel.
        Os valores abaixo são independentes e não
        são salvos automaticamente.
      </p>

      {Array.from(
        { length: quantidadeInteira },
        (_, i) => (
          <Vao
            key={`${pedidoId}-${versaoPedido}-${i}-${largura}-${altura}-${trilho}`}
            numero={i + 1}
            larguraOriginal={largura}
            alturaOriginal={altura}
            trilho={trilho}
            contexto={{ pedidoId, versaoPedido, situacaoPedido, campo, projetoId: String(projeto.id ?? "") }}
          />
        )
      )}
    </section>
  );
}
