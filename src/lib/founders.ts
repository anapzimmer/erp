import { supabase } from "@/lib/supabaseClient";
import type {
  FoundersPainelVisao,
  FoundersPostPayload,
} from "@/types/founders";

export async function consultarFoundersPlataforma(
  query = ""
) {
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
    throw new Error(
      resultado.erro ||
        "Não foi possível consultar o Founders."
    );
  }

  return resultado;
}

export async function carregarPainelFounders(
  visao: FoundersPainelVisao,
  params?: { busca?: string; pagina?: number }
) {
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

export async function executarAcaoFounders(
  payload: FoundersPostPayload
) {
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

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(
      resultado.erro ||
        "Não foi possível executar a ação do Founders."
    );
  }

  return resultado;
}
