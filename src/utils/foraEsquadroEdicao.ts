export type ForaEsquadroSalvo = {
  id: string;
  cliente?: string;
  vidro?: string;
  largura?: number;
  alturaInicial?: number;
  alturaFinal?: number;
  quantidade?: number;
  pecasDivisao?: number;
  foraEsquadroPecas?: { alturaEsquerda: number; alturaDireita: number }[];
};

export function recuperarForaEsquadro(item: ForaEsquadroSalvo) {
  const pecas = item.foraEsquadroPecas || [];
  return {
    cliente: item.cliente || "",
    vidro: item.vidro || "",
    largura: Number(item.largura ?? 0),
    alturaInicial: Number(item.alturaInicial ?? pecas[0]?.alturaEsquerda ?? 0),
    alturaFinal: Number(item.alturaFinal ?? pecas[pecas.length - 1]?.alturaDireita ?? 0),
    quantidade: Number(item.quantidade ?? 1),
    divisoes: Number(item.pecasDivisao ?? (pecas.length || 1)),
  };
}

export function salvarForaEsquadroCentral<T extends { id: string }>(lista: T[], item: T, idEdicao: string | null): T[] {
  if (!idEdicao) return [...lista, item];
  if (!lista.some(registro => registro.id === idEdicao)) {
    throw new Error("O item não foi encontrado na central. Volte ao orçamento e abra a edição novamente.");
  }
  return lista.map(registro => registro.id === idEdicao ? { ...registro, ...item, id: idEdicao } : registro);
}
