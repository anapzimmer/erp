"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./painel-financeiro.module.css";

type Pedido = { id:string; numero:number; cliente:string; obra:string; total:number; situacao:string };
type Parcela = { id:string; pedido_id:string; numero:number; valor:number; vencimento:string; cancelada:boolean };
type Recebimento = { id:string; parcela_id:string; valor:number; data_pagamento:string; estornado_em:string|null };
type Linha = { parcela:Parcela; pedido:Pedido; saldo:number; recebido:number; status:"Vencida"|"Parcial"|"Pendente"|"Paga" };
const dinheiro = (n:number) => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const cent = (n:number) => Math.round(Number(n||0)*100);
const dataBR = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : s;
const hojeSP = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const maisDias = (s:string,d:number) => { const dt = new Date(`${s}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate()+d); return dt.toISOString().slice(0,10); };
const PAGE = 500;
// A consulta é paginada para não perder linhas pelo limite padrão do PostgREST.
async function buscarTudo<T>(tabela:string,campos:string,empresaId:string):Promise<T[]> {
  const resultado:T[]=[];
  for(let inicio=0;;inicio+=PAGE){
    const {data,error} = await supabase.from(tabela).select(campos).eq("empresa_id",empresaId).order("id",{ascending:true}).range(inicio,inicio+PAGE-1);
    if(error)throw error;
    const lote=(data||[]) as unknown as T[];
    resultado.push(...lote);
    if(lote.length<PAGE)return resultado;
    if(inicio>=99500)throw new Error("Há mais de 100 mil registros. O painel precisa de consultas agregadas no servidor para este volume.");
  }
}
export default function PainelFinanceiro({empresaId,onAbrirPedido}:{empresaId:string;onAbrirPedido:(id:string)=>void}){
  const [pedidos,setPedidos]=useState<Pedido[]>([]);
  const [parcelas,setParcelas]=useState<Parcela[]>([]);
  const [recebimentos,setRecebimentos]=useState<Recebimento[]>([]);
  const [loading,setLoading]=useState(true);
  const [erro,setErro]=useState("");
  const [atualizacao,setAtualizacao]=useState(0);
  const [termo,setTermo]=useState("");
  const [situacao,setSituacao]=useState("todas");
  const [inicio,setInicio]=useState("");
  const [fim,setFim]=useState("");
  const [pagina,setPagina]=useState(0);
  const [paginaSem,setPaginaSem]=useState(0);
  useEffect(()=>{let ativo=true;setLoading(true);setErro("");
    void (async()=>{try{
      const {data:autorizado,error:erroPermissao}=await supabase.rpc("gc_financeiro_permitido",{p_empresa:empresaId});
      if(erroPermissao)throw erroPermissao;
      if(autorizado!==true)throw new Error("Acesso financeiro não autorizado.");
      const [ps,pa,rs]=await Promise.all([
        buscarTudo<Pedido>("gc_pedidos","id,numero,cliente,obra,total,situacao",empresaId),
        buscarTudo<Parcela>("gc_parcelas","id,pedido_id,numero,valor,vencimento,cancelada",empresaId),
        buscarTudo<Recebimento>("gc_recebimentos","id,parcela_id,valor,data_pagamento,estornado_em",empresaId)
      ]);
      if(ativo){setPedidos(ps);setParcelas(pa);setRecebimentos(rs);}
    }catch(e){if(ativo)setErro(e instanceof Error?e.message:"Não foi possível carregar o painel financeiro.");}
    finally{if(ativo)setLoading(false);}})();
    return()=>{ativo=false};
  },[empresaId,atualizacao]);
  const hoje=hojeSP();
  const mes=hoje.slice(0,7);
  const dados=useMemo(()=>{
    const porPedido=new Map(pedidos.map(p=>[p.id,p]));
    const recebidos=new Map<string,number>();
    let recebidoMes=0;
    for(const r of recebimentos){if(r.estornado_em)continue;recebidos.set(r.parcela_id,(recebidos.get(r.parcela_id)||0)+cent(r.valor));if(r.data_pagamento?.slice(0,7)===mes)recebidoMes+=cent(r.valor);}
    const comHistorico=new Set(parcelas.map(p=>p.pedido_id));
    let aberto=0,vencido=0,proximos=0;
    const linhas:Linha[]=[];
    for(const p of parcelas){if(p.cancelada)continue;const pedido=porPedido.get(p.pedido_id);if(!pedido||pedido.situacao==="cancelado")continue;
      const pago=recebidos.get(p.id)||0;
      const saldo=Math.max(0,cent(p.valor)-pago);
      aberto+=saldo;
      if(p.vencimento<hoje)vencido+=saldo;
      else if(p.vencimento<=maisDias(hoje,7))proximos+=saldo;
      linhas.push({parcela:p,pedido,saldo,recebido:pago,status:saldo===0?"Paga":p.vencimento<hoje?"Vencida":pago>0?"Parcial":"Pendente"});
    }
    linhas.sort((a,b)=>a.parcela.vencimento.localeCompare(b.parcela.vencimento)||a.pedido.numero-b.pedido.numero||a.parcela.numero-b.parcela.numero);
    const sem=pedidos.filter(p=>p.situacao!=="cancelado"&&!comHistorico.has(p.id)).sort((a,b)=>b.numero-a.numero);
    return {linhas,sem,aberto,vencido,proximos,recebidoMes};
  },[pedidos,parcelas,recebimentos,hoje,mes]);
  const meses=useMemo(()=>{
    const referencia=new Date(`${mes}-01T12:00:00Z`);
    const itens=Array.from({length:6},(_,i)=>{const d=new Date(referencia);d.setUTCMonth(d.getUTCMonth()+i-2);const chave=d.toISOString().slice(0,7);return {chave,rotulo:new Intl.DateTimeFormat("pt-BR",{month:"short",year:"2-digit",timeZone:"UTC"}).format(d),previsto:0,recebido:0};});
    const porMes=new Map(itens.map(x=>[x.chave,x]));
    const validas=new Set(dados.linhas.map(x=>x.parcela.id));
    for(const l of dados.linhas){const item=porMes.get(l.parcela.vencimento.slice(0,7));if(item)item.previsto+=l.saldo;}
    for(const r of recebimentos){if(r.estornado_em||!validas.has(r.parcela_id))continue;const item=porMes.get(r.data_pagamento.slice(0,7));if(item)item.recebido+=cent(r.valor);}
    return itens;
  },[dados.linhas,recebimentos,mes]);
  const maxGrafico=Math.max(1,...meses.flatMap(m=>[m.previsto,m.recebido]));
  function exportarCsv(){
    const campos=["Pedido","Cliente","Obra","Parcela","Vencimento","Valor (R$)","Recebido (R$)","Saldo (R$)","Situação"];
    const esc=(v:string|number)=>`"${String(v).replace(/"/g,'""')}"`;
    const linhas=filtradas.map(l=>[l.pedido.numero,l.pedido.cliente,l.pedido.obra,l.parcela.numero,dataBR(l.parcela.vencimento),(cent(l.parcela.valor)/100).toFixed(2).replace(".",","),(l.recebido/100).toFixed(2).replace(".",","),(l.saldo/100).toFixed(2).replace(".",","),l.status]);
    const csv="\uFEFF"+[campos,...linhas].map(l=>l.map(esc).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`glasscode-contas-a-receber-${hoje}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  const filtradas=useMemo(()=>dados.linhas.filter(l=>{
    const q=termo.trim().toLocaleLowerCase("pt-BR");
    return (!q||l.pedido.cliente.toLocaleLowerCase("pt-BR").includes(q)||String(l.pedido.numero).includes(q)||l.pedido.obra.toLocaleLowerCase("pt-BR").includes(q))
      &&(situacao==="todas"||l.status===situacao)
      &&(!inicio||l.parcela.vencimento>=inicio)&&(!fim||l.parcela.vencimento<=fim);
  }),[dados.linhas,termo,situacao,inicio,fim]);
  const semFiltradas=useMemo(()=>dados.sem.filter(p=>{const q=termo.trim().toLocaleLowerCase("pt-BR");return !q||p.cliente.toLocaleLowerCase("pt-BR").includes(q)||p.obra.toLocaleLowerCase("pt-BR").includes(q)||String(p.numero).includes(q)}),[dados.sem,termo]);
  const tamanho=20;
  const maxPagina=Math.max(0,Math.ceil(filtradas.length/tamanho)-1);
  const maxSem=Math.max(0,Math.ceil(semFiltradas.length/tamanho)-1);
  const abrir=(id:string)=>onAbrirPedido(id);
  if(loading)return <p role="status">Calculando indicadores financeiros…</p>;
  if(erro)return <section className={styles.aviso} role="alert">{erro} <button type="button" onClick={()=>setAtualizacao(v=>v+1)}>Tentar novamente</button></section>;
  return <section className={styles.painel}>
    <div className={styles.cabecalho}><div><h2>Visão geral</h2><p>Valores reais dos pedidos e parcelas da empresa. Recebimentos estornados são desconsiderados.</p></div><button type="button" onClick={()=>setAtualizacao(v=>v+1)}>Atualizar indicadores</button></div>
    <div className={styles.cards}>
      <div><span>Saldo das parcelas ativas</span><strong>{dinheiro(dados.aberto/100)}</strong></div>
      <div><span>Recebido no mês</span><strong>{dinheiro(dados.recebidoMes/100)}</strong></div>
      <div><span>Vencido e não recebido</span><strong>{dinheiro(dados.vencido/100)}</strong></div>
      <div><span>A vencer nos próximos 7 dias</span><strong>{dinheiro(dados.proximos/100)}</strong></div>
    </div>
    <p className={styles.nota}>Os indicadores de saldo e vencimento consideram apenas parcelas ativas de pedidos não cancelados. O recebido no mês considera pagamentos não estornados pela data de pagamento, inclusive históricos. Pedidos sem parcelas aparecem apenas na seção separada abaixo. Pedidos com parcelas canceladas não são classificados como aguardando primeiro parcelamento.</p>
    <div className={styles.bloco}>
      <div className={styles.blocoTitulo}><div><h3>Fluxo de recebimentos · 6 meses</h3><p>Recebido por data de pagamento e saldo ainda previsto por mês de vencimento.</p></div></div>
      <div className={styles.grafico} role="img" aria-label="Gráfico de recebimentos e saldos previstos nos seis meses">
        {meses.map(m=><div key={m.chave} className={styles.grupoMes}>
          <div className={styles.barras}>
            <div className={styles.barraRecebido} style={{height:`${m.recebido/maxGrafico*100}%`}} title={`Recebido: ${dinheiro(m.recebido/100)}`}/>
            <div className={styles.barraPrevisto} style={{height:`${m.previsto/maxGrafico*100}%`}} title={`Saldo previsto: ${dinheiro(m.previsto/100)}`}/>
          </div><span>{m.rotulo}</span><small>{dinheiro(m.recebido/100)} / {dinheiro(m.previsto/100)}</small>
        </div>)}
      </div>
      <div className={styles.legenda}><span><i className={styles.pontoRecebido}/> Recebido</span><span><i className={styles.pontoPrevisto}/> Saldo previsto</span></div>
    </div>
    <div className={styles.filtros}>
      <label>Cliente, obra ou pedido<input value={termo} onChange={e=>{setTermo(e.target.value);setPagina(0);setPaginaSem(0)}} placeholder="Pesquisar"/></label>
      <label>Situação<select value={situacao} onChange={e=>{setSituacao(e.target.value);setPagina(0)}}><option value="todas">Todas</option><option value="Vencida">Vencidas</option><option value="Pendente">Pendentes</option><option value="Parcial">Parciais</option><option value="Paga">Pagas</option></select></label>
      <label>Vencimento de<input type="date" value={inicio} onChange={e=>{setInicio(e.target.value);setPagina(0)}}/></label>
      <label>Até<input type="date" min={inicio||undefined} value={fim} onChange={e=>{setFim(e.target.value);setPagina(0)}}/></label>
      <button type="button" onClick={()=>{setTermo("");setSituacao("todas");setInicio("");setFim("");setPagina(0);setPaginaSem(0)}}>Limpar filtros</button>
      <button type="button" onClick={exportarCsv}>Exportar CSV</button>
    </div>
    <div className={styles.bloco}><div className={styles.blocoTitulo}><h3>Parcelas e contas a receber</h3><span>{filtradas.length} parcela(s)</span></div><div className={styles.rolagem}><table><thead><tr><th>Pedido / cliente</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Saldo</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{filtradas.slice(Math.min(pagina,maxPagina)*tamanho,(Math.min(pagina,maxPagina)+1)*tamanho).map(l=><tr key={l.parcela.id}><td><strong>#{l.pedido.numero}</strong><small>{l.pedido.cliente}</small><small>{l.pedido.obra}</small></td><td>{l.parcela.numero}</td><td>{dataBR(l.parcela.vencimento)}</td><td>{dinheiro(Number(l.parcela.valor))}</td><td>{dinheiro(l.saldo/100)}</td><td><span className={l.status==="Vencida"?styles.atraso:l.status==="Paga"?styles.paga:styles.estado}>{l.status}</span></td><td><button type="button" onClick={()=>abrir(l.pedido.id)}>Gerenciar recebimento</button></td></tr>)}</tbody></table></div>{!filtradas.length&&<p className={styles.vazio}>Nenhuma parcela encontrada.</p>}<div className={styles.paginacao}><button disabled={pagina<=0} onClick={()=>setPagina(v=>v-1)}>Anterior</button><span>Página {Math.min(pagina,maxPagina)+1} de {maxPagina+1}</span><button disabled={pagina>=maxPagina} onClick={()=>setPagina(v=>v+1)}>Próxima</button></div></div>
    <div className={styles.bloco}><div className={styles.blocoTitulo}><div><h3>Pedidos aguardando parcelamento</h3><p>Separados dos indicadores de vencimento. Sem data de cobrança definida.</p></div><span>{semFiltradas.length} pedido(s)</span></div><div className={styles.rolagem}><table><thead><tr><th>Pedido</th><th>Cliente / obra</th><th>Total do pedido</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{semFiltradas.slice(Math.min(paginaSem,maxSem)*tamanho,(Math.min(paginaSem,maxSem)+1)*tamanho).map(p=><tr key={p.id}><td>#{p.numero}</td><td>{p.cliente}<small>{p.obra}</small></td><td>{dinheiro(Number(p.total))}</td><td>{p.situacao}</td><td><button type="button" onClick={()=>abrir(p.id)}>Gerenciar parcelas</button></td></tr>)}</tbody></table></div>{!semFiltradas.length&&<p className={styles.vazio}>Nenhum pedido aguardando parcelamento.</p>}<div className={styles.paginacao}><button disabled={paginaSem<=0} onClick={()=>setPaginaSem(v=>v-1)}>Anterior</button><span>Página {Math.min(paginaSem,maxSem)+1} de {maxSem+1}</span><button disabled={paginaSem>=maxSem} onClick={()=>setPaginaSem(v=>v+1)}>Próxima</button></div></div>
  </section>;
}
