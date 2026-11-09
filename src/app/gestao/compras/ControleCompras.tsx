"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { necessidadesCompra, type PedidoCompraOrigem, type NecessidadeCompra } from "@/utils/necessidadesCompra";
import { apresentacaoMaterial, compararCompra, mesmoMaterial, recebidoItem, saldoCompra, type Compra, type CompraItem, type CompraEvento } from "@/utils/compras";
import CadastroFornecedores, { type Fornecedor } from "@/components/CadastroFornecedores";
import visual from "./compras.module.css";
import styles from "../pedidos/pedidos.module.css";
type Pedido = PedidoCompraOrigem & { versao: number };
type Escolha = { pedido: Pedido; material: NecessidadeCompra; quantidade: string; preco: string };
const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
async function ler<T>(tabela: string, empresa: string) {
  const lista: T[] = [];
  for (let n = 0; ; n += 500) {
    const { data, error } = await supabase.from(tabela).select("*").eq("empresa_id", empresa).order("id").range(n, n + 499);
    if (error) throw error;
    lista.push(...data as T[]);
    if (data.length < 500) return lista;
  }
}
export default function ControleCompras({ empresaId, pedidos, busca, atualizar }: { empresaId: string; pedidos: Pedido[]; busca: string; atualizar: () => void }) {
  const [fornecedores,setFornecedores]=useState<Fornecedor[]>([]),[cadastroAberto,setCadastroAberto]=useState(false),[versaoFornecedores,setVersaoFornecedores]=useState(0);
  const formularioAcao = useRef<HTMLElement>(null);
  
  const [aba, setAba] = useState("necessidades"), [compras, setCompras] = useState<Compra[]>([]), [itens, setItens] = useState<CompraItem[]>([]), [eventos, setEventos] = useState<CompraEvento[]>([]);
  const [erro, setErro] = useState(""), [pronto, setPronto] = useState(false), [tentativa, setTentativa] = useState(0), [ocupado, setOcupado] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({}), [fornecedor, setFornecedor] = useState(""), [referencia, setReferencia] = useState(""), [previsao, setPrevisao] = useState(""), [observacoes, setObservacoes] = useState("");
  const [acao, setAcao] = useState<{ tipo: "receber" | "estornar" | "cancelar"; id: string; token: string; limite?: number } | null>(null), [quantidade, setQuantidade] = useState(""), [motivo, setMotivo] = useState("");
  useEffect(() => { if (acao) formularioAcao.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [acao]);
  useEffect(()=>{let ativo=true;void ler<Fornecedor>("gc_fornecedores",empresaId).then(f=>{if(ativo)setFornecedores(f.filter(x=>x.ativo).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR",{sensitivity:"base"}))) }).catch(()=>{if(ativo)setErro("Atualize o cadastro de fornecedores no banco para selecionar um fornecedor.")});return()=>{ativo=false}},[empresaId,versaoFornecedores]);
  const [token, setToken] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let ativo = true;
    void Promise.all([ler<Compra>("gc_compras", empresaId), ler<CompraItem>("gc_compra_itens", empresaId), ler<CompraEvento>("gc_compra_eventos", empresaId)]).then(([c, i, e]) => {
      if (ativo) { setCompras(c.sort((a,b) => b.numero-a.numero)); setItens(i); setEventos(e.sort((a,b) => b.criado_em.localeCompare(a.criado_em))); setPronto(true); }
    }).catch((e: { code?: string; message?: string }) => { if (ativo) { setPronto(false); setErro(["42P01", "PGRST205"].includes(e.code || "") ? "O registro de compras depende da atualização 20261108_gestao_compras.sql no banco. A lista de necessidades continua disponível." : "Não foi possível conferir as compras registradas. Atualize antes de comprar."); } });
    return () => { ativo = false; };
  }, [empresaId, tentativa]);
  const necessidades = pedidos.flatMap(p => necessidadesCompra(p).itens.map(m => ({ pedido: p, material: m })));
  const selecionadas = Object.values(escolhas);
  const comparativos=selecionadas.map(s=>compararCompra(s.material,Number(s.quantidade),s.preco));
  const totalComparado=(campo:"compra"|"orcado"|"diferenca")=>comparativos.every(c=>c[campo]!==null)?moeda(comparativos.reduce((s,c)=>s+(c[campo]??0),0)):"Não disponível";
  function abrir(tipo: "receber" | "estornar" | "cancelar", id: string, limite?: number) { setAcao({ tipo, id, limite, token: crypto.randomUUID() }); setQuantidade(String(limite || "")); setMotivo(""); setErro(""); }
  async function executar() {
    if (!acao || ocupado) return;
    setOcupado(true); setErro("");
    try {
      const { error } = acao.tipo === "receber" ? await supabase.rpc("gc_receber_compra", { p_item: acao.id, p_quantidade: Number(quantidade), p_motivo: motivo, p_requisicao: acao.token }) : acao.tipo === "estornar" ? await supabase.rpc("gc_estornar_recebimento", { p_evento: acao.id, p_motivo: motivo, p_requisicao: acao.token }) : await supabase.rpc("gc_cancelar_compra", { p_compra: acao.id, p_motivo: motivo, p_requisicao: acao.token });
      if (error) throw error;
      setAcao(null); setPronto(false); setTentativa(v => v + 1);
    } catch (e) { setErro((e as { message?: string }).message || "Não foi possível registrar."); } finally { setOcupado(false); }
  }
  async function registrar() {
    if (ocupado || !pronto) return;
    setOcupado(true); setErro("");
    try {
      const linhas = selecionadas.map(s => {
        const atual = necessidades.find(n => n.pedido.id === s.pedido.id && n.material.chave === s.material.chave && mesmoMaterial(n.material, s.material));
        if (!atual || atual.pedido.versao !== s.pedido.versao) throw new Error("Pedido alterado. Atualize e selecione os materiais novamente.");
        const saldo = saldoCompra(s.pedido.id, s.material, itens, compras, eventos);
        if (s.material.vidro && !s.material.areaPorUnidade) throw new Error("Confira as medidas do vidro antes de comprar por m².");
        if (!(Number(s.quantidade)>0) || Number(s.quantidade)>saldo.faltante || s.preco.trim()==="" || Number(s.preco)<0) throw new Error("Confira quantidades e preços dos materiais selecionados.");
        return { pedido_id: s.pedido.id, versao: s.pedido.versao, chave: s.material.chave, material: { ...s.material, pedidoNumero: s.pedido.numero, pedidoCliente: s.pedido.cliente, pedidoObra: s.pedido.obra, precoCobranca: Number(s.preco), unidadeCobranca: s.material.vidro ? "m²" : s.material.unidade }, necessario: s.material.quantidade, quantidade: Number(s.quantidade), preco: Math.round(Number(s.preco)*(s.material.vidro ? s.material.areaPorUnidade || 0 : 1)*100)/100 };
      });
      const { error } = await supabase.rpc("gc_registrar_compra_fornecedor", { p_requisicao: token, p_fornecedor_id: fornecedor, p_referencia: referencia, p_previsao: previsao || null, p_observacoes: observacoes, p_itens: linhas });
      if (error) throw error;
      setEscolhas({}); setToken(crypto.randomUUID()); setFornecedor(""); setReferencia(""); setObservacoes(""); setPrevisao(""); setPronto(false); setTentativa(v => v + 1); setAba("compras");
    } catch (e) { setErro((e as { message?: string }).message || "Não foi possível registrar a compra."); } finally { setOcupado(false); }
  }
  return <div className={styles.form}>
    <nav className={styles.pedidoAbas} aria-label="Compras">{[["necessidades", "A comprar"], ["compras", "Compras realizadas"], ["recebimentos", "Recebimentos"]].map(([v,n]) => <button key={v} className={aba===v?styles.pedidoAbaAtiva:""} onClick={()=>setAba(v)}>{n}</button>)}</nav>
    {erro && <p role="alert" className={styles.notice}>{erro} <button disabled={ocupado} onClick={()=>{setErro("");setPronto(false);setTentativa(v=>v+1);atualizar()}}>Atualizar dados</button></p>}
    {!pronto && !erro && <p>Conferindo compras e recebimentos…</p>}
    <p>Compras não movimentam estoque nem registram pagamentos. Recebimentos parciais ficam no histórico.</p>
    {aba==="necessidades" && <>
      {pronto && itens.some(i => compras.some(c => c.id===i.compra_id&&!c.cancelada) && !necessidades.some(n=>n.pedido.id===i.pedido_id&&n.material.chave===i.chave&&mesmoMaterial(n.material,i.material))) && <p role="alert" className={styles.notice}>Há compras vinculadas a pedidos encerrados ou materiais revisados. Confira a aba Compras realizadas antes de registrar novas compras; esses materiais não foram descontados de necessidades diferentes.</p>}
      {pedidos.filter(p => (p.numero+" "+p.cliente+" "+p.obra).toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).map(p => { const r = necessidadesCompra(p); return <section className={styles.editor} key={p.id}><h2>Pedido #{p.numero} · {p.cliente}</h2><p>{p.obra || "Sem obra"}</p>{r.avisos.map(a=><p key={a}>{a}</p>)}
        <div className={styles.scroll}><table><thead><tr>{["Selecionar", "Material / medida", "Unidade", "Necessário", "A comprar", "Aguardando", "Recebido"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{r.itens.map(m=>{const s=saldoCompra(p.id,m,itens,compras,eventos);return <tr key={m.chave}><td><input type="checkbox" aria-label={`Comprar ${m.descricao}`} checked={!!escolhas[m.chave]} disabled={!pronto||ocupado||s.faltante<=0} onChange={e=>{const marcado=e.target.checked;setEscolhas(v=>{const n={...v};if(marcado)n[m.chave]={pedido:p,material:m,quantidade:String(s.faltante),preco:""};else delete n[m.chave];return n})}}/></td><td>{apresentacaoMaterial(m).descricao}<small>{m.projeto} · {apresentacaoMaterial(m).medida} · {m.cor}</small>{s.excedente>0&&<small>Compra excede a necessidade em {s.excedente}. Confira a revisão do pedido.</small>}</td><td>{m.unidade}</td><td>{m.quantidade}</td><td>{pronto?s.faltante:"—"}</td><td>{pronto?s.aguardando:"—"}</td><td>{pronto?s.recebido:"—"}</td></tr>})}</tbody></table></div>
      </section>})}
      {selecionadas.length>0 && <fieldset disabled={ocupado||!pronto} className={visual.registro}><legend>Registrar compra · {selecionadas.length} materiais</legend><div className={visual.cabecalho}><label>Fornecedor<div className={visual.fornecedor}><select value={fornecedor} onChange={e=>setFornecedor(e.target.value)}><option value="">Selecione o fornecedor</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select><button type="button" onClick={()=>setCadastroAberto(true)}>Novo fornecedor</button></div></label><label>Número no fornecedor<input maxLength={200} value={referencia} onChange={e=>setReferencia(e.target.value)}/></label><label>Previsão de entrega<input type="date" value={previsao} onChange={e=>setPrevisao(e.target.value)}/></label></div>
        <div className={visual.tabela}><table><thead><tr><th>Pedido / material</th><th>Medidas</th><th>Quantidade</th><th>Área (m²)</th><th>Orçamento</th><th>Preço de compra</th><th>Total da compra</th><th>Diferença</th></tr></thead><tbody>{selecionadas.map(s=>{const fator=s.material.vidro?s.material.areaPorUnidade||0:1;const exibicao=apresentacaoMaterial(s.material);const comparativo=compararCompra(s.material,Number(s.quantidade),s.preco);return <tr key={s.material.chave}><td><small>Pedido #{s.pedido.numero}</small>{exibicao.descricao}</td><td>{exibicao.medida||"—"}</td><td><input aria-label={"Quantidade de "+s.material.descricao} type="number" min="0.001" step="0.001" value={s.quantidade} onChange={e=>setEscolhas(v=>({...v,[s.material.chave]:{...s,quantidade:e.target.value}}))}/><small>{s.material.vidro&&!/^m[²2]$/i.test(s.material.unidade)?"peças":s.material.unidade}</small></td><td>{s.material.vidro?(Number(s.quantidade)*fator).toLocaleString("pt-BR",{maximumFractionDigits:4}):"—"}</td><td>{(s.material.vidro?s.material.precoOrcadoM2:s.material.precoOrcadoUnitario)!==undefined?moeda((s.material.vidro?s.material.precoOrcadoM2:s.material.precoOrcadoUnitario)!):"Não disponível"}<small>{s.material.vidro?"R$/m²":"R$/"+s.material.unidade}</small></td><td><input aria-label={"Preço de "+s.material.descricao} type="number" min="0" step="0.01" value={s.preco} onChange={e=>setEscolhas(v=>({...v,[s.material.chave]:{...s,preco:e.target.value}}))}/><small>{s.material.vidro?"R$/m²":"R$/"+s.material.unidade}</small></td><td>{comparativo.compra===null?"—":moeda(comparativo.compra)}</td><td className={comparativo.diferenca!==null&&comparativo.diferenca<0?visual.acima:undefined}>{comparativo.diferenca===null?"Não disponível":moeda(comparativo.diferenca)}{comparativo.diferenca!==null&&comparativo.diferenca<0&&<small>Acima do orçamento</small>}</td></tr>})}</tbody></table></div>
        <p>Diferença = valor orçado menos compra, para a quantidade selecionada. Não representa lucro nem inclui outros custos. Vidros: preço por m² e área comercial arredondada de 5 em 5 cm. Quantidades de peças permanecem preservadas para compras e entregas parciais. Materiais já em m² não são convertidos novamente.</p>
        <label>Observações<textarea maxLength={3000} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label><div className={visual.rodape}><div className={visual.comparativo}><span>Valor orçado<strong>{totalComparado("orcado")}</strong></span><span>Total da compra<strong>{totalComparado("compra")}</strong></span><span>Diferença<strong>{totalComparado("diferenca")}</strong></span></div><button className={styles.primary} disabled={!fornecedor||selecionadas.length>200} onClick={()=>void registrar()}>Registrar compra realizada</button></div>
      </fieldset>}
      {cadastroAberto&&<CadastroFornecedores key={empresaId} empresaId={empresaId} fechar={()=>{setCadastroAberto(false);setVersaoFornecedores(v=>v+1)}} selecionar={f=>{setFornecedor(f.id);setCadastroAberto(false);setVersaoFornecedores(v=>v+1)}}/>}
    </>}
    {aba==="compras" && pronto && <>{!compras.length&&<p>Nenhuma compra registrada.</p>}{compras.map(c=><section className={styles.editor} key={c.id}><h2>Compra #{c.numero} · {c.fornecedor} {c.cancelada&&"· Cancelada"}</h2><p>Referência: {c.referencia||"—"} · Previsão: {c.previsao?.split("-").reverse().join("/")||"Não informada"}</p><p>{c.observacoes}</p>
      <div className={styles.scroll}><table><thead><tr><th>Material</th><th>Comprado</th><th>Recebido</th><th>Aguardando</th><th>Total</th><th>Ação</th></tr></thead><tbody>{itens.filter(i=>i.compra_id===c.id).map(i=>{const recebido=recebidoItem(i.id,eventos),restante=Number(i.quantidade)-recebido;const atual=necessidades.find(n=>n.pedido.id===i.pedido_id&&n.material.chave===i.chave&&mesmoMaterial(n.material,i.material));return <tr key={i.id}><td>{i.material.descricao}<small>Pedido #{i.material.pedidoNumero ?? pedidos.find(p=>p.id===i.pedido_id)?.numero ?? "—"} · {i.material.pedidoCliente}</small><small>{i.material.medida} · {i.material.cor} · {i.material.unidade}</small>{!atual&&!c.cancelada&&<small>Pedido encerrado ou material revisado. Confira antes de receber ou comprar novamente.</small>}</td><td>{i.quantidade}</td><td>{recebido}</td><td>{c.cancelada?0:restante}</td><td>{moeda(Number(i.preco)*Number(i.quantidade))}</td><td><button disabled={ocupado||c.cancelada||restante<=0} onClick={()=>abrir("receber",i.id,restante)}>Receber</button></td></tr>})}</tbody></table></div><button disabled={ocupado||c.cancelada} onClick={()=>abrir("cancelar",c.id)}>Cancelar compra</button>
    </section>)}</>}
    {aba==="recebimentos"&&pronto&&<><h2>Histórico de compras e entregas</h2>{!eventos.length&&<p>Nenhum evento registrado.</p>}{eventos.map(e=><div key={e.id} className={styles.detailItem}><span>Compra #{compras.find(c=>c.id===e.compra_id)?.numero} · {e.tipo}<small>{new Date(e.criado_em).toLocaleString("pt-BR")} · {itens.find(i=>i.id===e.item_id)?.material.descricao} · {e.quantidade!==0?e.quantidade:""}</small><small>{e.motivo}</small></span>{e.tipo==="recebimento"&&!eventos.some(x=>x.estorno_de===e.id)&&<button disabled={ocupado} onClick={()=>abrir("estornar",e.id)}>Estornar recebimento</button>}</div>)}</>}
    {acao&&<section ref={formularioAcao} className={styles.editor} aria-label="Confirmar operação"><h2>{acao.tipo==="receber"?"Registrar entrega":acao.tipo==="estornar"?"Estornar recebimento":"Cancelar compra"}</h2>{acao.tipo==="receber"&&<label>Quantidade recebida · saldo {acao.limite}<input type="number" min="0.001" max={acao.limite} step="0.001" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label>}<label>{acao.tipo==="receber"?"Observação / comprovante":"Motivo obrigatório"}<textarea maxLength={1000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><div className={styles.actions}><button disabled={ocupado||!pronto||(acao.tipo!=="receber"&&motivo.trim().length<3)} onClick={()=>void executar()}>Confirmar</button><button disabled={ocupado} onClick={()=>setAcao(null)}>Voltar</button></div></section>}
  </div>;
}
