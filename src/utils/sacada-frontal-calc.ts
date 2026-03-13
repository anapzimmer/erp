export type SacadaFrontalInput = {
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  quantidadeDivisoesLargura: number;
  precoVidroM2?: number;
  vidroDescricao?: string;
};

export type SacadaFrontalPerfilCodigo = "GR 84" | "GR 74" | "GR 77" | "GR 75";

export type SacadaFrontalPerfil = {
  nome: string;
  codigo: SacadaFrontalPerfilCodigo;
  comprimentoTotal: number;
  quantidadeBarras: number;
  precoBarra: number;
  valorTotal: number;
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

const arredondarDinheiro = (valor: number) => Number(valor.toFixed(2));
const arredondarMedida = (valor: number) => Math.max(Math.ceil(valor / 50) * 50, 0);

export const calcularSacadaFrontal = ({
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  quantidadeDivisoesLargura,
  precoVidroM2 = 0,
  vidroDescricao,
}: SacadaFrontalInput): SacadaFrontalResultado => {
  const larguraNormalizada = Math.max(larguraVaoMm, 0);
  const alturaNormalizada = Math.max(alturaVaoMm, 0);
  const quantidadeNormalizada = Math.max(Math.floor(quantidadeVaos || 0), 0);
  const divisaoNormalizada = Math.max(Math.floor(quantidadeDivisoesLargura || 0), 1);

  const larguraVidroMm = larguraNormalizada / divisaoNormalizada;
  const alturaVidroMm = Math.max(alturaNormalizada - DESCONTO_ALTURA_VIDRO_MM, 0);
  const larguraVidroCalculoMm = arredondarMedida(larguraVidroMm);
  const alturaVidroCalculoMm = arredondarMedida(alturaVidroMm);
  const quantidadePontaletesPorVao = divisaoNormalizada + 1;
  const quantidadeTotalPontaletes = quantidadePontaletesPorVao * quantidadeNormalizada;
  const quantidadeTotalVidros = divisaoNormalizada * quantidadeNormalizada;
  const areaVidroPorPeca = (larguraVidroCalculoMm * alturaVidroCalculoMm) / 1_000_000;
  const areaTotalVidro = areaVidroPorPeca * quantidadeTotalVidros;
  const totalVidro = areaTotalVidro * precoVidroM2;

  const perfis: SacadaFrontalPerfil[] = PERFIS_CONFIG.map((perfilConfig) => {
    const comprimentoBase = perfilConfig.codigo === "GR 77"
      ? quantidadePontaletesPorVao * alturaNormalizada * quantidadeNormalizada
      : larguraNormalizada * quantidadeNormalizada;

    const quantidadeBarras = comprimentoBase > 0
      ? Math.ceil(comprimentoBase / BARRA_ALUMINIO_MM)
      : 0;

    const valorTotal = quantidadeBarras * perfilConfig.precoBarra;

    return {
      nome: perfilConfig.nome,
      codigo: perfilConfig.codigo,
      comprimentoTotal: Math.round(comprimentoBase),
      quantidadeBarras,
      precoBarra: arredondarDinheiro(perfilConfig.precoBarra),
      valorTotal: arredondarDinheiro(valorTotal),
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
    acessorios: [...ACESSORIOS_PADRAO],
  };
};
