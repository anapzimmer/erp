"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
import {dividirParcelas,hojeFinanceiro,type ParcelaPrevista} from "@/utils/financeiroPedidos";
import styles from "./pedidos.module.css";
type Parcela={id:string;numero:number;valor:number;vencimento:string;cancelada:boolean};
type Recebimento={id:string;parcela_id:string;valor:number;data_pagamento:string;forma:string;observacao:string;estornado_em:string|null;motivo_estorno:string|null};
const moeda=(n:number)=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const erroTexto=(e:unknown)=>{const texto=(e as {message?:string})?.message||"Não foi possível concluir a operação.";return /schema cache|does not exist|Could not find/i.test(texto)?"O financeiro precisa ser ativado no Supabase.":texto};
export default function FinanceiroPedido({pedido,empresaId,resumo=false}:{resumo?:boolean;pedido:{id:string;total:number;versao:number;situacao:string};empresaId:string}){
 const [permitido,setPermitido]=useState(false),[loading,setLoading]=useState(true),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState("");
 const [parcelas,setParcelas]=useState<Parcela[]>([]),[recebimentos,setRecebimentos]=useState<Recebimento[]>([]);
 const [quantidade,setQuantidade]=useState(1),[primeiro,setPrimeiro]=useState(hojeFinanceiro()),[previstas,setPrevistas]=useState<ParcelaPrevista[]>([]);
 const [receber,setReceber]=useState<Parcela|null>(null),[valor,setValor]=useState(""),[data,setData]=useState(hojeFinanceiro()),[forma,setForma]=useState("pix"),[observacao,setObservacao]=useState("");
 const [acao,setAcao]=useState<{tipo:"estornar"|"cancelar";id:string}|null>(null),[motivo,setMotivo]=useState("");
 const solicitacao=useRef(""),requisicao=useRef(0);
 const carregar=useCallback(async()=>{const seq=++requisicao.current;setLoading(true);try{
 const {data:ok,error:falha}=await supabase.rpc("gc_financeiro_permitido",{p_empresa:empresaId});if(seq!==requisicao.current)return;if(falha)throw falha;if(ok!==true){setPermitido(false);setParcelas([]);setRecebimentos([]);return}setPermitido(true);
 const {data:ps,error:ep}=await supabase.from("gc_parcelas").select("*").eq("empresa_id",empresaId).eq("pedido_id",pedido.id).order("criado_em").order("numero");if(ep)throw ep;
 const lista:Recebimento[]=[];
 if(ps?.length){for(let inicio=0;;inicio+=500){const {data:rs,error:er}=await supabase.from("gc_recebimentos").select("*").eq("empresa_id",empresaId).in("parcela_id",ps.map(p=>p.id)).order("criado_em").order("id").range(inicio,inicio+499);if(er)throw er;lista.push(...(rs||[]));if((rs?.length||0)<500)break}}
 if(seq!==requisicao.current)return;setParcelas(ps||[]);setRecebimentos(lista);setErro("");
 }catch(e){if(seq!==requisicao.current)return;setErro(erroTexto(e));setPermitido(false);setParcelas([]);setRecebimentos([])}finally{if(seq===requisicao.current)setLoading(false)}},[empresaId,pedido.id]);
 useEffect(()=>{void carregar();return()=>{requisicao.current++}},[carregar]);
 const ativas=parcelas.filter(p=>!p.cancelada);
 const recebido=(p:Parcela)=>recebimentos.filter(r=>r.parcela_id===p.id&&!r.estornado_em).reduce((s,r)=>s+Number(r.valor),0);
 const saldo=(p:Parcela)=>Math.max(0,Math.round((Number(p.valor)-recebido(p))*100)/100);
 const totalRecebido=ativas.reduce((s,p)=>s+recebido(p),0),totalAberto=ativas.reduce((s,p)=>s+saldo(p),0),totalVencido=ativas.filter(p=>p.vencimento<hojeFinanceiro()).reduce((s,p)=>s+saldo(p),0);
 async function executar(fn:()=>PromiseLike<{error:unknown}>){setOcupado(true);setErro("");try{const {error}=await fn();if(error)throw error;setReceber(null);setAcao(null);setPrevistas([]);await carregar()}catch(e){setErro(erroTexto(e))}finally{setOcupado(false)}}
 if(loading)return <p>Consultando financeiro…</p>;
 if(resumo){
  const total=Number(pedido.total)||0;
  const recebidoCentavos=Math.round(totalRecebido*100);
  const totalCentavos=Math.round(total*100);
  const saldoPedido=Math.max(0,(totalCentavos-recebidoCentavos)/100);
  const percentual=totalCentavos>0?Math.min(100,Math.max(0,recebidoCentavos/totalCentavos*100)):0;
  const parcelasOrdenadas=[...ativas].sort((a,b)=>a.numero-b.numero);
  const totalParceladoCentavos=Math.round(ativas.reduce((s,p)=>s+Number(p.valor),0)*100);
  const divergencia=ativas.length>0&&totalParceladoCentavos!==totalCentavos;
  const pago=ativas.length>0&&totalAberto<=0.005&&!divergencia&&saldoPedido<=0.005;
  const parcial=totalRecebido>0&&!pago;
  const vencidas=ativas.some(p=>saldo(p)>0.005&&p.vencimento<hojeFinanceiro());
  const status=!ativas.length?"Sem parcelamento":divergencia?"Revisar valores":pago?"Pago":vencidas?"Em atraso":parcial?"Parcialmente pago":"Pendente";
  const statusClasse=divergencia||vencidas?styles.finStatusAlerta:pago?styles.finStatusPago:parcial?styles.finStatusParcial:styles.finStatusNeutro;
  const formatarData=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split("-").reverse().join("/"):v||"—";
  return <section className={styles.finResumo} aria-label="Financeiro do pedido">
   <div className={styles.finResumoCabecalho}><div><h3>Financeiro do pedido</h3><p>Resumo dos valores e parcelas do pedido</p></div>{permitido&&!erro&&<span className={`${styles.finStatus} ${statusClasse}`}>{status}</span>}</div>
   {erro?<p role="alert" className={styles.notice}>{erro}</p>:!permitido?<p>Acesso financeiro restrito aos usuários autorizados.</p>:<>
    <div className={styles.finResumoNumeros}>
     <div><small>Total do pedido</small><strong>{moeda(total)}</strong></div>
     <div><small>Recebido</small><strong className={styles.finRecebido}>{moeda(totalRecebido)}</strong></div>
     <div><small>A receber</small><strong>{moeda(saldoPedido)}</strong></div>
    </div>
    <div className={styles.finProgresso}><div><span>Progresso do recebimento</span><strong>{percentual.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</strong></div><div className={styles.finTrilha} role="progressbar" aria-label="Percentual recebido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentual)}><div style={{width:`${percentual}%`}}/></div></div>
    <div className={styles.finParcelasCabecalho}><h4>Parcelamento</h4><span>{ativas.length} {ativas.length===1?"parcela":"parcelas"}</span></div>
    {divergencia&&<p role="alert" className={styles.finAviso}>A soma das parcelas ativas ({moeda(totalParceladoCentavos/100)}) é diferente do valor atual do pedido ({moeda(total)}). Confira a conciliação na Gestão Financeira.</p>}
    {parcelasOrdenadas.length?<div className={styles.finTabelaScroll}><table className={styles.finTabela}><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{parcelasOrdenadas.map(p=>{const r=recebido(p),restante=saldo(p);const situacao=restante<=0.005?"Pago":p.vencimento<hojeFinanceiro()?"Em atraso":r>0?"Parcial":"Pendente";return <tr key={p.id}><td>{String(p.numero).padStart(2,"0")}/{String(parcelasOrdenadas.length).padStart(2,"0")}</td><td>{formatarData(p.vencimento)}</td><td>{moeda(Number(p.valor))}</td><td><span className={situacao==="Pago"?styles.finSituacaoPaga:situacao==="Em atraso"?styles.finSituacaoAtraso:styles.finSituacao}>{situacao}</span>{situacao==="Parcial"&&<small>Restam {moeda(restante)}</small>}</td></tr>})}</tbody></table></div>:<p className={styles.finSemParcelas}>Este pedido ainda não possui parcelas cadastradas. O saldo do pedido permanece a receber.</p>}
    <div className={styles.finResumoRodape}><Link href={`/gestao/financeiro?pedido=${encodeURIComponent(pedido.id)}`}>Abrir Gestão Financeira →</Link></div>
   </>}
  </section>;
 }

 return <section className={styles.financeiro}><div className={styles.actions}><h3>Financeiro do pedido</h3><button onClick={()=>void carregar()} disabled={ocupado}>Atualizar</button></div>{erro&&<p role="alert" className={styles.notice}>{erro}</p>}{!permitido?<p>Seu usuário precisa de autorização financeira da administração, além do módulo Gestão.</p>:<>
 <p>Recebimentos manuais. Registrar um pagamento não cobra o cliente nem emite nota fiscal.</p>
 <div className={styles.financeStats}><div>Recebido<strong>{moeda(totalRecebido)}</strong></div><div>Em aberto<strong>{moeda(totalAberto)}</strong></div><div>Vencido<strong>{moeda(totalVencido)}</strong></div></div>
 {!ativas.length&&pedido.situacao!=="cancelado"&&<fieldset disabled={ocupado}><legend>Condições de pagamento</legend><p>Total do pedido: {moeda(pedido.total)}. Entrada pode ser a primeira parcela; ajuste os valores e as datas abaixo.</p><div className={styles.fields}><label>Número de parcelas<input type="number" min={1} max={60} value={quantidade} onChange={e=>setQuantidade(Number(e.target.value))}/></label><label>Primeiro vencimento<input type="date" value={primeiro} onChange={e=>setPrimeiro(e.target.value)}/></label></div><button onClick={()=>setPrevistas(dividirParcelas(Number(pedido.total),quantidade,primeiro))}>Distribuir parcelas mensais</button>{previstas.map((p,i)=><div className={styles.fields} key={i}><label>Parcela {i+1} · valor<input type="number" min="0.01" step="0.01" value={p.valor} onChange={e=>setPrevistas(previstas.map((v,j)=>i===j?{...v,valor:Number(e.target.value)}:v))}/></label><label>Vencimento<input type="date" value={p.vencimento} onChange={e=>setPrevistas(previstas.map((v,j)=>i===j?{...v,vencimento:e.target.value}:v))}/></label></div>)}{previstas.length>0&&<><p>Soma: {moeda(previstas.reduce((s,p)=>s+p.valor,0))}</p><button disabled={previstas.some(p=>!p.vencimento||p.valor<=0)||Math.round(previstas.reduce((s,p)=>s+p.valor*100,0))!==Math.round(Number(pedido.total)*100)} onClick={()=>void executar(()=>supabase.rpc("gc_gerar_parcelas",{p_pedido:pedido.id,p_versao:pedido.versao,p_parcelas:previstas}))}>Confirmar parcelamento</button></>}</fieldset>}
 {ativas.map(p=><div className={styles.detailItem} key={p.id}><span>Parcela {p.numero} · {p.vencimento.split('-').reverse().join('/')}<small>{saldo(p)===0?"Paga":p.vencimento<hojeFinanceiro()?"Em atraso":recebido(p)>0?"Parcialmente paga":"Em aberto"} · Total {moeda(p.valor)} · Recebido {moeda(recebido(p))}</small><small>Saldo {moeda(saldo(p))}</small></span>{saldo(p)>0&&pedido.situacao!=="cancelado"&&<button disabled={ocupado} onClick={()=>{setReceber(p);setValor(saldo(p).toFixed(2));setData(hojeFinanceiro());setForma("pix");setObservacao("");solicitacao.current=crypto.randomUUID();setAcao(null)}}>Registrar recebimento</button>}</div>)}
 {receber&&<fieldset disabled={ocupado} className={styles.notice}><legend>Receber parcela {receber.numero}</legend><div className={styles.fields}><label>Valor recebido<input type="number" step="0.01" min="0.01" value={valor} onChange={e=>{setValor(e.target.value);solicitacao.current=crypto.randomUUID()}}/></label><label>Data<input type="date" max={hojeFinanceiro()} value={data} onChange={e=>{setData(e.target.value);solicitacao.current=crypto.randomUUID()}}/></label></div><label>Forma de pagamento<select value={forma} onChange={e=>{setForma(e.target.value);solicitacao.current=crypto.randomUUID()}}>{["pix","dinheiro","transferencia","cartao","boleto","outro"].map(f=><option key={f} value={f}>{({pix:"Pix",dinheiro:"Dinheiro",transferencia:"Transferência",cartao:"Cartão",boleto:"Boleto",outro:"Outro"})[f as "pix"]}</option>)}</select></label><label>Observação<textarea maxLength={500} value={observacao} onChange={e=>{setObservacao(e.target.value);solicitacao.current=crypto.randomUUID()}}/></label><div className={styles.actions}><button disabled={!data||!Number.isFinite(Number(valor))||Number(valor)<=0||Number(valor)>saldo(receber)} onClick={()=>void executar(()=>supabase.rpc("gc_receber_parcela",{p_parcela:receber.id,p_valor:Number(valor),p_data:data,p_forma:forma,p_observacao:observacao,p_solicitacao:solicitacao.current}))}>Confirmar recebimento</button><button onClick={()=>setReceber(null)}>Voltar</button></div></fieldset>}
 {recebimentos.length>0&&<><h4>Movimentações</h4>{recebimentos.map(r=><div className={styles.detailItem} key={r.id}><span>{moeda(r.valor)} · {r.data_pagamento.split('-').reverse().join('/')} · {r.forma}<small>{r.observacao}</small>{r.estornado_em&&<small>Estornado: {r.motivo_estorno}</small>}</span>{!r.estornado_em&&<button disabled={ocupado} onClick={()=>{setAcao({tipo:"estornar",id:r.id});setMotivo("");setReceber(null)}}>Estornar</button>}</div>)}</>}
 {ativas.length>0&&<button disabled={ocupado} onClick={()=>{setAcao({tipo:"cancelar",id:pedido.id});setMotivo("");setReceber(null)}}>Cancelar parcelamento</button>}
 {acao&&<div className={styles.notice}><p>{acao.tipo==="estornar"?"Estornar recebimento e reabrir o saldo da parcela":"Cancelar parcelas para renegociar ou cancelar o pedido"}</p><p>O histórico será mantido. Para cancelar parcelas com pagamentos, primeiro registre os estornos.</p><label>Motivo<textarea maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><div className={styles.actions}><button disabled={ocupado||motivo.trim().length<3} onClick={()=>void executar(()=>acao.tipo==="estornar"?supabase.rpc("gc_estornar_recebimento",{p_id:acao.id,p_motivo:motivo}):supabase.rpc("gc_cancelar_parcelas",{p_pedido:acao.id,p_motivo:motivo}))}>Confirmar</button><button disabled={ocupado} onClick={()=>setAcao(null)}>Voltar</button></div></div>}
 {parcelas.some(p=>p.cancelada)&&<p>{parcelas.filter(p=>p.cancelada).length} parcela(s) cancelada(s), preservadas no histórico.</p>}
 </>}</section>
}
