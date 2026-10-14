import React from "react";
import { Svg, Path, Line, Text, Rect } from "@react-pdf/renderer";
import { geometriaLateral, type ForaEsquadroLateral } from "@/utils/foraEsquadroLateral";
import { DRAWING_COLORS } from "@/design/drawing";
export default function DesenhoForaEsquadroLateral({ dados, pdf = false, width = 190, height = 130, semCartao = false }: { dados: ForaEsquadroLateral; pdf?: boolean; width?: number; height?: number; semCartao?: boolean }) {
  const g = geometriaLateral(dados);
  const { ink, frame, edge, glass } = DRAWING_COLORS;
  if (pdf) return <Svg viewBox="0 0 920 520" width={width} height={height}><Rect width={920} height={520} rx={28} fill="#ffffff" /><Path d={g.path} fill={glass} stroke={frame} strokeWidth={2.4} /><Path d={g.path} fill="none" stroke={edge} strokeWidth={13} opacity={0.95} /><Path d={g.path} fill="none" stroke={frame} strokeWidth={1.4} opacity={0.78} />{g.cortes.map(x=><Line key={x} x1={x} x2={x} y1={90} y2={390} stroke={frame} strokeWidth={1.8} opacity={0.82} />)}{g.labels.map(l=><Text key={l.y} x={l.x} y={l.y} textAnchor="middle" style={{fontSize:20,fill:ink}}>{l.texto}</Text>)}</Svg>;
  const svg = (
    <svg viewBox="0 0 920 520" className={semCartao ? "h-full w-full" : "h-auto w-full"} role="img" aria-label="Fora de esquadro lateral com altura fixa">
      <rect width="920" height="520" rx="28" fill="#ffffff" />
      <path d={g.path} fill={glass} stroke={frame} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={g.path} fill="none" stroke={edge} strokeWidth={13} strokeLinejoin="round" opacity={0.95} />
      <path d={g.path} fill="none" stroke={frame} strokeWidth={1.4} strokeLinejoin="round" opacity={0.78} />
      {g.cortes.map(x=><line key={x} x1={x} x2={x} y1={90} y2={390} stroke={frame} strokeWidth={1.8} opacity={0.82} />)}
      {g.labels.map(l=><text key={l.y} x={l.x} y={l.y} textAnchor="middle" fill={ink} fontSize={20} fontFamily="Segoe UI, Arial">{l.texto}</text>)}
    </svg>
  );
  if (semCartao) return svg;
  return (
    <article className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Vista frontal</p>
        <h2 className="mt-1 text-lg font-medium text-text-primary">Desenho fora de esquadro</h2>
        <p className="text-xs text-text-secondary">Ilustrativo, sem escala. Confira as medidas indicadas.</p>
      </div>
      {svg}
    </article>
  );
}
