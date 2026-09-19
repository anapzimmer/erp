"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mensagens, situacoes, type Situacao } from "@/lib/situacaoConta";
import { supabase } from "@/lib/supabaseClient";

export default function PlatformAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [estado, setEstado] = useState<"verificando" | "liberado" | "bloqueado" | "erro">("verificando");
  const [detalhe, setDetalhe] = useState<{situacao:Situacao;mensagem?:string;contato?:string;prazo?:string;prazo_vencido?:boolean}|null>(null);
  const [tentativa, setTentativa] = useState(0);
  const publica = ["/login", "/update-password", "/reset-password"].includes(pathname);
  useEffect(() => {
    let ativo = true;
    let verificando = false;
    async function verificar() {
      if (verificando) return;
      verificando = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (ativo) { setEstado("liberado"); setDetalhe(null); } return; }
        const situacao = await supabase.rpc("gc_minha_situacao");
        if (!ativo) return;
        if (!situacao.error) {
          setDetalhe(situacao.data);
          setEstado(situacao.data?.permitido === true ? "liberado" : "bloqueado");
          return;
        }
        if (situacao.error.code !== "PGRST202") { setEstado("erro"); return; }
        setDetalhe(null);
        const { data, error } = await supabase.rpc("gc_acesso_permitido");
        if (!ativo) return;
        // Compatibilidade durante implantação: o painel só funciona após instalar a migração.
        if (error?.code === "PGRST202") setEstado("liberado");
        else if (error) setEstado("erro");
        else setEstado(data === true ? "liberado" : "bloqueado");
      } catch { if (ativo) setEstado("erro"); }
      finally { verificando = false; }
    }
    if (publica) return;
    void verificar();
    const intervalo = setInterval(() => { if(document.visibilityState==='visible')void verificar(); }, 15000);
    const foco = () => void verificar();
    const visibilidade = () => { if(document.visibilityState==='visible')void verificar(); };
    window.addEventListener("focus", foco);
    document.addEventListener("visibilitychange", visibilidade);
    // Deferir evita executar chamadas Supabase dentro do lock do callback de autenticação.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (ativo) void verificar(); }, 0); });
    return () => { ativo = false; clearInterval(intervalo); window.removeEventListener("focus", foco); document.removeEventListener("visibilitychange", visibilidade); subscription.unsubscribe(); };
  }, [pathname, publica, tentativa]);
  if (publica) return children;
  const texto = detalhe?.mensagem || mensagens[detalhe?.situacao || "suspensa_outro"];
  const atendimento = detalhe?.contato ? <p className="mt-3 text-sm break-words">Atendimento: {detalhe.contato}</p> : null;
  const prazo = detalhe?.prazo ? <p className="mt-2 text-sm">{detalhe.prazo_vencido ? "Prazo de regularização encerrado em" : "Prazo para regularização"}: {detalhe.prazo.split('-').reverse().join('/')}. {detalhe.prazo_vencido && "Entre em contato para atualizar sua situação."}</p> : null;
  if (estado === "liberado") return <>{children}{detalhe && detalhe.situacao !== "ativa" && <aside aria-label="Aviso da conta" className="fixed bottom-4 right-4 z-[450] w-[calc(100%-2rem)] max-w-md rounded-xl border border-[#4fa2d9]/25 bg-[#f2f7f9] text-[#1c415b] shadow-lg"><details open key={`${detalhe.situacao}-${detalhe.prazo}-${texto}`}><summary className="cursor-pointer px-5 py-3 text-sm font-medium">{situacoes[detalhe.situacao]} · aviso da conta</summary><div role="status" className="max-h-[50vh] overflow-auto border-t border-[#4fa2d9]/15 px-5 py-4"><p className="text-sm leading-6">{texto}</p>{prazo}{atendimento}<p className="mt-3 text-xs text-slate-500">Você pode continuar utilizando o sistema. Clique no título para recolher este aviso.</p></div></details></aside>}</>;
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6"><section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-[#1c415b]">
    <p className="mb-5 text-xs uppercase tracking-widest text-slate-500">Glass Code · Atendimento da conta</p>
    <h1 className="text-xl font-medium">{estado === "verificando" ? "Verificando acesso…" : estado === "bloqueado" ? detalhe?.situacao === "cancelada" ? "Conta cancelada" : "Acesso temporariamente suspenso" : "Não foi possível verificar seu acesso"}</h1>
    {estado !== "verificando" && <><p className="mt-4 text-sm leading-6 text-slate-600">{estado === "bloqueado" ? texto : "Confira sua conexão e tente novamente."}</p>{estado === "bloqueado" && <>{prazo}{atendimento}</>}
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setTentativa(t => t + 1)} className="rounded-lg bg-[#1c415b] px-4 py-2 text-sm text-white">Verificar situação novamente</button><button className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>Sair da conta</button></div></>}
  </section></main>;
}
