"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Award,
  CalendarDays,
  CircleDollarSign,
  Lightbulb,
  Vote,
} from "lucide-react";
import { executarAcaoFounders } from "@/lib/founders";
import FoundersAnexoUpload from "./FoundersAnexoUpload";
import FoundersResultadosParceiro from "./FoundersResultadosParceiro";
import type { FoundersMinhaAreaResponse, FoundersVoto } from "@/types/founders";
import {
  formatarDataFounders,
  formatarDataHoraFounders,
  formatarMoedaFounders,
  FoundersEmptyState,
  FoundersInfoCard,
  FoundersSection,
  FoundersStatusBadge,
  FoundersTabs,
} from "./FoundersShared";
import type { FoundersAbaParceiro } from "./FoundersShared";

type Feedback = { kind: "success" | "error"; message: string };

const escolhasDeVoto: { valor: FoundersVoto; rotulo: string }[] = [
  { valor: "favor", rotulo: "A favor" },
  { valor: "contra", rotulo: "Contra" },
  { valor: "abster", rotulo: "Abster-se" },
];

export default function FoundersPartnerView({
  aba,
  data,
  onAbaChange,
  onRefresh,
}: {
  aba: FoundersAbaParceiro;
  data: FoundersMinhaAreaResponse;
  onAbaChange: (aba: FoundersAbaParceiro) => void;
  onRefresh: () => void;
}) {
  const parceiro = data.parceiro;
  const actionLock = useRef(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const votacoesPendentes = data.votacoes_abertas.filter(
    (item) =>
      !item.voto_registrado &&
      (item.encerra_em === null || new Date(item.encerra_em).getTime() > agora) &&
      (item.abre_em === null || new Date(item.abre_em).getTime() <= agora)
  ).length;
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});

  async function executarAcao(
    payload: Parameters<typeof executarAcaoFounders>[0],
    mensagemSucesso: string,
    onSuccess?: () => void
  ) {
    if (actionLock.current) return;

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
            : "Não foi possível concluir a operação.",
      });
    } finally {
      actionLock.current = false;
      setProcessing(false);
    }
  }

  function enviarContribuicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tituloLimpo = titulo.trim();
    const descricaoLimpa = descricao.trim();
    const categoriaLimpa = categoria.trim();

    if (
      tituloLimpo.length < 3 ||
      descricaoLimpa.length < 10 ||
      categoriaLimpa.length < 2
    ) {
      setFeedback({
        kind: "error",
        message:
          "Informe título, descrição e categoria válidos antes de enviar.",
      });
      return;
    }

    void executarAcao(
      {
        acao: "enviar_contribuicao",
        titulo: tituloLimpo,
        descricao: descricaoLimpa,
        categoria: categoriaLimpa,
        idempotency_key: `founders-contribuicao-${crypto.randomUUID()}`,
      },
      "Contribuição enviada com sucesso.",
      () => {
        setTitulo("");
        setDescricao("");
        setCategoria("");
      }
    );
  }

  function votar(votacaoId: string, voto: FoundersVoto) {
    void executarAcao(
      { acao: "votar", votacao_id: votacaoId, voto },
      "Voto registrado com sucesso."
    );
  }

  function solicitarBeneficio(
    event: FormEvent<HTMLFormElement>,
    beneficioId: string
  ) {
    event.preventDefault();
    const quantidade = Number(quantidades[beneficioId] ?? "1");
    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
      setFeedback({
        kind: "error",
        message: "Informe uma quantidade inteira maior que zero.",
      });
      return;
    }

    void executarAcao(
      {
        acao: "resgatar_beneficio",
        beneficio_id: beneficioId,
        quantidade,
        idempotency_key: `founders-resgate-${crypto.randomUUID()}`,
      },
      "Solicitação de benefício enviada com sucesso."
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
        ariaLabel="Seções da área do parceiro"
        onChange={onAbaChange}
        tabs={[
          { id: "programa", label: "Meu programa" },
          { id: "sugestoes", label: "Minhas sugestões" },
          { id: "votacoes", label: "Votações", badge: votacoesPendentes },
          { id: "beneficios", label: "Benefícios" },
        ]}
      />

      {aba === "programa" && (
        <>
      <section className="gc-panel overflow-hidden p-0">
        <div className="bg-surface-secondary px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Área do parceiro
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                {parceiro
                  ? `Parceiro Fundador nº ${parceiro.numero_fundador}`
                  : "Participação Founders"}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Acompanhe sua participação, contribuições e oportunidades.
              </p>
            </div>
            {parceiro && <FoundersStatusBadge status={parceiro.status} />}
          </div>
        </div>
        {parceiro ? (
          <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
            <div>
              <dt className="text-xs font-medium text-text-secondary">Participação desde</dt>
              <dd className="mt-1 font-semibold text-text-primary">
                {formatarDataFounders(parceiro.participacao_inicio)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Fim da participação</dt>
              <dd className="mt-1 font-semibold text-text-primary">
                {parceiro.participacao_fim
                  ? formatarDataFounders(parceiro.participacao_fim)
                  : "Sem data de encerramento"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Ciclo de avaliação</dt>
              <dd className="mt-1 font-semibold text-text-primary">
                {formatarDataFounders(parceiro.ciclo_avaliacao_inicio)} —{" "}
                {formatarDataFounders(parceiro.ciclo_avaliacao_fim)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Usuários inclusos</dt>
              <dd className="mt-1 font-semibold text-text-primary">
                {parceiro.quantidade_usuarios_inclusos}
              </dd>
              <dd className="mt-1 text-xs text-text-secondary">
                Mensalidade acordada:{" "}
                {formatarMoedaFounders(parceiro.valor_mensal_acordado)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="p-5 text-sm text-text-secondary">
            Os dados cadastrais da participação não foram retornados.
          </p>
        )}
      </section>

      <section aria-label="Resumo da participação" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FoundersInfoCard
          icon={CircleDollarSign}
          label="Saldo de pontos"
          value={new Intl.NumberFormat("pt-BR").format(data.saldo_pontos)}
          detail="Saldo atual da empresa no programa"
        />
        <FoundersInfoCard
          icon={CalendarDays}
          label="Contribuições enviadas"
          value={String(data.contribuicoes.length)}
          detail="Contribuições incluídas nesta área"
        />
        <FoundersInfoCard
          icon={Vote}
          label="Votações pendentes"
          value={String(votacoesPendentes)}
          detail="Abertas e sem voto da sua empresa"
        />
        <FoundersInfoCard
          icon={Award}
          label="Benefícios disponíveis"
          value={String(data.beneficios.length)}
          detail="Catálogo ativo para resgate"
        />
      </section>
        </>
      )}

      {aba === "sugestoes" && (
      <FoundersSection
        title="Contribuições"
        description="Acompanhe o andamento das contribuições da sua empresa."
      >
        <form className="mb-6 grid gap-4 rounded-xl border border-border p-4" onSubmit={enviarContribuicao}>
          <h3 className="font-semibold text-text-primary">Enviar uma contribuição</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-text-secondary">
              Título
              <input
                className="gc-field"
                maxLength={180}
                minLength={3}
                onChange={(event) => setTitulo(event.target.value)}
                required
                value={titulo}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-text-secondary">
              Categoria
              <input
                className="gc-field"
                maxLength={80}
                minLength={2}
                onChange={(event) => setCategoria(event.target.value)}
                required
                value={categoria}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm text-text-secondary">
            Descrição
            <textarea
              className="gc-field min-h-28 resize-y"
              maxLength={20000}
              minLength={10}
              onChange={(event) => setDescricao(event.target.value)}
              required
              value={descricao}
            />
          </label>
          <div>
            <button className="gc-action gc-primary" disabled={processing} type="submit">
              {processing ? "Enviando..." : "Enviar contribuição"}
            </button>
          </div>
        </form>
        {data.contribuicoes.length === 0 ? (
          <FoundersEmptyState
            icon={Lightbulb}
            title="Nenhuma contribuição ainda"
            description="Quando houver contribuições cadastradas para sua empresa, elas aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.contribuicoes.map((item) => (
              <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-text-primary">{item.titulo}</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      {item.categoria} · Enviada em {formatarDataFounders(item.criado_em)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <FoundersStatusBadge status={item.status} />
                    <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                      <Award aria-hidden="true" size={15} />
                      {item.pontos_concedidos} pts
                    </span>
                  </div>
                </div>
                <FoundersAnexoUpload
                  contribuicaoId={item.id}
                  empresaId={data.empresa_id}
                  onUploaded={onRefresh}
                />
              </li>
            ))}
          </ul>
        )}
      </FoundersSection>
      )}

      {aba === "votacoes" && (
        <>
      <FoundersSection
        title="Votações abertas"
        description="Votações disponíveis para participação da sua empresa."
      >
        {data.votacoes_abertas.length === 0 ? (
          <FoundersEmptyState
            icon={Vote}
            title="Nenhuma votação aberta"
            description="As votações disponíveis serão exibidas aqui."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {data.votacoes_abertas.map((item) => {
              const prazoEncerrado =
                item.encerra_em !== null &&
                new Date(item.encerra_em).getTime() <= agora;
              const aindaNaoAberta =
                item.abre_em !== null &&
                new Date(item.abre_em).getTime() > agora;
              const podeVotar =
                !item.voto_registrado && !prazoEncerrado && !aindaNaoAberta;

              return (
              <li className="rounded-xl border border-border p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-semibold text-text-primary">
                    {item.titulo}
                  </h3>
                  <FoundersStatusBadge status={prazoEncerrado ? "encerrada" : "aberta"} />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {item.descricao}
                </p>
                <p className="mt-4 text-xs text-text-secondary">
                  {item.abre_em
                    ? `Abre em ${formatarDataHoraFounders(item.abre_em)}`
                    : "Aberta"}{" "}
                  ·{" "}
                  {item.encerra_em
                    ? `Prazo até ${formatarDataHoraFounders(item.encerra_em)}`
                    : "Sem data de encerramento"}
                </p>
                <p className="mt-2 text-xs font-medium text-text-primary">
                  {item.voto_registrado
                    ? "Sua empresa já registrou voto."
                    : prazoEncerrado
                      ? "O prazo terminou; o resultado será exibido abaixo após o encerramento."
                      : aindaNaoAberta
                        ? "A votação ainda não iniciou."
                        : "Voto ainda não registrado."}
                </p>
                {podeVotar && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {escolhasDeVoto.map((escolha) => (
                      <button
                        className="gc-action gc-secondary"
                        disabled={processing}
                        key={escolha.valor}
                        onClick={() => votar(item.id, escolha.valor)}
                        type="button"
                      >
                        {processing ? "Processando..." : escolha.rotulo}
                      </button>
                    ))}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </FoundersSection>

      <FoundersResultadosParceiro />
        </>
      )}

      {aba === "beneficios" && (
      <FoundersSection
        title="Benefícios disponíveis"
        description="Benefícios ativos e pontos necessários para resgate."
      >
        {data.beneficios.length === 0 ? (
          <FoundersEmptyState
            icon={Award}
            title="Nenhum benefício disponível"
            description="Os benefícios ativos serão exibidos aqui quando estiverem disponíveis."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.beneficios.map((beneficio) => {
              const quantidade = Number(quantidades[beneficio.id] ?? "1");
              const pontosDisponiveis =
                beneficio.pontos_necessarios > 0
                  ? Math.floor(data.saldo_pontos / beneficio.pontos_necessarios)
                  : 0;
              const saldoInsuficiente =
                data.saldo_pontos < beneficio.pontos_necessarios;

              return (
                <li className="rounded-xl border border-border p-4" key={beneficio.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {beneficio.codigo}
                  </p>
                  <h3 className="mt-2 font-semibold text-text-primary">{beneficio.nome}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {beneficio.descricao}
                  </p>
                  <p className="mt-4 border-t border-border pt-3 text-sm font-semibold text-text-primary">
                    {beneficio.pontos_necessarios} pontos
                  </p>
                  {(beneficio.limite_por_empresa !== null ||
                    beneficio.estoque_total !== null) && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {beneficio.limite_por_empresa !== null &&
                        `Limite por empresa: ${beneficio.limite_por_empresa}`}
                      {beneficio.limite_por_empresa !== null &&
                        beneficio.estoque_total !== null &&
                        " · "}
                      {beneficio.estoque_total !== null &&
                        `Estoque total: ${beneficio.estoque_total}`}
                    </p>
                  )}
                  <form
                    className="mt-4 grid gap-3"
                    onSubmit={(event) => solicitarBeneficio(event, beneficio.id)}
                  >
                    <label className="grid gap-1.5 text-sm text-text-secondary">
                      Quantidade
                      <input
                        className="gc-field"
                        max={Math.max(1, pontosDisponiveis)}
                        min={1}
                        onChange={(event) =>
                          setQuantidades((current) => ({
                            ...current,
                            [beneficio.id]: event.target.value,
                          }))
                        }
                        step={1}
                        type="number"
                        value={quantidades[beneficio.id] ?? "1"}
                      />
                    </label>
                    {saldoInsuficiente && (
                      <p className="text-xs text-text-secondary">
                        Saldo insuficiente para solicitar este benefício.
                      </p>
                    )}
                    <button
                      className="gc-action gc-primary"
                      disabled={
                        processing ||
                        saldoInsuficiente ||
                        !Number.isSafeInteger(quantidade) ||
                        quantidade <= 0 ||
                        quantidade > pontosDisponiveis
                      }
                      type="submit"
                    >
                      {processing ? "Processando..." : "Solicitar benefício"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </FoundersSection>
      )}
    </div>
  );
}
