/** Totais do projeto já incluem quantidades/descontos. Nunca somar materiais
 * nem multiplicar novamente a quantidade para preencher valores ausentes. */
function totalCentavos(projeto: Record<string, unknown>): number | null {
  const valor = projeto.valorTotal ?? projeto.total;
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  if (typeof valor === "string" && !/^\d+(?:\.\d+)?$/.test(valor.trim())) return null;
  const numero = Number(valor);
  const centavos = Math.round((numero + Number.EPSILON) * 100);
  return Number.isFinite(numero) && numero >= 0 && Number.isSafeInteger(centavos) ? centavos : null;
}

export function compararValorRevisao(antes: Record<string, unknown>, depois: Record<string, unknown>) {
  const anterior = totalCentavos(antes), recalculado = totalCentavos(depois);
  return {
    anterior: anterior === null ? null : anterior / 100,
    recalculado: recalculado === null ? null : recalculado / 100,
    diferenca: anterior === null || recalculado === null ? null : (recalculado - anterior) / 100,
  };
}
