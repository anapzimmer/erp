export type UnidadeImagem = "cm" | "mm";
export function converterMedidaImagem(valor: unknown, unidade: UnidadeImagem): number {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * (unidade === "cm" ? 10 : 1) * 1000) / 1000 : 0;
}
export function lerListaMedidas(texto: string, unidade: UnidadeImagem) {
  const itens: { largura: number; altura: number; quantidade: number; original: string }[] = [];
  const ignoradas: string[] = [];
  for (const linha of texto.split(/\r?\n/).filter(l => l.trim())) {
    const m = linha.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)(?![\d.,])/);
    if (!m) { ignoradas.push(linha); continue; }
    const largura = converterMedidaImagem(m[1], unidade), altura = converterMedidaImagem(m[2], unidade);
    if (!largura || !altura) { ignoradas.push(linha); continue; }
    itens.push({largura, altura, quantidade: 1, original: linha.trim()});
  }
  return {itens, ignoradas};
}
