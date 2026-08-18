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

export const kitCorCompativel = (kit: KitCompatibilidade, corSelecionada?: string | number | null) => {
  const corAtual = normalizarKitTexto(corSelecionada);
  const corKit = normalizarKitTexto(kit.cores);

  if (!corAtual || corAtual === "escolher") return true;
  if (!corKit || corKit === "padrao") return true;

  return corKit.includes(corAtual) || corAtual.includes(corKit);
};

export const kitCategoriaCompativel = (kit: KitCompatibilidade, categoriaEsperada?: string | null) => {
  const esperado = normalizarKitTexto(categoriaEsperada);
  if (!esperado) return true;

  const textoKit = normalizarKitTexto(`${kit.nome || ""} ${kit.categoria || ""}`);
  if (textoKit.includes(esperado)) return true;

  const tipoEsperado = esperado.replace(/^kit\s+/, "").trim();
  return Boolean(tipoEsperado && textoKit.includes("kit") && textoKit.includes(tipoEsperado));
};

export const kitFolhasCompativel = (kit: KitCompatibilidade, folhasAceitas: number[]) => {
  if (folhasAceitas.length === 0) return true;

  const textoKit = normalizarKitTexto(`${kit.nome || ""} ${kit.categoria || ""}`);
  return folhasAceitas.some((folhas) => {
    const padrao = new RegExp(`\\b${folhas}\\s*(f|folha|folhas)\\b`, "i");
    return padrao.test(textoKit) || textoKit.includes(`${folhas}f`);
  });
};
