"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { consultarPlataforma } from "@/lib/plataforma";
import s from "./plataforma.module.css";
type Evento = { id: string; email: string; empresa: string | null; acao: string; criado_em: string; origem: string };
const nomes: Record<string,string> = { login:"Login · registro de autenticação", logout:"Saída da conta", mfa_code_login:"Login com autenticação adicional", ultimo_login:"Último login conhecido" };
export default function HistoricoAcessos() {
  const [eventos,setEventos]=useState<Evento[]>([]);
  const [busca,setBusca]=useState(""); const [filtro,setFiltro]=useState(""); const [pagina,setPagina]=useState(0);
  const [erro,setErro]=useState(""); const [loading,setLoading]=useState(true); const versao=useRef(0);
  const carregar=useCallback(async () => {
    const v=++versao.current;setLoading(true);
    try { const r=await consultarPlataforma(`?modo=acessos&busca=${encodeURIComponent(filtro)}&pagina=${pagina}`);if(v===versao.current){setEventos(r.eventos);setErro("");} }
    catch(e){if(v===versao.current){setEventos([]);setErro(e instanceof Error?e.message:"Não foi possível carregar os acessos.");}}
    finally{if(v===versao.current)setLoading(false);}
  },[filtro,pagina]);
  useEffect(()=>{const controle=versao;const inicio=setTimeout(()=>void carregar(),0);const timer=setInterval(()=>{if(document.visibilityState==='visible')void carregar();},30000);return()=>{clearTimeout(inicio);clearInterval(timer);controle.current++;};},[carregar]);
  return <section className={s.panel}>
    <div className={s.notice}>Entradas e saídas registradas pelo Supabase. Quando não há histórico disponível, mostramos somente o último login conhecido. Estes registros não indicam presença online. Atualização a cada 30 segundos.</div>
    <form className={s.toolbar} onSubmit={e=>{e.preventDefault();setPagina(0);setFiltro(busca.trim());}}><div className={s.search}><input className={s.input} aria-label="Buscar acessos" placeholder="Buscar e-mail ou empresa" maxLength={100} value={busca} onChange={e=>setBusca(e.target.value)}/><button className={s.button} disabled={loading}>Buscar</button></div><button type="button" className={s.button} disabled={loading} onClick={()=>void carregar()}>{loading?'Atualizando…':'Atualizar'}</button></form>
    {erro&&<p role="alert" className={s.error}>{erro}</p>}
    <div className={s.scroll}><table className={s.table}><thead><tr>{['Data e hora · Brasília','Usuário','Empresa','Registro'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{eventos.map(e=><tr key={e.id}><td>{new Date(e.criado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</td><td>{e.email}</td><td>{e.empresa||'Sem empresa vinculada'}</td><td>{nomes[e.acao]||e.acao}<small>{e.origem==='auditoria'?'Histórico de autenticação':'Somente o último login; não é um histórico completo'}</small></td></tr>)}</tbody></table></div>
    {!loading&&!erro&&!eventos.length&&<p className={s.empty}>Nenhum registro encontrado para esta busca.</p>}
    <div className={s.footer}><button className={s.button} disabled={loading||pagina===0} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina+1} · até 50 registros</span><button className={s.button} disabled={loading||eventos.length<50} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div>
  </section>;
}
