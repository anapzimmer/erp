// src/components/SecurityProvider.tsx
"use client";

import { useEffect } from "react";

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Bloquear F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+C e Ctrl+P
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "s") ||
        (e.ctrlKey && e.key === "p") ||
        (e.ctrlKey && e.key === "c") // Bloqueia cópia por teclado
      ) {
        e.preventDefault();
      }
    };

    // 2. Bloquear clique direito (Menu de contexto)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return (
    // 3. Bloquear seleção de texto via CSS Global
    <div className="select-none h-full w-full">
      {children}
    </div>
  );
}