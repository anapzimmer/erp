// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const limpo = value.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(limpo) || 0;
};

export const arred50 = (medida: number) => Math.ceil(medida / 50) * 50;

export const calcularProjeto = (config: any) => {
  const { 
    modelo, folhas, largura, larguraB, altura, alturaB, 
    precoM2, configMaoAmiga, tipoOrcamento, precoVidroBandeira 
  } = config;
  
  let areaTotalCorpo = 0;
  let detalhePecas = "";
  let pecasProducao: { desc: string; medida: string; qtd: number }[] = [];
  
  const L = parseNumber(largura);
  const LB = parseNumber(larguraB); 
  const A_TOTAL = parseNumber(altura);    
  const A_PORTA = parseNumber(alturaB);   
  const preco = parseNumber(precoM2);

  const folhasNorm = (folhas || "").toLowerCase().trim();
  const modeloNorm = (modelo || "").toLowerCase().trim();

  let alturaCorpo = A_TOTAL;
  let AB = 0;

  if (modeloNorm.includes("bandeira")) {
    alturaCorpo = A_PORTA;
    AB = A_TOTAL - A_PORTA;
    if (AB < 0) AB = 0;
  }

  // --- 1. PROJETOS DE 1 FOLHA OU SIMPLES ---
  if (folhasNorm === "1 folha" || modeloNorm.includes("giro") || modeloNorm.includes("basculante") || modeloNorm.includes("max") || (modeloNorm.includes("fixo") && !modeloNorm.includes("box"))) {
    const numPecas = parseNumber(folhasNorm.replace(/\D/g, "")) || 1;
    const pecaL = L / numPecas;
    areaTotalCorpo = (arred50(pecaL) * arred50(alturaCorpo) / 1000000) * numPecas;
    detalhePecas = `${numPecas} peça(s): ${arred50(pecaL)}x${arred50(alturaCorpo)}`;
    
    pecasProducao.push({ desc: "Vidro", medida: `${arred50(pecaL)} x ${arred50(alturaCorpo)}`, qtd: numPecas });
  }

  // --- 2. BOX TRADICIONAL ---
  else if (modeloNorm.includes("box tradicional")) {
    const numPecas = parseNumber(folhasNorm.replace(/\D/g, "")) || 2;
    const baseL = L / numPecas;
    const moveis = numPecas === 4 ? 2 : 1;
    const fixas = numPecas - moveis;
    
    areaTotalCorpo = ((arred50(baseL) * arred50(alturaCorpo) * fixas) + (arred50(baseL + 50) * arred50(alturaCorpo) * moveis)) / 1000000;
    
    pecasProducao.push({ desc: "Vidro Fixo", medida: `${arred50(baseL)} x ${arred50(alturaCorpo)}`, qtd: fixas });
    pecasProducao.push({ desc: "Vidro Móvel", medida: `${arred50(baseL + 50)} x ${arred50(alturaCorpo)}`, qtd: moveis });
  }

  // --- 3. JANELAS ---
  else if (modeloNorm.includes("janela") && !modeloNorm.includes("mão amiga")) {
    const numPecas = parseNumber(folhasNorm.replace(/\D/g, "")) || 2;
    const baseL = L / numPecas;
    const moveis = numPecas / 2;
    const fixas = numPecas / 2;

    areaTotalCorpo = ((arred50(baseL) * arred50(alturaCorpo - 60) * fixas) + (arred50(baseL + 50) * arred50(alturaCorpo - 20) * moveis)) / 1000000;
    
    pecasProducao.push({ desc: "Vidro Fixo", medida: `${arred50(baseL)} x ${arred50(alturaCorpo - 60)}`, qtd: fixas });
    pecasProducao.push({ desc: "Vidro Móvel", medida: `${arred50(baseL + 50)} x ${arred50(alturaCorpo - 20)}`, qtd: moveis });
  }

  // --- 4. PORTAS PADRÃO ---
  else if (modeloNorm.includes("porta") && !modeloNorm.includes("mão amiga") && !modeloNorm.includes("giro")) {
    const numPecas = parseNumber(folhasNorm.replace(/\D/g, "")) || 2;
    const moveis = numPecas === 6 ? 2 : numPecas / 2;
    const fixas = numPecas - moveis;
    const baseL = L / numPecas;

    const trilho = (tipoOrcamento || "").toLowerCase();
    const descFixa = trilho.includes("embutido") ? 40 : 60;
    const descMovel = trilho.includes("embutido") ? 0 : 25;

    areaTotalCorpo = ((arred50(baseL) * arred50(alturaCorpo - descFixa) * fixas) + (arred50(baseL + 50) * arred50(alturaCorpo - descMovel) * moveis)) / 1000000;
    
    pecasProducao.push({ desc: "Vidro Fixo", medida: `${arred50(baseL)} x ${arred50(alturaCorpo - descFixa)}`, qtd: fixas });
    pecasProducao.push({ desc: "Vidro Móvel", medida: `${arred50(baseL + 50)} x ${arred50(alturaCorpo - descMovel)}`, qtd: moveis });
  }

  // --- CÁLCULO BANDEIRA ---
  let areaBandeira = 0;
  if (modeloNorm.includes("bandeira") && AB > 0) {
    const numPecasBand = parseNumber(folhasNorm.replace(/\D/g, "")) || 2;
    const pecaLBand = L / numPecasBand;
    areaBandeira = (arred50(pecaLBand) * arred50(AB) / 1000000) * numPecasBand;
    
    pecasProducao.push({ desc: "Vidro Bandeira", medida: `${arred50(pecaLBand)} x ${arred50(AB)}`, qtd: numPecasBand });
  }

  const pBand = parseNumber(precoVidroBandeira) > 0 ? parseNumber(precoVidroBandeira) : preco;
  const valorTotal = (areaTotalCorpo * preco) + (areaBandeira * pBand);

  return {
    area: Number((areaTotalCorpo + areaBandeira).toFixed(3)),
    valorVidro: Number(valorTotal.toFixed(2)),
    detalhe: detalhePecas,
    pecasProducao // AGORA VAI SEM ERRO!
  };
};