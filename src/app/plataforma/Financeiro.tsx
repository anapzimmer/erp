"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, FilePlus2, Check, RotateCcw, Settings2 } from "lucide-react";
import { consultarPlataforma } from "@/lib/plataforma";
import s from "./plataforma.module.css";

type Conta = { id: string; nome: string; plano: string | null; mensalidade_centavos: number | null; dia_vencimento: number | null; email_financeiro: string | null };
type Cobranca = { id: string; empresa: string; descricao: string; competencia: string; valor_centavos: number; vencimento: string; status: string; situacao: string; pago_em: string | null };
type Financeiro = { resumo: { aberto: number; atrasado: number; recebido_mes: number; contratos: number }; contas: Conta[]; cobrancas: Cobranca[]; historico: { id: number; empresa: string; acao: string; motivo: string; criado_em: string }[] };
type Acao = "contrato" | "gerar" | "pagar" | "cancelar" | "reabrir";
type Modal = { acao: Acao; nome: string; id: string; conta?: Conta; cobranca?: Cobranca };
const moeda = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (v: string) => v.slice(0, 10).split("-").reverse().join("/");
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const titulos = { contrato: "Configurar plano", gerar: "Lançar mensalidade", pagar: "Registrar pagamento manual", cancelar: "Cancelar cobrança", reabrir: "Reabrir cobrança" };
const estados: Record<string, string> = { aberta: "Em aberto", atrasada: "Atrasada", paga: "Paga · manual", cancelada: "Cancelada" };

