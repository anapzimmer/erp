export type MaterialOrdenavel = {
  codigo?: string | null;
  codigoPerfil?: string | null;
  descricao?: string | null;
  unidade?: string | null;
};

export const normalizarTextoMaterial = (valor?: string | number | null): string =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const textoMaterial = (material: MaterialOrdenavel) =>
  normalizarTextoMaterial(
    `${material.codigo || material.codigoPerfil || ""} ${material.descricao || ""} ${material.unidade || ""}`
  );

const codigoCompactoMaterial = (material: MaterialOrdenavel) =>
  normalizarTextoMaterial(material.codigo || material.codigoPerfil || "")
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase();

const descricaoCompactaMaterial = (material: MaterialOrdenavel) =>
  normalizarTextoMaterial(material.descricao)
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase();

const codigoOuDescricaoContem = (material: MaterialOrdenavel, codigos: string[]) => {
  const codigo = codigoCompactoMaterial(material);
  const descricao = descricaoCompactaMaterial(material);
  return codigos.some((codigoEsperado) => {
    const esperado = codigoEsperado.replace(/[^a-z0-9]/gi, "").toUpperCase();
    return codigo === esperado || codigo.startsWith(esperado) || descricao.includes(esperado);
  });
};

export const ehKitBatenteMaterial = (material: MaterialOrdenavel): boolean => {
  const texto = textoMaterial(material);
  return (
    texto.includes("kit batente") ||
    texto.includes("batente") ||
    codigoOuDescricaoContem(material, ["KTJ1", "KTJ3"])
  );
};

export const ordemGrupoMaterial = (material: MaterialOrdenavel): number => {
  const texto = textoMaterial(material);
  const unidade = normalizarTextoMaterial(material.unidade).replace(/\s+/g, "");

  if (
    unidade.includes("m2") ||
    unidade.includes("m²") ||
    texto.includes("vidro") ||
    texto.includes("espelho")
  ) return 0;

  if (!ehKitBatenteMaterial(material) && texto.includes("kit")) return 1;

  if (
    unidade.includes("barra") ||
    texto.includes("perfil") ||
    texto.includes("trilho") ||
    texto.includes("transpasse") ||
    texto.includes("tubo") ||
    texto.includes("cantoneira") ||
    texto.includes("corrimao") ||
    texto.includes("guia") ||
    codigoOuDescricaoContem(material, [
      "BCSTY002",
      "BCSTY003",
      "STY106",
      "VT68",
      "VT39",
      "VT268",
      "VT239",
      "VT380",
      "VT390",
      "VT51A",
      "VT52A",
      "VT05",
      "VT13",
      "VT10",
      "VT15",
      "VT17",
      "VT49A",
      "VT50A",
      "VT45",
      "VT65",
      "VT66",
      "VT16",
      "VT47",
      "CT004",
    ])
  ) return 2;

  return 3;
};

export const ordemPerfilMaterial = (material: MaterialOrdenavel): number => {
  const texto = textoMaterial(material);

  const perfisDeslizante = ["BCSTY002", "BCSTY003", "BCSTY0027", "BCSTY0037", "STY106"];
  if (texto.includes("deslizante") || codigoOuDescricaoContem(material, perfisDeslizante)) return 0;

  const perfisMaoAmiga = ["VT68", "VT39", "VT268", "VT239", "VT380", "VT390"];
  const indiceMaoAmiga = perfisMaoAmiga.findIndex((codigo) => codigoOuDescricaoContem(material, [codigo]));
  if (texto.includes("mao amiga") || texto.includes("mão amiga") || indiceMaoAmiga >= 0) {
    return 100 + Math.max(0, indiceMaoAmiga);
  }

  const perfis10mm = ["VT51A", "VT52A", "VT05", "VT13", "VT10", "VT15", "VT17"];
  const indice10mm = perfis10mm.findIndex((codigo) => codigoOuDescricaoContem(material, [codigo]));
  if (indice10mm >= 0) return 200 + indice10mm;

  const perfis08mm = ["VT49A", "VT50A", "VT45", "VT65", "VT66", "VT16", "VT47"];
  const indice08mm = perfis08mm.findIndex((codigo) => codigoOuDescricaoContem(material, [codigo]));
  if (indice08mm >= 0) return 300 + indice08mm;

  if (texto.includes("tubo")) return 400;
  if (texto.includes("cantoneira") || codigoOuDescricaoContem(material, ["CT004"])) return 500;

  return 900;
};

export const ordemFerragemMaterial = (material: MaterialOrdenavel): number => {
  const texto = textoMaterial(material);

  if (texto.includes("roldana") || texto.includes("rodizio") || codigoOuDescricaoContem(material, ["1122", "1125", "1126", "3001"])) return 0;
  if (ehKitBatenteMaterial(material)) return 100;
  if (
    texto.includes("fechadura") ||
    texto.includes("cilindro") ||
    texto.includes("placa") ||
    texto.includes("contra") ||
    texto.includes("macaneta") ||
    codigoOuDescricaoContem(material, ["1520", "3530", "3534", "3230", "MFLY"])
  ) return 200;
  if (
    texto.includes("fecho") ||
    texto.includes("trinco") ||
    texto.includes("capuchinho") ||
    texto.includes("castanha") ||
    codigoOuDescricaoContem(material, ["1560", "1561", "1335", "1519", "1038", "1629"])
  ) return 300;

  return 900;
};

export const ordemMaterialRelacao = (material: MaterialOrdenavel): number => {
  const grupo = ordemGrupoMaterial(material);
  if (grupo === 2) return 2_000 + ordemPerfilMaterial(material);
  if (grupo === 3) return 3_000 + ordemFerragemMaterial(material);
  return grupo * 1_000;
};

export const compararMateriaisRelacao = <T extends MaterialOrdenavel>(a: T, b: T): number => {
  const ordemA = ordemMaterialRelacao(a);
  const ordemB = ordemMaterialRelacao(b);
  if (ordemA !== ordemB) return ordemA - ordemB;

  const descricaoA = String(a.descricao || "");
  const descricaoB = String(b.descricao || "");
  const comparacaoDescricao = descricaoA.localeCompare(descricaoB, "pt-BR", { numeric: true });
  if (comparacaoDescricao !== 0) return comparacaoDescricao;

  return String(a.codigo || a.codigoPerfil || "").localeCompare(
    String(b.codigo || b.codigoPerfil || ""),
    "pt-BR",
    { numeric: true }
  );
};
