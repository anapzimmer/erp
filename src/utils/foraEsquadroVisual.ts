/** Desenho ilustrativo: evidencia a inclinação sem alterar medidas ou cálculo. */
export function topoForaEsquadro(inicial: number, final: number, base: number, altura: number) {
 const maior = Math.max(inicial, final, 1);
 const diferenca = Math.abs(inicial - final);
 const desvio = diferenca > 0 ? Math.max(altura * 0.12, diferenca / maior * altura) : 0;
 const topo = base - altura;
 return { yInicial: topo + (inicial < final ? desvio : 0), yFinal: topo + (final < inicial ? desvio : 0) };
}
