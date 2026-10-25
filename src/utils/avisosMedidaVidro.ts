import { fatorMedidaVidro, type AcrescimoMedida, type RegraMedidaVidro } from "./regraMedidaVidro";
export type PropsAvisoMedida = {
  materiais?: { acrescimoMedida?: AcrescimoMedida; qtd: number; valorUnitario: number }[];
  regras?: (AcrescimoMedida | undefined)[];
  medidas?: { largura: number; altura: number }[];
  regra?: RegraMedidaVidro;
};

export function avisosAcrescimoVidro({ materiais = [], regras = [], medidas = [], regra }: PropsAvisoMedida) {
  const aplicadas = [
    ...materiais.filter(m => m.qtd > 0 && m.valorUnitario > 0).map(m => m.acrescimoMedida),
    ...regras,
    ...(regra ? medidas.map(m => ({ regra, largura_mm: m.largura, altura_mm: m.altura, fator: fatorMedidaVidro(m.largura, m.altura, regra) })) : []),
  ].filter((r): r is AcrescimoMedida => Boolean(r && r.fator > 1 && r.largura_mm > 0 && r.altura_mm > 0));
  const grupos = [...new Map(aplicadas.map(r => [`${r.regra.limite_mm}:${r.regra.percentual}`, r.regra])).values()];
  return grupos.map(r => `Acréscimo de ${r.percentual.toLocaleString("pt-BR")}% no vidro das peças acima de ${r.limite_mm.toLocaleString("pt-BR")} mm, já incluído no preço.`);
}
