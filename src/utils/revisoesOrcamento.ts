import type { CentralImpressaoItem } from "@/app/relatorios/centralimpressao/CentralImpressaoPDF";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
export type RevisaoOrcamento = { revisao: number; registradaEm: string; numero: string; cliente: string; obra: string; valorTotal: number; itens: Record<string, unknown> };
export function registrarRevisaoOrcamento(anterior: { numero_formatado?: string; cliente_nome?: string; obra_referencia?: string; valor_total?: number; itens?: Record<string, unknown> }, agora = new Date().toISOString()) {
  const { revisoesPrecos, revisaoAtual, ...snapshot } = anterior.itens || {};
  const historico = Array.isArray(revisoesPrecos) ? revisoesPrecos as RevisaoOrcamento[] : [];
  const numero = typeof revisaoAtual === "number" ? revisaoAtual : 1;
  return { revisaoAtual: numero + 1, revisoesPrecos: [...historico, {
    revisao: numero, registradaEm: agora, numero: anterior.numero_formatado || "", cliente: anterior.cliente_nome || "", obra: anterior.obra_referencia || "", valorTotal: Number(anterior.valor_total || 0), itens: JSON.parse(JSON.stringify(snapshot)),
  }] };
}

export function projetosPdfDaRevisao(r: RevisaoOrcamento): CentralImpressaoItem[] {
  if (Array.isArray(r.itens.documentoPdfCompleto)) return r.itens.documentoPdfCompleto as CentralImpressaoItem[];
  const projetos = Array.isArray(r.itens.projetosPdf) ? r.itens.projetosPdf as CentralImpressaoItem[] : [];
  const materiais = Array.isArray(r.itens.materiaisAvulsos) ? r.itens.materiaisAvulsos as ProjetoIndividualMaterial[] : [];
  if (!materiais.length || projetos.some(p => p.id === "materiais-avulsos")) return projetos;
  return [...projetos, { id: "materiais-avulsos", numero: r.numero, projeto: "Materiais avulsos", cliente: r.cliente, medidas: "", quantidade: 0, modo: "", desenhoUrl: "", materiais,
    valorTotal: materiais.reduce((s, m) => s + m.qtd * m.valorUnitario, 0) }];
}
