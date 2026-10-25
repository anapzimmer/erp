"use client";
import { useState } from "react";
import { ArrowUpRight, Ruler } from "lucide-react";
import ConfiguracaoModal from "@/components/ConfiguracaoModal";
import { useRegraMedidaVidro } from "@/context/RegraMedidaVidroContext";
export default function ConfiguracaoMedidaVidro() {
  const { regra, salvar } = useRegraMedidaVidro();
  const [limite, setLimite] = useState(String(regra.limite_mm));
  const [percentual, setPercentual] = useState(String(regra.percentual));
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aberto, setAberto] = useState(false);
  return <>
    <button type="button" onClick={() => {
      setLimite(String(regra.limite_mm)); setPercentual(String(regra.percentual)); setMensagem(""); setAberto(true);
    }} className="rounded-2xl border border-border bg-surface p-6 text-left text-text-primary transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
      <Ruler size={24} className="mb-5 text-text-secondary"/>
      <span className="block text-base font-medium">Tamanho do vidro</span>
      <span className="mt-2 block text-sm text-text-secondary">Defina o acréscimo para peças acima do limite.</span>
      <span className="mt-5 flex items-center justify-between gap-3 text-xs text-text-secondary">{regra.percentual.toLocaleString("pt-BR")}% acima de {regra.limite_mm.toLocaleString("pt-BR")} mm<ArrowUpRight size={16}/></span>
    </button>
    <ConfiguracaoModal aberto={aberto} fechar={() => setAberto(false)} titulo="Tamanho do vidro" ocupado={ocupado}>
    <h3 className="text-sm font-medium">Acréscimo por medida</h3>
    <p className="mt-2 text-sm leading-6 text-text-secondary">Aplicado uma única vez ao preço do vidro quando a largura ou a altura da peça ultrapassa o limite informado.</p>
    <div className="my-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Limite (mm)<input disabled={ocupado} className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="number" min="1" value={limite} onChange={e => setLimite(e.target.value)}/></label>
      <label className="text-sm font-medium">Acréscimo (%)<input disabled={ocupado} className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="number" min="0" max="100" step="0.01" value={percentual} onChange={e => setPercentual(e.target.value)}/></label>
    </div>
    <p className="text-xs leading-5 text-text-secondary">As medidas de chapas são cadastradas separadamente em Vidros.</p>
    <p role="status" className="mt-3 text-sm">{mensagem}</p>
    <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
    <button type="button" disabled={ocupado} onClick={() => setAberto(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-secondary disabled:opacity-50">Fechar</button>
    <button disabled={ocupado} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50" onClick={async () => {
      setOcupado(true); setMensagem("");
      try { await salvar({ limite_mm: Number(limite), percentual: Number(percentual) }); setMensagem("Regra salva para a empresa."); }
      catch (e) { setMensagem(e instanceof Error ? e.message : "Não foi possível salvar."); }
      finally { setOcupado(false); }
    }}>{ocupado ? "Salvando…" : "Salvar regra"}</button>
    </div>
    </ConfiguracaoModal>
  </>;
}
