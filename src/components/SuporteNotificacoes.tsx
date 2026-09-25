"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/context/AuthContext';

type Resumo = { administradora: boolean; total: number; chamados: { id: string; titulo: string; em: string }[] };
export default function SuporteNotificacoes() {
  const { user, loading } = useAuthContext();
  const [resumo, setResumo] = useState<(Resumo & { usuario: string }) | null>(null);
  const dispensar = (usuario: string, chamados: Resumo['chamados']) => {
    try {
      const chave = 'glasscode:suporte-dispensado:' + usuario;
      const salvos = JSON.parse(localStorage.getItem(chave) || '{}');
      for (const chamado of chamados) salvos[chamado.id] = chamado.em;
      localStorage.setItem(chave, JSON.stringify(salvos));
    } catch { /* A leitura no servidor continua funcionando sem armazenamento local. */ }
    setResumo(anterior => anterior && anterior.usuario === usuario ? { ...anterior, chamados: anterior.chamados.filter(c => !chamados.some(d => d.id === c.id && d.em === c.em)), total: Math.max(0, anterior.total - chamados.length) } : anterior);
  };
  useEffect(() => {
    if (!user || loading) return;
    let ativo = true, ocupado = false;
    const consultar = async () => {
      if (!ativo || ocupado || document.visibilityState !== 'visible') return;
      ocupado = true;
      try {
        const { data, error } = await supabase.rpc('gc_suporte_notificacoes');
        if (ativo) {
          if (error) { setResumo(null); return; }
          let salvos: Record<string, string> = {};
          try { salvos = JSON.parse(localStorage.getItem('glasscode:suporte-dispensado:' + user.id) || '{}') || {}; } catch {}
          const chamados = (data.chamados as Resumo['chamados']).filter(c => !salvos[c.id] || Date.parse(c.em) > Date.parse(salvos[c.id]));
          setResumo({ ...data, chamados, total: Math.max(0, data.total - (data.chamados.length - chamados.length)), usuario: user.id });
        }
      } catch { if (ativo) setResumo(null); } finally { ocupado = false; }
    };
    void consultar();
    const timer = setInterval(() => void consultar(), 20000);
    const atualizar = () => void consultar();
    window.addEventListener('glasscode:suporte-lido', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => { ativo = false; clearInterval(timer); window.removeEventListener('glasscode:suporte-lido', atualizar); document.removeEventListener('visibilitychange', atualizar); };
  }, [user?.id, loading]);
  if (!user || !resumo || resumo.usuario !== user.id || !resumo.total || !resumo.chamados.length) return null;
  const destino = resumo.administradora ? '/plataforma?aba=suporte' : '/suporte';
  return <aside role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-surface p-4 text-text-primary shadow-lg">
    <div className="flex items-start gap-3"><MessageSquare size={19} className="mt-1 shrink-0 text-text-secondary"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">Nova mensagem no suporte</p><p className="mt-1 text-xs text-text-secondary">{resumo.total === 1 ? '1 atendimento com mensagem não lida.' : `${resumo.total} atendimentos com mensagens não lidas.`}</p><Link onClick={() => {
      const chamado = resumo.chamados[0];
      dispensar(user.id, [chamado]);
      window.dispatchEvent(new CustomEvent('glasscode:abrir-suporte', { detail: chamado.id }));
      void supabase.rpc('gc_suporte_marcar_lido', { p_chamado_id: chamado.id, p_ate: chamado.em }).then(({ error }) => { if (!error) window.dispatchEvent(new Event('glasscode:suporte-lido')); });
    }} href={`${destino}${destino.includes('?') ? '&' : '?'}chamado=${encodeURIComponent(resumo.chamados[0].id)}`} className="mt-3 inline-block text-sm underline underline-offset-4">Abrir atendimento</Link></div><button type="button" aria-label="Dispensar aviso de suporte" onClick={() => dispensar(user.id, resumo.chamados)} className="rounded p-1 text-text-secondary hover:bg-surface-secondary"><X size={16}/></button></div>
  </aside>;
}
