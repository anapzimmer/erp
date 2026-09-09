"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

type Cliente = { id: string; nome: string; grupo_preco_id?: string | null };
export type OrcamentoAtivo = { id: string; empresaId: string; cliente: Cliente; obra: string };
const Context = createContext<OrcamentoAtivo | null>(null);
const PREFIXO = "glasscode:central-impressao:";
export const ORCAMENTO_ENCERRADO = "glasscode:orcamento-encerrado";
export const useOrcamentoAtivo = () => useContext(Context);

export function encerrarOrcamentoAtivo() {
  window.dispatchEvent(new Event(ORCAMENTO_ENCERRADO));
}

export function OrcamentoProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (["/login", "/update-password"].includes(pathname)) return children;
  return <OrcamentoAutenticado>{children}</OrcamentoAutenticado>;
}

function OrcamentoAutenticado({ children }: { children: ReactNode }) {
  const { empresaId, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = empresaId && user?.id ? `glasscode:orcamento-ativo:${empresaId}:${user.id}` : null;
  const [ativo, setAtivo] = useState<OrcamentoAtivo | null>(null);
  const [modal, setModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [obra, setObra] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [quantidade, setQuantidade] = useState(0);

  useEffect(() => {
    setAtivo(null);
    if (!storageKey) return;
    try {
      const salvo = JSON.parse(localStorage.getItem(storageKey) || "null") as OrcamentoAtivo | null;
      if (salvo?.empresaId === empresaId && salvo.cliente?.id) setAtivo(salvo);
    } catch { setErro("Não foi possível recuperar o orçamento em andamento."); }
    const encerrar = () => {
      localStorage.removeItem(storageKey);
      setAtivo(null);
      setClienteId("");
      setObra("");
    };
    window.addEventListener(ORCAMENTO_ENCERRADO, encerrar);
    return () => window.removeEventListener(ORCAMENTO_ENCERRADO, encerrar);
  }, [storageKey, empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    const teclado = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (event.shiftKey && (event.key === "+" || event.code === "NumpadAdd")) {
        event.preventDefault();
        setErro("");
        setModal(true);
      }
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [empresaId]);

  useEffect(() => {
    if (!modal || !empresaId) return;
    let cancelado = false;
    setCarregando(true);
    supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome")
      .then(({ data, error }) => {
        if (cancelado) return;
        setCarregando(false);
        if (error) setErro("Não foi possível carregar os clientes. Feche e tente novamente.");
        else setClientes((data || []).map(c => ({ ...c, id: String(c.id) })));
      });
    return () => { cancelado = true; };
  }, [modal, empresaId]);

  useEffect(() => {
    try {
      setQuantidade(JSON.parse(localStorage.getItem(`${PREFIXO}composicao`) || "[]").length);
    } catch { setQuantidade(0); }
  }, [pathname, ativo, modal]);

  const iniciar = () => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente || !storageKey || !empresaId) { setErro("Selecione um cliente cadastrado."); return; }
    try {
      const itens = JSON.parse(localStorage.getItem(`${PREFIXO}composicao`) || "[]");
      const materiais = JSON.parse(localStorage.getItem(`${PREFIXO}materiais-avulsos`) || "[]");
      if (itens.length || materiais.length) {
        setErro("Há itens na central. Salve o orçamento atual antes de iniciar outro.");
        return;
      }
      const novo: OrcamentoAtivo = { id: crypto.randomUUID(), empresaId, cliente, obra: obra.trim() };
      localStorage.setItem(storageKey, JSON.stringify(novo));
      localStorage.setItem(`${PREFIXO}cliente`, cliente.nome);
      localStorage.setItem(`${PREFIXO}obra`, novo.obra);
      localStorage.removeItem(`${PREFIXO}orcamento-id`);
      localStorage.removeItem(`${PREFIXO}numero`);
      setAtivo(novo);
      setModal(false);
      // Reabrir a central evita manter o estado de uma edição anterior em memória.
      window.location.assign("/central-impressao");
    } catch { setErro("Não foi possível salvar o rascunho neste navegador. O orçamento não foi iniciado."); }
  };

  const sessao = ativo?.empresaId === empresaId ? ativo : null;
  return <Context.Provider value={sessao}>
    {empresaId && <div className="print:hidden flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2 text-sm text-slate-800">
      {sessao ? <>
        <span><strong>Orçamento em andamento: {sessao.cliente.nome}</strong>{sessao.obra ? ` · ${sessao.obra}` : ""} · Rascunho automático</span>
        <Link className="rounded bg-[#07385a] px-3 py-2 text-white" href="/central-impressao">Ver orçamento{quantidade ? ` (${quantidade})` : ""} / Salvar</Link>
      </> : <><span>Monte um orçamento com vários cálculos</span><button type="button" className="rounded bg-[#07385a] px-3 py-2 text-white" onClick={() => { setErro(""); setModal(true); }}>+ Novo orçamento</button></>}
    </div>}
    {children}
    {modal && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onKeyDown={e => { if (e.key === "Escape") setModal(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="novo-orcamento-titulo" className="w-full max-w-lg rounded-xl bg-white p-6 text-slate-900 shadow-xl">
        <h2 id="novo-orcamento-titulo" className="mb-4 text-xl font-bold">{sessao ? "Orçamento em andamento" : "Novo orçamento"}</h2>
        {sessao ? <p>Continue o orçamento de <strong>{sessao.cliente.nome}</strong>. Salve na central antes de iniciar outro cliente.</p> : <>
          <label className="mb-4 block">Cliente<select autoFocus className="mt-1 block w-full rounded border p-2" value={clienteId} disabled={carregando} onChange={e => setClienteId(e.target.value)}><option value="">{carregando ? "Carregando clientes…" : "Selecione o cliente"}</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="block">Obra / referência<input className="mt-1 block w-full rounded border p-2" value={obra} onChange={e => setObra(e.target.value)} /></label>
          <p className="mt-3 text-sm text-slate-600">Cliente e obra serão preenchidos nos cálculos. Use PDF+ ou Salvar no cálculo para adicionar os itens e finalize na central.</p>
        </>}
        {erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setModal(false)}>Fechar</button><button type="button" className="rounded border px-3 py-2" onClick={() => { setModal(false); router.push("/central-impressao"); }}>Abrir central</button>{!sessao && <button type="button" disabled={carregando || !clienteId} className="rounded bg-[#07385a] px-3 py-2 text-white disabled:opacity-50" onClick={iniciar}>Iniciar orçamento</button>}</div>
      </section>
    </div>}
  </Context.Provider>;
}

export function useClienteOrcamento(opcoes: {
  cliente: string; onCliente: (valor: string) => void;
  porId?: boolean; obra?: string; onObra?: (valor: string) => void;
  busca?: string; onBusca?: (valor: string) => void;
}) {
  const ativo = useOrcamentoAtivo();
  useEffect(() => {
    if (!ativo) return;
    const cliente = opcoes.porId ? ativo.cliente.id : ativo.cliente.nome;
    if (opcoes.cliente !== cliente) opcoes.onCliente(cliente);
    if (opcoes.onObra && opcoes.obra !== ativo.obra) opcoes.onObra(ativo.obra);
    if (opcoes.onBusca && opcoes.busca !== ativo.cliente.nome) opcoes.onBusca(ativo.cliente.nome);
  }, [ativo, opcoes]);
  return ativo;
}
