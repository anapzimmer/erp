//app/ferragens/page.tsx
"use client"
import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { decodeCsvFile } from "@/utils/csvEncoding"
import {
  Wrench, Printer,
  Layers, Palette, Package, Trash2, Edit2,
  PlusCircle, X, Download, Upload, Search,
  DollarSign, ArrowUp, Square, Eraser, Tag
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext";
import type { Ferragem } from "@/types/ferragem"
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"
import ImportarTabelaCatalogoModal from "@/components/ImportarTabelaCatalogoModal"

// --- TIPAGENS ---

const padronizarTexto = (texto: string) => {
  if (!texto) return "";
  return texto.toLowerCase().trim().replace(/\s+/g, " ").replace(/(^\w)|(\s+\w)/g, (letra) => letra.toUpperCase());
};

const normalizarCabecalho = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const escaparCampoCsv = (valor: string | number | null | undefined) => {
  const texto = valor == null ? "" : String(valor);
  if (texto.includes(";") || texto.includes('"') || texto.includes("\n") || texto.includes("\r")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
};

const splitCsvLine = (line: string, delimiter: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values.map((value) => value.replace(/^['"]|['"]$/g, "").trim());
};

export default function FerragensPage() {
  const router = useRouter()

  // --- ESTADOS UI/BRANDING ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState<string | null>(null);
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [logoEmpresaPdf, setLogoEmpresaPdf] = useState<string | null>(null);
  const { theme } = useTheme(); // Pega o tema do context

  // Mapeamento correto das propriedades do seu ThemeContext:
  const darkPrimary = theme.menuBackgroundColor;
  const darkSecondary = theme.menuTextColor;
  const darkTertiary = theme.menuIconColor;
  const lightPrimary = theme.screenBackgroundColor;
  const lightSecondary = theme.modalBackgroundColor;
  const lightTertiary = theme.contentTextLightBg;
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // --- ESTADOS LÓGICA ---
  const [ferragens, setFerragens] = useState<Ferragem[]>([])
  const [novaFerragem, setNovaFerragem] = useState<Omit<Ferragem, "id">>({
    codigo: "",
    nome: "",
    cores: "",
    preco: null,
    categoria: "",
    empresa_id: "" // Adicione isto para satisfazer o TypeScript
  });
  const [editando, setEditando] = useState<Ferragem | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarImportador, setMostrarImportador] = useState(false)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)
  const [modalCarregando, setModalCarregando] = useState(false);
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  useEffect(() => { /* client guard */ }, []);

  // --- EFEITOS ---
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

          const { data: brandingData } = await supabase
            .from("configuracoes_branding")
            .select("logo_light")
            .eq("empresa_id", data.empresa_id)
            .limit(1)
            .maybeSingle();

          setLogoEmpresaPdf(brandingData?.logo_light || null);

          await carregarDados(data.empresa_id);
        }
      } catch (error) {
        console.error("Erro ao iniciar cadastro de ferragens:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const carregarDados = async (empresaId: string) => {
    setCarregando(true);
    const { data } = await supabase.from("ferragens").select("*").eq("empresa_id", empresaId).order("codigo", { ascending: true });
    if (data) setFerragens(data);
    setCarregando(false);
  };

  // --- FUNÇÕES DE NEGÓCIO (CÓPIA DO MODELO) ---
  const salvarFerragem = async () => {
    if (!novaFerragem.codigo.trim() || !novaFerragem.nome.trim()) {
      setModalAviso({ titulo: "Atenção", mensagem: "Código e Nome são obrigatórios." });
      return;
    }
    if (!empresaIdUsuario) return;

    setCarregando(true);

    // Preparamos os dados padronizados
    const dadosParaSalvar = {
      codigo: novaFerragem.codigo.trim(),
      nome: padronizarTexto(novaFerragem.nome),
      cores: padronizarTexto(novaFerragem.cores),
      preco: novaFerragem.preco,
      categoria: padronizarTexto(novaFerragem.categoria) || "Ferragens",
      empresa_id: empresaIdUsuario
    };

    try {
      let error;

      if (editando) {
        const { error: err } = await supabase
          .from("ferragens")
          .update(dadosParaSalvar)
          .eq("id", editando.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("ferragens")
          .upsert([dadosParaSalvar], {
            onConflict: 'codigo,nome,cores'
          });
        error = err;
      }

      if (error) throw error;

      setMostrarModal(false);
      setEditando(null);
      await carregarDados(empresaIdUsuario);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setModalAviso({
        titulo: "Item Duplicado",
        mensagem: "Já existe uma ferragem com este código, nome e cor. Verifique os dados ou edite o item existente."
      });
      console.error("Erro ao salvar:", msg);
    } finally {
      setCarregando(false);
    }
  };

  const deletarFerragem = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão",
      mensagem: "Tem certeza que deseja excluir esta ferragem? Esta ação não pode ser desfeita.",
      confirmar: async () => {
        try {
          const { error } = await supabase
            .from("ferragens")
            .delete()
            .eq("id", id);
          if (error) throw error;
          setFerragens(prev => prev.filter(f => f.id !== id));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setModalAviso({ titulo: "Erro", mensagem: "Não foi possível excluir: " + msg });
        }
      }
    });
  };

  const exportarCSV = () => {
    if (ferragens.length === 0) return;
    const header = "Codigo;Nome;Cores;Preco;Categoria";
    const linhas = ferragens.map(f =>
      [f.codigo, f.nome, f.cores, f.preco != null ? f.preco : "", f.categoria]
        .map(escaparCampoCsv)
        .join(";")
    );
    const csvContent = [header, ...linhas].join("\n");
    const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
    const csvUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", csvUrl);
    link.setAttribute("download", "ferragens.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
  }

  const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaIdUsuario) return;

    setModalCarregando(true);
    try {
        const text = await decodeCsvFile(file);

        const rows = text
          .split(/\r\n|\n|\r/)
          .map(r => r.trim())
          .filter(Boolean);
        if (!rows.length) {
          setModalAviso({ titulo: "Aviso", mensagem: "Arquivo CSV vazio." });
          return;
        }

        let linhasTotais = 0;
        let linhasComCodigoNome = 0;
        let linhasSemCodigoOuNome = 0;
        let linhasDuplicadasNoArquivo = 0;
        let linhasProcessadas = 0;
        let linhasComErro = 0;
        const chavesNoArquivo = new Set<string>();

        const headerRow = rows[0];
        const delimiter = (headerRow.match(/;/g)?.length || 0) >= (headerRow.match(/,/g)?.length || 0) ? ";" : ",";
        const headers = splitCsvLine(headerRow, delimiter).map(normalizarCabecalho);

        const idxCodigo = headers.findIndex((h) => h === "codigo" || h === "cod" || h === "codigo item");
        const idxNome = headers.findIndex((h) => h === "nome" || h === "descricao" || h === "ferragem");
        const idxCores = headers.findIndex((h) => h === "cor" || h === "cores");
        const idxPreco = headers.findIndex((h) => h === "preco" || h === "valor" || h === "preco unitario");
        const idxCategoria = headers.findIndex((h) => h === "categoria" || h === "grupo");

        const dados = rows.slice(1);

        for (const row of dados) {
          linhasTotais++;
          const columns = splitCsvLine(row, delimiter);

          const codigo = columns[idxCodigo >= 0 ? idxCodigo : 0]?.trim() || "";
          let nomeOriginal = columns[idxNome >= 0 ? idxNome : 1]?.trim() || "";
          let corOriginal = columns[idxCores >= 0 ? idxCores : 2]?.trim() || "";
          const precoRaw = columns[idxPreco >= 0 ? idxPreco : 3]?.trim() || "";
          const categoriaArq = columns[idxCategoria >= 0 ? idxCategoria : 4]?.trim() || "";

          if (codigo && nomeOriginal) {
            linhasComCodigoNome++;
            // Só tenta extrair cor do nome quando NÃO existe coluna de cor no cabeçalho
            if (!corOriginal && idxCores < 0 && nomeOriginal.includes("-")) {
              const partes = nomeOriginal.split("-");
              corOriginal = partes[partes.length - 1].trim();
              nomeOriginal = partes.slice(0, -1).join("-").trim();
            }

            const chaveArquivo = `${codigo.toUpperCase().trim()}|${padronizarTexto(nomeOriginal)}|${padronizarTexto(corOriginal || "Padrão")}`;
            if (chavesNoArquivo.has(chaveArquivo)) {
              linhasDuplicadasNoArquivo++;
            } else {
              chavesNoArquivo.add(chaveArquivo);
            }

            // Tratamento de Preço
            let precoLimpo = null;
            if (precoRaw) {
              const formatado = precoRaw
                .replace(/[^\d,.-]/g, "")
                .replace(",", ".");
              precoLimpo = parseFloat(formatado);
            }

            // Envia para o Banco
            const { error } = await supabase.from("ferragens").upsert([{
              codigo: codigo.toUpperCase(),
              nome: padronizarTexto(nomeOriginal),
              cores: corOriginal ? padronizarTexto(corOriginal) : "Padrão",
              preco: isNaN(precoLimpo as number) ? null : precoLimpo,
              categoria: padronizarTexto(categoriaArq) || "Ferragens",
              empresa_id: empresaIdUsuario
            }], {
              onConflict: 'codigo,nome,cores' // Evita duplicar se código e cor forem iguais
            });

            if (error) {
              linhasComErro++;
              console.error("Erro ao importar linha de ferragem:", error.message, { codigo, nomeOriginal, corOriginal });
            } else {
              linhasProcessadas++;
            }
          } else {
            linhasSemCodigoOuNome++;
          }
        }

        await carregarDados(empresaIdUsuario);
        setModalAviso({
          titulo: "Importação concluída",
          mensagem:
            `Linhas no arquivo: ${linhasTotais}\n` +
            `Com código e nome: ${linhasComCodigoNome}\n` +
            `Ignoradas (sem código/nome): ${linhasSemCodigoOuNome}\n` +
            `Duplicadas no arquivo: ${linhasDuplicadasNoArquivo}\n` +
            `Processadas no banco: ${linhasProcessadas}\n` +
            `Com erro: ${linhasComErro}`,
        });
      } catch (err: unknown) {
        console.error(err);
        setModalAviso({ titulo: "Erro", mensagem: "Falha ao processar arquivo." });
      } finally {
        setModalCarregando(false);
        event.target.value = "";
      }
  };

  const eliminarDuplicados = () => {
    setModalAviso({
      titulo: "Eliminar Duplicados",
      mensagem: "Remover ferragens com mesmo CÓDIGO e COR?",
      confirmar: async () => {
        const jaVistos = new Set();
        const idsDeletar: string[] = [];
        const ordenadas = [...ferragens].sort((a, b) => a.id.localeCompare(b.id));
        ordenadas.forEach(f => {
          const chave = `${f.codigo.toLowerCase()}-${f.cores.toLowerCase()}`;
          if (jaVistos.has(chave)) idsDeletar.push(f.id);
          else jaVistos.add(chave);
        });
        if (idsDeletar.length > 0) {
          await supabase.from("ferragens").delete().in("id", idsDeletar);
          await carregarDados(empresaIdUsuario!);
        }
      }
    });
  }

  if (checkingAuth) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 animate-spin rounded-full" style={{ borderTopColor: 'transparent', borderRightColor: darkPrimary, borderBottomColor: darkPrimary, borderLeftColor: darkPrimary }}></div></div>;

  const gerarPDF = async () => {
    try {
      setGerandoPDF(true);

      const { pdf } = await import('@react-pdf/renderer');
      const { FerragensPDF } = await import('../../relatorios/ferragens/FerragensPDF');

      // LIMPEZA PARA O PDF FICAR BONITO:
      const dadosLimpos = ferragens.map(f => ({
        ...f,
        codigo: String(f.codigo).replace(/["\n\r]/g, '').trim(),
        nome: String(f.nome).replace(/["\n\r]/g, ' ').trim(),
        cores: String(f.cores || 'Padrão').replace(/["\n\r]/g, '').trim(),
        categoria: String(f.categoria || 'Geral').replace(/["\n\r]/g, '').trim()
      }));

      const blob = await pdf(
        <FerragensPDF
          dados={dadosLimpos}
          empresa={nomeEmpresa}
          logoUrl={logoEmpresaPdf || theme.logoLightUrl || undefined}
          coresEmpresa={{
            primary: darkPrimary,
            tertiary: darkTertiary,
            textOnDark: darkSecondary,
          }}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ferragens-${nomeEmpresa}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setModalAviso({ titulo: "Erro", mensagem: "Não foi possível gerar o PDF." });
    } finally {
      setGerandoPDF(false);
    }
  };

  const ferragensFiltradas = ferragens.filter(f => {
    const termo = filtroNome.toLowerCase();
    const matchesBusca =
      f.nome.toLowerCase().includes(termo) ||
      f.codigo.toLowerCase().includes(termo) ||
      f.categoria.toLowerCase().includes(termo);
    const matchesCor = f.cores.toLowerCase().includes(filtroCor.toLowerCase());
    return matchesBusca && matchesCor;
  });

  return (
    <div className="cadastros-layout flex min-h-screen" style={{ backgroundColor: lightPrimary }}>
    <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido} 
        setExpandido={setSidebarExpandido}
      />
      {/* ----------------------------------------------------------- */}

      <div className="flex-1 flex flex-col w-full">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={usuarioEmail || ""}
          handleSignOut={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
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
                    Catálogo de ferragens
                  </h1>
                  <p className="mt-1 text-sm font-normal text-gray-500">
                    Gerencie códigos, cores, categorias e preços das ferragens.
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
                onClick={() => gerarPDF()}
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
                  onChange={importarCSV}
                />
              </label>
            </div>
            </div>
          </section>

          {/* INDICADORES */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 cards-indicadores">
            {[
              { titulo: "Total", valor: ferragens.length, icone: Layers },
              { titulo: "Com preço", valor: ferragens.filter(f => f.preco).length, icone: DollarSign },
              { titulo: "Cores", valor: new Set(ferragens.map(f => f.cores)).size, icone: Palette },
              { titulo: "Categorias", valor: new Set(ferragens.map(f => f.categoria)).size, icone: Package }
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
                  placeholder="Buscar por nome, código ou categoria..."
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
              <button onClick={() => {
                setEditando(null); setNovaFerragem({
                  codigo: "", nome: "", cores: "", preco: null, categoria: "",
                  empresa_id: empresaIdUsuario || ""
                }); setMostrarModal(true);
              }} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
                <PlusCircle size={17} /> Nova ferragem
              </button>
            </div>
          </div>
          </section>

          {/* TABELA ATUALIZADA */}
          <section className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-normal text-gray-700">Ferragens cadastradas</h2>
                <p className="mt-0.5 text-xs text-gray-400">Exibindo {ferragensFiltradas.length} de {ferragens.length} produtos</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3.5 font-normal">Código</th>
                    <th className="px-4 py-3.5 font-normal">Nome</th>
                    <th className="px-4 py-3.5 font-normal">Cor</th>
                    <th className="px-4 py-3.5 font-normal">Categoria</th>
                    <th className="px-4 py-3.5 font-normal">Preço base</th>
                    <th className="px-4 py-3.5 text-center font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ferragensFiltradas.map(f => (
                    <tr key={f.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-4 py-3.5 text-gray-600">{f.codigo}</td>
                      <td className="px-4 py-3.5 text-gray-700">{f.nome}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full border px-2.5 py-1 text-[11px] font-normal"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}33`, backgroundColor: `${darkTertiary}10` }}>
                          {f.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{f.categoria || "Geral"}</td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {f.preco ? formatarPreco(f.preco) : "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditando(f); setNovaFerragem(f); setMostrarModal(true); }} className="rounded-xl p-2.5 transition hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={17} /></button>
                          <button onClick={() => deletarFerragem(f.id)} className="rounded-xl p-2.5 text-red-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={17} /></button>
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

      <ImportarTabelaCatalogoModal
        aberto={mostrarImportador}
        tipo="ferragens"
        empresaId={empresaIdUsuario || ""}
        existentes={ferragens}
        onClose={() => setMostrarImportador(false)}
        onConcluido={async () => {
          if (empresaIdUsuario) await carregarDados(empresaIdUsuario)
        }}
      />

      {/* MODAL DE CADASTRO/EDIÇÃO (PADRÃO MINIMALISTA DISCRETO) */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
          <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] transition-all">

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                  Catálogo de ferragens
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  {editando ? "Editar Ferragem" : "Cadastrar Ferragem"}
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
                    <h3 className="text-sm font-semibold text-slate-700">Dados da ferragem</h3>
                    <p className="mt-1 text-xs text-slate-500">Use o mesmo código do fornecedor para facilitar importações.</p>
                  </div>
                  <Square size={18} className="text-slate-300" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Código do produto</label>
                  <input
                    type="text"
                    placeholder="Ex: 3530P"
                    value={novaFerragem.codigo}
                    onChange={e => setNovaFerragem({ ...novaFerragem, codigo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm uppercase text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Preto"
                    value={novaFerragem.cores}
                    onChange={e => setNovaFerragem({ ...novaFerragem, cores: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>
                  <div className="sm:col-span-2">
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Nome da ferragem *</label>
                  <input
                    type="text"
                    placeholder="Ex: Placa da fechadura"
                    value={novaFerragem.nome}
                    onChange={e => setNovaFerragem({ ...novaFerragem, nome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Categoria</label>
                  <input
                    type="text"
                    value={novaFerragem.categoria}
                    onChange={e => setNovaFerragem({ ...novaFerragem, categoria: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                  />
                </div>

                  <div>
                    <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Preço base</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition-all focus-within:border-transparent focus-within:ring-2"
                      style={{ "--tw-ring-color": `${darkTertiary}55` } as React.CSSProperties}
                    >
                      <span className="mr-2 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novaFerragem.preco ?? ""}
                    onChange={e => setNovaFerragem({ ...novaFerragem, preco: e.target.value ? Number(e.target.value) : null })}
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
              <button
                onClick={() => setMostrarModal(false)}
                className="rounded-2xl bg-slate-100 px-7 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={salvarFerragem}
                disabled={carregando}
                className="rounded-2xl px-8 py-3 text-sm font-semibold shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: darkTertiary, color: "#FFFFFF" }}
              >
                {carregando ? "Processando..." : (editando ? "Atualizar" : "Salvar Ferragem")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOADING PARA O PDF */}
      {gerandoPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderTopColor: 'transparent', borderRightColor: darkTertiary, borderBottomColor: darkTertiary, borderLeftColor: darkTertiary }}>
            </div>
            <p className="text-sm font-semibold text-gray-700" style={{ color: darkPrimary }}>
              Gerando seu Catálogo...
            </p>
            <span className="text-xs text-gray-400">Isso pode levar alguns segundos</span>
          </div>
        </div>
      )}

      {/* AVISOS E LOADING */}
      {modalCarregando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-700 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            Processando CSV...
          </div>
        </div>
      )}
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

