import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { calcularBarrasPorCortes, criarCortesRepetidosPorBarra } from "./barras";

export type PerfilExtra = {
  perfilId: string;
  referencia: "altura" | "largura" | "manual";
  medidaManual: number;
  ajuste: number;
  quantidadePorVao: number;
};

export type MedidasPerfilExtra = { altura: number; largura: number; quantidade: number };

export function atualizarPerfilExtra(item: ProjetoIndividualMaterial, medidas: MedidasPerfilExtra): ProjetoIndividualMaterial {
  const extra = item.perfilExtra;
  if (!extra) return item;
  const base = extra.referencia === "manual" ? extra.medidaManual : Number(medidas[extra.referencia] || 0);
  const comprimento = Math.max(0, base + extra.ajuste);
  const quantidade = Math.max(0, Math.floor(extra.quantidadePorVao * Number(medidas.quantidade || 0)));
  const barra = item.comprimentoBarra || 6000;
  const cortes = criarCortesRepetidosPorBarra(comprimento, quantidade, barra);
  const qtd = calcularBarrasPorCortes(cortes, barra);
  if (qtd === item.qtd && JSON.stringify(cortes) === JSON.stringify(item.cortes)) return item;
  return { ...item, qtd, cortes };
}

export function atualizarPerfisExtras(lista: ProjetoIndividualMaterial[], medidas: MedidasPerfilExtra) {
  const proxima = lista.map(item => atualizarPerfilExtra(item, medidas));
  return proxima.every((item, index) => item === lista[index]) ? lista : proxima;
}

export const descricaoSemMarcadorExtra = (descricao: string) => descricao.replace(/\s*\[PERFIL EXTRA\]\s*$/i, "");
