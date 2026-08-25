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

const termosComerciaisVidro = [
  "acidato",
  "bronze",
  "cebrace",
  "clear",
  "cool",
  "extra",
  "fume",
  "lite",
  "neutral",
  "pontilhado",
  "reflecta",
  "reflect",
  "sunlight",
  "verde",
  "st",
  "str",
  "plus",
];

const palavrasIgnoradasComparacao = new Set([
  "mm",
  "vidro",
  "espelho",
  "fixo",
  "fixa",
  "movel",
  "movel",
  "porta",
  "janela",
  "superior",
  "inferior",
  "bandeira",
  "sacada",
  "peca",
  "pecas",
]);

const tokensVidro = (texto?: string | number | null) =>
  normalizarTextoVidro(texto)
    .split(" ")
    .filter(Boolean);

const extrairEspessuraVidro = (texto?: string | number | null) => {
  const encontrado = String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/\b(\d{1,2}(?:\s*[+/]\s*\d{1,2})?)\s*mm\b/);

  if (!encontrado?.[1]) return "";

  return encontrado[1]
    .replace(/\s/g, "")
    .split(/[+/]/)
    .map((parte) => parte.padStart(2, "0"))
    .join("+");
};

const extrairTiposVidro = (texto?: string | number | null) => {
  const normalizado = normalizarTextoVidro(texto);
  return ["temperado", "laminado", "cortado", "lapidado", "bisote", "comum"].filter((tipo) =>
    normalizado.includes(tipo),
  );
};

export const descricaoVidroCompativel = (
  descricaoBusca?: string | number | null,
  descricaoCandidato?: string | number | null,
) => {
  const busca = normalizarTextoVidro(descricaoBusca);
  const candidato = normalizarTextoVidro(descricaoCandidato);

  if (!busca || !candidato) return false;
  if (busca === candidato) return true;

  const buscaTokens = new Set(tokensVidro(busca));
  const candidatoTokens = new Set(tokensVidro(candidato));

  const espessuraBusca = extrairEspessuraVidro(descricaoBusca);
  const espessuraCandidato = extrairEspessuraVidro(descricaoCandidato);
  if (espessuraBusca && espessuraCandidato && espessuraBusca !== espessuraCandidato) {
    return false;
  }

  const tiposBusca = extrairTiposVidro(descricaoBusca);
  const tiposCandidato = extrairTiposVidro(descricaoCandidato);
  if (tiposBusca.length && tiposCandidato.length && !tiposBusca.every((tipo) => tiposCandidato.includes(tipo))) {
    return false;
  }

  const comerciaisBusca = termosComerciaisVidro.filter((termo) => buscaTokens.has(termo));
  const comerciaisCandidato = termosComerciaisVidro.filter((termo) => candidatoTokens.has(termo));
  const mesmosTermosComerciais =
    comerciaisBusca.every((termo) => candidatoTokens.has(termo)) &&
    comerciaisCandidato.every((termo) => buscaTokens.has(termo));

  if (!mesmosTermosComerciais) return false;

  const significativosBusca = [...buscaTokens].filter(
    (token) => !palavrasIgnoradasComparacao.has(token) && !/^\d+$/.test(token),
  );

  if (!significativosBusca.length) return false;

  return significativosBusca.every((token) => candidatoTokens.has(token));
};

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
    .filter(({ chave }) => chave && descricaoVidroCompativel(texto, chave))
    .sort((a, b) => b.chave.length - a.chave.length)[0]?.vidro || null;
};
