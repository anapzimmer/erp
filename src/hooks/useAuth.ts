// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null); // 🔥 Nome do usuário
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('Carregando...');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // 1. Pega o usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. Busca o nome do usuário na tabela "perfis"
      const { data: perfilData } = await supabase
        .from('perfis')
        .select('nome')
        .eq('id', user.id)
        .single();
      
      if (perfilData) setPerfilUsuario(perfilData);

      // 3. Busca o vínculo empresa_id
      const { data: perfilVinculo } = await supabase
        .from('perfis_usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (perfilVinculo) {
        setEmpresaId(perfilVinculo.empresa_id);

        // 4. Busca o nome da empresa
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('nome')
          .eq('id', perfilVinculo.empresa_id)
          .single();
        
        if (empresaData) setNomeEmpresa(empresaData.nome);
      }
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  // 🔥 Retorne o perfilUsuario também
  return { user, perfilUsuario, empresaId, nomeEmpresa, loading };
}