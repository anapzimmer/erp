import { normalizarPrecoCatalogo } from "./precos";
import { aplicarAcrescimoPorMedida, type RegraMedidaVidro } from "./regraMedidaVidro";
import { calcularBarrasPorCortes } from "./barras";
import type { PedidoItem } from "./pedidos";

export type TipoCatalogoPedido = "vidros" | "perfis" | "ferragens" | "kits";
export type MaterialPedido = {
  chapas?: { largura_mm: number; altura_mm: number }[] | null;
  id: string | number;
  nome: string;
  codigo?: string;
  cores?: string;
  espessura?: string | number;
  tipo?: string;
  preco?: number | string | null;
  preco_por_cor?: number | string | null;
};
export type PrecoPedido = {
  vidro_id: string | number;
  grupo_preco_id?: string | number | null;
  tabela_id?: string | number | null;
  preco: number | string;
};

export function nomeMaterialPedido(m: MaterialPedido, tipo: TipoCatalogoPedido) {
  return [
    m.codigo,
    m.nome,
    tipo === "vidros" && m.espessura ? `${String(m.espessura).replace(/\s*mm$/i, "")} mm` : null,
    tipo === "vidros" ? m.tipo : m.cores,
  ].filter(Boolean).join(" · ");
}

export function calcularItemCatalogo({ material, tipo, quantidade, largura = 0, altura = 0, comprimento = 0, grupo, precos, regra }: {
  material: MaterialPedido;
  tipo: TipoCatalogoPedido;
  quantidade: number;
  largura?: number;
  altura?: number;
  comprimento?: number;
  grupo?: string | number | null;
  precos: PrecoPedido[];
  regra: RegraMedidaVidro;
}): PedidoItem {
  if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > 10000) {
    throw new Error("Informe uma quantidade inteira entre 1 e 10.000.");
  }
  const especial = tipo === "vidros" && grupo != null
    ? precos.find(p => String(p.vidro_id) === String(material.id) && String(p.grupo_preco_id ?? p.tabela_id) === String(grupo))
    : undefined;
  const valor = especial?.preco ?? material.preco ?? material.preco_por_cor;
  if (valor == null || String(valor).trim() === "") {
    throw new Error("Este material não tem preço cadastrado.");
  }
  const precoBase = normalizarPrecoCatalogo(valor);
  if (precoBase < 0) throw new Error("O preço cadastrado é inválido.");
  const nome = nomeMaterialPedido(material, tipo);
  let preco = precoBase;
  let qtd = quantidade;
  let memoria = "Preço por unidade do cadastro";
  let unidade = "und";

  if (tipo === "vidros") {
    if (![largura, altura].every(v => Number.isInteger(v) && v > 0 && v <= 9999)) {
      throw new Error("Informe largura e altura válidas em mm.");
    }
    const lc = Math.ceil(largura / 50) * 50;
    const ac = Math.ceil(altura / 50) * 50;
    const m2 = aplicarAcrescimoPorMedida(precoBase, largura, altura, regra);
    preco = lc * ac / 1000000 * m2;
    memoria = `${lc} × ${ac} mm de cobrança · ${(lc * ac / 1000000).toLocaleString("pt-BR")} m²/peça · R$ ${m2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/m²${especial ? " · tabela do cliente" : " · tabela padrão"}${Math.max(largura, altura) > regra.limite_mm ? ` · acréscimo de ${regra.percentual}% incluído` : ""}`;
  } else if (tipo === "perfis") {
    unidade = "barra";
    if (!Number.isFinite(comprimento) || comprimento < 0 || comprimento > 6000) {
      throw new Error("O corte deve ter até 6.000 mm. Para emendas, utilize o cálculo de projetos.");
    }
    qtd = comprimento > 0
      ? calcularBarrasPorCortes(Array.from({ length: quantidade }, () => comprimento), 6000)
      : quantidade;
    memoria = comprimento > 0
      ? `${quantidade} cortes de ${comprimento} mm · ${qtd} barra(s) de 6.000 mm`
      : "Preço por barra de 6.000 mm do cadastro";
  }

  return {
    descricao: nome,
    quantidade: qtd,
    preco: Math.round((preco + Number.EPSILON) * 100) / 100,
    tipo: tipo === "vidros" ? "vidro" : "material",
    unidade,
    ...(tipo === "vidros" ? { largura, altura, vidro: nome } : {}),
    ...(tipo === "perfis" && comprimento > 0 ? { comprimentoCorte: comprimento, quantidadeCortes: quantidade } : {}),
    catalogo: {
      tipo,
      id: String(material.id),
      precoBase,
      ...(tipo === "vidros" ? { precoM2: aplicarAcrescimoPorMedida(precoBase, largura, altura, regra) } : {}),
      memoria,
      grupo: grupo == null ? null : String(grupo),
      regra: { ...regra },
    },
  };
}
