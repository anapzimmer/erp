import { calcularBarrasPorCortes, prepararCortesPorBarra } from "@/utils/barras";

export type SacadaGrapaInput = {
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  quantidadeDivisoesLargura: number;
  grapasLateraisPorVao: number;
  grapasInferioresPorVao: number;
  grapas1305PorUniao: number;
  tuboPosicao: "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios";
  precoVidroM2?: number;
  vidroDescricao?: string;
  precoGrapa3019?: number;
  precoGrapa1305?: number;
  tuboCodigo?: string;
  tuboNome?: string;
  precoTuboBarra?: number;
};

export type SacadaGrapaPerfil = {
  nome: string;
  codigo: string;
  comprimentoTotal: number;
  quantidadeBarras: number;
  precoBarra: number;
  valorTotal: number;
  cortes: number[];
};

export type SacadaGrapaAcessorio = {
  nome: string;
  codigo: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type SacadaGrapaResultado = {
  quantidadeVaos: number;
  quantidadeVidrosPorVao: number;
  quantidadeTotalVidros: number;
  grapasLateraisPorVao: number;
  grapasInferioresPorVao: number;
  grapas1305PorUniao: number;
  quantidadeGrapas3019: number;
  quantidadeGrapas1305: number;
  quantidadeGrapas: number;
  tuboPosicao: "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios";
  larguraVidroMm: number;
  alturaVidroMm: number;
  larguraVidroCalculoMm: number;
  alturaVidroCalculoMm: number;
  areaVidroPorPeca: number;
  areaTotalVidro: number;
  vidroTipo: string;
  precoVidroM2: number;
  totalVidro: number;
  perfis: SacadaGrapaPerfil[];
  acessorios: SacadaGrapaAcessorio[];
  totalPerfis: number;
  totalAcessorios: number;
  totalGeral: number;
};

const BARRA_ALUMINIO_MM = 6000;

const arredondarDinheiro = (valor: number) => Number(valor.toFixed(2));
const arredondarMedida = (valor: number) => Math.max(Math.ceil(valor / 50) * 50, 0);
const criarPerfilTubo = (
  codigo: string,
  nome: string,
  precoBarra: number,
  cortes: number[]
): SacadaGrapaPerfil | null => {
  const cortesValidos = prepararCortesPorBarra(cortes, BARRA_ALUMINIO_MM);
  if (!codigo || cortesValidos.length === 0) return null;

  const comprimentoTotal = cortesValidos.reduce((total, corte) => total + corte, 0);
  const quantidadeBarras = calcularBarrasPorCortes(cortesValidos);

  return {
    codigo,
    nome,
    comprimentoTotal,
    quantidadeBarras,
    precoBarra: arredondarDinheiro(precoBarra),
    valorTotal: arredondarDinheiro(quantidadeBarras * precoBarra),
    cortes: cortesValidos,
  };
};

export const calcularSacadaGrapa = ({
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  quantidadeDivisoesLargura,
  grapasLateraisPorVao,
  grapasInferioresPorVao,
  grapas1305PorUniao,
  tuboPosicao,
  precoVidroM2 = 0,
  vidroDescricao,
  precoGrapa3019 = 0,
  precoGrapa1305 = 0,
  tuboCodigo = "",
  tuboNome = "Tubo",
  precoTuboBarra = 0,
}: SacadaGrapaInput): SacadaGrapaResultado => {
  const larguraNormalizada = Math.max(larguraVaoMm, 0);
  const alturaNormalizada = Math.max(alturaVaoMm, 0);
  const quantidadeNormalizada = Math.max(Math.floor(quantidadeVaos || 0), 0);
  const divisaoNormalizada = Math.max(Math.floor(quantidadeDivisoesLargura || 0), 1);
  const lateraisPorVao = Math.max(Math.floor(grapasLateraisPorVao || 0), 0);
  const inferioresPorVidro = Math.max(Math.floor(grapasInferioresPorVao || 0), 0);
  const porUniao = Math.max(Math.floor(grapas1305PorUniao || 0), 0);
  const posicaoTubo = tuboPosicao || "sem";
  const temTuboEmCima = posicaoTubo === "em-cima" || posicaoTubo === "em-cima-e-entre-meios";
  const temTuboNoMeio = posicaoTubo === "entre-meios" || posicaoTubo === "em-cima-e-entre-meios";

  const descontoLateralMm = lateraisPorVao > 0 ? 70 : 0;
  const descontoInferiorMm = inferioresPorVidro > 0 ? 35 : 0;
  const larguraVidroMm = Math.max(larguraNormalizada / divisaoNormalizada - descontoLateralMm, 0);
  const alturaVidroMm = Math.max(alturaNormalizada - descontoInferiorMm, 0);
  const larguraVidroCalculoMm = arredondarMedida(larguraVidroMm);
  const alturaVidroCalculoMm = arredondarMedida(alturaVidroMm);
  const quantidadeTotalVidros = divisaoNormalizada * quantidadeNormalizada;
  const quantidadeUnioesPorVao = Math.max(divisaoNormalizada - 1, 0);
  const quantidadeGrapasLaterais = lateraisPorVao * 2 * quantidadeNormalizada;
  const quantidadeGrapasInferiores = inferioresPorVidro * divisaoNormalizada * quantidadeNormalizada;
  const quantidadeGrapasTuboMeio = temTuboNoMeio ? quantidadeUnioesPorVao * lateraisPorVao * 2 * quantidadeNormalizada : 0;
  const quantidadeGrapas3019 = quantidadeGrapasLaterais + quantidadeGrapasInferiores + quantidadeGrapasTuboMeio;
  const quantidadeGrapas1305 = temTuboNoMeio ? 0 : quantidadeUnioesPorVao * porUniao * quantidadeNormalizada;
  const quantidadeGrapas = quantidadeGrapas3019 + quantidadeGrapas1305;
  const areaVidroPorPeca = (larguraVidroCalculoMm * alturaVidroCalculoMm) / 1_000_000;
  const areaTotalVidro = areaVidroPorPeca * quantidadeTotalVidros;
  const totalVidro = areaTotalVidro * precoVidroM2;

  const cortesTubo = temTuboEmCima
    ? Array.from({ length: quantidadeNormalizada }, () => larguraNormalizada)
    : [];
  if (temTuboNoMeio) {
    cortesTubo.push(...Array.from({ length: quantidadeUnioesPorVao * quantidadeNormalizada }, () => alturaNormalizada));
  }
  const perfilTubo = criarPerfilTubo(tuboCodigo, tuboNome, precoTuboBarra, cortesTubo);
  const perfis = perfilTubo ? [perfilTubo] : [];

  const acessorios: SacadaGrapaAcessorio[] = [
    {
      nome: "Grapa 3019",
      codigo: "3019",
      quantidade: quantidadeGrapas3019,
      precoUnitario: arredondarDinheiro(precoGrapa3019),
      valorTotal: arredondarDinheiro(quantidadeGrapas3019 * precoGrapa3019),
    },
    {
      nome: "Grapa 1305",
      codigo: "1305",
      quantidade: quantidadeGrapas1305,
      precoUnitario: arredondarDinheiro(precoGrapa1305),
      valorTotal: arredondarDinheiro(quantidadeGrapas1305 * precoGrapa1305),
    },
  ];

  const totalPerfis = arredondarDinheiro(perfis.reduce((total, perfil) => total + perfil.valorTotal, 0));
  const totalAcessorios = arredondarDinheiro(acessorios.reduce((total, acessorio) => total + acessorio.valorTotal, 0));

  return {
    quantidadeVaos: quantidadeNormalizada,
    quantidadeVidrosPorVao: divisaoNormalizada,
    quantidadeTotalVidros,
    grapasLateraisPorVao: lateraisPorVao,
    grapasInferioresPorVao: inferioresPorVidro,
    grapas1305PorUniao: porUniao,
    quantidadeGrapas3019,
    quantidadeGrapas1305,
    quantidadeGrapas,
    tuboPosicao: posicaoTubo,
    larguraVidroMm: Math.round(larguraVidroMm),
    alturaVidroMm: Math.round(alturaVidroMm),
    larguraVidroCalculoMm,
    alturaVidroCalculoMm,
    areaVidroPorPeca: Number(areaVidroPorPeca.toFixed(3)),
    areaTotalVidro: Number(areaTotalVidro.toFixed(3)),
    vidroTipo: vidroDescricao || "Vidro nao selecionado",
    precoVidroM2: arredondarDinheiro(precoVidroM2),
    totalVidro: arredondarDinheiro(totalVidro),
    perfis,
    acessorios,
    totalPerfis,
    totalAcessorios,
    totalGeral: arredondarDinheiro(totalVidro + totalPerfis + totalAcessorios),
  };
};
