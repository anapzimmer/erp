"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, PanelsTopLeft, Ruler, SquareStack, Package2, Printer, Save, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { formatarPreco } from "@/utils/formatarPreco";
import { calcularSacadaFrontal } from "@/utils/sacada-frontal-calc";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { SacadaFrontalPDF } from "@/app/relatorios/sacadafrontal/SacadaFrontalPDF";

type ClienteSacada = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
};

type Vidro = {
  id: string;
  nome: string;
  espessura?: string | null;
  tipo?: string | null;
  preco: number;
  empresa_id?: string;
};

type PerfilTabela = {
  id: string;
  codigo: string;
  nome: string;
  cores?: string | null;
  preco?: number | null;
  empresa_id?: string;
};

type FerragemTabela = {
  id: string;
  codigo: string;
  nome: string;
  cores?: string | null;
  preco?: number | null;
  empresa_id?: string;
};

const CORES_PERFIL = ["Branco", "Preto", "Fosco"];

const normalizarTextoComparacao = (texto?: string | null) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const atendeCor = (coresItem?: string | null, corSelecionada?: string) => {
  const cor = normalizarTextoComparacao(corSelecionada);
  const cores = normalizarTextoComparacao(coresItem);

  if (!cor) {
    return true;
  }

  if (!cores) {
    return true;
  }

  return cores.includes(cor);
};

const formatarNumero = (valor: number, casasDecimais = 3) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais,
  });

const normalizarNumeroInteiro = (valor: string) => Number(valor.replace(/\D/g, "")) || 0;

const montarDescricaoVidro = (vidro?: Vidro | null) => {
  if (!vidro) {
    return "Vidro nao selecionado";
  }

  return [vidro.nome, vidro.espessura, vidro.tipo]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" - ");
};

const normalizarNomeAcessorio = (nome: string) =>
  normalizarTextoComparacao(nome)
    .replace(/1\/4/g, "")
    .replace(/3\/4/g, "")
    .replace(/3\/8/g, "")
    .replace(/x\s*5\/8/g, "")
    .replace(/\s+/g, " ")
    .trim();

