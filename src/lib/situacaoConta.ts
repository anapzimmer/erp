export const situacoes = {
  ativa: "Ativa",
  pagamento_pendente: "Pagamento pendente",
  regularizacao: "Prazo de regularização",
  suspensa_inadimplencia: "Suspensa por inadimplência",
  suspensa_outro: "Suspensa por outro motivo",
  cancelada: "Cancelada",
};
export type Situacao = keyof typeof situacoes;
export const categorias = { inadimplencia: "Inadimplência", solicitacao_cliente: "Solicitação do cliente", fim_teste: "Fim do período de teste", seguranca: "Segurança", outro: "Outro motivo" };
export type SituacaoDados = { situacao?: Situacao; categoria?: keyof typeof categorias; mensagem_cliente?: string; contato?: string; prazo?: string | null; inicio_em?: string | null; motivo?: string };
export const mensagens: Record<Situacao,string> = {
  ativa: "Seu acesso ao Glass Code está liberado.",
  pagamento_pendente: "Identificamos uma pendência de pagamento. Seu acesso continua disponível. Se você já pagou, entre em contato com o atendimento para conferência.",
  regularizacao: "Sua conta está em prazo de regularização e o acesso continua disponível. Entre em contato com o atendimento para regularizar a situação ou informar um pagamento já realizado.",
  suspensa_inadimplencia: "Seu acesso está temporariamente suspenso por uma pendência de pagamento. Para regularizar ou informar um pagamento já realizado, entre em contato com o atendimento do Glass Code. Seus dados permanecem preservados.",
  suspensa_outro: "Seu acesso está temporariamente suspenso. Entre em contato com o atendimento do Glass Code para receber orientações. Seus dados permanecem preservados.",
  cancelada: "O acesso desta conta foi encerrado. Para solicitar atendimento ou verificar a possibilidade de reativação, entre em contato com o Glass Code. Nenhum dado foi excluído por esta alteração.",
};
export const dataBrasil = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function prazoRegularizacao(base = dataBrasil()) {
  const data = new Date(`${base}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 3);
  return data.toISOString().slice(0, 10);
}
