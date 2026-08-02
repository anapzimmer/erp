export type SacadaTorreInput = {
  larguraVaoMm: number;
  alturaVaoMm: number;
  quantidadeVaos: number;
  quantidadeDivisoesLargura: number;
  quantidadeTorresPorVidro: number;
  precoVidroM2?: number;
  vidroDescricao?: string;
  torreCodigo?: string;
  torreNome?: string;
  precoTorreUnitario?: number;
  precoGrapa3019?: number;
  precoGrapa1305?: number;
};

export type SacadaTorrePerfil = {
  nome: string;
  codigo: string;
  comprimentoTotal: number;
  quantidadeBarras: number;
  precoBarra: number;
  valorTotal: number;
  cortes: number[];
};

export type SacadaTorreAcessorio = {
  nome: string;
  codigo: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type SacadaTorreResultado = {
  quantidadeVaos: number;
  quantidadeVidrosPorVao: number;
  quantidadeTotalVidros: number;
  quantidadeTorresPorVidro: number;
  quantidadeTotalTorres: number;
  quantidadeGrapas3019: number;
  quantidadeGrapas1305: number;
  quantidadeGrapas: number;
  larguraVidroMm: number;
  alturaVidroMm: number;
  larguraVidroCalculoMm: number;
  alturaVidroCalculoMm: number;
  areaVidroPorPeca: number;
  areaTotalVidro: number;
  vidroTipo: string;
  precoVidroM2: number;
  totalVidro: number;
  perfis: SacadaTorrePerfil[];
  acessorios: SacadaTorreAcessorio[];
  totalPerfis: number;
  totalAcessorios: number;
  totalGeral: number;
};

const BARRA_ALUMINIO_MM = 6000;

const arredondarDinheiro = (valor: number) => Number(valor.toFixed(2));
const arredondarMedida = (valor: number) => Math.max(Math.ceil(valor / 50) * 50, 0);

export const calcularSacadaTorre = ({
  larguraVaoMm,
  alturaVaoMm,
  quantidadeVaos,
  quantidadeDivisoesLargura,
  quantidadeTorresPorVidro,
  precoVidroM2 = 0,
  vidroDescricao,
  torreCodigo = "",
  torreNome = "Torre",
  precoTorreUnitario = 0,
  precoGrapa3019 = 0,
  precoGrapa1305 = 0,
}: SacadaTorreInput): SacadaTorreResultado => {
  const larguraNormalizada = Math.max(larguraVaoMm, 0);
  const alturaNormalizada = Math.max(alturaVaoMm, 0);
  const quantidadeNormalizada = Math.max(Math.floor(quantidadeVaos || 0), 0);
  const divisaoNormalizada = Math.max(Math.floor(quantidadeDivisoesLargura || 0), 1);
  const torresPorVidro = Math.max(Math.floor(quantidadeTorresPorVidro || 0), 0);

  const larguraVidroMm = larguraNormalizada / divisaoNormalizada;
  const alturaVidroMm = alturaNormalizada;
  const larguraVidroCalculoMm = arredondarMedida(larguraVidroMm);
  const alturaVidroCalculoMm = arredondarMedida(alturaVidroMm);
  const quantidadeTotalVidros = divisaoNormalizada * quantidadeNormalizada;
  const quantidadeTotalTorres = quantidadeTotalVidros * torresPorVidro;
  const quantidadeGrapas3019 = quantidadeNormalizada > 0 ? quantidadeNormalizada * 2 : 0;
  const quantidadeGrapas1305 = Math.max(divisaoNormalizada - 1, 0) * quantidadeNormalizada;
  const quantidadeGrapas = quantidadeGrapas3019 + quantidadeGrapas1305;
  const areaVidroPorPeca = (larguraVidroCalculoMm * alturaVidroCalculoMm) / 1_000_000;
  const areaTotalVidro = areaVidroPorPeca * quantidadeTotalVidros;
  const totalVidro = areaTotalVidro * precoVidroM2;

  const acessorios: SacadaTorreAcessorio[] = [
    ...(torreCodigo
      ? [
          {
            nome: torreNome || "Torre",
            codigo: torreCodigo,
            quantidade: quantidadeTotalTorres,
            precoUnitario: arredondarDinheiro(precoTorreUnitario),
            valorTotal: arredondarDinheiro(quantidadeTotalTorres * precoTorreUnitario),
          },
        ]
      : []),
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

  const perfis: SacadaTorrePerfil[] = [];
  const totalPerfis = 0;
  const totalAcessorios = arredondarDinheiro(acessorios.reduce((total, acessorio) => total + acessorio.valorTotal, 0));

  return {
    quantidadeVaos: quantidadeNormalizada,
    quantidadeVidrosPorVao: divisaoNormalizada,
    quantidadeTotalVidros,
    quantidadeTorresPorVidro: torresPorVidro,
    quantidadeTotalTorres,
    quantidadeGrapas3019,
    quantidadeGrapas1305,
    quantidadeGrapas,
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
