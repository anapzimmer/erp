"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, FilePlus2, FileText, Image as ImageIcon, Loader2, PencilLine, Plus, ScanText, Sparkles, Trash2, UploadCloud } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { extrairOrcamentoDaImagem, type ItemOrcamentoImagem } from "./actions";

type UploadState = {
  file: File | null;
  previewUrl: string;
  mimeType: string;
  base64Data: string;
};

type ProjetoCentralImagem = {
  id: string;
  projeto: string;
  largura: number;
  altura: number;
  quantidade: number;
  vidro: string;
  corKit: string;
  corPerfil: string;
  valorTotal: number;
  desenhoUrl?: string;
  origemRota?: string;
  origemTipo?: string;
  observacao?: string;
  medidasDetalhadas?: string;
  pecasDivisao?: number;
  materiais?: unknown[];
};

const CENTRAL_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_NUMERO_KEY = "glasscode:central-impressao:numero";
const CENTRAL_CLIENTE_KEY = "glasscode:central-impressao:cliente";
const CENTRAL_OBRA_KEY = "glasscode:central-impressao:obra";
const CENTRAL_ORCAMENTO_ID_KEY = "glasscode:central-impressao:orcamento-id";

const INITIAL_UPLOAD_STATE: UploadState = {
  file: null,
  previewUrl: "",
  mimeType: "",
  base64Data: "",
};

type ProjetoOpcao = {
  valor: string;
  nome: string;
  rota: string;
  desenho: string;
  pecas: number;
};

