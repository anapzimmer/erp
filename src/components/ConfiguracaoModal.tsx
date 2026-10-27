"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function ConfiguracaoModal({ aberto, fechar, titulo, children, ocupado = false, compacto = false }: { aberto: boolean; fechar: () => void; titulo: string; children: ReactNode; ocupado?: boolean; compacto?: boolean }) {
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
  return <dialog ref={ref} aria-labelledby={tituloId} onCancel={event => { event.preventDefault(); if (!ocupado) fechar(); }} style={compacto ? {maxWidth:440} : undefined} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-border bg-surface p-0 text-text-primary shadow-xl backdrop:bg-black/35">
    <div className={compacto ? "flex items-center justify-between gap-4 bg-surface px-6 pt-5 pb-0" : "sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4"}><h2 id={tituloId} className={compacto ? "text-base font-medium" : "text-lg font-medium"}>{titulo}</h2><button type="button" style={compacto ? {border:0,padding:6,background:"transparent"} : undefined} disabled={ocupado} aria-label="Fechar configurações" onClick={fechar} className="rounded-lg p-2 hover:bg-surface-secondary disabled:opacity-40"><X size={20}/></button></div>
    <div className={compacto ? "px-6 pt-3 pb-5" : "p-6"}>{aberto && children}</div>
  </dialog>;
}
