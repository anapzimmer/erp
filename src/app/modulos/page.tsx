"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
export default function ModulosPage(){
 const [acesso,setAcesso]=useState<{gestao:boolean;producao:boolean}|null>(null),[erro,setErro]=useState("");
 useEffect(()=>{let ativo=true;async function carregar(){const {data,error}=await supabase.rpc("gc_meus_modulos");if(!ativo)return;if(error){setAcesso(null);setErro("Não foi possível verificar os módulos. Nenhum acesso foi liberado.");return}setErro("");setAcesso(data)}void carregar();const timer=setInterval(()=>void carregar(),30000);return()=>{ativo=false;clearInterval(timer)}},[]);
 return <main className="min-h-screen bg-surface-secondary p-8 text-text-primary"><div className="mx-auto max-w-4xl"><Link href="/dashboard">Voltar ao sistema</Link><h1 className="my-6 text-2xl">Módulos da empresa</h1><p>As funcionalidades de Gestão e Produção estão em implantação. Esta página mostra as liberações registradas pela administração.</p>{erro&&<p role="alert" className="mt-4">{erro}</p>}{!acesso&&!erro&&<p>Verificando contratação…</p>}<div className="mt-6 grid gap-4 md:grid-cols-2">{acesso&&([['gestao','Gestão','Pedidos e financeiro'],['producao','Produção','Estoque e planos de corte']] as const).map(([id,nome,descricao])=><section key={id} className="rounded-xl border border-border bg-surface p-6"><h2 className="text-xl">{nome}</h2><p className="mt-2">{descricao}</p><p className="mt-4">{acesso[id]?"Liberação registrada · em implantação":"Não liberado para esta empresa"}</p>{id==="gestao"&&acesso.gestao&&<Link className="mt-4 inline-block rounded border px-4 py-2" href="/gestao/pedidos">Abrir pedidos</Link>}</section>)}</div></div></main>
}
