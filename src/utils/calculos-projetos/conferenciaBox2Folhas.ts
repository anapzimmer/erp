
import { calcularConjuntoBox2Folhas } from "./box2Folhas";

export type MedidasVao = {
  largura: number;
  altura: number;
  trilho: "Padrão" | "Até o teto";
};

export function conferirVaoBox2Folhas(
  medidasOriginais: MedidasVao,
  medidasConferidas: MedidasVao,
) {
  const original = calcularConjuntoBox2Folhas(medidasOriginais);
  const conferido = calcularConjuntoBox2Folhas(medidasConferidas);

  const pecas = conferido.pecas.map((peca, indice) => {
    const anterior = original.pecas[indice];

    return {
      tipo: peca.tipo,
      original: anterior.fabricacao,
      conferida: peca.fabricacao,
      cobrancaOriginal: anterior.cobranca,
      cobrancaConferida: peca.cobranca,
      alterada:
        anterior.fabricacao.largura !== peca.fabricacao.largura ||
        anterior.fabricacao.altura !== peca.fabricacao.altura,
    };
  });

  return {
    vaoOriginal: original.vao,
    vaoConferido: conferido.vao,
    trilho: conferido.trilho,
    pecas,
    houveAlteracao: pecas.some((peca) => peca.alterada),
  };
}
