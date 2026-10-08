type Material = { descricao: string; unidade: string; valorUnitario: number };
const chave = (m: Material) => `${m.unidade}:${m.descricao}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/g, " ")
  .replace(/\b\d+\s*pecas?\b/g, " ").replace(/\s+/g, " ").trim();

/** Recalcular medidas em uma edição não autoriza reajustar o preço salvo. */
export function preservarPrecosOrcamento<T extends Material>(anteriores: T[], calculados: T[], editando: boolean): T[] {
  if (!editando) return calculados;
  const valores = new Map<string, Set<number>>();
  anteriores.forEach(m => {
    if (!Number.isFinite(m.valorUnitario) || m.valorUnitario < 0) return;
    const k = chave(m), precos = valores.get(k) || new Set<number>();
    precos.add(m.valorUnitario); valores.set(k, precos);
  });
  return calculados.map(m => {
    const precos = valores.get(chave(m));
    if (!precos || precos.size !== 1) return m;
    const valorUnitario = [...precos][0];
    return valorUnitario === m.valorUnitario ? m : { ...m, valorUnitario };
  });
}
