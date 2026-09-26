"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import CadastroClientes from "@/components/CadastroClientes";

type ClienteCriado = { id: string; nome: string; rota?: string | null; grupo_preco_id?: string | null };
type Props = {
  empresaId?: string | null;
  onClientCreated: (cliente: ClienteCriado) => void;
  onError?: (mensagem: string) => void;
  disabled?: boolean;
};

export default function ClienteQuickCreateButton({ empresaId, onClientCreated, disabled }: Props) {
  const [aberto, setAberto] = useState(false);
  return <>
    <button type="button" disabled={disabled || !empresaId} onClick={() => setAberto(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-secondary disabled:opacity-50"><Plus size={14} />Novo cliente</button>
    {aberto && createPortal(<CadastroClientes somenteNovo onClose={() => setAberto(false)} onCreated={cliente => onClientCreated({ ...cliente, id: String(cliente.id) })} />, document.body)}
  </>;
}
