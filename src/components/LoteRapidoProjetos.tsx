"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";

export type LinhaLoteProjeto = {
  id: string;
  largura: number;
  altura: number;
  quantidade: number;
  observacao?: string;
};

type ItemCentralLote = {
  id: string;
  largura?: number;
  altura?: number;
  quantidade?: number;
  medidas?: string;
  valorTotal?: number;
  materiais?: Array<{ qtd?: number; valorUnitario?: number } & Record<string, unknown>>;
  loteId?: string;
  loteSeq?: number;
  loteTotal?: number;
  loteObservacao?: string;
};

type MensagemSistema = {
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  mensagem: string;
  aoFechar?: () => void;
};

type UseLoteRapidoProjetosParams<TDados extends Record<string, unknown>, TMaterial extends { qtd?: number; valorUnitario?: number } & Record<string, unknown>, TItem extends ItemCentralLote> = {
  centralLoteId?: string | null;
  centralItemId?: string | null;
  returnTo: string;
  dados: TDados;
  materiais: TMaterial[];
  setDados: Dispatch<SetStateAction<TDados>>;
  setMensagemSistema?: Dispatch<SetStateAction<MensagemSistema | null>>;
  montarItemCentral: (
    id?: string,
    dadosProjeto?: TDados,
    materiaisProjeto?: TMaterial[],
    lote?: { id: string; seq: number; total: number; observacao?: string }
  ) => TItem;
  centralStorageKey?: string;
  clienteStorageKey?: string;
  onNavigate: (destino: string) => void;
};

const CENTRAL_PADRAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_CLIENTE_PADRAO_KEY = "glasscode:central-impressao:cliente";

