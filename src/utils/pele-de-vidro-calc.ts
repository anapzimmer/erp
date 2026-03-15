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
  "Meia coluna": "2 * A * MULT",
  "Coluna de centro": "(QH - 1) * A * MULT",
  Travessa: "L * QV * MULT",
  "Perfil quadro": "((L / QH * 2) + (A / QV * 2)) * (QH * QV) * MULT",
  Cadeirinha: "(QH * QV) * 0.15 * MULT",
  "Cantoneira linha 25": "(QH * QV) * 0.12 * MULT",
  "Cunha linha 25": "(QH * QV) * 0.12 * MULT",
};

const FORMULAS_ACESSORIOS: Record<string, string> = {
  "Presilha painel": "QH * QV * 4 * MULT",
  "Presilha coluna": "QH * QV * 4 * MULT",
  "Fecho max-ar": "QH * QV * MULT",
  "Braço max": "QH * QV * MULT",
  "Ancoragem H (coluna)": "(QH + 1) * MULT",
  "Ancoragem inferior (coluna)": "(QH + 1) * MULT",
  "Chumbador 3/8": "(QH + 1) * 2 * MULT",
  Prisioneiro: "(QH + 1) * 2 * MULT",
  "Guarnição GUA160": "(QH * QV) * 2 * MULT",
  "Guarnição GUA161": "(QH * QV) * 2 * MULT",
  "Guarnição GUA162": "(QH * QV) * 2 * MULT",
  "Fita VHB 4970": " (QH * QV) *2 * MULT",
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
    quadrosFixos = 0,
    quadrosMoveis = 0,
    precoVidroM2,
    perfisDb = [],
    acessoriosDb = [],
  } = input;

    const arredondar50 = (valor: number) => Math.ceil(valor / 50) * 50;

  const multiplicadorTotal =(LAJES > 0 ? LAJES : 1) * (FACHADAS > 0 ? FACHADAS : 1);
  const MULT = multiplicadorTotal;
  
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
      const vars = { L, A, QH, QV, MULT, FOLGAS: 0 };
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
      const matchUnidade = unidadeStr.match(/(\d+)/);
      const unidadeNum = matchUnidade ? Number(matchUnidade[1]) : 1;
      const comprimentoBarra = unidadeNum;
      // Fórmula: kgmt * 6 * unidadeNum * barras
      const kgTotal = Number((kgmt * comprimentoBarra * barras).toFixed(3));

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
    const vars = { L, A, QH, QV, MULT, FOLGAS: 0 };
    let qtdOriginal = camposVazios
      ? 0
      : Number(processarFormula(formula, vars));
    if (isNaN(qtdOriginal) || qtdOriginal < 0) qtdOriginal = 0;

    // Lógica de conversão para rolos (aplicada ANTES de calcular o valor)
    let quantidadeFinal = qtdOriginal;
    let unidadeFinal = "UN";
    if (
      nome.includes("GUA160") ||
      nome.includes("GUA161") ||
      nome.includes("GUA162")
    ) {
      quantidadeFinal = Math.ceil(qtdOriginal / 50);
      unidadeFinal = "Rolo 50m";
    } else if (nome.includes("Fita VHB")) {
      quantidadeFinal = Math.ceil(qtdOriginal / 33);
      unidadeFinal = "Rolo 33m";
    }

    const acessorioDb = acessoriosDb.find((a) => a.nome === nome);
    const precoUnitario = acessorioDb?.preco ?? 0;
    const valorTotal = Number((quantidadeFinal * precoUnitario).toFixed(2));

    return {
      nome,
      codigo: acessorioDb?.codigo ?? "-",
      unidade: unidadeFinal,
      quantidade: nome.includes("Fita VHB") ? Math.ceil(qtdOriginal / 33) : quantidadeFinal,
      precoUnitario,
      valorTotal: nome.includes("Fita VHB") ? Number((Math.ceil(qtdOriginal / 33) * precoUnitario).toFixed(2)) : Number((quantidadeFinal * precoUnitario).toFixed(2)),
    };
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
