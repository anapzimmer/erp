"use client";
import { useState } from "react";
import DesenhoTemperaJanela4 from "./DesenhoTemperaJanela4";
import BotaoImprimirPDF from "./BotaoImprimirPDF";
import Janela4TemperaPDF, { type PropsTemperaJanela4, type DadosTemperaJanela4 } from "@/app/relatorios/projetoindividual/Janela4TemperaPDF";
import { pecasJanela4 } from "@/utils/desenhoTemperaJanela4";

type Props = PropsTemperaJanela4 & { onVoltar: () => void; onChange: (campo: keyof DadosTemperaJanela4, valor: string | number) => void; vidros: string[] };
export default function ModoTemperaJanela4({ dados, medidas, nomeEmpresa, onVoltar, onChange, vidros }: Props) {
  const [peca, setPeca] = useState(-1);
  const [detalhes, setDetalhes] = useState(true);
  const pecas = pecasJanela4(medidas, dados.quantidade);
  const valido = pecas.every(p => Number.isFinite(p.largura) && p.largura > 0 && Number.isFinite(p.altura) && p.altura > 0) && Number.isInteger(dados.quantidade) && dados.quantidade > 0 && !!dados.vidro.trim();
  const controle = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary";
  return <main className="min-h-screen bg-background p-4 text-text-primary sm:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Janela 4 folhas · desenho para têmpera</h1><button type="button" onClick={onVoltar} className="rounded-lg border border-border px-4 py-2">Voltar ao orçamento</button></div>
    <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"><input type="checkbox" checked onChange={onVoltar} />Somente desenho para têmpera</label>
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
      {([['cliente','Cliente'],['obra','Obra / identificação']] as const).map(([campo,label]) => <label key={campo}>{label}<input className={controle} value={dados[campo] || ""} onChange={e => onChange(campo,e.target.value)} /></label>)}
      {([['largura','Largura do vão (mm)'],['altura','Altura do vão (mm)'],['quantidade','Quantidade de janelas']] as const).map(([campo,label]) => <label key={campo}>{label}<input type="number" min="1" step={campo === "quantidade" ? 1 : "any"} className={controle} value={dados[campo] || ""} onChange={e => onChange(campo,Number(e.target.value))} /></label>)}
      <label>Vidro<select className={controle} value={dados.vidro} onChange={e => onChange("vidro",e.target.value)}><option value="">Selecione o vidro</option>{Array.from(new Set([dados.vidro,...vidros].filter(Boolean))).map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Trinco<select className={controle} value={dados.trinco || "Sem trinco"} onChange={e => onChange("trinco",e.target.value)}><option>Sem trinco</option><option>Com trinco</option></select></label>
      <label className="sm:col-span-2">Observações<textarea className={controle} value={dados.observacao || ""} onChange={e => onChange("observacao",e.target.value)} /></label>
    </div>
    <section className="rounded-xl border border-border bg-surface p-4">
      <label>Prévia<select className={controle} value={peca} onChange={e => setPeca(Number(e.target.value))}><option value={-1}>Conjunto e medidas das peças</option>{pecas.map((p,i) => <option key={p.id} value={i}>{p.id} · {p.nome}</option>)}</select></label>
      <div className="my-4 overflow-x-auto"><div className="min-w-[450px]"><DesenhoTemperaJanela4 comTrinco={dados.trinco === "Com trinco"} peca={pecas[peca]} /></div></div>
      <p className="mb-3 text-sm">Vista interna · Vão {dados.largura} × {dados.altura} mm · {dados.trinco || "Sem trinco"}</p>
      <div className="grid gap-2 sm:grid-cols-2">{(peca < 0 ? pecas : [pecas[peca]]).map(p => <div key={p.id} className="rounded-lg border border-border p-3 text-sm">{p.id} · {p.nome}: {p.largura} × {p.altura} mm · {p.quantidade} peça(s)</div>)}</div>
      <p className="mt-4 text-sm text-text-secondary">Roldanas: 2 furos Ø12 mm por folha móvel, com centro a 50 mm da lateral e 20 mm da borda superior, espelhados nos dois cantos. Fecho central: 2 furos Ø16 mm por folha móvel, a 21 mm da borda de encontro e 50 mm entre centros. Par centralizado na altura da peça. Não necessita refilar o perfil 1035. Trincos ainda aguardam gabarito.</p>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <label className="flex items-center gap-2"><input type="checkbox" checked={detalhes} onChange={e => setDetalhes(e.target.checked)} />Incluir uma folha por peça no PDF</label>
      {valido ? <BotaoImprimirPDF documento={<Janela4TemperaPDF dados={dados} medidas={medidas} nomeEmpresa={nomeEmpresa} detalhes={detalhes} />} arquivo={`janela4_tempera_${String(dados.numero || "novo").replace(/[^a-z0-9_-]/gi,"_")}.pdf`} rotulo="Gerar PDF para impressão" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary" /> : <p role="status" className="text-sm">Informe vidro, medidas válidas e uma quantidade inteira para gerar o PDF.</p>}
    </div>
  </div></main>;
}
