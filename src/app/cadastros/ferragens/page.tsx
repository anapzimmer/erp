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
  DollarSign, ArrowUp
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/ThemeContext";
import type { Ferragem } from "@/types/ferragem"
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"

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

        <main className="cad-main-panel p-4 md:p-8 xl:p-10 flex-1 min-w-0">

          {/* HEADER SEÇÃO - FERRAGENS */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div
                className="p-4 rounded-2xl shadow-inner"
                style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}
              >
                <Wrench size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: lightTertiary }}>
                  Dashboard de Ferragens
                </h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                  Gerencie seu catálogo de ferragens e preços.
                </p>
              </div>
            </div>

            {/* AÇÕES PADRONIZADAS */}
            <div className="flex gap-2">
              {/* Botão Imprimir PDF */}
              <button
                onClick={() => gerarPDF()}
                title="Imprimir Catálogo"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center no-print"
              >
                <Printer
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4ca4db"}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
              </button>

              {/* Botão Exportar CSV */}
              <button
                onClick={exportarCSV}
                title="Exportar Planilha"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Download
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4ca4db"}
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
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4ca4db"}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
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

          {/* INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 cards-indicadores">
            {[
              { titulo: "Total", valor: ferragens.length, icone: Layers },
              { titulo: "Com Preço", valor: ferragens.filter(f => f.preco).length, icone: DollarSign },
              { titulo: "Cores", valor: new Set(ferragens.map(f => f.cores)).size, icone: Palette },
              { titulo: "Categorias", valor: new Set(ferragens.map(f => f.categoria)).size, icone: Package }
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
              {/* BUSCA GLOBAL: Nome, Código ou Categoria */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou categoria..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                />
              </div>

              {/* FILTRO DE COR SEPARADO */}
              <input
                type="text"
                placeholder="Filtrar por cor..."
                value={filtroCor}
                onChange={e => setFiltroCor(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 transition-all w-full md:w-48"
                style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
              />
            </div>

            <div className="flex items-center gap-2 no-print">
              <button onClick={eliminarDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition">
                <Trash2 size={18} /> Limpar Duplicados
              </button>
              <button onClick={() => {
                setEditando(null); setNovaFerragem({
                  codigo: "", nome: "", cores: "", preco: null, categoria: "",
                  empresa_id: empresaIdUsuario || ""
                }); setMostrarModal(true);
              }} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs tracking-wider shadow-sm transition-all duration-300 hover:scale-105 active:scale-95" style={{ backgroundColor: darkTertiary, color: darkPrimary }}>
                <PlusCircle size={18} /> Nova Ferragem
              </button>
            </div>
          </div>

          {/* TABELA ATUALIZADA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse">
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 text-xs uppercase tracking-widest">Código</th>
                  <th className="p-4 text-xs uppercase tracking-widest">Nome</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Cor</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Categoria</th>
                  <th className="p-4 text-xs uppercase tracking-widest ">Preço</th>
                  <th className="p-4 text-xs uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ferragens
                  .filter(f => {
                    const termo = filtroNome.toLowerCase();
                    // Busca no Nome, no Código ou na Categoria
                    const matchesBusca =
                      f.nome.toLowerCase().includes(termo) ||
                      f.codigo.toLowerCase().includes(termo) ||
                      f.categoria.toLowerCase().includes(termo);

                    // Filtro de Cor (separado)
                    const matchesCor = f.cores.toLowerCase().includes(filtroCor.toLowerCase());

                    return matchesBusca && matchesCor;
                  })
                  .map(f => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-500 font-medium">{f.codigo}</td>
                      <td className="p-4">
                        <span className="p-4 text-gray-500 font-medium" style={{ color: lightTertiary }}>{f.nome}</span>
                      </td>
                      <td className="p-4">
                        {/* Padronização visual da cor com a cor do sistema (darkTertiary) */}
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                          style={{ color: darkTertiary, borderColor: `${darkTertiary}44`, backgroundColor: `${darkTertiary}11` }}>
                          {f.cores || "Padrão"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-medium">{f.categoria || "Geral"}</td>
                      <td className="p-4 text-gray-500 font-medium" style={{ color: darkPrimary }}>
                        {f.preco ? formatarPreco(f.preco) : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setEditando(f); setNovaFerragem(f); setMostrarModal(true); }} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }}><Edit2 size={18} /></button>
                          <button onClick={() => deletarFerragem(f.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO (PADRÃO MINIMALISTA DISCRETO) */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] z-50 animate-fade-in px-4">
          <div className="bg-white rounded-2xl p-7 shadow-xl w-full max-w-lg border border-gray-100">

            {/* Cabeçalho alinhado ao tema */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: darkPrimary }}>
                  {editando ? "Editar Ferragem" : "Nova Ferragem"}
                </h2>
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
              {/* Grid 1: Identificação */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Código</label>
                  <input
                    type="text"
                    value={novaFerragem.codigo}
                    onChange={e => setNovaFerragem({ ...novaFerragem, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Nome do Produto</label>
                  <input
                    type="text"
                    value={novaFerragem.nome}
                    onChange={e => setNovaFerragem({ ...novaFerragem, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Grid 2: Especificações */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Cores</label>
                  <input
                    type="text"
                    value={novaFerragem.cores}
                    onChange={e => setNovaFerragem({ ...novaFerragem, cores: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoria</label>
                  <input
                    type="text"
                    value={novaFerragem.categoria}
                    onChange={e => setNovaFerragem({ ...novaFerragem, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Preço de Venda */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Preço de Venda</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={novaFerragem.preco ?? ""}
                    onChange={e => setNovaFerragem({ ...novaFerragem, preco: e.target.value ? Number(e.target.value) : null })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Ações Inferiores com o Tema Glass Code */}
            <div className="flex justify-end items-center gap-3 mt-8 pt-6 border-t border-gray-50">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-all"
              >
                Descartar
              </button>
              <button
                onClick={salvarFerragem}
                disabled={carregando}
                className="px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: darkTertiary, color: darkPrimary }}
              >
                {carregando ? "Salvando..." : (editando ? "Salvar Alterações" : "Cadastrar Ferragem")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOADING PARA O PDF */}
      {gerandoPDF && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
            {/* Círculo de loading animado com a cor do seu sistema */}
            <div className="w-12 h-12 border-4 animate-spin rounded-full"
              style={{ borderTopColor: 'transparent', borderRightColor: darkTertiary, borderBottomColor: darkTertiary, borderLeftColor: darkTertiary }}>
            </div>
            <p className="font-bold text-gray-700" style={{ color: darkPrimary }}>
              Gerando seu Catálogo...
            </p>
            <span className="text-xs text-gray-400">Isso pode levar alguns segundos</span>
          </div>
        </div>
      )}

      {/* AVISOS E LOADING */}
      {modalCarregando && <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><div className="bg-white p-8 rounded-3xl animate-bounce">Processando CSV...</div></div>}
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