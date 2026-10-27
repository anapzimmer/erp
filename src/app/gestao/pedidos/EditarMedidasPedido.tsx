"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { rotasRevisaoPedido } from "@/utils/rotasRevisaoPedido";
import { REVISAO_CALCULO_KEY, lerRevisaoCalculo, type RevisaoCalculo } from "@/utils/revisaoCalculoPedido";
import {camposRevisao,diferencasItens} from "@/utils/diferencasRevisaoPedido";
import {quantidadeProjetoPedido} from "@/utils/quantidadeProjetoPedido";
import styles from "./pedidos.module.css";
import ConferenciaUnidadesAvulsas from "./ConferenciaUnidadesAvulsas";

type Projeto = Record<string, unknown>;
type PedidoConferencia = { id: string; versao: number; situacao: string; origem_snapshot: Projeto | null };
const obj = (v: unknown): Projeto => v && typeof v === "object" && !Array.isArray(v) ? v as Projeto : {};
const lista = (v: unknown): Projeto[] => Array.isArray(v) ? v.filter(x => x && typeof x === "object" && !Array.isArray(x)).map(obj) : [];
const texto = (v: unknown): string => typeof v === "string" || typeof v === "number" ? String(v) : "";
const preenchido = (v: unknown): boolean => v !== undefined && v !== null && texto(v).trim() !== "";
const imagemValida = (v: unknown): v is string => typeof v === "string" && /^(\/(?!\/)|https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(v);
const medidaExibicao = (v: unknown): string => /^0\s*[x×]\s*0(?:\s*mm)?$/i.test(texto(v).trim()) ? "Não se aplica" : texto(v) || "—";
const adicional = (p: Projeto): boolean => p.tipo === "adicional" || /^(kit|perfil|ferragem)\s*:/i.test(texto(p.descricao || p.vidro));

function rota(p: Projeto): string {
  if (p.origemRota === "/calculo/calculovidro") return "/calculo/calculovidro";
  if (typeof p.origemRota === "string" && rotasRevisaoPedido.some(r => r === p.origemRota)) return p.origemRota;
  const nome = texto(p.projeto || p.descricao || p.nome).toLowerCase();
  if (nome.includes("vidros avulsos") || nome.includes("vidro avulso")) return "/calculo/calculovidro";
  if (nome.includes("box 2 folhas")) return "/box2fls";
  if (nome.includes("box de canto 3")) return "/boxcanto3f";
  if (nome.includes("box de canto")) return "/boxcanto";
  return "";
}

function Campo({ rotulo, valor }: { rotulo: string; valor: unknown }) {
  if (!preenchido(valor)) return null;
  return <p style={{ margin: "3px 0" }}><strong>{rotulo}:</strong> {texto(valor)}</p>;
}

function MedidaItem({ item, calculada = false }: { item: Projeto; calculada?: boolean }) {
  const valor = calculada ? item.medidaCalc : item.medidaReal ?? item.medida ?? (preenchido(item.largura) && preenchido(item.altura) ? `${texto(item.largura)} × ${texto(item.altura)} mm` : undefined);
  return <>{medidaExibicao(valor)}</>;
}

function corMaterial(item: Projeto): string {
  // Apenas campos de cor explicitamente salvos; não inferir cor pelo código do produto.
  const campos = [item.corSelecionada, item.cor, item.corMaterial, item.corKit, item.corFerragem, item.corPerfil, item.cor_acabamento];
  for (const campo of campos) {
    const valor = texto(campo).trim();
    if (valor && !/^(null|undefined|não informado|nao informado)$/i.test(valor)) return valor;
  }
  return "Não informada";
}

function TabelaTecnica({ itens, titulo }: { itens: Projeto[]; titulo: string }) {
  if (!itens.length) return null;
  const vidros = itens.filter(item => !adicional(item));
  const materiais = itens.filter(adicional);
  return <div style={{ marginTop: 14, minWidth: 0, maxWidth: "100%" }} aria-label={titulo}>
    {vidros.length > 0 && <section style={{ marginBottom: 18 }}>
      <h4 style={{ margin: "0 0 10px" }}>Relação de vidros</h4>
      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
        <table style={{ width: "100%", minWidth: 0, maxWidth: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 11 }}>
          <colgroup><col style={{ width: "9%" }} /><col style={{ width: "35%" }} /><col style={{ width: "28%" }} /><col style={{ width: "28%" }} /></colgroup>
          <thead><tr>
            {(["Qtd.", "Vidro", "Medida real", "Medida cálculo"] as const).map(cabecalho =>
              <th key={cabecalho} style={{ padding: "7px 4px", textAlign: "left", fontSize: 10, whiteSpace: "normal", overflowWrap: "anywhere" }}>{cabecalho}</th>
            )}
          </tr></thead>
          <tbody>{vidros.map((item, i) => <tr key={texto(item.id) || `vidro-${i}`}>
            <td style={{ padding: "8px 4px", verticalAlign: "top", overflowWrap: "anywhere" }}>{texto(item.qtd ?? item.quantidade) || "—"}</td>
            <td style={{ padding: "8px 4px", verticalAlign: "top", whiteSpace: "normal", overflowWrap: "anywhere" }}>{texto(item.vidro || item.descricao || item.nome) || "—"}</td>
            <td style={{ padding: "8px 4px", verticalAlign: "top", whiteSpace: "normal", overflowWrap: "anywhere" }}><MedidaItem item={item} /></td>
            <td style={{ padding: "8px 4px", verticalAlign: "top", whiteSpace: "normal", overflowWrap: "anywhere" }}><MedidaItem item={item} calculada /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
    {materiais.length > 0 && <section>
      <h4 style={{ margin: "0 0 10px" }}>Kits e ferragens <small style={{ fontWeight: 400 }}>({materiais.length} itens)</small></h4>
      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
        <table style={{ width: "100%", minWidth: 0, maxWidth: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 11 }}>
          <colgroup><col style={{ width: "10%" }} /><col style={{ width: "65%" }} /><col style={{ width: "25%" }} /></colgroup>
          <thead><tr>
            {(["Qtd.", "Material / descrição", "Cor"] as const).map(cabecalho =>
              <th key={cabecalho} style={{ padding: "7px 4px", textAlign: "left", fontSize: 10, whiteSpace: "normal", overflowWrap: "anywhere" }}>{cabecalho}</th>
            )}
          </tr></thead>
          <tbody>{materiais.map((item, i) => <tr key={texto(item.id) || `material-${i}`}>
            <td style={{ padding: "8px 4px", verticalAlign: "top", overflowWrap: "anywhere" }}>{texto(item.qtd ?? item.quantidade) || "—"}</td>
            <td style={{ padding: "8px 4px", verticalAlign: "top", whiteSpace: "normal", overflowWrap: "anywhere" }}>{texto(item.descricao || item.vidro || item.nome) || "—"}</td>
            <td style={{ padding: "8px 4px", verticalAlign: "top", whiteSpace: "normal", overflowWrap: "anywhere" }}>{corMaterial(item)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
  </div>;
}

function DetalhesProjeto({ projeto }: { projeto: Projeto }) {
  const vidros = lista(projeto.vidrosAvulsos);
  const materiais = lista(projeto.materiais);
  const itensOriginais = lista(projeto.itensOriginais);
  const principal = vidros.length ? vidros : itensOriginais;
  const ehRelacao = principal.length > 0 || /vidros? avulsos?/i.test(texto(projeto.projeto || projeto.descricao));
  return <div className={styles.conferenciaDetalhes}>
    {!ehRelacao && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "4px 18px" }}>
      <div>
        <Campo rotulo="Medidas" valor={projeto.medidas || projeto.medidaReal || projeto.medida} />
        {Number(projeto.largura) > 0 && <Campo rotulo="Largura" valor={`${texto(projeto.largura)} mm`} />}
        {Number(projeto.altura) > 0 && <Campo rotulo="Altura" valor={`${texto(projeto.altura)} mm`} />}
        <Campo rotulo="Quantidade" valor={quantidadeProjetoPedido(projeto)} />
      </div>
      <div>
        <Campo rotulo="Vidro" valor={projeto.vidro} />
        <Campo rotulo="Cor do kit" valor={projeto.corKit} />
        <Campo rotulo="Modelo do kit" valor={projeto.modeloKit} />
        <Campo rotulo="Trinco" valor={projeto.trinco} />
        <Campo rotulo="Observação" valor={projeto.observacao} />
      </div>
    </div>}
    {principal.length > 0 && <TabelaTecnica itens={principal} titulo="Relação técnica de vidros e materiais" />}
    {materiais.length > 0 && <details className={styles.reportComposition} style={{ marginTop: 12 }}><summary>Ver composição técnica adicional</summary><TabelaTecnica itens={materiais} titulo="Composição técnica de materiais" /></details>}
    {!principal.length && !materiais.length && <p>Este projeto não possui uma relação detalhada de peças no snapshot.</p>}
    <p style={{ marginTop: 14 }}>Para corrigir medidas e recalcular materiais, utilize <strong>Editar no cálculo</strong>. A revisão só será aplicada após confirmação.</p>
  </div>;
}

function Resumo({ titulo, item }: { titulo: string; item: Projeto }) {
  return <section className={styles.notice} style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
    <h4>{titulo}</h4>
    <Campo rotulo="Projeto" valor={item.projeto} />
    <Campo rotulo="Medidas" valor={item.medidas || item.medidaReal || item.medida} />
    <Campo rotulo="Vidro" valor={item.vidro} />
    <Campo rotulo="Quantidade" valor={quantidadeProjetoPedido(item)} />
    {lista(item.vidrosAvulsos).length > 0 && <TabelaTecnica itens={lista(item.vidrosAvulsos)} titulo={`${titulo}: vidros avulsos`} />}
  </section>;
}

export default function EditarMedidasPedido({ pedido, empresaId, concluido }: { pedido: PedidoConferencia; empresaId: string; concluido: () => void }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<RevisaoCalculo | null>(null);
  const [motivo, setMotivo] = useState("");
  const [conferencia, setConferencia] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const itens = obj(pedido.origem_snapshot?.itens);
  const campo = Array.isArray(itens.documentoPdfCompleto) ? "documentoPdfCompleto" : Array.isArray(itens.projetosPdf) ? "projetosPdf" : "";
  const projetos = campo ? lista(itens[campo]) : [];
  const editaveis = projetos.filter(p => Boolean(rota(p))).length;

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("revisaoPedido");
    if (!token) return;
    const revisao = lerRevisaoCalculo(token);
    if (revisao?.pedidoId === pedido.id && revisao.empresaId === empresaId) setRascunho(revisao);
  }, [pedido.id, empresaId]);

  function editar(p: Projeto, indice: number) {
    try {
      const caminho = rota(p);
      if (!caminho || !campo) return;
      const token = crypto.randomUUID();
      const original = { ...p, id: p.id || crypto.randomUUID() };
      const revisao: RevisaoCalculo = { token, empresaId, pedidoId: pedido.id, versao: pedido.versao, indice, campo, original };
      sessionStorage.setItem(REVISAO_CALCULO_KEY + token, JSON.stringify(revisao));
      localStorage.setItem("glasscode:revisao-pedido:itens:" + token, JSON.stringify([original]));
      router.push(`${caminho}?centralItem=${encodeURIComponent(String(original.id))}&revisaoPedido=${encodeURIComponent(token)}&returnTo=${encodeURIComponent("/gestao/pedidos?revisaoPedido=" + token)}`);
    } catch {
      setErro("Não foi possível preparar a revisão. Verifique o armazenamento do navegador.");
    }
  }

  function limpar() {
    if (rascunho) {
      sessionStorage.removeItem(REVISAO_CALCULO_KEY + rascunho.token);
      localStorage.removeItem("glasscode:revisao-pedido:itens:" + rascunho.token);
    }
    window.history.replaceState(null, "", "/gestao/pedidos");
    setRascunho(null);
  }

  async function aplicar() {
    if (!rascunho?.resultado) return;
    if (motivo.trim().length < 3) { setErro("Informe o motivo da alteração com pelo menos 3 caracteres."); document.getElementById("motivo-revisao")?.focus(); return; }
    if (["producao", "pronto"].includes(pedido.situacao) && conferencia.trim().length < 10) { setErro("Registre a pausa e a conferência da produção (mínimo de 10 caracteres)."); return; }
    setSalvando(true);
    setErro("");
    try {
      const { error } = await supabase.rpc("gc_revisar_medidas_pedido", {
        p_id: pedido.id,
        p_versao: rascunho.versao,
        p_campo: rascunho.campo,
        p_indice: rascunho.indice,
        p_item: rascunho.resultado,
        p_motivo: motivo,
        p_conferencia: conferencia,
      });
      if (error) throw error;
      limpar();
      concluido();
    } catch (e) {
      setErro(/gc_revisar_medidas_pedido.*schema cache|Could not find the function/i.test((e as Error).message) ? "A atualização de revisão técnica precisa ser instalada no Supabase: 20261026_revisao_medidas_pedido.sql. Sua edição foi mantida." : (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (["entregue", "cancelado"].includes(pedido.situacao)) return null;
  return <section className={styles.financeiro} aria-label="Conferência técnica dos projetos">
    <div className={styles.conferenciaCabecalho}>
      <div><h3>Conferência técnica dos projetos</h3><p>Visualize as medidas, desenhos e relações de peças aqui mesmo. Para corrigir, abra o cálculo original e confirme a revisão ao retornar.</p></div>
      <span className={styles.badge}>{editaveis} projeto(s) com editor</span>
    </div>
    <div className={styles.conferenciaAviso}><strong>Valor comercial protegido</strong><p>A conferência apresenta informações técnicas. A aplicação de revisões segue o fluxo existente; valide as regras do Supabase antes de usar em pedidos reais.</p></div>
    {erro && <p role="alert" className={styles.notice}>{erro}</p>}
    {rascunho ? <section className={styles.conferenciaCard}>
      <h4>Revisão de medidas em andamento</h4>
      <p>Confira as informações antes de aplicar a alteração.</p>
      {rascunho.resultado ? <>
        <ComparacaoAlteracoes antes={rascunho.original} depois={rascunho.resultado}/>
        <label>Motivo da alteração (obrigatório)<textarea id="motivo-revisao" placeholder="Ex.: Medidas ajustadas após conferência na obra" maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
        {["producao", "pronto"].includes(pedido.situacao) && <label>Registre a pausa e a conferência de peças cortadas e materiais utilizados<textarea maxLength={2000} value={conferencia} onChange={e => setConferencia(e.target.value)} /></label>}
        <button disabled={salvando} onClick={() => void aplicar()}>Confirmar revisão técnica</button>
      </> : <p>A edição foi interrompida sem retornar um cálculo.</p>}
      <button disabled={salvando} onClick={limpar}>Descartar revisão</button>
    </section> : <div className={styles.conferenciaLista}>
      {projetos.map((p, i) => {
        const caminho = rota(p);
        const imagem = imagemValida(p.desenhoUrl) ? p.desenhoUrl : null;
        const relacao = lista(p.vidrosAvulsos);
        return <article className={styles.conferenciaCard} key={i} style={{ gap: 0, padding: "16px 20px" }}>
          <div className={styles.conferenciaProjeto} style={{ gap: 12, alignItems: "center", paddingBottom: 12 }}>
            <div className={styles.conferenciaInfo} style={{ gap: 20, alignItems: "center" }}>
              {imagem && <img className={styles.conferenciaImagem} style={{ width: "clamp(130px, 13vw, 175px)", height: "clamp(120px, 13vw, 160px)", objectFit: "contain", padding: 5 }} src={imagem} alt={`Desenho do projeto ${texto(p.projeto) || i + 1}`} />}
              <div>
                <small>PROJETO {i + 1}</small>
                <h4>{texto(p.projeto || p.descricao || p.nome) || `Projeto ${i + 1}`}</h4>
                <p>{texto(p.medidas || p.medidaReal || p.medida) || "Medidas não informadas"}</p>
                {preenchido(p.vidro) && <p>{texto(p.vidro)}</p>}
                {relacao.length > 0 && <p>{relacao.length} linha(s) de vidros e materiais</p>}
              </div>
            </div>
            <div className={styles.conferenciaAcoes} style={{ alignSelf: "center" }}>
              <button type="button" onClick={() => setExpandido(expandido === i ? null : i)} aria-expanded={expandido === i}>{expandido === i ? "Ocultar detalhes" : "Detalhes técnicos"}</button>
            </div>
          </div>
          {expandido === i && <DetalhesProjeto projeto={p} />}
          <details style={{ marginTop: 0, borderTop: "1px solid #d5e0e4", padding: "8px 0" }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 400, color: "#4d6a70", padding: "3px 0" }}>Conferência de peças (visualizar e conferir medidas)</summary>
            <div style={{ marginTop: 8 }}>
              <ConferenciaUnidadesAvulsas key={`${campo}:${texto(p.id) || i}`} pedidoId={pedido.id} empresaId={empresaId} situacaoPedido={pedido.situacao} projetoId={texto(p.id)} origemCampo={campo} integrado />
            </div>
          </details>
          <details style={{ marginTop: 0, borderTop: "1px solid #d5e0e4", padding: "8px 0" }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 400, color: "#4d6a70", padding: "3px 0" }}>Ajustes e revisão técnica (usar somente se necessário)</summary>
            <p style={{ fontSize: 12, color: "#4d6a70", margin: "10px 0" }}>Para corrigir o projeto, abra o cálculo original. A revisão exige confirmação e pode afetar peças já conferidas.</p>
            <button type="button" disabled={!caminho} onClick={() => editar(p, i)}>{caminho ? "Editar no cálculo original" : "Edição direta indisponível"}</button>
          </details>
        </article>;
      })}
      {!projetos.length && <p>Este pedido não contém projetos de cálculo salvos em um formato reconhecido para conferência.</p>}
    </div>}
    <p className={styles.conferenciaRodape}>A conferência individual é registrada no Supabase. A liberação parcial para produção permanece indisponível até a implementação das proteções no banco.</p>
  </section>;
}

export function ComparacaoAlteracoes({antes,depois}:{antes:Projeto;depois:Projeto}){
 const avulsosAntes=lista(antes.vidrosAvulsos),avulsosDepois=lista(depois.vidrosAvulsos);
 const relacao=avulsosAntes.length>0||avulsosDepois.length>0;
 const diferencas=relacao?diferencasItens(avulsosAntes,avulsosDepois):diferencasItens([{...antes,descricao:antes.projeto,medida:antes.medidas}],[{...depois,descricao:depois.projeto,medida:depois.medidas}]);
 const materiais=relacao?[]:diferencasItens(lista(antes.materiais),lista(depois.materiais));
 return <div><p>{diferencas.length+materiais.length?"Somente os itens alterados são apresentados abaixo.":"Nenhuma alteração técnica identificada nos campos comparados."}</p>{[...diferencas,...materiais].map((d,i)=><section key={i} className={styles.notice} style={{marginTop:12}}><h4>{d.tipo} · {texto((d.depois||d.antes)?.vidro||(d.depois||d.antes)?.descricao||(d.depois||d.antes)?.projeto)||"Item"}</h4><div className={styles.scroll}><table><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>{Object.keys(camposRevisao(d.antes||{})).map(chave=>{const a=camposRevisao(d.antes||{}),b=camposRevisao(d.depois||{});const k=chave as keyof typeof a;const va=texto(a[k]),vb=texto(b[k]);if(va===vb||(!va&&!vb))return null;return <tr key={k}><td>{{descricao:"Descrição",quantidade:"Quantidade",medida:"Medida real",calculo:"Medida de cálculo",cor:"Cor",observacao:"Observação"}[k]}</td><td>{va||"—"}</td><td><strong>{vb||"—"}</strong></td></tr>})}</tbody></table></div></section>)}<details className={styles.reportComposition} style={{marginTop:16}}><summary>Ver relação completa do projeto — antes e depois</summary><div className={styles.fields}><Resumo titulo="Antes" item={antes}/><Resumo titulo="Após recalcular" item={depois}/></div></details></div>;
}
