"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AuthContextType = {
  user: any;
  perfilUsuario: any;
  empresaId: string | null;
  nomeEmpresa: string;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const pathname = usePathname();

const rotaPublica =
  pathname === "/" ||
  pathname === "/como-funciona" ||
  pathname === "/recursos" ||
  pathname === "/planos" ||
  pathname === "/login" ||
  pathname === "/update-password" ||
  pathname === "/reset-password";

  const [user, setUser] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregarAutenticacao = async () => {
      try {
        setLoading(true);

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!ativo) return;

    if (authError || !authUser) {
  setUser(null);
  setPerfilUsuario(null);
  setEmpresaId(null);
  setNomeEmpresa("");

  // Só manda para o login quando a pessoa tentou
  // acessar uma área interna do ERP.
  if (!rotaPublica) {
    router.replace("/login");
  }

  return;
}

        setUser(authUser);

        const [
          { data: perfilData, error: perfilError },
          { data: vinculoData, error: vinculoError },
        ] = await Promise.all([
          supabase
            .from("perfis")
            .select("nome_completo")
            .eq("id", authUser.id)
            .maybeSingle(),

          supabase
            .from("perfis_usuarios")
            .select("email, empresa_id")
            .eq("id", authUser.id)
            .maybeSingle(),
        ]);

        if (!ativo) return;

        if (perfilError) {
          console.error(
            "Erro ao buscar perfil:",
            perfilError.message
          );
        }

        if (vinculoError) {
          console.error(
            "Erro ao buscar vínculo:",
            vinculoError.message
          );
        }

        if (perfilData) {
          setPerfilUsuario(perfilData);
        } else if (vinculoData) {
          setPerfilUsuario({
            email: vinculoData.email,
            nome: vinculoData.email?.split("@")[0],
          });
        }

        if (!vinculoData) {
          console.warn(
            "Vínculo não encontrado para:",
            authUser.id
          );

          setEmpresaId(null);
          setNomeEmpresa("Empresa não vinculada");
          return;
        }

        setEmpresaId(vinculoData.empresa_id);

        if (vinculoData.empresa_id) {
          const { data: empresaData, error: empresaError } =
            await supabase
              .from("empresas")
              .select("nome")
              .eq("id", vinculoData.empresa_id)
              .maybeSingle();

          if (!ativo) return;

          if (empresaError) {
            console.error(
              "Erro ao buscar empresa:",
              empresaError.message
            );
          }

          if (empresaData) {
            setNomeEmpresa(empresaData.nome);
          }
        }
      } catch (error) {
        console.error(
          "Erro inesperado no AuthProvider:",
          error
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    };

    void carregarAutenticacao();

    return () => {
      ativo = false;
    };
}, [router, rotaPublica]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      setUser(null);
      setPerfilUsuario(null);
      setEmpresaId(null);
      setNomeEmpresa("");

      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfilUsuario,
        empresaId,
        nomeEmpresa,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext deve ser usado dentro de AuthProvider"
    );
  }

  return context;
}