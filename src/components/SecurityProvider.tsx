// src/components/SecurityProvider.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PresencaUsuario from "./PresencaUsuario";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const LAST_ACTIVITY_KEY = "glasscode:last-activity-at";

const formatarTempoRestante = (ms: number) => {
  const totalSegundos = Math.max(Math.ceil(ms / 1000), 0);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
    2,
    "0"
  )}`;
};

export default function SecurityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [tempoRestanteAvisoMs, setTempoRestanteAvisoMs] =
    useState<number | null>(null);

  const renovarSessaoRef = useRef<null | (() => void)>(null);

  // ============================================================
  // ROTAS PÚBLICAS DO GLASS CODE
  // Nestas páginas NÃO aplicamos o controle de sessão do ERP.
  // ============================================================
  const rotaPublica =
    pathname === "/" ||
    pathname === "/recursos" ||
    pathname === "/planos" ||
    pathname === "/login" ||
    pathname === "/update-password" ||
    pathname === "/reset-password";

  useEffect(() => {
    // ============================================================
    // SITE PÚBLICO
    // Não executa bloqueios nem auto-logout do ERP.
    // ============================================================
    if (rotaPublica) {
      setTempoRestanteAvisoMs(null);
      renovarSessaoRef.current = null;
      return;
    }

    // ============================================================
    // ERP PRIVADO
    // A partir daqui continua a segurança normal do sistema.
    // ============================================================

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey &&
        ["U", "S", "P", "C"].includes(e.key.toUpperCase())
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    if (process.env.NODE_ENV !== "development") {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("contextmenu", handleContextMenu);
    }

    // ============================================================
    // AUTO-LOGOUT POR INATIVIDADE - 1 HORA
    // ============================================================

    let timeout: ReturnType<typeof setTimeout> | null = null;

    let intervaloAviso: ReturnType<typeof setInterval> | null = null;

    let ultimoEventoEmMs =
      Number(window.localStorage.getItem(LAST_ACTIVITY_KEY)) ||
      Date.now();

    let fazendoLogout = false;

    const logout = async () => {
      if (fazendoLogout) return;

      fazendoLogout = true;

      setTempoRestanteAvisoMs(null);

      window.localStorage.removeItem(LAST_ACTIVITY_KEY);

      await supabase.auth.signOut();

      router.replace("/login");
    };

    const sessaoExpirada = () =>
      Date.now() - ultimoEventoEmMs >= IDLE_TIMEOUT_MS;

    const atualizarAviso = () => {
      const inativoPor = Date.now() - ultimoEventoEmMs;

      const tempoRestante = Math.max(
        IDLE_TIMEOUT_MS - inativoPor,
        0
      );

      if (tempoRestante <= WARNING_THRESHOLD_MS) {
        setTempoRestanteAvisoMs(tempoRestante);
      } else {
        setTempoRestanteAvisoMs(null);
      }
    };

    const agendarLogout = () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      const agora = Date.now();

      const tempoDecorrido =
        agora - ultimoEventoEmMs;

      const tempoRestante = Math.max(
        IDLE_TIMEOUT_MS - tempoDecorrido,
        0
      );

      timeout = setTimeout(() => {
        const inativoPor =
          Date.now() - ultimoEventoEmMs;

        if (inativoPor >= IDLE_TIMEOUT_MS) {
          logout();
          return;
        }

        agendarLogout();
      }, tempoRestante);
    };

    const registrarAtividade = () => {
      if (sessaoExpirada()) {
        logout();
        return;
      }

      ultimoEventoEmMs = Date.now();

      window.localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(ultimoEventoEmMs)
      );

      setTempoRestanteAvisoMs(null);

      agendarLogout();
      atualizarAviso();
    };

    renovarSessaoRef.current =
      registrarAtividade;

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

    events.forEach((event) =>
      window.addEventListener(
        event,
        registrarAtividade,
        { passive: true }
      )
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (sessaoExpirada()) {
          logout();
          return;
        }

        registrarAtividade();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    intervaloAviso = setInterval(() => {
      if (sessaoExpirada()) {
        logout();
        return;
      }

      atualizarAviso();
    }, 1000);

    atualizarAviso();
    agendarLogout();

    // ============================================================
    // LIMPEZA
    // ============================================================

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "contextmenu",
        handleContextMenu
      );

      events.forEach((event) =>
        window.removeEventListener(
          event,
          registrarAtividade
        )
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (intervaloAviso) {
        clearInterval(intervaloAviso);
      }

      if (timeout) {
        clearTimeout(timeout);
      }

      renovarSessaoRef.current = null;
    };
  }, [router, rotaPublica]);

  return (
    <div className="select-none h-full w-full relative">
      {/* Presença continua disponível para o ERP */}
      {!rotaPublica && <PresencaUsuario />}

      {children}

      {!rotaPublica &&
        tempoRestanteAvisoMs !== null && (
          <div className="fixed bottom-4 right-4 z-9999 max-w-sm rounded-2xl border border-warning-soft bg-warning-soft px-4 py-3 shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-wider text-warning">
              Sessão por inatividade
            </p>

            <p className="mt-1 text-sm font-semibold text-warning">
              Sua sessão expira em{" "}
              {formatarTempoRestante(
                tempoRestanteAvisoMs
              )}{" "}
              se não houver atividade.
            </p>

            <button
              type="button"
              onClick={() =>
                renovarSessaoRef.current?.()
              }
              className="mt-3 rounded-xl border border-warning bg-warning-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-warning transition-colors hover:bg-warning-soft"
            >
              Continuar sessão
            </button>
          </div>
        )}
    </div>
  );
}