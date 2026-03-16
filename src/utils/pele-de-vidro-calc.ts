//app/utils/pele-de-vidro-calc.ts
import { processarFormula } from "./formula-parser";

export type PeleDeVidroInput = {
  larguraVaoMm: number;
  alturaVaoMm: number;
  quadrosHorizontal: number;
  quadrosVertical: number;
  quantidadeLajes: number;
  quantidadeFachadas?: number;
  quadrosFixos?: number;
  quadrosMoveis?: number;
  precoVidroM2: number;
  perfisDb?: any[];
  acessoriosDb?: any[];
};

export type PeleDeVidroPerfil = {
  nome: string;
  codigo?: string;
  unidade?: string;
  kgmt: number;
  metroLinear: number;
  kgTotal: number;
  barras: number;
  precoBarra: number;
  valorTotal: number;
};

export type PeleDeVidroAcessorio = {
  nome: string;
  codigo?: string;
  unidade?: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type PeleDeVidroResultado = {
  larguraQuadroMm: number;
  alturaQuadroMm: number;
  totalQuadros: number;
  meiaColuna: number;
  colunaCentro: number;
  perfis: PeleDeVidroPerfil[];
  totalPerfis: number;
  acessorios: PeleDeVidroAcessorio[];
  totalAcessorios: number;
  areaVidro: number;
  valorVidro: number;
  totalGeral: number;
};



const BARRA_MM = 6000;

// Fórmulas dos perfis e acessórios conforme planilha PV II
const FORMULAS_PERFIS: Record<string, string> = {
  "Meia coluna": "A * 2 * MULT",
  "Coluna de centro": "A * (QH - 1) * MULT",
  "Cadeirinha": "L * 2 * MULT",
  "Travessa": "(QV - 1) * L * MULT",
  "Perfil quadro": "((L / QH) * 2 + (A / QV) * 2) * (QH * QV) * MULT",
  "Cantoneira linha 25": "4 * 0.05 * (QH * QV) * MULT",
  "Cunha linha 25": "4 * 0.05 * (QH * QV) * MULT",
};

const FORMULAS_ACESSORIOS: Record<string, string> = {
 "Ancoragem H": "(QH - 1) * MULT",
 "Ancoragem inferior": "((QH - 1) + (2 * 2) + (LAJES * 2)) * MULT",
 "Chumbador 3/8": "(((QH - 1) * 2) + ((QH - 1) + (2 * 2) + (LAJES * 2))) * MULT",
 "Prisioneiro": "((QH - 1) + ((QH - 1) + (2 * 2) + (LAJES * 2))) * MULT",
 "GUA160": "(QH - 1) * A * MULT",
 "Presilha painel": "(QH * QV) * 4 * MULT",
 "Presilha coluna": "(QH * QV) * 4 * MULT",
 "GUA161": "2 * A * MULT",
 "GUA162": "((L / QH * 2) + (A / QV * 2)) * (QH * QV) * MULT",
 "Fita VHB 4970": "((L / QH) * 2 + (A / QV) * 2) * (QH * QV) * MULT",
 "Fecho max-ar": "quadrosMoveis * MULT",
 "Braço max": "(quadrosMoveis * 2) * MULT",
};

export function ajustarEmbalagem(codigo: string, metragemTotal: number): number {
  if (codigo.startsWith("GUA")) {
    return Math.ceil(metragemTotal / 50) * 50; // Pacotes de 50mts
  }
  if (codigo === "Fita VHB 4970") {
    return Math.ceil(metragemTotal / 33) * 33; // Rolos de 33mts
  }
  return metragemTotal;
}

export function calcularPeleDeVidro(
  input: PeleDeVidroInput,
): PeleDeVidroResultado {
  const {
    larguraVaoMm: L,
    alturaVaoMm: A,
    quadrosHorizontal: QH,
    quadrosVertical: QV,
    quantidadeLajes: LAJES,
    quantidadeFachadas: FACHADAS = 1,
    quadrosMoveis = 0,
    precoVidroM2,
    perfisDb = [],
    acessoriosDb = [],
  } = input;

    const arredondar50 = (valor: number) => Math.ceil(valor / 50) * 50;

  const multiplicadorTotal =(LAJES > 0 ? LAJES : 1) * (FACHADAS > 0 ? FACHADAS : 1);
  const MULT = FACHADAS > 0 ? FACHADAS : 1;
  
  // Medidas dos quadros
  const larguraQuadroMm = QH > 0 ? L / QH : 0;
  const alturaQuadroMm = QV > 0 ? A / QV : 0;
  const totalQuadros = QH * QV * MULT;
  const meiaColuna = 2;
  const colunaCentro = Math.max(QH - 1, 0);
  const larguraQuadroCalc = arredondar50(larguraQuadroMm);
  const alturaQuadroCalc = arredondar50(alturaQuadroMm);

  // No mapeamento de perfis dentro de calcularPeleDeVidro:
  const perfis: PeleDeVidroPerfil[] = Object.keys(FORMULAS_PERFIS).map(
    (nome) => {
      const formula = FORMULAS_PERFIS[nome];
      const vars = { L, A, QH, QV, LAJES, MULT, quadrosMoveis, FOLGAS: 0 };
      let metroLinear = 0;
      if (nome === "Perfil quadro" && (QH === 0 || QV === 0)) {
        metroLinear = 0;
      } else {
        const calc = processarFormula(formula, vars);
        metroLinear = isNaN(calc) ? 0 : Number(calc.toFixed(2));
      }
      const perfilDb = perfisDb.find((p) => p.nome === nome);
      const precoBarra = perfilDb?.preco ?? 0;
      const codigo = perfilDb?.codigo ?? "-";
      const unidadeStr = perfilDb?.unidade ?? "6MT";
      const kgmt = Number(perfilDb?.kgmt) || 0;
      const barras = metroLinear > 0 ? Math.ceil(metroLinear / BARRA_MM) : 0;

      // Extrai o número da unidade (ex: "6MT" -> 6)
     const kgmtNum = Number(perfilDb?.kgmt) || 0;

// Extrai o tamanho da barra (ex: "6MT" -> 6)
let comprimentoBarra = 6;

if (unidadeStr) {
  const match = unidadeStr.match(/(\d+)/);
  if (match) {
    comprimentoBarra = Number(match[1]);
  }
}

// kg total = kg por metro * metros da barra * quantidade de barras
const kgTotal = Number((kgmtNum * comprimentoBarra * barras).toFixed(3));

      const valorTotal = barras * precoBarra;

      return {
        nome,
        codigo,
        unidade: unidadeStr,
        kgmt,
        kgTotal,
        metroLinear,
        barras,
        precoBarra,
        valorTotal,
      };
    },
  );

  const totalPerfis = perfis.reduce((acc, p) => acc + p.valorTotal, 0);

  // Acessórios
  const camposVazios = !L || !A || !QH || !QV || !MULT;
 const acessorios: PeleDeVidroAcessorio[] = Object.keys(
  FORMULAS_ACESSORIOS,
).map((nome) => {
  const formula = FORMULAS_ACESSORIOS[nome];

  const vars = { L, A, QH, QV, LAJES, MULT, quadrosMoveis, FOLGAS: 0 };

  let qtdOriginal = camposVazios
    ? 0
    : Number(processarFormula(formula, vars));

  if (isNaN(qtdOriginal) || qtdOriginal < 0) qtdOriginal = 0;

  let quantidadeFinal = qtdOriginal;
  let unidadeFinal = "UN";
  let valorTotal = 0;

  if (
    nome.includes("GUA160") ||
    nome.includes("GUA161") ||
    nome.includes("GUA162")
  ) {
    // mm -> metros
    const metros = qtdOriginal / 1000;
    const metrosComSobra = metros + 0.10;
    quantidadeFinal = Math.ceil(metrosComSobra / 50);
    unidadeFinal = "Rolo 50m";
    const acessorioDb = acessoriosDb.find((a) => a.nome === nome);
    const precoUnitario = acessorioDb?.preco ?? 0;
    valorTotal = Number((quantidadeFinal * precoUnitario).toFixed(2));
    return {
      nome,
      codigo: acessorioDb?.codigo ?? "-",
      unidade: unidadeFinal,
      quantidade: quantidadeFinal,
      precoUnitario,
      valorTotal,
    };
  } else if (nome.includes("Fita VHB")) {
    // mm -> metros
    const metros = qtdOriginal / 1000;
    const metrosComSobra = metros + 0.10;
    quantidadeFinal = Math.ceil(metrosComSobra / 33);
    unidadeFinal = "Rolo 33m";
    const acessorioDb = acessoriosDb.find((a) => a.nome === nome);
    const precoUnitario = acessorioDb?.preco ?? 0;
    valorTotal = Number((quantidadeFinal * precoUnitario).toFixed(2));
    return {
      nome,
      codigo: acessorioDb?.codigo ?? "-",
      unidade: unidadeFinal,
      quantidade: quantidadeFinal,
      precoUnitario,
      valorTotal,
      metros: metrosComSobra,
    };
  } else {
    const acessorioDb = acessoriosDb.find((a) => a.nome === nome);
    const precoUnitario = acessorioDb?.preco ?? 0;
    valorTotal = Number((quantidadeFinal * precoUnitario).toFixed(2));
    return {
      nome,
      codigo: acessorioDb?.codigo ?? "-",
      unidade: unidadeFinal,
      quantidade: quantidadeFinal,
      precoUnitario,
      valorTotal,
    };
  }
  });

  // Corrige somatória: valor total dos acessórios deve ser a soma de (quantidade * preço unitário) de cada acessório
  const totalAcessorios = Number(
    acessorios
      .reduce((acc, a) => acc + a.quantidade * a.precoUnitario, 0)
      .toFixed(2),
  );

  // Vidro
  const larguraMCalc = larguraQuadroCalc / 1000;
  const alturaMCalc = alturaQuadroCalc / 1000;
  const areaVidro = Number(
    (larguraMCalc * alturaMCalc * totalQuadros).toFixed(3),
  );
  const valorVidro = Number((areaVidro * precoVidroM2).toFixed(2));
  const totalGeral = Number(
    (totalPerfis + totalAcessorios + valorVidro).toFixed(2),
  );

  const fatorFachada = FACHADAS > 0 ? FACHADAS : 1;

  return {
    larguraQuadroMm,
    alturaQuadroMm,
    totalQuadros,
    meiaColuna: 2 * (FACHADAS > 0 ? FACHADAS : 1),
    colunaCentro: Math.max(QH - 1, 0) * (FACHADAS > 0 ? FACHADAS : 1),
    perfis,
    totalPerfis,
    acessorios,
    totalAcessorios,
    areaVidro,
    valorVidro,
    totalGeral,
  };
}
