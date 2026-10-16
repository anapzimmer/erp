"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { FoundersApiRequestError, carregarPainelFounders } from "@/lib/founders";
import { supabase } from "@/lib/supabaseClient";
import type {
  FoundersAdminPainelResponse,
  FoundersMinhaAreaResponse,
  FoundersParceiro,
  FoundersParceiroAdmin,
  FoundersContribuicaoAdmin,
  FoundersContribuicaoMinhaArea,
  FoundersVotacaoAberta,
  FoundersBeneficioDisponivel,
} from "@/types/founders";
import FoundersAdminView from "./FoundersAdminView";
import FoundersPartnerView from "./FoundersPartnerView";
import { FoundersPageState } from "./FoundersShared";
import type { FoundersAbaAdmin, FoundersAbaParceiro } from "./FoundersShared";

type FoundersState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "denied"; message: string }
  | { kind: "admin"; data: FoundersAdminPainelResponse }
  | { kind: "partner"; data: FoundersMinhaAreaResponse };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParceiro(value: unknown): value is FoundersParceiro {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.empresa_id === "string" &&
    typeof value.numero_fundador === "number" &&
    typeof value.status === "string" &&
    typeof value.data_adesao === "string" &&
    typeof value.valor_mensal_acordado === "number" &&
    typeof value.quantidade_usuarios_inclusos === "number" &&
    typeof value.ciclo_avaliacao_inicio === "string" &&
    typeof value.ciclo_avaliacao_fim === "string" &&
    typeof value.participacao_inicio === "string" &&
    (typeof value.participacao_fim === "string" || value.participacao_fim === null) &&
    typeof value.criado_em === "string" &&
    typeof value.atualizado_em === "string"
  );
}

function isContribuicaoMinhaArea(
  value: unknown
): value is FoundersContribuicaoMinhaArea {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.titulo === "string" &&
    typeof value.categoria === "string" &&
    typeof value.status === "string" &&
    typeof value.criado_em === "string" &&
    typeof value.pontos_concedidos === "number"
  );
}

function isVotacao(value: unknown): value is FoundersVotacaoAberta {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.titulo === "string" &&
    typeof value.descricao === "string" &&
    (typeof value.abre_em === "string" || value.abre_em === null) &&
    (typeof value.encerra_em === "string" || value.encerra_em === null) &&
    typeof value.voto_registrado === "boolean"
  );
}

function isBeneficio(value: unknown): value is FoundersBeneficioDisponivel {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.codigo === "string" &&
    typeof value.nome === "string" &&
    typeof value.descricao === "string" &&
    typeof value.pontos_necessarios === "number" &&
    (typeof value.limite_por_empresa === "number" || value.limite_por_empresa === null) &&
    (typeof value.estoque_total === "number" || value.estoque_total === null)
  );
}

function isMinhaArea(value: unknown): value is FoundersMinhaAreaResponse {
  return (
    isRecord(value) &&
    typeof value.empresa_id === "string" &&
    (value.parceiro === null || isParceiro(value.parceiro)) &&
    typeof value.saldo_pontos === "number" &&
    Array.isArray(value.contribuicoes) &&
    value.contribuicoes.every(isContribuicaoMinhaArea) &&
    Array.isArray(value.votacoes_abertas) &&
    value.votacoes_abertas.every(isVotacao) &&
    Array.isArray(value.beneficios) &&
    value.beneficios.every(isBeneficio)
  );
}

function isParceiroAdmin(value: unknown): value is FoundersParceiroAdmin {
  return (
    isRecord(value) &&
    typeof value.empresa_nome === "string" &&
    isParceiro(value)
  );
}

function isContribuicaoAdmin(value: unknown): value is FoundersContribuicaoAdmin {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.empresa_id === "string" &&
    typeof value.empresa_nome === "string" &&
    typeof value.titulo === "string" &&
    typeof value.categoria === "string" &&
    typeof value.status === "string" &&
    typeof value.criado_em === "string" &&
    typeof value.pontos_concedidos === "number"
  );
}

function isAdminPainel(value: unknown): value is FoundersAdminPainelResponse {
  if (!isRecord(value) || !isRecord(value.resumo)) return false;
  const { resumo } = value;
  return (
    typeof resumo.parceiros_ativos === "number" &&
    typeof resumo.contribuicoes_abertas === "number" &&
    typeof resumo.votacoes_abertas === "number" &&
    typeof resumo.resgates_pendentes === "number" &&
    Array.isArray(value.parceiros) &&
    value.parceiros.every(isParceiroAdmin) &&
    Array.isArray(value.contribuicoes) &&
    value.contribuicoes.every(isContribuicaoAdmin)
  );
}

