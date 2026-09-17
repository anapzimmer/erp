export type RegraAcabamentoEspelho = {
  id: string | number;
  empresa_id?: string;
  nome: string;
  tipo_visual: string;
  tipo_calculo: string;
  preco?: unknown;
  porcentagem_aumento?: unknown;
  sobra_largura?: unknown;
  sobra_altura?: unknown;
  preco_jato?: unknown;
  preco_adesivo?: unknown;
};

export type EntradaEspelho = {
  largura: number;
  altura: number;
  quantidade: number;
  precoVidroM2: unknown;
  acabamento: RegraAcabamentoEspelho | null;
  divisoesLargura?: number;
  divisoesAltura?: number;
};

const numero = (valor: unknown, campo: string): number => {
  const n = typeof valor === "string" ? Number(valor.trim().replace(",", ".")) : Number(valor ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${campo} deve ser um número válido, maior ou igual a zero.`);
  return n;
};
const inteiroPositivo = (valor: number, campo: string) => {
  if (!Number.isInteger(valor) || valor < 1) throw new Error(`${campo} deve ser um número inteiro maior que zero.`);
  return valor;
};
const moeda = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

export function calcularEspelho(entrada: EntradaEspelho) {
  const largura = numero(entrada.largura, "Largura");
  const altura = numero(entrada.altura, "Altura");
  if (!largura || !altura) throw new Error("Informe largura e altura maiores que zero.");
  const quantidade = inteiroPositivo(entrada.quantidade, "Quantidade");
  const acb = entrada.acabamento;
  const ehJogo = !!acb?.tipo_visual?.toLowerCase().includes("jogo");
  const divL = ehJogo ? inteiroPositivo(entrada.divisoesLargura ?? 1, "Divisão da largura") : 1;
  const divA = ehJogo ? inteiroPositivo(entrada.divisoesAltura ?? 1, "Divisão da altura") : 1;
  const pecas = quantidade * divL * divA;
  const precoVidroM2 = numero(entrada.precoVidroM2, "Preço do vidro");
  const regra = acb ? {
    id: acb.id, empresa_id: acb.empresa_id, nome: acb.nome, tipo_visual: acb.tipo_visual,
    tipo_calculo: acb.tipo_calculo,
    preco: numero(acb.preco, "Preço do acabamento"),
    porcentagem_aumento: numero(acb.porcentagem_aumento, "Porcentagem"),
    sobra_largura: numero(acb.sobra_largura, "Sobra de largura"),
    sobra_altura: numero(acb.sobra_altura, "Sobra de altura"),
    preco_jato: numero(acb.preco_jato, "Preço do jato"),
    preco_adesivo: numero(acb.preco_adesivo, "Preço do adesivo"),
  } : null;
  const larguraPeca = largura / divL;
  const alturaPeca = altura / divA;
  // Sobras cadastradas em cm, aplicadas uma vez em cada dimensão de cada peça.
  const larguraCobrada = Math.ceil((larguraPeca + (regra?.sobra_largura ?? 0) * 10) / 50) * 50;
  const alturaCobrada = Math.ceil((alturaPeca + (regra?.sobra_altura ?? 0) * 10) / 50) * 50;
  const m2 = larguraCobrada * alturaCobrada * pecas / 1_000_000;
  // Metragem comercial: soma de 2 × (largura + altura) de cada peça, sem sobras.
  const metrosLineares = 2 * (larguraPeca + alturaPeca) * pecas / 1000;
  const valorVidro = moeda(m2 * precoVidroM2);
  let baseAcabamento = 0;
  let precoAcabamento = regra?.preco ?? 0;
  if (regra) {
    switch (regra.tipo_calculo) {
      case "m2": baseAcabamento = m2; break;
      case "metro_linear": baseAcabamento = metrosLineares; break;
      case "unitário": baseAcabamento = pecas; break;
      case "porcentagem": baseAcabamento = valorVidro / 100; precoAcabamento = regra.porcentagem_aumento; break;
      default: throw new Error("Unidade do acabamento inválida. Revise o cadastro de Acabamentos.");
    }
  }
  const valorAcabamento = moeda(baseAcabamento * precoAcabamento);
  // Os adicionais são explícitos no cadastro; zero significa não cobrar.
  const valorJato = moeda(m2 * (regra?.preco_jato ?? 0));
  const valorAdesivo = moeda(m2 * (regra?.preco_adesivo ?? 0));
  const total = moeda(valorVidro + valorAcabamento + valorJato + valorAdesivo);
  return {
    m2, total, quantidadePecas: pecas,
    memoriaCalculo: {
      versao: 1 as const,
      arredondamentoMm: 50,
      entrada: { largura, altura, quantidade, precoVidroM2, acabamento: regra, divisoesLargura: divL, divisoesAltura: divA },
      larguraPeca, alturaPeca, larguraCobrada, alturaCobrada,
      m2, metrosLineares, quantidadePecas: pecas, baseAcabamento,
      valorVidro, valorAcabamento, valorJato, valorAdesivo, total,
    },
  };
}

export type MemoriaCalculoEspelho = ReturnType<typeof calcularEspelho>["memoriaCalculo"];

export type ItemEspelhoSalvo = {
  id?: string | number;
  vidroId?: string | number;
  acabamentoId?: string | number;
  descricao?: string;
  medidas?: string;
  precoVidroM2?: number;
  tipoVisual?: string;
  larguraReal?: number;
  alturaReal?: number;
  quantidade?: number;
  divisoesLargura?: number;
  divisoesAltura?: number;
  m2?: number;
  total?: number;
  memoriaCalculo?: MemoriaCalculoEspelho;
};

export function quantidadePecasEspelho(item: ItemEspelhoSalvo) {
  if (item.memoriaCalculo) return item.memoriaCalculo.quantidadePecas;
  const jogo = item.tipoVisual?.toLowerCase().includes("jogo");
  return Math.max(1, Number(item.quantidade || 1)) * (jogo
    ? Math.max(1, Number(item.divisoesLargura || 1)) * Math.max(1, Number(item.divisoesAltura || 1)) : 1);
}

export function trocarVidroEspelho(item: ItemEspelhoSalvo, vidro: { id: string; descricao: string; preco: number }): ItemEspelhoSalvo {
  if (!item.memoriaCalculo || item.memoriaCalculo.versao !== 1) {
    throw new Error("Este espelho foi calculado antes da atualização. Edite-o em Cálculo de Espelhos para conferir o acabamento antes de trocar o vidro.");
  }
  const calculo = calcularEspelho({ ...item.memoriaCalculo.entrada, precoVidroM2: vidro.preco });
  const acabamento = calculo.memoriaCalculo.entrada.acabamento;
  return {
    ...item, vidroId: vidro.id, precoVidroM2: vidro.preco,
    descricao: `${vidro.descricao}${acabamento ? ` - ${acabamento.nome}` : ""}`,
    m2: calculo.m2, total: calculo.total, memoriaCalculo: calculo.memoriaCalculo,
  };
}