const PROJETOS_OPCOES: ProjetoOpcao[] = [
  { valor: "Janela 2 folhas", nome: "Janela de correr - 2 folhas (Kit)", rota: "/jc2f-kit", desenho: "/desenhos/projeto2f-simples.png", pecas: 2 },
  { valor: "Janela de correr - 2 folhas (Barra)", nome: "Janela de correr - 2 folhas (Barra)", rota: "/jc2f-barra", desenho: "/desenhos/projeto2f-simples.png", pecas: 2 },
  { valor: "Janela 4 folhas", nome: "Janela de correr - 4 folhas (Kit)", rota: "/jc4f-kit", desenho: "/desenhos/janela4fls-semtrinco.png", pecas: 4 },
  { valor: "Janela de correr - 4 folhas (Barra)", nome: "Janela de correr - 4 folhas (Barra)", rota: "/jc4f-barra", desenho: "/desenhos/janela4fls-semtrinco.png", pecas: 4 },
  { valor: "Janela de correr - 2 folhas com sacada inferior (Kit)", nome: "Janela de correr - 2 folhas com sacada inferior (Kit)", rota: "/jc2fcs-kit", desenho: "/desenhos/janela-bst-trinco-2fls.png", pecas: 3 },
  { valor: "Janela de correr - 2 folhas com sacada inferior (Barra)", nome: "Janela de correr - 2 folhas com sacada inferior (Barra)", rota: "/jc2fcs", desenho: "/desenhos/janela-bst-trinco-2fls.png", pecas: 3 },
  { valor: "Janela de correr - 4 folhas com sacada inferior (Kit)", nome: "Janela de correr - 4 folhas com sacada inferior (Kit)", rota: "/jc4fcs-kit", desenho: "/desenhos/janela-bst-trinco-4fls.png", pecas: 6 },
  { valor: "Janela de correr - 4 folhas com sacada inferior (Barra)", nome: "Janela de correr - 4 folhas com sacada inferior (Barra)", rota: "/jc4fcs", desenho: "/desenhos/janela-bst-trinco-4fls.png", pecas: 6 },
  { valor: "Janela de correr - 4 folhas com bandeira (Kit)", nome: "Janela de correr - 4 folhas com bandeira (Kit)", rota: "/jc4fcb-kit", desenho: "/desenhos/jc4fcb-semtrinco.png", pecas: 6 },
  { valor: "Janela de correr - 4 folhas com bandeira (Barra)", nome: "Janela de correr - 4 folhas com bandeira (Barra)", rota: "/jc4fcb", desenho: "/desenhos/jc4fcb-semtrinco.png", pecas: 6 },
  { valor: "Janela de correr - 4 folhas com peitoril e bandeira", nome: "Janela de correr - 4 folhas com peitoril e bandeira", rota: "/jc4fcbs", desenho: "/desenhos/JC4FCBS_semtrinco.png", pecas: 8 },
  { valor: "Porta 2 folhas", nome: "Porta de correr - 2 folhas (Kit)", rota: "/pc2f-kit", desenho: "/desenhos/projeto2f-simples.png", pecas: 2 },
  { valor: "Porta de correr - 2 folhas (Barra)", nome: "Porta de correr - 2 folhas (Barra)", rota: "/pc2f-barra", desenho: "/desenhos/projeto2f-simples.png", pecas: 2 },
  { valor: "Porta de correr - 4 folhas (Kit)", nome: "Porta de correr - 4 folhas (Kit)", rota: "/pc4f-kit", desenho: "/desenhos/porta4fls-completo.png", pecas: 4 },
  { valor: "Porta de correr - 4 folhas (Barra)", nome: "Porta de correr - 4 folhas (Barra)", rota: "/pc4f-barra", desenho: "/desenhos/porta4fls-completo.png", pecas: 4 },
  { valor: "Porta de correr - 2 folhas com bandeira (Kit)", nome: "Porta de correr - 2 folhas com bandeira (Kit)", rota: "/pc2fcb-kit", desenho: "/desenhos/portaband2fls.png", pecas: 3 },
  { valor: "Porta de correr - 2 folhas com bandeira (Barra)", nome: "Porta de correr - 2 folhas com bandeira (Barra)", rota: "/pc2fcb", desenho: "/desenhos/portaband2fls.png", pecas: 3 },
  { valor: "Porta de correr - 4 folhas com bandeira (Kit)", nome: "Porta de correr - 4 folhas com bandeira (Kit)", rota: "/pc4fcb-kit", desenho: "/desenhos/portaband4fls-simples.png", pecas: 6 },
  { valor: "Porta de correr - 4 folhas com bandeira (Barra)", nome: "Porta de correr - 4 folhas com bandeira (Barra)", rota: "/pc4fcb", desenho: "/desenhos/portaband4fls-simples.png", pecas: 6 },
  { valor: "Porta fora vão - 1 folha (Kit)", nome: "Porta fora vão - 1 folha (Kit)", rota: "/pfv1f-kit", desenho: "/desenhos/portaforavao-1fls.png", pecas: 1 },
  { valor: "Porta fora vão - 1 folha (Barra)", nome: "Porta fora vão - 1 folha (Barra)", rota: "/pfv1f-barra", desenho: "/desenhos/portaforavao-1fls.png", pecas: 1 },
  { valor: "Porta fora vão - 2 folhas (Kit)", nome: "Porta fora vão - 2 folhas (Kit)", rota: "/pfv2f-kit", desenho: "/desenhos/portaforavao-2fls.png", pecas: 2 },
  { valor: "Porta fora vão - 2 folhas (Barra)", nome: "Porta fora vão - 2 folhas (Barra)", rota: "/pfv2f-barra", desenho: "/desenhos/portaforavao-2fls.png", pecas: 2 },
  { valor: "Porta de giro 1 folha", nome: "Porta de giro - 1 folha", rota: "/pg", desenho: "/desenhos/portagiro-1fls.png", pecas: 1 },
  { valor: "Porta de giro - 2 folhas", nome: "Porta de giro - 2 folhas", rota: "/pg2f", desenho: "/desenhos/portagiro-2fls.png", pecas: 2 },
  { valor: "Porta de giro dobradiça", nome: "Porta de giro dobradiça", rota: "/pgxmodelo=dobradica", desenho: "/desenhos/portagirodob-1flssimples.png", pecas: 1 },
  { valor: "Porta de giro com fixo lateral - vidro/vidro", nome: "Porta de giro com fixo lateral - vidro/vidro", rota: "/pgfxencontro=vidro", desenho: "/desenhos/pgf-simples.png", pecas: 2 },
  { valor: "Porta de giro com fixo lateral - vidro/alvenaria", nome: "Porta de giro com fixo lateral - vidro/alvenaria", rota: "/pgfxencontro=alvenaria", desenho: "/desenhos/pg-simples.png", pecas: 2 },
  { valor: "Mão Amiga - 2 folhas", nome: "Mão Amiga - 2 folhas", rota: "/pma2f", desenho: "/desenhos/pma-2fs-simples.png", pecas: 2 },
  { valor: "Mão Amiga - 3 folhas", nome: "Mão Amiga - 3 folhas", rota: "/pma3f", desenho: "/desenhos/pma-3fs-simples.png", pecas: 3 },
  { valor: "Mão Amiga - 4 folhas", nome: "Mão Amiga - 4 folhas", rota: "/pma4f", desenho: "/desenhos/pma-4fs-simples.png", pecas: 4 },
  { valor: "Mão Amiga - 5 folhas", nome: "Mão Amiga - 5 folhas", rota: "/pma5f", desenho: "/desenhos/pma-5fs-simples.png", pecas: 5 },
  { valor: "Mão Amiga - 6 folhas", nome: "Mão Amiga - 6 folhas", rota: "/pma6f", desenho: "/desenhos/pma-6fs-simples.png", pecas: 6 },
  { valor: "Mão Amiga - 2 fixas + 4 móveis", nome: "Mão Amiga - 2 fixas + 4 móveis", rota: "/pma2f4m", desenho: "/desenhos/pma-24fs-simples.png", pecas: 6 },
  { valor: "Deslizante - 2 folhas", nome: "Deslizante - 2 folhas", rota: "/deslizante2f", desenho: "/desenhos/deslizante-2fls-cs-simples.png", pecas: 2 },
  { valor: "Deslizante - 3 folhas", nome: "Deslizante - 3 folhas", rota: "/deslizante3f", desenho: "/desenhos/deslizante-3fls-cs-simples.png", pecas: 3 },
  { valor: "Deslizante - 4 folhas", nome: "Deslizante - 4 folhas", rota: "/deslizante4f", desenho: "/desenhos/deslizante-4fls-cs-simples.png", pecas: 4 },
  { valor: "Deslizante - 5 folhas", nome: "Deslizante - 5 folhas", rota: "/deslizante5f", desenho: "/desenhos/deslizante-5fls-cs-simples.png", pecas: 5 },
  { valor: "Deslizante - 6 folhas", nome: "Deslizante - 6 folhas", rota: "/deslizante6f", desenho: "/desenhos/deslizante-6fls-cs-simples.png", pecas: 6 },
  { valor: "Box 2 folhas", nome: "Box 2 folhas", rota: "/box2fls", desenho: "/desenhos/box-padrao.png", pecas: 2 },
  { valor: "Box de canto", nome: "Box de canto", rota: "/boxcanto", desenho: "/desenhos/box-canto4f.png", pecas: 4 },
  { valor: "Box de canto 3 folhas", nome: "Box de canto 3 folhas", rota: "/boxcanto3f", desenho: "/desenhos/box-canto3f.png", pecas: 3 },
  { valor: "Fixos", nome: "Fixos", rota: "/fixos", desenho: "/desenhos/fixo-1folha.png", pecas: 1 },
  { valor: "Fixo com bandeira", nome: "Fixo com bandeira", rota: "/fixo-bandeira", desenho: "/desenhos/fixo-1folhascombandeira.png", pecas: 2 },
  { valor: "Maxim-ar", nome: "Maxim-ar", rota: "/max", desenho: "/desenhos/max-unica.png", pecas: 1 },
  { valor: "Sacada frontal", nome: "Sacada frontal", rota: "/calculo/sacadafrontal", desenho: "", pecas: 1 },
  { valor: "Sacada com torre", nome: "Sacada com torre", rota: "/calculo/sacadatorre", desenho: "", pecas: 1 },
  { valor: "Sacada com grapa", nome: "Sacada com grapa", rota: "/calculo/sacadagrapa", desenho: "", pecas: 1 },
  { valor: "Fechamento de sacada", nome: "Fechamento de sacada", rota: "/calculo/fechamentosacada", desenho: "", pecas: 1 },
  { valor: "Pele de vidro", nome: "Pele de vidro", rota: "/calculo/peledevidro", desenho: "", pecas: 1 },
  { valor: "Outro", nome: "Outro / ajustar manualmente", rota: "", desenho: "", pecas: 1 },
];

