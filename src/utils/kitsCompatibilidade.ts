export type KitCompatibilidade = {
  nome?: string | null;
  categoria?: string | null;
  cores?: string | null;
};

export const normalizarKitTexto = (texto?: string | number | null) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizarCorBase = (cor?: string | number | null) => {
  const texto = normalizarKitTexto(cor).replace(/\s+/g, " ").trim();

  if (!texto) return "";
  if (texto.includes("pret")) return "preto";
  if (texto.includes("branc")) return "branco";
  if (texto.includes("fosc")) return "fosco";
  if (texto.includes("crom")) return "cromado";
  if (texto.includes("rose")) return "rose";
  if (texto.includes("gold") || texto.includes("dour")) return "gold";

  return texto;
};

const extrairCoresNormalizadas = (valor?: string | null) => {
  const bruto = normalizarKitTexto(valor);
  if (!bruto) return [] as string[];

  return bruto
    .split(/[;,/|+-]/)
    .flatMap((parte) => parte.split(/\s{2,}|\s+e\s+/))
    .map((parte) => normalizarCorBase(parte))
    .filter(Boolean);
};

export const kitCorCompativel = (kit: KitCompatibilidade, corSelecionada?: string | number | null) => {
  const corAtualTexto = normalizarKitTexto(corSelecionada);
  const corAtualBase = normalizarCorBase(corSelecionada);
  const coresKit = extrairCoresNormalizadas(kit.cores);
  const corKitTexto = normalizarKitTexto(kit.cores);

  if (!corAtualTexto || corAtualTexto === "escolher") return true;
  if (!corKitTexto || corKitTexto === "padrao") return true;

  if (corAtualBase && coresKit.includes(corAtualBase)) return true;

  if (corAtualBase && coresKit.some((cor) => cor.includes(corAtualBase) || corAtualBase.includes(cor))) {
    return true;
  }

  return corKitTexto.includes(corAtualTexto) || corAtualTexto.includes(corKitTexto);
};

export const kitCategoriaCompativel = (kit: KitCompatibilidade, categoriaEsperada?: string | null) => {
  const esperado = normalizarKitTexto(categoriaEsperada);
  if (!esperado) return true;

  const textoKit = normalizarKitTexto(`${kit.nome || ""} ${kit.categoria || ""}`);
  if (textoKit.includes(esperado)) return true;

  const tipoEsperado = esperado.replace(/^kit\s+/, "").trim();
  if (!tipoEsperado) return false;

  // Aceita cadastros que informam apenas "janela"/"porta" sem o prefixo "kit".
  if (textoKit.includes(tipoEsperado)) return true;

  return Boolean(textoKit.includes("kit") && textoKit.includes(tipoEsperado));
};

export const kitFolhasCompativel = (kit: KitCompatibilidade, folhasAceitas: number[]) => {
  if (folhasAceitas.length === 0) return true;

  const textoKit = normalizarKitTexto(`${kit.nome || ""} ${kit.categoria || ""}`);
  return folhasAceitas.some((folhas) => {
    const padrao = new RegExp(`\\b${folhas}\\s*(f|folha|folhas)\\b`, "i");
    return padrao.test(textoKit) || textoKit.includes(`${folhas}f`);
  });
};
