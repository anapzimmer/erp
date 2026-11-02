//src/utils/validarDocumentoFiscal.ts
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function documentoFiscalValido(valor: string): boolean {
  const numeros = somenteDigitos(valor);

  if (numeros.length !== 11 && numeros.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(numeros)) {
    return false;
  }

  function digitoVerificador(
    base: string,
    pesos: number[]
  ): number {
    const soma = [...base].reduce(
      (total, digito, indice) =>
        total + Number(digito) * pesos[indice],
      0
    );

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  if (numeros.length === 11) {
    const primeiro = digitoVerificador(
      numeros.slice(0, 9),
      [10, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    const segundo = digitoVerificador(
      numeros.slice(0, 9) + primeiro,
      [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return numeros.endsWith(`${primeiro}${segundo}`);
  }

  const primeiro = digitoVerificador(
    numeros.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  const segundo = digitoVerificador(
    numeros.slice(0, 12) + primeiro,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return numeros.endsWith(`${primeiro}${segundo}`);
}