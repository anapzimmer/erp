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
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"

// --- TIPAGENS ---
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

interface Servico {
  id: number;
  nome: string;
  unidade: 'm²' | 'unitário' | 'metro_linear';
  preco: number;
  empresa_id: string;
}

export default function ServicosPage() {
  const router = useRouter()

  // --- ESTADOS UI/BRANDING (DINÂMICOS) ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // ESTADOS DE BRANDING (Iniciam com padrão e mudam depois)
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [logoUrl, setLogoUrl] = useState("/glasscode2.png");
  const [theme, setTheme] = useState({
    primary: "#1C415B",
    secondary: "#FFFFFF",
    tertiary: "#39B89F",
    hover: "#39B89F",
    bgLight: "#F4F7FA"
  });

  // --- ESTADOS LÓGICA ---
  const [servicos, setServicos] = useState<Servico[]>([])
  const [novoServico, setNovoServico] = useState<Omit<Servico, "id">>({
    nome: "",
    unidade: "m²",
    preco: 0,
    empresa_id: ""
  });
  const [editando, setEditando] = useState<Servico | null>(null)
  const [carregando, setCarregando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroNome, setFiltroNome] = useState("")
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)

  // --- EFEITOS (ESTRUTURA CORRIGIDA E SIMILAR A CLIENTES) ---
  useEffect(() => {
    const init = async () => {
      // 1. Inicia o bloco try para buscar dados da empresa
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(userData.user.email ?? null);

        // Busca o ID da empresa vinculado ao usuário
        const { data: perfil, error: perfilError } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (perfilError || !perfil?.empresa_id) {
          console.error("Erro ao buscar empresa do usuário:", perfilError);
          // Não fazemos return aqui para garantir que o finally execute e pare o loading
        } else {
          setEmpresaIdUsuario(perfil.empresa_id);

          // Busca o nome e logo na tabela 'empresas'
   const { data: emp, error: empError } = await supabase
  .from("empresas")
  .select("nome") // BUSQUE APENAS O NOME AQUI
  .eq("id", perfil.empresa_id)
  .single();

if (emp) setNomeEmpresa(emp.nome);

// 2. BUSQUE A LOGO NA TABELA DE BRANDING
const { data: branding, error: brandingError } = await supabase
  .from("configuracoes_branding") // --- TABELA CORRETA ---
  .select("*")
  .eq("empresa_id", perfil.empresa_id)
  .single();

if (branding) {
  // --- USE A COLUNA logo_light DA TABELA DE BRANDING ---
  if (branding.logo_dark) {
    setLogoUrl(branding.logo_dark);
  } else {
    setLogoUrl("/glasscode2.png");
  }

  // --- ATUALIZE O TEMA COM O RESTO DOS DADOS ---
  setTheme({
    primary: branding.menu_background_color || "#1C415B",
    secondary: "#FFFFFF",
    tertiary: branding.menu_icon_color || "#39B89F",
    hover: branding.menu_hover_color || "#39B89F",
    bgLight: branding.screen_background_color || "#F4F7FA"
  });
}
          // Carrega os serviços da empresa
          await carregarDados(perfil.empresa_id);
        }
      } catch (error) {
        // 2. Bloco catch captura erros técnicos
        console.error("Erro fatal na inicialização:", error);
      } finally {
        // 3. Bloco finally executa sempre, finalizando o loading
        setCheckingAuth(false);
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const carregarDados = async (empresaId: string) => {
    setCarregando(true);
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
    if (!novoServico.nome.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "Informe o nome do serviço." });
      return;
    }

    if (!empresaIdUsuario) {
      setModalAviso({ titulo: "Erro", mensagem: "Empresa não identificada para salvar." });
      return;
    }

    setCarregando(true);

    const dadosParaSalvar = {
      ...novoServico,
      empresa_id: empresaIdUsuario
    };

    try {
      if (editando) {
        const { error } = await supabase.from("servicos").update(dadosParaSalvar).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("servicos").insert([dadosParaSalvar]);
        if (error) throw error;
      }

      await carregarDados(empresaIdUsuario);
      setMostrarModal(false);
      setEditando(null);
    } catch (error: any) {
      setModalAviso({ titulo: "Erro", mensagem: error?.message || "Falha ao salvar serviço." });
    } finally {
      setCarregando(false);
    }
  };

  const deletarServico = async (id: number) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir este serviço?",
      confirmar: async () => {
        const { error } = await supabase.from("servicos").delete().eq("id", id);
        if (error) {
          setModalAviso({ titulo: "Erro", mensagem: error.message });
          return;
        }
        setServicos(prev => prev.filter(s => s.id !== id));
      }
    });
  };

  if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderTopColor: 'transparent', borderRightColor: theme.primary, borderBottomColor: theme.primary, borderLeftColor: theme.primary }}></div></div>;

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const temSubmenu = !!item.submenu;
    return (
      <div key={item.nome} className="mb-1">
        <div onClick={() => { if (!temSubmenu) { router.push(item.rota); setShowMobileMenu(false); } }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
          style={{ color: theme.secondary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.hover}33`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.tertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
        </div>
        {temSubmenu && (
          <div className="ml-8 mt-1 space-y-1">
            {item.submenu!.map((sub) => (
              <div key={sub.nome} onClick={() => { router.push(sub.rota); setShowMobileMenu(false); }}
                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                style={{ color: theme.secondary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.hover}33`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >{sub.nome}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const servicosFiltrados = servicos.filter(s =>
    s.nome.toLowerCase().includes(filtroNome.toLowerCase())
  );

  return (
    <div className="cadastros-layout flex min-h-screen" style={{ backgroundColor: theme.bgLight }}>
      {/* SIDEBAR (USANDO TEMA) */}
   <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
       nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido} 
        setExpandido={setSidebarExpandido}
      />

      <div className="flex-1 flex flex-col w-full min-w-0">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail || ""}
          handleSignOut={handleLogout}
        />

        <main className="cad-main-panel flex-1 min-w-0 p-4 md:p-8 xl:p-10">
          <section className="mb-10 rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${theme.tertiary}15`, color: theme.tertiary }}>
                  <Briefcase size={23} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: theme.primary }}>Catálogo de serviços</h1>
                  <p className="mt-1 text-sm font-normal text-gray-500">Gerencie serviços, unidades e preços.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-3 md:grid-cols-4">
            {[
              { label: "Total", value: servicos.length, icon: Layers },
              { label: "M²", value: servicos.filter(s => s.unidade === "m²").length, icon: Square },
              { label: "Unitário", value: servicos.filter(s => s.unidade === "unitário").length, icon: Package },
              { label: "Metro linear", value: servicos.filter(s => s.unidade === "metro_linear").length, icon: Wrench },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${theme.tertiary}12`, color: theme.tertiary }}>
                    <item.icon size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-normal text-gray-400">{item.label}</p>
                    <p className="text-xl font-semibold" style={{ color: theme.primary }}>{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none transition focus:bg-white focus:ring-2"
                  style={{ "--tw-ring-color": `${theme.tertiary}25` } as any}
                />
              </div>

              <button
                onClick={() => {
                  setEditando(null);
                  setNovoServico({
                    nome: "",
                    unidade: "m²",
                    preco: 0,
                    empresa_id: empresaIdUsuario || ""
                  });
                  setMostrarModal(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: theme.tertiary, color: theme.primary }}
              >
                <PlusCircle size={17} /> Novo serviço
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-normal text-gray-700">Serviços cadastrados</h2>
                <p className="mt-0.5 text-xs text-gray-400">Exibindo {servicosFiltrados.length} de {servicos.length} serviços</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3.5 font-normal">Serviço</th>
                    <th className="px-4 py-3.5 font-normal">Unidade</th>
                    <th className="px-4 py-3.5 font-normal">Preço base</th>
                    <th className="px-4 py-3.5 text-center font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {servicosFiltrados.map(s => (
                    <tr key={s.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-4 py-3.5 text-gray-700">{s.nome}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full border px-2.5 py-1 text-[11px] font-normal"
                          style={{ color: theme.tertiary, borderColor: `${theme.tertiary}33`, backgroundColor: `${theme.tertiary}10` }}>
                          {s.unidade}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{formatarPreco(s.preco)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditando(s); setNovoServico(s); setMostrarModal(true); }} className="rounded-xl p-2.5 transition hover:bg-gray-100" style={{ color: theme.primary }}><Edit2 size={17} /></button>
                          <button onClick={() => deletarServico(s.id)} className="rounded-xl p-2.5 text-red-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editando ? "Editar" : "Novo"} Serviço</h2>
                <div className="mt-2 h-0.5 w-8 rounded-full bg-slate-200" />
              </div>
              <button onClick={() => setMostrarModal(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600" title="Fechar">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <input type="text" placeholder="Nome do Serviço" value={novoServico.nome} onChange={e => setNovoServico({ ...novoServico, nome: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:ring-2" style={{ "--tw-ring-color": theme.tertiary } as any} />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={novoServico.unidade}
                  onChange={e => setNovoServico({
                    ...novoServico,
                    unidade: e.target.value as Servico["unidade"]
                  })}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.tertiary } as any}
                >
                  <option value="m²">m²</option>
                  <option value="unitário">unitário</option>
                  <option value="metro_linear">metro_linear</option>
                </select>
                <input
                  type="number"
                  placeholder="Preço"
                  value={novoServico.preco === 0 ? "" : novoServico.preco}
                  onChange={e => setNovoServico({
                    ...novoServico,
                    preco: parseFloat(e.target.value) || 0
                  })}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.tertiary } as any}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setMostrarModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50">Cancelar</button>
                <button onClick={salvarServico} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:brightness-95" style={{ backgroundColor: theme.tertiary, color: theme.primary }}>
                  {carregando ? <Loader2 className="animate-spin" size={20} /> : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: "#FFFFFF",
          text: theme.primary,
          primaryButtonBg: theme.primary,
          primaryButtonText: theme.secondary,
        }}
      />
    </div>
  )
}

