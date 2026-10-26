"use client";
import {useEffect,useState} from "react";
import Header from "@/components/Header";
import {useAuth} from "@/hooks/useAuth";
import {supabase} from "@/lib/supabaseClient";
import FinanceiroPedido from "../pedidos/FinanceiroPedido";
import styles from "../pedidos/pedidos.module.css";
type Pedido={id:string;numero:number;cliente:string;obra:string;total:number;versao:number;situacao:string};
export default function FinanceiroPage(){
 const {user,empresaId,nomeEmpresa,signOut}=useAuth();
 const [termo,setTermo]=useState("");
 const [permitido,setPermitido]=useState(false),[loading,setLoading]=useState(true),[erro,setErro]=useState("");
 const [pedidos,setPedidos]=useState<Pedido[]>([]),[selecionado,setSelecionado]=useState<Pedido|null>(null),[busca,setBusca]=useState(""),[pagina,setPagina]=useState(0),[atualizar,setAtualizar]=useState(0);
 useEffect(()=>{let ativo=true;setSelecionado(null);setPedidos([]);setPermitido(false);setLoading(true);
 async function carregar(){if(!empresaId)return;try{
 const {data:ok,error:falha}=await supabase.rpc("gc_financeiro_permitido",{p_empresa:empresaId});if(falha)throw falha;if(!ativo)return;if(ok!==true){setLoading(false);return}
 let query=supabase.from("gc_pedidos").select("id,numero,cliente,obra,total,versao,situacao").eq("empresa_id",empresaId).order("criado_em",{ascending:false}).range(pagina*25,pagina*25+24);
 if(busca.trim())query=query.ilike("cliente",`%${busca.trim()}%`);
 const {data,error}=await query;if(error)throw error;
 let pedido:Pedido|null=null;const id=new URLSearchParams(window.location.search).get("pedido");
 if(id&&/^[a-f0-9-]{36}$/i.test(id)){const result=await supabase.from("gc_pedidos").select("id,numero,cliente,obra,total,versao,situacao").eq("empresa_id",empresaId).eq("id",id).maybeSingle();if(result.error)throw result.error;pedido=result.data;}
 if(ativo){setPermitido(true);setPedidos(data||[]);setSelecionado(pedido);setErro("")}
 }catch(e){if(ativo)setErro((e as {message?:string}).message||"Não foi possível consultar o financeiro.")}finally{if(ativo)setLoading(false)}}
 void carregar();return()=>{ativo=false};},[empresaId,busca,pagina,atualizar]);
 return <div className={styles.page}><Header nomeEmpresa={nomeEmpresa||""} usuarioEmail={user?.email||""} handleSignOut={()=>void signOut()}/><main className={styles.main}><div className={styles.heading}><div><p className={styles.eyebrow}>FINANCEIRO · CONTAS A RECEBER</p><h1>Recebimentos dos pedidos</h1><p>Organize parcelas, acompanhe saldos e registre pagamentos.</p></div><button onClick={()=>setAtualizar(v=>v+1)}>Atualizar</button></div>{erro&&<p role="alert" className={styles.notice}>{erro}</p>}{loading?<p>Consultando acesso…</p>:!permitido?<p className={styles.notice}>A empresa precisa de Gestão liberada e seu usuário de permissão financeira.</p>:<>{selecionado&&empresaId?<section className={styles.editor}><div className={styles.heading}><div><h2>Pedido #{selecionado.numero} · {selecionado.cliente}</h2><p>{selecionado.obra}</p></div><button onClick={()=>{setSelecionado(null);window.history.replaceState(null,"","/gestao/financeiro")}}>Voltar à lista</button></div><div className={styles.form}><FinanceiroPedido key={`${selecionado.id}-${atualizar}`} pedido={selecionado} empresaId={empresaId}/></div></section>:<section className={styles.panel}><div className={styles.toolbar}><label>Buscar cliente<input value={termo} onChange={e=>setTermo(e.target.value)} placeholder="Nome do cliente"/></label><button onClick={()=>{setBusca(termo);setPagina(0)}}>Buscar</button></div><div className={styles.scroll}><table><thead><tr><th>Pedido</th><th>Cliente / obra</th><th>Total do pedido</th><th>Ação</th></tr></thead><tbody>{pedidos.map(p=><tr key={p.id}><td>#{p.numero}</td><td>{p.cliente}<small>{p.obra}</small></td><td>{Number(p.total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td><td><button onClick={()=>setSelecionado(p)}>Parcelas e recebimentos</button></td></tr>)}</tbody></table></div>{!pedidos.length&&<p className={styles.empty}>Nenhum pedido encontrado. Crie ou aprove um orçamento em Gestão → Pedidos.</p>}<div className={styles.pagination}><button disabled={pagina===0} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina+1}</span><button disabled={pedidos.length<25} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></section>}</>}</main></div>
}
