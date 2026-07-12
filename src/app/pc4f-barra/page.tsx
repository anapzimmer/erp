"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export default function PC4FBarraPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#07385a]/10 text-[#07385a]">
          <Construction size={34} strokeWidth={1.7} />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">PC4F - Barra</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#0f2742]">P?gina em constru??o</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O c?lculo por barra deste projeto ainda ser? montado.
        </p>
        <Link
          href="/matriz-projetos"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#07385a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#052b46]"
        >
          <ArrowLeft size={18} />
          Voltar para Matriz
        </Link>
      </section>
    </main>
  );
}
