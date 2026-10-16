"use client";

import { useCallback, useEffect, useState } from "react";
import { Vote } from "lucide-react";
import { carregarResultadosVotacoesFounders } from "@/lib/founders";
import type {
  FoundersResultadoConsultivo,
  FoundersResultadoVotacao,
} from "@/types/founders";
import {
  formatarDataHoraFounders,
  FoundersEmptyState,
  FoundersSection,
  FoundersStatusBadge,
} from "./FoundersShared";

const rotulosResultado: Record<FoundersResultadoConsultivo, string> = {
  sem_votos: "Sem votos registrados",
  favoravel: "Maioria favorável",
  contraria: "Maioria contrária",
  empate: "Empate",
};

export function FoundersResultadoBloco({
  resultado,
}: {
  resultado: FoundersResultadoVotacao;
}) {
  const percentual = Math.max(0, Math.min(100, resultado.participacao_percentual));

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["A favor", resultado.favor],
          ["Contra", resultado.contra],
          ["Abstenções", resultado.abster],
          ["Total de votos", resultado.total_votos],
        ].map(([rotulo, valor]) => (
          <div className="rounded-lg border border-border bg-surface-secondary/50 p-3" key={rotulo}>
            <dt className="text-xs text-text-secondary">{rotulo}</dt>
            <dd className="mt-1 text-lg font-semibold text-text-primary">{valor}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
          <span>
            Participação: {resultado.total_votos} de {resultado.empresas_elegiveis}{" "}
            empresas elegíveis
          </span>
          <span className="font-semibold text-text-primary">
            {resultado.participacao_percentual.toLocaleString("pt-BR")}%
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-secondary"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
        </div>
      </div>
      <p className="text-sm text-text-primary">
        <span className="font-semibold">{rotulosResultado[resultado.resultado_consultivo]}</span>{" "}
        <span className="text-xs text-text-secondary">
          · resultado consultivo; a decisão final de implementar é da administração do
          Glass Code.
        </span>
      </p>
    </div>
  );
}

type EstadoResultados =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: FoundersResultadoVotacao[] };

export default function FoundersResultadosParceiro() {
  const [state, setState] = useState<EstadoResultados>({ kind: "loading" });
  const [version, setVersion] = useState(0);

  const recarregar = useCallback(() => {
    setState({ kind: "loading" });
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    carregarResultadosVotacoesFounders()
      .then((items) => {
        if (active) {
          setState({ kind: "ready", items: Array.isArray(items) ? items : [] });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os resultados das votações.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [version]);

  return (
    <FoundersSection
      title="Resultados de votações encerradas"
      description="Resultados agregados e consultivos. Os votos individuais não são exibidos."
    >
      {state.kind === "loading" && (
        <p className="text-sm text-text-secondary" role="status">
          Carregando resultados...
        </p>
      )}
      {state.kind === "error" && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-text-primary" role="alert">
          <p>{state.message}</p>
          <button className="gc-action gc-secondary mt-3" onClick={recarregar} type="button">
            Tentar novamente
          </button>
        </div>
      )}
      {state.kind === "ready" &&
        (state.items.length === 0 ? (
          <FoundersEmptyState
            icon={Vote}
            title="Nenhum resultado disponível"
            description="Os resultados aparecem aqui depois que as votações forem encerradas."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {state.items.map((item) => (
              <li className="rounded-xl border border-border p-4" key={item.votacao_id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-semibold text-text-primary">
                    {item.titulo}
                  </h3>
                  <FoundersStatusBadge status="encerrada" />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Encerrada em {formatarDataHoraFounders(item.encerra_em)}
                </p>
                <FoundersResultadoBloco resultado={item} />
              </li>
            ))}
          </ul>
        ))}
    </FoundersSection>
  );
}
