import type { NecessidadeCompra } from "./necessidadesCompra";
/** Converte somente o campo de entrada; saldos antigos continuam na unidade original. */
export function quantidadePorPeca(m: NecessidadeCompra): number | null {
  if (!m.vidro) return 1;
  if (!/^m[²2]$/i.test(m.unidade)) return 1;
  return m.pecas && m.pecas > 0 ? m.quantidade / m.pecas : null;
}
export function quantidadeEmPecas(m: NecessidadeCompra, quantidade: number): number | null {
  const fator = quantidadePorPeca(m);
  return fator ? Math.round(quantidade / fator * 1000000) / 1000000 : null;
}
/** Apresentação apenas: identidade original permanece intacta para compras já registradas. */
export function apresentacaoMaterial(m: NecessidadeCompra) {
  if (!m.vidro) return { descricao:m.descricao, medida:m.medida };
  const padrao = /\b\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*mm\b)?/i;
  const encontrado = m.descricao.match(padrao)?.[0];
  return { descricao: encontrado ? m.descricao.replace(padrao, "").replace(/\s{2,}/g," ").trim() : m.descricao,
    medida:m.medida || (encontrado ? encontrado.replace(/\s*mm$/i, "").replace(/\s*[x×]\s*/i," × ")+" mm" : "") };
}
export function compararCompra(m: NecessidadeCompra, quantidade: number, precoDigitado: string) {
  const arred = (n:number)=>Math.round((n+Number.EPSILON)*100)/100;
  const fator=m.vidro?m.areaPorUnidade:1;
  const compra=precoDigitado.trim()!=="" && Number.isFinite(Number(precoDigitado)) && Number(precoDigitado)>=0 && fator!==undefined && fator>0 ? arred(quantidade*arred(Number(precoDigitado)*fator)) : null;
  const orcado=m.precoOrcadoUnitario!==undefined?arred(quantidade*m.precoOrcadoUnitario):null;
  return {compra,orcado,diferenca:compra!==null&&orcado!==null?arred(orcado-compra):null};
}
export type Compra = { id: string; numero: number; fornecedor: string; referencia: string; previsao: string | null; observacoes: string; cancelada: boolean; criado_em: string };
export type CompraItem = { id: string; compra_id: string; pedido_id: string; chave: string; material: NecessidadeCompra & { pedidoNumero?: number; pedidoCliente?: string; pedidoObra?: string }; quantidade: number; preco: number };
export type CompraEvento = { id: string; compra_id: string; item_id: string | null; tipo: string; quantidade: number; motivo: string; estorno_de: string | null; criado_em: string; autor: string };
export function mesmoMaterial(a: NecessidadeCompra, b: NecessidadeCompra) {
  return a.descricao === b.descricao && a.unidade === b.unidade && (a.medida || "") === (b.medida || "") && (a.cor || "") === (b.cor || "");
}
export function recebidoItem(id: string, eventos: CompraEvento[]) {
  return Math.round(eventos.filter(e => e.item_id === id).reduce((s, e) => s + Number(e.quantidade), 0) * 1000) / 1000;
}
export function saldoCompra(pedido: string, necessidade: NecessidadeCompra, itens: CompraItem[], compras: Compra[], eventos: CompraEvento[]) {
  const ativos = new Set(compras.filter(c => !c.cancelada).map(c => c.id));
  const ligados = itens.filter(i => i.pedido_id === pedido && i.chave === necessidade.chave && mesmoMaterial(i.material, necessidade) && ativos.has(i.compra_id));
  const comprado = ligados.reduce((s, i) => s + Number(i.quantidade), 0);
  const recebido = ligados.reduce((s, i) => s + recebidoItem(i.id, eventos), 0);
  const arred = (n: number) => Math.round(n * 1000) / 1000;
  return { comprado: arred(comprado), recebido: arred(recebido), aguardando: arred(Math.max(0, comprado - recebido)), faltante: arred(Math.max(0, necessidade.quantidade - comprado)), excedente: arred(Math.max(0, comprado - necessidade.quantidade)) };
}
