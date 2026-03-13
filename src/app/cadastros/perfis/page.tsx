//app/perfis/page.tsx
"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { LayoutDashboard, Printer, FileText, Image as ImageIcon, BarChart3, Wrench, Boxes, Briefcase, UsersRound, Layers, Palette, Package, Copy, ChevronDown, Download, Upload, Trash2, Edit2, PlusCircle, X, Loader2, Building2, LogOut, Settings, Menu, ChevronRight, Square, Search, DollarSign, ArrowUp } from "lucide-react"
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
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [dadosEmpresa, setDadosEmpresa] = useState<any>(null);

  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [branding, setBranding] = useState<any>(null);

  // --- Efeitos de Inicialização e Auth ---
  useEffect(() => {
    const init = async () => {
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
        setCheckingAuth(false);
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
      setCheckingAuth(false);
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

    if (!error && data) setPerfis(data);
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
      const rows = text.split(/\r?\n/).filter(row => row.trim().length > 0).slice(1);
      
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
        <main className="cad-main-panel p-4 md:p-8 xl:p-10 flex-1 min-w-0">
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

            <div className="flex items-center gap-2 no-print">
              {/* Impressora */}
              <button onClick={gerarPDF} title="Gerar PDF" className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center">
                <Printer size={20} className="text-gray-500 transition-all duration-300 group-hover:scale-110" onMouseEnter={(e) => e.currentTarget.style.color = darkTertiary} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'} />
              </button>

              {/* Exportar */}
              <button onClick={exportarCSV} title="Exportar CSV" className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center">
                <Download size={20} className="text-gray-500 transition-all duration-300 group-hover:scale-110" onMouseEnter={(e) => e.currentTarget.style.color = darkTertiary} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'} />
              </button>

              {/* Importar */}
              <label htmlFor="importarCSV" title="Importar CSV" className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer">
                <Upload size={20} className="text-gray-500 transition-all duration-300 group-hover:scale-110" onMouseEnter={(e) => e.currentTarget.style.color = darkTertiary} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'} />
                <input type="file" id="importarCSV" accept=".csv" className="hidden" onChange={importarCSV} />
              </label>
            </div>
          </div>

          {/* INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { titulo: "Total", valor: totalPerfis, icone: Layers },
              { titulo: "Com Preço", valor: comPreco, icone: DollarSign },
              { titulo: "Cores", valor: coresDistintas, icone: Palette },
              { titulo: "Categorias", valor: categoriasDistintas, icone: Package }
            ].map(card => (
              <div key={card.titulo} className="cad-metric-card bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÕES */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Nome, código ou categoria..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none transition-all focus:ring-2"
                style={{ "--tw-ring-color": darkTertiary } as any}
              />
              <input type="text" placeholder="Cor..." value={filtroCor} onChange={e => setFiltroCor(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as any} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={eliminarDuplicados}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
              >
                <Trash2 size={18} />
                Limpar Duplicados
              </button>
           <button onClick={abrirModalParaNovo} className="group flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
  style={{ backgroundColor: darkTertiary, color: darkPrimary }}><PlusCircle size={20} className="transition-all duration-300 group-hover:scale-110 animate-pulse" 
  /> Novo Perfil</button>
            </div>
          </div>

          {/* TABELA */}
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
                {perfisFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 font-medium">{p.codigo}</td>
                    <td className="p-4 text-gray-500 font-medium"><span className="text-gray-500 font-medium" style={{ color: lightTertiary }}>{p.nome}</span></td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                        style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                        {p.cores || "Padrão"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium">{p.categoria || "Geral"}</td>
                    <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>{p.preco ? formatarPreco(p.preco) : "-"}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirModalParaEdicao(p)} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                        <button onClick={() => deletarPerfil(p.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAIS (Design Refinado e Delicado) */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[3px] z-50 px-4 transition-all">
          <div
            className="rounded-3xl p-8 shadow-2xl w-full max-w-md border border-white/20"
            style={{ backgroundColor: branding?.modal_background_color || '#FFFFFF' }}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2
                  className="text-xl font-extrabold tracking-tight"
                  style={{ color: branding?.modal_text_color || '#1C415B' }}
                >
                  {editando ? "Editar Perfil" : "Novo Perfil"}
                </h2>
                <div
                  className="h-1 w-8 mt-1.5 rounded-full"
                  style={{ backgroundColor: branding?.button_dark_bg || '#39B89F' }}
                ></div>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
              >
                <X size={18} className="text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Código</label>
                  <input
                    type="text"
                    value={novoPerfil.codigo}
                    onChange={e => setNovoPerfil({ ...novoPerfil, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-gray-50/50 rounded-2xl text-sm outline-none border border-gray-100 focus:border-blue-300 transition-all"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Descrição</label>
                  <input
                    type="text"
                    value={novoPerfil.nome}
                    onChange={e => setNovoPerfil({ ...novoPerfil, nome: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/50 rounded-2xl text-sm outline-none border border-gray-100 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Alumínio"
                    value={novoPerfil.cores}
                    onChange={e => setNovoPerfil({ ...novoPerfil, cores: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/50 rounded-2xl text-sm border border-gray-100 outline-none focus:border-blue-300 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Trilho"
                    value={novoPerfil.categoria}
                    onChange={e => setNovoPerfil({ ...novoPerfil, categoria: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50/50 rounded-2xl text-sm border border-gray-100 outline-none focus:border-blue-300 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Preço Sugerido</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={novoPerfil.preco ?? ""}
                  onChange={e => setNovoPerfil({ ...novoPerfil, preco: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-4 py-2.5 bg-gray-50/50 rounded-2xl text-sm font-bold border border-gray-100 outline-none focus:border-blue-300 transition-all"
                />
              </div>

              {/* Botão de Ação usando modal_button da tabela */}
              <button
                onClick={salvarPerfil}
                disabled={carregando}
                className="w-full mt-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[2px] transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 hover:brightness-110"
                style={{
                  backgroundColor: branding?.modal_button_background_color || darkPrimary, // Usa a cor principal se não houver branding
                  color: branding?.modal_button_text_color || '#FFFFFF'
                }}
              >
                {carregando ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processando...</span>
                  </div>
                ) : (
                  editando ? "Salvar Alterações" : "Cadastrar Perfil"
                )}
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-100">
          <div className="bg-white rounded-4xl p-10 flex flex-col items-center shadow-2xl border border-white/20">
            <div className="relative mb-6">
              {/* Spinner Principal */}
              <Loader2 size={48} className="animate-spin" style={{ color: darkTertiary }} />
              {/* Ícone de Arquivo no centro */}
              <Upload size={20} className="absolute inset-0 m-auto text-gray-400" />
            </div>
            <h3 className="text-xl font-black mb-2" style={{ color: darkPrimary }}>Importando Dados</h3>
            <p className="text-gray-500 text-sm font-medium animate-pulse">
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