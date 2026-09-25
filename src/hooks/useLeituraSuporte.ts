"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Conversa = { id: string; created_at: string; mensagens: { created_at: string }[] };
export function useLeituraSuporte(chamado: Conversa | null) {
  const [erro, setErro] = useState('');
  const ate = chamado ? [chamado.created_at, ...chamado.mensagens.map(m => m.created_at)].sort((a,b) => Date.parse(b)-Date.parse(a))[0] : null;
  useEffect(() => {
    if (!chamado?.id || !ate) return;
    let ativo = true;
    const marcar = async () => {
      if (document.visibilityState !== 'visible') return;
      const { error } = await supabase.rpc('gc_suporte_marcar_lido', { p_chamado_id: chamado.id, p_ate: ate });
      if (!ativo) return;
      setErro(error ? 'Não foi possível registrar a leitura. Confira a ativação de suporte_notificacoes.sql no Supabase.' : '');
      if (!error) window.dispatchEvent(new Event('glasscode:suporte-lido'));
    };
    const executar = () => { void marcar().catch(() => { if (ativo) setErro('Não foi possível registrar a leitura. Tente novamente.'); }); };
    executar();
    document.addEventListener('visibilitychange', executar);
    return () => { ativo = false; document.removeEventListener('visibilitychange', executar); };
  }, [chamado?.id, ate]);
  return chamado ? erro : '';
}
