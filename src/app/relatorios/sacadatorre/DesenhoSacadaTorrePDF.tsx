import React from "react";
import { G, Line, Rect, Svg, Text } from "@react-pdf/renderer";
import { PDF_COLORS } from "../shared/pdfLayout";
import { desenhoSalvoPDF } from "./desenhoSalvoPDF";
export function DesenhoSacadaTorrePDF({ desenhoUrl, larguraVaoMm, alturaVaoMm, divisoesPorVao, torresPorVidro, width = "100%", height = 210 }: {
 desenhoUrl?: string;
 larguraVaoMm: number; alturaVaoMm: number; divisoesPorVao: number; torresPorVidro: number; width?: number | string; height?: number;
}) {
 const desenhoSalvo = desenhoSalvoPDF(desenhoUrl, width, height);
 if (desenhoSalvo) return desenhoSalvo;
 // Impressão neutra: a cor comercial continua nos dados do orçamento.
 const perfilCor = { fill: "#e5e7e9", stroke: "#9ca3a9" };
  const svgW = 430;
  const pad = 16;
  const drawW = svgW - pad * 2;
  const ratio = Math.min(Math.max((alturaVaoMm || 1000) / (larguraVaoMm || 2000), 0.35), 0.78);
  const drawH = Math.round(drawW * ratio);
  const svgH = drawH + pad * 2;
  const x0 = pad;
  const y0 = pad;
  const rail = 8;
  const side = 6;
  const divs = Math.max(Math.floor(divisoesPorVao || 1), 1);
  const torres = Math.max(Math.floor(torresPorVidro || 0), 0);
  const panelW = (drawW - side * 2) / divs;
  const glassY = y0 + rail;
  const glassH = drawH - rail * 2;
  const towerH = Math.min(62, Math.max(34, glassH * 0.32));
  const towerW = 12;

 return (
            <Svg viewBox={`0 0 ${svgW} ${svgH}`} width={width} height={height} preserveAspectRatio="xMidYMid meet">
              <Rect x={x0} y={y0} width={drawW} height={drawH} fill={"#ffffff"} stroke={PDF_COLORS.softMuted} strokeWidth={0.8} />

              {Array.from({ length: divs }).map((_, index) => {
                const x = x0 + side + panelW * index;
                return (
                  <G key={`vidro-${index}`}>
                    <Rect x={x} y={glassY} width={panelW} height={glassH} fill={"#ffffff"} stroke={PDF_COLORS.softMuted} strokeWidth={0.5} />
                    <Line x1={x + panelW * 0.14} y1={glassY + glassH * 0.9} x2={x + panelW * 0.72} y2={glassY + glassH * 0.1} stroke={PDF_COLORS.white} strokeWidth={3} />
                    <Line x1={x + panelW * 0.34} y1={glassY + glassH * 0.86} x2={x + panelW * 0.92} y2={glassY + glassH * 0.15} stroke={PDF_COLORS.white} strokeWidth={1.6} />
                  </G>
                );
              })}

              <Rect x={x0} y={y0} width={drawW} height={rail} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0} y={y0 + drawH - rail} width={drawW} height={rail} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0} y={y0} width={side} height={drawH} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />
              <Rect x={x0 + drawW - side} y={y0} width={side} height={drawH} fill={perfilCor.fill} stroke={perfilCor.stroke} strokeWidth={0.8} />

              {Array.from({ length: Math.max(divs - 1, 0) }).map((_, index) => {
                const x = x0 + side + panelW * (index + 1);
                return <Line key={`div-${index}`} x1={x} y1={y0 + rail} x2={x} y2={y0 + drawH - rail} stroke={PDF_COLORS.softMuted} strokeWidth={0.8} />;
              })}

              {Array.from({ length: divs + 1 }).map((_, index) => {
                const ehPonta = index === 0 || index === divs;
                const codigo = ehPonta ? "3019" : "1305";
                const x = index === 0 ? x0 + 5 : index === divs ? x0 + drawW - 17 : x0 + side + panelW * index - 11;
                const y = glassY + 20;
                const w = ehPonta ? 12 : 22;
                return (
                  <G key={`grapa-${index}`}>
                    <Rect x={x} y={y} width={w} height={18} fill={"#ffffff"} stroke={PDF_COLORS.muted} strokeWidth={0.7} />
                    <Text x={x + w + 4} y={y + 12} style={{ fontSize: 5.8, fill: PDF_COLORS.ink }}>{codigo}</Text>
                  </G>
                );
              })}

              {Array.from({ length: divs }).map((_, painel) => {
                const baseX = x0 + side + panelW * painel;
                return (
                  <G key={`torres-painel-${painel}`}>
                    {Array.from({ length: torres }).map((__, torreIndex) => {
                      const pos = torres === 1 ? 0.5 : (torreIndex + 1) / (torres + 1);
                      const x = baseX + panelW * pos - towerW / 2;
                      const y = y0 + drawH - rail - towerH + 8;
                      return (
                        <G key={`torre-${painel}-${torreIndex}`}>
                          <Rect x={x} y={y} width={towerW} height={towerH} fill={"#ffffff"} stroke={PDF_COLORS.muted} strokeWidth={0.8} />
                          <Line x1={x + 2} y1={y + 3} x2={x + 2} y2={y + towerH - 3} stroke={PDF_COLORS.white} strokeWidth={0.8} />
                        </G>
                      );
                    })}
                  </G>
                );
              })}

            </Svg>
 );
}