const EXEMPLO_FOTO: ItemOrcamentoImagem[] = [
  { id: "ex-1", projeto: "Janela 2 folhas", quantidade: 1, largura: 1000, altura: 940, observacao: "Fume 8mm, aluminio preto", confianca: "alta" },
  { id: "ex-2", projeto: "Janela 2 folhas", quantidade: 2, largura: 800, altura: 800, observacao: "", confianca: "alta" },
  { id: "ex-3", projeto: "Janela 2 folhas", quantidade: 2, largura: 700, altura: 500, observacao: "", confianca: "alta" },
  { id: "ex-4", projeto: "Porta 2 folhas", quantidade: 2, largura: 1800, altura: 1800, observacao: "", confianca: "alta" },
  { id: "ex-5", projeto: "Janela 4 folhas", quantidade: 2, largura: 1500, altura: 1100, observacao: "", confianca: "alta" },
];

const toBase64Data = (file: File): Promise<{ base64Data: string; previewUrl: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [meta, base64Data] = result.split(",");
      if (!meta || !base64Data) {
        reject(new Error("Falha ao converter a imagem."));
        return;
      }

      const mimeMatch = meta.match(/data:(.*);base64/);
      resolve({
        base64Data,
        previewUrl: result,
        mimeType: mimeMatch?.[1] || file.type || "image/png",
      });
    };

    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });

const criarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const resumoProjeto = (projeto: ItemOrcamentoImagem["projeto"]) => {
  const encontrado = PROJETOS_OPCOES.find((opcao) => opcao.valor === projeto);
  if (encontrado) return encontrado;
  return { nome: projeto || "Projeto importado por imagem", rota: "", desenho: "", pecas: 1 };
};

const classificarProjetoLocal = (largura: number, altura: number): ItemOrcamentoImagem["projeto"] => {
  if (altura >= 1450) return "Porta 2 folhas";
  if (largura >= 1300) return "Janela 4 folhas";
  return "Janela 2 folhas";
};

const extrairQuantidadeLocal = (texto: string, indice: number) => {
  const janela = texto.slice(Math.max(0, indice - 35), Math.min(texto.length, indice + 35));
  const achou = janela.match(/[xX×]\s*(\d{1,2})|(\d{1,2})\s*[xX×]/);
  return Math.max(1, Number(achou?.[1] || achou?.[2] || 1));
};

const interpretarTextoLocal = (textoOriginal: string): { itens: ItemOrcamentoImagem[]; observacao: string } => {
  const texto = textoOriginal
    .replace(/[oO](?=\d)/g, "0")
    .replace(/[Il](?=\d)/g, "1")
    .replace(/[—–]/g, "-");

  const candidatos: Array<{ largura: number; altura: number; index: number }> = [];
  const usados = new Set<string>();

  const adicionar = (largura: number, altura: number, index: number) => {
    const l = Math.round(largura);
    const a = Math.round(altura);
    if (l < 250 || a < 250 || l > 7000 || a > 4000) return;
    const chave = `${l}-${a}-${Math.floor(index / 25)}`;
    if (usados.has(chave)) return;
    usados.add(chave);
    candidatos.push({ largura: l, altura: a, index });
  };

  const padraoComSeparador = /(\d{3,4})\s*(?:x|X|×|\*)\s*(\d{3,4})/g;
  for (const match of texto.matchAll(padraoComSeparador)) {
    adicionar(Number(match[1]), Number(match[2]), match.index || 0);
  }

  if (!candidatos.length) {
    const numeros = Array.from(texto.matchAll(/\b\d{3,4}\b/g))
      .map((match) => ({ valor: Number(match[0]), index: match.index || 0 }))
      .filter((item) => item.valor >= 250 && item.valor <= 7000);

    for (let i = 0; i < numeros.length - 1; i += 2) {
      const primeiro = numeros[i];
      const segundo = numeros[i + 1];
      if (!primeiro || !segundo) continue;
      const largura = primeiro.valor;
      const altura = segundo.valor;
      adicionar(largura, altura, primeiro.index);
    }
  }

  const itens = candidatos.map((candidato, index): ItemOrcamentoImagem => {
    const quantidade = extrairQuantidadeLocal(texto, candidato.index);
    return {
      id: `local-${Date.now()}-${index}`,
      projeto: classificarProjetoLocal(candidato.largura, candidato.altura),
      quantidade,
      largura: candidato.largura,
      altura: candidato.altura,
      observacao: "Leitura local por OCR. Confira o tipo do projeto.",
      confianca: "media",
    };
  });

  return {
    itens,
    observacao: textoOriginal.trim()
      ? `Texto lido localmente: ${textoOriginal.trim().slice(0, 500)}`
      : "O OCR local nao encontrou texto claro. Tente uma foto mais reta, com mais contraste, ou preencha manualmente.",
  };
};

