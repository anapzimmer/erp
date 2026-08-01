// app/utils/formula-parser.ts
// Transforma uma string "(L + 50) / 4" em um calculo matematico real.
// Mantem o calculo restrito a numeros, parenteses e operadores basicos.
export const processarFormula = (formula: string, variaveis: Record<string, number>) => {
  try {
    let expressao = formula;

    for (const [key, value] of Object.entries(variaveis)) {
      expressao = expressao.replace(new RegExp(`\\b${key}\\b`, "g"), String(value));
    }

    expressao = expressao.replace(/MU0T/g, "MULT").replace(/,/g, ".");

    if (!/^[\d+\-*/().\s]+$/.test(expressao)) {
      throw new Error("Formula contem caracteres nao permitidos.");
    }

    const tokens = expressao.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
    if (!tokens) return 0;

    let pos = 0;

    const parseExpression = (): number => {
      let valor = parseTerm();

      while (tokens[pos] === "+" || tokens[pos] === "-") {
        const operador = tokens[pos++];
        const proximo = parseTerm();
        valor = operador === "+" ? valor + proximo : valor - proximo;
      }

      return valor;
    };

    const parseTerm = (): number => {
      let valor = parseFactor();

      while (tokens[pos] === "*" || tokens[pos] === "/") {
        const operador = tokens[pos++];
        const proximo = parseFactor();
        valor = operador === "*" ? valor * proximo : valor / proximo;
      }

      return valor;
    };

    const parseFactor = (): number => {
      const token = tokens[pos++];

      if (token === "-") return -parseFactor();
      if (token === "+") return parseFactor();

      if (token === "(") {
        const valor = parseExpression();
        if (tokens[pos++] !== ")") {
          throw new Error("Formula com parenteses invalidos.");
        }
        return valor;
      }

      const numero = Number(token);
      if (!Number.isFinite(numero)) {
        throw new Error("Formula com numero invalido.");
      }

      return numero;
    };

    const resultado = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(resultado)) {
      throw new Error("Formula invalida.");
    }

    return resultado;
  } catch (error) {
    console.error("Erro na formula:", formula, error);
    return 0;
  }
};
