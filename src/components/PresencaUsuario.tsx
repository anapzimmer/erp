"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PresencaUsuario() {
  useEffect(() => {
    let ativo = true;
    let enviando = false;
    let indisponivel = false;
    const enviar = async () => {
      if (!ativo || enviando || indisponivel || !navigator.onLine) return;
      enviando = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && ativo) {
          const { error } = await supabase.rpc('gc_registrar_presenca');
          if (error?.code === 'PGRST202') indisponivel = true;
        }
      } finally { enviando = false; }
    };
    const executar = () => { void enviar().catch(() => {}); };
    executar();
    const timer = setInterval(executar, 30000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(executar, 0); });
    window.addEventListener('online', executar);
    document.addEventListener('visibilitychange', executar);
    return () => { ativo = false; clearInterval(timer); subscription.unsubscribe(); window.removeEventListener('online', executar); document.removeEventListener('visibilitychange', executar); };
  }, []);
  return null;
}
