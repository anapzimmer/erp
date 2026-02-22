//app/perfis/page.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco" // 🔥 Certifique-se que este arquivo existe
import { LayoutDashboard, Printer, FileText, Image as ImageIcon, BarChart3, Wrench, Boxes, Briefcase, UsersRound, Layers, Palette, Package, Copy, ChevronDown, Download, Upload, Trash2, Edit2, PlusCircle, X, Building2, LogOut, Settings, Menu, ChevronRight, Square, Search, DollarSign, ArrowUp } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pdf } from '@react-pdf/renderer';
import { PerfisPDF } from '@/app/relatorios/perfis/PerfisPDF';

// --- 1. 🔥 TIPAGENS (Corrigindo o erro de "Perfil" e "MenuItem") ---
type Perfil = { id: string; codigo: string; nome: string; cores: string; preco: number | null; categoria: string; empresa_id?: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

// --- 2. 🔥 CONSTANTES DE MENU (Corrigindo erro de "menuPrincipal" e "menuCadastros") ---
const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  {
    nome: "Orçamentos", rota: "/orcamentos", icone: FileText, submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" },
    { nome: "Vidros PDF", rota: "/calculovidroPDF" },]
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

// --- Utils ---
// Função para padronizar o texto (Primeira letra de cada palavra em Maiúscula)
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

  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");
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
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);

  // --- Estados de Filtro ---
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- Efeitos de Inicialização e Auth ---

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUsuarioEmail(userData.user.email ?? null);

      const { data, error } = await supabase
        .from("perfis_usuarios")
        .select("empresa_id")
        .eq("id", userData.user.id)
        .single();

      if (error || !data) {
        console.error("Usuário sem empresa vinculada.");
        setCheckingAuth(false);
        return;
      }

      setEmpresaIdUsuario(data.empresa_id);
      await carregarDados(data.empresa_id);

      // 🔥 Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("nome")
        .eq("id", data.empresa_id)
        .single();

      if (!empresaError && empresaData) {
        setNomeEmpresa(empresaData.nome);
      }

      // Carregar perfis
      await carregarDados(data.empresa_id);

      setCheckingAuth(false);
    };

    init();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Mostra o botão se rolar mais de 300px
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Função de Scroll ---
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Funções de Dados ---
  const carregarDados = async (empresaId: string) => {
    setCarregando(true);

    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("codigo", { ascending: true });

    if (!error && data) {
      setPerfis(data);
    }

    setCarregando(false);
  };

  // --- Funções de Dados ---
  const eliminarDuplicados = () => {
    setModalAviso({
      titulo: "Eliminar Duplicados",
      mensagem: "Tem certeza que deseja remover perfis que tenham o MESMO CÓDIGO e a MESMA COR? Manteremos apenas o primeiro registro de cada combinação.",
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
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Codigo;Nome;Cores;Preco;Categoria\n"
      + perfis.map(p =>
        `${p.codigo.trim()};${p.nome.trim()};${p.cores.trim()};${p.preco || ""};${p.categoria.trim()}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "perfis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaIdUsuario) return;

    setModalCarregando(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const decoder = new TextDecoder("iso-8859-1");
      const text = decoder.decode(e.target?.result as ArrayBuffer);

      const rows = text.split("\n").slice(1);
      let importados = 0;
      let erros = 0;

      // Dicionário de Tradução de Cores
      const tradutorCores: { [key: string]: string } = {
        "PT": "Preto",
        "BC": "Branco",
        "CR": "Cromado",
        "BZ": "Bronze",
        "NF": "Fosco",
        "GO": "Gold" // Adicionado baseada na sua imagem
      };

      for (const row of rows) {
        if (!row.trim()) continue;

        const columns = row.split(";").map((c) => c.replace(/['"]+/g, "").trim());

        let codigoRaw = columns[0] || "";
        let nomeRaw = columns[1] || "";
        let categoriaRaw = columns[2] || "";
        let precoRaw = columns[3] || "";

        let codigoFinal = codigoRaw;
        let nomeFinal = nomeRaw;
        let corFinal = ""; // Começa vazio por padrão
        let categoriaFinal = categoriaRaw || "Geral";

        // --- LÓGICA DE EXTRAÇÃO E TRADUÇÃO DA COR ---
        if (codigoFinal.includes("-")) {
          const partes = codigoFinal.split("-");
          const sigla = partes[partes.length - 1].toUpperCase(); // Pega o final (PT, BC...)

          // Verifica se a sigla existe no nosso tradutor
          if (tradutorCores[sigla]) {
            corFinal = tradutorCores[sigla]; // Traduz (ex: PT vira Preto)
            codigoFinal = partes.slice(0, -1).join("-"); // Remove a sigla do código
          }
        }

        // Limpeza do Nome (remove o que vier após o hífen na descrição)
        if (nomeFinal.includes("-")) {
          nomeFinal = nomeFinal.split("-")[0].trim();
        }

        if (codigoFinal) {
          const preco = precoRaw ? Number(precoRaw.replace(",", ".")) : null;

          const { error } = await supabase.from("perfis").upsert([{
            codigo: codigoFinal.toUpperCase().trim(),
            nome: padronizarTexto(nomeFinal),
            cores: padronizarTexto(corFinal), // Se não traduziu, vai vazio ""
            preco: preco,
            categoria: padronizarTexto(categoriaFinal),
            empresa_id: empresaIdUsuario
          }], {
            onConflict: 'codigo,cores,empresa_id'
          });

          if (error) { erros++; } else { importados++; }
        }
      }

      await carregarDados(empresaIdUsuario);
      setModalCarregando(false);
      setModalAviso({
        titulo: "Importação Concluída",
        mensagem: `✅ ${importados} perfis processados.`
      });
      event.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      // Filtra os dados exatamente como estão na sua tabela agora
      const perfisParaExportar = perfis.filter(p => {
        const termo = filtroNome.toLowerCase();
        const matchesBusca =
          p.nome.toLowerCase().includes(termo) ||
          p.codigo.toLowerCase().includes(termo) ||
          p.categoria.toLowerCase().includes(termo);
        const matchesCor = (p.cores || "").toLowerCase().includes(filtroCor.toLowerCase());
        return matchesBusca && matchesCor;
      });

      // Gera o documento usando o componente visual que criamos
      const doc = <PerfisPDF dados={perfisParaExportar} empresa={nomeEmpresa} />;
      const blob = await pdf(doc).toBlob();

      // Cria o link de download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalogo_perfis_${nomeEmpresa.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      link.click();

      // Limpa a memória
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setModalAviso({ titulo: "Erro", mensagem: "Não foi possível gerar o PDF profissional." });
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
        const { error } = await supabase.from("perfis").update(perfilFormatado).eq("id", editando.id)
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
      mensagem: "Tem certeza que deseja excluir este perfil?",
      confirmar: async () => {
        const { error } = await supabase.from("perfis").delete().eq("id", id)
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
    (filtroNome ? p.nome.toLowerCase().includes(filtroNome.toLowerCase()) : true) &&
    (filtroCor ? p.cores.toLowerCase().includes(filtroCor.toLowerCase()) : true) &&
    (filtroCategoria ? p.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()) : true)
  )

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

        {/* TOPBAR */}
        <header
          className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm"
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

                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  {nomeEmpresa}
                </span>

                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""
                    }`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Logado como</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {usuarioEmail}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/configuracoes");
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"
                  >
                    <Settings size={18} className="text-gray-400" />
                    Configurações
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>


        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}>
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black" style={{ color: lightTertiary }}>Dashboard de Perfis</h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie seu catálogo de perfis e preços.</p>
              </div>
            </div>

            {/* BOTÕES DE AÇÕES SUPERIORES */}
            <div className="flex items-center gap-3 no-print">
              {/* Botão Imprimir PDF */}
              <button
                onClick={gerarPDF}
                title="Gerar Catálogo PDF"
                className="group p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Printer size={20} style={{ color: darkPrimary }} className="group-hover:scale-110 transition-transform" />
              </button>

              {/* Botão Exportar CSV */}
              <button
                onClick={exportarCSV}
                title="Exportar CSV"
                className="group p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Download size={20} className="text-gray-600 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
              </button>

              {/* Botão Importar CSV */}
              <label
                htmlFor="importarCSV"
                title="Importar CSV"
                className="group p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                <Upload size={20} className="text-gray-600 group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
                <input
                  type="file"
                  id="importarCSV"
                  accept=".csv"
                  className="hidden"
                  onChange={importarCSV}
                />
              </label>
            </div>
          </div>

          {/* CARDS INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { titulo: "Total", valor: totalPerfis, icone: Layers },
              { titulo: "Com Preço", valor: comPreco, icone: DollarSign },
              { titulo: "Cores", valor: coresDistintas, icone: Palette },
              { titulo: "Categorias", valor: categoriasDistintas, icone: Package }
            ].map(card => (
              <div key={card.titulo} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E BOTOES DE ACAO INFERIORES */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Nome, código ou categoria..."
                value={filtroNome} // Faltava isso
                onChange={(e) => setFiltroNome(e.target.value)} // E isso
                className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none transition-all focus:border-2"
                onFocus={(e) => e.currentTarget.style.borderColor = darkTertiary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <input type="text" placeholder="Cor..." value={filtroCor} onChange={e => setFiltroCor(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1 focus:outline-none" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              <input type="text" placeholder="Categoria..." value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1 focus:outline-none" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties} />
            </div>

            {/* BOTÕES DE AÇÃO PRINCIPAIS */}
            <div className="flex items-center gap-2">
              <button onClick={eliminarDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition"> <Trash2 size={18} /> Limpar Duplicados
              </button>
              <button
                onClick={abrirModalParaNovo}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition shadow-sm"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }}
              >
                <PlusCircle size={18} /> Novo Perfil
              </button>
            </div>
          </div>

          {/* TABELA ATUALIZADA (PADRÃO FERRAGENS) */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 text-xs uppercase tracking-widest">Código</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Nome</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Cor</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Categoria</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Preço</th>
                  <th className="p-4 text-xs uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perfis
                  .filter(p => {
                    const termo = filtroNome.toLowerCase();
                    const matchesBusca =
                      (p.nome || "").toLowerCase().includes(termo) ||
                      (p.codigo || "").toLowerCase().includes(termo) ||
                      (p.categoria || "").toLowerCase().includes(termo);

                    const matchesCor = (p.cores || "").toLowerCase().includes(filtroCor.toLowerCase());
                    const matchesCategoria = (p.categoria || "").toLowerCase().includes(filtroCategoria.toLowerCase());

                    return matchesBusca && matchesCor && matchesCategoria;
                  })
                  .map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-500 font-medium">{p.codigo}</td>
                      <td className="p-4">
                        <span className="p-4 text-gray-500 font-medium" style={{ color: lightTertiary }}>{p.nome}</span>
                      </td>
                      <td className="p-4">
                        {/* Padronização visual da cor com a cor do sistema (darkTertiary) */}
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                          {p.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-medium">{p.categoria || "Geral"}</td>
                      <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>
                        {p.preco ? formatarPreco(p.preco) : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalParaEdicao(p)} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                          <button onClick={() => deletarPerfil(p.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CARREGANDO (IMPORTAÇÃO) */}
      {modalCarregando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: darkTertiary, borderTopColor: 'transparent' }}></div>
            <p className="text-gray-700 font-semibold">Processando...</p>
            <p className="text-gray-400 text-sm">Não feche esta janela.</p>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO (MINIMALISTA) */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] z-50 animate-fade-in px-4">
          <div className="bg-white rounded-2xl p-7 shadow-xl w-full max-w-lg border border-gray-100">

            {/* Cabeçalho usando darkPrimary */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: darkPrimary }}>
                  {editando ? "Editar Perfil" : "Novo Perfil"}
                </h2>
                {/* Linha de detalhe com darkTertiary */}
                <div className="h-0.5 w-6 mt-1 rounded-full" style={{ backgroundColor: darkTertiary }}></div>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Código</label>
                  <input
                    type="text"
                    value={novoPerfil.codigo}
                    onChange={e => setNovoPerfil({ ...novoPerfil, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                    style={{ focusBorderColor: darkTertiary } as any} // Foco sutil no tema
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Descrição do Alumínio</label>
                  <input
                    type="text"
                    value={novoPerfil.nome}
                    onChange={e => setNovoPerfil({ ...novoPerfil, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Cor</label>
                  <input
                    type="text"
                    value={novoPerfil.cores}
                    onChange={e => setNovoPerfil({ ...novoPerfil, cores: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoria</label>
                  <input
                    type="text"
                    value={novoPerfil.categoria}
                    onChange={e => setNovoPerfil({ ...novoPerfil, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Preço de Venda</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novoPerfil.preco ?? ""}
                    onChange={e => setNovoPerfil({ ...novoPerfil, preco: e.target.value ? Number(e.target.value) : null })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Ações com o Tema */}
            <div className="flex justify-end items-center gap-3 mt-8">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-all"
              >
                Descartar
              </button>
              <button
                onClick={salvarPerfil}
                disabled={carregando}
                className="px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }} // Aplicando seu tema aqui
              >
                {carregando ? "Salvando..." : (editando ? "Salvar Alterações" : "Cadastrar Perfil")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOADING PARA O PDF (PADRÃO FERRAGENS) */}
      {gerandoPDF && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-4 animate-spin rounded-full"
              style={{ borderColor: darkTertiary, borderTopColor: 'transparent' }}>
            </div>
            <p className="font-bold text-gray-700" style={{ color: darkPrimary }}>
              Gerando seu Catálogo de Perfis...
            </p>
            <span className="text-xs text-gray-400">Isso pode levar alguns segundos</span>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO/CONFIRMAÇÃO (PADRÃO FERRAGENS) */}
      {modalAviso && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 px-4">
          <div className="bg-white rounded-[32px] p-8 shadow-2xl w-full max-w-sm border border-gray-100 flex flex-col items-center text-center scale-up-center">
            <h3 className="text-lg font-bold mb-2 text-center" style={{ color: darkPrimary }}>{modalAviso.titulo}</h3>
            <p className="text-gray-600 text-sm mb-6 text-center whitespace-pre-line">{modalAviso.mensagem}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setModalAviso(null)} className="px-4 py-2 rounded-xl  text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition">
                {modalAviso.confirmar ? "Cancelar" : "Entendido"}
              </button>
              {modalAviso.confirmar && (
                <button onClick={() => { modalAviso.confirmar?.(); setModalAviso(null); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTAO SCROLL TOP */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-110 z-50"
          style={{ backgroundColor: darkTertiary, color: darkPrimary }}
          title="Voltar ao topo"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  )
}