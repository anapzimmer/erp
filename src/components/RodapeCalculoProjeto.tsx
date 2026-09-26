"use client";
import type { ComponentProps } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import Link from "next/link";
import { Printer, FileText, FolderOpen, Save } from "lucide-react";

type Props = { area: string; pecas: string; total: string; documento: ComponentProps<typeof PDFDownloadLink>["document"]; arquivo: string; onEnviar: () => void; onSalvar: () => void; salvando: boolean };
export default function RodapeCalculoProjeto({ area, pecas, total, documento, arquivo, onEnviar, onSalvar, salvando }: Props) {
  const botao = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-secondary";
  return <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur print:hidden">
    <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 2xl:px-10">
      <div className="flex shrink-0 items-center gap-6">
        <div><p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">Área</p><p className="text-sm font-semibold">{area} m²</p></div>
        <div><p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">Vidros</p><p className="text-sm font-semibold">{pecas} peças</p></div>
        <div className="border-l border-border pl-6"><p className="text-[9px] font-semibold uppercase tracking-wide text-text-secondary">Total do projeto</p><p className="text-lg font-bold text-primary">{total}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PDFDownloadLink document={documento} fileName={arquivo} className={botao}>{({loading})=><><Printer size={17}/>{loading ? "Preparando..." : "Imprimir"}</>}</PDFDownloadLink>
        <button type="button" className={botao} onClick={onEnviar}><FileText size={17}/>PDF +</button>
        <Link href="/central-impressao" className={botao}><FolderOpen size={17}/>Central</Link>
        <button type="button" onClick={onSalvar} disabled={salvando} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary disabled:opacity-60"><Save size={17}/>{salvando ? "Salvando..." : "Salvar orçamento"}</button>
      </div>
    </div>
  </footer>;
}
