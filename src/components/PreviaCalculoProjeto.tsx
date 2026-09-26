import type { ReactNode } from "react";
import { Grid2X2, CheckCircle2 } from "lucide-react";
export default function PreviaCalculoProjeto({ children, area, pecas, total, modelo }: { children: ReactNode; area: string; pecas: string; total: string; modelo?: string }) {
 return <section className="h-full overflow-hidden rounded-xl border border-border bg-surface">
  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Grid2X2 size={18} strokeWidth={1.7}/>Pré-visualização</h2><span className="rounded-md bg-surface-secondary px-2 py-1 text-[10px] text-text-secondary">VISTA EXTERNA</span></div>
  <div className="grid min-h-[390px] gap-4 p-5 md:grid-cols-[minmax(0,1fr)_165px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_165px]">
    <div className="flex min-w-0 items-center justify-center bg-white">{children}</div>
    <div className="space-y-3">
      <div className="rounded-lg bg-primary/10 p-3"><div className="flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0 text-primary"/><span className="text-sm font-semibold">Projeto calculado</span></div><p className="mt-1 pl-6 text-[11px] text-text-secondary">Materiais atualizados automaticamente.</p></div>
      <div className="space-y-2 rounded-lg bg-surface-secondary p-3 text-xs"><div className="flex justify-between gap-2"><span>Folhas</span><strong>{pecas}</strong></div><div className="flex justify-between gap-2"><span>Área</span><strong>{area} m²</strong></div><div className="flex justify-between gap-2"><span>Modelo</span><strong className="max-w-[90px] truncate" title={modelo}>{modelo || "Padrão"}</strong></div></div>
      <div className="border-t border-border pt-3"><p className="text-[10px] uppercase text-text-secondary">Valor estimado</p><p className="mt-1 text-xl font-bold">{total}</p></div>
    </div>
  </div>
 </section>;
}

