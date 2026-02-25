// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('Carregando...');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 1. Pega o usuário logado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          setLoading(false);
          router.push('/login');
          return;
        }

        setUser(authUser);

        // 2. Busca o perfil (CORRIGIDO: usando authUser.id em vez de user.id)
        const { data: perfilData } = await supabase
          .from('perfis')
          .select('nome_completo')
          .eq('id', authUser.id) // 🔥 Aqui estava o erro 'id of null'
          .single();
        
        if (perfilData) setPerfilUsuario(perfilData);

        // 3. Busca o vínculo da empresa (CORRIGIDO: nomes das variáveis)
        const { data: vinculoData, error: vinculoError } = await supabase
          .from('perfis_usuarios')
          .select('email, empresa_id')
          .eq('id', authUser.id)
          .maybeSingle();

        if (vinculoError) {
          console.error("Erro ao buscar vínculo:", vinculoError.message);
        }

        if (vinculoData) {
          setEmpresaId(vinculoData.empresa_id);
          
          // Atualiza o perfil com o email se o nome_completo não existir
          if (!perfilData) {
            setPerfilUsuario({
              email: vinculoData.email,
              nome: vinculoData.email?.split('@')[0]
            });
          }

          // 4. Busca o nome da empresa
          if (vinculoData.empresa_id) {
            const { data: empresaData } = await supabase
              .from('empresas')
              .select('nome')
              .eq('id', vinculoData.empresa_id)
              .maybeSingle();

            if (empresaData) setNomeEmpresa(empresaData.nome);
          }
        } else {
          console.warn("Vínculo não encontrado para:", authUser.id);
          setNomeEmpresa("Empresa não vinculada");
        }

      } catch (err) {
        console.error("Erro inesperado no useAuth:", err);
      } finally {
        setLoading(false); // Garante que o loading pare sempre
      }
    };

    checkUser();
  }, [router]);

  return { user, perfilUsuario, empresaId, nomeEmpresa, loading };
}