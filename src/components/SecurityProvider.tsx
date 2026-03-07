// src/components/SecurityProvider.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    // --- LÓGICA DE AUTO-LOGOUT (1 hora) ---
    let timeout: NodeJS.Timeout;

    const logout = async () => {
      await supabase.auth.signOut();
      router.push("/login");
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(logout, 3600000); // 1 hora
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(timeout);
    };
  }, [router, supabase]);

  return (
    <div className="select-none h-full w-full">
      {children}
    </div>
  );
}