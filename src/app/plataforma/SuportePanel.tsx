"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Headphones,
  MessageSquare,
  Paperclip,
  RefreshCw,
    X,
  ExternalLink,
} from "lucide-react";

import { consultarPlataforma } from "@/lib/plataforma";

type AnexoSuporte = {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  created_at: string;
};

type ChamadoSuporte = {
  id: string;
  empresa_id: string;
  empresa_nome: string | null;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  categoria: string;
  status: string;
  prioridade: string;
  created_at: string;
  updated_at: string;
  resolvido_at: string | null;
  anexos: AnexoSuporte[];
};

type RespostaSuporte = {
  chamados?: ChamadoSuporte[];
};

const statusLabel: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
};

const categoriaLabel: Record<string, string> = {
  duvida: "Dúvida",
  problema: "Problema no sistema",
  configuracao: "Configuração",
  sugestao: "Sugestão",
  outro: "Outro",
};

export default function SuportePanel() {
  const [chamados, setChamados] = useState<ChamadoSuporte[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [chamadoAberto, setChamadoAberto] =
    useState<ChamadoSuporte | null>(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const resultado = (await consultarPlataforma(
        "?modo=suporte"
      )) as RespostaSuporte;

      setChamados(resultado.chamados ?? []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os chamados."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const novos = chamados.filter(
    (chamado) => chamado.status === "novo"
  ).length;

  const emAndamento = chamados.filter((chamado) =>
    ["em_analise", "em_atendimento"].includes(chamado.status)
  ).length;

  const aguardando = chamados.filter(
    (chamado) => chamado.status === "aguardando_cliente"
  ).length;

  const resolvidos = chamados.filter(
    (chamado) => chamado.status === "resolvido"
  ).length;

const abrirAnexo = async (caminho: string) => {
  try {
    const resultado = (await consultarPlataforma("", {
      acao: "suporte_anexo",
      caminho,
    })) as { url?: string };

    if (!resultado.url) {
      throw new Error("Link do anexo não disponível.");
    }

    window.open(
      resultado.url,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (error) {
    setErro(
      error instanceof Error
        ? error.message
        : "Não foi possível abrir o anexo."
    );
  }
};

  return (
    <div className="space-y-5">
      {/* RESUMO */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Novos", novos],
          ["Em atendimento", emAndamento],
          ["Aguardando cliente", aguardando],
          ["Resolvidos", resolvidos],
        ].map(([titulo, valor]) => (
          <div
            key={titulo}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <p className="text-sm text-text-secondary">
              {titulo}
            </p>

            <p className="mt-2 text-3xl font-medium">
              {valor}
            </p>
          </div>
        ))}
      </section>

      {/* CHAMADOS */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Headphones size={17} />

              <h2 className="font-medium">
                Chamados recebidos
              </h2>
            </div>

            <p className="mt-1 text-sm text-text-secondary">
              Solicitações enviadas pelos clientes do Glass Code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            className="
              flex items-center gap-2 rounded-lg
              border border-border bg-surface
              px-3 py-2 text-sm
              hover:bg-surface-secondary
              disabled:opacity-40
            "
          >
            <RefreshCw
              size={15}
              className={carregando ? "animate-spin" : ""}
            />

            Atualizar
          </button>
        </div>

        {erro && (
          <div className="m-4 rounded-xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger">
            {erro}
          </div>
        )}

        {carregando && (
          <div className="p-8 text-center text-sm text-text-secondary">
            Carregando chamados...
          </div>
        )}

        {!carregando && !erro && chamados.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface-secondary">
              <MessageSquare size={19} />
            </div>

            <h3 className="mt-4 font-medium">
              Nenhum chamado recebido
            </h3>

            <p className="mt-1 text-sm text-text-secondary">
              Os chamados enviados pelos clientes aparecerão aqui.
            </p>
          </div>
        )}

        {!carregando && chamados.length > 0 && (
          <div className="divide-y divide-border">
            {chamados.map((chamado) => (
             <article
  key={chamado.id}
  onClick={() => setChamadoAberto(chamado)}
  className="
    cursor-pointer px-5 py-5 transition
    hover:bg-surface-secondary/50
  "
>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary">
                        {chamado.empresa_nome ||
                          "Empresa não identificada"}
                      </span>

                      <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary">
                        {categoriaLabel[chamado.categoria] ??
                          chamado.categoria}
                      </span>

                      <span className="rounded-full bg-[#C8D463]/20 px-2.5 py-1 text-xs font-medium text-[#38444B]">
                        {statusLabel[chamado.status] ??
                          chamado.status}
                      </span>
                    </div>

                    <h3 className="font-medium">
                      {chamado.titulo}
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
                      {chamado.mensagem}
                    </p>

                    {chamado.anexos?.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                        <Paperclip size={13} />

                        {chamado.anexos.length}{" "}
                        {chamado.anexos.length === 1
                          ? "anexo"
                          : "anexos"}
                      </div>
                    )}
                  </div>

                  <time
                    dateTime={chamado.created_at}
                    className="shrink-0 text-xs text-text-secondary"
                  >
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(chamado.created_at))}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
          </section>

      {/* DETALHES DO CHAMADO */}
      {chamadoAberto && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-black/40 p-4
          "
          onClick={() => setChamadoAberto(null)}
        >
          <div
            className="
              relative w-full max-w-2xl
              overflow-hidden rounded-2xl
              border border-border
              bg-surface shadow-2xl
            "
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-text-secondary">
                    {chamadoAberto.empresa_nome ||
                      "Empresa não identificada"}
                  </span>

                  <span className="rounded-full bg-[#C8D463]/20 px-2.5 py-1 text-xs font-medium text-[#38444B]">
                    {statusLabel[chamadoAberto.status] ??
                      chamadoAberto.status}
                  </span>
                </div>

                <h2 className="text-lg font-medium">
                  {chamadoAberto.titulo}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setChamadoAberto(null)}
                className="
                  flex h-9 w-9 shrink-0 items-center
                  justify-center rounded-lg
                  hover:bg-surface-secondary
                "
                aria-label="Fechar chamado"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-text-secondary">
                    Categoria
                  </p>

                  <p className="mt-1 text-sm">
                    {categoriaLabel[chamadoAberto.categoria] ??
                      chamadoAberto.categoria}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-secondary">
                    Recebido em
                  </p>

                  <p className="mt-1 text-sm">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(
                      new Date(chamadoAberto.created_at)
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs text-text-secondary">
                  Mensagem do cliente
                </p>

                <div className="mt-2 rounded-xl bg-surface-secondary p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {chamadoAberto.mensagem}
                  </p>
                </div>
              </div>

              {chamadoAberto.anexos?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <Paperclip size={15} />

                    <p className="text-sm font-medium">
                      {chamadoAberto.anexos.length === 1
                        ? "Anexo"
                        : "Anexos"}
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {chamadoAberto.anexos.map((anexo) => (
                    <button
  key={anexo.id}
  type="button"
  onClick={() => void abrirAnexo(anexo.caminho_storage)}
  className="
    flex w-full items-center justify-between gap-3
    rounded-xl border border-border
    px-4 py-3 text-left
    transition
    hover:bg-surface-secondary
  "
>
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {anexo.nome_arquivo}
                          </p>

                          {anexo.tamanho_bytes && (
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {(
                                anexo.tamanho_bytes /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB
                            </p>
                          )}
                        </div>

                        <ExternalLink
                          size={16}
                          className="shrink-0 text-text-secondary"
                        />
                    </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}