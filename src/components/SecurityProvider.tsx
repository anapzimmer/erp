// src/components/SecurityProvider.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

const formatarTempoRestante = (ms: number) => {
  const totalSegundos = Math.max(Math.ceil(ms / 1000), 0);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
};

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [tempoRestanteAvisoMs, setTempoRestanteAvisoMs] = useState<number | null>(null);
  const renovarSessaoRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    // --- LÓGICA DE SEGURANÇA (Bloqueios) ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ["U", "S", "P", "C"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    if (process.env.NODE_ENV !== 'development') {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("contextmenu", handleContextMenu);
    }

    // --- LÓGICA DE AUTO-LOGOUT POR INATIVIDADE (1 hora) ---
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let intervaloAviso: ReturnType<typeof setInterval> | null = null;
    let ultimoEventoEmMs = Date.now();
    let fazendoLogout = false;

    const logout = async () => {
      if (fazendoLogout) return;
      fazendoLogout = true;
      setTempoRestanteAvisoMs(null);
      await supabase.auth.signOut();
      router.push("/login");
    };

    const atualizarAviso = () => {
      const inativoPor = Date.now() - ultimoEventoEmMs;
      const tempoRestante = Math.max(IDLE_TIMEOUT_MS - inativoPor, 0);

      if (tempoRestante <= WARNING_THRESHOLD_MS) {
        setTempoRestanteAvisoMs(tempoRestante);
      } else {
        setTempoRestanteAvisoMs(null);
      }
    };

    const agendarLogout = () => {
      if (timeout) clearTimeout(timeout);

      const agora = Date.now();
      const tempoDecorrido = agora - ultimoEventoEmMs;
      const tempoRestante = Math.max(IDLE_TIMEOUT_MS - tempoDecorrido, 0);

      timeout = setTimeout(() => {
        const inativoPor = Date.now() - ultimoEventoEmMs;
        if (inativoPor >= IDLE_TIMEOUT_MS) {
          logout();
          return;
        }

        agendarLogout();
      }, tempoRestante);
    };

    const registrarAtividade = () => {
      ultimoEventoEmMs = Date.now();
      setTempoRestanteAvisoMs(null);
      agendarLogout();
      atualizarAviso();
    };

    renovarSessaoRef.current = registrarAtividade;

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "input",
      "pointerdown",
      "wheel",
    ];

    events.forEach((event) => window.addEventListener(event, registrarAtividade, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registrarAtividade();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    intervaloAviso = setInterval(() => {
      atualizarAviso();
    }, 1000);

    atualizarAviso();
    agendarLogout();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      events.forEach((event) => window.removeEventListener(event, registrarAtividade));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervaloAviso) clearInterval(intervaloAviso);
      if (timeout) clearTimeout(timeout);
      renovarSessaoRef.current = null;
    };
  }, [router]);

  return (
    <div className="select-none h-full w-full relative">
      {children}

      {tempoRestanteAvisoMs !== null && (
        <div className="fixed bottom-4 right-4 z-9999 max-w-sm rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">
            Sessão por inatividade
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-900">
            Sua sessão expira em {formatarTempoRestante(tempoRestanteAvisoMs)} se não houver atividade.
          </p>
          <button
            type="button"
            onClick={() => renovarSessaoRef.current?.()}
            className="mt-3 rounded-xl border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-800 transition-colors hover:bg-amber-200"
          >
            Continuar sessão
          </button>
        </div>
      )}
    </div>
  );
}