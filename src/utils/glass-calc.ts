// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  const limpo = value.toString().replace(',', '.');
  return parseFloat(limpo) || 0;
};

export const arredondar5 = (medida: number) => Math.ceil(medida / 50) * 50;

// CERTIFIQUE-SE DE QUE O NOME ABAIXO É EXATAMENTE: calcularProjeto
export const calcularProjeto = (config: any) => {
  const { modelo, folhas, largura, larguraB, altura, alturaB, precoM2 } = config;
  
  let areaTotalM2 = 0;
  const L = parseNumber(largura);
  const LB = parseNumber(larguraB);
  const A = parseNumber(altura);
  const AB = parseNumber(alturaB);
  const preco = parseNumber(precoM2);

  const LTOT = modelo === "Janela Canto" ? L + LB : L;

  if (folhas === "2 folhas") {
    const fixo = (arredondar5(LTOT / 2) * arredondar5(A - 65)) / 1000000;
    const movel = (arredondar5(LTOT / 2 + 50) * arredondar5(A - 25)) / 1000000;
    areaTotalM2 = fixo + movel;
  } 
  else if (folhas === "4 folhas" || modelo === "Janela Canto") {
    const altVidro = modelo === "Janela Bandeira" ? (A - AB) : A;
    const fUnico = (arredondar5(LTOT / 4) * arredondar5(altVidro - 65)) / 1000000;
    const mUnico = (arredondar5(LTOT / 4 + 50) * arredondar5(altVidro - 25)) / 1000000;
    areaTotalM2 = (fUnico * 2) + (mUnico * 2);

    if (modelo === "Janela Bandeira" && AB > 0) {
      areaTotalM2 += ((arredondar5(L / 2) * arredondar5(AB)) / 1000000) * 2;
    }
  }

  return {
    area: areaTotalM2,
    valorVidro: areaTotalM2 * preco
  };
};