import "server-only";
import { asaasRequest, ambienteAsaas } from "./client";

type Banco = { rpc: (nome: string, parametros: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }> };
type Pagamento = { id?: string; customer?: string; subscription?: string; billingType?: string; value?: number; dueDate?: string; status?: string; deleted?: boolean };
const estados = new Set(["PENDING", "CONFIRMED", "RECEIVED", "OVERDUE", "REFUNDED", "DELETED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);

export function validarPagamento(p: Pagamento) {
  const centavos = typeof p.value === "number" ? Math.round(p.value * 100) : NaN;
  const data = typeof p.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) ? new Date(`${p.dueDate}T00:00:00Z`) : null;
  if (!p.id?.startsWith("pay_") || !p.customer || !p.subscription || !["BOLETO", "CREDIT_CARD", "PIX"].includes(p.billingType || "") ||
    !Number.isSafeInteger(centavos) || centavos <= 0 || Math.abs(p.value! * 100 - centavos) > .001 ||
    !data || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== p.dueDate) throw new Error("COBRANCA_INVALIDA");
  const status = p.deleted ? "DELETED" : p.status;
  return { ...p, status, valorCentavos: centavos, suportado: estados.has(status || "") };
}

async function rpc(db: Banco, nome: string, parametros: Record<string, unknown>) {
  const r = await db.rpc(nome, parametros);
  if (r.error) throw new Error("FALHA_PROCESSAMENTO_BANCO");
  return r.data;
}

export async function processarEventoAsaas(db: Banco, evento: Record<string, unknown>) {
  const finalizar = (erro: string | null = null) => rpc(db, "gc_asaas_finalizar_evento", { p_evento_id: evento.id, p_erro: erro });
  const payment = evento.payment as { id?: string } | undefined;
  if (!payment || typeof payment.id !== "string" || !payment.id.startsWith("pay_")) {
    await finalizar("SEM_RECURSO_SUPORTADO"); return "conciliacao_pendente";
  }
  // The callback and webhook amount never grant access: use current provider data.
  const atual = await asaasRequest<Pagamento>(`/payments/${encodeURIComponent(payment.id)}`);
  if (atual.id !== payment.id) throw new Error("COBRANCA_DIVERGENTE");
  const p = validarPagamento(atual);
  if (!p.suportado) { await finalizar("ESTADO_NAO_SUPORTADO"); return "conciliacao_pendente"; }
  const vinculado = await rpc(db, "gc_asaas_vinculo_ativo", { p_assinatura: p.subscription, p_ambiente: ambienteAsaas() });
  if (vinculado !== true) throw new Error("ASSINATURA_SEM_VINCULO");
  await rpc(db, "gc_asaas_processar_pagamento", {
    p_pagamento_id: p.id, p_assinatura_asaas_id: p.subscription, p_cliente_asaas_id: p.customer,
    p_valor_centavos: p.valorCentavos, p_vencimento: p.dueDate, p_status: p.status, p_modalidade: p.billingType,
  });
  await finalizar();
  return "concluido";
}
