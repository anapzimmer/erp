"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Image as ImageIcon, Wrench, Printer, Loader2, Boxes, Layers, Palette, Package, Trash2, Edit2, PlusCircle, X, Building2, ChevronDown, Download, Upload, Menu, Search, DollarSign, ArrowUp, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PDFDownloadLink } from "@react-pdf/renderer";
import { KitsPDF } from "app/relatorios/kits/KitsPDF";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"

// --- TIPAGENS ---
type Kit = {
  id: number;
  nome: string;
  largura: number;
  altura: number;
  categoria: string | null;
  cores: string | null;
  preco_por_cor: string | null;
  preco: number | null;
}

type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

const padronizarTexto = (texto: string | null) => {
  if (!texto) return "";
  return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};

export default function KitsPage() {
  const router = useRouter()
  const { theme, isLoading: themeLoading } = useTheme();

  // --- ESTADOS UI/BRANDING ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  const darkPrimary = theme.menuBackgroundColor;
  const darkSecondary = theme.menuTextColor;
  const darkTertiary = theme.menuIconColor;
  const darkHover = theme.menuHoverColor;
  const lightPrimary = theme.screenBackgroundColor;
  const lightSecondary = theme.modalBackgroundColor;
  const lightTertiary = theme.contentTextLightBg;


  // --- ESTADOS LÓGICA ---
  const [kits, setKits] = useState<Kit[]>([])
  const [novoKit, setNovoKit] = useState<Omit<Kit, "id">>({
    nome: "",
    largura: 0,
    altura: 0,
    categoria: "",
    cores: "",
    preco_por_cor: "",
    preco: null
  });
  const [editando, setEditando] = useState<Kit | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [isClient, setIsClient] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }
      setUsuarioEmail(userData.user.email ?? null);

      const { data } = await supabase.from("perfis_usuarios").select("empresa_id").eq("id", userData.user.id).maybeSingle();
      if (data) {
        setEmpresaIdUsuario(data.empresa_id);
        const { data: emp } = await supabase.from("empresas").select("nome").eq("id", data.empresa_id).single();
        if (emp) setNomeEmpresa(emp.nome);
        await carregarDados(data.empresa_id);
      }
      setCheckingAuth(false);
    };
    init();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const carregarDados = async (idEmpresaForcado?: string) => {
    // Prioriza o ID passado ou o do estado
    const idFiltrar = idEmpresaForcado || empresaIdUsuario;

    if (!idFiltrar) return;

    setCarregando(true);
    const { data, error } = await supabase
      .from("kits")
      .select("*")
      .eq("empresa_id", idFiltrar) // <-- FILTRO ESSENCIAL
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar:", error.message);
    } else {
      setKits(data || []);
    }
    setCarregando(false);
  };

  const salvarKit = async () => {
    if (!novoKit.nome.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "O nome do kit é obrigatório." });
      return;
    }

    setCarregando(true);
    const dadosParaSalvar = {
      nome: padronizarTexto(novoKit.nome),
      largura: Number(novoKit.largura),
      altura: Number(novoKit.altura),
      categoria: padronizarTexto(novoKit.categoria) || "Kits",
      cores: padronizarTexto(novoKit.cores),
      preco_por_cor: novoKit.preco_por_cor,
      preco: novoKit.preco,
      empresa_id: empresaIdUsuario // GARANTE O DONO DO DADO
    };

    try {
      let error;
      if (editando) {
        const { error: err } = await supabase.from("kits").update(dadosParaSalvar).eq("id", editando.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("kits").insert([dadosParaSalvar]);
        error = err;
      }

      if (error) throw error;
      setMostrarModal(false);
      setEditando(null);
      await carregarDados();
    } catch (e: any) {
      setModalAviso({ titulo: "Erro", mensagem: "Falha ao salvar o kit: " + e.message });
    } finally {
      setCarregando(false);
    }
  };

  const deletarKit = (id: number) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir este kit? Esta ação não pode ser desfeita.",
      confirmar: async () => {
        try {
          const { error } = await supabase.from("kits").delete().eq("id", id);
          if (error) throw error;
          setKits(prev => prev.filter(k => k.id !== id));
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível excluir: " + e.message });
        }
      }
    });
  };

  const handleImportarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaIdUsuario) return;

    setModalCarregando(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const conteudo = new TextDecoder("windows-1252").decode(arrayBuffer);
        const linhas = conteudo.split(/\r?\n/).filter(l => l.trim() !== "");

        // --- IMPORTAÇÃO INTELIGENTE REVISADA ---
        const cabecalho = linhas[0].toLowerCase();
        // O formato novo estruturado tem 6 colunas, o antigo tem 5.
        const colunasCabecalho = cabecalho.split(";");
        const formatoNovo = colunasCabecalho.length >= 6;

        const novosKits = linhas.slice(1).map(linha => {
          const colunas = linha.split(";").map(c => c.replace(/^["']|["']$/g, "").trim());

          let nomeFinal = "";
          let largura = 0;
          let altura = 0;
          let corFinal = "";
          let categoriaFinal = "";
          let precoFinal = 0;

          if (formatoNovo) {
            // --- FORMATO NOVO (6 Colunas): Nome;Largura;Altura;Cor;Categoria;Preço ---
            nomeFinal = colunas[0];
            largura = parseFloat(colunas[1]) || 0;
            altura = parseFloat(colunas[2]) || 0;
            corFinal = colunas[3];
            categoriaFinal = colunas[4];
            precoFinal = parseFloat((colunas[5] || "0").replace(/\./g, "").replace(",", ".")) || 0;
          } else {
            // --- FORMATO ANTIGO (5 Colunas): Descrição;Largura;Altura;Categoria;Preço ---
            const descricaoCompleta = colunas[0] || "";

            // Separa nome e cor pelo hífen
            if (descricaoCompleta.includes(" - ")) {
              const partes = descricaoCompleta.split(" - ");
              nomeFinal = partes[0].trim();
              corFinal = partes[1].trim();
            } else {
              nomeFinal = descricaoCompleta;
              corFinal = "Padrão";
            }

            largura = parseFloat(colunas[1]) || 0;
            altura = parseFloat(colunas[2]) || 0;
            categoriaFinal = colunas[3] || "Kits";
            // Preço na coluna 4 para o formato antigo
            precoFinal = parseFloat((colunas[4] || "0").replace(/\./g, "").replace(",", ".")) || 0;
          }

          return {
            nome: padronizarTexto(nomeFinal),
            largura,
            altura,
            categoria: padronizarTexto(categoriaFinal),
            cores: padronizarTexto(corFinal),
            preco: precoFinal,
            empresa_id: empresaIdUsuario
          };
        });

        // --- LOGICA DE DUPLICADOS E SALVAMENTO ---
        const kitsUnicosParaSalvar = novosKits.reduce((acc: any[], atual) => {
          const chave = `${atual.nome.toUpperCase()}-${atual.cores.toUpperCase()}`;
          const jaExiste = acc.find(item => `${item.nome.toUpperCase()}-${item.cores.toUpperCase()}` === chave);
          if (!jaExiste) acc.push(atual);
          return acc;
        }, []);

        if (kitsUnicosParaSalvar.length > 0) {
          await supabase.from("kits").delete().eq("empresa_id", empresaIdUsuario);
          const { error } = await supabase.from("kits").insert(kitsUnicosParaSalvar);

          if (error) throw error;
          await carregarDados();
          setModalAviso({ titulo: "Sucesso", mensagem: "Importação concluída com sucesso!" });
        }
      } catch (err: any) {
        setModalAviso({ titulo: "Erro", mensagem: "Falha: " + err.message });
      } finally {
        setModalCarregando(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportarCSV = () => {
    try {
      if (kits.length === 0) {
        setModalAviso({ titulo: "Aviso", mensagem: "Não há dados para exportar." });
        return;
      }
      const cabecalhos = ["Nome", "Largura (mm)", "Altura (mm)", "Cor", "Categoria", "Preço"];
      const linhas = kits.map(kit => [
        `"${kit.nome}"`,                                     // Coluna 1: Nome
        kit.largura,                                         // Coluna 2: Largura
        kit.altura,                                          // Coluna 3: Altura
        `"${kit.cores || "Padrão"}"`,                        // Coluna 4: Cor
        `"${kit.categoria || "Geral"}"`,                     // Coluna 5: Categoria
        (kit.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) // Coluna 6: Preço
      ]);

      // 3. MONTAR CONTEÚDO COM PONTO E VÍRGULA
      const conteudoCSV = [
        cabecalhos.join(";"),
        ...linhas.map(linha => linha.join(";"))
      ].join("\n");

      // 4. PROCESSO DE DOWNLOAD
      const blob = new Blob(["\ufeff", conteudoCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `exportacao_kits_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      setModalAviso({ titulo: "Erro", mensagem: "Erro ao exportar: " + err.message });
    }
  };

  const eliminarDuplicados = () => {
    setModalAviso({
      titulo: "Eliminar Duplicados",
      mensagem: "Remover kits com mesmo NOME e COR?",
      confirmar: async () => {
        const jaVistos = new Set();
        const idsDeletar: number[] = [];
        kits.forEach(k => {
          const chave = `${k.nome.toLowerCase()}-${(k.cores || "").toLowerCase()}`;
          if (jaVistos.has(chave)) idsDeletar.push(k.id);
          else jaVistos.add(chave);
        });
        if (idsDeletar.length > 0) {
          await supabase.from("kits").delete().in("id", idsDeletar);
          await carregarDados();
        }
      }
    });
  }

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

  if (checkingAuth || !isClient) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderTopColor: 'transparent', borderRightColor: darkPrimary, borderBottomColor: darkPrimary, borderLeftColor: darkPrimary }}></div></div>;

  const kitsFiltrados = kits.filter(k => {
    const matchesBusca = k.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
      (k.categoria || "").toLowerCase().includes(filtroNome.toLowerCase());
    const matchesCor = (k.cores || "").toLowerCase().includes(filtroCor.toLowerCase());
    return matchesBusca && matchesCor;
  });

  return (
    <div className="cadastros-layout flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      {/* SIDEBAR */}
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      <div className="flex-1 flex flex-col w-full">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail || ""}
          handleSignOut={handleLogout}
        />

        <main className="cad-main-panel p-4 md:p-8 xl:p-10 flex-1 min-w-0">
          {/* HEADER SEÇÃO */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-2xl shadow-inner"
                style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}
              >
                <Boxes size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: lightTertiary }}>
                  Dashboard de Kits
                </h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                  Gerencie seu catálogo de kits e medidas.
                </p>
              </div>
            </div>
            {/* AÇÕES PADRONIZADAS */}
            <div className="flex gap-2 no-print">
              {/* Botão Imprimir PDF */}
              {isClient && (
                <PDFDownloadLink
                  document={
                <KitsPDF
  dados={kits} // Passa o estado 'kits' diretamente
  empresa={nomeEmpresa}
  logoUrl={theme.logoLightUrl ?? null}
  coresEmpresa={{
    primary: theme.menuBackgroundColor,
    secondary: theme.menuTextColor,
    tertiary: theme.menuIconColor,
    textDefault: '#1C415B'
  }}
/>
                  }
                  fileName={`catalogo_kits_${nomeEmpresa.toLowerCase().replace(/\s+/g, '_')}.pdf`}
                  title="Imprimir Catálogo"
                  className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
                >
                  {({ loading }) => (
                    loading ? (
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    ) : (
                      <Printer
                        size={20}
                        className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                        onMouseEnter={(e) => e.currentTarget.style.color = theme.menuIconColor}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                      />
                    )
                  )}
                </PDFDownloadLink>
              )}

              {/* Botão Exportar CSV */}
              <button
                onClick={handleExportarCSV}
                title="Exportar Planilha"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Download
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.menuIconColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
              </button>

              {/* Botão Importar CSV */}
              <label
                htmlFor="importarCSV"
                title="Importar Planilha"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 cursor-pointer hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Upload
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.menuIconColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
                <input
                  type="file"
                  id="importarCSV"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportarCSV}
                />
              </label>
            </div>
          </div>

          {/* INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 cards-indicadores">
            {[
              { titulo: "Total", valor: kits.length, icone: Layers },
              { titulo: "Com Preço", valor: kits.filter(k => k.preco).length, icone: DollarSign },
              { titulo: "Cores", valor: new Set(kits.map(k => k.cores)).size, icone: Palette },
              { titulo: "Categorias", valor: new Set(kits.map(k => k.categoria)).size, icone: Package }
            ].map(card => (
              <div key={card.titulo} className="cad-metric-card bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÃO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap filtros-sessao">
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou categoria..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": darkTertiary } as any}
                />
              </div>
              <input
                type="text"
                placeholder="Filtrar por cor..."
                value={filtroCor}
                onChange={e => setFiltroCor(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all w-full md:w-48"
                style={{ "--tw-ring-color": darkTertiary } as any}
              />
            </div>

            <div className="flex items-center gap-2 no-print">
              <button onClick={eliminarDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition">
                <Trash2 size={18} /> Limpar Duplicados
              </button>
              <button
                onClick={() => {
                  setEditando(null);
                  setNovoKit({ nome: "", largura: 0, altura: 0, categoria: "", cores: "", preco_por_cor: "", preco: null });
                  setMostrarModal(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }}
              >
                <PlusCircle size={18} /> Novo Kit
              </button>
            </div>
          </div>

          {/* TABELA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 text-xs uppercase tracking-widest">Nome do Kit</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Largura (mm)</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Altura (mm)</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Cor</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Categoria</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Preço Base</th>
                  <th className="p-4 text-xs uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kitsFiltrados.map(k => (
                  <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 font-medium" style={{ color: lightTertiary }}>{k.nome}</td>
                    <td className="p-4 text-gray-500 font-medium">{k.largura}</td>
                    <td className="p-4 text-gray-500 font-medium">{k.altura}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                        style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                        {k.cores || "Padrão"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium">{k.categoria || "Geral"}</td>
                    <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>
                      {k.preco ? formatarPreco(k.preco) : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditando(k); setNovoKit(k); setMostrarModal(true); }} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                        <button onClick={() => deletarKit(k.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] z-50 px-4">
          <div className="bg-white rounded-2xl p-7 shadow-xl w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: darkPrimary }}>
                  {editando ? "Editar Kit" : "Novo Kit"}
                </h2>
                <div className="h-0.5 w-6 mt-1 rounded-full" style={{ backgroundColor: darkTertiary }}></div>
              </div>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 ml-1 mb-1 block">Nome do Kit</label>
                <input
                  type="text"
                  value={novoKit.nome}
                  onChange={e => setNovoKit({ ...novoKit, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Largura (mm)</label>
                  <input
                    type="number"
                    value={novoKit.largura}
                    onChange={e => setNovoKit({ ...novoKit, largura: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Altura (mm)</label>
                  <input
                    type="number"
                    value={novoKit.altura}
                    onChange={e => setNovoKit({ ...novoKit, altura: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Cores</label>
                  <input
                    type="text"
                    value={novoKit.cores || ""}
                    onChange={e => setNovoKit({ ...novoKit, cores: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoria</label>
                  <input
                    type="text"
                    value={novoKit.categoria || ""}
                    onChange={e => setNovoKit({ ...novoKit, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition-all"
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
                    value={novoKit.preco ?? ""}
                    onChange={e => setNovoKit({ ...novoKit, preco: e.target.value ? Number(e.target.value) : null })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 mt-8 pt-6 border-t border-gray-50">
              <button onClick={() => setMostrarModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Descartar</button>
              <button onClick={salvarKit} disabled={carregando} className="px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
                {carregando ? "Salvando..." : (editando ? "Salvar Alterações" : "Cadastrar Kit")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CARREGAMENTO DA IMPORTAÇÃO */}
      {modalCarregando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[100]">
          <div className="bg-white rounded-[32px] p-10 flex flex-col items-center shadow-2xl border border-white/20">
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

      {/* AVISOS E LOADING */}
      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: lightSecondary,
          text: darkPrimary,
          primaryButtonBg: darkPrimary,
          primaryButtonText: darkSecondary,
        }}
      />
      {showScrollTop && <button onClick={scrollToTop} className="fixed bottom-6 right-6 p-3 rounded-full shadow-lg z-50" style={{ backgroundColor: darkTertiary, color: darkPrimary }}><ArrowUp size={24} /></button>}
    </div>
  )
}