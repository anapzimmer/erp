"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  FileText,
  Gift,
  Pencil,
  Search,
  Wallet,
} from "lucide-react";
import { executarAcaoFounders } from "@/lib/founders";
import type {
  FoundersAdminPainelResponse,
  FoundersParceiroAdmin,
  FoundersPostPayload,
  FoundersSituacaoParceiro,
  FoundersStatusContribuicao,
  FoundersTipoPontos,
} from "@/types/founders";
import {
  formatarDataFounders,
  FoundersEmptyState,
  FoundersInfoCard,
  FoundersSection,
  FoundersStatusBadge,
  FoundersTabs,
} from "./FoundersShared";
import type { FoundersAbaAdmin } from "./FoundersShared";
import FoundersVotacoesAdmin from "./FoundersVotacoesAdmin";
import FoundersEmpresaSelect from "./FoundersEmpresaSelect";

type Feedback = { kind: "success" | "error"; message: string };
type ParceiroForm = {
  empresa_id: string;
  status: FoundersSituacaoParceiro;
  valor_mensal_acordado: string;
  quantidade_usuarios_inclusos: string;
  ciclo_avaliacao_inicio: string;
  ciclo_avaliacao_fim: string;
};

const parceiroFormVazio: ParceiroForm = {
  empresa_id: "",
  status: "ativo",
  valor_mensal_acordado: "39.90",
  quantidade_usuarios_inclusos: "3",
  ciclo_avaliacao_inicio: "",
  ciclo_avaliacao_fim: "",
};

const statusParceiro: { value: FoundersSituacaoParceiro; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "pausado", label: "Pausado" },
  { value: "encerrado", label: "Encerrado" },
];

const statusContribuicao: {
  value: Exclude<FoundersStatusContribuicao, "rascunho" | "enviada">;
  label: string;
}[] = [
  { value: "em_triagem", label: "Em triagem" },
  { value: "em_votacao", label: "Em votação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "rejeitada", label: "Rejeitada" },
  { value: "implementada", label: "Implementada" },
];

const tiposPontos: { value: FoundersTipoPontos; label: string }[] = [
  { value: "credito", label: "Crédito administrativo" },
  { value: "debito", label: "Débito administrativo" },
  { value: "estorno_credito", label: "Estorno de crédito" },
  { value: "estorno_debito", label: "Estorno de débito" },
];

function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-text-secondary">
      {label}
      {children}
    </label>
  );
}

