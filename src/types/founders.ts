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

export type FoundersVotacaoAdminAction =
  | "admin_criar_votacao"
  | "admin_atualizar_votacao"
  | "admin_abrir_votacao"
  | "admin_encerrar_votacao";

export type FoundersAction =
  | FoundersAdminAction
  | FoundersMemberAction
  | FoundersVotacaoAdminAction;

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

export type FoundersApiActionResponse =
  | FoundersApiSuccess<{ id: string }>
  | FoundersApiMessage;

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

export interface FoundersAdminCriarVotacaoPayload {
  acao: "admin_criar_votacao";
  contribuicao_id: string;
  titulo: string;
  descricao: string;
  abre_em?: string | null;
  encerra_em: string;
}

export interface FoundersAdminAtualizarVotacaoPayload {
  acao: "admin_atualizar_votacao";
  votacao_id: string;
  titulo: string;
  descricao: string;
  abre_em?: string | null;
  encerra_em: string;
}

export interface FoundersAdminAbrirVotacaoPayload {
  acao: "admin_abrir_votacao";
  votacao_id: string;
}

export interface FoundersAdminEncerrarVotacaoPayload {
  acao: "admin_encerrar_votacao";
  votacao_id: string;
  cancelar: boolean;
  motivo?: string;
}

export type FoundersPostPayload =
  | FoundersAdminCriarVotacaoPayload
  | FoundersAdminAtualizarVotacaoPayload
  | FoundersAdminAbrirVotacaoPayload
  | FoundersAdminEncerrarVotacaoPayload
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

export interface FoundersParceiro {
  id: string;
  empresa_id: string;
  numero_fundador: number;
  data_adesao: string;
  valor_mensal_acordado: number;
  quantidade_usuarios_inclusos: number;
  status: FoundersSituacaoParceiro;
  ciclo_avaliacao_inicio: string;
  ciclo_avaliacao_fim: string;
  participacao_inicio: string;
  participacao_fim: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface FoundersContribuicaoMinhaArea {
  id: string;
  titulo: string;
  categoria: string;
  status: FoundersStatusContribuicao;
  criado_em: string;
  pontos_concedidos: number;
}

export interface FoundersVotacaoAberta {
  id: string;
  titulo: string;
  descricao: string;
  abre_em: string | null;
  encerra_em: string | null;
  voto_registrado: boolean;
}

export interface FoundersBeneficioDisponivel {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  pontos_necessarios: number;
  limite_por_empresa: number | null;
  estoque_total: number | null;
}

export interface FoundersMinhaAreaResponse {
  empresa_id: string;
  parceiro: FoundersParceiro | null;
  saldo_pontos: number;
  contribuicoes: FoundersContribuicaoMinhaArea[];
  votacoes_abertas: FoundersVotacaoAberta[];
  beneficios: FoundersBeneficioDisponivel[];
}

export interface FoundersResumoAdmin {
  parceiros_ativos: number;
  contribuicoes_abertas: number;
  votacoes_abertas: number;
  resgates_pendentes: number;
}

export interface FoundersParceiroAdmin extends FoundersParceiro {
  empresa_nome: string;
}

export interface FoundersContribuicaoAdmin {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  titulo: string;
  categoria: string;
  status: FoundersStatusContribuicao;
  criado_em: string;
  pontos_concedidos: number;
}

export type FoundersResultadoConsultivo =
  | "sem_votos"
  | "favoravel"
  | "contraria"
  | "empate";

// Resultado agregado devolvido por gc_founders_resultados_votacoes (parceiros).
export interface FoundersResultadoVotacao {
  votacao_id: string;
  titulo: string;
  status_efetivo: FoundersStatusVotacao;
  abre_em: string | null;
  encerra_em: string | null;
  total_votos: number;
  favor: number;
  contra: number;
  abster: number;
  empresas_elegiveis: number;
  participacao_percentual: number;
  resultado_consultivo: FoundersResultadoConsultivo;
}

// Resultado devolvido por gc_founders_admin_resultado_votacao.
export interface FoundersVotacaoAdmin extends FoundersResultadoVotacao {
  contribuicao_id: string;
  status: FoundersStatusVotacao;
  contribuicao_titulo: string;
  contribuicao_status: FoundersStatusContribuicao;
  empresa_nome: string;
  criado_em: string;
  // Lida diretamente de founders_votacoes (somente leitura) para pré-preencher a edição.
  descricao?: string;
}

export interface FoundersParticipanteVotacao {
  empresa_id: string;
  empresa_nome: string;
  numero_fundador: number;
  participou: boolean;
  votou_em: string | null;
}

export interface FoundersParticipantesVotacaoResponse {
  votacao_id: string;
  participantes: FoundersParticipanteVotacao[];
}

export interface FoundersEmpresaBusca {
  id: string;
  nome: string;
  cnpj: string | null;
  participante: boolean;
}

export interface FoundersAdminPainelResponse {
  resumo: FoundersResumoAdmin;
  parceiros: FoundersParceiroAdmin[];
  contribuicoes: FoundersContribuicaoAdmin[];
}
