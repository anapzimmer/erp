"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, Users, History, Wallet, ArrowLeft, ShieldCheck } from "lucide-react";
import SituacaoContaModal, { type AlvoSituacao } from "./SituacaoContaModal";
import { dataBrasil, type SituacaoDados, type Situacao } from "@/lib/situacaoConta";
import SituacaoBadge from "./SituacaoBadge";
import HistoricoAcessos from "./HistoricoAcessos";
import FinanceiroPanel from "./Financeiro";
import styles from "./plataforma.module.css";
import { consultarPlataforma } from "@/lib/plataforma";

type Empresa = SituacaoDados & { id: string; nome: string; bloqueado: boolean; motivo: string; usuarios: number; protegida: boolean };
type Usuario = SituacaoDados & { id: string; email: string; empresa: string | null; bloqueado: boolean; empresa_bloqueada: boolean; confirmado: boolean; ultimo_acesso: string | null; protegida: boolean; motivo: string };
type Evento = { situacao?: Situacao; id: number; tipo: string; alvo_nome: string; autor_id: string; bloqueado: boolean; motivo: string; criado_em: string };
type Painel = { resumo: { empresas: number; usuarios: number; bloqueadas: number; pendentes: number }; empresas: Empresa[]; usuarios: Usuario[]; historico: Evento[] };
const botao = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary disabled:opacity-40";
const data = (valor: string | null) => valor ? new Date(valor).toLocaleString("pt-BR") : "Nunca acessou";

