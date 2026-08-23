export type ModoCorteBarra = "dividir" | "complemento";

export const MODO_CORTE_BARRA_STORAGE_KEY = "glasscode:preferencias:modo-corte-barra";

export const obterModoCorteBarra = (modo?: ModoCorteBarra): ModoCorteBarra => {
  if (modo) return modo;

  if (typeof window === "undefined") return "dividir";

  const modoSalvo = window.localStorage.getItem(MODO_CORTE_BARRA_STORAGE_KEY);
  return modoSalvo === "complemento" ? "complemento" : "dividir";
};

export const dividirCortePorBarra = (
  comprimentoMm: number,
  comprimentoBarra = 6000,
  modo?: ModoCorteBarra
) => {
  const comprimento = Math.ceil(Number(comprimentoMm || 0));
  const barra = Math.max(1, Math.ceil(Number(comprimentoBarra || 6000)));

  if (comprimento <= 0) return [];
  if (comprimento <= barra) return [comprimento];

  if (obterModoCorteBarra(modo) === "complemento") {
    const barrasInteiras = Math.floor(comprimento / barra);
    const sobra = comprimento % barra;
    return [
      ...Array.from({ length: barrasInteiras }, () => barra),
      ...(sobra > 0 ? [sobra] : []),
    ];
  }

  const partes = Math.ceil(comprimento / barra);
  const corteParte = Math.ceil(comprimento / partes);

  return Array.from({ length: partes }, () => corteParte);
};

export const prepararCortesPorBarra = (
  cortesOriginais: number[],
  comprimentoBarra = 6000,
  modo?: ModoCorteBarra
) =>
  (cortesOriginais || [])
    .flatMap((corte) => dividirCortePorBarra(corte, comprimentoBarra, modo))
    .filter((corte) => corte > 0);

export const calcularBarrasPorCortes = (
  cortesOriginais: number[],
  comprimentoBarra = 6000,
  modo?: ModoCorteBarra
) => {
  const barra = Math.max(1, Math.ceil(Number(comprimentoBarra || 6000)));
  const barras: number[] = [];
  const cortes = prepararCortesPorBarra(cortesOriginais, barra, modo).sort((a, b) => b - a);

  cortes.forEach((corte) => {
    const indice = barras.findIndex((usado) => usado + corte <= barra);

    if (indice >= 0) {
      barras[indice] += corte;
    } else {
      barras.push(corte);
    }
  });

  return barras.length;
};

export const criarCortesRepetidosPorBarra = (
  comprimentoMm: number,
  quantidade: number,
  comprimentoBarra = 6000,
  modo?: ModoCorteBarra
) => prepararCortesPorBarra(
  Array.from({ length: Math.max(0, Math.floor(Number(quantidade || 0))) }, () => Number(comprimentoMm || 0)),
  comprimentoBarra,
  modo
);
