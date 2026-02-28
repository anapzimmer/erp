"use client"

import { useState } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "@/components/Sidebar"
import { 
  Box, 
  Maximize2, 
  Layers, 
  Trash2, 
  Save, 
  Plus, 
  Calculator,
  Info
} from "lucide-react"

export default function CalculoEspelhosPage() {
  const { theme } = useTheme();
  const { nomeEmpresa } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Estados do Cálculo
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      
      <Sidebar 
        showMobileMenu={showMobileMenu} 
        setShowMobileMenu={setShowMobileMenu} 
        nomeEmpresa={nomeEmpresa || "Empresa"} 
      />

      <div className="flex-1 flex flex-col w-full">
        <main className="p-4 md:p-8 flex-1">
          
          {/* CABEÇALHO DA PÁGINA */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}>
              <Maximize2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black" style={{ color: theme.contentTextLightBg }}>Cálculo de Espelhos</h1>
              <p className="text-gray-500 font-medium text-sm">Configure as medidas e acabamentos para orçamento instantâneo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUNA DE ENTRADA (FORMULÁRIO) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Largura (mm)</label>
                      <input 
                        type="number" 
                        value={largura}
                        onChange={(e) => setLargura(e.target.value)}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Altura (mm)</label>
                      <input 
                        type="number" 
                        value={altura}
                        onChange={(e) => setAltura(e.target.value)}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Espelho</label>
                    <select className="w-full p-3 mt-1 rounded-xl border border-gray-200 bg-white focus:ring-2 outline-none">
                      <option>Espelho Prata 4mm</option>
                      <option>Espelho Bronze 4mm</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD DE ADICIONAIS / ACABAMENTOS */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4" style={{ color: theme.menuBackgroundColor }}>Acabamentos</h3>
                <div className="space-y-3">
                  {['Lapidação Reta', 'Bisotê 10mm', 'Furo 8mm'].map((item) => (
                    <label key={item} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all">
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                      <input type="checkbox" className="w-5 h-5 rounded-lg" style={{ accentColor: theme.menuIconColor }} />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUNA DE VISUALIZAÇÃO E RESULTADO */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* ÁREA DO DESENHO TÉCNICO */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-6 left-6 flex items-center gap-2 text-gray-400">
                  <Info size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Preview Proporcional</span>
                </div>

                {/* O ESPELHO DINÂMICO */}
                <div 
                  className="border-4 shadow-2xl flex items-center justify-center transition-all duration-500 ease-out"
                  style={{ 
                    backgroundColor: '#e2e8f0', 
                    borderColor: '#cbd5e1',
                    width: largura ? Math.min(Number(largura) / 4, 400) : 100,
                    height: altura ? Math.min(Number(altura) / 4, 400) : 100,
                    borderRadius: '4px'
                  }}
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Espelho</span>
                </div>
              </div>

              {/* BARRA DE PREÇO FINAL (FOOTER DO CALCULO) */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="text-center md:text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase">M² Total</p>
                      <p className="text-xl font-bold" style={{ color: theme.menuBackgroundColor }}>0,00 m²</p>
                   </div>
                   <div className="h-10 w-[1px] bg-gray-100 hidden md:block" />
                   <div className="text-center md:text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase">Valor Final</p>
                      <p className="text-3xl font-black text-green-600">R$ 0,00</p>
                   </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg" style={{ backgroundColor: theme.menuIconColor }}>
                    <Plus size={20} /> Adicionar ao Pedido
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}