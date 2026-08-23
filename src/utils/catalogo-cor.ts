export const normalizarCorCatalogo = (valor?: string | number | null) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const corBaseCatalogo = (valor?: string | number | null) => {
  const texto = normalizarCorCatalogo(valor);

  if (!texto || texto === "escolher") return "";
  if (texto.includes("padrao") || texto.includes("sem cor") || texto.includes("neutro")) return "padrao";
  if (texto.includes("pret")) return "preto";
  if (texto.includes("branc")) return "branco";
  if (texto.includes("fosc") || texto.includes("natural")) return "fosco";
  if (texto.includes("crom") || texto.includes("cromo")) return "cromado";
  if (texto.includes("rose")) return "rose";
  if (texto.includes("gold") || texto.includes("dour")) return "gold";
  if (texto.includes("bronze")) return "bronze";
  if (texto.includes("brilh")) return "brilhante";

  return texto;
};

const extrairCoresCatalogo = (valor?: string | number | null) => {
  const texto = normalizarCorCatalogo(valor);
  if (!texto) return [] as string[];

  return texto
    .split(/[;,/|+]/)
    .flatMap((parte) => parte.split(/\s{2,}|\s+e\s+/))
    .map(corBaseCatalogo)
    .filter(Boolean);
};

export const corPadraoCatalogo = (valor?: string | number | null) => {
  const texto = normalizarCorCatalogo(valor);
  const corBase = corBaseCatalogo(valor);
  return !texto || corBase === "padrao";
};

export const corCatalogoCompativel = (
  corItem?: string | number | null,
  corEscolhida?: string | number | null
) => {
  const escolhidaTexto = normalizarCorCatalogo(corEscolhida);
  const escolhidaBase = corBaseCatalogo(corEscolhida);
  const itemTexto = normalizarCorCatalogo(corItem);
  const itemCores = extrairCoresCatalogo(corItem);

  if (!escolhidaTexto || escolhidaTexto === "escolher") return true;
  if (!itemTexto) return false;
  if (corPadraoCatalogo(corItem)) return false;
  if (escolhidaBase && itemCores.includes(escolhidaBase)) return true;
  if (escolhidaBase && itemCores.some((cor) => cor.includes(escolhidaBase) || escolhidaBase.includes(cor))) return true;

  return itemTexto.includes(escolhidaTexto) || escolhidaTexto.includes(itemTexto);
};

export const escolherItemPorCor = <T>(
  itens: T[],
  corEscolhida: string | number | null | undefined,
  obterCor: (item: T) => string | number | null | undefined
) => {
  if (itens.length === 0) return null;

  const corAtual = normalizarCorCatalogo(corEscolhida);
  if (corAtual && corAtual !== "escolher") {
    const mesmaCor = itens.find((item) => corCatalogoCompativel(obterCor(item), corEscolhida));
    if (mesmaCor) return mesmaCor;
  }

  const padrao = itens.find((item) => corPadraoCatalogo(obterCor(item)));
  return padrao || itens[0] || null;
};
