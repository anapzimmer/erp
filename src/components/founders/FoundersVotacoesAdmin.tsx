"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Vote } from "lucide-react";
import {
  carregarParticipantesVotacaoFounders,
  carregarVotacoesAdminFounders,
  executarAcaoFounders,
} from "@/lib/founders";
import type {
  FoundersContribuicaoAdmin,
  FoundersParticipantesVotacaoResponse,
  FoundersVotacaoAdmin,
} from "@/types/founders";
import {
  formatarDataHoraFounders,
  FoundersEmptyState,
  FoundersSection,
  FoundersStatusBadge,
} from "./FoundersShared";
import { FoundersResultadoBloco } from "./FoundersResultadosParceiro";

type Feedback = { kind: "success" | "error"; message: string };

type FormVotacao = {
  titulo: string;
  descricao: string;
  abre_em: string;
  encerra_em: string;
};

const formVazio: FormVotacao = {
  titulo: "",
  descricao: "",
  abre_em: "",
  encerra_em: "",
};

const statusElegiveis = ["enviada", "em_triagem", "em_votacao", "aprovada"];

function paraInputLocal(valor: string | null) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(
    data.getHours()
  )}:${pad(data.getMinutes())}`;
}

function paraIso(valor: string) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

function validarForm(form: FormVotacao): { erro: string } | { abre: string | null; encerra: string } {
  if (form.titulo.trim().length < 3 || form.titulo.trim().length > 180) {
    return { erro: "O título deve ter entre 3 e 180 caracteres." };
  }
  if (form.descricao.trim().length < 10 || form.descricao.trim().length > 8000) {
    return { erro: "A descrição deve ter entre 10 e 8000 caracteres." };
  }
  const encerra = paraIso(form.encerra_em);
  if (!encerra) return { erro: "Informe a data e hora de encerramento." };
  const abre = paraIso(form.abre_em);
  if (form.abre_em && !abre) return { erro: "Data de abertura inválida." };
  if (new Date(encerra).getTime() <= Date.now()) {
    return { erro: "O encerramento deve estar no futuro." };
  }
  if (abre && new Date(encerra).getTime() <= new Date(abre).getTime()) {
    return { erro: "O encerramento deve ser posterior à abertura." };
  }
  return { abre, encerra };
}

function FormularioVotacao({
  form,
  onChange,
  onSubmit,
  disabled,
  submitLabel,
  onCancel,
}: {
  form: FormVotacao;
  onChange: (form: FormVotacao) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <label className="grid gap-1.5 text-sm text-text-secondary md:col-span-2">
        Título da votação
        <input
          className="gc-field"
          maxLength={180}
          onChange={(event) => onChange({ ...form, titulo: event.target.value })}
          required
          value={form.titulo}
        />
      </label>
      <label className="grid gap-1.5 text-sm text-text-secondary md:col-span-2">
        Descrição
        <textarea
          className="gc-field min-h-28"
          maxLength={8000}
          onChange={(event) => onChange({ ...form, descricao: event.target.value })}
          required
          value={form.descricao}
        />
      </label>
      <label className="grid gap-1.5 text-sm text-text-secondary">
        Abertura (opcional)
        <input
          className="gc-field"
          onChange={(event) => onChange({ ...form, abre_em: event.target.value })}
          type="datetime-local"
          value={form.abre_em}
        />
      </label>
      <label className="grid gap-1.5 text-sm text-text-secondary">
        Encerramento
        <input
          className="gc-field"
          onChange={(event) => onChange({ ...form, encerra_em: event.target.value })}
          required
          type="datetime-local"
          value={form.encerra_em}
        />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button className="gc-action gc-primary" disabled={disabled} type="submit">
          {disabled ? "Processando..." : submitLabel}
        </button>
        {onCancel && (
          <button
            className="gc-action gc-secondary"
            disabled={disabled}
            onClick={onCancel}
            type="button"
          >
            Cancelar edição
          </button>
        )}
      </div>
    </form>
  );
}

type EstadoLista =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: FoundersVotacaoAdmin[] };

type EstadoParticipantes =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: FoundersParticipantesVotacaoResponse };

export default function FoundersVotacoesAdmin({
  contribuicoes,
  contribuicaoInicialId = null,
}: {
  contribuicoes: FoundersContribuicaoAdmin[];
  contribuicaoInicialId?: string | null;
}) {
  const lock = useRef(false);
  const [lista, setLista] = useState<EstadoLista>({ kind: "loading" });
  const [version, setVersion] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [contribuicaoId, setContribuicaoId] = useState(contribuicaoInicialId ?? "");
  const [form, setForm] = useState<FormVotacao>(() => ({
    ...formVazio,
    titulo:
      contribuicoes.find((item) => item.id === contribuicaoInicialId)?.titulo ?? "",
  }));
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormVotacao>(formVazio);
  const [participantes, setParticipantes] = useState<Record<string, EstadoParticipantes>>({});

  const recarregar = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    carregarVotacoesAdminFounders()
      .then((items) => {
        if (active) setLista({ kind: "ready", items: Array.isArray(items) ? items : [] });
      })
      .catch((error: unknown) => {
        if (active) {
          setLista({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar as votações.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function executar(
    payload: Parameters<typeof executarAcaoFounders>[0],
    mensagemSucesso: string,
    confirmacao?: string,
    onSuccess?: () => void
  ) {
    if (lock.current) return;
    if (confirmacao && !window.confirm(confirmacao)) return;

    lock.current = true;
    setProcessing(true);
    setFeedback(null);
    try {
      await executarAcaoFounders(payload);
      onSuccess?.();
      setFeedback({ kind: "success", message: mensagemSucesso });
      setParticipantes({});
      recarregar();
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Não foi possível concluir a operação.",
      });
    } finally {
      lock.current = false;
      setProcessing(false);
    }
  }

  function selecionarContribuicao(id: string) {
    setContribuicaoId(id);
    const escolhida = contribuicoes.find((item) => item.id === id);
    if (escolhida && !form.titulo.trim()) {
      setForm((atual) => ({ ...atual, titulo: escolhida.titulo }));
    }
  }

  function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!elegiveis.some((item) => item.id === contribuicaoId)) {
      setFeedback({ kind: "error", message: "Selecione uma contribuição." });
      return;
    }
    const validado = validarForm(form);
    if ("erro" in validado) {
      setFeedback({ kind: "error", message: validado.erro });
      return;
    }
    void executar(
      {
        acao: "admin_criar_votacao",
        contribuicao_id: contribuicaoId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        abre_em: validado.abre,
        encerra_em: validado.encerra,
      },
      "Votação criada em rascunho. Abra-a quando estiver pronta.",
      undefined,
      () => {
        setContribuicaoId("");
        setForm(formVazio);
      }
    );
  }

  function iniciarEdicao(votacao: FoundersVotacaoAdmin) {
    setEditandoId(votacao.votacao_id);
    setFormEdicao({
      titulo: votacao.titulo,
      descricao: votacao.descricao ?? "",
      abre_em: paraInputLocal(votacao.abre_em),
      encerra_em: paraInputLocal(votacao.encerra_em),
    });
  }

  function salvarEdicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editandoId) return;
    const validado = validarForm(formEdicao);
    if ("erro" in validado) {
      setFeedback({ kind: "error", message: validado.erro });
      return;
    }
    void executar(
      {
        acao: "admin_atualizar_votacao",
        votacao_id: editandoId,
        titulo: formEdicao.titulo.trim(),
        descricao: formEdicao.descricao.trim(),
        abre_em: validado.abre,
        encerra_em: validado.encerra,
      },
      "Votação atualizada.",
      undefined,
      () => setEditandoId(null)
    );
  }

  function abrir(votacao: FoundersVotacaoAdmin) {
    void executar(
      { acao: "admin_abrir_votacao", votacao_id: votacao.votacao_id },
      "Votação aberta para os parceiros.",
      `Abrir a votação "${votacao.titulo}"? As empresas participantes poderão votar e os dados deixam de ser editáveis.`
    );
  }

  function encerrar(votacao: FoundersVotacaoAdmin, cancelar: boolean) {
    void executar(
      {
        acao: "admin_encerrar_votacao",
        votacao_id: votacao.votacao_id,
        cancelar,
      },
      cancelar ? "Votação cancelada. Os votos foram preservados." : "Votação encerrada.",
      cancelar
        ? `Cancelar a votação "${votacao.titulo}"? Os votos registrados serão preservados, mas a votação não poderá ser reaberta.`
        : `Encerrar antecipadamente a votação "${votacao.titulo}"? Novos votos serão bloqueados.`
    );
  }

  async function alternarParticipantes(id: string) {
    if (participantes[id]) {
      setParticipantes((atual) => {
        const proximo = { ...atual };
        delete proximo[id];
        return proximo;
      });
      return;
    }
    setParticipantes((atual) => ({ ...atual, [id]: { kind: "loading" } }));
    try {
      const data = await carregarParticipantesVotacaoFounders(id);
      setParticipantes((atual) => ({ ...atual, [id]: { kind: "ready", data } }));
    } catch (error) {
      setParticipantes((atual) => ({
        ...atual,
        [id]: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os participantes.",
        },
      }));
    }
  }

  const votacoes = lista.kind === "ready" ? lista.items : [];
  const idsComVotacao = new Set(votacoes.map((item) => item.contribuicao_id));
  const elegiveis = contribuicoes.filter(
    (item) => statusElegiveis.includes(item.status) && !idsComVotacao.has(item.id)
  );

  return (
    <FoundersSection
      title="Votações oficiais"
      description="Crie votações a partir de contribuições, acompanhe resultados consultivos e as empresas que participaram. A decisão de implementar é independente do resultado."
      action={
        <button
          className="gc-action gc-secondary"
          disabled={processing || lista.kind === "loading"}
          onClick={recarregar}
          type="button"
        >
          Atualizar votações
        </button>
      }
    >
      {feedback && (
        <p
          aria-live="polite"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-text-primary"
              : "border-red-500/30 bg-red-500/10 text-text-primary"
          }`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      {lista.kind === "loading" && (
        <p className="text-sm text-text-secondary" role="status">
          Carregando votações...
        </p>
      )}

      {lista.kind === "error" && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-text-primary" role="alert">
          <p>{lista.message}</p>
          <button className="gc-action gc-secondary mt-3" onClick={recarregar} type="button">
            Tentar novamente
          </button>
        </div>
      )}

      {lista.kind === "ready" && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Nova votação</h3>
            {elegiveis.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nenhuma contribuição disponível para votação entre as listadas no painel
                (contribuições já associadas a uma votação, rejeitadas ou implementadas não
                aparecem).
              </p>
            ) : (
              <div className="space-y-4">
                <label className="grid gap-1.5 text-sm text-text-secondary">
                  Contribuição
                  <select
                    className="gc-field"
                    disabled={processing}
                    onChange={(event) => selecionarContribuicao(event.target.value)}
                    value={elegiveis.some((item) => item.id === contribuicaoId) ? contribuicaoId : ""}
                  >
                    <option value="">Selecione uma contribuição</option>
                    {elegiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.titulo} · {item.empresa_nome}
                      </option>
                    ))}
                  </select>
                </label>
                <FormularioVotacao
                  disabled={processing}
                  form={form}
                  onChange={setForm}
                  onSubmit={criar}
                  submitLabel="Criar votação em rascunho"
                />
              </div>
            )}
          </div>

          {votacoes.length === 0 ? (
            <FoundersEmptyState
              icon={Vote}
              title="Nenhuma votação cadastrada"
              description="Crie uma votação a partir de uma contribuição para que as empresas participantes possam votar."
            />
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {votacoes.map((votacao) => {
                const efetivo = votacao.status_efetivo;
                const iniciada =
                  !votacao.abre_em || new Date(votacao.abre_em).getTime() <= Date.now();
                const emEdicao = editandoId === votacao.votacao_id;
                const estadoParticipantes = participantes[votacao.votacao_id];

                return (
                  <li className="min-w-0 rounded-xl border border-border p-4" key={votacao.votacao_id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-text-primary">
                          {votacao.titulo}
                        </h3>
                        <p className="mt-1 text-xs text-text-secondary">
                          Contribuição: {votacao.contribuicao_titulo} · {votacao.empresa_nome}
                        </p>
                      </div>
                      <FoundersStatusBadge status={efetivo} />
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">
                      Abertura: {formatarDataHoraFounders(votacao.abre_em)} · Encerramento:{" "}
                      {formatarDataHoraFounders(votacao.encerra_em)}
                    </p>

                    {emEdicao ? (
                      <div className="mt-4">
                        <FormularioVotacao
                          disabled={processing}
                          form={formEdicao}
                          onCancel={() => setEditandoId(null)}
                          onChange={setFormEdicao}
                          onSubmit={salvarEdicao}
                          submitLabel="Salvar alterações"
                        />
                      </div>
                    ) : (
                      <>
                        <FoundersResultadoBloco resultado={votacao} />
                        <div className="mt-4 flex flex-wrap gap-2">
                          {votacao.status === "rascunho" && (
                            <>
                              <button
                                className="gc-action gc-secondary"
                                disabled={processing}
                                onClick={() => iniciarEdicao(votacao)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="gc-action gc-primary"
                                disabled={processing}
                                onClick={() => abrir(votacao)}
                                type="button"
                              >
                                Abrir votação
                              </button>
                              <button
                                className="gc-action gc-secondary"
                                disabled={processing}
                                onClick={() => encerrar(votacao, true)}
                                type="button"
                              >
                                Cancelar votação
                              </button>
                            </>
                          )}
                          {efetivo === "aberta" && (
                            <>
                              {iniciada && (
                                <button
                                  className="gc-action gc-primary"
                                  disabled={processing}
                                  onClick={() => encerrar(votacao, false)}
                                  type="button"
                                >
                                  Encerrar antecipadamente
                                </button>
                              )}
                              <button
                                className="gc-action gc-secondary"
                                disabled={processing}
                                onClick={() => encerrar(votacao, true)}
                                type="button"
                              >
                                Cancelar votação
                              </button>
                            </>
                          )}
                          <button
                            className="gc-action gc-secondary"
                            disabled={processing}
                            onClick={() => void alternarParticipantes(votacao.votacao_id)}
                            type="button"
                          >
                            {estadoParticipantes ? "Ocultar participantes" : "Ver participantes"}
                          </button>
                        </div>
                      </>
                    )}

                    {estadoParticipantes?.kind === "loading" && (
                      <p className="mt-3 text-xs text-text-secondary" role="status">
                        Carregando participantes...
                      </p>
                    )}
                    {estadoParticipantes?.kind === "error" && (
                      <p className="mt-3 text-xs text-danger" role="alert">
                        {estadoParticipantes.message}
                      </p>
                    )}
                    {estadoParticipantes?.kind === "ready" && (
                      <div className="mt-3 rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs text-text-secondary">
                          Empresas participantes. A escolha de cada empresa não é exibida.
                        </p>
                        {estadoParticipantes.data.participantes.length === 0 ? (
                          <p className="text-xs text-text-secondary">
                            Nenhuma empresa elegível encontrada.
                          </p>
                        ) : (
                          <ul className="divide-y divide-border text-sm">
                            {estadoParticipantes.data.participantes.map((p) => (
                              <li
                                className="flex flex-wrap items-center justify-between gap-2 py-2"
                                key={p.empresa_id}
                              >
                                <span className="min-w-0 break-words text-text-primary">
                                  {p.empresa_nome} · nº {p.numero_fundador}
                                </span>
                                <span
                                  className={`text-xs ${
                                    p.participou ? "text-success" : "text-text-secondary"
                                  }`}
                                >
                                  {p.participou
                                    ? `Votou em ${formatarDataHoraFounders(p.votou_em)}`
                                    : "Ainda não votou"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </FoundersSection>
  );
}
