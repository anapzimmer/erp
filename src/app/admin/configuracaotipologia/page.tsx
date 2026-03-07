"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { Settings, Layers, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function ConfiguracaoTipologia() {
  const router = useRouter();
  const { theme } = useTheme();

  // Estados de Layout e Auth
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Estados de Dados
  const [tipologias, setTipologias] = useState<any[]>([]);
  const [dadosConfig, setDadosConfig] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUsuarioEmail(user.email || "");

      // Buscar Nome da Empresa (usando a lógica do seu Dashboard)
      const { data: perfil } = await supabase.from("perfis_usuarios").select("empresa_id").eq("id", user.id).single();
      if (perfil?.empresa_id) {
        const { data: empresa } = await supabase.from("empresas").select("nome").eq("id", perfil.empresa_id).single();
        if (empresa) setNomeEmpresa(empresa.nome);
      }

      // Buscar Tipologias
      const { data } = await supabase.from("tipologias").select("id, nome");
      if (data) setTipologias(data);
      
      setCheckingAuth(false);
    };
    fetchData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSelectTipologia = async (id: string) => {
    const { data } = await supabase
      .from("tipologias")
      .select(`*, tipologias_vidros(*), tipologias_perfis(*), tipologias_ferragens(*)`)
      .eq("id", id)
      .single();
    setDadosConfig(data);
  };

  if (checkingAuth) return null; // Ou um loading screen como no dashboard

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} />
      
      {showMobileMenu && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}></div>}

      <div className="flex-1 flex flex-col w-full">
        <Header 
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail}
          handleSignOut={handleSignOut}
        />

        <main className="p-4 md:p-8 flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-black" style={{ color: theme.contentTextLightBg }}>Configurar Tipologias</h1>
            <p className="text-gray-500 font-medium">Defina as fórmulas de cálculo e margens de cada modelo.</p>
          </div>
            
          <select 
            className="w-full p-4 mb-8 border border-gray-200 rounded-2xl outline-none shadow-sm font-bold"
            onChange={(e) => handleSelectTipologia(e.target.value)}
          >
            <option value="">Selecione um modelo de esquadria...</option>
            {tipologias.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>

          {dadosConfig && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-black mb-6 flex items-center gap-2"><Layers size={20} /> Fórmulas de Corte</h2>
                {/* Aqui virá o mapeamento dos seus campos */}
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h2 className="text-lg font-black mb-6 flex items-center gap-2"><RefreshCw size={20} /> Simulador de Teste</h2>
                {/* Aqui virá o simulador */}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}