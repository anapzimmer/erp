// Transforma uma string "(L + 50) / 4" em um cálculo matemático real
export const processarFormula = (formula: string, L: number, A: number, folgas: number = 0) => {
  try {
    // Substitui as variáveis pelas medidas do vão
    let expressao = formula
      .replace(/L/gi, L.toString())
      .replace(/A/gi, A.toString())
      .replace(/FOLGAS/gi, folgas.toString());

    // Usa Function para processar a string como matemática (bem mais seguro que eval)
    return new Function(`return ${expressao}`)();
  } catch (error) {
    console.error("Erro na fórmula:", formula, error);
    return 0;
  }
};