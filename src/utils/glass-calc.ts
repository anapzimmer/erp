// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  let limpo = value.toString().replace('R$', '').trim();
  if (limpo.includes(',') && limpo.includes('.')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (limpo.includes(',')) {
    limpo = limpo.replace(',', '.');
  }
  return parseFloat(limpo) || 0;
};

// Regra: Arredonda para cima a cada 50mm (Ex: 1010 -> 1050)
export const arred50 = (medida: number) => Math.ceil(medida / 50) * 50;

// Regra: Área mínima de cobrança por peça (0.25 m²)
const calcularAreaPeca = (largura: number, altura: number): number => {
  const areaReal = (arred50(largura) * arred50(altura)) / 1000000;
  return Math.max(areaReal, 0.25); 
};

export const calcularProjeto = (config: any) => {
  const { 
    modelo, folhas, largura, altura, alturaB, 
    precoM2, configMaoAmiga, precoVidroBandeira 
  } = config;

  const L = parseNumber(largura);
  const A_TOTAL = parseNumber(altura);
  const A_PORTA = parseNumber(alturaB);
  const precoCorpo = parseNumber(precoM2);
  const pBand = parseNumber(precoVidroBandeira) || precoCorpo;

  const modeloNorm = (modelo || "").toLowerCase().trim();
  const numFolhas = parseNumber(folhas?.replace(/\D/g, "")) || 1;

  let areaTotalCorpo = 0;
  let areaTotalBandeira = 0;
  let pecasProducao: { desc: string; medida: string; qtd: number; areaCobranca: number }[] = [];

  let alturaCorpo = modeloNorm.includes("bandeira") ? A_PORTA : A_TOTAL;
  let alturaBandeira = modeloNorm.includes("bandeira") ? (A_TOTAL - A_PORTA) : 0;

  // --- LÓGICA DE DIMENSIONAMENTO POR MODELO ---
  
  // 1. MÃO AMIGA (Lógica complexa de transpasse)
  if (modeloNorm.includes("mão amiga")) {
    let acrescimoL = 0;
    if (numFolhas === 2) acrescimoL = 50;
    else if (numFolhas === 3) acrescimoL = 100; // 2 transpasses
    else if (numFolhas >= 4) acrescimoL = 150; 

    const larguraFolha = (L + acrescimoL) / numFolhas;
    const isFixa = configMaoAmiga?.includes("1 Fixa");
    
    const descFixa = isFixa ? 25 : 40;
    const descMovel = 40;

    for (let i = 0; i < numFolhas; i++) {
      const isEstaPecaFixa = isFixa && i === 0;
      const hFinal = alturaCorpo - (isEstaPecaFixa ? descFixa : descMovel);
      const areaPeca = calcularAreaPeca(larguraFolha, hFinal);
      
      areaTotalCorpo += areaPeca;
      pecasProducao.push({
        desc: isEstaPecaFixa ? "Vidro Fixo M.A." : "Vidro Móvel M.A.",
        medida: `${arred50(larguraFolha)} x ${arred50(hFinal)}`,
        qtd: 1,
        areaCobranca: areaPeca
      });
    }
  }

  // 2. BOX / JANELAS / PORTAS PADRÃO
  else {
    const baseL = L / numFolhas;
    const isBox = modeloNorm.includes("box");
    const isJanela = modeloNorm.includes("janela");

    for (let i = 0; i < numFolhas; i++) {
      let lPeca = baseL;
      let hPeca = alturaCorpo;
      let tipo = "Vidro";

      if (isBox) {
        // No box, móvel tem +50mm de transpasse
        const isMovel = numFolhas === 4 ? (i === 1 || i === 2) : (i === numFolhas - 1);
        if (isMovel) lPeca += 50;
        tipo = isMovel ? "Móvel" : "Fixo";
      } else if (isJanela) {
        const isMovel = i % 2 !== 0;
        lPeca = isMovel ? baseL + 50 : baseL;
        hPeca = isMovel ? alturaCorpo - 20 : alturaCorpo - 60;
        tipo = isMovel ? "Móvel" : "Fixo";
      }

      const areaPeca = calcularAreaPeca(lPeca, hPeca);
      areaTotalCorpo += areaPeca;
      pecasProducao.push({
        desc: `Vidro ${tipo}`,
        medida: `${arred50(lPeca)} x ${arred50(hPeca)}`,
        qtd: 1,
        areaCobranca: areaPeca
      });
    }
  }

  // 3. CÁLCULO DA BANDEIRA (Se existir)
  if (alturaBandeira > 0) {
    const larguraBandeira = L / numFolhas;
    for (let i = 0; i < numFolhas; i++) {
      const areaP = calcularAreaPeca(larguraBandeira, alturaBandeira);
      areaTotalBandeira += areaP;
      pecasProducao.push({
        desc: "Vidro Bandeira",
        medida: `${arred50(larguraBandeira)} x ${arred50(alturaBandeira)}`,
        qtd: 1,
        areaCobranca: areaP
      });
    }
  }

  const valorTotal = (areaTotalCorpo * precoCorpo) + (areaTotalBandeira * pBand);

  return {
    areaTotal: Number((areaTotalCorpo + areaTotalBandeira).toFixed(3)),
    valorTotal: Number(valorTotal.toFixed(2)),
    pecasProducao
  };
};