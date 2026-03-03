"use client"

import { useState, useRef } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "@/components/Sidebar"
import { Menu, Building2, ChevronDown, Wrench, X, Trash2, Edit2, CheckCircle, Plus, Ruler, Sparkles, ClipboardList,Calculator } from "lucide-react"

// Funções de apoio
const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50;

export default function PaginaBase() {
  const { theme } = useTheme()
  const { nomeEmpresa, user } = useAuth()

  // Estados do Layout
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Estados do Orçamento
  const [cliente, setCliente] = useState("")
  const [obra, setObra] = useState("")
  const [largura, setLargura] = useState("")
  const [altura, setAltura] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [vidroSelecionado, setVidroSelecionado] = useState("Espelho 04mm - Lapidado")
  const [servico, setServico] = useState("Nenhum")
  const [itens, setItens] = useState<any[]>([])

  const router = { push: (url: string) => console.log(url) }
  const handleLogout = () => console.log("logout")

  const adicionarItem = () => {
    const l = parseFloat(largura);
    const a = parseFloat(altura);
    if (!l || !a) return alert("Preencha as dimensões!");

    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);
    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const totalItem = (areaM2 < 0.25 ? 0.25 : areaM2) * 199 * quantidade; 

    const novoItem = {
      id: Date.now(),
      descricao: vidroSelecionado,
      medida: `${l}x${a} mm`,
      medidaCalc: `${lCalc}x${aCalc} mm`,
      qtd: quantidade,
      servico: servico,
      total: totalItem
    };

    setItens([...itens, novoItem]);
    setLargura(""); setAltura("");
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      
      {/* SIDEBAR */}
      <div className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:flex flex-col border-r border-gray-100 flex-shrink-0 sticky top-0 h-screen`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} expandido={sidebarExpandido} setExpandido={setSidebarExpandido} />
      </div>

      <div className="flex-1 flex flex-col w-full min-w-0">
        
        {/* HEADER - LOGIN RESTAURADO */}
        <header className="border-b border-gray-100 py-4 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-gray-700">Novo Orçamento</h1>
          </div>

          {/* MENU USUÁRIO (O que tinha sumido) */}
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:opacity-75 transition-all">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Building2 size={16} className="text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">Logado como</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                  <Wrench size={16} /> Configurações
                </button>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                  <X size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {/* IDENTIFICAÇÃO: CLIENTE E OBRA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase">Cliente:</span>
              <input type="text" placeholder="Nome do cliente" className="flex-1 p-2 outline-none text-sm" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 px-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Obra:</span>
              <input type="text" placeholder="Identificação da obra" className="flex-1 p-2 outline-none text-sm" value={obra} onChange={(e) => setObra(e.target.value)} />
            </div>
          </div>

{/*Coluna da esquerda: Dimensões e Serviços*/}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              {/* CARD DIMENSÕES */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Largura (mm)</label>
                    <input type="text" placeholder="mm" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none" value={largura} onChange={(e) => setLargura(e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Altura (mm)</label>
                    <input type="text" placeholder="mm" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none" value={altura} onChange={(e) => setAltura(e.target.value)} />
                  </div>
               <div className="col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Quantidade</label>
                  <input type="number" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
                </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Selecione o Vidro/Espelho</label>
                  <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none" value={vidroSelecionado} onChange={(e) => setVidroSelecionado(e.target.value)}>
                    <option>Espelho 04mm - Lapidado (R$ 199,00/m²)</option>
                    <option>Vidro Incolor 08mm - Temperado</option>
                    <option>Vidro Incolor 06mm - Comum</option>
                  </select>
                </div>
              </div>

              {/* CARD ACABAMENTOS */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Sparkles size={18} className="text-blue-500" />
                  <h3 className="font-bold text-gray-700 text-sm">Serviços</h3>
                </div>
                <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none" value={servico} onChange={(e) => setServico(e.target.value)}>
                  <option value="Nenhum">Nenhum / Apenas Lapidado</option>
                  <option value="Bisote">Bisotê</option>
                </select>
                <button onClick={adicionarItem} className="w-full py-4 bg-[#1e3a5a] text-white rounded-2xl font-bold hover:bg-[#2c5282] transition-all flex items-center justify-center gap-2">
                  <Plus size={20} /> Adicionar
                </button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {/* TABELA E RESUMO */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center gap-2">
                  <ClipboardList size={18} className="text-gray-400" />
                  <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Resumo do Pedido</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1e3a5a] text-white text-[10px] uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4 text-center">Medida (Calc)</th>
                        <th className="px-6 py-4 text-center">Qtd</th>
                        <th className="px-6 py-4 text-right">Subtotal</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                      {itens.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 font-bold text-gray-700">{item.descricao}</td>
                          <td className="px-6 py-4 text-center text-gray-500">{item.medidaCalc}</td>
                          <td className="px-6 py-4 text-center font-bold text-gray-700">{item.qtd}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">{formatarMoeda(item.total)}</td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => setItens(itens.filter(i => i.id !== item.id))} className="text-red-400"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-500 uppercase">Total:</span>
                  <span className="text-2xl font-black text-[#1e3a5a]">{formatarMoeda(itens.reduce((acc, i) => acc + i.total, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}