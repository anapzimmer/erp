export type FoundersSituacaoParceiro =
  | "ativo"
  | "inativo"
  | "pausado"
  | "encerrado";

export type FoundersStatusContribuicao =
  | "rascunho"
  | "enviada"
  | "em_triagem"
  | "em_votacao"
  | "aprovada"
  | "rejeitada"
  | "implementada";

export type FoundersStatusVotacao =
  | "rascunho"
  | "aberta"
  | "encerrada"
  | "cancelada";

export type FoundersVoto = "favor" | "contra" | "abster";

export type FoundersTipoPontos =
  | "credito"
  | "debito"
  | "estorno_credito"
  | "estorno_debito";

export type FoundersStatusResgate =
  | "solicitado"
  | "aprovado"
  | "entregue"
  | "cancelado"
  | "negado";

export type FoundersPainelVisao = "admin" | "minha-area";

export type FoundersAdminAction =
  | "admin_definir_parceiro"
  | "admin_ajustar_pontos"
  | "admin_atualizar_contribuicao";

export type FoundersMemberAction =
  | "enviar_contribuicao"
  | "anexar_contribuicao"
  | "votar"
  | "resgatar_beneficio";

export type FoundersAction = FoundersAdminAction | FoundersMemberAction;

export interface FoundersApiError {
  erro: string;
}

export interface FoundersApiSuccess<T> {
  sucesso: true;
  data: T;
}

export interface FoundersApiMessage {
  sucesso: true;
  mensagem: string;
}

export interface FoundersEnviarContribuicaoPayload {
  acao: "enviar_contribuicao";
  titulo: string;
  descricao: string;
  categoria: string;
  idempotency_key?: string;
}

export interface FoundersAnexarContribuicaoPayload {
  acao: "anexar_contribuicao";
  contribuicao_id: string;
  storage_bucket: string;
  storage_path: string;
  nome_arquivo: string;
  mime_type: "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
  tamanho_bytes: number;
  hash_arquivo?: string;
}

export interface FoundersVotarPayload {
  acao: "votar";
  votacao_id: string;
  voto: FoundersVoto;
  observacao?: string;
}

export interface FoundersResgatarBeneficioPayload {
  acao: "resgatar_beneficio";
  beneficio_id: string;
  quantidade: number;
  idempotency_key: string;
  observacao?: string;
}

export interface FoundersAdminDefinirParceiroPayload {
  acao: "admin_definir_parceiro";
  empresa_id: string;
  status: FoundersSituacaoParceiro;
  valor_mensal_acordado: number;
  quantidade_usuarios_inclusos: number;
  ciclo_avaliacao_inicio: string;
  ciclo_avaliacao_fim: string;
}

export interface FoundersAdminAjustarPontosPayload {
  acao: "admin_ajustar_pontos";
  empresa_id: string;
  tipo: FoundersTipoPontos;
  pontos: number;
  motivo: string;
  idempotency_key: string;
  referencia_id?: string;
}

export interface FoundersAdminAtualizarContribuicaoPayload {
  acao: "admin_atualizar_contribuicao";
  contribuicao_id: string;
  status: Exclude<
    FoundersStatusContribuicao,
    "rascunho" | "enviada"
  >;
  pontos_concedidos?: number;
  nota_administrativa?: string;
}

export type FoundersPostPayload =
  | FoundersEnviarContribuicaoPayload
  | FoundersAnexarContribuicaoPayload
  | FoundersVotarPayload
  | FoundersResgatarBeneficioPayload
  | FoundersAdminDefinirParceiroPayload
  | FoundersAdminAjustarPontosPayload
  | FoundersAdminAtualizarContribuicaoPayload;

export interface FoundersParceiroResumo {
  id: string;
  empresa_id: string;
  empresa_nome?: string;
  numero_fundador: number;
  status: FoundersSituacaoParceiro;
  ciclo_avaliacao_inicio: string;
  ciclo_avaliacao_fim: string;
}
