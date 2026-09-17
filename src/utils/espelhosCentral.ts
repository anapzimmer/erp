import { quantidadePecasEspelho, trocarVidroEspelho, type ItemEspelhoSalvo } from "./calculoEspelhos";

type ComposicaoEspelho = {
  projeto: string;
  vidro?: string;
  precoVidroM2?: number;
  valorTotal?: number;
  espelhoItens?: ItemEspelhoSalvo[];
  vidrosAvulsos?: Array<{ id: string; vidro: string; quantidade: number; medida: string; valorTotal: number; precoVidroM2?: number; areaCobradaM2?: number }>;
  materiais?: Array<{ id: string; descricao: string; unidade: string; qtd: number; valorUnitario: number }>;
};

export function trocarVidroComposicaoEspelhos<T extends ComposicaoEspelho>(
  composicao: T,
  vidro: { id: string; descricao: string; preco: number },
  deveTrocar: (descricao?: string) => boolean,
): T {
  const espelhos = composicao.espelhoItens;
  if (!espelhos?.length) {
    throw new Error("Este orçamento de espelhos é antigo. Edite-o em Cálculo de Espelhos para conferir os acabamentos antes de trocar o vidro.");
  }
  const atualizados = espelhos.map(item => deveTrocar(item.descricao) ? trocarVidroEspelho(item, vidro) : item);
  if (atualizados.every((item, index) => item === espelhos[index])) return composicao;
  const materiais = atualizados.map((item, index) => {
    const m2 = Number(item.m2 || 0);
    if (m2 <= 0) throw new Error("Confira as medidas dos espelhos antes de trocar o vidro.");
    const jogo = item.tipoVisual?.toLowerCase().includes("jogo");
    const divL = jogo ? Math.max(1, Number(item.divisoesLargura || 1)) : 1;
    const divA = jogo ? Math.max(1, Number(item.divisoesAltura || 1)) : 1;
    const medida = `${Math.round(Number(item.larguraReal) / divL)}x${Math.round(Number(item.alturaReal) / divA)}`;
    return {
      id: composicao.materiais?.[index]?.id || `espelho-${index}`,
      descricao: `ESPELHO ${medida} ${item.descricao || ""}`.toUpperCase(),
      unidade: "m2", qtd: m2, valorUnitario: Number(item.total || 0) / m2,
    };
  });
  return {
    ...composicao,
    espelhoItens: atualizados,
    vidro: /avulsos/i.test(composicao.projeto) ? composicao.vidro : atualizados[0].descricao,
    precoVidroM2: /avulsos/i.test(composicao.projeto) ? composicao.precoVidroM2 : atualizados[0].precoVidroM2,
    valorTotal: Math.round(atualizados.reduce((s, item) => s + Number(item.total || 0), 0) * 100) / 100,
    materiais,
    vidrosAvulsos: composicao.vidrosAvulsos?.map((peca, index) => {
      const item = atualizados[index];
      if (!item) throw new Error("A relação de espelhos está incompleta. Revise o cálculo antes de trocar o vidro.");
      return { ...peca, vidro: item.descricao || peca.vidro, quantidade: quantidadePecasEspelho(item),
        precoVidroM2: item.precoVidroM2, areaCobradaM2: item.m2, valorTotal: Number(item.total || 0) };
    }),
  };
}
