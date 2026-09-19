"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { consultarPlataforma } from "@/lib/plataforma";

type Empresa = { id: string; nome: string; bloqueado: boolean; motivo: string; usuarios: number; protegida: boolean };
type Usuario = { id: string; email: string; empresa: string | null; bloqueado: boolean; empresa_bloqueada: boolean; confirmado: boolean; ultimo_acesso: string | null; protegida: boolean; motivo: string };
type Evento = { id: number; tipo: string; alvo_nome: string; autor_id: string; bloqueado: boolean; motivo: string; criado_em: string };
type Painel = { resumo: { empresas: number; usuarios: number; bloqueadas: number; pendentes: number }; empresas: Empresa[]; usuarios: Usuario[]; historico: Evento[] };
type Alteracao = { tipo: "empresa" | "usuario"; alvo: string; nome: string; bloqueado: boolean };
const botao = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const data = (valor: string | null) => valor ? new Date(valor).toLocaleString("pt-BR") : "Nunca acessou";

export default function PlataformaPage() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [aba, setAba] = useState<"empresas" | "usuarios" | "historico">("empresas");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [alteracao, setAlteracao] = useState<Alteracao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
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

  async function salvar() {
    if (!alteracao || salvando) return;
    setSalvando(true); setErro(""); setAviso("");
    try {
      await consultarPlataforma("", { ...alteracao, motivo });
      setAlteracao(null); setMotivo(""); setAviso("Acesso atualizado. A alteração foi registrada no histórico.");
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }
  function abrir(tipo: Alteracao["tipo"], id: string, nome: string, bloqueado: boolean) {
    setMotivo(""); setErro(""); setAviso(""); setAlteracao({ tipo, alvo: id, nome, bloqueado: !bloqueado });
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div><p className="text-xs uppercase tracking-widest text-slate-500">Glass Code · Administração da plataforma</p><h1 className="mt-2 text-2xl font-medium">Painel de controle</h1><p className="mt-1 text-sm text-slate-500">Empresas, acessos e histórico de alterações.</p></div>
        <div className="flex gap-2"><Link className={botao} href="/">Voltar ao ERP</Link><button className={botao} disabled={carregando || salvando} onClick={() => void carregar()}>Atualizar</button></div>
      </header>
      {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">{aviso}</p>}
      {!painel && carregando && <p role="status">Verificando acesso ao painel…</p>}
      {painel && <>
        <section aria-label="Visão geral" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Empresas cadastradas", painel.resumo.empresas], ["Usuários cadastrados", painel.resumo.usuarios], ["Empresas bloqueadas", painel.resumo.bloqueadas], ["E-mails não confirmados", painel.resumo.pendentes]].map(([titulo, valor]) => <div key={titulo} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-2 text-3xl font-medium">{valor}</p></div>)}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <nav aria-label="Seções do painel" className="flex gap-2 border-b border-slate-100 p-4">{([['empresas','Empresas'],['usuarios','Usuários'],['historico','Histórico']] as const).map(([id, nome]) => <button key={id} disabled={salvando} aria-pressed={aba === id} className={`${botao} ${aba === id ? 'bg-slate-100 border-slate-400' : ''}`} onClick={() => { setAba(id); setPagina(0); }}>{nome}</button>)}</nav>
          {aba !== "historico" && <form className="flex flex-wrap gap-2 p-4" onSubmit={e => { e.preventDefault(); setPagina(0); setFiltro(busca.trim()); }}><label className="sr-only" htmlFor="busca-plataforma">Buscar empresa ou e-mail</label><input id="busca-plataforma" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Buscar empresa ou e-mail" maxLength={100} value={busca} onChange={e => setBusca(e.target.value)} /><button className={botao} disabled={carregando}>Buscar</button></form>}
          {carregando && <p role="status" className="px-4 text-sm text-slate-500">Atualizando…</p>}
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
            {(aba === 'empresas' ? ['Empresa','Usuários','Acesso','Ação'] : aba === 'usuarios' ? ['Usuário','Empresa','Situação','Último acesso','Ação'] : ['Data','Cadastro','Alteração','Motivo']).map(t => <th key={t} className="px-5 py-3 font-medium">{t}</th>)}
          </tr></thead><tbody className="divide-y divide-slate-100">
            {aba === 'empresas' && painel.empresas.map(e => <tr key={e.id}><td className="px-5 py-4">{e.nome}</td><td className="px-5 py-4">{e.usuarios}</td><td className="px-5 py-4"><span>{e.bloqueado ? 'Bloqueado' : 'Liberado'}</span>{e.bloqueado && <p className="mt-1 max-w-xs text-xs text-slate-500">{e.motivo}</p>}</td><td className="px-5 py-4">{e.protegida ? 'Sua empresa' : <button className={botao} disabled={carregando || salvando} onClick={() => abrir('empresa', e.id, e.nome, e.bloqueado)}>{e.bloqueado ? 'Liberar acesso' : 'Bloquear acesso'}</button>}</td></tr>)}
            {aba === 'usuarios' && painel.usuarios.map(u => <tr key={u.id}><td className="px-5 py-4">{u.email}<p className="mt-1 text-xs text-slate-400">{u.confirmado ? 'E-mail confirmado' : 'Confirmação pendente'}</p></td><td className="px-5 py-4">{u.empresa || 'Sem empresa vinculada'}</td><td className="px-5 py-4">{u.bloqueado ? 'Usuário bloqueado' : u.empresa_bloqueada ? 'Empresa bloqueada' : 'Liberado'}{u.bloqueado && <p className="mt-1 max-w-xs text-xs text-slate-500">{u.motivo}</p>}</td><td className="px-5 py-4">{data(u.ultimo_acesso)}</td><td className="px-5 py-4">{u.protegida ? 'Proprietária' : <button className={botao} disabled={carregando || salvando} onClick={() => abrir('usuario', u.id, u.email, u.bloqueado)}>{u.bloqueado ? 'Liberar usuário' : 'Bloquear usuário'}</button>}</td></tr>)}
            {aba === 'historico' && painel.historico.map(h => <tr key={h.id}><td className="px-5 py-4 whitespace-nowrap">{data(h.criado_em)}</td><td className="px-5 py-4">{h.alvo_nome}<p className="text-xs text-slate-400">{h.tipo === 'empresa' ? 'Empresa' : 'Usuário'}</p></td><td className="px-5 py-4">{h.bloqueado ? 'Acesso bloqueado' : 'Acesso liberado'}</td><td className="max-w-md break-words px-5 py-4">{h.motivo}</td></tr>)}
            {!painel[aba].length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>}
          </tbody></table></div>
          {aba !== 'historico' ? <div className="flex items-center justify-between border-t border-slate-100 p-4"><button className={botao} disabled={pagina === 0 || carregando} onClick={() => setPagina(p => p - 1)}>Anterior</button><span className="text-xs text-slate-500">Página {pagina + 1} · até 50 registros</span><button className={botao} disabled={painel[aba].length < 50 || carregando} onClick={() => setPagina(p => p + 1)}>Próxima</button></div> : <p className="p-4 text-xs text-slate-500">Últimas 100 alterações. O histórico completo é preservado no banco.</p>}
        </section>
      </>}
      {alteracao && <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="titulo-acesso" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 id="titulo-acesso" className="text-lg font-medium">{alteracao.bloqueado ? 'Bloquear' : 'Liberar'} acesso</h2><p className="mt-2 break-words text-sm">{alteracao.nome}</p><p className="mt-2 text-sm text-slate-500">{alteracao.tipo === 'empresa' ? 'A alteração vale para todos os usuários vinculados a esta empresa.' : 'A alteração vale para este usuário. O bloqueio da empresa, se houver, continua valendo.'} Os dados serão preservados.</p><label className="mt-4 block text-sm" htmlFor="motivo-acesso">Motivo</label><textarea autoFocus id="motivo-acesso" className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm" rows={3} maxLength={500} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} />{erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}<div className="mt-4 flex justify-end gap-2"><button className={botao} disabled={salvando} onClick={() => setAlteracao(null)}>Cancelar</button><button className={botao} disabled={salvando || motivo.trim().length < 3} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Confirmar alteração'}</button></div></section></div>}
    </div>
  </main>;
}