export default function PlataformaPage() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [aba, setAba] = useState<"empresas" | "usuarios" | "historico" | "financeiro" | "acessos">("empresas");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [reenviando, setReenviando] = useState<string | null>(null);
  const envioEmCurso = useRef(false);
  async function reenviarConfirmacao(usuario: Usuario) {
    if (envioEmCurso.current) return;
    envioEmCurso.current = true;
    setReenviando(usuario.id); setErro(''); setAviso('');
    try {
      await consultarPlataforma('', { acao: 'reenviar_confirmacao', alvo: usuario.id, email: usuario.email });
      setAviso(`Reenvio solicitado para ${usuario.email}. Oriente a pessoa a verificar a caixa de entrada e o spam. A confirmação continua pendente até ela acessar o link.`);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível reenviar a confirmação.'); }
    finally { envioEmCurso.current = false; setReenviando(null); }
  }
  const [alteracao, setAlteracao] = useState<AlvoSituacao | null>(null);
  const salvando = alteracao !== null;
  const versao = useRef(0);
  const carregar = useCallback(async () => {
    const atual = ++versao.current;
    setCarregando(true); setErro("");
    try {
      const resultado = await consultarPlataforma(`?busca=${encodeURIComponent(filtro)}&pagina=${pagina}`);
      if (atual === versao.current) setPainel(resultado);
    } catch (e) {
      if (atual === versao.current) { setPainel(null); setErro(e instanceof Error ? e.message : "Falha ao carregar."); }
    } finally { if (atual === versao.current) setCarregando(false); }
  }, [filtro, pagina]);
  useEffect(() => {
    const controle = versao;
    const inicio = setTimeout(() => void carregar(), 0);
    return () => { clearTimeout(inicio); controle.current++; };
  }, [carregar]);

  function abrir(tipo: "empresa" | "usuario", id: string, nome: string, bloqueado: boolean) {
    const atual = (tipo === "empresa" ? painel?.empresas : painel?.usuarios)?.find(item => item.id === id);
    setErro(""); setAviso(""); setAlteracao({ tipo, alvo: id, nome, atual: { ...atual, situacao: atual?.situacao || (bloqueado ? "suspensa_outro" : "ativa") } });
  }
  return <main className={styles.root}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><Image className={styles.brandLogo} src="/glasscode-icon.png" alt="" width={35} height={48} unoptimized priority/><div>Glass Code<small>Gestão da plataforma</small></div></div>
      <div><p className={styles.navLabel}>Administração</p><nav className={styles.nav} aria-label="Áreas de gestão">
        {([{id:'empresas',nome:'Empresas',Icon:Building2},{id:'usuarios',nome:'Usuários',Icon:Users},{id:'financeiro',nome:'Financeiro',Icon:Wallet},{id:'acessos',nome:'Histórico de acessos',Icon:History},{id:'historico',nome:'Bloqueios e liberações',Icon:ShieldCheck}] as const).map(({id,nome,Icon}) => <button key={id} aria-pressed={aba===id} disabled={salvando} onClick={() => {setAba(id);setPagina(0);}}><Icon size={18}/>{nome}</button>)}
      </nav></div>
      <div className={styles.sidebarFoot}>Administração exclusiva da proprietária.<Link href="/"><ArrowLeft size={15}/>Voltar ao ERP</Link></div>
    </aside>
    <div className={`${styles.workspace} space-y-6`}>
      <div className={styles.topline}><span>GLASS CODE / CONTROLE DA PLATAFORMA</span><span className={styles.owner}><ShieldCheck size={14}/>Acesso da proprietária</span></div>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div><p className="text-xs uppercase tracking-widest text-text-secondary">Glass Code · Administração da plataforma</p><h1 className="mt-2 text-2xl font-medium">{aba === "financeiro" ? "Gestão financeira" : aba === "usuarios" ? "Usuários da plataforma" : aba === "acessos" ? "Histórico de acessos" : aba === "historico" ? "Bloqueios e liberações" : "Empresas e relacionamento"}</h1><p className="mt-1 text-sm text-text-secondary">{aba === "financeiro" ? "Mensalidades, vencimentos e acompanhamento de recebimentos." : "Acompanhe sua base de clientes e gerencie o acesso ao Glass Code."}</p></div>
        <div className="flex gap-2"><Link className={botao} href="/">Voltar ao ERP</Link><button className={botao} disabled={carregando || salvando} onClick={() => void carregar()}>Atualizar</button></div>
      </header>
      {erro && <p role="alert" className="rounded-xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm">{aviso}</p>}
      {!painel && carregando && <p role="status">Verificando acesso ao painel…</p>}
      {painel && aba === "financeiro" && <FinanceiroPanel/>}
      {painel && aba === "acessos" && <HistoricoAcessos/>}
      {painel && aba !== "financeiro" && aba !== "acessos" && <>
        <section aria-label="Visão geral" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Empresas cadastradas", painel.resumo.empresas], ["Usuários cadastrados", painel.resumo.usuarios], ["Empresas bloqueadas", painel.resumo.bloqueadas], ["E-mails não confirmados", painel.resumo.pendentes]].map(([titulo, valor]) => <div key={titulo} className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-text-secondary">{titulo}</p><p className="mt-2 text-3xl font-medium">{valor}</p>{titulo === 'E-mails não confirmados' && <button type="button" className={`${botao} mt-3`} disabled={salvando} onClick={() => { setAba('usuarios'); setPagina(0); setBusca(''); setFiltro(''); }}>Ver usuários e reenviar</button>}</div>)}
        </section>
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          {aba === 'usuarios' && <p className="border-b border-border bg-surface-secondary px-5 py-3 text-sm text-text-secondary">Nos cadastros com confirmação pendente, clique em <strong className="font-medium text-text-primary">Reenviar confirmação</strong> na coluna Ação. Use a busca ou avance as páginas para localizar o usuário.</p>}
          {aba !== "historico" && <form className="flex flex-wrap gap-2 p-4" onSubmit={e => { e.preventDefault(); setPagina(0); setFiltro(busca.trim()); }}><label className="sr-only" htmlFor="busca-plataforma">Buscar empresa ou e-mail</label><input id="busca-plataforma" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" placeholder="Buscar empresa ou e-mail" maxLength={100} value={busca} onChange={e => setBusca(e.target.value)} /><button className={botao} disabled={carregando}>Buscar</button></form>}
          {carregando && <p role="status" className="px-4 text-sm text-text-secondary">Atualizando…</p>}
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-secondary text-xs uppercase text-text-secondary"><tr>
            {(aba === 'empresas' ? ['Empresa','Usuários','Acesso','Ação'] : aba === 'usuarios' ? ['Usuário','Empresa','Situação','Último acesso','Ação'] : ['Data','Cadastro','Alteração','Motivo']).map(t => <th key={t} className="px-5 py-3 font-medium">{t}</th>)}
          </tr></thead><tbody className="divide-y divide-border">
            {aba === 'empresas' && painel.empresas.map(e => <tr key={e.id}><td className="px-5 py-4">{e.nome}</td><td className="px-5 py-4">{e.usuarios}</td><td className="px-5 py-4"><SituacaoBadge situacao={e.situacao || (e.bloqueado ? 'suspensa_outro' : 'ativa')}/>{e.prazo && <p className="mt-1 text-xs text-text-secondary">{e.prazo < dataBrasil() ? "Prazo vencido · conferir" : "Regularizar até"}: {e.prazo.split("-").reverse().join("/")}</p>}{e.bloqueado && <p className="mt-1 max-w-xs text-xs text-text-secondary">{e.motivo}</p>}</td><td className="px-5 py-4">{e.protegida ? 'Sua empresa' : <button className={botao} disabled={carregando || salvando} onClick={() => abrir('empresa', e.id, e.nome, e.bloqueado)}>Gerenciar situação</button>}</td></tr>)}
            {aba === 'usuarios' && painel.usuarios.map(u => <tr key={u.id}><td className="px-5 py-4">{u.email}<p className="mt-1 text-xs text-text-secondary">{u.confirmado ? 'E-mail confirmado' : 'Confirmação pendente'}</p></td><td className="px-5 py-4">{u.empresa || 'Sem empresa vinculada'}</td><td className="px-5 py-4"><SituacaoBadge situacao={u.empresa_bloqueada ? 'suspensa_outro' : u.situacao || (u.bloqueado ? 'suspensa_outro' : 'ativa')} texto={u.empresa_bloqueada ? 'Empresa suspensa' : undefined}/>{u.bloqueado && <p className="mt-1 max-w-xs text-xs text-text-secondary">{u.motivo}</p>}</td><td className="px-5 py-4">{data(u.ultimo_acesso)}</td><td className="px-5 py-4"><div className="flex flex-col items-start gap-2"><button type="button" className={botao} disabled={u.confirmado || carregando || salvando || reenviando !== null} onClick={() => void reenviarConfirmacao(u)}>{u.confirmado ? 'E-mail já confirmado' : reenviando === u.id ? 'Reenviando…' : 'Reenviar confirmação'}</button>{u.protegida ? 'Proprietária' : <button className={botao} disabled={carregando || salvando} onClick={() => abrir('usuario', u.id, u.email, u.bloqueado)}>Gerenciar situação</button>}</div></td></tr>)}
            {aba === 'historico' && painel.historico.map(h => <tr key={h.id}><td className="px-5 py-4 whitespace-nowrap">{data(h.criado_em)}</td><td className="px-5 py-4">{h.alvo_nome}<p className="text-xs text-text-secondary">{h.tipo === 'empresa' ? 'Empresa' : 'Usuário'}</p></td><td className="px-5 py-4"><SituacaoBadge situacao={h.situacao || (h.bloqueado ? 'suspensa_outro' : 'ativa')} texto={h.situacao ? undefined : h.bloqueado ? 'Acesso bloqueado' : 'Acesso liberado'}/></td><td className="max-w-md break-words px-5 py-4">{h.motivo}</td></tr>)}
            {!painel[aba].length && <tr><td colSpan={5} className="p-8 text-center text-text-secondary">Nenhum registro encontrado.</td></tr>}
          </tbody></table></div>
          {aba !== 'historico' ? <div className="flex items-center justify-between border-t border-border p-4"><button className={botao} disabled={pagina === 0 || carregando} onClick={() => setPagina(p => p - 1)}>Anterior</button><span className="text-xs text-text-secondary">Página {pagina + 1} · até 50 registros</span><button className={botao} disabled={painel[aba].length < 50 || carregando} onClick={() => setPagina(p => p + 1)}>Próxima</button></div> : <p className="p-4 text-xs text-text-secondary">Últimas 100 alterações. O histórico completo é preservado no banco.</p>}
        </section>
      </>}
      {alteracao && <SituacaoContaModal alvo={alteracao} onFechar={() => setAlteracao(null)} onSalvo={() => { setAlteracao(null); setAviso("Situação atualizada e registrada no histórico."); void carregar(); }}/>}
    </div>
  </main>;
}