function ParceiroCard({
  parceiro,
  onEdit,
}: {
  parceiro: FoundersParceiroAdmin;
  onEdit: (parceiro: FoundersParceiroAdmin) => void;
}) {
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary">{parceiro.empresa_nome}</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Parceiro Fundador nº {parceiro.numero_fundador}
          </p>
        </div>
        <FoundersStatusBadge status={parceiro.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        <div>
          <dt className="text-xs text-text-secondary">Início da participação</dt>
          <dd className="mt-1 font-medium text-text-primary">
            {formatarDataFounders(parceiro.participacao_inicio)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Fim da participação</dt>
          <dd className="mt-1 font-medium text-text-primary">
            {formatarDataFounders(parceiro.participacao_fim)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Ciclo de avaliação</dt>
          <dd className="mt-1 font-medium text-text-primary">
            {formatarDataFounders(parceiro.ciclo_avaliacao_inicio)} —{" "}
            {formatarDataFounders(parceiro.ciclo_avaliacao_fim)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Valor mensal</dt>
          <dd className="mt-1 font-medium text-text-primary">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(parceiro.valor_mensal_acordado)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Usuários inclusos</dt>
          <dd className="mt-1 font-medium text-text-primary">
            {parceiro.quantidade_usuarios_inclusos}
          </dd>
        </div>
      </dl>
      <p className="mt-3 break-all text-xs text-text-secondary">
        Empresa ID: {parceiro.empresa_id}
      </p>
      <button
        className="gc-action gc-secondary mt-4"
        onClick={() => onEdit(parceiro)}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} />
        Editar participação
      </button>
    </li>
  );
}

export default function FoundersAdminView({
  aba,
  data,
  busca,
  buscaAplicada,
  pagina,
  onAbaChange,
  onBuscaChange,
  onBuscar,
  onPaginaChange,
  onRefresh,
}: {
  aba: FoundersAbaAdmin;
  data: FoundersAdminPainelResponse;
  busca: string;
  buscaAplicada: string;
  pagina: number;
  onAbaChange: (aba: FoundersAbaAdmin) => void;
  onBuscaChange: (value: string) => void;
  onBuscar: (event: FormEvent<HTMLFormElement>) => void;
  onPaginaChange: (pagina: number) => void;
  onRefresh: () => void;
}) {
  const actionLock = useRef(false);
  const idempotencyKey = useRef<{ signature: string; key: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [contribuicaoParaVotacao, setContribuicaoParaVotacao] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [partnerForm, setPartnerForm] = useState<ParceiroForm>(parceiroFormVazio);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");
  const [pointsForm, setPointsForm] = useState({
    empresa_id: "",
    tipo: "credito" as FoundersTipoPontos,
    pontos: "",
    motivo: "",
    referencia_id: "",
  });

  const temProximaPagina =
    data.parceiros.length === 50 || data.contribuicoes.length === 50;

  async function executarAcao(
    payload: FoundersPostPayload,
    mensagemSucesso: string,
    confirmacao?: string,
    onSuccess?: () => void
  ) {
    if (actionLock.current) return;
    if (confirmacao && !window.confirm(confirmacao)) return;

    actionLock.current = true;
    setProcessing(true);
    setFeedback(null);
    try {
      await executarAcaoFounders(payload);
      onSuccess?.();
      setFeedback({ kind: "success", message: mensagemSucesso });
      onRefresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a operação administrativa.",
      });
    } finally {
      actionLock.current = false;
      setProcessing(false);
    }
  }

  function editarParceiro(parceiro: FoundersParceiroAdmin) {
    setEditingPartnerId(parceiro.empresa_id);
    setEmpresaNome(parceiro.empresa_nome);
    setPartnerForm({
      empresa_id: parceiro.empresa_id,
      status: parceiro.status,
      valor_mensal_acordado: String(parceiro.valor_mensal_acordado),
      quantidade_usuarios_inclusos: String(
        parceiro.quantidade_usuarios_inclusos
      ),
      ciclo_avaliacao_inicio: parceiro.ciclo_avaliacao_inicio,
      ciclo_avaliacao_fim: parceiro.ciclo_avaliacao_fim,
    });
    document.getElementById("founders-partner-form")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function salvarParceiro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const monthly = Number(partnerForm.valor_mensal_acordado);
    const users = Number(partnerForm.quantidade_usuarios_inclusos);
    if (
      !Number.isFinite(monthly) ||
      monthly < 0 ||
      !Number.isSafeInteger(users) ||
      users < 0 ||
      !partnerForm.ciclo_avaliacao_inicio ||
      !partnerForm.ciclo_avaliacao_fim ||
      partnerForm.ciclo_avaliacao_fim < partnerForm.ciclo_avaliacao_inicio
    ) {
      setFeedback({
        kind: "error",
        message: "Confira os valores e o período do ciclo de avaliação.",
      });
      return;
    }

    const isUpdate = data.parceiros.some(
      (parceiro) => parceiro.empresa_id === partnerForm.empresa_id.trim()
    );
    void executarAcao(
      {
        acao: "admin_definir_parceiro",
        empresa_id: partnerForm.empresa_id.trim(),
        status: partnerForm.status,
        valor_mensal_acordado: monthly,
        quantidade_usuarios_inclusos: users,
        ciclo_avaliacao_inicio: partnerForm.ciclo_avaliacao_inicio,
        ciclo_avaliacao_fim: partnerForm.ciclo_avaliacao_fim,
      },
      isUpdate || editingPartnerId === partnerForm.empresa_id.trim()
        ? "Participação do parceiro atualizada."
        : "Participação do parceiro salva.",
      "Confirma salvar os dados desta participação Founders?",
      () => {
        setPartnerForm(parceiroFormVazio);
        setEmpresaNome("");
        setEditingPartnerId(null);
      }
    );
  }

  function atualizarContribuicao(
    event: FormEvent<HTMLFormElement>,
    contribuicao: FoundersAdminPainelResponse["contribuicoes"][number],
    form: HTMLFormElement
  ) {
    event.preventDefault();
    const formData = new FormData(form);
    const status = formData.get("status") as Exclude<
      FoundersStatusContribuicao,
      "rascunho" | "enviada"
    >;
    const pontosText = String(formData.get("pontos_concedidos") ?? "").trim();
    const pontos = pontosText === "" ? undefined : Number(pontosText);
    const nota = String(formData.get("nota_administrativa") ?? "").trim();

    if (
      pontos !== undefined &&
      (!Number.isSafeInteger(pontos) || pontos < 0)
    ) {
      setFeedback({
        kind: "error",
        message: "Os pontos concedidos devem ser um número inteiro não negativo.",
      });
      return;
    }

    if (
      pontos !== undefined &&
      status !== "aprovada" &&
      status !== "implementada"
    ) {
      setFeedback({
        kind: "error",
        message:
          "Pontos só podem ser concedidos ao aprovar ou implementar a contribuição.",
      });
      return;
    }

    const podeConcederPontos =
      contribuicao.pontos_concedidos === 0 &&
      (status === "aprovada" || status === "implementada") &&
      (pontos === undefined || pontos > 0);
    const alteracaoPontos =
      pontos !== undefined && pontos !== contribuicao.pontos_concedidos;
    const confirmacao =
      status === "rejeitada"
        ? "Confirma rejeitar esta contribuição?"
        : alteracaoPontos || podeConcederPontos
          ? "Aprovar ou implementar pode conceder pontos previstos à empresa. Confirma a atualização?"
          : undefined;

    const payload: FoundersPostPayload = {
      acao: "admin_atualizar_contribuicao",
      contribuicao_id: contribuicao.id,
      status,
      ...(pontos === undefined ? {} : { pontos_concedidos: pontos }),
      nota_administrativa: nota,
    };

    void executarAcao(
      payload,
      "Contribuição atualizada com sucesso.",
      confirmacao
    );
  }

  function ajustarPontos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const points = Number(pointsForm.pontos);
    const reason = pointsForm.motivo.trim();
    const reference = pointsForm.referencia_id.trim();
    const estorno =
      pointsForm.tipo === "estorno_credito" ||
      pointsForm.tipo === "estorno_debito";

    if (
      !Number.isSafeInteger(points) ||
      points <= 0 ||
      reason.length < 3 ||
      (estorno && !reference)
    ) {
      setFeedback({
        kind: "error",
        message: estorno
          ? "Informe pontos inteiros positivos, motivo e ID do lançamento original para o estorno."
          : "Informe pontos inteiros positivos e um motivo com ao menos 3 caracteres.",
      });
      return;
    }

    const signature = JSON.stringify({
      empresa_id: pointsForm.empresa_id,
      tipo: pointsForm.tipo,
      pontos: points,
      motivo: reason,
      referencia_id: reference,
    });
    if (idempotencyKey.current?.signature !== signature) {
      idempotencyKey.current = {
        signature,
        key: `founders-admin-pontos-${crypto.randomUUID()}`,
      };
    }
    const key = idempotencyKey.current.key;

    void executarAcao(
      {
        acao: "admin_ajustar_pontos",
        empresa_id: pointsForm.empresa_id,
        tipo: pointsForm.tipo,
        pontos: points,
        motivo: reason,
        idempotency_key: key,
        ...(reference ? { referencia_id: reference } : {}),
      },
      "Ajuste de pontos registrado com sucesso.",
      `Confirma o lançamento de ${points} ponto(s) do tipo selecionado para esta empresa?`,
      () => {
        idempotencyKey.current = null;
        setPointsForm((current) => ({
          ...current,
          pontos: "",
          motivo: "",
          referencia_id: "",
        }));
      }
    );
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <p
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-text-primary"
              : "border-red-500/30 bg-red-500/10 text-text-primary"
          }`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      <FoundersTabs
        active={aba}
        ariaLabel="Seções da administração Founders"
        onChange={onAbaChange}
        tabs={[
          { id: "visao", label: "Visão geral" },
          { id: "parceiros", label: "Parceiros" },
          { id: "sugestoes", label: "Sugestões", badge: data.resumo.contribuicoes_abertas },
          { id: "votacoes", label: "Votações", badge: data.resumo.votacoes_abertas },
          { id: "pontuacao", label: "Pontuação e benefícios", badge: data.resumo.resgates_pendentes },
        ]}
      />

      {aba === "visao" && (
        <>
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Administração Founders
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
          Visão geral do programa
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Indicadores e registros retornados pelo painel administrativo.
        </p>
      </section>

      <section aria-label="Resumo do programa" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FoundersInfoCard
          icon={Building2}
          label="Parceiros ativos"
          value={String(data.resumo.parceiros_ativos)}
        />
        <FoundersInfoCard
          icon={FileText}
          label="Contribuições abertas"
          value={String(data.resumo.contribuicoes_abertas)}
        />
        <FoundersInfoCard
          icon={BadgeCheck}
          label="Votações abertas"
          value={String(data.resumo.votacoes_abertas)}
        />
        <FoundersInfoCard
          icon={Gift}
          label="Resgates pendentes"
          value={String(data.resumo.resgates_pendentes)}
        />
      </section>

      <FoundersSection
        title="Sugestões aguardando análise"
        description="Contribuições enviadas pelos parceiros que ainda não foram triadas."
        action={
          <button
            className="gc-action gc-secondary"
            onClick={() => onAbaChange("sugestoes")}
            type="button"
          >
            Ver todas as sugestões
          </button>
        }
      >
        {data.contribuicoes.filter((item) => item.status === "enviada").length === 0 ? (
          <FoundersEmptyState
            icon={FileText}
            title="Nenhuma sugestão aguardando análise"
            description="Novas contribuições dos parceiros aparecerão aqui assim que forem enviadas."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.contribuicoes
              .filter((item) => item.status === "enviada")
              .slice(0, 5)
              .map((item) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0" key={item.id}>
                  <div className="min-w-0">
                    <p className="break-words font-medium text-text-primary">{item.titulo}</p>
                    <p className="text-xs text-text-secondary">
                      {item.empresa_nome} · {formatarDataFounders(item.criado_em)}
                    </p>
                  </div>
                  <FoundersStatusBadge status={item.status} />
                </li>
              ))}
          </ul>
        )}
      </FoundersSection>
        </>
      )}

      {aba === "parceiros" && (
      <FoundersSection
        title="Parceiros fundadores"
        description="Pesquise, consulte e atualize as participações cadastradas."
        action={
          <form className="flex w-full gap-2 sm:w-auto" onSubmit={onBuscar} role="search">
            <label className="sr-only" htmlFor="founders-admin-search">
              Buscar empresa, número de fundador ou contribuição
            </label>
            <input
              className="gc-field min-w-0 sm:w-72"
              id="founders-admin-search"
              onChange={(event) => onBuscaChange(event.target.value)}
              placeholder="Buscar empresa ou contribuição"
              value={busca}
            />
            <button aria-label="Buscar" className="gc-action" type="submit">
              <Search aria-hidden="true" size={16} />
            </button>
          </form>
        }
      >
        <form
          className="mb-6 grid gap-4 rounded-xl border border-border p-4"
          id="founders-partner-form"
          onSubmit={salvarParceiro}
        >
          <div>
            <h3 className="font-semibold text-text-primary">
              Cadastrar ou atualizar participação
            </h3>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Pesquise a empresa pelo nome e selecione-a antes de salvar. O limite de empresas ativas
              é validado pelo banco.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FoundersEmpresaSelect
              disabled={processing}
              empresaId={partnerForm.empresa_id}
              empresaNome={empresaNome}
              onManualId={(id) => {
                setEmpresaNome("");
                setPartnerForm((current) => ({ ...current, empresa_id: id }));
              }}
              onSelect={(empresa) => {
                setEmpresaNome(empresa?.nome ?? "");
                setPartnerForm((current) => ({
                  ...current,
                  empresa_id: empresa?.id ?? "",
                }));
                if (!empresa) setEditingPartnerId(null);
              }}
            />
            <Campo label="Status">
              <select
                className="gc-field"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    status: event.target.value as FoundersSituacaoParceiro,
                  }))
                }
                value={partnerForm.status}
              >
                {statusParceiro.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Valor mensal acordado (R$)">
              <input
                className="gc-field"
                min={0}
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    valor_mensal_acordado: event.target.value,
                  }))
                }
                required
                step="0.01"
                type="number"
                value={partnerForm.valor_mensal_acordado}
              />
            </Campo>
            <Campo label="Usuários inclusos">
              <input
                className="gc-field"
                min={0}
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    quantidade_usuarios_inclusos: event.target.value,
                  }))
                }
                required
                step={1}
                type="number"
                value={partnerForm.quantidade_usuarios_inclusos}
              />
            </Campo>
            <Campo label="Início do ciclo de avaliação">
              <input
                className="gc-field"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    ciclo_avaliacao_inicio: event.target.value,
                  }))
                }
                required
                type="date"
                value={partnerForm.ciclo_avaliacao_inicio}
              />
            </Campo>
            <Campo label="Fim do ciclo de avaliação">
              <input
                className="gc-field"
                onChange={(event) =>
                  setPartnerForm((current) => ({
                    ...current,
                    ciclo_avaliacao_fim: event.target.value,
                  }))
                }
                required
                type="date"
                value={partnerForm.ciclo_avaliacao_fim}
              />
            </Campo>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="gc-action gc-primary"
              disabled={processing || !partnerForm.empresa_id}
              type="submit"
            >
              {processing ? "Salvando..." : "Salvar participação"}
            </button>
            {partnerForm.empresa_id && (
              <button
                className="gc-action gc-secondary"
                disabled={processing}
                onClick={() => {
                  setPartnerForm(parceiroFormVazio);
                  setEmpresaNome("");
                  setEditingPartnerId(null);
                }}
                type="button"
              >
                Limpar formulário
              </button>
            )}
          </div>
        </form>
        {data.parceiros.length === 0 ? (
          <FoundersEmptyState
            icon={Building2}
            title="Nenhum parceiro encontrado"
            description="Não há parceiros nesta página ou correspondentes à busca informada."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.parceiros.map((parceiro) => (
              <ParceiroCard
                key={parceiro.id}
                onEdit={editarParceiro}
                parceiro={parceiro}
              />
            ))}
          </ul>
        )}
      </FoundersSection>
      )}

      {aba === "sugestoes" && (
      <FoundersSection
        title="Contribuições recebidas"
        description={
          buscaAplicada
            ? `Atualize o fluxo, registre a observação administrativa e conceda pontos quando aplicável. Filtro de busca ativo: "${buscaAplicada}".`
            : "Atualize o fluxo, registre a observação administrativa e conceda pontos quando aplicável."
        }
      >
        {data.contribuicoes.length === 0 ? (
          <FoundersEmptyState
            icon={FileText}
            title="Nenhuma contribuição encontrada"
            description="Não há contribuições nesta página ou correspondentes à busca informada."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.contribuicoes.map((contribuicao) => (
              <li className="py-5 first:pt-0 last:pb-0" key={contribuicao.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary">
                      {contribuicao.titulo}
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      {contribuicao.empresa_nome} · {contribuicao.categoria} ·{" "}
                      {formatarDataFounders(contribuicao.criado_em)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Empresa: {contribuicao.empresa_id} · Concedidos:{" "}
                      {contribuicao.pontos_concedidos} pts
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {["enviada", "em_triagem", "aprovada"].includes(contribuicao.status) && (
                      <button
                        className="gc-action gc-secondary"
                        onClick={() => {
                          setContribuicaoParaVotacao(contribuicao.id);
                          onAbaChange("votacoes");
                        }}
                        type="button"
                      >
                        Encaminhar para votação
                      </button>
                    )}
                    <FoundersStatusBadge status={contribuicao.status} />
                  </div>
                </div>
                <form
                  className="mt-4 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2"
                  onSubmit={(event) =>
                    atualizarContribuicao(
                      event,
                      contribuicao,
                      event.currentTarget
                    )
                  }
                >
                  <Campo label="Novo status">
                    <select
                      className="gc-field"
                      defaultValue={statusContribuicao.some(
                        (item) => item.value === contribuicao.status
                      ) ? contribuicao.status : ""}
                      name="status"
                      required
                    >
                      <option value="">Selecione um status</option>
                      {statusContribuicao.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Pontos a conceder (opcional)">
                    <input
                      className="gc-field"
                      defaultValue=""
                      disabled={contribuicao.pontos_concedidos > 0}
                      min={0}
                      name="pontos_concedidos"
                      step={1}
                      type="number"
                    />
                  </Campo>
                  {contribuicao.pontos_concedidos > 0 && (
                    <p className="text-xs text-text-secondary md:col-span-2">
                      Esta contribuição já possui pontos concedidos. Alterações no ledger devem
                      ser feitas em Ajustes de pontuação.
                    </p>
                  )}
                  <Campo label="Observação administrativa">
                    <textarea
                      className="gc-field min-h-20 resize-y"
                      maxLength={4000}
                      name="nota_administrativa"
                    />
                  </Campo>
                  <div className="flex items-end">
                    <button
                      className="gc-action gc-primary"
                      disabled={processing}
                      type="submit"
                    >
                      {processing ? "Salvando..." : "Atualizar contribuição"}
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </FoundersSection>
      )}

      {aba === "votacoes" && (
        <FoundersVotacoesAdmin
          contribuicaoInicialId={contribuicaoParaVotacao}
          contribuicoes={data.contribuicoes}
        />
      )}

      {aba === "pontuacao" && (
        <>
      <FoundersSection
        title="Resgates de benefícios"
        description="Acompanhamento dos pedidos de resgate dos parceiros."
      >
        <FoundersInfoCard
          icon={Gift}
          label="Resgates pendentes"
          value={String(data.resumo.resgates_pendentes)}
          detail="Total retornado pelo resumo do programa"
        />
        <p className="mt-4 text-sm leading-6 text-text-secondary">
          A listagem detalhada de resgates, o saldo por empresa, o extrato de pontos e a
          administração do catálogo de benefícios ainda dependem de RPCs administrativas
          que não existem no backend atual.
        </p>
      </FoundersSection>

      <FoundersSection
        title="Ajustes de pontuação"
        description="Registre créditos, débitos ou estornos administrativos no ledger auditável."
      >
        {data.parceiros.length === 0 ? (
          <FoundersEmptyState
            icon={Wallet}
            title="Nenhuma empresa disponível"
            description="Cadastre ou localize uma participação Founders antes de ajustar pontos."
          />
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={ajustarPontos}>
            <Campo label="Empresa parceira">
              <select
                className="gc-field"
                onChange={(event) =>
                  setPointsForm((current) => ({
                    ...current,
                    empresa_id: event.target.value,
                  }))
                }
                required
                value={pointsForm.empresa_id}
              >
                <option value="">Selecione uma empresa</option>
                {data.parceiros.map((parceiro) => (
                  <option key={parceiro.id} value={parceiro.empresa_id}>
                    {parceiro.empresa_nome} · Fundador nº {parceiro.numero_fundador}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Tipo de lançamento">
              <select
                className="gc-field"
                onChange={(event) =>
                  setPointsForm((current) => ({
                    ...current,
                    tipo: event.target.value as FoundersTipoPontos,
                  }))
                }
                value={pointsForm.tipo}
              >
                {tiposPontos.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Pontos">
              <input
                className="gc-field"
                min={1}
                onChange={(event) =>
                  setPointsForm((current) => ({
                    ...current,
                    pontos: event.target.value,
                  }))
                }
                required
                step={1}
                type="number"
                value={pointsForm.pontos}
              />
            </Campo>
            <Campo label="Motivo (obrigatório)">
              <input
                className="gc-field"
                maxLength={1000}
                minLength={3}
                onChange={(event) =>
                  setPointsForm((current) => ({
                    ...current,
                    motivo: event.target.value,
                  }))
                }
                required
                value={pointsForm.motivo}
              />
            </Campo>
            {(pointsForm.tipo === "estorno_credito" ||
              pointsForm.tipo === "estorno_debito") && (
              <Campo label="ID do lançamento original">
                <input
                  className="gc-field"
                  onChange={(event) =>
                    setPointsForm((current) => ({
                      ...current,
                      referencia_id: event.target.value,
                    }))
                  }
                  required
                  value={pointsForm.referencia_id}
                />
              </Campo>
            )}
            <div className="flex items-end">
              <button
                className="gc-action gc-primary"
                disabled={processing || !pointsForm.empresa_id}
                type="submit"
              >
                {processing ? "Processando..." : "Confirmar ajuste"}
              </button>
            </div>
          </form>
        )}
      </FoundersSection>
        </>
      )}

      {(aba === "parceiros" || aba === "sugestoes") && (
      <nav aria-label="Paginação do painel Founders" className="flex justify-end gap-2">
        <button
          className="gc-action gc-secondary"
          disabled={pagina === 0 || processing}
          onClick={() => onPaginaChange(pagina - 1)}
          type="button"
        >
          Anterior
        </button>
        <span className="flex items-center px-2 text-sm text-text-secondary">
          Página {pagina + 1}
        </span>
        <button
          className="gc-action gc-secondary"
          disabled={!temProximaPagina || processing}
          onClick={() => onPaginaChange(pagina + 1)}
          type="button"
        >
          Próxima
        </button>
      </nav>
      )}
    </div>
  );
}