export default function CalculoSacadaFrontalPage() {
  const { theme } = useTheme();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  const [listaClientes, setListaClientes] = useState<ClienteSacada[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [clienteIndex, setClienteIndex] = useState(-1);
  const [obra, setObra] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState("");

  const [larguraVaoMm, setLarguraVaoMm] = useState("7800");
  const [alturaVaoMm, setAlturaVaoMm] = useState("1100");
  const [quantidadeVaos, setQuantidadeVaos] = useState("1");
  const [quantidadeDivisoesLargura, setQuantidadeDivisoesLargura] = useState("8");
  const [vidros, setVidros] = useState<Vidro[]>([]);
  const [perfisTabela, setPerfisTabela] = useState<PerfilTabela[]>([]);
  const [ferragensTabela, setFerragensTabela] = useState<FerragemTabela[]>([]);
  const [buscaVidro, setBuscaVidro] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [corPerfil, setCorPerfil] = useState(CORES_PERFIL[0]);
  const [carregandoInsumos, setCarregandoInsumos] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregarInsumos = async () => {
      if (!empresaId) {
        if (ativo) {
          setVidros([]);
          setPerfisTabela([]);
          setFerragensTabela([]);
          setCarregandoInsumos(false);
        }
        return;
      }

      setCarregandoInsumos(true);

      const [resVidros, resPerfis, resFerragens, resClientes] = await Promise.all([
        supabase.from("vidros").select("*").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("perfis").select("id, codigo, nome, cores, preco, empresa_id").eq("empresa_id", empresaId).order("codigo", { ascending: true }),
        supabase.from("ferragens").select("id, codigo, nome, cores, preco, empresa_id").eq("empresa_id", empresaId).order("nome", { ascending: true }),
        supabase.from("clientes").select("id, nome, grupo_preco_id").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      ]);

      if (!ativo) {
        return;
      }

      if (resVidros.error || resPerfis.error || resFerragens.error) {
        if (resVidros.error) {
          console.error("Erro ao carregar vidros da sacada frontal:", resVidros.error);
        }
        if (resPerfis.error) {
          console.error("Erro ao carregar perfis da sacada frontal:", resPerfis.error);
        }
        if (resFerragens.error) {
          console.error("Erro ao carregar ferragens da sacada frontal:", resFerragens.error);
        }
        setVidros([]);
        setPerfisTabela([]);
        setFerragensTabela([]);
        setCarregandoInsumos(false);
        return;
      }

      setVidros((resVidros.data || []) as Vidro[]);
      setPerfisTabela((resPerfis.data || []) as PerfilTabela[]);
      setFerragensTabela((resFerragens.data || []) as FerragemTabela[]);
      if (resClientes.data) setListaClientes(resClientes.data as ClienteSacada[]);
      setCarregandoInsumos(false);
    };

    carregarInsumos();

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  useEffect(() => {
    if (!vidros.length) {
      if (vidroId) {
        setVidroId("");
      }
      return;
    }

    if (!vidros.some((vidro) => vidro.id === vidroId)) {
      setVidroId(vidros[0].id);
    }
  }, [vidroId, vidros]);

  const vidroSelecionado = useMemo(
    () => vidros.find((vidro) => vidro.id === vidroId) || null,
    [vidroId, vidros]
  );

  const vidrosFiltrados = useMemo(() => {
    const termo = buscaVidro.trim().toLowerCase();

    if (!termo) {
      return vidros;
    }

    return vidros.filter((vidro) => {
      const textoBusca = [vidro.nome, vidro.espessura, vidro.tipo, String(vidro.preco)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return textoBusca.includes(termo);
    });
  }, [buscaVidro, vidros]);

  useEffect(() => {
    if (!vidrosFiltrados.length) {
      return;
    }

    if (!vidrosFiltrados.some((vidro) => vidro.id === vidroId)) {
      setVidroId(vidrosFiltrados[0].id);
    }
  }, [vidroId, vidrosFiltrados]);

  const larguraNumero = normalizarNumeroInteiro(larguraVaoMm);
  const alturaNumero = normalizarNumeroInteiro(alturaVaoMm);
  const quantidadeNumero = Math.max(Number(quantidadeVaos) || 0, 0);
  const quantidadeDivisoesNumero = Math.max(Number(quantidadeDivisoesLargura) || 0, 1);

  const resultado = useMemo(
    () => calcularSacadaFrontal({
      larguraVaoMm: larguraNumero,
      alturaVaoMm: alturaNumero,
      quantidadeVaos: quantidadeNumero,
      quantidadeDivisoesLargura: quantidadeDivisoesNumero,
      precoVidroM2: Number(vidroSelecionado?.preco) || 0,
      vidroDescricao: montarDescricaoVidro(vidroSelecionado),
    }),
    [alturaNumero, larguraNumero, quantidadeDivisoesNumero, quantidadeNumero, vidroSelecionado]
  );

  const perfisComPrecoTabela = useMemo(() => {
    return resultado.perfis.map((perfilResultado) => {
      const corSelecionada = normalizarTextoComparacao(corPerfil);
      const perfilDaTabela = perfisTabela.find((perfilTabela) => {
        const mesmoCodigo = normalizarTextoComparacao(perfilTabela.codigo) === normalizarTextoComparacao(perfilResultado.codigo);
        if (!mesmoCodigo) {
          return false;
        }

        return atendeCor(perfilTabela.cores, corSelecionada);
      }) || perfisTabela.find((perfilTabela) =>
        normalizarTextoComparacao(perfilTabela.codigo) === normalizarTextoComparacao(perfilResultado.codigo)
      );

      const precoBarra = Number(perfilDaTabela?.preco) || perfilResultado.precoBarra;

      return {
        ...perfilResultado,
        nome: perfilDaTabela?.nome || perfilResultado.nome,
        corEncontrada: perfilDaTabela?.cores || corPerfil,
        precoBarra,
        valorTotal: Number((precoBarra * perfilResultado.quantidadeBarras).toFixed(2)),
      };
    });
  }, [corPerfil, perfisTabela, resultado.perfis]);

  const acessoriosComPrecoTabela = useMemo(() => {
    const pontoDivisao = (quantidadeDivisoesNumero + 1) * quantidadeNumero;
    const guarnicaoMm = (resultado.larguraVidroMm * 2 + 50) * resultado.quantidadeTotalVidros;

    const regras = [
      { nome: "Canopla", codigo: "CAN625", quantidade: pontoDivisao },
      { nome: "Chumbador", codigo: "CHU842", quantidade: pontoDivisao },
      { nome: "Suporte fixacao corrimao", codigo: "SUP626", quantidade: pontoDivisao },
      { nome: "Suporte fixacao vidro", codigo: "SUP627", quantidade: pontoDivisao },
      { nome: "Parafuso 1/4 x 5/8", codigo: "PAR656", quantidade: pontoDivisao, pacote: 100 },
      { nome: "Porca 1/4", codigo: "POR517", quantidade: pontoDivisao, pacote: 100 },
      { nome: "Tampa nylon 3/4", codigo: "NYL314", quantidade: pontoDivisao, pacote: 100 },
      { nome: "Tapa furo 3/8", codigo: "NYL042", quantidade: quantidadeDivisoesNumero * 3 * quantidadeNumero, pacote: 100 },
      { nome: "Guarnicao", codigo: "GUA033", quantidade: Number((guarnicaoMm / 1000).toFixed(2)), pacote: 50 },
    ];

    return regras.map(({ nome, codigo, quantidade, pacote }) => {
      const corSelecionada = normalizarTextoComparacao(corPerfil);
      const codigoNorm = normalizarTextoComparacao(codigo);
      const nomeNormalizado = normalizarNomeAcessorio(nome);

      const ferragem =
        ferragensTabela.find((item) =>
          normalizarTextoComparacao(item.codigo) === codigoNorm && atendeCor(item.cores, corSelecionada)
        ) ||
        ferragensTabela.find((item) =>
          normalizarTextoComparacao(item.codigo) === codigoNorm
        ) ||
        ferragensTabela.find((item) => {
          const nomeItem = normalizarNomeAcessorio(item.nome);
          return (nomeItem.includes(nomeNormalizado) || nomeNormalizado.includes(nomeItem)) && atendeCor(item.cores, corSelecionada);
        }) ||
        ferragensTabela.find((item) => {
          const nomeItem = normalizarNomeAcessorio(item.nome);
          return nomeItem.includes(nomeNormalizado) || nomeNormalizado.includes(nomeItem);
        });

      const precoUnitario = Number(ferragem?.preco) || 0;
      const quantidadeNecessaria = Number(quantidade) || 0;
      const quantidadePacote = pacote
        ? Math.ceil(quantidadeNecessaria / pacote) * pacote
        : quantidadeNecessaria;

      return {
        nome: ferragem?.nome || nome,
        codigo: ferragem?.codigo || codigo,
        corEncontrada: ferragem?.cores || corPerfil,
        quantidade: quantidadeNecessaria,
        quantidadePacote: pacote ? quantidadePacote : undefined,
        pacote,
        precoUnitario,
        valorTotal: Number((quantidadePacote * precoUnitario).toFixed(2)),
      };
    });
  }, [corPerfil, ferragensTabela, quantidadeDivisoesNumero, quantidadeNumero, resultado.larguraVidroMm, resultado.quantidadeTotalVidros]);

  const totalPerfisCalculado = useMemo(
    () => Number(perfisComPrecoTabela.reduce((acc, perfil) => acc + perfil.valorTotal, 0).toFixed(2)),
    [perfisComPrecoTabela]
  );

  const totalAcessoriosCalculado = useMemo(
    () => Number(acessoriosComPrecoTabela.reduce((acc, acessorio) => acc + acessorio.valorTotal, 0).toFixed(2)),
    [acessoriosComPrecoTabela]
  );

  const totalGeralCalculado = useMemo(
    () => Number((resultado.totalVidro + totalPerfisCalculado + totalAcessoriosCalculado).toFixed(2)),
    [resultado.totalVidro, totalPerfisCalculado, totalAcessoriosCalculado]
  );

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return listaClientes;
    return listaClientes.filter((c) => c.nome?.toLowerCase().includes(termo));
  }, [buscaCliente, listaClientes]);

  const nomeClienteSelecionado = useMemo(
    () => listaClientes.find((c) => String(c.id) === String(clienteId))?.nome || "",
    [clienteId, listaClientes]
  );

  const handleSalvar = async () => {
    if (salvando) return;
    setSalvando(true);
    setMensagemSalvo("");

    try {
      const dataAtual = new Date();
      const prefixoData = `SAC${dataAtual.getFullYear().toString().slice(-2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`;
      const { data: ultimos } = await supabase
        .from("orcamentos")
        .select("numero_formatado")
        .like("numero_formatado", `${prefixoData}%`)
        .order("numero_formatado", { ascending: false })
        .limit(1);

      let seq = 1;
      if (ultimos && ultimos.length > 0) {
        seq = parseInt(ultimos[0].numero_formatado.slice(-2)) + 1;
      }
      const numeroFinal = `${prefixoData}${seq.toString().padStart(2, "0")}`;

      const dadosParaSalvar = {
        numero_formatado: numeroFinal,
        cliente_nome: nomeClienteSelecionado || "Consumidor",
        obra_referencia: obra || "Geral",
        itens: {
          tipo: "sacada_frontal",
          larguraVaoMm: larguraNumero,
          alturaVaoMm: alturaNumero,
          quantidadeVaos: quantidadeNumero,
          divisoesPorVao: quantidadeDivisoesNumero,
          corPerfil,
          vidroId,
          vidroDescricao: montarDescricaoVidro(vidroSelecionado),
          perfis: perfisComPrecoTabela,
          acessorios: acessoriosComPrecoTabela,
        },
        valor_total: totalGeralCalculado,
        empresa_id: empresaId,
        metragem_total: resultado.areaTotalVidro,
        peso_total: 0,
        total_pecas: resultado.quantidadeTotalVidros,
        theme_color: theme.menuIconColor || "#1e3a5a",
      };

      const { error } = await supabase.from("orcamentos").insert([dadosParaSalvar]);
      if (error) throw error;

      setMensagemSalvo(`Orçamento ${numeroFinal} salvo com sucesso!`);
      setTimeout(() => setMensagemSalvo(""), 4000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao salvar:", error);
      setMensagemSalvo(`Erro ao salvar: ${message}`);
      setTimeout(() => setMensagemSalvo(""), 5000);
    } finally {
      setSalvando(false);
    }
  };

  if (loading || carregandoInsumos) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: theme.screenBackgroundColor }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: "transparent", borderRightColor: theme.menuIconColor, borderBottomColor: theme.menuIconColor, borderLeftColor: theme.menuIconColor }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
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
          usuarioEmail={user?.email || ""}
          handleSignOut={signOut}
        />

        <main className="p-4 md:p-8 flex-1 space-y-6">

          {/* CLIENTE / OBRA / AÇÕES */}
          <div className="rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
            {/* Cliente */}
            <div className="flex items-center gap-2 flex-1 relative">
              <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Cliente:</span>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} style={{ color: theme.contentTextLightBg }} />
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none bg-transparent"
                  style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                  value={buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); setClienteIndex(-1); }}
                  onFocus={() => setMostrarClientes(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") setClienteIndex((p) => Math.min(p + 1, clientesFiltrados.length - 1));
                    if (e.key === "ArrowUp") setClienteIndex((p) => Math.max(p - 1, 0));
                    if (e.key === "Enter") {
                      const sel = clienteIndex >= 0 ? clientesFiltrados[clienteIndex] : clientesFiltrados[0];
                      if (sel) { setBuscaCliente(sel.nome); setClienteId(String(sel.id)); setMostrarClientes(false); }
                    }
                  }}
                />
                {mostrarClientes && buscaCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 w-full border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}20` }}>
                    {clientesFiltrados.map((c, i) => (
                      <div
                        key={c.id}
                        className="px-4 py-2 text-xs cursor-pointer"
                        style={{
                          backgroundColor: i === clienteIndex ? `${theme.menuIconColor}18` : "transparent",
                          color: theme.contentTextLightBg,
                          fontWeight: i === clienteIndex ? 700 : 400,
                        }}
                        onClick={() => { setBuscaCliente(c.nome); setClienteId(String(c.id)); setMostrarClientes(false); }}
                      >
                        {c.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Obra */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: `${theme.contentTextLightBg}80` }}>Obra:</span>
              <input
                type="text"
                placeholder="Identificação da obra"
                className="flex-1 py-2 px-3 rounded-xl border text-sm outline-none bg-transparent"
                style={{ borderColor: `${theme.contentTextLightBg}20`, color: theme.contentTextLightBg }}
                value={obra}
                onChange={(e) => setObra(e.target.value)}
              />
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                style={{ backgroundColor: theme.menuIconColor, color: "#fff" }}
              >
                {salvando ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar
              </button>

              <PDFDownloadLink
                document={
                  <SacadaFrontalPDF
                    nomeEmpresa={nomeEmpresa}
                    logoUrl={theme.logoLightUrl || undefined}
                    themeColor={theme.contentTextLightBg}
                    nomeCliente={nomeClienteSelecionado || "Não selecionado"}
                    nomeObra={obra || "Geral"}
                    larguraVaoMm={larguraNumero}
                    alturaVaoMm={alturaNumero}
                    quantidadeVaos={quantidadeNumero}
                    divisoesPorVao={quantidadeDivisoesNumero}
                    corPerfil={corPerfil}
                    vidroDescricao={montarDescricaoVidro(vidroSelecionado)}
                    medidaVidro={`${resultado.larguraVidroMm} x ${resultado.alturaVidroMm} mm`}
                    areaTotal={resultado.areaTotalVidro}
                    totalVidro={resultado.totalVidro}
                    perfis={perfisComPrecoTabela}
                    acessorios={acessoriosComPrecoTabela}
                    totalPerfis={totalPerfisCalculado}
                    totalAcessorios={totalAcessoriosCalculado}
                    totalGeral={totalGeralCalculado}
                  />
                }
                fileName={`Sacada Frontal ${nomeClienteSelecionado || "Geral"} - ${Date.now().toString().slice(-6)}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <button
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 border shadow-sm"
                    style={{ borderColor: `${theme.contentTextLightBg}30`, color: theme.contentTextLightBg }}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <Printer size={16} />
                    )}
                    PDF
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            {mensagemSalvo && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${mensagemSalvo.includes("Erro") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {mensagemSalvo}
              </span>
            )}
          </div>

          <section className="rounded-4xl border p-6 md:p-8 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: `${theme.menuIconColor}12`, color: theme.menuIconColor }}>
                  <PanelsTopLeft size={14} />
                  Sacada Frontal
                </div>
                <h1 className="mt-4 text-3xl md:text-5xl font-black leading-none" style={{ color: theme.contentTextLightBg }}>
                  Cálculo de orçamento para vidro temperado com gradil de alumínio
                </h1>
                <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: `${theme.contentTextLightBg}B3` }}>
                  Informe as dimensoes em mm, quantas pecas dividem cada vao na largura e selecione o vidro da tabela. O sistema arredonda o vidro em passos de 50 mm e calcula vidro, perfis e barras.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 w-full md:w-auto md:min-w-105">
                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Largura do vao (mm)
                  </span>
                  <input
                    value={larguraVaoMm}
                    onChange={(e) => setLarguraVaoMm(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Altura do vao (mm)
                  </span>
                  <input
                    value={alturaVaoMm}
                    onChange={(e) => setAlturaVaoMm(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Quantidade de vãos
                  </span>
                  <input
                    value={quantidadeVaos}
                    onChange={(e) => setQuantidadeVaos(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Pecas por vao na largura
                  </span>
                  <input
                    value={quantidadeDivisoesLargura}
                    onChange={(e) => setQuantidadeDivisoesLargura(e.target.value)}
                    inputMode="numeric"
                    className="mt-3 w-full bg-transparent text-2xl font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                </label>

                <label className="rounded-2xl border p-4" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Cor dos perfis
                  </span>
                  <select
                    value={corPerfil}
                    onChange={(e) => setCorPerfil(e.target.value)}
                    className="mt-3 w-full bg-transparent text-lg font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    {CORES_PERFIL.map((cor) => (
                      <option key={cor} value={cor} className="text-slate-900">
                        {cor}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-2xl border p-4 sm:col-span-2 xl:col-span-1" style={{ borderColor: `${theme.contentTextLightBg}12`, backgroundColor: theme.screenBackgroundColor }}>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: `${theme.contentTextLightBg}80` }}>
                    Vidro da tabela
                  </span>
                  <input
                    value={buscaVidro}
                    onChange={(e) => setBuscaVidro(e.target.value)}
                    placeholder="Digite para filtrar o vidro"
                    className="mt-3 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  />
                  <select
                    value={vidroId}
                    onChange={(e) => setVidroId(e.target.value)}
                    className="mt-3 w-full bg-transparent text-lg font-black outline-none"
                    style={{ color: theme.contentTextLightBg }}
                  >
                    {vidrosFiltrados.length === 0 ? (
                      <option value="" className="text-slate-900">Nenhum vidro encontrado</option>
                    ) : vidros.length === 0 ? (
                      <option value="" className="text-slate-900">Nenhum vidro cadastrado</option>
                    ) : (
                      vidrosFiltrados.map((vidro) => (
                        <option key={vidro.id} value={vidro.id} className="text-slate-900">
                          {montarDescricaoVidro(vidro)} - {formatarPreco(Number(vidro.preco) || 0)}/m2
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                titulo: "Medida de cada vidro",
                valor: `${formatarNumero(resultado.larguraVidroMm, 0)} x ${formatarNumero(resultado.alturaVidroMm, 0)} mm`,
                detalhe: `${resultado.quantidadeVidrosPorVao} vidros por vao`,
                icone: Ruler,
              },
              {
                titulo: "Área total de vidro",
                valor: `${formatarNumero(resultado.areaTotalVidro)} m²`,
                detalhe: resultado.vidroTipo,
                icone: SquareStack,
              },
              {
                titulo: "Total de vidro",
                valor: formatarPreco(resultado.totalVidro),
                detalhe: `${formatarPreco(resultado.precoVidroM2)}/m2`,
                icone: Package2,
              },
              {
                titulo: "Total geral",
                valor: formatarPreco(totalGeralCalculado),
                detalhe: "Perfis, acessorios e vidro com precos da tabela",
                icone: Calculator,
              },
            ].map((card) => (
              <article key={card.titulo} className="rounded-[1.75rem] border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: `${theme.contentTextLightBg}70` }}>
                      {card.titulo}
                    </p>
                    <p className="mt-3 text-2xl font-black leading-tight" style={{ color: theme.contentTextLightBg }}>
                      {card.valor}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: `${theme.contentTextLightBg}A3` }}>
                      {card.detalhe}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.menuIconColor}14`, color: theme.menuIconColor }}>
                    <card.icone size={22} />
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6">
            <article className="rounded-4xl border shadow-sm overflow-hidden" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>
                  Perfis de alumínio
                </h2>
                <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                  Barras calculadas com base em 6000 mm por barra.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-sm">
                  <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                    <tr>
                      <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Perfil</th>
                      <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Código</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Comprimento total</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Barras</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preço barra</th>
                      <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfisComPrecoTabela.map((perfil, index) => (
                      <tr key={perfil.codigo} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                        <td className="px-6 py-4 font-semibold" style={{ color: theme.contentTextLightBg }}>{perfil.nome}</td>
                        <td className="px-6 py-4" style={{ color: `${theme.contentTextLightBg}B3` }}>{perfil.codigo}</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarNumero(perfil.comprimentoTotal, 0)} mm</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{perfil.quantidadeBarras}</td>
                        <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarPreco(perfil.precoBarra)}</td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: theme.menuIconColor }}>{formatarPreco(perfil.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                      <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                        Total dos perfis
                      </td>
                      <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.menuIconColor }}>
                        {formatarPreco(totalPerfisCalculado)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                <div className="px-6 py-5 border-b" style={{ borderColor: `${theme.contentTextLightBg}10` }}>
                  <h3 className="text-lg font-black" style={{ color: theme.contentTextLightBg }}>
                    Acessorios
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                    Valores localizados na tabela de ferragens conforme a cor selecionada.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 text-sm">
                    <thead style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.contentTextLightBg }}>
                      <tr>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Acessorio</th>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Codigo</th>
                        <th className="text-left px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Cor</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Qtd</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Preco unit.</th>
                        <th className="text-right px-6 py-4 font-bold uppercase tracking-[0.14em] text-[11px]">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acessoriosComPrecoTabela.map((acessorio, index) => (
                        <tr key={`${acessorio.codigo}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "transparent" : `${theme.screenBackgroundColor}A6` }}>
                          <td className="px-6 py-4 font-semibold" style={{ color: theme.contentTextLightBg }}>{acessorio.nome}</td>
                          <td className="px-6 py-4" style={{ color: `${theme.contentTextLightBg}B3` }}>{acessorio.codigo}</td>
                          <td className="px-6 py-4" style={{ color: `${theme.contentTextLightBg}B3` }}>{acessorio.corEncontrada}</td>
                          <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>
                            {acessorio.quantidadePacote
                              ? <span>{acessorio.quantidadePacote} <span className="text-[10px] opacity-60">(pct {acessorio.pacote})</span></span>
                              : acessorio.quantidade}
                          </td>
                          <td className="px-6 py-4 text-right" style={{ color: theme.contentTextLightBg }}>{formatarPreco(acessorio.precoUnitario)}</td>
                          <td className="px-6 py-4 text-right font-bold" style={{ color: theme.menuIconColor }}>{formatarPreco(acessorio.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `1px solid ${theme.contentTextLightBg}14` }}>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold" style={{ color: theme.contentTextLightBg }}>
                          Total dos acessorios
                        </td>
                        <td className="px-6 py-4 text-right text-base font-black" style={{ color: theme.menuIconColor }}>
                          {formatarPreco(totalAcessoriosCalculado)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-4xl border p-6 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}10` }}>
                <h2 className="text-xl font-black" style={{ color: theme.contentTextLightBg }}>
                  Resumo técnico
                </h2>
                <div className="mt-5 space-y-4">
                  {[
                    ["Quantidade total de vidros", String(resultado.quantidadeTotalVidros)],
                    ["Pontaletes por vao", String(resultado.quantidadePontaletesPorVao)],
                    ["Área por peça", `${formatarNumero(resultado.areaVidroPorPeca)} m²`],
                    ["Vidro especificado", resultado.vidroTipo],
                    ["Cor dos perfis", corPerfil],
                    ["Medida para calculo", `${formatarNumero(resultado.larguraVidroCalculoMm, 0)} x ${formatarNumero(resultado.alturaVidroCalculoMm, 0)} mm`],
                    ["Total dos perfis", formatarPreco(totalPerfisCalculado)],
                    ["Total dos acessorios", formatarPreco(totalAcessoriosCalculado)],
                    ["Total geral", formatarPreco(totalGeralCalculado)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <span className="text-sm" style={{ color: `${theme.contentTextLightBg}8F` }}>{label}</span>
                      <span className="text-sm font-bold text-right" style={{ color: theme.contentTextLightBg }}>{value}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
