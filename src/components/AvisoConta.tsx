"use client";
import { useEffect, useRef } from "react";

export default function AvisoConta({ identificador, aviso, titulo, children }: {
  identificador: string; aviso: string; titulo: string; children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const chave = `glasscode:aviso-conta:${identificador}`;
  useEffect(() => {
    const elemento = dialog.current;
    try { if (sessionStorage.getItem(chave) === aviso) return; } catch { /* Navegação com armazenamento indisponível. */ }
    elemento?.showModal();
    return () => elemento?.close();
  }, [chave, aviso]);
  function confirmar() {
    try { sessionStorage.setItem(chave, aviso); } catch { /* O fechamento continua funcionando. */ }
    dialog.current?.close();
  }
  return <dialog ref={dialog} aria-labelledby="aviso-conta-titulo" onCancel={e => { e.preventDefault(); confirmar(); }}
    className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-info/20 bg-surface p-7 text-text-primary shadow-2xl backdrop:bg-navigation/35 sm:p-8">
    <p className="mb-4 text-xs uppercase tracking-widest text-text-secondary">Glass Code · Aviso da conta</p>
    <h2 id="aviso-conta-titulo" className="text-xl font-medium">{titulo}</h2>
    <div className="mt-4 text-sm leading-6">{children}</div>
    <p className="mt-5 text-xs text-text-secondary">Você pode continuar utilizando o sistema após fechar este aviso.</p>
    <div className="mt-6 flex justify-end"><button autoFocus type="button" onClick={confirmar} className="min-w-24 rounded-lg bg-primary px-6 py-2.5 text-sm text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info">OK, entendi</button></div>
  </dialog>;
}