const carregarImagem = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nao foi possivel carregar a imagem para tratamento."));
    img.src = src;
  });

const preprocessarImagemParaOcr = async (src: string) => {
  const img = await carregarImagem(src);
  const escala = Math.min(3, Math.max(1.8, 2200 / Math.max(img.naturalWidth || img.width, 1)));
  const width = Math.round((img.naturalWidth || img.width) * escala);
  const height = Math.round((img.naturalHeight || img.height) * escala);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;

  ctx.filter = "grayscale(1) contrast(1.9) brightness(1.08)";
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] || 0;
    const g = data[i + 1] || 0;
    const b = data[i + 2] || 0;
    const gray = Math.round((r + g + b) / 3);
    const value = gray < 168 ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

export default function ImagensPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, nomeEmpresa, loading: authLoading, signOut } = useAuth();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const [upload, setUpload] = useState<UploadState>(INITIAL_UPLOAD_STATE);
  const [dragActive, setDragActive] = useState(false);
  const [itens, setItens] = useState<ItemOrcamentoImagem[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [error, setError] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const hasImage = Boolean(upload.file && upload.previewUrl);
  const isPdf = upload.file?.type === "application/pdf" || upload.file?.name.toLowerCase().endsWith(".pdf");

  const uploadHint = useMemo(() => {
    if (!upload.file) return "PNG, JPG, JPEG ou WEBP";
    const sizeMb = (upload.file.size / (1024 * 1024)).toFixed(2);
    return `${upload.file.name} - ${sizeMb} MB`;
  }, [upload.file]);

  const totais = useMemo(() => {
    const vaos = itens.reduce((total, item) => total + Number(item.quantidade || 0), 0);
    const pecas = itens.reduce((total, item) => total + Number(item.quantidade || 0) * resumoProjeto(item.projeto).pecas, 0);
    return { vaos, pecas };
  }, [itens]);

  const handleFile = async (file: File) => {
    const arquivoPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!file.type.startsWith("image/") && !arquivoPdf) {
      setError("Arquivo invalido. Envie uma imagem ou PDF.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Arquivo muito grande. Limite de 15MB.");
      return;
    }

    try {
      setError("");
      setMensagem("");
      if (arquivoPdf) {
        setUpload({
          file,
          previewUrl: "",
          mimeType: file.type || "application/pdf",
          base64Data: "",
        });
        setItens([]);
        setObservacoesGerais("");
        return;
      }

      const converted = await toBase64Data(file);
      setUpload({
        file,
        previewUrl: converted.previewUrl,
        mimeType: converted.mimeType,
        base64Data: converted.base64Data,
      });
    } catch (conversionError) {
      console.error(conversionError);
      setError("Nao foi possivel preparar a imagem para analise.");
    }
  };

  const atualizarItem = (id: string, alteracoes: Partial<ItemOrcamentoImagem>) => {
    setItens((atuais) => atuais.map((item) => item.id === id ? { ...item, ...alteracoes } : item));
  };

  const adicionarLinha = () => {
    setItens((atuais) => [
      ...atuais,
      { id: criarId(), projeto: "Janela 2 folhas", quantidade: 1, largura: 0, altura: 0, observacao: "", confianca: "media" },
    ]);
  };

  const onExtrair = async () => {
    if (!upload.file || !upload.base64Data || !upload.mimeType) {
      setError("Selecione uma imagem antes de analisar.");
      return;
    }

    setLoading(true);
    setError("");
    setMensagem("");

    try {
      const resultado = await extrairOrcamentoDaImagem({
        mimeType: upload.mimeType,
        base64Data: upload.base64Data,
      });
      setItens(resultado.itens);
      setObservacoesGerais(resultado.observacoesGerais);
      setMensagem(resultado.itens.length ? `${resultado.itens.length} medida(s) encontrada(s). Confira antes de enviar para a Central.` : "Nenhum vão foi encontrado na imagem.");
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : "Erro inesperado na leitura.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onExtrairPdf = async () => {
    if (!upload.file || !isPdf) {
      setError("Selecione um PDF antes de importar.");
      return;
    }

    setLoadingPdf(true);
    setError("");
    setMensagem("");

    try {
      const formData = new FormData();
      formData.append("arquivo", upload.file);
      const resposta = await fetch("/api/importar-orcamento-pdf", {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json() as {
        erro?: string;
        detalhe?: string;
        itens?: ItemOrcamentoImagem[];
        observacoesGerais?: string;
        cliente?: string;
        pedido?: string;
        paginas?: number;
      };

      if (!resposta.ok || dados.erro) {
        throw new Error(dados.detalhe ? `${dados.erro} ${dados.detalhe}` : dados.erro || "Erro ao importar PDF.");
      }

      const itensPdf = (dados.itens || []).map((item, index) => ({
        ...item,
        id: item.id || `pdf-front-${Date.now()}-${index}`,
      }));

      setItens(itensPdf);
      setObservacoesGerais(
        [
          dados.cliente ? `Cliente no PDF: ${dados.cliente}` : "",
          dados.pedido ? `Pedido: ${dados.pedido}` : "",
          dados.observacoesGerais || "",
        ].filter(Boolean).join(" | ")
      );
      setMensagem(itensPdf.length ? `${itensPdf.length} item(ns) importado(s) do PDF.` : "O PDF foi lido, mas nenhum item foi encontrado.");
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : "Erro inesperado ao importar PDF.";
      setError(message);
    } finally {
      setLoadingPdf(false);
    }
  };

  const onExtrairLocal = async () => {
    if (!upload.file || !upload.previewUrl) {
      setError("Selecione uma imagem antes de fazer a leitura local.");
      return;
    }

    setLoadingLocal(true);
    setOcrProgress(0);
    setError("");
    setMensagem("");

    try {
      const Tesseract = await import("tesseract.js");
      const imagemTratada = await preprocessarImagemParaOcr(upload.previewUrl);
      const resultado = await Tesseract.recognize(imagemTratada, "por+eng", {
        logger: (info) => {
          if (info.status === "recognizing text") {
            setOcrProgress(Math.round((info.progress || 0) * 100));
          }
        },
      });

      const texto = resultado.data.text || "";
      const interpretado = interpretarTextoLocal(texto);
      setItens(interpretado.itens);
      setObservacoesGerais(interpretado.observacao);
      setMensagem(
        interpretado.itens.length
          ? `${interpretado.itens.length} medida(s) encontrada(s) pela leitura local. Confira porque desenho manual pode confundir o OCR.`
          : "A leitura local terminou, mas nao encontrou medidas com seguranca."
      );
    } catch (localError) {
      console.error(localError);
      setError("Nao foi possivel ler localmente. Verifique a imagem ou tente a leitura com IA.");
    } finally {
      setLoadingLocal(false);
      setOcrProgress(0);
    }
  };

  const enviarParaCentral = () => {
    const itensValidos = itens.filter((item) => item.largura > 0 && item.altura > 0 && item.quantidade > 0);
    if (!itensValidos.length) {
      setError("Confira a tabela: precisa ter ao menos um item com largura, altura e quantidade.");
      return;
    }

    const existentes = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(CENTRAL_KEY) || "[]") as ProjetoCentralImagem[];
      } catch {
        return [] as ProjetoCentralImagem[];
      }
    })();

    const novos: ProjetoCentralImagem[] = itensValidos.map((item, index) => {
      const projeto = resumoProjeto(item.projeto);
      return {
        id: criarId(),
        projeto: projeto.nome,
        largura: item.largura,
        altura: item.altura,
        quantidade: item.quantidade,
        vidro: "Vidro a definir",
        corKit: "A definir",
        corPerfil: "A definir",
        valorTotal: 0,
        desenhoUrl: projeto.desenho,
        origemRota: projeto.rota || undefined,
        origemTipo: "imagem",
        observacao: item.observacao || "Importado da pagina Imagens",
        medidasDetalhadas: `Origem: imagem\nItem ${index + 1}\nConfianca: ${item.confianca || "media"}`,
        pecasDivisao: projeto.pecas,
        materiais: [],
      };
    });

    window.localStorage.setItem(CENTRAL_KEY, JSON.stringify([...existentes, ...novos]));
    window.localStorage.setItem(CENTRAL_NUMERO_KEY, window.localStorage.getItem(CENTRAL_NUMERO_KEY) || "Novo Orçamento");
    window.localStorage.setItem(CENTRAL_CLIENTE_KEY, window.localStorage.getItem(CENTRAL_CLIENTE_KEY) || "");
    window.localStorage.setItem(CENTRAL_OBRA_KEY, window.localStorage.getItem(CENTRAL_OBRA_KEY) || "Importado por imagem");
    window.localStorage.removeItem(CENTRAL_ORCAMENTO_ID_KEY);
    router.push("/central-impressao");
  };

  const conteudoCarregando = authLoading;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Sidebar
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        nomeEmpresa={nomeEmpresa}
        expandido={sidebarExpandido}
        setExpandido={setSidebarExpandido}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={signOut}
        />

        <main className="flex-1 space-y-5 p-4 md:p-8">
          {conteudoCarregando ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Loader2 className="size-8 animate-spin" style={{ color: theme.menuIconColor }} />
            </div>
          ) : (
            <>
              <section className="rounded-3xl border p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.menuIconColor }}>
                      <ImageIcon size={14} />
                      Imagens
                    </div>
                    <h1 className="mt-2 text-xl font-medium md:text-2xl" style={{ color: theme.contentTextLightBg }}>
                      Leitura de medidas por imagem
                    </h1>
                    <p className="mt-1 max-w-3xl text-xs md:text-sm" style={{ color: `${theme.contentTextLightBg}99` }}>
                      Envie uma foto do rascunho da obra. O sistema tenta identificar quantidade, projeto, largura e altura para montar uma lista revisável.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setItens(EXEMPLO_FOTO)}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm"
                      style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                    >
                      <PencilLine size={15} />
                      Usar exemplo
                    </button>
                    <button
                      type="button"
                      onClick={onExtrair}
                      disabled={!hasImage || isPdf || loading || loadingLocal || loadingPdf}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: theme.menuIconColor }}
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles size={15} />}
                      {loading ? "Lendo..." : "Ler com IA"}
                    </button>
                    <button
                      type="button"
                      onClick={onExtrairLocal}
                      disabled={!hasImage || isPdf || loading || loadingLocal || loadingPdf}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                    >
                      {loadingLocal ? <Loader2 className="size-4 animate-spin" /> : <ScanText size={15} />}
                      {loadingLocal ? `Local ${ocrProgress}%` : "Ler local"}
                    </button>
                    <button
                      type="button"
                      onClick={onExtrairPdf}
                      disabled={!isPdf || loading || loadingLocal || loadingPdf}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: theme.menuIconColor }}
                    >
                      {loadingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileText size={15} />}
                      {loadingPdf ? "Importando..." : "Ler PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={enviarParaCentral}
                      disabled={!itens.length}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                    >
                      <FilePlus2 size={15} />
                      PDF+
                    </button>
                  </div>
                </div>
              </section>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertTriangle className="size-4" />
                  {error}
                </div>
              )}

              {mensagem && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {mensagem}
                </div>
              )}

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <article className="rounded-3xl border bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-medium text-slate-800">Arquivo da obra</h2>
                  <p className="mt-1 text-xs text-slate-500">{uploadHint}</p>

                  <label
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={async (event) => {
                      event.preventDefault();
                      setDragActive(false);
                      const droppedFile = event.dataTransfer.files?.[0];
                      if (droppedFile) await handleFile(droppedFile);
                    }}
                    className={`mt-4 flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                      dragActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                      className="hidden"
                      onChange={async (event) => {
                        const selected = event.target.files?.[0];
                        if (selected) await handleFile(selected);
                      }}
                    />

                    {isPdf ? (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center">
                        <FileText className="size-12 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{upload.file?.name}</p>
                          <p className="mt-1 text-xs text-slate-400">PDF pronto para leitura de texto</p>
                        </div>
                      </div>
                    ) : hasImage ? (
                      <img src={upload.previewUrl} alt="Preview da imagem" className="max-h-[480px] w-full rounded-xl object-contain" />
                    ) : (
                      <>
                        <UploadCloud className="mb-3 size-10 text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">Arraste a foto ou PDF aqui</p>
                        <p className="text-xs text-slate-400">ou clique para selecionar</p>
                      </>
                    )}
                  </label>
                </article>

                <article className="rounded-3xl border bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-slate-800">Itens encontrados</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {totais.vaos} vão(s), {totais.pecas} peça(s) previstas. Confira tudo antes de mandar ao PDF+.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={adicionarLinha}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus size={15} />
                      Adicionar linha
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-sm">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Projeto</th>
                          <th className="px-4 py-3 text-right font-medium">Qtd.</th>
                          <th className="px-4 py-3 text-right font-medium">Largura</th>
                          <th className="px-4 py-3 text-right font-medium">Altura</th>
                          <th className="px-4 py-3 text-left font-medium">Observação</th>
                          <th className="px-4 py-3 text-left font-medium">Conf.</th>
                          <th className="px-4 py-3 text-right font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                              Nenhum item ainda. Envie uma imagem ou use o exemplo para testar.
                            </td>
                          </tr>
                        ) : (
                          itens.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="px-4 py-3">
                                <select
                                  value={item.projeto}
                                  onChange={(event) => atualizarItem(item.id, { projeto: event.target.value as ItemOrcamentoImagem["projeto"] })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
                                >
                                  {PROJETOS_OPCOES.map((projeto) => (
                                    <option key={projeto.valor} value={projeto.valor}>{projeto.nome}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  value={item.quantidade}
                                  onChange={(event) => atualizarItem(item.id, { quantidade: Number(event.target.value) || 0 })}
                                  inputMode="numeric"
                                  className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-slate-400"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  value={item.largura}
                                  onChange={(event) => atualizarItem(item.id, { largura: Number(event.target.value) || 0 })}
                                  inputMode="numeric"
                                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-slate-400"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  value={item.altura}
                                  onChange={(event) => atualizarItem(item.id, { altura: Number(event.target.value) || 0 })}
                                  inputMode="numeric"
                                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-slate-400"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={item.observacao || ""}
                                  onChange={(event) => atualizarItem(item.id, { observacao: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                                  placeholder="Ex: fume 8mm, preto..."
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.confianca || "media"}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setItens((atuais) => atuais.filter((atual) => atual.id !== item.id))}
                                  className="inline-flex size-9 items-center justify-center rounded-xl border border-red-100 text-red-500 hover:bg-red-50"
                                  title="Remover"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-slate-500">
                      {observacoesGerais || "Dica: depois de enviar ao PDF+, confira vidro, cor e modo de cada projeto na Central."}
                    </p>
                    <button
                      type="button"
                      onClick={enviarParaCentral}
                      disabled={!itens.length}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: theme.menuIconColor }}
                    >
                      Enviar para Central
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
