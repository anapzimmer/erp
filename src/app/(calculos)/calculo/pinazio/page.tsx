"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import { Plus, Calculator, Trash2, ReceiptText, Save, AlertTriangle, Sparkles, Printer, X, Pencil, ClipboardList } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { PDFDownloadLink } from '@react-pdf/renderer'; // Se for baixar
import { PinazioPDF } from '@/app/relatorios/pinazio/PinazioPDF'
import Header from "@/components/Header"
import MiniProjetoPinazio from "@/components/desenhos/MiniProjetoPinazio"
import { useRouter, useSearchParams } from "next/navigation";

const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_IMPRESSAO_OBRA_KEY = "glasscode:central-impressao:obra";

const criarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());


async function gerarNumeroOrcamento() {
  const hoje = new Date();
  const prefixoData = `OR${hoje.getFullYear().toString().slice(-2)}${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}`;

  const { data: ultimos, error } = await supabase
    .from("orcamentos")
    .select("numero_formatado")
    .like("numero_formatado", `${prefixoData}%`)
    .order("numero_formatado", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Erro ao buscar último número do orçamento:", error);
  }

  let sequencia = 1;

  if (ultimos && ultimos.length > 0) {
    const ultimaSequencia = Number(
      String(ultimos[0].numero_formatado || "").slice(-3)
    );

    if (Number.isFinite(ultimaSequencia)) {
      sequencia = ultimaSequencia + 1;
    }
  }

  return `${prefixoData}${String(sequencia).padStart(3, "0")}`;
}

type OpcaoPinazio = {
  id: string;
  nome: string;
  preco: number;
  cor: "branco" | "preto" | "nogal";
};

const OPCOES_PINAZIO: OpcaoPinazio[] = [
  { id: "sem-pinazio", nome: "Sem Pinázio", preco: 0, cor: "branco" },
  { id: "8x18-branco", nome: "Pinázio 8x18mm Branco", preco: 55, cor: "branco" },
  { id: "8x25-branco", nome: "Pinázio 8x25mm Branco", preco: 65, cor: "branco" },
  { id: "8x25-preto", nome: "Pinázio 8x25mm Preto", preco: 65, cor: "preto" },
  { id: "8x18-nogal", nome: "Pinázio 8x18mm Nogal", preco: 65, cor: "nogal" },
];

