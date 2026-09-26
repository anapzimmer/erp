"use client";

import Link from "next/link";
import { Grid2X2, Plus, Save, FolderOpen } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  titulo: string; numero: string; data: string;
  onNovo: () => void; onSalvar: () => void; salvando: boolean;
};

export default function CabecalhoCalculoProjeto({ titulo, numero, data, onNovo, onSalvar, salvando }: Props) {
  const { nomeEmpresa, user, signOut } = useAuth();
  return <>
    <Header nomeEmpresa={nomeEmpresa || ""} usuarioEmail={user?.email || ""} handleSignOut={signOut} />
    <header className="px-4 pb-1 pt-5 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <div className="mb-2 text-xs text-text-secondary"><Link href="/matriz-projetos" className="hover:underline">Orçamentos</Link> / {titulo}</div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface"><Grid2X2 size={22} strokeWidth={1.7} /></span>
            <div><h1 className="text-2xl font-semibold tracking-tight text-text-primary">{titulo}</h1><p className="mt-1 text-sm text-text-secondary">Configure as medidas para calcular os materiais e o valor.</p></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs text-text-secondary">Nº {numero || "automático"} · {data}</span>
          <button type="button" onClick={onNovo} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm hover:bg-surface-secondary"><Plus size={17} />Novo</button>
          <Link href="/matriz-projetos" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm hover:bg-surface-secondary"><FolderOpen size={17} />Projetos</Link>
          <button type="button" disabled={salvando} onClick={onSalvar} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary disabled:opacity-60"><Save size={17} />{salvando ? "Salvando..." : "Salvar orçamento"}</button>
        </div>
      </div>
    </header>
  </>;
}
