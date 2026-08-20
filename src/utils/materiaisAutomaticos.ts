import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const codigoDaDescricao = (descricao?: string) => {
  const primeiraParte = String(descricao || "").split("-")[0]?.trim();
  return primeiraParte || "";
};

const origemAutomatica = (item: ProjetoIndividualMaterial, index: number) => {
  if (item.origemCalculo) return item.origemCalculo;

  const codigo = item.codigoOriginalCalculo || item.codigoPerfil || codigoDaDescricao(item.descricao);
  const unidade = item.unidade || "";
  const comprimento = Number(item.comprimentoBarra || 0);
  const medida = item.medida || "";

  return [
    "auto",
    normalizarTexto(codigo),
    normalizarTexto(unidade),
    comprimento,
    normalizarTexto(medida),
    index,
  ].join(":");
};

const descricaoTemCodigo = (descricao: string, codigo: string) => {
  const descricaoNormalizada = normalizarTexto(descricao).replace(/[^a-z0-9]/g, "");
  const codigoNormalizado = normalizarTexto(codigo).replace(/[^a-z0-9]/g, "");
  return Boolean(codigoNormalizado) && descricaoNormalizada.includes(codigoNormalizado);
};

export const marcarMaterialCatalogoPersonalizado = (material: ProjetoIndividualMaterial) => ({
  ...material,
  personalizadoCatalogo: Boolean(material.origemCalculo),
});

export const mesclarMateriaisAutomaticos = (
  lista: ProjetoIndividualMaterial[],
  automaticos: ProjetoIndividualMaterial[],
  codigosAutomaticos: string[] = []
) => {
  const automaticosComOrigem = automaticos.map((item, index) => ({
    ...item,
    origemCalculo: origemAutomatica(item, index),
    codigoOriginalCalculo: item.codigoOriginalCalculo || item.codigoPerfil || codigoDaDescricao(item.descricao),
  }));
  const origensAutomaticas = new Set(automaticosComOrigem.map((item) => item.origemCalculo).filter(Boolean));
  const possuiKitAutomatico = automaticosComOrigem.some((item) => normalizarTexto(item.descricao).includes("kit"));

  const itensManuais = lista.filter((item) => {
    if (item.origemCalculo && origensAutomaticas.has(item.origemCalculo)) return false;

    const descricao = normalizarTexto(item.descricao);
    if (descricao.includes("kit")) return !possuiKitAutomatico;

    return !codigosAutomaticos.some((codigo) => descricaoTemCodigo(descricao, codigo));
  });

  const itensMesclados = automaticosComOrigem.map((automatico) => {
    const existente = lista.find((item) => item.origemCalculo === automatico.origemCalculo);
    if (!existente) return automatico;

    return {
      ...automatico,
      id: existente.id,
      descricao: existente.personalizadoCatalogo ? existente.descricao : automatico.descricao,
      valorUnitario: existente.personalizadoCatalogo ? existente.valorUnitario : automatico.valorUnitario,
      codigoPerfil: existente.personalizadoCatalogo ? existente.codigoPerfil : automatico.codigoPerfil,
      personalizadoCatalogo: existente.personalizadoCatalogo,
    };
  });

  return [...itensManuais, ...itensMesclados];
};