const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const gerarDesenhoPinazioUrl = ({
  largura,
  altura,
  divisoesLargura,
  divisoesAltura,
  cor,
}: {
  largura: number;
  altura: number;
  divisoesLargura: number;
  divisoesAltura: number;
  cor: OpcaoPinazio["cor"];
}) => {
  const larguraReal = Math.max(1, Number(largura || 1));
  const alturaReal = Math.max(1, Number(altura || 1));
  const divL = Math.max(1, Number(divisoesLargura || 1));
  const divA = Math.max(1, Number(divisoesAltura || 1));

  const larguraSvg = 600;
  const alturaSvg = 390;
  const areaMaxLargura = 470;
  const areaMaxAltura = 270;
  const escala = Math.min(
    areaMaxLargura / larguraReal,
    areaMaxAltura / alturaReal
  );

  const w = Math.max(100, larguraReal * escala);
  const h = Math.max(100, alturaReal * escala);
  const x = (larguraSvg - w) / 2;
  const y = 45 + (areaMaxAltura - h) / 2;

  const corPinazio =
    cor === "preto" ? "#222222" : cor === "nogal" ? "#79543A" : "#F8FAFC";

  const contornoPinazio =
    cor === "branco" ? "#94A3B8" : cor === "nogal" ? "#5D3C28" : "#111827";

  const linhasVerticais = Array.from(
    { length: Math.max(0, divL - 1) },
    (_, index) => {
      const linhaX = x + (w / divL) * (index + 1);

      return `<line x1="${linhaX}" y1="${y}" x2="${linhaX}" y2="${y + h}"
        stroke="${contornoPinazio}" stroke-width="7" />
      <line x1="${linhaX}" y1="${y}" x2="${linhaX}" y2="${y + h}"
        stroke="${corPinazio}" stroke-width="4" />`;
    }
  ).join("");

  const linhasHorizontais = Array.from(
    { length: Math.max(0, divA - 1) },
    (_, index) => {
      const linhaY = y + (h / divA) * (index + 1);

      return `<line x1="${x}" y1="${linhaY}" x2="${x + w}" y2="${linhaY}"
        stroke="${contornoPinazio}" stroke-width="7" />
      <line x1="${x}" y1="${linhaY}" x2="${x + w}" y2="${linhaY}"
        stroke="${corPinazio}" stroke-width="4" />`;
    }
  ).join("");

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${larguraSvg}" height="${alturaSvg}" viewBox="0 0 ${larguraSvg} ${alturaSvg}">
      <defs>
        <linearGradient id="vidro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F8FCFD"/>
          <stop offset="55%" stop-color="#DDEAF0"/>
          <stop offset="100%" stop-color="#C8DCE5"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"
        fill="url(#vidro)" stroke="#718596" stroke-width="3"/>
      <path d="M ${x + w * 0.08} ${y + h * 0.18} L ${x + w * 0.37} ${y + h * 0.05}"
        stroke="#FFFFFF" stroke-width="10" opacity="0.48" stroke-linecap="round"/>
      ${linhasVerticais}
      ${linhasHorizontais}
      <text x="${larguraSvg / 2}" y="350" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="18"
        font-weight="700" fill="#334155">
        ${Math.round(larguraReal)} x ${Math.round(alturaReal)} mm
      </text>
    </svg>
  `);
};

const numeroMedida = (valor: number) =>
  Math.round(Number(valor || 0)).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const descricaoVidroSemPrefixo = (descricao?: string) =>
  String(descricao || "Vidro").replace(/^vidro\s+/i, "").trim();

const calcularAreaItemVidro = (item: any) => {
  if (Number(item.m2 || 0) > 0) return Number(item.m2 || 0);

  const largura = Number(item.larguraReal || String(item.medidas || "").split("x")[0] || 0);
  const altura = Number(item.alturaReal || String(item.medidas || "").split("x")[1] || 0);
  const qtd = Math.max(1, Number(item.quantidade || 1));

  return (largura * altura * qtd) / 1_000_000;
};

const calcularMetroLinearPinazio = (
  largura: number,
  altura: number,
  divisoesLargura: number,
  divisoesAltura: number
) => {
  const divL = Math.max(1, Number(divisoesLargura || 1));
  const divA = Math.max(1, Number(divisoesAltura || 1));

  const linhasVerticais = Math.max(0, divL - 1);
  const linhasHorizontais = Math.max(0, divA - 1);

  return ((linhasVerticais * altura) + (linhasHorizontais * largura)) / 1000;
};

export default function CalculoPinazioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { theme } = useTheme();
  const { nomeEmpresa, user, empresaId } = useAuth();
  const carregadoRef = useRef(false);
  const draftRestauradoRef = useRef(false);
  // No topo, junto com os outros estados
  const larguraInputRef = useRef<HTMLInputElement>(null);
  const [showModalSucesso, setShowModalSucesso] = useState(false);

  // --- ESTADOS ---
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [vidrosDB, setVidrosDB] = useState<any[]>([]);
  const [vidroId, setVidroId] = useState("");
  const [acabamentoId, setAcabamentoId] = useState("8x18-branco");
  const [precoMetroPinazio, setPrecoMetroPinazio] = useState("55");
  const [listaItens, setListaItens] = useState<any[]>([]);
  const [showModalPDF, setShowModalPDF] = useState(false);
  const [showModalCentral, setShowModalCentral] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeObra, setNomeObra] = useState("");
  const [divisoesLargura, setDivisoesLargura] = useState(1);
  const [divisoesAltura, setDivisoesAltura] = useState(1);
  const [showModalSalvar, setShowModalSalvar] = useState(false)
  const [showModalAviso, setShowModalAviso] = useState(false);
  const [modalAvisoTitulo, setModalAvisoTitulo] = useState("Atenção");
  const [modalAvisoMensagem, setModalAvisoMensagem] = useState(
    "Para prosseguir, preencha o nome do cliente e adicione pelo menos um item ao Orçamento."
  );
  const draftKey = `orcamento_pinazio_draft_${empresaId || "sem_empresa"}_${editId || "novo"}`;

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const carregarDados = async () => {
      const { data: vData, error: vidroError } = await supabase
        .from("vidros")
        .select("*")
        .order("nome");

      if (vidroError) {
        console.error("Erro ao carregar vidros:", vidroError);
        return;
      }

      if (vData && vData.length > 0) {
        setVidrosDB(vData);
        setVidroId(String(vData[0].id));
      }
    };

    carregarDados();
  }, []);

  const buscarOrcamentoParaEdicao = async (id: string) => {
    try {
      const { data: orcamento, error } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!orcamento) return;

      setNomeCliente(orcamento.cliente_nome || "");
      setNomeObra(orcamento.obra_referencia || "");
      setUltimoNumeroGerado(orcamento.numero_formatado || "");

      if (Array.isArray(orcamento.itens)) {
        setListaItens(orcamento.itens);
      }
    } catch (error) {
      console.error("Erro ao carregar Orçamento de Pinázio para edição:", error);
    }
  };

  useEffect(() => {
    if (!editId || carregadoRef.current || vidrosDB.length === 0) return;

    buscarOrcamentoParaEdicao(editId);
    carregadoRef.current = true;
  }, [editId, vidrosDB.length]);

  useEffect(() => {
    if (!empresaId || draftRestauradoRef.current) return;

    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) {
        draftRestauradoRef.current = true;
        return;
      }

      const draft = JSON.parse(raw);
      setNomeCliente(draft.nomeCliente || "");
      setNomeObra(draft.nomeObra || "");
      setLargura(draft.largura || "");
      setAltura(draft.altura || "");
      setQuantidade(Number(draft.quantidade) > 0 ? Number(draft.quantidade) : 1);
      setDivisoesLargura(Number(draft.divisoesLargura) > 0 ? Number(draft.divisoesLargura) : 1);
      setDivisoesAltura(Number(draft.divisoesAltura) > 0 ? Number(draft.divisoesAltura) : 1);

      if (Array.isArray(draft.listaItens)) {
        setListaItens(draft.listaItens);
      }

      if (draft.vidroId) setVidroId(String(draft.vidroId));
      if (draft.acabamentoId) {
        const opcao = OPCOES_PINAZIO.find(
          (item) => item.id === String(draft.acabamentoId)
        );

        if (opcao) {
          setAcabamentoId(opcao.id);
          setPrecoMetroPinazio(
            String(draft.precoMetroPinazio ?? opcao.preco)
          );
        }
      }
    } catch (error) {
      console.error("Erro ao restaurar rascunho de Pinázio:", error);
    } finally {
      draftRestauradoRef.current = true;
    }
  }, [empresaId, draftKey]);

  useEffect(() => {
    if (!empresaId) return;

    const temDadosNaoSalvos =
      listaItens.length > 0 ||
      !!nomeCliente ||
      !!nomeObra ||
      !!largura ||
      !!altura;

    if (!temDadosNaoSalvos) {
      sessionStorage.removeItem(draftKey);
      return;
    }

    const payload = {
      nomeCliente,
      nomeObra,
      largura,
      altura,
      quantidade,
      divisoesLargura,
      divisoesAltura,
      vidroId,
      acabamentoId,
      precoMetroPinazio,
      listaItens,
      updatedAt: Date.now(),
    };

    sessionStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    empresaId,
    draftKey,
    nomeCliente,
    nomeObra,
    largura,
    altura,
    quantidade,
    divisoesLargura,
    divisoesAltura,
    vidroId,
    acabamentoId,
    precoMetroPinazio,
    listaItens,
  ]);

  useEffect(() => {
    const temDadosNaoSalvos =
      listaItens.length > 0 ||
      !!nomeCliente ||
      !!nomeObra ||
      !!largura ||
      !!altura;

    if (!temDadosNaoSalvos) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [listaItens.length, nomeCliente, nomeObra, largura, altura]);

  const handleLogout = async () => {
    try {
      // 1. Faz o logout no Supabase
      await supabase.auth.signOut();

      // 2. Redireciona o usuário para a página de login (ou home)
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // --- CÁLCULO DO VIDRO + PINÁZIO ---
  const calculoAtual = useMemo(() => {
    const lOriginal = parseFloat(largura) || 0;
    const aOriginal = parseFloat(altura) || 0;
    const vidro = vidrosDB.find(v => String(v.id) === String(vidroId));
    const pinazio = OPCOES_PINAZIO.find(
      (item) => item.id === acabamentoId
    );

    const semPinazio = acabamentoId === "sem-pinazio";
    const divisoesL = semPinazio
      ? 1
      : Math.max(1, Number(divisoesLargura));
    const divisoesA = semPinazio
      ? 1
      : Math.max(1, Number(divisoesAltura));

    if (!vidro || lOriginal <= 0 || aOriginal <= 0) {
      return {
        m2: 0,
        metroLinearPinazio: 0,
        valorVidro: 0,
        valorPinazio: 0,
        total: 0,
      };
    }

    // O vidro permanece inteiro. Mantém o arredondamento padrão de 50 mm.
    const lCalc = Math.ceil(lOriginal / 50) * 50;
    const aCalc = Math.ceil(aOriginal / 50) * 50;
    const areaVidroM2 = (lCalc * aCalc) / 1_000_000;
    const valorVidroUnitario = areaVidroM2 * Number(vidro.preco || 0);

    // As divisões são usadas apenas para calcular as linhas internas do Pinázio.
    const metroLinearUnitario = semPinazio
      ? 0
      : calcularMetroLinearPinazio(
          lOriginal,
          aOriginal,
          divisoesL,
          divisoesA
        );

    const precoMetroInformado = semPinazio
      ? 0
      : Math.max(
          0,
          parseFloat(String(precoMetroPinazio).replace(",", ".")) || 0
        );

    const quantidadeValida = Math.max(1, Number(quantidade) || 1);
    const valorPinazioUnitario =
      metroLinearUnitario * precoMetroInformado;

    const valorVidroTotal = valorVidroUnitario * quantidadeValida;
    const valorPinazioTotal = valorPinazioUnitario * quantidadeValida;
    const valorItemTotal = valorVidroTotal + valorPinazioTotal;

    return {
      m2: areaVidroM2 * quantidadeValida,
      metroLinearPinazio: metroLinearUnitario * quantidadeValida,
      metroLinearPinazioUnitario: metroLinearUnitario,
      precoMetroPinazio: precoMetroInformado,
      valorVidroUnitario,
      valorPinazioUnitario,
      valorVidro: valorVidroTotal,
      valorPinazio: valorPinazioTotal,
      total: valorItemTotal,
    };
  }, [
    largura,
    altura,
    quantidade,
    vidroId,
    acabamentoId,
    vidrosDB,
    precoMetroPinazio,
    divisoesLargura,
    divisoesAltura,
  ]);

  const [ultimoNumeroGerado, setUltimoNumeroGerado] = useState("");

  const adicionarAoPedido = () => {
    if (calculoAtual.total === 0) return;

    const vSel = vidrosDB.find(v => String(v.id) === String(vidroId));
    const pinazioSelecionado =
      OPCOES_PINAZIO.find((item) => item.id === acabamentoId) ||
      OPCOES_PINAZIO[0];

    const semPinazio = pinazioSelecionado.id === "sem-pinazio";
    const divisoesItemLargura = semPinazio ? 1 : divisoesLargura;
    const divisoesItemAltura = semPinazio ? 1 : divisoesAltura;

    const desenhoUrl = gerarDesenhoPinazioUrl({
      largura: Number(largura),
      altura: Number(altura),
      divisoesLargura: divisoesItemLargura,
      divisoesAltura: divisoesItemAltura,
      cor: pinazioSelecionado.cor,
    });

    const descricaoFinal = semPinazio
      ? `${vSel?.nome || "Vidro"} ${vSel?.espessura || ""} ${vSel?.tipo || ""}`
      : `${vSel?.nome || "Vidro"} ${vSel?.espessura || ""} ${vSel?.tipo || ""} - ${pinazioSelecionado.nome}`
      .replace(/\s+/g, " ")
      .trim();

    setListaItens([...listaItens, {
      id: Date.now(),
      descricao: descricaoFinal,
      medidas: `${largura}x${altura}`,
      largura: Number(largura),
      altura: Number(altura),
      larguraReal: Number(largura),
      alturaReal: Number(altura),
      quantidade,
      m2: calculoAtual.m2,
      divisoesLargura,
      divisoesAltura,
      metroLinearPinazio: calculoAtual.metroLinearPinazioUnitario,
      metroLinearPinazioTotal: calculoAtual.metroLinearPinazio,
      pinazioId: pinazioSelecionado.id,
      pinazioNome: pinazioSelecionado.nome,
      pinazioCor: pinazioSelecionado.cor,
      precoMetroPinazio: semPinazio
        ? 0
        : Math.max(
            0,
            Number(String(precoMetroPinazio).replace(",", ".")) || 0
          ),
      designUrl: desenhoUrl,
      desenhoUrl,
      valorVidro: calculoAtual.valorVidro,
      valorPinazio: calculoAtual.valorPinazio,
      total: calculoAtual.total,
    }]);

    setLargura("");
    setAltura("");
    setQuantidade(1);

    setTimeout(() => {
      larguraInputRef.current?.focus();
    }, 10);
  };

  const enviarParaCentralImpressao = () => {
    if (listaItens.length === 0) {
      setModalAvisoTitulo("Atenção");
      setModalAvisoMensagem("Adicione pelo menos um item antes de enviar para a central de impressão.");
      setShowModalAviso(true);
      return;
    }

    const totalPecas = listaItens.reduce(
      (total, item) => total + Math.max(1, Number(item.quantidade || 1)),
      0
    );
    const areaTotal = listaItens.reduce(
      (total, item) => total + calcularAreaItemVidro(item),
      0
    );
    const valorTotal = listaItens.reduce(
      (total, item) => total + Number(item.total || 0),
      0
    );

    const vidrosAvulsos = listaItens.map((item) => ({
      id: criarId(),
      quantidade: Math.max(1, Number(item.quantidade || 1)),
      medida: `${numeroMedida(item.larguraReal)}x${numeroMedida(item.alturaReal)}`,
      vidro: descricaoVidroSemPrefixo(item.descricao),
      valorTotal: Number(item.total || 0),
    }));

    const materiais = listaItens.flatMap((item) => {
      const area = calcularAreaItemVidro(item);
      const qtd = Math.max(1, Number(item.quantidade || 1));
      const metroLinear = Number(item.metroLinearPinazioTotal || 0);
      const vidroDescricao = descricaoVidroSemPrefixo(item.descricao);

      const materialVidro = {
        id: criarId(),
        qtd: Number(area.toFixed(3)),
        unidade: "m2",
        descricao: `VIDRO ${item.medidas} ${vidroDescricao}`.toUpperCase(),
        valorUnitario: area > 0 ? Number(item.valorVidro || 0) / area : 0,
      };

      if (
        item.pinazioId === "sem-pinazio" ||
        metroLinear <= 0 ||
        Number(item.valorPinazio || 0) <= 0
      ) {
        return [materialVidro];
      }

      return [
        materialVidro,
        {
          id: criarId(),
          qtd: Number(metroLinear.toFixed(3)),
          unidade: "ml",
          descricao: `${item.pinazioNome || "PINÁZIO"} - ${item.divisoesLargura} X ${item.divisoesAltura} - ${qtd} PEÇA(S)`.toUpperCase(),
          valorUnitario: Number(item.precoMetroPinazio || 0),
        },
      ];
    });

    const medidasDetalhadas = listaItens
      .map((item, index) =>
        item.pinazioId === "sem-pinazio"
          ? `${index + 1}. ${item.quantidade} peça(s) - ${item.medidas} mm - Sem Pinázio`
          : `${index + 1}. ${item.quantidade} peça(s) - ${item.medidas} mm - ${item.pinazioNome || "Pinázio"} - divisões ${item.divisoesLargura} x ${item.divisoesAltura} - ${Number(item.metroLinearPinazioTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ml`
      )
      .join("\n");

    const itemCentral = {
      id: criarId(),
      numero: ultimoNumeroGerado || "novo",
      projeto: "Vidros com Pinázio",
      cliente: nomeCliente,
      medidas: `${totalPecas} peça(s) | ${areaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      largura: 0,
      altura: 0,
      quantidade: 1,
      modo: "Pinázio",
      desenhoUrl:
        listaItens.length === 1
          ? String(listaItens[0].designUrl || listaItens[0].desenhoUrl || "")
          : "",
      vidro: "Conforme relação",
      corKit: "",
      corPerfil: "",
      trilho: "",
      puxador: "",
      tamanhoPuxador: "",
      trinco: "",
      pecasDivisao: totalPecas,
      medidasDetalhadas,
      vidrosAvulsos,
      valorTotal,
      materiais,
      origemRota: "/calculo/pinazio",
    };

    try {
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? JSON.parse(salvo) : [];
      window.localStorage.setItem(
        CENTRAL_IMPRESSAO_KEY,
        JSON.stringify([...lista, itemCentral])
      );

      if (nomeCliente) {
        window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, nomeCliente);
      }

      if (nomeObra) {
        window.localStorage.setItem(CENTRAL_IMPRESSAO_OBRA_KEY, nomeObra);
      }

      setShowModalCentral(false);
      router.push("/central-impressao");
    } catch (erro) {
      console.warn("Não foi possível enviar o Pinázio para a central de impressão:", erro);
      setModalAvisoTitulo("Erro ao enviar");
      setModalAvisoMensagem("Não foi possível enviar o Pinázio para a central de impressão.");
      setShowModalAviso(true);
    }
  };

  // --- PRÉ-VISUALIZAÇÃO DO PINÁZIO ---
  const RenderPreview = useMemo(() => {
    const opcaoSelecionada =
      OPCOES_PINAZIO.find((item) => item.id === acabamentoId) ||
      OPCOES_PINAZIO[0];

    return (
      <MiniProjetoPinazio
        largura={Number(largura) || 100}
        altura={Number(altura) || 100}
        divisoesLargura={divisoesLargura}
        divisoesAltura={divisoesAltura}
        cor={opcaoSelecionada.cor}
        tamanhoMaximo={360}
      />
    );
  }, [
    largura,
    altura,
    divisoesLargura,
    divisoesAltura,
    acabamentoId,
  ]);

  const handleSalvarOrcamento = async () => {
    // Validação
    if (!nomeCliente || listaItens.length === 0) {
      setModalAvisoTitulo("Atenção");
      setModalAvisoMensagem("Para prosseguir, preencha o nome do cliente e adicione pelo menos um item ao Orçamento.");
      setShowModalAviso(true);
      return; // Interrompe a execução
    }

    try {
      // Garante empresa_id mesmo quando o hook ainda não terminou de carregar.
      let empresaIdFinal = empresaId;
      if (!empresaIdFinal) {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;

        if (authUser) {
          const { data: perfilData } = await supabase
            .from("perfis_usuarios")
            .select("empresa_id")
            .eq("id", authUser.id)
            .maybeSingle();

          empresaIdFinal = perfilData?.empresa_id || null;
        }
      }

      if (!empresaIdFinal) {
        throw new Error("Empresa não identificada para salvar Orçamento.");
      }

      let numero = "";
      if (editId) {
        const { data: atual } = await supabase
          .from("orcamentos")
          .select("numero_formatado")
          .eq("id", editId)
          .eq("empresa_id", empresaIdFinal)
          .single();
        numero = atual?.numero_formatado || "OR-EDIT";
      } else {
        numero = await gerarNumeroOrcamento();
      }

      const totalGeral = listaItens.reduce((sum, item) => sum + item.total, 0);
      const metragemTotal = listaItens.reduce((sum, item) => sum + (item.m2 || 0), 0);

      const payload = {
        numero_formatado: numero,
        cliente_nome: nomeCliente,
        obra_referencia: nomeObra,
        itens: listaItens,
        valor_total: Number(totalGeral) || 0,
        metragem_total: Number(metragemTotal) || 0,
        theme_color: theme.contentTextLightBg,
        empresa_id: empresaIdFinal
      };

      let data: any = null;
      let error: any = null;

      if (editId) {
        const { data: dataUpdate, error: errorUpdate } = await supabase
          .from("orcamentos")
          .update(payload)
          .eq("id", editId)
          .eq("empresa_id", empresaIdFinal)
          .select("numero_formatado")
          .single();
        data = dataUpdate;
        error = errorUpdate;
      } else {
        const { data: dataInsert, error: errorInsert } = await supabase
          .from("orcamentos")
          .insert([payload])
          .select("numero_formatado")
          .single();
        data = dataInsert;
        error = errorInsert;
      }

      if (error) throw error;

      if (editId) {
        sessionStorage.removeItem(draftKey);
        router.push('/admin/relatorio.orcamento');
        return;
      }

      // 2. SUCESSO: Limpa os estados e fecha o modal de salvar
      setUltimoNumeroGerado(data.numero_formatado);
      setListaItens([]);
      sessionStorage.removeItem(draftKey);
      setShowModalSalvar(false); // Fecha o modal de preenchimento
      setShowModalPDF(false);    // Fecha caso estivesse aberto
      setShowModalSucesso(true);

    } catch (error: any) {
      console.error("Erro ao salvar Orçamento de Pinázios:", error);
      setModalAvisoTitulo("Erro ao salvar");
      setModalAvisoMensagem("Não foi possível salvar o Orçamento. " + (error?.message || "Falha inesperada."));
      setShowModalAviso(true);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full min-w-0">

        {/* AQUI ESTÁ A MÁGICA: Chamando o seu componente padronizado */}
        <Header
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleLogout}
        >
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col border-l border-gray-200 pl-6">
              <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Orçamento Pinázio</h1>
              <span className="text-xs text-gray-800 "># {ultimoNumeroGerado || "NOVO"}</span>
            </div>

            {/* ÁREA DE AÇÕES DISCRETAS */}
            <div className="ml-6 flex items-center gap-3 animate-fade-in">
              <button
                onClick={() => setShowModalSalvar(true)}
                className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5a] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a527d] transition-all active:scale-95 shadow-lg shadow-[#1e3a5a]/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Salvar Orçamento
              </button>

              <button
                onClick={() => setShowModalCentral(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                title="Enviar para a central de impressão"
              >
                PDF+
              </button>

              {/* Ícone discreto para PDF */}
              <button
                onClick={() => setShowModalPDF(true)}
                className="flex items-center gap-2 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all ml-2"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>
        </Header>


        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          {/* O header antigo foi removido daqui */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            {/* Coluna Esquerda: Configurações */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Largura</label>
                      <input
                        ref={larguraInputRef} // Adicione a ref aqui
                        type="number"
                        placeholder="mm"
                        value={largura}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setLargura(value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('input-altura')?.focus()} // Pula para altura
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Altura</label>
                      <input
                        id="input-altura" // Adicione um ID para facilitar o foco
                        type="number"
                        placeholder="mm"
                        value={altura}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setAltura(value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('input-qtd')?.focus()} // Pula para quantidade
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Qtd</label>
                      <input
                        id="input-qtd" // Adicione um ID
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            adicionarAoPedido(); // Adiciona e volta para a largura
                          }
                        }}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm font-bold text-center text-gray-500"
                        style={{
                          "--tw-ring-color": theme.menuIconColor
                        } as any}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                        Divisões na largura
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={acabamentoId === "sem-pinazio" ? 1 : divisoesLargura}
                        disabled={acabamentoId === "sem-pinazio"}
                        onChange={(e) => setDivisoesLargura(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                        Divisões na altura
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={acabamentoId === "sem-pinazio" ? 1 : divisoesAltura}
                        disabled={acabamentoId === "sem-pinazio"}
                        onChange={(e) => setDivisoesAltura(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Selecione o Vidro</label>
                    <select
                      value={vidroId}
                      onChange={(e) => setVidroId(e.target.value)}
                      className="w-full p-3 mt-1 rounded-xl border border-gray-200 bg-white focus:ring-2 outline-none transition-all text-sm text-gray-600 cursor-pointer"
                      style={{ "--tw-ring-color": theme.menuIconColor } as any}
                    >
                      {vidrosDB.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nome} {v.espessura} - {v.tipo} ({Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/m²)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3
                  className="text-lg font-bold mb-4"
                  style={{ color: theme.menuBackgroundColor }}
                >
                  Pinázio
                </h3>

                <div className="space-y-3">
                  {OPCOES_PINAZIO.map((item) => {
                    const selecionado = acabamentoId === item.id;

                    return (
                      <label
                        key={item.id}
                        className={`flex items-center justify-between gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${
                          selecionado
                            ? "bg-slate-50 border-slate-300"
                            : "bg-gray-50 border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-700">
                            {item.nome}
                          </span>
                          <span className="block text-xs text-gray-400 mt-1">
                            {item.id === "sem-pinazio"
                              ? "Calcula somente o vidro"
                              : `${item.preco.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })} por metro linear`}
                          </span>
                        </div>

                        <input
                          type="radio"
                          name="pinazio"
                          checked={selecionado}
                          onChange={() => {
                            setAcabamentoId(item.id);
                            setPrecoMetroPinazio(String(item.preco));

                            if (item.id === "sem-pinazio") {
                              setDivisoesLargura(1);
                              setDivisoesAltura(1);
                            }
                          }}
                          className="w-5 h-5"
                          style={{ accentColor: theme.menuIconColor }}
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Preço por metro linear
                  </label>

                  <div className="mt-2 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3">
                    <span className="text-sm font-semibold text-gray-500">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={acabamentoId === "sem-pinazio" ? "0" : precoMetroPinazio}
                      disabled={acabamentoId === "sem-pinazio"}
                      onChange={(event) =>
                        setPrecoMetroPinazio(event.target.value)
                      }
                      className="w-full bg-transparent p-3 text-sm font-semibold text-gray-700 outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-400">/ml</span>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    {acabamentoId === "sem-pinazio"
                      ? "Nesta opção será cobrado somente o valor do vidro."
                      : "Você pode alterar este preço somente para o item que está sendo calculado."}
                  </p>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview e Tabela */}
            <div className="lg:col-span-8 space-y-6">
              {/* Preview Area */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-87.5 flex flex-col items-center justify-center relative">
                <div className="flex items-center justify-center relative">
                  {RenderPreview}
                  <span className="absolute -bottom-10 text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-tighter">
                    {largura || 0} x {altura || 0} mm
                  </span>
                </div>
              </div>

              {/* Botão de Adição e Valor Atual */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Composição do item
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Vidro:{" "}
                      <strong className="text-gray-700">
                        {calculoAtual.valorVidro.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>
                    </span>

                    <span>
                      {acabamentoId === "sem-pinazio" ? "Pinázio:" : "Pinázio:"}{" "}
                      <strong className="text-gray-700">
                        {calculoAtual.valorPinazio.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>
                    </span>

                    <span className="text-gray-400">
                      {calculoAtual.metroLinearPinazio.toLocaleString("pt-BR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      ml × {Number(calculoAtual.precoMetroPinazio || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-gray-700">
                    {calculoAtual.total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <button
                  onClick={adicionarAoPedido}
                  disabled={calculoAtual.total === 0}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 transition-all disabled:opacity-30 active:scale-95"
                  style={{
                    borderColor: theme.menuIconColor,
                    color: theme.menuIconColor,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.menuIconColor;
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.menuIconColor;
                  }}
                >
                  <Plus size={18} /> Adicionar
                </button>
              </div>

              {/* LISTA DE ITENS DISCRETA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <ReceiptText size={14} /> Resumo do Pedido
                  </h3>
                  <button
                    onClick={() => setListaItens([])}
                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-tighter transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Limpar Tudo
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {listaItens.length > 0 ? (
                    <>
                      <div className="divide-y divide-gray-100">
                        {listaItens.map((item, index) => (
                          <div key={item.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">

                            <div className="mr-4 w-28 shrink-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
                              <MiniProjetoPinazio
                                largura={Number(item.larguraReal || item.largura || String(item.medidas || "").split("x")[0]) || 100}
                                altura={Number(item.alturaReal || item.altura || String(item.medidas || "").split("x")[1]) || 100}
                                divisoesLargura={Number(item.divisoesLargura || 1)}
                                divisoesAltura={Number(item.divisoesAltura || 1)}
                                cor={item.pinazioCor || "branco"}
                                mostrarMedidas={false}
                                tamanhoMaximo={112}
                              />
                            </div>

                            {/* Lado Esquerdo: Descrição e Detalhes */}
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1">

                                {/* Descrição */}
                                <h4
                                  className="text-sm font-semibold truncate leading-tight"
                                  style={{ color: theme.contentTextLightBg }}
                                >
                                  {item.descricao}
                                </h4>

                                {/* Medidas */}
                                <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {item.medidas}
                                </span>
                              </div>

                              {/* Quantidade */}
                              <p className="text-xs text-gray-500 mt-1.5">
                                Quantidade: <span className="font-medium text-gray-700">{item.quantidade}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.pinazioNome || "Pinázio"}: <span className="font-medium text-gray-700">{item.divisoesLargura} x {item.divisoesAltura}</span>
                                <span className="mx-1">•</span>
                                {Number(item.metroLinearPinazioTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ml
                              </p>
                            </div>

                            {/* Lado Direito: Preço e Ações */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              {/* Preço Unitário */}
                              <span
                                className="text-sm font-bold whitespace-nowrap mr-2"
                                style={{ color: theme.contentTextLightBg }}
                              >
                                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>

                              {/* --- BOTÃO DE EDITAR (Cor do Tema) --- */}
                              <button
                                onClick={() => {
                                  setLargura(item.medidas.split('x')[0]);
                                  setAltura(item.medidas.split('x')[1]);
                                  setQuantidade(item.quantidade);
                                  setDivisoesLargura(Number(item.divisoesLargura || 1));
                                  setDivisoesAltura(Number(item.divisoesAltura || 1));

                                  const opcaoItem = OPCOES_PINAZIO.find(
                                    (opcao) =>
                                      opcao.id === String(item.pinazioId || "")
                                  );

                                  if (opcaoItem) {
                                    setAcabamentoId(opcaoItem.id);
                                  }

                                  setPrecoMetroPinazio(
                                    String(
                                      item.precoMetroPinazio ??
                                        opcaoItem?.preco ??
                                        55
                                    )
                                  );

                                  setListaItens(
                                    listaItens.filter((i) => i.id !== item.id)
                                  );
                                }}
                                title="Editar item"
                                style={{ '--hover-color': theme.menuIconColor } as any}
                                className="p-2 rounded-lg text-gray-400 hover:text-(--hover-color) hover:bg-(--hover-color)/10 transition-all duration-200"
                              >
                                <Pencil size={16} />
                              </button>

                              {/* --- BOTÃO DE REMOVER (Vermelho Erro) --- */}
                              <button
                                onClick={() => setListaItens(listaItens.filter(i => i.id !== item.id))}
                                title="Remover item"
                                style={{ '--hover-color': theme.modalIconErrorColor } as any}
                                className="p-2 rounded-lg text-gray-400 hover:text-(--hover-color) hover:bg-(--hover-color)/10 transition-all duration-200"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* --- RODAPÉ COM A SOMA TOTAL --- */}
                      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Total do Orçamento</span>

                        {/* Soma Total */}
                        <span
                          className="text-lg font-bold"
                          style={{ color: theme.contentTextLightBg }}
                        >
                          {listaItens.reduce((sum, item) => sum + item.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </>
                  ) : (
                    // Estado Vazio
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <ClipboardList size={28} className="mb-3" />
                      <p className="text-sm font-medium">Nenhum item adicionado ao Orçamento.</p>
                      <p className="text-xs mt-1">Comece adicionando as dimensões, o vidro e as divisões do Pinázio.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE FINALIZAÇÃO E DOWNLOAD */}
      {showModalPDF && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div
            style={{
              backgroundColor: theme.modalBackgroundColor,
              color: theme.modalTextColor,
              borderColor: '#F3F4F6',
            }}
            className="w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 border overflow-hidden flex flex-col md:flex-row"
          >
            {/* LADO ESQUERDO */}
            <div className="p-8 md:w-2/5 flex flex-col justify-center items-center text-center" style={{ backgroundColor: `${theme.menuIconColor}08` }}>
              <div className="p-4 rounded-full mb-6" style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}>
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Finalizar Orçamento</h3>
              <p className="text-sm opacity-70">Preencha os dados ao lado para personalizar seu PDF antes de baixar.</p>
            </div>

            {/* LADO DIREITO */}
            <div className="p-8 md:w-3/5 flex flex-col">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowModalPDF(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 mb-8 grow">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Cliente</label>
                  <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full bg-transparent border-b py-2.5 outline-none text-sm" placeholder="Nome do cliente..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Obra / Referência</label>
                  <input type="text" value={nomeObra} onChange={(e) => setNomeObra(e.target.value)} className="w-full bg-transparent border-b py-2.5 outline-none text-sm" placeholder="Ex: Apartamento 402..." />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-auto">

                {/* BAIXAR PDF */}
                <PDFDownloadLink
                  document={
                    <PinazioPDF
                      itens={listaItens}
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl || '/glasscode.png'}
                      themeColor={theme.contentTextLightBg}
                      nomeCliente={nomeCliente}
                      nomeObra={nomeObra}
                      numeroOrcamento={ultimoNumeroGerado}
                    />
                  }
                  fileName={`Orçamento_Pinazio_${nomeCliente?.replace(/[^a-z0-9]/gi, '') || 'cliente'}.pdf`}
                  className="w-full"
                >
                  {({ loading }) => (
                    <button
                      disabled={loading}
                      className="w-full px-5 py-3 rounded-xl font-semibold bg-[#1e3a5a] text-white hover:bg-[#2a527d] transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Printer size={16} />
                      {loading ? "Gerando PDF..." : "Baixar Orçamento"}
                    </button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModalCentral && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Central de impressão</p>
                <h3 className="mt-1 text-lg font-semibold text-[#0f2742]">Enviar Pinázio</h3>
                <p className="mt-1 text-sm text-slate-500">A relação será enviada sem desenhos, com vidro e Pinázio separados.</p>
              </div>
              <button onClick={() => setShowModalCentral(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <button
                type="button"
                onClick={enviarParaCentralImpressao}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50"
              >
                <p className="text-sm font-semibold text-[#0f2742]">Enviar relação de vidro e Pinázio</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Envia as medidas do vidro, as divisões, o metro linear do Pinázio e os valores, sem desenhos.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE SALVAR Orçamento */}
      {showModalSalvar && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div
            style={{
              backgroundColor: theme.modalBackgroundColor || '#FFFFFF',
              color: theme.modalTextColor || '#1F2937',
            }}
            className="w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 border border-gray-100 overflow-hidden flex flex-col md:flex-row"
          >
            {/* LADO ESQUERDO (Acentuado) */}
            <div
              className="p-8 md:w-2/5 flex flex-col justify-center items-center text-center"
              style={{ backgroundColor: `${theme.menuIconColor}08` }}
            >
              <div
                className="p-4 rounded-full mb-6"
                style={{
                  backgroundColor: `${theme.menuIconColor}15`,
                  color: theme.menuIconColor,
                }}
              >
                <Save size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Salvar Orçamento</h3>
              <p className="text-sm opacity-70">Preencha os dados ao lado para salvar o Orçamento no sistema.</p>
            </div>

            {/* LADO DIREITO (Formulário) */}
            <div className="p-8 md:w-3/5 flex flex-col">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowModalSalvar(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 mb-8 grow">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 py-2.5 outline-none text-sm focus:border-gray-400"
                    placeholder="Nome do cliente..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Obra / Referência</label>
                  <input
                    type="text"
                    value={nomeObra}
                    onChange={(e) => setNomeObra(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 py-2.5 outline-none text-sm focus:border-gray-400"
                    placeholder="Ex: Apartamento 402..."
                  />
                </div>
              </div>

              <button
                onClick={handleSalvarOrcamento}
                className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2 hover:opacity-90"
                style={{ backgroundColor: theme.menuBackgroundColor }}
              >
                <Save size={16} />
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE SUCESSO */}
      {showModalSucesso && (
        <div className="fixed top-6 right-6 z-100 animate-in slide-in-from-top-5 fade-in duration-500">
          <div
            className="backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 w-72 flex items-center gap-4 ring-1 ring-black/5"
            style={{
              backgroundColor: `${theme.modalBackgroundColor || '#FFFFFF'}F0`, // Adiciona leve transparência
              borderRight: `4px solid ${theme.menuIconColor}`,
              color: theme.modalTextColor
            }}
          >
            {/* Ícone com a cor do tema */}
            <div
              className="p-2 rounded-xl shrink-0"
              style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}
            >
              <Sparkles size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-tight opacity-90">Salvo com sucesso!</h3>
                <button
                  onClick={() => setShowModalSucesso(false)}
                  className="opacity-30 hover:opacity-100 transition-colors ml-2"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-[11px] mt-0.5 font-mono opacity-60">
                Ref: <span className="font-bold" style={{ color: theme.menuIconColor }}>{ultimoNumeroGerado}</span>
              </p>

              <button
                onClick={() => {
                  setShowModalSucesso(false);
                  router.push('/admin/relatorio.orcamento');
                }}
                className="text-[10px] font-bold opacity-50 hover:opacity-100 uppercase tracking-wider mt-2 flex items-center gap-1 transition-colors"
              >
                <ClipboardList size={12} />
                Ver Histórico
              </button>
            </div>
          </div>
        </div>
      )}
      {showModalAviso && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-gray-100"
            style={{
              backgroundColor: theme.modalBackgroundColor || '#FFFFFF',
              color: theme.modalTextColor || '#1F2937'
            }}
          >
            {/* Ícone com Animação de Pulso */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-amber-200 animate-ping opacity-20"></div>
              <AlertTriangle size={32} className="text-amber-500 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold mb-2">{modalAvisoTitulo}</h3>
            <p className="text-sm opacity-60 mb-8">
              {modalAvisoMensagem}
            </p>

            <button
              onClick={() => setShowModalAviso(false)}
              className="px-8 py-2 rounded-xl text-sm transition-all border hover:bg-opacity-10 active:bg-opacity-100"
              style={{
                borderColor: theme.menuIconColor,
                color: theme.menuIconColor,
                backgroundColor: 'transparent'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
