"use client";

import { useState } from "react";
import { Palette, UploadCloud, Save, X, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- Paletas de Cores Predefinidas ---
const PRESET_PALETTES = [
  { name: "Padrão", primary: "#1C415B", accent: "#92D050" },
  { name: "Ocean", primary: "#0F5132", accent: "#3B82F6" },
  { name: "Sunset", primary: "#7C2D12", accent: "#F97316" },
  { name: "Dark", primary: "#1F2937", accent: "#38BDF8" },
];

export default function ConfiguracoesBrandingPage() {
  const router = useRouter();

  // --- Estados ---
  const [logoPreview, setLogoPreview] = useState<string | null>("/glasscode.png");
  const [primaryColor, setPrimaryColor] = useState("#1C415B");
  const [accentColor, setAccentColor] = useState("#92D050");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Upload de logo ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Salvar configurações ---
  const handleSave = async () => {
    setLoading(true);
    setMsg(null);

    try {
      // TODO: Salvar no banco (Supabase ou outro)
      console.log("Salvando:", { logoPreview, primaryColor, accentColor });

      setMsg({ type: "success", text: "Configurações salvas com sucesso!" });
    } catch (err) {
      setMsg({ type: "error", text: "Erro ao salvar as configurações." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* MENU LATERAL - REUTILIZADO DO DASHBOARD */}
      <aside className="w-64 bg-[#1C415B] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-[#285A7B]">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <div className="w-2 h-8 bg-[#92D050] rounded-full"></div>
            VIDRAÇARIA
          </h2>
        </div>
        {/* ... adicionar menus aqui ... */}
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1C415B]">Branding e Tema</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Personalize a aparência do sistema, cores e logo.
          </p>
        </header>

        {/* --- Card de Configurações --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8 max-w-5xl mx-auto">
          
          <div className="grid md:grid-cols-2 gap-10">
            {/* Coluna Esquerda: Inputs */}
            <div className="space-y-8">
              {/* Upload de Logo */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4">Logo do Sistema</label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-100">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Logo" width={100} height={100} className="object-contain" />
                    ) : (
                      <UploadCloud className="text-gray-400" size={40} />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1C415B] file:text-white hover:file:bg-[#285A7B]"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Escolha de cores */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4">Cores do Tema</label>
                
                {/* Paletas Predefinidas */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {PRESET_PALETTES.map(palette => (
                    <button 
                      key={palette.name}
                      onClick={() => { setPrimaryColor(palette.primary); setAccentColor(palette.accent); }}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:border-gray-300 transition-all"
                    >
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full border-2 border-white" style={{backgroundColor: palette.primary}}></div>
                        <div className="w-6 h-6 rounded-full border-2 border-white" style={{backgroundColor: palette.accent}}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{palette.name}</span>
                    </button>
                  ))}
                </div>

                {/* Cores Personalizadas */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-600">Primária</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-600">Destaque</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview */}
            <div className="border rounded-3xl p-6 bg-gray-50">
              <span className="block text-sm font-bold text-gray-700 mb-5">Pré-visualização do Tema:</span>
              
              {/* Simulação da Sidebar e Conteúdo */}
              <div className="rounded-2xl overflow-hidden border shadow-inner bg-white flex h-72">
                <div className="w-20 p-3 flex flex-col gap-3" style={{ backgroundColor: primaryColor }}>
                    <div className="w-6 h-6 rounded-md bg-white/20"></div>
                    <div className="w-6 h-6 rounded-md bg-white/20"></div>
                    <div className="w-6 h-6 rounded-md bg-white/20"></div>
                </div>
                <div className="flex-1 p-5">
                    <div className="w-32 h-6 rounded-md bg-gray-200 mb-4"></div>
                    <div className="w-full h-10 rounded-xl mb-4 flex items-center justify-center gap-2 text-white text-xs font-semibold" style={{ backgroundColor: accentColor }}>
                        <Palette size={14} /> Destaque
                    </div>
                    <div className="w-full h-10 rounded-xl mb-4 flex items-center justify-center gap-2 text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}>
                        <LayoutDashboard size={14} /> Primário
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem de sucesso/erro */}
          {msg && (
            <div
              className={`p-4 rounded-xl text-sm font-medium ${
                msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              } flex items-center justify-between gap-2`}
            >
              <div className="flex items-center gap-2">
                {msg.type === "success" ? "✅" : "❌"} {msg.text}
              </div>
              <button onClick={() => setMsg(null)}>
                <X size={18} className="opacity-60 hover:opacity-100" />
              </button>
            </div>
          )}

          {/* Botão Salvar */}
          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-[#92D050] hover:bg-[#82b947] text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-70 w-full sm:w-auto justify-center"
            >
              <Save size={18} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}