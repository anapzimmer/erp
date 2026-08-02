"use client"
import React, { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { Image as ImageIcon, Wrench, Printer, Loader2, Boxes, Layers, Palette, Package, Trash2, Edit2, PlusCircle, X, Building2, ChevronDown, Download, Upload, Menu, Search, DollarSign, ArrowUp, Square, Eraser, Tag, CheckCircle2, CheckSquare2, ListChecks } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PDFDownloadLink } from "@react-pdf/renderer";
import { KitsPDF } from "@/app/relatorios/kits/KitsPDF";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThemeLoader from "@/components/ThemeLoader"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import ImportarTabelaCatalogoModal from "@/components/ImportarTabelaCatalogoModal"

// --- TIPAGENS ---
type Kit = {
  id: number;
  codigo?: string | null;
  nome: string;
  largura: number;
  altura: number;
  categoria: string | null;
  cores: string | null;
  preco_por_cor: string | null;
  preco: number | null;
}

type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

type KitFormData = Omit<Kit, "id">;

const padronizarTexto = (texto: string | null) => {
  if (!texto) return "";
  return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};

const criarKitVazio = (): KitFormData => ({
  codigo: "",
  nome: "",
  largura: 0,
  altura: 0,
  categoria: "",
  cores: "",
  preco_por_cor: "",
  preco: null
});

const extrairDadosDoNomeKit = (nome: string) => {
  const dimensoesMatch = nome.match(/(\d{2,5})\s*(?:mm)x\s*[xX]\s*(\d{2,5})\s*(?:mm)x/);
  const espessuraMatch = nome.match(/(\d+(?:\+\d+)x)\s*mm\b/i);

  return {
    largura: dimensoesMatch ? Number(dimensoesMatch[1]) : null,
    altura: dimensoesMatch ? Number(dimensoesMatch[2]) : null,
    espessura: espessuraMatch ? `${espessuraMatch[1]}mm` : ""
  };
};

