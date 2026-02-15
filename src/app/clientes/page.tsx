"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Users, Phone, MapPin, Map, X, Trash2, Edit2, PlusCircle, Search, Building2, ChevronDown, LogOut, Settings, Menu, ChevronRight, UsersRound } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"

// --- Tipagens ---
// 🔥 CORREÇÃO: id alterado para string (UUID)
type Cliente = { id: string; nome: string; telefone?: string | null; cidade?: string | null; rota: string; grupo_preco_id?: number | null; empresa_id?: string }
type GrupoPreco = { id: number; nome: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

import { LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase } from "lucide-react"

const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  { nome: "Orçamentos", rota: "/orcamentos", icone: FileText, submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" }, { nome: "Vidros PDF", rota: "/calculovidroPDF" },] },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]
const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

// --- UTILS ---
const padronizarNome = (texto: string) => { if (!texto) return ""; return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, letra => letra.toUpperCase()) }
const formatarRota = (v: string) => { if (!v) return ""; const limpo = v.trim(); if (/^\d+$/.test(limpo)) return `${limpo}MM`; return padronizarNome(limpo) }
function formatarTelefoneRaw(valor: string) { const nums = valor.replace(/\D/g, ""); if (!nums) return ""; const pattern = nums.length <= 10 ? /^(\d{0,2})(\d{0,4})(\d{0,4}).*/ : /^(\d{0,2})(\d{0,5})(\d{0,4}).*/; return nums.replace(pattern, (_, g1, g2, g3) => { let s = ""; if (g1) s += "(" + g1 + ")"; if (g2) s += " " + g2; if (g3) s += "-" + g3; return s }).replace(/-$/, "") }
function telefoneConsiderarVazio(t?: string | null) { if (!t) return true; const nums = t.replace(/\D/g, ""); return nums.length === 0 || /^0+$/.test(nums) }

// --- COMPONENTE ---
export default function ClientesPage() {
  const router = useRouter()

  // --- Autenticação ---
  const { user, perfilUsuario, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth();

  // --- Estados de UI ---
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- Estados de Branding ---
  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");
  const [darkPrimary, setDarkPrimary] = useState("#1C415B");
  const [darkSecondary, setDarkSecondary] = useState("#FFFFFF");
  const [darkTertiary, setDarkTertiary] = useState("#39B89F");
  const [darkHover, setDarkHover] = useState("#39B89F");
  const [lightPrimary, setLightPrimary] = useState("#F4F7FA");
  const [lightSecondary, setLightSecondary] = useState("#FFFFFF");
  const [lightTertiary, setLightTertiary] = useState("#1C415B");

  // --- Estados da Lógica de Negócio ---
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [grupos, setGrupos] = useState<GrupoPreco[]>([])
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, "id">>({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null })
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  // --- Estados de Filtro ---
  const [buscaNome, setBuscaNome] = useState("")
  const [filtroRota, setFiltroRota] = useState("")
  const [filtroCidade, setFiltroCidade] = useState("")

  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)

  // --- Efeitos ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) { setShowUserMenu(false); } };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // --- Carregar Branding ---
  useEffect(() => {
    const carregarBranding = async () => {
      if (!empresaId) return;
      const { data: brandingData } = await supabase.from("configuracoes_branding").select("*").eq("empresa_id", empresaId).single();
      if (brandingData) { 
        setLogoDark(brandingData.logo_dark || "/glasscode2.png"); 
        setDarkPrimary(brandingData.dark_primary); 
        setDarkSecondary(brandingData.dark_secondary); 
        setDarkTertiary(brandingData.dark_tertiary); 
        setDarkHover(brandingData.dark_hover); 
        setLightPrimary(brandingData.light_primary); 
        setLightSecondary(brandingData.light_secondary); 
        setLightTertiary(brandingData.light_tertiary); 
      }
    }
    carregarBranding();
  }, [empresaId]);

  // --- Funções de Dados ---
  const carregarDados = useCallback(async () => {
    if (!user) return;
    setCarregando(true);

    // 🔥 CORREÇÃO: Query ajustada para uuid e tabela grupos_preco
    const [{ data: dataClientes, error: errorClientes }, { data: dataGrupos, error: errorGrupos }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome", { ascending: true }),
      supabase.from("grupos_preco").select("*").order("nome", { ascending: true })
    ])
    
    if (errorClientes) console.error("Erro Clientes:", errorClientes); else setClientes((dataClientes as Cliente[]) || [])
    if (errorGrupos) console.error("Erro Grupos:", errorGrupos); else setGrupos((dataGrupos as GrupoPreco[]) || [])
    setCarregando(false);
  }, [user]);

  // --- Efeito carregar dados ---
  useEffect(() => {
    if (user) carregarDados();
  }, [user, carregarDados]);

  function handleTelefoneChange(v: string) { setNovoCliente(prev => ({ ...prev, telefone: formatarTelefoneRaw(v) })) }
  
  function montarPayload() { 
    const payload: any = { 
      nome: padronizarNome(novoCliente.nome), 
      rota: formatarRota(novoCliente.rota), 
      grupo_preco_id: novoCliente.grupo_preco_id,
      // Se houver coluna empresa_id na tabela clientes, descomente abaixo:
      // empresa_id: empresaId 
    }; 
    if (!telefoneConsiderarVazio(novoCliente.telefone)) payload.telefone = novoCliente.telefone!.trim(); 
    if (novoCliente.cidade?.trim()) payload.cidade = padronizarNome(novoCliente.cidade); 
    return payload 
  }

  const salvarCliente = async () => {
    if (!novoCliente.nome?.trim() || !novoCliente.rota?.trim()) { setModalAviso({ titulo: "Atenção", mensagem: "Nome e Rota são obrigatórios." }); return }
    const payload = montarPayload()
    setCarregando(true)
    try {
      if (editando) { 
        const { error } = await supabase.from("clientes").update(payload).eq("id", editando.id); 
        if (error) throw error; 
      }
      else { 
        const { error } = await supabase.from("clientes").insert([payload]); 
        if (error) throw error; 
      }
      await carregarDados(); 
      setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null }); 
      setEditando(null); 
      setMostrarModal(false);
    } catch (e: any) { setModalAviso({ titulo: "Erro", mensagem: "Erro ao processar: " + e.message }) } finally { setCarregando(false) }
  }

  const deletarCliente = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão", mensagem: "Tem certeza que deseja excluir este cliente?", confirmar: async () => {
        const { error } = await supabase.from("clientes").delete().eq("id", id)
        if (error) setModalAviso({ titulo: "Erro", mensagem: "Erro ao excluir: " + error.message }); else { setClientes(prev => prev.filter(c => c.id !== id)); setModalAviso(null); }
      }
    })
  }

  const abrirModalParaEdicao = (cliente: Cliente) => { setEditando(cliente); setNovoCliente(cliente); setMostrarModal(true); }
  const abrirModalParaNovo = () => { setEditando(null); setNovoCliente({ nome: "", telefone: "", cidade: "", rota: "", grupo_preco_id: null }); setMostrarModal(true); }

  // --- Lógica de Filtros ---
  const clientesFiltrados = clientes.filter(c =>
    (buscaNome ? c.nome.toLowerCase().includes(buscaNome.toLowerCase()) : true) &&
    (filtroRota ? c.rota === filtroRota : true) &&
    (filtroCidade ? (c.cidade ?? "") === filtroCidade : true)
  )

  const rotasUnicas = Array.from(new Set(clientes.map(c => c.rota).filter(Boolean))).sort()
  const cidadesUnicas = Array.from(new Set(clientes.map(c => c.cidade || "").filter(Boolean))).sort()

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  // --- Renderização do Menu ---
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    return (
      <div key={item.nome} className="group mb-1">
        <div
          onClick={() => { router.push(item.rota); setShowMobileMenu(false); }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{ color: darkSecondary }} 
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${darkHover}33`; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: darkTertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
          {item.submenu && <ChevronRight className="w-4 h-4" style={{ color: darkSecondary, opacity: 0.7 }} />}
        </div>
      </div>
    )
  }

  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: darkPrimary, borderTopColor: 'transparent' }}></div></div>;

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: lightPrimary }}>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"> <X size={24} /> </button>
        <div className="px-3 py-4 mb-4 flex justify-center"> <Image src={logoDark || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" /> </div>
        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Principal</p> {menuPrincipal.map(renderMenuItem)} </div>
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Cadastros</p> {menuCadastros.map(renderMenuItem)} </div>
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">

        {/* TOPBAR - PADRONIZADO CONFORME IMAGEM */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: lightSecondary }}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100"> <Menu size={24} className="text-gray-600" /> </button>
            <div className="flex items-center gap-4 bg-gray-100 px-3 py-2 rounded-full w-full md:w-96 border border-gray-200 focus-within:ring-2" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties}>
              <Search className="text-gray-400" size={18} />
              <input
                type="search"
                placeholder="Buscar por nome..."
                value={buscaNome}
                onChange={e => setBuscaNome(e.target.value)}
                className="w-full text-sm bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600"> <Building2 size={16} /> </div>
                {/* Título do Botão */}
                <span className="text-sm font-medium text-gray-700 hidden md:block"> {nomeEmpresa || "Empresa"} </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 mb-2">
                    <p className="text-xs text-gray-400">Logado como</p>
                    {/* Apenas Email aqui */}
                    <p className="text-sm font-semibold text-gray-800 truncate"> {user?.email} </p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"> <Settings size={18} className="text-gray-400" />Configurações </button>
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"> <LogOut size={18} />Sair </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}> <UsersRound size={28} /> </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black" style={{ color: lightTertiary }}>Clientes</h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie seu cadastro de clientes e rotas.</p>
              </div>
            </div>
          </div>

          {/* CARDS INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { titulo: "Total", valor: clientes.length, icone: Users },
              { titulo: "Com Telefone", valor: clientes.filter(c => !telefoneConsiderarVazio(c.telefone)).length, icone: Phone },
              { titulo: "Com Cidade", valor: clientes.filter(c => c.cidade?.trim()).length, icone: MapPin },
              { titulo: "Rotas Distintas", valor: rotasUnicas.length, icone: Map }
            ].map(card => (
              <div key={card.titulo} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E BOTAO NOVO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-3">
              <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1" style={{ borderColor: darkTertiary }}>
                <option value="">Todas as rotas</option>
                {rotasUnicas.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1" style={{ borderColor: darkTertiary }}>
                <option value="">Todas as cidades</option>
                {cidadesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => { setBuscaNome(""); setFiltroRota(""); setFiltroCidade("") }} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"> Limpar </button>
            </div>
            <button onClick={abrirModalParaNovo} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm hover:opacity-90 transition" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
              <PlusCircle size={20} /> Novo Cliente
            </button>
          </div>

          {/* TABELA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Cidade</th>
                  <th className="p-4 font-semibold">Rota</th>
                  <th className="p-4 font-semibold">Grupo</th>
                  <th className="p-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientesFiltrados.map(cliente => (
                  <tr key={cliente.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{cliente.nome}</td>
                    <td className="p-4 text-gray-600">{cliente.cidade ?? "-"}</td>
                    <td className="p-4 text-gray-600 font-mono text-xs bg-gray-50 rounded-lg">{cliente.rota}</td>
                    <td className="p-4 text-gray-600 text-sm"> {grupos.find(g => g.id === cliente.grupo_preco_id)?.nome || "Padrão"} </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirModalParaEdicao(cliente)} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }} title="Editar"> <Edit2 size={18} /> </button>
                        <button onClick={() => deletarCliente(cliente.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50" title="Deletar"> <Trash2 size={18} /> </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* BOTÃO VOLTAR AO TOPO */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-50 transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: darkTertiary, color: darkPrimary }}
          title="Voltar ao topo"
        >
          <ChevronDown size={24} className="rotate-180" />
        </button>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold" style={{ color: darkPrimary }}>{editando ? "Editar Cliente" : "Cadastrar Cliente"}</h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nome do Cliente *</label>
                <input type="text" placeholder="Ex: João Silva" value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Telefone</label>
                <input type="text" placeholder="(00) 00000-0000" value={novoCliente.telefone ?? ""} onChange={e => handleTelefoneChange(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Cidade</label>
                <input type="text" placeholder="Ex: Cidade" value={novoCliente.cidade ?? ""} onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Rota *</label>
                <input type="text" placeholder="Ex: Rota A" value={novoCliente.rota} onChange={e => setNovoCliente({ ...novoCliente, rota: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Grupo de Preço</label>
                <select value={novoCliente.grupo_preco_id || ""} onChange={e => setNovoCliente({ ...novoCliente, grupo_preco_id: e.target.value ? Number(e.target.value) : null })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none bg-white" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}>
                  <option value="">Grupo Padrão</option>
                  {grupos.map(g => (<option key={g.id} value={g.id}>{g.nome}</option>))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button onClick={() => setMostrarModal(false)} className="px-6 py-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</button>
              <button onClick={salvarCliente} disabled={carregando} className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: darkPrimary }}>
                {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO */}
      {modalAviso && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">
            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-3"> <Trash2 className="text-red-500" /> {modalAviso.titulo} </h2>
            <p className="text-gray-600 mb-8 text-sm">{modalAviso.mensagem}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalAviso(null)} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
              {modalAviso.confirmar && (<button onClick={modalAviso.confirmar} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Sim, excluir</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}