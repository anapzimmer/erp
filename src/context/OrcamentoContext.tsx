"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { ehAtalhoNovoOrcamento } from "@/utils/atalhoOrcamento";
import { useTheme } from "@/context/ThemeContext";
import { ClipboardList, X } from "lucide-react";

type Cliente = { id: string; nome: string; grupo_preco_id?: string | null };
export type OrcamentoAtivo = { id: string; empresaId: string; cliente: Cliente; obra: string; rotaEdicao?: string };
const Context = createContext<OrcamentoAtivo | null>(null);
const PREFIXO = "glasscode:central-impressao:";
export const ORCAMENTO_ENCERRADO = "glasscode:orcamento-encerrado";
const ORCAMENTO_RETOMADO = "glasscode:orcamento-retomado";
export const useOrcamentoAtivo = () => useContext(Context);

export function encerrarOrcamentoAtivo() {
  window.dispatchEvent(new Event(ORCAMENTO_ENCERRADO));
}

export async function retomarOrcamentoAtivo(dados: { id: string; empresaId: string; cliente: string; obra: string; rotaEdicao: string }) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Entre novamente para editar o orçamento.");
  const { data: clientes, error } = await supabase.from("clientes").select("id, nome, grupo_preco_id")
    .eq("empresa_id", dados.empresaId).eq("nome", dados.cliente).limit(2);
  if (error || clientes?.length !== 1) throw new Error("Não foi possível identificar um único cadastro do cliente deste orçamento. Confira o cadastro antes de continuar.");
  const ativo: OrcamentoAtivo = { id: dados.id, empresaId: dados.empresaId,
    cliente: { ...clientes[0], id: String(clientes[0].id) }, obra: dados.obra, rotaEdicao: dados.rotaEdicao };
  localStorage.setItem(`glasscode:orcamento-ativo:${dados.empresaId}:${auth.user.id}`, JSON.stringify(ativo));
  window.dispatchEvent(new CustomEvent(ORCAMENTO_RETOMADO, { detail: ativo }));
}

export function OrcamentoProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (["/login", "/update-password"].includes(pathname)) return children;
  return <OrcamentoAutenticado>{children}</OrcamentoAutenticado>;
}

function OrcamentoAutenticado({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
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
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!modal) return;
    const anterior = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const seletores = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]';
    dialog?.querySelector<HTMLElement>(seletores)?.focus();
    const limitarFoco = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const controles = Array.from(dialog.querySelectorAll<HTMLElement>(seletores));
      const primeiro = controles[0];
      const ultimo = controles[controles.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo?.focus(); }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro?.focus(); }
    };
    document.addEventListener("keydown", limitarFoco);
    return () => { document.removeEventListener("keydown", limitarFoco); anterior?.focus(); };
  }, [modal, carregando]);

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
    const retomar = (event: Event) => {
      const salvo = (event as CustomEvent<OrcamentoAtivo>).detail;
      if (salvo.empresaId !== empresaId) return;
      setAtivo(salvo);
      setClienteId(salvo.cliente.id);
      setObra(salvo.obra);
      setModal(false);
    };
    window.addEventListener(ORCAMENTO_RETOMADO, retomar);
    return () => { window.removeEventListener(ORCAMENTO_ENCERRADO, encerrar); window.removeEventListener(ORCAMENTO_RETOMADO, retomar); };
  }, [storageKey, empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    const teclado = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (ehAtalhoNovoOrcamento(event)) {
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
  const destino = sessao?.rotaEdicao || "/central-impressao";
  const botao = { backgroundColor: theme.buttonDarkBg, color: theme.buttonDarkText };
  const campo = { backgroundColor: theme.screenBackgroundColor, color: theme.modalTextColor, borderColor: `${theme.modalTextColor}30` };
  return <Context.Provider value={sessao}>
    {empresaId && <div className="print:hidden flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2 text-sm text-slate-800">
      {sessao ? <>
        <span>Orçamento em andamento: {sessao.cliente.nome}{sessao.obra ? ` · ${sessao.obra}` : ""} · Rascunho automático</span>
        <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-normal text-slate-600 transition-colors hover:bg-slate-100" href={destino}>Ver orçamento{quantidade ? ` (${quantidade})` : ""} / Salvar</Link>
      </> : <><span>Monte um orçamento com vários cálculos</span><button type="button" aria-keyshortcuts="Shift+Plus" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-normal text-slate-600 transition-colors hover:bg-slate-100" onClick={() => { setErro(""); setModal(true); }}>+ Novo orçamento</button></>}
    </div>}
    {children}
    {modal && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onKeyDown={e => { if (e.key === "Escape") setModal(false); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="novo-orcamento-titulo" style={{ backgroundColor: theme.modalBackgroundColor, color: theme.modalTextColor }} className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3 border-b border-current/10 pb-4"><div style={botao} className="rounded-xl p-3"><ClipboardList size={24} /></div><h2 id="novo-orcamento-titulo" className="flex-1 text-xl font-bold">{sessao ? "Orçamento em andamento" : "Novo orçamento"}</h2><button type="button" aria-label="Fechar" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setModal(false)}><X size={20} /></button></div>
        {sessao ? <div style={campo} className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase opacity-70">Cliente</p><p className="mt-1 text-lg font-bold">{sessao.cliente.nome}</p><p className="mt-3 text-xs font-semibold uppercase opacity-70">Obra / referência</p><p className="mt-1">{sessao.obra || "Não informada"}</p><p className="mt-4 text-sm opacity-75">Continue a edição dos itens com este cliente ativo.</p></div> : <>
          <label className="mb-4 block text-sm font-semibold">Cliente<select autoFocus style={campo} className="mt-2 block w-full rounded-lg border p-3" value={clienteId} disabled={carregando} onChange={e => setClienteId(e.target.value)}><option value="">{carregando ? "Carregando clientes…" : "Selecione o cliente"}</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="block text-sm font-semibold">Obra / referência<input style={campo} className="mt-2 block w-full rounded-lg border p-3" value={obra} onChange={e => setObra(e.target.value)} /></label>
          <p className="mt-3 text-sm text-slate-600">Cliente e obra serão preenchidos nos cálculos. Use PDF+ ou Salvar no cálculo para adicionar os itens e finalize na central.</p>
        </>}
        {erro && <p role="alert" className="mt-3 text-red-700">{erro}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-current/10 pt-4"><button type="button" className="rounded-lg px-4 py-2" onClick={() => setModal(false)}>Fechar</button><button type="button" style={sessao ? botao : campo} className="rounded-lg border px-4 py-2 font-semibold" onClick={() => { setModal(false); router.push(destino); }}>{sessao ? "Continuar orçamento" : "Abrir central"}</button>{!sessao && <button type="button" style={botao} disabled={carregando || !clienteId} className="rounded-lg px-4 py-2 font-semibold disabled:opacity-50" onClick={iniciar}>Iniciar orçamento</button>}</div>
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
  // Editar um orçamento individual deve atualizar o registro original, sem enviá-lo como novo item à central.
  const edicaoIndividual = ativo?.rotaEdicao && !ativo.rotaEdicao.startsWith("/central-impressao")
    && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === ativo.id;
  return edicaoIndividual ? null : ativo;
}
