"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { Settings, Layers, RefreshCw, Box, Ruler, Wrench } from "lucide-react";
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

  // Estados para Simulação de Teste (Inputs do usuário)
  const [medidasTeste, setMedidasTeste] = useState({ largura: 1500, altura: 2100 });
  const [configuracaoAtiva, setConfiguracaoAtiva] = useState({
    trilhoEmbutido: false,
    tipoFechamento: "fecho",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUsuarioEmail(user.email || "");

      const { data: perfil } = await supabase.from("perfis_usuarios").select("empresa_id").eq("id", user.id).maybeSingle();
      if (perfil?.empresa_id) {
        const { data: empresa } = await supabase.from("empresas").select("nome").eq("id", perfil.empresa_id).single();
        if (empresa) setNomeEmpresa(empresa.nome);
      }

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

  // 1. Crie um estado para controlar o Modal
const [isModalPerfilOpen, setIsModalPerfilOpen] = useState(false);

// 2. Função para salvar o vínculo no Supabase
const vincularPerfil = async (perfilId: string, formula: string) => {
  const { error } = await supabase
    .from("tipologias_perfis")
    .insert([{ 
      tipologia_id: dadosConfig.id, 
      perfil_id: perfilId, 
      formula_calculo: formula 
    }]);

  if (!error) {
    setIsModalPerfilOpen(false);
    handleSelectTipologia(dadosConfig.id); // Atualiza a tela
  }
};

  // Função que retorna o desenho (SVG) baseado nas opções
  const renderizarDesenho = () => (
    <svg viewBox="0 0 400 300" className="w-full h-auto bg-white rounded-2xl border border-gray-200 shadow-inner">
      {/* Moldura Externa */}
      <rect x="50" y="50" width="300" height="200" fill="none" stroke="#CBD5E1" strokeWidth="8" />
      {/* Vidro Esquerdo */}
      <rect x="54" y="54" width="146" height="192" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="2" />
      {/* Vidro Direito */}
      <rect x="200" y="54" width="146" height="192" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="2" />
      
      {/* Linha do Trilho Embutido (Opcional) */}
      {configuracaoAtiva.trilhoEmbutido && (
        <line x1="50" y1="250" x2="350" y2="250" stroke="#EF4444" strokeWidth="4" strokeDasharray="4" />
      )}

      {/* Marcação de Medida */}
      <text x="200" y="40" textAnchor="middle" fontSize="12" className="fill-gray-400 font-bold">L: {medidasTeste.largura}mm</text>
      <text x="30" y="150" textAnchor="middle" fontSize="12" className="fill-gray-400 font-bold" transform="rotate(-90 30,150)">A: {medidasTeste.altura}mm</text>
    </svg>
  );

  if (checkingAuth) return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} />
      
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
            <p className="text-gray-500 font-medium">Cadastre regras de corte, vidros e componentes.</p>
          </div>
            
          <select 
            className="w-full p-4 mb-8 border border-gray-200 rounded-2xl outline-none shadow-sm font-bold text-gray-700 bg-white"
            onChange={(e) => handleSelectTipologia(e.target.value)}
          >
            <option value="">Selecione um modelo para configurar...</option>
            {tipologias.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>

          {dadosConfig && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
              
              {/* COLUNA 1: CONFIGURAÇÃO DE REGRAS E COMPONENTES */}
              <div className="xl:col-span-1 space-y-6">
                
                {/* Opções Rápidas */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-black mb-4 flex items-center gap-2 text-gray-800"><Settings size={18}/> Opções do Modelo</h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded accent-blue-600"
                        checked={configuracaoAtiva.trilhoEmbutido}
                        onChange={(e) => setConfiguracaoAtiva({...configuracaoAtiva, trilhoEmbutido: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-gray-600">Considerar Trilho Embutido</span>
                    </label>
                  </div>
                </div>

                {/* Listagem de Materiais Vinculados */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-black mb-4 flex items-center gap-2 text-gray-800"><Box size={18}/> Perfis e Vidros</h3>
                  <div className="space-y-2">
                    {dadosConfig.tipologias_perfis?.map((p: any) => (
                      <div key={p.id} className="p-3 bg-gray-50 rounded-xl text-xs font-bold flex justify-between">
                        <span>{p.codigo_perfil}</span>
                        <span className="text-blue-600">Fórmula: L / 2 - 10</span>
                      </div>
                    ))}
                    <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-50 transition-all">
                      + Adicionar Perfil ou Vidro
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUNA 2: DESENHO E SIMULADOR EM TEMPO REAL */}
              <div className="xl:col-span-2 space-y-6">
                
                <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                   {renderizarDesenho()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inputs de Teste */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Ruler size={20} /> Medidas de Teste</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase">Largura (mm)</label>
                        <input 
                          type="number" 
                          className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-black outline-none focus:ring-2 focus:ring-blue-500"
                          value={medidasTeste.largura}
                          onChange={(e) => setMedidasTeste({...medidasTeste, largura: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase">Altura (mm)</label>
                        <input 
                          type="number" 
                          className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-black outline-none focus:ring-2 focus:ring-blue-500"
                          value={medidasTeste.altura}
                          onChange={(e) => setMedidasTeste({...medidasTeste, altura: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resultado da Simulação */}
                  <div className="bg-slate-800 p-6 rounded-3xl shadow-lg text-white">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-blue-400"><RefreshCw size={20} /> Resultado do Corte</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-sm font-medium text-slate-400">Vidro (2x):</span>
                        <span className="font-black text-blue-400">{(medidasTeste.largura / 2 - 12).toFixed(1)} x {(medidasTeste.altura - 45).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-sm font-medium text-slate-400">Perfil Trilho:</span>
                        <span className="font-black text-green-400">{medidasTeste.largura - 2} mm</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}