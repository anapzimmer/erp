//app/perfis/page.tsx
"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { LayoutDashboard, Printer, FileText, Image as ImageIcon, BarChart3, Wrench, Boxes, Briefcase, UsersRound, Layers, Palette, Package, Copy, ChevronDown, Download, Upload, Trash2, Edit2, PlusCircle, X, Loader2, Building2, LogOut, Settings, Menu, ChevronRight, Square, Search, DollarSign, ArrowUp, CheckCircle2, CheckSquare2, ListChecks, Eraser, Tag } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pdf } from '@react-pdf/renderer';
import { PerfisPDF } from '@/app/relatorios/perfis/PerfisPDF';
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import ImportarTabelaPerfisModal from "@/components/ImportarTabelaPerfisModal"

// --- 1. 🔥 TIPAGENS (Corrigindo o erro de "Perfil" e "MenuItem") ---
type Perfil = { id: string; codigo: string; nome: string; cores: string; preco: number | null; categoria: string; empresa_id?: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }


// --- Utils ---
const padronizarTexto = (texto: string) => {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};

export default function PerfisPage() {
  const router = useRouter()

  // --- Estados de UI e Branding ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);
const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");

  // --- Estados de Cores e Logo (Conectados ao Supabase) ---
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [darkPrimary, setDarkPrimary] = useState("#1C415B");
  const [darkSecondary, setDarkSecondary] = useState("#FFFFFF");
  const [darkTertiary, setDarkTertiary] = useState("#39B89F");
  const [darkHover, setDarkHover] = useState("#39B89F");
  const [lightPrimary, setLightPrimary] = useState("#F4F7FA");
  const [lightSecondary, setLightSecondary] = useState("#FFFFFF");
  const [lightTertiary, setLightTertiary] = useState("#1C415B");

  // --- Estados da Lógica de Negócio ---
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [novoPerfil, setNovoPerfil] = useState<Omit<Perfil, "id">>({ codigo: "", nome: "", cores: "", preco: null, categoria: "" })
  const [editando, setEditando] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarImportador, setMostrarImportador] = useState(false)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [dadosEmpresa, setDadosEmpresa] = useState<any>(null);
  const [perfisSelecionados, setPerfisSelecionados] = useState<Set<string>>(new Set())

  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [branding, setBranding] = useState<any>(null);

  // --- Efeitos de Inicialização e Auth ---
  useEffect(() => {
    const init = async () => {
      try {
        // 🔥 LIMPEZA: Evita que a logo da empresa anterior apareça enquanto a nova carrega
        setLogoDark(null);
        setLogoLight(null);
        setNomeEmpresa("");

        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          router.push("/login");
          return;
        }

        setUsuarioEmail(userData.user.email ?? null);

        const { data: relData, error: relError } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (relError || !relData) {
          return;
        }

        const empresaId = relData.empresa_id;
        setEmpresaIdUsuario(empresaId);

        // 🔥 BUSCA CONECTADA À TABELA configuracoes_branding
        // Buscamos o nome da empresa e as configurações visuais em paralelo
        const [resEmpresa, resBranding] = await Promise.all([
          supabase.from("empresas").select("nome").eq("id", empresaId).single(),
          supabase.from("configuracoes_branding").select("*").eq("empresa_id", empresaId).single()
        ]);

        if (!resEmpresa.error && resEmpresa.data) {
          setNomeEmpresa(resEmpresa.data.nome);
        }

        if (!resBranding.error && resBranding.data) {
          const b = resBranding.data;

          // 🔥 ARRUADO AQUI: Salve as duas logos separadamente
          // Use b.logo_dark para o que for aparecer na tela (se o fundo for escuro)
          setLogoDark(b.logo_dark);

          // Use b.logo_light para o PDF (que tem fundo branco)
          setLogoLight(b.logo_light);

          // Mapeamento exato das colunas
          setDarkPrimary(b.menu_background_color || "#1C415B");
          setDarkSecondary(b.menu_text_color || "#FFFFFF");
          setDarkTertiary(b.menu_icon_color || "#39B89F");
          setDarkHover(b.menu_hover_color || "#39B89F");
          setLightPrimary(b.screen_background_color || "#F4F7FA");
          setLightSecondary(b.modal_background_color || "#FFFFFF");
          setLightTertiary(b.content_text_light_bg || "#1C415B");
        }

        await carregarDados(empresaId);
      } catch (error) {
        console.error("Erro ao iniciar cadastro de perfis:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: "smooth" }); };

  const carregarDados = async (empresaId: string) => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("codigo", { ascending: true });

    if (!error && data) {
      setPerfis(data);
      setPerfisSelecionados(new Set());
    }
    setCarregando(false);
  };

  // --- Funções de Dados ---
  const eliminarDuplicados = () => {
    setModalAviso({
      titulo: "Eliminar Duplicados",
      mensagem: "Tem certeza que deseja remover perfis que tenham o MESMO CÓDIGO e a MESMA CORx Manteremos apenas o primeiro registro de cada combinação.",
      confirmar: async () => {
        setCarregando(true);
        try {
          const combinacoesExistentes = new Set();
          const idsParaDeletar: string[] = [];

          // Ordena para garantir consistência (ex: pelo ID mais antigo)
          const perfisOrdenados = [...perfis].sort((a, b) => a.id.localeCompare(b.id));

          perfisOrdenados.forEach(perfil => {
            const chave = `${perfil.codigo.trim().toLowerCase()}-${perfil.cores.trim().toLowerCase()}`;

            if (combinacoesExistentes.has(chave)) {
              idsParaDeletar.push(perfil.id);
            } else {
              combinacoesExistentes.add(chave);
            }
          });

          if (idsParaDeletar.length === 0) {
            console.log("Nada para deletar.");
            setModalAviso(null);
            setTimeout(() => {
              setModalAviso({
                titulo: "Aviso",
                mensagem: "Nenhum par CÓDIGO+COR duplicado encontrado para limpar."
              });
            }, 10);

            return;
          }

          const { error } = await supabase
            .from("perfis")
            .delete()
            .in("id", idsParaDeletar);

          if (error) throw error;

          if (empresaIdUsuario) {
            await carregarDados(empresaIdUsuario);
          }

          setModalAviso({ titulo: "Sucesso", mensagem: `${idsParaDeletar.length} itens duplicados removidos.` });
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Erro ao remover duplicados: " + e.message });
        } finally {
          setCarregando(false);
        }
      }
    });
  }
  // --- Funções de Importação/Exportação ---
  const exportarCSV = () => {
    if (perfis.length === 0) { setModalAviso({ titulo: "Aviso", mensagem: "Nenhum perfil para exportar." }); return; }
    const csvContent = "Codigo;Nome;Cores;Preco;Categoria\n"
      + perfis.map(p =>
        `${p.codigo.trim()};${p.nome.trim()};${p.cores.trim()};${p.preco || ""};${p.categoria.trim()}`
      ).join("\n");

    const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "perfis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(encodedUri);
  }

const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !empresaIdUsuario) return;

  setModalCarregando(true);
  try {
      const text = await decodeCsvFile(file);

      // Divide linhas e ignora o cabeçalho
      const rows = text.split(/\rx\n/).filter(row => row.trim().length > 0).slice(1);
      
      let importados = 0;

      for (const row of rows) {
        const columns = row.split(";").map((c) => c.replace(/['"]+/g, "").trim());

        // Mapeamento baseado no arquivo que você enviou:
        // [0] Codigo | [1] Nome | [2] Cores | [3] Preço | [4] Categoria
        const codigoRaw = columns[0] || "";
        const nomeRaw = columns[1] || "";
        const corRaw = columns[2] || "Padrão";
        const precoRaw = columns[3] || "0";
        const categoriaRaw = columns[4] || "Geral";

        if (codigoRaw && nomeRaw) {
          const { error } = await supabase.from("perfis").upsert([{
            codigo: codigoRaw.toUpperCase().trim(),
            nome: padronizarTexto(nomeRaw), // Mantém o nome descritivo (ex: VT64 - CADEIRINHA)
            cores: padronizarTexto(corRaw),
            preco: precoRaw ? Number(precoRaw.replace(",", ".")) : null,
            categoria: padronizarTexto(categoriaRaw),
            empresa_id: empresaIdUsuario
          }], {
            // ESSA LINHA DEVE SER IGUAL À CONSTRAINT QUE VOCÊ CRIOU NO SQL
            onConflict: 'codigo,nome,cores,empresa_id'
          });

          if (!error) {
            importados++;
          } else {
            console.error("Erro no item:", codigoRaw, error.message);
          }
        }
      }

      await carregarDados(empresaIdUsuario);
      setModalCarregando(false);
      setModalAviso({
        titulo: "Importação Concluída",
        mensagem: `✅ ${importados} perfis processados com sucesso.`
      });
    } catch (err) {
      setModalCarregando(false);
      setModalAviso({ titulo: "Erro", mensagem: "Falha ao processar CSV." });
    }
    event.target.value = "";
};
  const [logoLight, setLogoLight] = useState<string | null>(null);

  // Dentro da sua função gerarPDF em page.tsx
  const gerarPDF = async () => {
    if (gerandoPDF) return; // Evita cliques duplos
    setGerandoPDF(true);

    try {
      // Verifique se perfisFiltrados existe e tem dados
      if (perfisFiltrados.length === 0) {
        setModalAviso({ titulo: "Aviso", mensagem: "Não há dados para gerar o PDF." });
        setGerandoPDF(false);
        return;
      }

      const doc = (
        <PerfisPDF
          dados={perfisFiltrados}
          empresa={nomeEmpresa}
          logoUrl={logoLight}
          coresEmpresa={{
            primary: darkPrimary,
            secondary: darkSecondary,
            tertiary: darkTertiary,
            textDefault: lightTertiary
          }}
        />
      );

      // Converte para Blob e faz o download
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalogo_${nomeEmpresa.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Erro detalhado ao gerar PDF:", error);
      setModalAviso({ titulo: "Erro", mensagem: "Falha ao gerar o arquivo PDF." });
    } finally {
      setGerandoPDF(false);
    }
  };

  // --- Funções Lógicas ---
  const salvarPerfil = async () => {
    if (!novoPerfil.codigo.trim() || !novoPerfil.nome.trim()) { setModalAviso({ titulo: "Atenção", mensagem: "Código e Nome são obrigatórios." }); return }

    if (!empresaIdUsuario) {
      setModalAviso({ titulo: "Erro", mensagem: "Usuário não vinculado a uma empresa." });
      return;
    }

    setCarregando(true)
    const perfilFormatado = {
      ...novoPerfil,
      codigo: novoPerfil.codigo.trim(),
      nome: padronizarTexto(novoPerfil.nome),
      cores: padronizarTexto(novoPerfil.cores),
      preco: novoPerfil.preco ? Number(novoPerfil.preco) : null,
      categoria: padronizarTexto(novoPerfil.categoria),
      empresa_id: empresaIdUsuario
    }

    try {
      if (editando) {
        const { error } = await supabase
          .from("perfis")
          .update(perfilFormatado)
          .eq("id", editando.id)
          .eq("empresa_id", empresaIdUsuario)
        if (error) throw error
      } else {
        const { error } = await supabase.from("perfis").insert([perfilFormatado])
        if (error) throw error
      }
      setNovoPerfil({ codigo: "", nome: "", cores: "", preco: null, categoria: "" });
      setEditando(null);
      setMostrarModal(false);
      if (empresaIdUsuario) {
        await carregarDados(empresaIdUsuario);
      }
    } catch (e: any) { setModalAviso({ titulo: "Erro", mensagem: "Erro: " + e.message }) } finally { setCarregando(false) }
  }

  const deletarPerfil = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir este perfilx",
      confirmar: async () => {
        const { error } = await supabase
          .from("perfis")
          .delete()
          .eq("id", id)
          .eq("empresa_id", empresaIdUsuario)
        if (error) {
          setModalAviso({ titulo: "Erro", mensagem: "Erro ao excluir: " + error.message });
        } else {
          setPerfis(prev => prev.filter(p => p.id !== id));
          setModalAviso(null);
        }
      }
    })
  }

  const duplicarPerfil = (perfil: Perfil) => {
    setEditando(null);
    setNovoPerfil({
      codigo: perfil.codigo + " (Cópia)",
      nome: perfil.nome,
      cores: perfil.cores,
      preco: perfil.preco,
      categoria: perfil.categoria
    });
    setMostrarModal(true);
  }

  const abrirModalParaEdicao = (perfil: Perfil) => { setEditando(perfil); setNovoPerfil(perfil); setMostrarModal(true); }
  const abrirModalParaNovo = () => { setEditando(null); setNovoPerfil({ codigo: "", nome: "", cores: "", preco: null, categoria: "" }); setMostrarModal(true); }

  // --- Lógica de Filtros e Métricas ---
  const perfisFiltrados = perfis.filter(p =>
    (filtroNome ? (p.nome || "").toLowerCase().includes(filtroNome.toLowerCase()) || (p.codigo || "").toLowerCase().includes(filtroNome.toLowerCase()) : true) &&
    (filtroCor ? (p.cores || "").toLowerCase().includes(filtroCor.toLowerCase()) : true) &&
    (filtroCategoria ? (p.categoria || "").toLowerCase().includes(filtroCategoria.toLowerCase()) : true)
  )

  const alternarSelecaoPerfil = (id: string) => {
    setPerfisSelecionados((atuais) => {
      const novos = new Set(atuais)
      if (novos.has(id)) {
        novos.delete(id)
      } else {
        novos.add(id)
      }
      return novos
    })
  }

  const todosFiltradosSelecionados =
    perfisFiltrados.length > 0 &&
    perfisFiltrados.every((perfil) => perfisSelecionados.has(perfil.id))

  const alternarSelecaoFiltrados = () => {
    setPerfisSelecionados((atuais) => {
      const novos = new Set(atuais)

      if (todosFiltradosSelecionados) {
        perfisFiltrados.forEach((perfil) => novos.delete(perfil.id))
      } else {
        perfisFiltrados.forEach((perfil) => novos.add(perfil.id))
      }

      return novos
    })
  }

  const excluirPerfisSelecionados = () => {
    const ids = Array.from(perfisSelecionados)

    if (!ids.length) {
      setModalAviso({
        titulo: "Nenhum perfil selecionado",
        mensagem: "Selecione pelo menos um perfil para excluir.",
      })
      return
    }

    setModalAviso({
      titulo: "Excluir perfis selecionados",
      mensagem: `Tem certeza que deseja excluir ${ids.length} ${
        ids.length === 1 ? "perfil" : "perfis"
      }x`,
      confirmar: async () => {
        setCarregando(true)

        try {
          const { error } = await supabase
            .from("perfis")
            .delete()
            .in("id", ids)
            .eq("empresa_id", empresaIdUsuario)

          if (error) throw error

          setPerfis((atuais) =>
            atuais.filter((perfil) => !perfisSelecionados.has(perfil.id)),
          )
          setPerfisSelecionados(new Set())

          setModalAviso({
            titulo: "Exclusão concluída",
            mensagem: `${ids.length} ${
              ids.length === 1 ? "perfil foi excluído" : "perfis foram excluídos"
            } com sucesso.`,
          })
        } catch (e: any) {
          setModalAviso({
            titulo: "Erro",
            mensagem: "Não foi possível excluir os perfis: " + e.message,
          })
        } finally {
          setCarregando(false)
        }
      },
    })
  }

  const limparTodosOsPerfis = () => {
    setModalAviso({
      titulo: "Limpar todo o catálogo",
      mensagem: `Esta ação excluirá permanentemente todos os ${perfis.length} perfis cadastrados. Deseja continuar?`,
      confirmar: async () => {
        if (!empresaIdUsuario) return
        setCarregando(true)

        try {
          const { error } = await supabase
            .from("perfis")
            .delete()
            .eq("empresa_id", empresaIdUsuario)

          if (error) throw error

          setPerfis([])
          setPerfisSelecionados(new Set())
        } catch (e: any) {
          setModalAviso({
            titulo: "Erro",
            mensagem: "Não foi possível limpar o catálogo: " + e.message,
          })
        } finally {
          setCarregando(false)
        }
      },
    })
  }

  const totalPerfis = perfis.length
  const categoriasDistintas = Array.from(new Set(perfis.map(p => p.categoria).filter(Boolean))).length
  const coresDistintas = Array.from(new Set(perfis.map(p => p.cores).filter(Boolean))).length
  const comPreco = perfis.filter(p => p.preco !== null).length

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  // --- Renderização do Menu ---
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone;
    const temSubmenu = !!item.submenu;

    return (
      <div key={item.nome} className="mb-1">
        <div
          onClick={() => {
            if (!temSubmenu) {
              router.push(item.rota);
              setShowMobileMenu(false);
            }
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
          style={{ color: darkSecondary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${darkHover}33`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: darkTertiary }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
        </div>

        {temSubmenu && (
          <div className="ml-8 mt-1 space-y-1">
            {item.submenu!.map((sub) => (
              <div
                key={sub.nome}
                onClick={() => {
                  router.push(sub.rota);
                  setShowMobileMenu(false);
                }}
                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                style={{ color: darkSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${darkHover}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {sub.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: darkPrimary, borderBottomColor: darkPrimary, borderLeftColor: darkPrimary }}></div></div>;

  return (
    <div className="cadastros-layout flex min-h-screen text-gray-900 overflow-x-hidden" style={{ backgroundColor: lightPrimary }}>

      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido} 
        setExpandido={setSidebarExpandido}
      />
      {/* ----------------------------------------------------------- */}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR - Conectada ao modal_background_color (lightSecondary) */}
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail || ""}
          handleSignOut={handleSignOut}
        />

        {/* CORPO DA PÁGINA */}
        <main className="cad-main-panel w-full flex-1 min-w-0 p-4 md:p-6 xl:p-8">
          <section className="mb-6 w-full overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 md:p-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${darkTertiary}12`, color: darkTertiary }}
                >
                  <Square size={23} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <h1
                    className="text-2xl font-semibold tracking-tight md:text-3xl"
                    style={{ color: darkPrimary }}
                  >
                    Catálogo de perfis
                  </h1>
                  <p className="mt-1 text-sm font-normal text-gray-500">
                    Gerencie códigos, cores, categorias e preços dos perfis.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => setMostrarImportador(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                  style={{ backgroundColor: darkTertiary, color: darkPrimary }}
                  title="Importar tabela PDF, TXT ou CSV"
                >
                  <Upload size={17} />
                  Importar tabela
                </button>

                <button
                  onClick={gerarPDF}
                  title="Gerar catálogo em PDF"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                >
                  <Printer size={18} />
                </button>

                <button
                  onClick={exportarCSV}
                  title="Exportar CSV"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                >
                  <Download size={18} />
                </button>

                <label
                  htmlFor="importarCSVPerfis"
                  title="Importar CSV simples"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                >
                  <Upload size={18} />
                  <input
                    type="file"
                    id="importarCSVPerfis"
                    accept=".csv"
                    className="hidden"
                    onChange={importarCSV}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* INDICADORES */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { titulo: "Total", valor: totalPerfis, icone: Layers },
              { titulo: "Com preço", valor: comPreco, icone: DollarSign },
              { titulo: "Cores", valor: coresDistintas, icone: Palette },
              { titulo: "Categorias", valor: categoriasDistintas, icone: Package },
            ].map((card) => (
              <div
                key={card.titulo}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ color: darkTertiary, backgroundColor: `${darkTertiary}10` }}
                >
                  <card.icone size={19} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xs font-normal text-gray-400">{card.titulo}</p>
                  <p className="text-xl font-semibold" style={{ color: darkPrimary }}>
                    {card.valor}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÕES */}
          <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                {[
                  ["Nome, código ou categoria", filtroNome, setFiltroNome],
                  ["Cor", filtroCor, setFiltroCor],
                  ["Categoria", filtroCategoria, setFiltroCategoria],
                ].map(([label, valor, setter]: any) => (
                  <div key={label} className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder={`Buscar por ${String(label).toLowerCase()}...`}
                      value={valor}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none transition focus:bg-white focus:ring-2"
                      style={{ "--tw-ring-color": `${darkTertiary}25` } as React.CSSProperties}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={eliminarDuplicados}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-500 transition hover:bg-gray-50"
                >
                  <Eraser size={16} />
                  Duplicados
                </button>

                <button
                  onClick={limparTodosOsPerfis}
                  className="flex items-center gap-2 rounded-xl border border-red-100 bg-white px-3.5 py-2.5 text-sm font-normal text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Limpar tudo
                </button>

                <button
                  onClick={abrirModalParaNovo}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                  style={{ backgroundColor: darkTertiary, color: darkPrimary }}
                >
                  <PlusCircle size={17} />
                  Novo perfil
                </button>
              </div>
            </div>
          </section>

          {perfisSelecionados.size > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckSquare2 size={18} className="text-red-500" />
                <span>
                  <strong className="font-normal">{perfisSelecionados.size}</strong>{" "}
                  {perfisSelecionados.size === 1 ? "item selecionado" : "itens selecionados"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPerfisSelecionados(new Set())}
                  className="rounded-xl px-3 py-2 text-xs font-normal text-gray-500 transition hover:bg-white"
                >
                  Cancelar seleção
                </button>
                <button
                  onClick={excluirPerfisSelecionados}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-normal text-white transition hover:bg-red-600"
                >
                  <Trash2 size={15} />
                  Excluir selecionados
                </button>
              </div>
            </div>
          )}

          {/* TABELA */}
          <section className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-normal text-gray-700">Perfis cadastrados</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Exibindo {perfisFiltrados.length} de {totalPerfis} produtos
                </p>
              </div>
              <button
                onClick={alternarSelecaoFiltrados}
                disabled={!perfisFiltrados.length}
                className="flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-normal text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
              >
                <ListChecks size={15} />
                {todosFiltradosSelecionados ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
                <tr>
                  <th className="w-14 px-5 py-3.5">
                    <button
                      onClick={alternarSelecaoFiltrados}
                      disabled={!perfisFiltrados.length}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition disabled:opacity-50 ${
                        todosFiltradosSelecionados ? "border-transparent"
                          : "border-gray-300 bg-white"
                      }`}
                      style={todosFiltradosSelecionados ? { backgroundColor: "#16a34a" } : undefined}
                      aria-label="Selecionar todos os perfis visíveis"
                    >
                      {todosFiltradosSelecionados && (
                        <CheckCircle2 size={15} className="text-white" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 font-normal">Código</th>
                  <th className="px-4 py-3.5 font-normal">Nome</th>
                  <th className="px-4 py-3.5 font-normal">Cor</th>
                  <th className="px-4 py-3.5 font-normal">Categoria</th>
                  <th className="px-4 py-3.5 font-normal">Preço</th>
                  <th className="px-5 py-3.5 text-center font-normal">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {perfisFiltrados.map(p => {
                  const selecionado = perfisSelecionados.has(p.id)

                  return (
                    <tr key={p.id} className={`transition-colors ${selecionado ? "bg-emerald-50/40" : "hover:bg-gray-50/70"}`}>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => alternarSelecaoPerfil(p.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            selecionado ? "border-transparent" : "border-gray-300 bg-white"
                          }`}
                          style={selecionado ? { backgroundColor: "#16a34a" } : undefined}
                          aria-label={`Selecionar ${p.nome}`}
                        >
                          {selecionado && (
                            <CheckCircle2 size={15} className="text-white" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-normal">{p.codigo}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-normal"><span style={{ color: lightTertiary }}>{p.nome}</span></td>
                      <td className="px-4 py-3.5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-normal uppercase border"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                          {p.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-normal">{p.categoria || "Geral"}</td>
                      <td className="px-4 py-3.5 text-gray-500 font-normal" style={{ color: darkPrimary }}>{p.preco ? formatarPreco(p.preco) : "-"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalParaEdicao(p)} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                          <button onClick={() => deletarPerfil(p.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </section>
        </main>
      </div>

      {/* MODAIS */}
      <ImportarTabelaPerfisModal
        aberto={mostrarImportador}
        onClose={() => setMostrarImportador(false)}
        empresaId={empresaIdUsuario || ""}
        perfis={perfis}
        onConcluido={async () => {
          if (empresaIdUsuario) await carregarDados(empresaIdUsuario)
        }}
      />

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
          <div
            className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.16)] transition-all"
            style={{ backgroundColor: branding?.modal_background_color || '#FFFFFF' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                  Catálogo de perfis
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  {editando ? "Editar Perfil" : "Cadastrar Perfil"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Informe os dados principais e, se precisar, preços diferentes por tabela.
                </p>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Dados do perfil</h3>
                    <p className="mt-1 text-xs text-slate-500">Use o mesmo código e descrição do fornecedor.</p>
                  </div>
                  <Square size={18} className="text-slate-300" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                  <label className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Código do produto</label>
                  <input
                    type="text"
                    placeholder="E?: VT66"
                    value={novoPerfil.codigo}
                    onChange={e => setNovoPerfil({ ...novoPerfil, codigo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm uppercase text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": branding?.modal_button_background_color || darkTertiary } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Cor</label>
                  <input
                    type="text"
                    placeholder="E?: Alumínio"
                    value={novoPerfil.cores}
                    onChange={e => setNovoPerfil({ ...novoPerfil, cores: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": branding?.modal_button_background_color || darkTertiary } as React.CSSProperties}
                  />
                </div>
                  <div className="sm:col-span-2">
                  <label className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Nome do perfil *</label>
                  <input
                    type="text"
                    placeholder="E?: Trilho superior"
                    value={novoPerfil.nome}
                    onChange={e => setNovoPerfil({ ...novoPerfil, nome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": branding?.modal_button_background_color || darkTertiary } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Categoria</label>
                  <input
                    type="text"
                    placeholder="E?: Trilho"
                    value={novoPerfil.categoria}
                    onChange={e => setNovoPerfil({ ...novoPerfil, categoria: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": branding?.modal_button_background_color || darkTertiary } as React.CSSProperties}
                  />
                </div>

                  <div>
                <label className="mb-1.5 block px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Preço base</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition-all focus-within:border-transparent focus-within:ring-2"
                      style={{ "--tw-ring-color": branding?.modal_button_background_color || darkTertiary } as React.CSSProperties}
                    >
                      <span className="mr-2 text-sm font-semibold text-slate-400">R$</span>
                      <input
                        type="number"
                        placeholder="0,00"
                        value={novoPerfil.preco ?? ""}
                        onChange={e => setNovoPerfil({ ...novoPerfil, preco: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-transparent py-3 text-sm text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>
                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Tabelas de preço</h3>
                      <p className="mt-1 text-xs text-slate-500">Valores específicos por grupo de cliente.</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-600"
                      title="Recurso reservado para preços especiais"
                    >
                      <PlusCircle size={14} />
                      Adicionar
                    </button>
                  </div>
                  <div className="flex min-h-[172px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">
                    <Tag size={22} className="text-slate-300" />
                    <p className="mt-4 text-sm font-medium text-slate-500">Nenhum preço especial cadastrado.</p>
                    <p className="mt-2 max-w-[210px] text-xs leading-relaxed text-slate-400">
                      O sistema usará o preço base para todos os clientes.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button onClick={() => setMostrarModal(false)} className="rounded-2xl bg-slate-100 px-7 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-200">
                Cancelar
              </button>
              <button
                onClick={salvarPerfil}
                disabled={carregando}
                className="rounded-2xl px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: darkTertiary,
                  color: "#FFFFFF"
                }}
              >
                {carregando ? "Processando..." : editando ? "Atualizar" : "Salvar Perfil"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: branding?.modal_background_color || "#FFFFFF",
          text: branding?.modal_text_color || darkPrimary,
          primaryButtonBg: branding?.modal_button_background_color || darkPrimary,
          primaryButtonText: branding?.modal_button_text_color || darkSecondary,
          success: branding?.modal_icon_success_color || "#059669",
          error: branding?.modal_icon_error_color || "#DC2626",
          warning: branding?.modal_icon_warning_color || "#D97706",
        }}
      />
      {/* MODAL DE CARREGAMENTO DA IMPORTAÇÃO */}
      {modalCarregando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-sm flex-col items-center rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="relative mb-4">
              <Loader2 size={34} className="animate-spin" style={{ color: darkTertiary }} />
              <Upload size={15} className="absolute inset-0 m-auto text-slate-400" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-900">Importando dados</h3>
            <p className="text-sm text-slate-500">
              Por favor, não feche a página...
            </p>
          </div>
        </div>
      )}
      {showScrollTop && (
        <button onClick={scrollToTop} className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-50" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  )
}