const normalizarNomeKit = (nome: string | null) =>
  padronizarTexto(nome).toLowerCase().trim();

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
  const [novoKit, setNovoKit] = useState<KitFormData>(criarKitVazio);
  const [editando, setEditando] = useState<Kit | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarImportador, setMostrarImportador] = useState(false)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void; tipo?: "sucesso" | "erro" | "aviso" } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [kitsSelecionados, setKitsSelecionados] = useState<Set<number>>(new Set())
  const [isClient, setIsClient] = useState(false);
  const [espessuraDetectada, setEspessuraDetectada] = useState("");
  const larguraManualRef = useRef(false);
  const alturaManualRef = useRef(false);
  const ultimaDeteccaoRef = useRef<{ largura: number | null; altura: number | null }>({ largura: null, altura: null });

  const atualizarDeteccaoNomeKit = (nome: string) => {
    const dados = extrairDadosDoNomeKit(nome);
    setEspessuraDetectada(dados.espessura);

    setNovoKit(prev => ({
      ...prev,
      nome,
      largura:
        dados.largura !== null &&
        !larguraManualRef.current &&
        (prev.largura === 0 || prev.largura === ultimaDeteccaoRef.current.largura) ? dados.largura
          : prev.largura,
      altura:
        dados.altura !== null &&
        !alturaManualRef.current &&
        (prev.altura === 0 || prev.altura === ultimaDeteccaoRef.current.altura) ? dados.altura
          : prev.altura,
    }));

    ultimaDeteccaoRef.current = { largura: dados.largura, altura: dados.altura };
  };

  const aplicarMedidasDoNome = () => {
    const dados = extrairDadosDoNomeKit(novoKit.nome);
    setEspessuraDetectada(dados.espessura);
    setNovoKit(prev => ({
      ...prev,
      largura: dados.largura ?? prev.largura,
      altura: dados.altura ?? prev.altura,
    }));
    larguraManualRef.current = false;
    alturaManualRef.current = false;
    ultimaDeteccaoRef.current = { largura: dados.largura, altura: dados.altura };
  };

  const abrirModalParaNovo = () => {
    setEditando(null);
    setNovoKit(criarKitVazio());
    larguraManualRef.current = false;
    alturaManualRef.current = false;
    ultimaDeteccaoRef.current = { largura: null, altura: null };
    setEspessuraDetectada("");
    setMostrarModal(true);
  };

  const abrirModalParaEdicao = (kit: Kit) => {
    const deteccao = extrairDadosDoNomeKit(kit.nome);
    setEditando(kit);
    setNovoKit(kit);
    larguraManualRef.current = true;
    alturaManualRef.current = true;
    ultimaDeteccaoRef.current = { largura: deteccao.largura, altura: deteccao.altura };
    setEspessuraDetectada(deteccao.espessura);
    setMostrarModal(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const init = async () => {
      try {
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
      } catch (error) {
        console.error("Erro ao iniciar cadastro de kits:", error);
      } finally {
        setCheckingAuth(false);
      }
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

    const nomeNormalizado = normalizarNomeKit(novoKit.nome)
    const conflitoExistente = kits.find((kit) => {
      if (editando && kit.id === editando.id) return false
      if (normalizarNomeKit(kit.nome) !== nomeNormalizado) return false

      return Number(kit.largura) !== Number(novoKit.largura) || Number(kit.altura) !== Number(novoKit.altura)
    })

    if (conflitoExistente) {
      setModalAviso({
        titulo: "Nome duplicado com referência diferente",
        mensagem: `Já existe um kit com esse nome usando a referência ${conflitoExistente.largura}x${conflitoExistente.altura} mm. Para evitar ambiguidade no projeto, altere o nome ou use a mesma referência.`,
      });
      return
    }

    setCarregando(true);
    const dadosParaSalvar = {
      codigo: novoKit.codigo?.toUpperCase().trim() || null,
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
        const { error: err } = await supabase
          .from("kits")
          .update(dadosParaSalvar)
          .eq("id", editando.id)
          .eq("empresa_id", empresaIdUsuario);
        error = err;
      } else {
        const { error: err } = await supabase.from("kits").insert([dadosParaSalvar]);
        error = err;
      }

      if (error) throw error;
      setMostrarModal(false);
      setEditando(null);
      larguraManualRef.current = false;
      alturaManualRef.current = false;
      ultimaDeteccaoRef.current = { largura: null, altura: null };
      setEspessuraDetectada("");
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
      mensagem: "Tem certeza que deseja excluir este kitx Esta ação não pode ser desfeita.",
      confirmar: async () => {
        try {
          const { error } = await supabase
            .from("kits")
            .delete()
            .eq("id", id)
            .eq("empresa_id", empresaIdUsuario);
          if (error) throw error;
          setKits(prev => prev.filter(k => k.id !== id));
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível excluir: " + e.message });
        }
      }
    });
  };

  const handleImportarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaIdUsuario) return;

    setModalCarregando(true);
    try {
        const conteudo = await decodeCsvFile(file);
        const linhas = conteudo.split(/\rx\n/).filter(l => l.trim() !== "");

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

  const handleExportarCSV = () => {
    try {
      if (kits.length === 0) {
        setModalAviso({ titulo: "Aviso", mensagem: "Não há dados para exportar." });
        return;
      }
      const cabecalhos = ["Código", "Nome", "Largura (mm)", "Altura (mm)", "Cor", "Categoria", "Preço"];
      const linhas = kits.map(kit => [
        `"${kit.codigo || ""}"`,
        `"${kit.nome}"`,
        kit.largura,
        kit.altura,
        `"${kit.cores || "Padrão"}"`,
        `"${kit.categoria || "Geral"}"`,
        (kit.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
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
      mensagem: "Remover kits com mesmo NOME e CORx",
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
      (k.codigo || "").toLowerCase().includes(filtroNome.toLowerCase()) ||
      (k.categoria || "").toLowerCase().includes(filtroNome.toLowerCase());
    const matchesCor = (k.cores || "").toLowerCase().includes(filtroCor.toLowerCase());
    return matchesBusca && matchesCor;
  });

  const alternarSelecaoKit = (id: number) => {
    setKitsSelecionados((atuais) => {
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
    kitsFiltrados.length > 0 &&
    kitsFiltrados.every((kit) => kitsSelecionados.has(kit.id))

  const alternarSelecaoFiltrados = () => {
    setKitsSelecionados((atuais) => {
      const novos = new Set(atuais)
      if (todosFiltradosSelecionados) {
        kitsFiltrados.forEach((kit) => novos.delete(kit.id))
      } else {
        kitsFiltrados.forEach((kit) => novos.add(kit.id))
      }
      return novos
    })
  }

  const excluirKitsSelecionados = () => {
    const ids = Array.from(kitsSelecionados)

    if (!ids.length) {
      setModalAviso({
        titulo: "Nenhum kit selecionado",
        mensagem: "Selecione pelo menos um kit para excluir.",
        tipo: "aviso",
      })
      return
    }

    setModalAviso({
      titulo: "Excluir kits selecionados",
      mensagem: `Tem certeza que deseja excluir ${ids.length} ${ids.length === 1 ? "kit" : "kits"}?`,
      tipo: "aviso",
      confirmar: async () => {
        setCarregando(true)
        try {
          const { error } = await supabase
            .from("kits")
            .delete()
            .in("id", ids)
            .eq("empresa_id", empresaIdUsuario)

          if (error) throw error

          setKits((atuais) => atuais.filter((kit) => !kitsSelecionados.has(kit.id)))
          setKitsSelecionados(new Set())
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível excluir os kits: " + e.message, tipo: "erro" })
        } finally {
          setCarregando(false)
        }
      },
    })
  }

  const limparTodosOsKits = () => {
    setModalAviso({
      titulo: "Limpar todo o catálogo",
      mensagem: `Esta ação excluirá permanentemente todos os ${kits.length} kits cadastrados. Deseja continuar?`,
      tipo: "aviso",
      confirmar: async () => {
        if (!empresaIdUsuario) return
        setCarregando(true)
        try {
          const { error } = await supabase
            .from("kits")
            .delete()
            .eq("empresa_id", empresaIdUsuario)

          if (error) throw error

          setKits([])
          setKitsSelecionados(new Set())
        } catch (e: any) {
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível limpar o catálogo: " + e.message, tipo: "erro" })
        } finally {
          setCarregando(false)
        }
      },
    })
  }

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
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: darkPrimary }}>
                    Catálogo de kits
                  </h1>
                  <p className="mt-1 text-sm font-normal text-gray-500">
                    Gerencie modelos, medidas, cores e preços dos kits.
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
    textDefault: theme.contentTextLightBg
  }}
/>
                  }
                  fileName={`catalogo_kits_${nomeEmpresa.toLowerCase().replace(/\s+/g, '_')}.pdf`}
                  title="Imprimir Catálogo"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                >
                  {({ loading }) => (
                    loading ? (
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    ) : (
                      <Printer size={18} />
                    )
                  )}
                </PDFDownloadLink>
              )}

              <button
                onClick={handleExportarCSV}
                title="Exportar CSV"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
              >
                <Download size={18} />
              </button>

              <label
                htmlFor="importarCSV"
                title="Importar CSV simples"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
              >
                <Upload size={18} />
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
          </section>

          {/* INDICADORES */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 cards-indicadores">
            {[
              { titulo: "Total", valor: kits.length, icone: Layers },
              { titulo: "Com preço", valor: kits.filter(k => k.preco).length, icone: DollarSign },
              { titulo: "Cores", valor: new Set(kits.map(k => k.cores)).size, icone: Palette },
              { titulo: "Categorias", valor: new Set(kits.map(k => k.categoria)).size, icone: Package }
            ].map(card => (
              <div key={card.titulo} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: darkTertiary, backgroundColor: `${darkTertiary}10` }}>
                  <card.icone size={19} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xs font-normal text-gray-400">{card.titulo}</p>
                  <p className="text-xl font-semibold" style={{ color: darkPrimary }}>{card.valor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÃO */}
          <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm filtros-sessao">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou categoria..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none transition focus:bg-white focus:ring-2"
                  style={{ "--tw-ring-color": `${darkTertiary}25` } as React.CSSProperties}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por cor..."
                value={filtroCor}
                onChange={e => setFiltroCor(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none transition focus:bg-white focus:ring-2"
                style={{ "--tw-ring-color": `${darkTertiary}25` } as React.CSSProperties}
              />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <button onClick={eliminarDuplicados} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-normal text-gray-500 transition hover:bg-gray-50">
                <Eraser size={16} /> Duplicados
              </button>
              <button
                onClick={limparTodosOsKits}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-white px-3.5 py-2.5 text-sm font-normal text-red-500 transition hover:bg-red-50"
              >
                <Trash2 size={16} />
                Limpar tudo
              </button>
              <button
                onClick={() => {
                  abrirModalParaNovo();
                }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }}
              >
                <PlusCircle size={17} /> Novo kit
              </button>
            </div>
          </div>
          </section>

          {kitsSelecionados.size > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckSquare2 size={18} className="text-red-500" />
                <span>
                  <strong className="font-normal">{kitsSelecionados.size}</strong>{" "}
                  {kitsSelecionados.size === 1 ? "item selecionado" : "itens selecionados"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setKitsSelecionados(new Set())}
                  className="rounded-xl px-3 py-2 text-xs font-normal text-gray-500 transition hover:bg-white"
                >
                  Cancelar seleção
                </button>
                <button
                  onClick={excluirKitsSelecionados}
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
                <h2 className="text-base font-normal text-gray-700">Kits cadastrados</h2>
                <p className="mt-0.5 text-xs text-gray-400">Exibindo {kitsFiltrados.length} de {kits.length} produtos</p>
              </div>
              <button
                onClick={alternarSelecaoFiltrados}
                disabled={!kitsFiltrados.length}
                className="flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-normal text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
              >
                <ListChecks size={15} />
                {todosFiltradosSelecionados ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
                  <tr>
                    <th className="w-14 px-5 py-3.5">
                      <button
                        onClick={alternarSelecaoFiltrados}
                        disabled={!kitsFiltrados.length}
                        className={`flex h-5 w-5 items-center justify-center rounded border transition disabled:opacity-50 ${
                          todosFiltradosSelecionados ? "border-transparent" : "border-gray-300 bg-white"
                        }`}
                        style={todosFiltradosSelecionados ? { backgroundColor: "#16a34a" } : undefined}
                        aria-label="Selecionar todos os kits visíveis"
                      >
                        {todosFiltradosSelecionados && <CheckCircle2 size={15} className="text-white" />}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 font-normal">Código</th>
                    <th className="px-4 py-3.5 font-normal">Nome do kit</th>
                    <th className="px-4 py-3.5 font-normal">Largura</th>
                    <th className="px-4 py-3.5 font-normal">Altura</th>
                    <th className="px-4 py-3.5 font-normal">Cor</th>
                    <th className="px-4 py-3.5 font-normal">Categoria</th>
                    <th className="px-4 py-3.5 font-normal">Preço base</th>
                    <th className="px-4 py-3.5 text-center font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kitsFiltrados.map(k => {
                    const selecionado = kitsSelecionados.has(k.id)

                    return (
                    <tr key={k.id} className={`transition-colors ${selecionado ? "bg-emerald-50/40" : "hover:bg-gray-50/80"}`}>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => alternarSelecaoKit(k.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            selecionado ? "border-transparent" : "border-gray-300 bg-white"
                          }`}
                          style={selecionado ? { backgroundColor: "#16a34a" } : undefined}
                          aria-label={`Selecionar ${k.nome}`}
                        >
                          {selecionado && <CheckCircle2 size={15} className="text-white" />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-normal uppercase text-slate-600">
                          {k.codigo || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{k.nome}</td>
                      <td className="px-4 py-3.5 text-gray-600">{k.largura}</td>
                      <td className="px-4 py-3.5 text-gray-600">{k.altura}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full border px-2.5 py-1 text-[11px] font-normal"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}33`, backgroundColor: `${darkTertiary}10` }}>
                          {k.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{k.categoria || "Geral"}</td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {k.preco ? formatarPreco(k.preco) : "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => abrirModalParaEdicao(k)} className="rounded-xl p-2.5 transition hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={17} /></button>
                          <button onClick={() => deletarKit(k.id)} className="rounded-xl p-2.5 text-red-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <ImportarTabelaCatalogoModal
        aberto={mostrarImportador}
        tipo="kits"
        empresaId={empresaIdUsuario || ""}
        existentes={kits}
        onClose={() => setMostrarImportador(false)}
        onConcluido={carregarDados}
      />

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
          <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] transition-all">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                  Catálogo de kits
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  {editando ? "Editar Kit" : "Cadastrar Kit"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Informe os dados principais e, se precisar, preços diferentes por tabela.
                </p>
              </div>
              <button onClick={() => setMostrarModal(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600" title="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Dados do kit</h3>
                    <p className="mt-1 text-xs text-slate-500">Campos principais para seleção e cálculo.</p>
                  </div>
                  <Square size={18} className="text-slate-300" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Código do produto</label>
                    <input
                      type="text"
                      placeholder="E?: F1-120-BC"
                      value={novoKit.codigo || ""}
                      onChange={e => setNovoKit({ ...novoKit, codigo: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm uppercase text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Nome do kit *</label>
                    <input
                      type="text"
                      placeholder="E?: Kit janela 1,20A ? 1,50L 4F"
                      value={novoKit.nome}
                      onChange={e => atualizarDeteccaoNomeKit(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                    />
                    <div className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
                      Medidas podem ser sugeridas pelo nome do kit.
                      <button type="button" onClick={aplicarMedidasDoNome} className="ml-2 font-semibold" style={{ color: darkTertiary }}>
                        Reaplicar medidas
                      </button>
                      {espessuraDetectada && (
                        <span className="ml-2 font-semibold" style={{ color: darkTertiary }}>
                          Espessura: {espessuraDetectada}
                        </span>
                      )}
                    </div>
                  </div>

                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Largura (mm)</label>
                  <input
                    type="number"
                    value={novoKit.largura}
                    onChange={e => {
                      larguraManualRef.current = true;
                      setNovoKit({ ...novoKit, largura: Number(e.target.value) });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Altura (mm)</label>
                  <input
                    type="number"
                    value={novoKit.altura}
                    onChange={e => {
                      alturaManualRef.current = true;
                      setNovoKit({ ...novoKit, altura: Number(e.target.value) });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Cor</label>
                  <input
                    type="text"
                    value={novoKit.cores || ""}
                    onChange={e => setNovoKit({ ...novoKit, cores: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Categoria</label>
                  <input
                    type="text"
                    value={novoKit.categoria || ""}
                    onChange={e => setNovoKit({ ...novoKit, categoria: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Preço base</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition-all focus-within:border-transparent focus-within:ring-2"
                      style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                    >
                      <span className="mr-2 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novoKit.preco ?? ""}
                    onChange={e => setNovoKit({ ...novoKit, preco: e.target.value ? Number(e.target.value) : null })}
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
              <button onClick={() => {
                setMostrarModal(false);
                larguraManualRef.current = false;
                alturaManualRef.current = false;
                ultimaDeteccaoRef.current = { largura: null, altura: null };
                setEspessuraDetectada("");
              }} className="rounded-2xl bg-slate-100 px-7 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-200">Cancelar</button>
              <button onClick={salvarKit} disabled={carregando} className="rounded-2xl px-8 py-3 text-sm font-semibold shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50" style={{ backgroundColor: darkTertiary, color: "#FFFFFF" }}>
                {carregando ? "Processando..." : (editando ? "Atualizar" : "Salvar Kit")}
              </button>
            </div>
          </div>
        </div>
      )}
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


