// src/hooks/useAuth.ts

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>("Carregando...");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const rotaPublica =
          pathname === "/" ||
          pathname === "/recursos" ||
          pathname === "/planos" ||
          pathname === "/login" ||
          pathname === "/recuperar-senha" ||
          pathname === "/reset-password";

        // 1. Pega o usuário logado
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        // =====================================================
        // NÃO LOGADO
        // =====================================================
        if (authError || !authUser) {
          setUser(null);
          setPerfilUsuario(null);
          setEmpresaId(null);
          setNomeEmpresa("");

          // Site público: permite continuar normalmente
          if (rotaPublica) {
            return;
          }

          // ERP privado: manda para o login
          router.replace("/login");
          return;
        }

        // =====================================================
        // USUÁRIO LOGADO
        // =====================================================
        setUser(authUser);

        // 2. Busca o perfil
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfis")
          .select("nome_completo")
          .eq("id", authUser.id)
          .maybeSingle();

        if (perfilError) {
          console.error(
            "Erro ao buscar perfil:",
            perfilError.message
          );
        }

        if (perfilData) {
          setPerfilUsuario(perfilData);
        }

        // 3. Busca o vínculo da empresa
        const { data: vinculoData, error: vinculoError } = await supabase
          .from("perfis_usuarios")
          .select("email, empresa_id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (vinculoError) {
          console.error(
            "Erro ao buscar vínculo:",
            vinculoError.message
          );
        }

        if (vinculoData) {
          setEmpresaId(vinculoData.empresa_id);

          if (!perfilData) {
            setPerfilUsuario({
              email: vinculoData.email,
              nome: vinculoData.email?.split("@")[0],
            });
          }

          // 4. Busca o nome da empresa
          if (vinculoData.empresa_id) {
            const { data: empresaData } = await supabase
              .from("empresas")
              .select("nome")
              .eq("id", vinculoData.empresa_id)
              .maybeSingle();

            if (empresaData) {
              setNomeEmpresa(empresaData.nome);
            }
          }
        } else {
          console.warn(
            "Vínculo não encontrado para:",
            authUser.id
          );

          setNomeEmpresa("Empresa não vinculada");
        }
      } catch (err) {
        console.error(
          "Erro inesperado no useAuth:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [pathname, router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return {
    user,
    perfilUsuario,
    empresaId,
    nomeEmpresa,
    loading,
    signOut,
  };
}