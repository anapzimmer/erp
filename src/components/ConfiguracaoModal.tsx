"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function ConfiguracaoModal({ aberto, fechar, titulo, children, ocupado = false }: { aberto: boolean; fechar: () => void; titulo: string; children: ReactNode; ocupado?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!aberto || !dialog) return;
    const anterior = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; anterior?.focus(); };
  }, [aberto]);
  return <dialog ref={ref} aria-labelledby={tituloId} onCancel={event => { event.preventDefault(); if (!ocupado) fechar(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-border bg-surface p-0 text-text-primary shadow-xl backdrop:bg-black/35">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4"><h2 id={tituloId} className="text-lg font-medium">{titulo}</h2><button type="button" disabled={ocupado} aria-label="Fechar configurações" onClick={fechar} className="rounded-lg p-2 hover:bg-surface-secondary disabled:opacity-40"><X size={20}/></button></div>
    <div className="p-6">{aberto && children}</div>
  </dialog>;
}
