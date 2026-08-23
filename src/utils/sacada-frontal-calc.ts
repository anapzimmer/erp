import { calcularBarrasPorCortes, prepararCortesPorBarra } from "@/utils/barras";

export type SacadaFrontalInput = {
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  quantidadeDivisoesLargura: number;
  precoVidroM2?: number;
  vidroDescricao?: string;
  isSacadaSuperior?: boolean;
  tipoSacada?: "panoramica" | "tubo";
};

export type SacadaFrontalPerfilCodigo = "GR 84" | "GR 74" | "GR 77" | "GR 75" | "TR019" | "TQ047" | "VT66";

export type SacadaFrontalPerfil = {
  nome: string;
  codigo: SacadaFrontalPerfilCodigo;
  comprimentoTotal: number;
  quantidadeBarras: number;
  precoBarra: number;
  valorTotal: number;
  cortes?: number[];
};

export type SacadaFrontalResultado = {
  quantidadeVaos: number;
  quantidadeVidrosPorVao: number;
  quantidadeTotalVidros: number;
  quantidadePontaletesPorVao: number;
  quantidadeTotalPontaletes: number;
  larguraVidroMm: number;
  alturaVidroMm: number;
  larguraVidroCalculoMm: number;
  alturaVidroCalculoMm: number;
  areaVidroPorPeca: number;
  areaTotalVidro: number;
  vidroTipo: string;
  precoVidroM2: number;
  totalVidro: number;
  perfis: SacadaFrontalPerfil[];
  totalPerfis: number;
  totalGeral: number;
  acessorios: string[];
};

const BARRA_ALUMINIO_MM = 6000;
const DESCONTO_ALTURA_VIDRO_MM = 100;

const PERFIS_CONFIG = [
  { nome: "Gradil Superior", codigo: "GR 84", precoBarra: 298 },
  { nome: "Capa Gradil", codigo: "GR 74", precoBarra: 71.2 },
  { nome: "Pontalete", codigo: "GR 77", precoBarra: 228 },
  { nome: "Guia J", codigo: "GR 75", precoBarra: 110 },
] as const;

const ACESSORIOS_PADRAO = [
  "Canopla",
  "Chumbador",
  "Suporte fixacao corrimao",
  "Suporte fixacao vidro",
  "Guarnicao",
  "Parafuso 1/4 x 5/8",
  "Porca 1/4",
  "Tampa nylon 3/4",
  "Tapa furo 3/8",
] as const;

const PERFIS_TUBO_CONFIG = [
  { nome: "Tubo retangular 76x38", codigo: "TR019" },
  { nome: "Tubo quadrado 50x50", codigo: "TQ047" },
  { nome: "Perfil U", codigo: "VT66" },
] as const;

const arredondarDinheiro = (valor: number) => Number(valor.toFixed(2));
const arredondarMedida = (valor: number) => Math.max(Math.ceil(valor / 50) * 50, 0);

