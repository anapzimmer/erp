import React from "react";
import { G, Line, Rect, Svg } from "@react-pdf/renderer";
import type { CorPinazio } from "./MiniProjetoPinazio";

export interface MiniProjetoPinazioPDFProps {
  largura: number;
  altura: number;
  divisoesLargura: number;
  divisoesAltura: number;
  cor?: CorPinazio;
  width?: number;
  height?: number;
}

const cores = (_cor: CorPinazio = "branco") => ({
  // A cor comercial continua nos dados, porém o desenho técnico
  // é sempre representado com linhas neutras e discretas.
  preenchimento: "#D9E1E6",
  contorno: "#8A99A3",
});

export default function MiniProjetoPinazioPDF({
  largura,
  altura,
  divisoesLargura,
  divisoesAltura,
  cor = "branco",
  width = 62,
  height = 44,
}: MiniProjetoPinazioPDFProps) {
  const larguraReal = Math.max(1, Number(largura) || 1);
  const alturaReal = Math.max(1, Number(altura) || 1);
  const colunas = Math.max(1, Math.trunc(Number(divisoesLargura) || 1));
  const linhas = Math.max(1, Math.trunc(Number(divisoesAltura) || 1));
  const { preenchimento, contorno } = cores(cor);

  const viewWidth = 120;
  const viewHeight = 82;
  const areaWidth = 105;
  const areaHeight = 68;
  const escala = Math.min(areaWidth / larguraReal, areaHeight / alturaReal);
  const desenhoWidth = Math.max(25, larguraReal * escala);
  const desenhoHeight = Math.max(20, alturaReal * escala);
  const x = (viewWidth - desenhoWidth) / 2;
  const y = (viewHeight - desenhoHeight) / 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
      <Rect x="0" y="0" width={viewWidth} height={viewHeight} fill="#FFFFFF" />
      <Rect
        x={x}
        y={y}
        width={desenhoWidth}
        height={desenhoHeight}
        rx="2"
        fill="#E6F0F4"
        stroke="#718596"
        strokeWidth="1.8"
      />

      <Line
        x1={x + desenhoWidth * 0.1}
        y1={y + desenhoHeight * 0.17}
        x2={x + desenhoWidth * 0.38}
        y2={y + desenhoHeight * 0.06}
        stroke="#FFFFFF"
        strokeWidth="4"
        opacity="0.55"
      />

      <G>
        {Array.from({ length: Math.max(0, colunas - 1) }).map((_, index) => {
          const linhaX = x + (desenhoWidth / colunas) * (index + 1);
          return (
            <G key={`v-${index}`}>
              <Line
                x1={linhaX}
                y1={y}
                x2={linhaX}
                y2={y + desenhoHeight}
                stroke={contorno}
                strokeWidth="2.2"
              />
              <Line
                x1={linhaX}
                y1={y}
                x2={linhaX}
                y2={y + desenhoHeight}
                stroke={preenchimento}
                strokeWidth="1.1"
              />
            </G>
          );
        })}

        {Array.from({ length: Math.max(0, linhas - 1) }).map((_, index) => {
          const linhaY = y + (desenhoHeight / linhas) * (index + 1);
          return (
            <G key={`h-${index}`}>
              <Line
                x1={x}
                y1={linhaY}
                x2={x + desenhoWidth}
                y2={linhaY}
                stroke={contorno}
                strokeWidth="2.2"
              />
              <Line
                x1={x}
                y1={linhaY}
                x2={x + desenhoWidth}
                y2={linhaY}
                stroke={preenchimento}
                strokeWidth="1.1"
              />
            </G>
          );
        })}
      </G>
    </Svg>
  );
}