export default function FinanceiroPanel() {
  const [dados, setDados] = useState<Financeiro | null>(null);
  const [aba, setAba] = useState<"cobrancas" | "contas" | "historico">("cobrancas");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(0);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [form, setForm] = useState({ plano: "", valor: "", vencimento: "10", email: "", competencia: hoje().slice(0, 7), pago_em: hoje(), motivo: "" });
  const dialog = useRef<HTMLDialogElement>(null);
  const versao = useRef(0);
  const carregar = useCallback(async () => {
    const v = ++versao.current;
    setLoading(true); setErro("");
    try {
      const resultado = await consultarPlataforma(`?modo=financeiro&busca=${encodeURIComponent(filtro)}&pagina=${pagina}`);
      if (v === versao.current) setDados(resultado);
    } catch (e) { if (v === versao.current) { setDados(null); setErro(e instanceof Error ? e.message : "Falha ao carregar o financeiro."); } }
    finally { if (v === versao.current) setLoading(false); }
  }, [filtro, pagina]);
  useEffect(() => {
    const controle = versao; const inicio = setTimeout(() => void carregar(), 0);
    return () => { clearTimeout(inicio); controle.current++; };
  }, [carregar]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);
  function abrir(valor: Modal) {
    setErro(""); setAviso("");
    setForm({ plano: valor.conta?.plano || "", valor: valor.conta?.mensalidade_centavos ? (valor.conta.mensalidade_centavos / 100).toFixed(2) : "", vencimento: String(valor.conta?.dia_vencimento || 10), email: valor.conta?.email_financeiro || "", competencia: hoje().slice(0, 7), pago_em: hoje(), motivo: "" });
    setModal(valor);
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); if (!modal || salvando) return;
    setSalvando(true); setErro("");
    try {
      await consultarPlataforma("", { acao: modal.acao, dados: {
        id: modal.id, empresa_id: modal.id, plano: form.plano,
        mensalidade_centavos: Math.round(Number(form.valor) * 100), dia_vencimento: Number(form.vencimento),
        email_financeiro: form.email, competencia: `${form.competencia}-01`, pago_em: form.pago_em, motivo: form.motivo,
      } });
      setModal(null); setAviso("Alteração salva no controle interno e registrada no histórico. Nenhuma mensagem foi enviada ao cliente.");
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }
  const campo = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  return <div className={s.finance}>
    <div className={s.notice}><CreditCard size={22} /><div><strong>Cobranças do Glass Code</strong>Controle de mensalidades e baixas manuais. A emissão de boletos, o envio ao cliente e a confirmação bancária dependem da conexão com um provedor de pagamentos.</div></div>
    {erro && !modal && <div role="alert" className={s.error}>{erro}<button className={`${s.button} ml-3`} onClick={() => void carregar()}>Tentar novamente</button></div>}
    {aviso && <p role="status" className={s.success}>{aviso}</p>}
    {loading && <p role="status" className="text-sm text-slate-500">Carregando financeiro…</p>}
    {dados && <>
      <div className={s.stats}>
        <div className={s.stat}><span>Total em aberto</span><strong>{moeda(dados.resumo.aberto)}</strong><small>Inclui valores atrasados</small></div>
        <div className={`${s.stat} ${s.statWarm}`}><span>Em atraso</span><strong>{moeda(dados.resumo.atrasado)}</strong><small>Vencimento anterior a hoje</small></div>
        <div className={s.stat}><span>Recebido neste mês</span><strong>{moeda(dados.resumo.recebido_mes)}</strong><small>Pagamentos registrados manualmente</small></div>
        <div className={s.stat}><span>Planos configurados</span><strong>{dados.resumo.contratos}</strong><small>Empresas com mensalidade definida</small></div>
      </div>
      <section className={s.panel}>
        <div className={s.toolbar}><nav className={s.tabs} aria-label="Financeiro">{([['cobrancas','Cobranças'],['contas','Planos por empresa'],['historico','Histórico financeiro']] as const).map(([id,nome]) => <button key={id} className={s.button} aria-pressed={aba === id} onClick={() => { setAba(id); setPagina(0); }}>{nome}</button>)}</nav><button className={s.button} disabled={loading} onClick={() => void carregar()}><RotateCcw size={14} />Atualizar</button></div>
        {aba !== 'historico' && <form className={s.toolbar} onSubmit={e => { e.preventDefault(); setFiltro(busca.trim()); setPagina(0); }}><div className={s.search}><input aria-label="Buscar empresa no financeiro" className={s.input} placeholder="Buscar por empresa…" value={busca} maxLength={100} onChange={e => setBusca(e.target.value)} /><button className={s.button} disabled={loading}>Buscar</button></div><span className="text-xs text-slate-400">Valores em reais · controle interno</span></form>}
        <div className={s.scroll}><table className={s.table}><thead><tr>{(aba === 'contas' ? ['Empresa / plano','Mensalidade','Vencimento','Gerenciar'] : aba === 'cobrancas' ? ['Empresa / referência','Valor','Vencimento','Situação','Ações'] : ['Data','Empresa','Alteração','Motivo']).map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>
          {aba === 'contas' && dados.contas.map(c => <tr key={c.id}><td>{c.nome}<small>{c.plano || 'Plano não configurado'}</small></td><td>{c.mensalidade_centavos ? moeda(c.mensalidade_centavos) : '—'}</td><td>{c.dia_vencimento ? `Dia ${c.dia_vencimento}` : '—'}</td><td><div className={s.actions}><button className={s.button} disabled={loading} onClick={() => abrir({ acao:'contrato',id:c.id,nome:c.nome,conta:c })}><Settings2 size={14}/>Plano</button><button className={s.button} disabled={!c.plano || loading} onClick={() => abrir({ acao:'gerar',id:c.id,nome:c.nome,conta:c })}><FilePlus2 size={14}/>Lançar mês</button></div></td></tr>)}
          {aba === 'cobrancas' && dados.cobrancas.map(c => <tr key={c.id}><td>{c.empresa}<small>{c.descricao} · {c.competencia.slice(0,7).split('-').reverse().join('/')}</small></td><td>{moeda(c.valor_centavos)}</td><td>{dia(c.vencimento)}</td><td><span className={`${s.badge} ${c.status === 'paga' ? s.paid : c.situacao === 'atrasada' ? s.late : ''}`}>{estados[c.situacao]}</span>{c.pago_em && <small>Pago em {dia(c.pago_em)}</small>}</td><td><div className={s.actions}>{c.status === 'aberta' ? <><button disabled={loading} className={s.button} onClick={() => abrir({acao:'pagar',id:c.id,nome:c.empresa,cobranca:c})}><Check size={14}/>Registrar pagamento</button><button disabled={loading} className={s.button} onClick={() => abrir({acao:'cancelar',id:c.id,nome:c.empresa,cobranca:c})}>Cancelar</button></> : <button disabled={loading} className={s.button} onClick={() => abrir({acao:'reabrir',id:c.id,nome:c.empresa,cobranca:c})}>Reabrir</button>}</div></td></tr>)}
          {aba === 'historico' && dados.historico.map(h => <tr key={h.id}><td>{new Date(h.criado_em).toLocaleString('pt-BR')}</td><td>{h.empresa}</td><td>{titulos[h.acao as Acao] || h.acao}</td><td>{h.motivo}</td></tr>)}
        </tbody></table></div>
        {!dados[aba].length && <div className={s.empty}>{aba === 'cobrancas' ? 'Nenhuma cobrança encontrada. Configure um plano e lance a mensalidade em “Planos por empresa”.' : 'Nenhum registro encontrado.'}</div>}
        {aba !== 'historico' ? <div className={s.footer}><button className={s.button} disabled={pagina === 0 || loading} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina + 1} · até 50 registros</span><button className={s.button} disabled={dados[aba].length < 50 || loading} onClick={() => setPagina(p => p + 1)}>Próxima</button></div> : <div className={s.footer}>Últimas 50 alterações. O histórico completo permanece no banco.</div>}
      </section>
    </>}
    <dialog ref={dialog} className={s.dialog} onCancel={e => { if (salvando) e.preventDefault(); else setModal(null); }}>
      {modal && <form onSubmit={salvar}><h2>{titulos[modal.acao]}</h2><p>{modal.nome}</p>
        {modal.acao === 'gerar' && <p>{modal.conta?.plano} · {moeda(modal.conta?.mensalidade_centavos || 0)} · vencimento no dia {modal.conta?.dia_vencimento}. Este lançamento não emite boleto nem envia cobrança.</p>}
        {modal.cobranca && <p>{moeda(modal.cobranca.valor_centavos)} · vencimento {dia(modal.cobranca.vencimento)}. {modal.acao === 'pagar' ? 'Registre somente após conferir o recebimento. Esta é uma baixa manual.' : 'A alteração será registrada e não modifica o acesso da empresa ao ERP.'}</p>}
        <fieldset disabled={salvando} className={s.fields}>
          {modal.acao === 'contrato' && <><label>Nome do plano<input autoFocus required maxLength={100} className={s.input} value={form.plano} onChange={e => campo('plano',e.target.value)}/></label><div className={s.columns}><label>Mensalidade (R$)<input required type="number" min="0.01" max="1000000" step="0.01" className={s.input} value={form.valor} onChange={e => campo('valor',e.target.value)}/></label><label>Dia do vencimento (1 a 28)<input required type="number" min="1" max="28" className={s.input} value={form.vencimento} onChange={e => campo('vencimento',e.target.value)}/></label></div><label>E-mail financeiro (opcional)<input type="email" maxLength={254} className={s.input} value={form.email} onChange={e => campo('email',e.target.value)}/></label><p>Alterações valem para novos lançamentos. Cobranças existentes mantêm os valores originais.</p></>}
          {modal.acao === 'gerar' && <label>Mês de referência<input autoFocus required type="month" className={s.input} value={form.competencia} onChange={e => campo('competencia',e.target.value)}/></label>}
          {modal.acao === 'pagar' && <label>Data do recebimento<input autoFocus required type="date" max={hoje()} className={s.input} value={form.pago_em} onChange={e => campo('pago_em',e.target.value)}/></label>}
          <label>Motivo / referência para o histórico<textarea required minLength={3} maxLength={500} rows={3} className={s.input} placeholder="Ex.: recebimento conferido no extrato" value={form.motivo} onChange={e => campo('motivo',e.target.value)}/></label>
        </fieldset>{erro && <p role="alert" className={s.error}>{erro}</p>}<div className={s.dialogActions}><button type="button" className={s.button} disabled={salvando} onClick={() => setModal(null)}>Voltar</button><button className={`${s.button} ${s.primary}`} disabled={salvando || form.motivo.trim().length < 3}>{salvando ? 'Salvando…' : 'Confirmar'}</button></div>
      </form>}
    </dialog>
  </div>;
}