export const calcularSacadaFrontal = ({
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  quantidadeDivisoesLargura,
  precoVidroM2 = 0,
  vidroDescricao,
  isSacadaSuperior = false,
  tipoSacada = "panoramica",
}: SacadaFrontalInput): SacadaFrontalResultado => {
  const larguraNormalizada = Math.max(larguraVaoMm, 0);
  const alturaNormalizada = Math.max(alturaVaoMm, 0);
  const quantidadeNormalizada = Math.max(Math.floor(quantidadeVaos || 0), 0);
  const divisaoNormalizada = Math.max(Math.floor(quantidadeDivisoesLargura || 0), 1);

  // Cálculo da largura com desconto especial para sacada superior
  let larguraVidroMm = larguraNormalizada / divisaoNormalizada;
  if (isSacadaSuperior) {
    const descontoTotal = 3 * divisaoNormalizada; // 3mm por vidro
    larguraVidroMm = Math.max(larguraNormalizada - descontoTotal, 0) / divisaoNormalizada;
  }

  const descontoAltura = tipoSacada === "tubo"
    ? 0
    : isSacadaSuperior ? 200 : DESCONTO_ALTURA_VIDRO_MM;
  const alturaVidroMm = Math.max(alturaNormalizada - descontoAltura, 0);
  const larguraVidroCalculoMm = arredondarMedida(larguraVidroMm);
  const alturaVidroCalculoMm = arredondarMedida(alturaVidroMm);
  const quantidadePontaletesPorVao = divisaoNormalizada + 1;
  const quantidadeTotalPontaletes = quantidadePontaletesPorVao * quantidadeNormalizada;
  const quantidadeTotalVidros = divisaoNormalizada * quantidadeNormalizada;
  const areaVidroPorPeca = (larguraVidroCalculoMm * alturaVidroCalculoMm) / 1_000_000;
  const areaTotalVidro = areaVidroPorPeca * quantidadeTotalVidros;
  const totalVidro = areaTotalVidro * precoVidroM2;

  const perfis: SacadaFrontalPerfil[] = tipoSacada === "tubo"
    ? PERFIS_TUBO_CONFIG.map((perfilConfig) => {
      const cortes = perfilConfig.codigo === "TR019"
        ? Array.from({ length: quantidadeNormalizada }, () => larguraNormalizada)
        : perfilConfig.codigo === "TQ047"
          ? Array.from({ length: quantidadeTotalPontaletes }, () => alturaNormalizada)
          : Array.from({ length: quantidadeTotalVidros }).flatMap(() => [
              larguraVidroMm,
              larguraVidroMm,
              alturaVidroMm,
              alturaVidroMm,
            ]);

      const cortesValidos = prepararCortesPorBarra(
        cortes.map((corte) => Math.round(corte)).filter((corte) => corte > 0),
        BARRA_ALUMINIO_MM
      );
      const comprimentoBase = cortesValidos.reduce((total, corte) => total + corte, 0);

      const quantidadeBarras = calcularBarrasPorCortes(cortesValidos, BARRA_ALUMINIO_MM);

      return {
        nome: perfilConfig.nome,
        codigo: perfilConfig.codigo,
        comprimentoTotal: Math.round(comprimentoBase),
        quantidadeBarras,
        precoBarra: 0,
        valorTotal: 0,
        cortes: cortesValidos,
      };
    })
    : PERFIS_CONFIG.map((perfilConfig) => {
      const cortes = perfilConfig.codigo === "GR 77"
        ? Array.from({ length: quantidadePontaletesPorVao * quantidadeNormalizada }, () => alturaNormalizada)
        : Array.from({ length: quantidadeNormalizada }, () => larguraNormalizada);
      const cortesValidos = prepararCortesPorBarra(cortes, BARRA_ALUMINIO_MM);
      const comprimentoBase = cortesValidos.reduce((total, corte) => total + corte, 0);

      const quantidadeBarras = calcularBarrasPorCortes(cortesValidos, BARRA_ALUMINIO_MM);

      const valorTotal = quantidadeBarras * perfilConfig.precoBarra;

      return {
        nome: perfilConfig.nome,
        codigo: perfilConfig.codigo,
        comprimentoTotal: Math.round(comprimentoBase),
        quantidadeBarras,
        precoBarra: arredondarDinheiro(perfilConfig.precoBarra),
        valorTotal: arredondarDinheiro(valorTotal),
        cortes: cortesValidos,
      };
    });

  const totalPerfis = arredondarDinheiro(
    perfis.reduce((acumulado, perfil) => acumulado + perfil.valorTotal, 0)
  );

  return {
    quantidadeVaos: quantidadeNormalizada,
    quantidadeVidrosPorVao: divisaoNormalizada,
    quantidadeTotalVidros,
    quantidadePontaletesPorVao,
    quantidadeTotalPontaletes,
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
    totalPerfis,
    totalGeral: arredondarDinheiro(totalPerfis + totalVidro),
    acessorios: tipoSacada === "tubo" ? ["Chumbador"] : [...ACESSORIOS_PADRAO],
  };
};
