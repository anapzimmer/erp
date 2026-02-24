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
      // 1. Pega o usuário logado (Autenticação do Supabase)
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      // 2. Busca os dados na tabela 'usuarios'
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('perfis_usuarios')
        .select('email, empresa_id') // 🔥 Removido 'nome', adicionado 'email'
        .eq('id', authUser.id)
        .maybeSingle();

      if (usuarioError) {
        console.error("Erro na consulta ao banco:", usuarioError.message);
      }

      if (usuarioData) {
        // Como não tem coluna 'nome', vamos usar o e-mail ou a parte antes do @ para o perfil
        setPerfilUsuario({
          ...usuarioData,
          nome: usuarioData.email.split('@')[0] // Isso evita o erro de 'coluna não existe'
        });
        setEmpresaId(usuarioData.empresa_id);

        // 3. Busca o nome da empresa
        if (usuarioData.empresa_id) {
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('nome')
            .eq('id', usuarioData.empresa_id)
            .maybeSingle();

          if (empresaData) setNomeEmpresa(empresaData.nome);
        }
      } else {
        console.warn("Vínculo não encontrado em perfis_usuarios para o ID:", authUser.id);
        setNomeEmpresa("Empresa não vinculada");
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  return { user, perfilUsuario, empresaId, nomeEmpresa, loading };
}