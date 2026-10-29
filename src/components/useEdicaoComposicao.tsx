"use client";
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ProjetoIndividualMaterial as Material } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { reconciliarComposicao } from "@/utils/composicaoOrcamento";
import ConfiguracaoModal from "./ConfiguracaoModal";

export function useEdicaoComposicao(editando: boolean, setMateriais: Dispatch<SetStateAction<Material[]>>) {
  const [estado, setEstado] = useState({ modo: "inicial", manual: false, versao: 0 });
  const [confirmando, setConfirmando] = useState(false);
  const pendente = useRef<null | (() => void)>(null);
  const protegida = editando || estado.manual;
  const protegerComposicao = () => setEstado(s => ({ ...s, modo: "inicial", manual: true }));
  const reiniciarComposicao = () => setEstado(s => ({ modo: "inicial", manual: false, versao: s.versao + 1 }));
  const editarCampoComposicao = (campo: string, aplicar: () => void) => {
    if (["cliente", "obra", "numero", "data", "observacao"].includes(campo)) { aplicar(); return; }
    const medidas = /^(largura|altura|quantidade)/i.test(campo);
    const executar = () => {
      setEstado(s => ({ ...s, modo: medidas ? "medidas" : "configuracao", versao: s.versao + 1 }));
      aplicar();
    };
    if (protegida && !medidas) { pendente.current = executar; setConfirmando(true); }
    else executar();
  };
  const recalcularMateriais = useCallback((acao: SetStateAction<Material[]>) => {
    if (protegida && estado.modo === "inicial") return;
    setMateriais(lista => {
      const nova = typeof acao === "function" ? acao(lista) : acao;
      return protegida && estado.modo === "medidas" ? reconciliarComposicao(lista, nova) : nova;
    });
  }, [protegida, estado.modo, estado.versao, setMateriais]);
  const fechar = () => { pendente.current = null; setConfirmando(false); };
  const confirmacaoComposicao = <ConfiguracaoModal aberto={confirmando} fechar={fechar} compacto titulo="Recalcular materiais?">
    <p className="text-sm text-text-secondary">Esta troca altera a configuração do projeto. Os materiais automáticos serão recalculados e itens removidos poderão voltar. Confira a relação e os valores antes de salvar.</p>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={fechar} className="rounded-lg border border-border px-3 py-2 text-sm">Manter como está</button><button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary" onClick={() => { const acao = pendente.current; fechar(); acao?.(); }}>Alterar e recalcular</button></div>
  </ConfiguracaoModal>;
  return { recalcularMateriais, editarCampoComposicao, protegerComposicao, reiniciarComposicao, confirmacaoComposicao };
}
