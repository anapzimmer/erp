export type RegraMedidaVidro = { limite_mm: number; percentual: number };
export const REGRA_MEDIDA_PADRAO: RegraMedidaVidro = { limite_mm: 3210, percentual: 7 };
export type ChapaVidro = { largura_mm: number; altura_mm: number };
export type AcrescimoMedida = { regra: RegraMedidaVidro; largura_mm: number; altura_mm: number; fator: number };

export function regraValida(regra: RegraMedidaVidro) {
  return Number.isFinite(regra.limite_mm) && regra.limite_mm > 0 && Number.isFinite(regra.percentual) && regra.percentual >= 0 && regra.percentual <= 100;
}
export function fatorMedidaVidro(largura: number, altura: number, regra = REGRA_MEDIDA_PADRAO) {
  if (!regraValida(regra)) throw new Error("Regra de medida do vidro inválida.");
  return Math.max(largura, altura) > regra.limite_mm ? 1 + regra.percentual / 100 : 1;
}
export function aplicarAcrescimoPorMedida(preco: number, largura: number, altura: number, regra = REGRA_MEDIDA_PADRAO) {
  return preco * fatorMedidaVidro(largura, altura, regra);
}
/** A descrição técnica é gerada com as medidas reais da peça, antes do arredondamento comercial. */
export function precoMaterialVidro(preco: number, descricao: string, regra = REGRA_MEDIDA_PADRAO) {
  const medidas = descricao.match(/(-?\d+(?:[.,]\d+)?)\s*[x×]\s*(-?\d+(?:[.,]\d+)?)/i);
  if (!medidas) throw new Error("Medidas da peça de vidro não identificadas.");
  const largura_mm = Number(medidas[1].replace(",", "."));
  const altura_mm = Number(medidas[2].replace(",", "."));
  const fator = fatorMedidaVidro(largura_mm, altura_mm, regra);
  return { valorUnitario: preco * fator, acrescimoMedida: { regra: { ...regra }, largura_mm, altura_mm, fator } };
}
