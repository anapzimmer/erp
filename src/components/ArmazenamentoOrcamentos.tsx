"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: string; numero_formatado?: string; cliente_nome?: string; created_at?: string; gc_alterado_em?: string; gc_excluido_em?: string };
type Config = { autorizado: boolean; proprietaria: boolean; dias: number | null };

export default function ArmazenamentoOrcamentos() {
  const [config, setConfig] = useState<Config | null>(null);
  const [dias, setDias] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [revisadoEm, setRevisadoEm] = useState("");
  const [previa, setPrevia] = useState<Item[] | null>(null);
  const [lixeira, setLixeira] = useState<Item[]>([]);
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const rpc = async (acao: string, params: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.rpc("gc_armazenamento", { p_acao: acao, ...params });
    if (error) throw new Error(error.code === "PGRST202" ? "O armazenamento ainda precisa ser ativado no banco pela Glass Code." : error.message);
    return data;
  };
  async function consultarPeriodo(confirmar = false) {
    if (!inicio || !fim || inicio > fim) throw new Error("Informe as duas datas, com a inicial anterior ou igual à final.");
    const limite = new Date(fim + "T00:00:00");
    limite.setDate(limite.getDate() + 1);
    const { data, error } = await supabase.rpc("gc_limpar_orcamentos_periodo", {
      p_inicio: new Date(inicio + "T00:00:00").toISOString(),
      p_fim: limite.toISOString(),
      ...(confirmar ? { p_ids: previa!.map(i => i.id), p_revisado_em: revisadoEm } : {}),
    });
    if (error) throw new Error(error.code === "PGRST202" ? "Ative a limpeza por período no banco com o arquivo orcamentos_limpeza_periodo.sql." : error.message);
    return data;
  }
  const carregar = useCallback(async () => {
    const data = await rpc("consultar") as Config;
    setConfig(data); setDias(data.dias ? String(data.dias) : "");
    if (data.autorizado) setLixeira(await rpc("lixeira"));
  }, []);
  useEffect(() => { void carregar().catch(error => setMensagem(error.message)); }, [carregar]);
  async function executar(acao: () => Promise<void>) {
    setOcupado(true); setMensagem("");
    try { await acao(); } catch (error) { setMensagem(error instanceof Error ? error.message : "Não foi possível concluir."); }
    finally { setOcupado(false); }
  }
  const botao = "rounded-lg border border-border px-4 py-2 text-sm hover:border-primary disabled:opacity-50";
  const campo = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary";
  return <section className="mt-6 rounded-2xl border border-border bg-surface p-6 text-text-primary">
    <h2 className="text-lg font-medium">Armazenamento de orçamentos</h2>
    <p className="mt-2 text-sm text-text-secondary">Prazo contado desde a última alteração. Orçamentos aprovados ou vinculados a obras/pedidos cadastrados são preservados. Um nome no campo obra/referência não bloqueia a limpeza. A lixeira permite restaurar por 30 dias; depois, a exclusão é definitiva.</p>
    {mensagem && <p role="status" className="mt-4 rounded-lg border border-border p-3 text-sm">{mensagem}</p>}
    {config && !config.autorizado && <p className="mt-4 text-sm">Somente o responsável autorizado pela Glass Code pode alterar estas opções.</p>}
    {config?.autorizado && <fieldset disabled={ocupado} className="mt-5 space-y-6 disabled:opacity-60">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-2 text-sm">Manter orçamentos por<select className={campo} value={dias} onChange={e => setDias(e.target.value)}><option value="">Manter sempre</option>{[30,90,180,365].map(n => <option key={n} value={n}>{n} dias</option>)}</select></label>
        <button type="button" className={botao} onClick={() => void executar(async () => { await rpc("configurar", {p_dias: dias ? Number(dias) : null}); await carregar(); setMensagem("Prazo salvo. A limpeza automática é processada diariamente quando o agendamento do banco está ativo."); })}>Salvar prazo</button>
      </div>
      <div className="border-t border-border pt-5">
        <h3 className="text-sm font-medium">Limpeza manual</h3>
        <p className="my-2 text-xs text-text-secondary">Selecione a data de criação dos orçamentos, incluindo todo o dia final. Até 500 itens por revisão. Itens alterados ou protegidos depois da prévia não serão removidos.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm">Data inicial<input type="date" className={campo} value={inicio} max={fim || undefined} onChange={e => {setInicio(e.target.value); setPrevia(null);}} /></label>
          <label className="grid gap-2 text-sm">Data final<input type="date" className={campo} value={fim} min={inicio || undefined} onChange={e => {setFim(e.target.value); setPrevia(null);}} /></label>
          <button type="button" className={botao} disabled={!inicio || !fim || inicio > fim} onClick={() => void executar(async () => {const r=await consultarPeriodo(); setPrevia(r.itens); setRevisadoEm(r.revisado_em);})}>Ver prévia</button>
        </div>
        {previa && <div className="mt-4"><p className="text-sm">{previa.length} orçamento(s) elegível(is) nesta revisão.</p><Lista itens={previa} />{previa.length > 0 && <button type="button" className={`${botao} mt-3`} onClick={() => void executar(async () => { const r = await consultarPeriodo(true); setPrevia(null); await carregar(); setMensagem(`${r.quantidade} orçamento(s) movido(s) para a lixeira. Você pode restaurar por 30 dias.`); })}>Confirmar: mover {previa.length} para a lixeira</button>}</div>}
      </div>
      <div className="border-t border-border pt-5"><h3 className="text-sm font-medium">Lixeira · {lixeira.length} orçamento(s)</h3><Lista itens={lixeira} restaurar={id => void executar(async () => { const r=await rpc("restaurar",{p_ids:[id]}); await carregar(); setMensagem(r.quantidade ? "Orçamento restaurado. O prazo de armazenamento foi reiniciado." : "O prazo para restaurar este orçamento terminou."); })} /></div>
    </fieldset>}
    {config?.proprietaria && <fieldset disabled={ocupado} className="mt-6 border-t border-border pt-5"><h3 className="text-sm font-medium">Glass Code · Autorizar responsável</h3><p className="my-2 text-xs text-text-secondary">A permissão se aplica somente à empresa vinculada ao usuário informado.</p><div className="flex flex-wrap gap-3"><input type="email" aria-label="E-mail do responsável" placeholder="E-mail do responsável" className={campo} value={email} onChange={e=>setEmail(e.target.value)} />{["autorizar","revogar"].map(acao=><button key={acao} type="button" className={botao} disabled={!email.trim()} onClick={()=>void executar(async()=>{await rpc(acao,{p_email:email});setMensagem(acao==="autorizar"?"Responsável autorizado.":"Autorização revogada.");})}>{acao==="autorizar"?"Autorizar":"Revogar"}</button>)}</div></fieldset>}
  </section>;
}

function Lista({itens, restaurar}: {itens: Item[]; restaurar?: (id: string)=>void}) {
  return <ul className="mt-3 max-h-72 overflow-auto divide-y divide-border">{itens.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{item.numero_formatado || "Sem número"} · {item.cliente_nome || "Sem cliente"}<small className="block text-text-secondary">{new Date(item.gc_excluido_em || item.created_at || item.gc_alterado_em || "").toLocaleDateString("pt-BR")}</small></span>{restaurar && <button type="button" disabled={Date.now()-new Date(item.gc_excluido_em!).getTime()>=30*86400000} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40" onClick={()=>restaurar(item.id)}>Restaurar</button>}</li>)}</ul>;
}
