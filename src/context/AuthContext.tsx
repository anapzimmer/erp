"use client";
import { rotaPublica as ehRotaPublica } from "@/lib/rotasPublicas";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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

const rotaPublica = ehRotaPublica(pathname);

  const [user, setUser] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [loading, setLoading] = useState(true);
  const usuarioCarregado = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;
    let versao = 0;

    const carregarAutenticacao = async () => {
      const atual = ++versao;
      try {
        // Revalidar a mesma sessão não deve desmontar formulários e PDFs abertos.
        if (!usuarioCarregado.current) setLoading(true);

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!ativo || atual !== versao) return;

    if (authError || !authUser) {
  usuarioCarregado.current = null;
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

        if (usuarioCarregado.current !== authUser.id) {
          setLoading(true);
          setPerfilUsuario(null);
          setEmpresaId(null);
          setNomeEmpresa("Carregando...");
        }
        usuarioCarregado.current = authUser.id;
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

        if (!ativo || atual !== versao) return;

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

          if (!ativo || atual !== versao) return;

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
        if (ativo && atual === versao) {
          setLoading(false);
        }
      }
    };

    void carregarAutenticacao();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        usuarioCarregado.current = null;
        ++versao; setUser(null); setPerfilUsuario(null); setEmpresaId(null); setNomeEmpresa(''); setLoading(false);
        if (!rotaPublica) router.replace('/login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user.id && session.user.id !== usuarioCarregado.current) {
          usuarioCarregado.current = null;
          setLoading(true); setUser(null); setPerfilUsuario(null); setEmpresaId(null); setNomeEmpresa('');
        }
        setTimeout(() => { if (ativo) void carregarAutenticacao(); }, 0);
      }
    });
    return () => {
      ativo = false;
      subscription.unsubscribe();
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
