/** Medidas em mm. Fórmulas extraídas de box2fls, sem mudança comercial. */
export type EntradaBox2Folhas = Readonly<{
  largura: number;
  altura: number;
  quantidade: number;
  trilho: string;
}>;

const arredondar5cm = (valor: number) => Math.ceil(Number(valor || 0) / 50) * 50;

/** Compatibilidade com a tela: aceita zeros durante o preenchimento.
 * Campos sem sufixo Medida são dimensões de cobrança, arredondadas a 50 mm.
 * Não usar este resultado para aprovar ou liberar fabricação.
 */
export function calcularVidrosBox2Folhas(dados: EntradaBox2Folhas) {
    const quantidadeVaos = Number(dados.quantidade || 0);
    const alturaAteTeto = dados.trilho === "Até o teto";
    const larguraFixaMedida = Number(dados.largura || 0) / 2;
    const larguraMovelMedida = larguraFixaMedida + 50;
    const alturaFixaMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 55 : 35));
    const alturaMovelMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 20 : 0));
    const larguraFixa = arredondar5cm(larguraFixaMedida);
    const larguraMovel = arredondar5cm(larguraMovelMedida);
    const alturaFixa = arredondar5cm(alturaFixaMedida);
    const alturaMovel = arredondar5cm(alturaMovelMedida);
    const areaFixa = (larguraFixa * alturaFixa * quantidadeVaos) / 1_000_000;
    const areaMovel = (larguraMovel * alturaMovel * quantidadeVaos) / 1_000_000;
    const areaTotalCobrada = areaFixa + areaMovel;

    return {
      larguraCalculo: larguraMovel,
      alturaCalculo: alturaMovel,
      larguraFixa,
      alturaFixa,
      larguraMovel,
      alturaMovel,
      larguraFixaMedida,
      alturaFixaMedida,
      larguraMovelMedida,
      alturaMovelMedida,
      areaFixa: Number(areaFixa.toFixed(3)),
      areaMovel: Number(areaMovel.toFixed(3)),
      areaTotalCobrada: Number(areaTotalCobrada.toFixed(3)),
    };
}

/** Prévia técnica de um único vão. Não salva nem altera preços ou situações. */
export function calcularConjuntoBox2Folhas(
  entrada: Readonly<{ largura: number; altura: number; trilho: "Padrão" | "Até o teto" }>,
) {
  if (![entrada.largura, entrada.altura].every(v => Number.isFinite(v) && v > 0)) {
    throw new Error("Informe medidas finitas e maiores que zero, em milímetros.");
  }
  if (entrada.trilho !== "Padrão" && entrada.trilho !== "Até o teto") {
    throw new Error("Configuração de trilho não reconhecida.");
  }
  const c = calcularVidrosBox2Folhas({ ...entrada, quantidade: 1 });
  if (c.alturaFixaMedida <= 0 || c.alturaMovelMedida <= 0) {
    throw new Error("A altura do vão deve superar os descontos dos vidros.");
  }
  return {
    vao: { largura: entrada.largura, altura: entrada.altura },
    trilho: entrada.trilho,
    pecas: [
      { tipo: "fixo" as const, quantidade: 1 as const,
        fabricacao: { largura: c.larguraFixaMedida, altura: c.alturaFixaMedida },
        cobranca: { largura: c.larguraFixa, altura: c.alturaFixa } },
      { tipo: "movel" as const, quantidade: 1 as const,
        fabricacao: { largura: c.larguraMovelMedida, altura: c.alturaMovelMedida },
        cobranca: { largura: c.larguraMovel, altura: c.alturaMovel } },
    ],
  };
}
