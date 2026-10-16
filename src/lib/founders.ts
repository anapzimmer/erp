import { supabase } from "@/lib/supabaseClient";
import type {
  FoundersAdminPainelResponse,
  FoundersApiActionResponse,
  FoundersApiError,
  FoundersEmpresaBusca,
  FoundersPainelVisao,
  FoundersMinhaAreaResponse,
  FoundersParticipantesVotacaoResponse,
  FoundersPostPayload,
  FoundersResultadoVotacao,
  FoundersVotacaoAdmin,
} from "@/types/founders";

export class FoundersApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "FoundersApiRequestError";
  }
}

export async function consultarFoundersPlataforma<T = unknown>(
  query = ""
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error(
      "Entre na sua conta para acessar o Founders."
    );
  }

  const response = await fetch(
    `/api/plataforma/founders${query}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const resultado = await response.json();

  if (!response.ok) {
    throw new FoundersApiRequestError(
      typeof resultado?.erro === "string"
        ? resultado.erro
        : "Não foi possível consultar o Founders.",
      response.status
    );
  }

  return resultado as T;
}

export async function carregarPainelFounders(
  visao: FoundersPainelVisao,
  params?: { busca?: string; pagina?: number }
): Promise<
  FoundersAdminPainelResponse | FoundersMinhaAreaResponse
> {
  const busca = (params?.busca || "").slice(0, 100);
  const pagina = Math.max(
    0,
    Math.min(params?.pagina || 0, 100000)
  );

  const query = `?visao=${encodeURIComponent(
    visao
  )}&busca=${encodeURIComponent(
    busca
  )}&pagina=${pagina}`;

  return consultarFoundersPlataforma(query);
}

export async function buscarEmpresasFounders(busca: string) {
  return consultarFoundersPlataforma<FoundersEmpresaBusca[]>(
    `?visao=empresas-busca&busca=${encodeURIComponent(busca.trim().slice(0, 100))}`
  );
}

export async function carregarVotacoesAdminFounders() {
  return consultarFoundersPlataforma<FoundersVotacaoAdmin[]>(
    "?visao=votacoes-admin"
  );
}

export async function carregarParticipantesVotacaoFounders(
  votacaoId: string
) {
  return consultarFoundersPlataforma<FoundersParticipantesVotacaoResponse>(
    `?visao=votacoes-participantes&votacao_id=${encodeURIComponent(votacaoId)}`
  );
}

export async function carregarResultadosVotacoesFounders() {
  return consultarFoundersPlataforma<FoundersResultadoVotacao[]>(
    "?visao=votacoes-resultados"
  );
}

export async function executarAcaoFounders(
  payload: FoundersPostPayload
): Promise<FoundersApiActionResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error(
      "Entre na sua conta para acessar o Founders."
    );
  }

  const response = await fetch(
    "/api/plataforma/founders",
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const resultado = (await response.json()) as
    | FoundersApiActionResponse
    | FoundersApiError;

  if (!response.ok) {
    throw new FoundersApiRequestError(
      "erro" in resultado
        ? resultado.erro
        : "Não foi possível executar a ação do Founders.",
      response.status
    );
  }

  return resultado as FoundersApiActionResponse;
}
