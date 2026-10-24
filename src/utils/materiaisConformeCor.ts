/** Sem uma cor escolhida, o orçamento deve conter somente o vidro. */
export function corMaterialSelecionada(cor?: string | null): boolean {
  const valor = (cor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return Boolean(valor) && !/^(escolher|selecione|selecionar|nao selecionad)/.test(valor);
}

export function materiaisConformeCor<T extends { descricao: string; unidade: string; perfilExtra?: unknown }>(materiais: T[], cor?: string | null): T[] {
  if (corMaterialSelecionada(cor)) return materiais;
  return materiais.filter((item) => !item.perfilExtra && /^vidro\b/i.test(item.descricao.trim()) && /^(m2|m²)$/i.test(item.unidade.trim()));
}

export function resultadoConformeCor<T extends { perfis: unknown[]; acessorios: unknown[]; totalPerfis: number; totalAcessorios: number; totalVidro: number; totalGeral: number }>(resultado: T, cor?: string | null): T {
  if (corMaterialSelecionada(cor)) return resultado;
  return { ...resultado, perfis: [], acessorios: [], totalPerfis: 0, totalAcessorios: 0, totalGeral: resultado.totalVidro };
}
