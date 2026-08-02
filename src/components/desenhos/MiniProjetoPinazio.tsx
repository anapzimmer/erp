"use client";

import React from "react";

export type CorPinazio = "branco" | "preto" | "nogal";

export interface MiniProjetoPinazioProps {
  largura: number;
  altura: number;
  divisoesLargura: number;
  divisoesAltura: number;
  cor?: CorPinazio;
  mostrarMedidas?: boolean;
  className?: string;
  tamanhoMaximo?: number;
}

export const obterCoresPinazio = (_cor: CorPinazio = "branco") => ({
  // O modelo escolhido continua salvo no orçamento, mas a miniatura
  // permanece neutra para não alterar visualmente a cor do Pinázio.
  preenchimento: "#D9E1E6",
  contorno: "#8A99A3",
});

export default function MiniProjetoPinazio({
  largura,
  altura,
  divisoesLargura,
  divisoesAltura,
  cor = "branco",
  mostrarMedidas = true,
  className = "",
  tamanhoMaximo = 280,
}: MiniProjetoPinazioProps) {
  const larguraReal = Math.max(1, Number(largura) || 1);
  const alturaReal = Math.max(1, Number(altura) || 1);
  const colunas = Math.max(1, Math.trunc(Number(divisoesLargura) || 1));
  const linhas = Math.max(1, Math.trunc(Number(divisoesAltura) || 1));
  const { preenchimento, contorno } = obterCoresPinazio(cor);

  const viewBoxLargura = 620;
  const viewBoxAltura = mostrarMedidas ? 430 : 350;
  const areaLargura = 500;
  const areaAltura = 280;
  const escala = Math.min(areaLargura / larguraReal, areaAltura / alturaReal);
  const desenhoLargura = Math.max(110, larguraReal * escala);
  const desenhoAltura = Math.max(90, alturaReal * escala);
  const x = (viewBoxLargura - desenhoLargura) / 2;
  const y = 35 + (areaAltura - desenhoAltura) / 2;

  const linhasVerticais = Array.from({ length: Math.max(0, colunas - 1) });
  const linhasHorizontais = Array.from({ length: Math.max(0, linhas - 1) });

  return (
    <svg
      role="img"
      aria-label={`Projeto de Pinázio ${larguraReal} por ${alturaReal} milímetros, ${colunas} por ${linhas} divisões`}
      viewBox={`0 0 ${viewBoxLargura} ${viewBoxAltura}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: "100%", maxWidth: tamanhoMaximo, height: "auto" }}
    >
      <defs>
        <linearGradient id="pinazio-vidro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8FCFD" />
          <stop offset="55%" stopColor="#DDEAF0" />
          <stop offset="100%" stopColor="#C8DCE5" />
        </linearGradient>
        <filter id="pinazio-sombra" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodOpacity="0.16" />
        </filter>
      </defs>

      <rect width="100%" height="100%" rx="18" fill="#FFFFFF" />

      <g filter="url(#pinazio-sombra)">
        <rect
          x={x}
          y={y}
          width={desenhoLargura}
          height={desenhoAltura}
          rx="5"
          fill="url(#pinazio-vidro)"
          stroke="#718596"
          strokeWidth="3"
        />

        <path
          d={`M ${x + desenhoLargura * 0.08} ${y + desenhoAltura * 0.18} L ${
            x + desenhoLargura * 0.38
          } ${y + desenhoAltura * 0.05}`}
          stroke="#FFFFFF"
          strokeWidth="10"
          opacity="0.48"
          strokeLinecap="round"
        />

        {linhasVerticais.map((_, index) => {
          const linhaX = x + (desenhoLargura / colunas) * (index + 1);
          return (
            <g key={`v-${index}`}>
              <line
                x1={linhaX}
                y1={y}
                x2={linhaX}
                y2={y + desenhoAltura}
                stroke={contorno}
                strokeWidth="4.5"
              />
              <line
                x1={linhaX}
                y1={y}
                x2={linhaX}
                y2={y + desenhoAltura}
                stroke={preenchimento}
                strokeWidth="2.2"
              />
            </g>
          );
        })}

        {linhasHorizontais.map((_, index) => {
          const linhaY = y + (desenhoAltura / linhas) * (index + 1);
          return (
            <g key={`h-${index}`}>
              <line
                x1={x}
                y1={linhaY}
                x2={x + desenhoLargura}
                y2={linhaY}
                stroke={contorno}
                strokeWidth="4.5"
              />
              <line
                x1={x}
                y1={linhaY}
                x2={x + desenhoLargura}
                y2={linhaY}
                stroke={preenchimento}
                strokeWidth="2.2"
              />
            </g>
          );
        })}
      </g>

      {mostrarMedidas && (
        <>
          <text
            x={viewBoxLargura / 2}
            y="365"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="20"
            fontWeight="700"
            fill="#334155"
          >
            {Math.round(larguraReal)} x {Math.round(alturaReal)} mm
          </text>
          <text
            x={viewBoxLargura / 2}
            y="397"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="15"
            fill="#64748B"
          >
            {colunas} x {linhas} divisões
          </text>
        </>
      )}
    </svg>
  );
}