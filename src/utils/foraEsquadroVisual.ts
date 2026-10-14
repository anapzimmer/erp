/** Desenho ilustrativo: evidencia a inclinação sem alterar medidas ou cálculo. */
export function topoForaEsquadro(inicial: number, final: number, base: number, altura: number) {
 const maior = Math.max(inicial, final, 1);
 const diferenca = Math.abs(inicial - final);
 const desvio = diferenca > 0 ? Math.max(altura * 0.12, diferenca / maior * altura) : 0;
 const topo = base - altura;
 return { yInicial: topo + (inicial < final ? desvio : 0), yFinal: topo + (final < inicial ? desvio : 0) };
}

type DadosDesenhoForaEsquadro = {
 largura?: number; altura?: number; alturaInicial?: number; alturaFinal?: number;
 quantidade?: number; pecasDivisao?: number; medidasDetalhadas?: string;
 foraEsquadroPecas?: { alturaEsquerda: number; alturaDireita: number }[];
};

/** A quantidade repete o vão; não reduz suas divisões. Zero é uma altura válida. */
export function medidasDesenhoForaEsquadro(item: DadosDesenhoForaEsquadro) {
 const pecas = item.foraEsquadroPecas || [];
 const medidasTexto = Array.from(String(item.medidasDetalhadas || "").matchAll(/([\d.,]+)\s*mm\s*\/\s*([\d.,]+)\s*mm/gi));
 const numeroTexto = (valor?: string) => valor === undefined ? undefined : Number(valor.replace(/\./g, "").replace(",", "."));
 const valido = (...valores: (number | undefined)[]) => valores.find(v => v !== undefined && Number.isFinite(v) && v >= 0);
 const alturaInicial = valido(item.alturaInicial, pecas[0]?.alturaEsquerda, numeroTexto(medidasTexto[0]?.[1]), item.altura) ?? 0;
 const alturaFinal = valido(item.alturaFinal, pecas.at(-1)?.alturaDireita, numeroTexto(medidasTexto.at(-1)?.[2]), item.altura) ?? alturaInicial;
 const divisoes = Math.max(1, Math.min(12, Math.floor(pecas.length || item.pecasDivisao || medidasTexto.length || 1)));
 return { largura: Math.max(1, valido(item.largura) ?? 1), alturaInicial, alturaFinal, divisoes };
}