const criarId = (prefixo = "") =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefixo}${crypto.randomUUID()}`
    : `${prefixo}${Date.now()}-${Math.random()}`;

export function useLoteRapidoProjetos<
  TDados extends Record<string, unknown>,
  TMaterial extends { qtd?: number; valorUnitario?: number } & Record<string, unknown>,
  TItem extends ItemCentralLote,
>({
  centralLoteId,
  returnTo,
  dados,
  materiais,
  setDados,
  setMensagemSistema,
  montarItemCentral,
  centralStorageKey = CENTRAL_PADRAO_KEY,
  clienteStorageKey = CENTRAL_CLIENTE_PADRAO_KEY,
  onNavigate,
}: UseLoteRapidoProjetosParams<TDados, TMaterial, TItem>) {
  const [linhas, setLinhas] = useState<LinhaLoteProjeto[]>(() =>
    Array.from({ length: 3 }, () => ({
      id: criarId(),
      largura: 0,
      altura: 0,
      quantidade: 1,
      observacao: "",
    }))
  );
  const [aberto, setAberto] = useState(Boolean(centralLoteId));
  const dadosRef = useRef(dados);
  const materiaisRef = useRef(materiais);

  useEffect(() => {
    dadosRef.current = dados;
  }, [dados]);

  useEffect(() => {
    materiaisRef.current = materiais;
  }, [materiais]);

  useEffect(() => {
    if (!centralLoteId || typeof window === "undefined") return;

    try {
      const atual = window.localStorage.getItem(centralStorageKey);
      const lista = atual ? JSON.parse(atual) as TItem[] : [];
      const itensLote = lista
        .filter((item) => item.loteId === centralLoteId)
        .sort((a, b) => Number(a.loteSeq || 0) - Number(b.loteSeq || 0));

      if (!itensLote.length) return;

      const primeiro = itensLote[0];
      setDados((atualDados) => ({
        ...atualDados,
        ...(primeiro as Record<string, unknown>),
        largura: Number(primeiro.largura || 0),
        altura: Number(primeiro.altura || 0),
        quantidade: Number(primeiro.quantidade || 1),
      }));
      setLinhas(
        itensLote.map((item, index) => ({
          id: item.id || criarId(),
          largura: Number(item.largura || 0),
          altura: Number(item.altura || 0),
          quantidade: Number(item.quantidade || 1),
          observacao: item.loteObservacao || `Medida ${index + 1}`,
        }))
      );
      setAberto(true);
    } catch (erro) {
      console.warn("Não foi possível carregar o lote para edição:", erro);
    }
  }, [centralLoteId, centralStorageKey, setDados]);

  const atualizarLinha = useCallback(<K extends keyof LinhaLoteProjeto>(
    id: string,
    campo: K,
    valor: LinhaLoteProjeto[K]
  ) => {
    setLinhas((lista) => lista.map((linha) => linha.id === id ? { ...linha, [campo]: valor } : linha));
  }, []);

  const adicionarLinha = useCallback(() => {
    setLinhas((lista) => [
      ...lista,
      { id: criarId(), largura: 0, altura: 0, quantidade: 1, observacao: "" },
    ]);
  }, []);

  const removerLinha = useCallback((id: string) => {
    setLinhas((lista) => lista.filter((linha) => linha.id !== id));
  }, []);

  const aguardarRecalculo = async (linha: LinhaLoteProjeto) => {
    const limite = Date.now() + 2000;

    while (Date.now() < limite) {
      const dadosAtual = dadosRef.current as Record<string, unknown>;
      const larguraAtual = Number(dadosAtual.largura || 0);
      const alturaAtual = Number(dadosAtual.altura || 0);
      const quantidadeAtual = Number(dadosAtual.quantidade || 0);

      if (
        larguraAtual === Number(linha.largura || 0) &&
        alturaAtual === Number(linha.altura || 0) &&
        quantidadeAtual === Number(linha.quantidade || 0)
      ) {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          });
        });
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }
  };

  const enviar = useCallback(async () => {
    const linhasValidas = linhas.filter(
      (linha) => Number(linha.largura || 0) > 0 && Number(linha.altura || 0) > 0 && Number(linha.quantidade || 0) > 0
    );

    if (!linhasValidas.length) {
      setMensagemSistema?.({
        tipo: "aviso",
        titulo: "Lote sem medidas",
        mensagem: "Preencha ao menos uma linha com largura, altura e quantidade.",
      });
      return;
    }

    const loteId = centralLoteId || criarId("lote-");
    const itensLote: TItem[] = [];

    for (const [index, linha] of linhasValidas.entries()) {
      setDados((atualDados) => ({
        ...atualDados,
        largura: Number(linha.largura || 0),
        altura: Number(linha.altura || 0),
        quantidade: Number(linha.quantidade || 0),
        observacao: linha.observacao || atualDados.observacao,
      }));

      await aguardarRecalculo(linha);

      const dadosLinha = dadosRef.current;
      const materiaisLinha = materiaisRef.current.map((material) => ({ ...material })) as TMaterial[];
      const totalLinha = materiaisLinha.reduce(
        (soma, item) => soma + Number(item.qtd || 0) * Number(item.valorUnitario || 0),
        0
      );
      const itemBase = montarItemCentral(
        centralLoteId ? linha.id : undefined,
        dadosLinha as TDados,
        materiaisLinha,
        centralLoteId
          ? { id: loteId, seq: index + 1, total: linhasValidas.length, observacao: linha.observacao }
          : undefined
      );

      itensLote.push({
        ...itemBase,
        id: centralLoteId ? linha.id : itemBase.id,
        largura: Number(dadosLinha.largura || linha.largura || 0),
        altura: Number(dadosLinha.altura || linha.altura || 0),
        quantidade: Number(dadosLinha.quantidade || linha.quantidade || 0),
        medidas: `${Number(dadosLinha.largura || linha.largura || 0)} x ${Number(dadosLinha.altura || linha.altura || 0)} mm`,
        valorTotal: Number(totalLinha || 0),
        materiais: materiaisLinha,
        loteId,
        loteSeq: index + 1,
        loteTotal: linhasValidas.length,
        loteObservacao: linha.observacao,
      });
    }

    try {
      const atual = window.localStorage.getItem(centralStorageKey);
      const lista = atual ? JSON.parse(atual) as TItem[] : [];
      const semLoteAnterior = centralLoteId
        ? lista.filter((item) => item.loteId !== centralLoteId)
        : lista;

      window.localStorage.setItem(centralStorageKey, JSON.stringify([...semLoteAnterior, ...itensLote]));

      const cliente = String(dadosRef.current.cliente || "");
      if (cliente) {
        window.localStorage.setItem(clienteStorageKey, cliente);
      }
    } catch (erro) {
      console.warn("Não foi possível enviar o lote para a central de impressão:", erro);
    }

    onNavigate(centralLoteId ? returnTo : "/central-impressao");
  }, [
    centralLoteId,
    centralStorageKey,
    clienteStorageKey,
    linhas,
    montarItemCentral,
    onNavigate,
    returnTo,
    setDados,
    setMensagemSistema,
  ]);

  return {
    aberto,
    editando: Boolean(centralLoteId),
    linhas,
    alternar: () => setAberto((valor) => !valor),
    atualizarLinha,
    adicionarLinha,
    removerLinha,
    enviar,
  };
}

type LoteRapidoProjetosProps = {
  aberto: boolean;
  editando?: boolean;
  linhas: LinhaLoteProjeto[];
  titulo?: string;
  descricao?: string;
  onAlternar: () => void;
  onAdicionar: () => void;
  onRemover: (id: string) => void;
  onAtualizar: <K extends keyof LinhaLoteProjeto>(id: string, campo: K, valor: LinhaLoteProjeto[K]) => void;
  onEnviar: () => void;
};

const limitarNumero4Digitos = (valor: string) => Number(valor.replace(/\D/g, "").slice(0, 4) || 0);

export function LoteRapidoProjetos({
  aberto,
  editando,
  linhas,
  titulo = "Lote rápido",
  descricao = "Use as escolhas do projeto atual e informe apenas as medidas que mudam.",
  onAlternar,
  onAdicionar,
  onRemover,
  onAtualizar,
  onEnviar,
}: LoteRapidoProjetosProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-8 rounded-full bg-[#8ad846]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0f2742]">{titulo}</h2>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">{descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAlternar}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0f2742] shadow-sm hover:bg-slate-50"
          >
            {aberto ? "Fechar lote" : "Abrir lote"}
          </button>
          {aberto ? (
            <>
              <button
                type="button"
                onClick={onAdicionar}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0f2742] shadow-sm hover:bg-slate-50"
              >
                <Plus size={14} />
                Adicionar linha
              </button>
              <button
                type="button"
                onClick={onEnviar}
                className="inline-flex items-center gap-2 rounded-xl bg-[#07385a] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0a466f]"
              >
                <Send size={14} />
                Enviar lote PDF+
              </button>
            </>
          ) : null}
        </div>
      </div>

      {editando ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          Editando lote existente. Ao enviar, as linhas antigas deste lote serão substituídas.
        </div>
      ) : null}

      {aberto ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <div className="grid min-w-[720px] grid-cols-[120px_120px_110px_minmax(180px,1fr)_64px] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <div className="px-3 py-2">Largura</div>
            <div className="px-3 py-2">Altura</div>
            <div className="px-3 py-2">Qtd.</div>
            <div className="px-3 py-2">Observação</div>
            <div className="px-3 py-2 text-center">Ação</div>
          </div>
          {linhas.map((linha, index) => (
            <div
              key={linha.id}
              className="grid min-w-[720px] grid-cols-[120px_120px_110px_minmax(180px,1fr)_64px] items-center border-t border-slate-200 text-sm"
            >
              <div className="px-3 py-2">
                <input
                  value={linha.largura || ""}
                  onChange={(event) => onAtualizar(linha.id, "largura", limitarNumero4Digitos(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#07385a]/40 focus:ring-2 focus:ring-[#07385a]/10"
                  placeholder="mm"
                  inputMode="numeric"
                />
              </div>
              <div className="px-3 py-2">
                <input
                  value={linha.altura || ""}
                  onChange={(event) => onAtualizar(linha.id, "altura", limitarNumero4Digitos(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#07385a]/40 focus:ring-2 focus:ring-[#07385a]/10"
                  placeholder="mm"
                  inputMode="numeric"
                />
              </div>
              <div className="px-3 py-2">
                <input
                  value={linha.quantidade || ""}
                  onChange={(event) => onAtualizar(linha.id, "quantidade", limitarNumero4Digitos(event.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#07385a]/40 focus:ring-2 focus:ring-[#07385a]/10"
                  placeholder="Qtd."
                  inputMode="numeric"
                />
              </div>
              <div className="px-3 py-2">
                <input
                  value={linha.observacao || ""}
                  onChange={(event) => onAtualizar(linha.id, "observacao", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#07385a]/40 focus:ring-2 focus:ring-[#07385a]/10"
                  placeholder={`Medida ${index + 1}`}
                />
              </div>
              <div className="px-3 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onRemover(linha.id)}
                  className="rounded-lg border border-red-100 px-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                  aria-label="Remover linha do lote"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
