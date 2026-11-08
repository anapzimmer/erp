export type PedidoItem = {
  descricao: string;
  quantidade: number;
  preco: number;
  tipo?: "material" | "vidro" | "servico";
  largura?: number;
  altura?: number;
  vidro?: string;
  unidade?: string;
  comprimentoCorte?: number;
  quantidadeCortes?: number;
  catalogo?: {
    tipo: string;
    id: string;
    precoBase: number;
    precoM2?: number;
    memoria: string;
    grupo: string | null;
    regra: { limite_mm: number; percentual: number };
  };
};

export const situacoesPedido = {
  conferencia: "Em conferência",
  liberado: "Liberado para produção",
  producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
} as const;

export type SituacaoPedido = keyof typeof situacoesPedido;

export function proximaSituacao(s: SituacaoPedido): SituacaoPedido | null {
  return ({
    conferencia: "liberado",
    liberado: "producao",
    producao: "pronto",
    pronto: "entregue",
    entregue: null,
    cancelado: null,
  } as const)[s];
}

export function totalPedido(itens: PedidoItem[]) {
  return itens.reduce(
    (total, item) => total + Math.round((item.quantidade * item.preco + Number.EPSILON) * 100),
    0,
  ) / 100;
}

export function validarItensPedido(itens: PedidoItem[]) {
  return itens.length >= 1 && itens.length <= 200 && itens.every(i =>
    (i.tipo !== "vidro" || (
      Number.isFinite(i.largura) && Number(i.largura) > 0 &&
      Number.isFinite(i.altura) && Number(i.altura) > 0 &&
      Boolean(i.vidro?.trim())
    )) &&
    i.descricao.trim().length >= 1 && i.descricao.length <= 500 &&
    Number.isFinite(i.quantidade) && i.quantidade > 0 && i.quantidade <= 1000000 &&
    Number.isFinite(i.preco) && i.preco >= 0 && i.preco <= 100000000
  );
}