export default function FoundersDashboard() {
  const { user, nomeEmpresa, loading: authLoading, signOut } = useAuth();
  const userId = user?.id ?? null;
  const loadedUserId = useRef<string | null>(null);
  const [state, setState] = useState<FoundersState>({ kind: "loading" });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSearchInput, setAdminSearchInput] = useState("");
  const [adminPage, setAdminPage] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [abaAdmin, setAbaAdmin] = useState<FoundersAbaAdmin>("visao");
  const [abaParceiro, setAbaParceiro] = useState<FoundersAbaParceiro>("programa");

  const retry = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (authLoading || !userId) return;

    let active = true;
    if (loadedUserId.current !== userId) {
      setState({ kind: "loading" });
      loadedUserId.current = userId;
    }
    async function load() {
      try {
        const { data: isAdmin, error } = await supabase.rpc("gc_founders_admin");
        if (error || typeof isAdmin !== "boolean") {
          throw new Error("Não foi possível verificar as permissões Founders deste usuário.");
        }

        if (isAdmin) {
          const result = await carregarPainelFounders("admin", {
            busca: adminSearch,
            pagina: adminPage,
          });
          if (!isAdminPainel(result)) {
            throw new Error("O painel administrativo retornou dados em formato inesperado.");
          }
          if (active) setState({ kind: "admin", data: result });
          return;
        }

        const result = await carregarPainelFounders("minha-area");
        if (!isMinhaArea(result)) {
          throw new Error("A área do parceiro retornou dados em formato inesperado.");
        }
        if (active) setState({ kind: "partner", data: result });
      } catch (error) {
        if (!active) return;
        if (error instanceof FoundersApiRequestError && error.status === 403) {
          setState({
            kind: "denied",
            message: error.message,
          });
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o Programa Founders.",
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [adminPage, adminSearch, authLoading, refreshVersion, userId]);

  const handleSearch = useCallback(() => {
    setAdminPage(0);
    setAdminSearch(adminSearchInput.trim().slice(0, 100));
  }, [adminSearchInput]);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      {!authLoading && user && (
        <Header
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user.email || ""}
          handleSignOut={signOut}
        />
      )}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Glass Code · Programa de parceiros
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
              Founders
            </h1>
          </div>
          {(state.kind === "admin" || state.kind === "partner") && (
            <button className="gc-action gc-secondary" onClick={retry} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              Atualizar
            </button>
          )}
        </header>

        {!authLoading && !user && (
          <FoundersPageState
            kind="denied"
            title="Entre na sua conta"
            message="Entre na sua conta Glass Code para acessar o Programa de Parceiros Fundadores."
          />
        )}
        {state.kind === "loading" && (authLoading || user) && (
          <FoundersPageState
            kind="loading"
            title="Carregando sua área"
            message="Estamos consultando sua sessão e as permissões do Programa Founders."
          />
        )}
        {state.kind === "error" && (
          <FoundersPageState
            kind="error"
            title="Não foi possível carregar o Founders"
            message={state.message}
            onRetry={retry}
          />
        )}
        {state.kind === "denied" && user && (
          <FoundersPageState
            kind="denied"
            title="Acesso não disponível"
            message={state.message}
          />
        )}
        {user && state.kind === "partner" && (
          <FoundersPartnerView
            aba={abaParceiro}
            data={state.data}
            onAbaChange={setAbaParceiro}
            onRefresh={retry}
          />
        )}
        {user && state.kind === "admin" && (
          <FoundersAdminView
            aba={abaAdmin}
            busca={adminSearchInput}
            buscaAplicada={adminSearch}
            data={state.data}
            onAbaChange={setAbaAdmin}
            onBuscaChange={setAdminSearchInput}
            onBuscar={(event) => {
              event.preventDefault();
              handleSearch();
            }}
            onRefresh={retry}
            onPaginaChange={setAdminPage}
            pagina={adminPage}
          />
        )}
        {!authLoading && !user && (
          <div className="text-center">
            <Link className="gc-action gc-secondary" href="/login">
              <ShieldCheck aria-hidden="true" size={16} />
              Ir para o acesso
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
