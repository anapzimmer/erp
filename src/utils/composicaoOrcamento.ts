import type { ProjetoIndividualMaterial as Material } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";

const chave = (m: Material) => `${m.unidade}:${m.descricao}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/g, " ").replace(/\b\d+\s*pecas?\b/g, " ").replace(/\s+/g, " ").trim();

/** Em ajustes dimensionais, a lista salva é a autoridade: não repor exclusões. */
export function reconciliarComposicao(anteriores: Material[], calculados: Material[]): Material[] {
  const usados = new Set<number>();
  return anteriores.map(anterior => {
    const indice = calculados.findIndex((novo, i) => !usados.has(i) && (
      novo.id === anterior.id || (anterior.origemCalculo && novo.origemCalculo === anterior.origemCalculo) || chave(novo) === chave(anterior)
    ));
    if (indice < 0) return anterior;
    usados.add(indice);
    const novo = calculados[indice];
    return { ...novo, id: anterior.id,
      valorUnitario: anterior.precoAjustado ? anterior.valorUnitario : novo.valorUnitario,
      precoAjustado: anterior.precoAjustado,
      qtd: anterior.quantidadeAjustada ? anterior.qtd : novo.qtd,
      quantidadeAjustada: anterior.quantidadeAjustada,
      ...(anterior.personalizadoCatalogo ? { descricao: anterior.descricao, unidade: anterior.unidade, codigoPerfil: anterior.codigoPerfil, valorUnitario: anterior.valorUnitario, personalizadoCatalogo: true } : {}),
    };
  });
}

export function ajustarMaterial<K extends keyof Material>(item: Material, campo: K, valor: Material[K]): Material {
  return { ...item, [campo]: valor,
    ...(campo === "valorUnitario" ? { precoAjustado: true } : {}),
    ...(campo === "qtd" ? { quantidadeAjustada: true } : {}),
    ...(["descricao", "unidade", "codigoPerfil"].includes(campo) ? { personalizadoCatalogo: true } : {}),
  };
}
