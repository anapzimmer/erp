import React from "react";
import { Circle, G, Line, Rect, Svg } from "@react-pdf/renderer";
import { desenhoSalvoPDF } from "./desenhoSalvoPDF";

type Props = {
  desenhoUrl?: string;
  larguraVaoMm: number;
  alturaVaoMm: number;
  divisoesPorVao: number;
  torresPorVidro: number;
  /** Se omitido, preserva o comportamento anterior: mostrar ferragens. */
  usarGrapas3019?: boolean;
  usarFixacao1305?: boolean;
  width?: number | string;
  height?: number;
};

export function DesenhoSacadaTorrePDF({
  desenhoUrl,
  larguraVaoMm,
  alturaVaoMm,
  divisoesPorVao,
  torresPorVidro,
  usarGrapas3019 = true,
  usarFixacao1305 = true,
  width = "100%",
  height = 185,
}: Props) {
  // O desenho salvo representa a escolha real do usuário e tem prioridade.
  const desenhoSalvo = desenhoSalvoPDF(desenhoUrl, width, height);
  if (desenhoSalvo) return desenhoSalvo;

  // Fallback técnico vetorial, sem moldura, trilhos ou códigos sobre os vidros.
  const divs = Math.max(1, Math.floor(divisoesPorVao || 1));
  const torres = Math.max(0, Math.floor(torresPorVidro || 0));
  const svgW = 440;
  const glassW = 382;
  const x0 = 29;
  const glassY = 14;
  const ratio = Math.max(0.32, Math.min(0.68, (alturaVaoMm || 1100) / Math.max(larguraVaoMm || 3000, 1)));
  const glassH = Math.round(glassW * ratio);
  const panelW = glassW / divs;
  const baseY = glassY + glassH + 11;
  const svgH = baseY + 25;
  const stroke = "#91A3AD";
  const metal = "#DCE3E6";
  const metalStroke = "#81939C";

  return (
    <Svg viewBox={`0 0 ${svgW} ${svgH}`} width={width} height={height} preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: divs }).map((_, i) => (
        <G key={`vidro-${i}`}>
          <Rect x={x0 + i * panelW + 0.5} y={glassY} width={panelW - 1} height={glassH} fill="#F7FBFD" stroke={stroke} strokeWidth={1} />
          <Line x1={x0 + i * panelW + panelW * 0.22} y1={glassY + glassH * 0.68} x2={x0 + i * panelW + panelW * 0.56} y2={glassY + glassH * 0.2} stroke="#FFFFFF" strokeWidth={2.5} />
        </G>
      ))}
      {usarGrapas3019 && [0, divs].map((i) => (
        <Rect key={`grapa-${i}`} x={x0 + i * panelW + (i === 0 ? 2 : -12)} y={glassY + 26} width={10} height={10} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
      ))}
      {usarFixacao1305 && Array.from({ length: Math.max(0, divs - 1) }).map((_, i) => {
        const x = x0 + (i + 1) * panelW;
        return (
          <G key={`uniao-${i}`}>
            <Circle cx={x - 10} cy={glassY + 31} r={2.8} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
            <Circle cx={x + 10} cy={glassY + 31} r={2.8} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
          </G>
        );
      })}
      {Array.from({ length: divs }).map((_, i) =>
        Array.from({ length: torres }).map((__, j) => {
          const x = x0 + i * panelW + panelW * (j + 1) / (torres + 1);
          const towerH = Math.min(48, glassH * 0.4);
          return (
            <G key={`torre-${i}-${j}`}>
              <Rect x={x - 6} y={baseY - towerH} width={12} height={towerH} rx={1.5} fill={metal} stroke={metalStroke} strokeWidth={0.9} />
              <Rect x={x - 9} y={baseY - 2} width={18} height={4} rx={1} fill={metal} stroke={metalStroke} strokeWidth={0.8} />
            </G>
          );
        })
      )}
    </Svg>
  );
}
