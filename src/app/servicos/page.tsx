"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import {
  LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Wrench, Printer,
  Boxes, Briefcase, UsersRound, Layers, Package, Trash2, Edit2,
  PlusCircle, X, Building2, ChevronDown, Menu, Search, Loader2, Square
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

// --- TIPAGENS ---
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

interface Servico {
  id: number;
  nome: string;
  unidade: 'm²' | 'unitário' | 'metro_linear';
  preco: number; // No banco é obrigatório, mas no estado podemos tratar
  empresa_id: string;
}

// --- CONSTANTES DE MENU (IDÊNTICO AO SEU) ---
const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos", rota: "/orcamentos", icone: FileText,
    submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" }, { nome: "Vidros PDF", rota: "/calculovidroPDF" }]
  },
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

const padronizarTexto = (texto: string) => {
  if (!texto) return "";
  return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};

export default function ServicosPage() {
  const router = useRouter()

  // --- ESTADOS UI/BRANDING (PADRÃO FERRAGENS) ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");

  const darkPrimary = "#1C415B";
  const darkSecondary = "#FFFFFF";
  const darkTertiary = "#39B89F";
  const darkHover = "#39B89F";
  const lightPrimary = "#F4F7FA";
  const lightTertiary = "#1C415B";
  const lightSecondary = "#FFFFFF";

  // --- ESTADOS LÓGICA ---
  const [servicos, setServicos] = useState<Servico[]>([])
  const [novoServico, setNovoServico] = useState<Omit<Servico, "id">>({
    nome: "",
    unidade: "m²", // Valor padrão já dentro das opções
    preco: 0,      // Inicialize com 0 em vez de null
    empresa_id: ""
  });
  const [editando, setEditando] = useState<Servico | null>(null)
  const [carregando, setCarregando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroNome, setFiltroNome] = useState("")

  // --- EFEITOS (IDÊNTICO AO SEU) ---
  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }
      setUsuarioEmail(userData.user.email ?? null);

      // Busca o ID da empresa vinculado ao usuário
      const { data: perfil } = await supabase
        .from("perfis_usuarios")
        .select("empresa_id")
        .eq("id", userData.user.id)
        .single();

      if (perfil) {
        setEmpresaIdUsuario(perfil.empresa_id);
        const { data: emp } = await supabase.from("empresas").select("nome").eq("id", perfil.empresa_id).single();
        if (emp) setNomeEmpresa(emp.nome);
        await carregarDados(perfil.empresa_id);
      }
      setCheckingAuth(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const carregarDados = async (empresaId: string) => {
    setCarregando(true);
    // FILTRO CRUCIAL: .eq("empresa_id", empresaId)
    const { data } = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (data) setServicos(data);
    setCarregando(false);
  };

  // --- FUNÇÕES DE NEGÓCIO ---
  const salvarServico = async () => {
    if (!novoServico.nome.trim() || !empresaIdUsuario) return;
    setCarregando(true);

    const dadosParaSalvar = {
      ...novoServico,
      empresa_id: empresaIdUsuario // Garante que salva para a empresa certa
    };

    if (editando) {
      await supabase.from("servicos").update(dadosParaSalvar).eq("id", editando.id);
    } else {
      await supabase.from("servicos").insert([dadosParaSalvar]);
    }

    await carregarDados(empresaIdUsuario);
    setMostrarModal(false);
    setEditando(null);
    setCarregando(false);
  };

  const deletarServico = async (id: number) => {
    if (!confirm("Excluir este serviço?")) return;
    await supabase.from("servicos").delete().eq("id", id);
    setServicos(prev => prev.filter(s => s.id !== id));
  };

  if (checkingAuth) return null;

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const temSubmenu = !!item.submenu;
    return (
      <div key={item.nome} className="mb-1">
        <div onClick={() => { if (!temSubmenu) { router.push(item.rota); setShowMobileMenu(false); } }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
          style={{ color: darkSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${darkHover}33`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: darkTertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
        </div>
        {temSubmenu && (
          <div className="ml-8 mt-1 space-y-1">
            {item.submenu!.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                style={{ color: darkSecondary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${darkHover}33`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >{sub.nome}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderColor: darkPrimary, borderTopColor: 'transparent' }}></div></div>;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: lightPrimary }}>
      {/* SIDEBAR (ESTILO FERRAGENS) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"> <X size={24} /> </button>
        <div className="px-3 py-4 mb-4 flex justify-center"> <Image src="/glasscode2.png" alt="Logo" width={200} height={56} className="h-12 md:h-14 object-contain" /> </div>
        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Principal</p> {menuPrincipal.map(renderMenuItem)} </div>
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Cadastros</p> {menuCadastros.map(renderMenuItem)} </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* HEADER IDÊNTICO AO SOLICITADO */}
        <header
          className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm no-print"
          style={{ backgroundColor: lightSecondary }}
        >
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  <Building2 size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{usuarioEmail}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                    <Wrench size={18} className="text-gray-400" /> Configurações
                  </button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <X size={18} className="text-red-500" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1">
          {/* HEADER DA SEÇÃO */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl" style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}>
                <Briefcase size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: darkPrimary }}>Serviços</h1>
                <p className="text-gray-500 text-sm font-medium">Gerencie mão de obra e instalação.</p>
              </div>
            </div>
          </div>

          {/* INDICADORES (ESTILO CARDS FERRAGENS) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <Layers className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</h3>
              <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{servicos.length}</p>
            </div>
          </div>

          {/* FILTROS E AÇÃO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar serviço..."
                value={filtroNome}
                onChange={e => setFiltroNome(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all"
                style={{ "--tw-ring-color": darkTertiary } as any}
              />
            </div>

            <button
              onClick={() => {
                setEditando(null);
                setNovoServico({
                  nome: "",
                  unidade: "m²",
                  preco: 0, // <--- Aqui usamos o valor 0 em vez da palavra 'number'
                  empresa_id: empresaIdUsuario || ""
                });
                setMostrarModal(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: darkTertiary, color: darkPrimary }}
            >
              <PlusCircle size={18} /> Novo Serviço
            </button>
          </div>

          {/* TABELA */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 uppercase tracking-widest text-xs">Serviço</th>
                  <th className="p-4 uppercase tracking-widest text-xs">Unidade</th>
                  <th className="p-4 uppercase tracking-widest text-xs">Preço</th>
                  <th className="p-4 uppercase tracking-widest text-xs text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servicos.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 font-medium">{s.nome}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                        style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                        {s.unidade}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>{formatarPreco(s.preco)}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditando(s); setNovoServico(s); setMostrarModal(true); }} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                        <button onClick={() => deletarServico(s.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL PADRONIZADO (REMOVENDO ERROS DE TYPESCRIPT) */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-black mb-6" style={{ color: darkPrimary }}>{editando ? "Editar" : "Novo"} Serviço</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nome do Serviço" value={novoServico.nome} onChange={e => setNovoServico({ ...novoServico, nome: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as any} />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={novoServico.unidade}
                  onChange={e => setNovoServico({
                    ...novoServico,
                    // O 'as any' ou 'as Servico["unidade"]' resolve o erro de string
                    unidade: e.target.value as Servico["unidade"]
                  })}
                  className="p-3 rounded-xl border border-gray-200 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as any}
                >
                  <option value="m²">m²</option>
                  <option value="unitário">unitário</option>
                  <option value="metro_linear">metro_linear</option>
                </select>
                <input
                  type="number"
                  placeholder="Preço"
                  value={novoServico.preco === 0 ? "" : novoServico.preco} // Melhora a UX: mostra vazio se for 0
                  onChange={e => setNovoServico({
                    ...novoServico,
                    preco: parseFloat(e.target.value) || 0 // Se apagar tudo, assume 0 para não ser null
                  })}
                  className="p-3 rounded-xl border border-gray-200 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": darkTertiary } as any}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl">Cancelar</button>
                <button onClick={salvarServico} className="flex-1 py-3 font-bold text-white rounded-xl flex justify-center items-center gap-2" style={{ backgroundColor: darkTertiary }}>
                  {carregando ? <Loader2 className="animate-spin" size={20} /> : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}