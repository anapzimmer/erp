"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PlatformAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [estado, setEstado] = useState<"verificando" | "liberado" | "bloqueado" | "erro">("verificando");
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
        if (!session) { if (ativo) setEstado("liberado"); return; }
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
    const intervalo = setInterval(() => void verificar(), 60000);
    const foco = () => void verificar();
    window.addEventListener("focus", foco);
    // Deferir evita executar chamadas Supabase dentro do lock do callback de autenticação.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (ativo) void verificar(); }, 0); });
    return () => { ativo = false; clearInterval(intervalo); window.removeEventListener("focus", foco); subscription.unsubscribe(); };
  }, [pathname, publica, tentativa]);
  if (publica || estado === "liberado") return children;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-slate-700"><h1 className="text-xl font-medium">{estado === "verificando" ? "Verificando acesso…" : estado === "bloqueado" ? "Acesso suspenso" : "Não foi possível verificar seu acesso"}</h1>{estado !== "verificando" && <><p className="mt-3 text-sm">{estado === "bloqueado" ? "Entre em contato com a administração do Glass Code. Seus dados estão preservados." : "Confira sua conexão e tente novamente."}</p><div className="mt-5 flex gap-4"><button onClick={() => setTentativa(t => t + 1)} className="text-sm underline">Verificar novamente</button><button className="text-sm underline" onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>Sair</button></div></>}</section></main>;
}
