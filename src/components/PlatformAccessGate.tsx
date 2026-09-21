"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { diasParaRegularizar, mensagens, situacoes, type Situacao } from "@/lib/situacaoConta";
import AvisoConta from "@/components/AvisoConta";
import { supabase } from "@/lib/supabaseClient";

export default function PlatformAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [estado, setEstado] = useState<"verificando" | "liberado" | "bloqueado" | "erro">("verificando");
  const [detalhe, setDetalhe] = useState<{situacao:Situacao;mensagem?:string;contato?:string;prazo?:string;prazo_vencido?:boolean;inicio_em?:string}|null>(null);
  const [identificador, setIdentificador] = useState("");
  const [tentativa, setTentativa] = useState(0);
const publica =
  pathname === "/" ||
  pathname === "/planos" ||
  pathname === "/recursos" ||
  pathname === "/glasscode" ||
  pathname.startsWith("/glasscode/") ||
  ["/login", "/update-password", "/reset-password"].includes(pathname);
  useEffect(() => {
    let ativo = true;
    let verificando = false;
    async function verificar() {
      if (verificando) return;
      verificando = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (ativo) { setEstado("liberado"); setDetalhe(null); } return; }
        if (ativo) setIdentificador(`${session.user.id}:${session.user.last_sign_in_at || "sessao"}`);
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
    const foco = () => void verificar();
    const visibilidade = () => { if(document.visibilityState==='visible')void verificar(); };
    window.addEventListener("focus", foco);
    document.addEventListener("visibilitychange", visibilidade);
    // Deferir evita executar chamadas Supabase dentro do lock do callback de autenticação.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (ativo) void verificar(); }, 0); });
    return () => { ativo = false; window.removeEventListener("focus", foco); document.removeEventListener("visibilitychange", visibilidade); subscription.unsubscribe(); };
  }, [pathname, tentativa]);
  if (publica) return children;
  const texto = detalhe?.mensagem || mensagens[detalhe?.situacao || "suspensa_outro"];
  const atendimento = detalhe?.contato ? <p className="mt-3 text-sm break-words">Atendimento: {detalhe.contato}</p> : null;
  const diasRestantes = detalhe?.prazo ? diasParaRegularizar(detalhe.prazo) : null;
  const prazo = detalhe?.prazo ? <p className="mt-2 text-sm">{detalhe.prazo_vencido ? "Prazo de regularização encerrado em" : "Prazo para regularização"}: {detalhe.prazo.split('-').reverse().join('/')}. {detalhe.prazo_vencido && "Entre em contato para atualizar sua situação."}</p> : null;
  const aviso = JSON.stringify([detalhe?.situacao, texto, detalhe?.prazo, detalhe?.prazo_vencido, detalhe?.contato, detalhe?.inicio_em]);
  if (estado === "liberado") return <>{children}{detalhe && detalhe.situacao !== "ativa" && identificador && <AvisoConta identificador={identificador} aviso={aviso} titulo={situacoes[detalhe.situacao]}><p>{texto}</p>{prazo}{diasRestantes !== null && Number.isFinite(diasRestantes) && diasRestantes >= 0 && <p className="mt-2 font-medium">{diasRestantes === 0 ? "O prazo de regularização termina hoje." : `Você tem ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"} para regularizar.`}</p>}{atendimento}</AvisoConta>}</>;
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-text-primary">
    <p className="mb-5 text-xs uppercase tracking-widest text-text-secondary">Glass Code · Atendimento da conta</p>
    <h1 className="text-xl font-medium">{estado === "verificando" ? "Verificando acesso…" : estado === "bloqueado" ? detalhe?.situacao === "cancelada" ? "Conta cancelada" : "Acesso temporariamente suspenso" : "Não foi possível verificar seu acesso"}</h1>
    {estado !== "verificando" && <><p className="mt-4 text-sm leading-6 text-text-secondary">{estado === "bloqueado" ? texto : "Confira sua conexão e tente novamente."}</p>{estado === "bloqueado" && <>{prazo}{atendimento}</>}
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setTentativa(t => t + 1)} className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary">Verificar situação novamente</button><button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>Sair da conta</button></div></>}
  </section></main>;
}
