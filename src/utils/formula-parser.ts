//app/utils/formula-parser.ts
// Transforma uma string "(L + 50) / 4" em um cálculo matemático real
export const processarFormula = (formula: string, variaveis: Record<string, number>) => {
  try {
    let expressao = formula;
    for (const [key, value] of Object.entries(variaveis)) {
      expressao = expressao.replace(new RegExp(`\\b${key}\\b`, "g"), String(value));
    }
    // Corrige substituição errada de MULT para MU0T
    expressao = expressao.replace(/MU0T/g, "MULT");
    return new Function(`return ${expressao}`)();
  } catch (error) {
    console.error("Erro na fórmula:", formula, error);
    return 0;
  }
};