export const DIVISOES_FIXOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

export function normalizarDivisaoFixos(valor?: number | string | null): number {
  const numero = Number(valor || 1);
  if (!Number.isFinite(numero)) return 1;
  const inteiro = Math.min(12, Math.max(1, Math.floor(numero)));
  return inteiro === 11 ? 10 : inteiro;
}

export function desenhoFixosUrl(valor?: number | string | null): string {
  const pecas = normalizarDivisaoFixos(valor);
  return pecas === 1 ? "/desenhos/fixo-1folha.png" : `/desenhos/fixo-${pecas}folhas.png`;
}
