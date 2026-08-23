const normalizarTextoVidro = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(vidro|espelho|fixo|fixa|movel|móvel|porta|janela|superior|inferior|bandeira|sacada|peca|pecas)\b/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/g, " ")
    .replace(/[|·,;:()[\]{}_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const localizarVidroPorDescricao = <T>(
  vidros: T[],
  descricao: string | number | null | undefined,
  formatarVidro: (vidro: T) => string
) => {
  const texto = normalizarTextoVidro(descricao);
  if (!texto) return null;

  return vidros
    .map((vidro) => {
      const label = formatarVidro(vidro);
      const chave = normalizarTextoVidro(label);
      return { vidro, chave };
    })
    .filter(({ chave }) => chave && (texto === chave || texto.includes(chave) || chave.includes(texto)))
    .sort((a, b) => b.chave.length - a.chave.length)[0]?.vidro || null;
};
