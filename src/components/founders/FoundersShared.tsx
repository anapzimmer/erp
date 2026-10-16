import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  FoundersSituacaoParceiro,
  FoundersStatusContribuicao,
  FoundersStatusVotacao,
} from "@/types/founders";

const statusLabels: Record<
  FoundersSituacaoParceiro | FoundersStatusContribuicao | FoundersStatusVotacao,
  string
> = {
  ativo: "Ativo",
  inativo: "Inativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_triagem: "Em triagem",
  em_votacao: "Em votação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  implementada: "Implementada",
  aberta: "Aberta",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const statusStyles: Record<
  FoundersSituacaoParceiro | FoundersStatusContribuicao | FoundersStatusVotacao,
  string
> = {
  ativo: "border-success/30 bg-success-soft text-success",
  inativo: "border-border bg-surface-secondary text-text-secondary",
  pausado: "border-warning/30 bg-warning-soft text-warning",
  encerrado: "border-border bg-surface-secondary text-text-secondary",
  rascunho: "border-border bg-surface-secondary text-text-secondary",
  enviada: "border-info/30 bg-info-soft text-info",
  em_triagem: "border-info/30 bg-info-soft text-info",
  em_votacao: "border-primary/30 bg-primary/10 text-primary",
  aprovada: "border-success/30 bg-success-soft text-success",
  rejeitada: "border-danger/30 bg-danger-soft text-danger",
  implementada: "border-success/30 bg-success-soft text-success",
  aberta: "border-primary/30 bg-primary/10 text-primary",
  encerrada: "border-border bg-surface-secondary text-text-secondary",
  cancelada: "border-border bg-surface-secondary text-text-secondary",
};

export function FoundersStatusBadge({
  status,
}: {
  status:
    | FoundersSituacaoParceiro
    | FoundersStatusContribuicao
    | FoundersStatusVotacao;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function FoundersSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="gc-panel min-w-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FoundersEmptyState({
  icon: Icon = Sparkles,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface-secondary/50 px-5 py-8 text-center">
      <Icon aria-hidden="true" className="mx-auto text-text-secondary" size={24} />
      <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

export function FoundersInfoCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        <Icon aria-hidden="true" size={15} />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-text-secondary">{detail}</p>}
    </div>
  );
}

export function FoundersPageState({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: "loading" | "error" | "denied";
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const Icon =
    kind === "loading"
      ? Clock3
      : kind === "denied"
        ? ShieldCheck
        : CircleAlert;

  return (
    <section
      className="gc-panel mx-auto max-w-2xl px-6 py-12 text-center"
      role={kind === "loading" ? "status" : "alert"}
      aria-live={kind === "loading" ? "polite" : "assertive"}
    >
      <Icon
        aria-hidden="true"
        className={`mx-auto ${kind === "error" ? "text-danger" : "text-primary"}`}
        size={30}
      />
      <h2 className="mt-4 text-xl font-semibold text-text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">
        {message}
      </p>
      {onRetry && (
        <button className="gc-action gc-secondary mt-6" onClick={onRetry} type="button">
          <BadgeCheck aria-hidden="true" size={16} />
          Tentar novamente
        </button>
      )}
    </section>
  );
}

export function formatarDataFounders(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T00:00:00`)
    : new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

export function formatarDataHoraFounders(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatarMoedaFounders(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export interface FoundersTabItem<T extends string> {
  id: T;
  label: string;
  badge?: number;
}

export function FoundersTabs<T extends string>({
  ariaLabel,
  tabs,
  active,
  onChange,
}: {
  ariaLabel: string;
  tabs: FoundersTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        aria-label={ariaLabel}
        className="flex min-w-max gap-1 rounded-xl border border-border bg-surface-secondary p-1"
        role="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              aria-selected={selected}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type FoundersAbaAdmin =
  | "visao"
  | "parceiros"
  | "sugestoes"
  | "votacoes"
  | "pontuacao";

export type FoundersAbaParceiro =
  | "programa"
  | "sugestoes"
  | "votacoes"
  | "beneficios";
