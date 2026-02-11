// src/utils/glass-calc.ts

// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;

  // 1. Converte para string e remove o R$
  let limpo = value.toString().replace('R$', '').trim();

  // 2. Lógica para tratar o ponto como decimal e remover vírgulas de milhar (se houver)
  // Se o número vem como "36.75", ele deve virar 36.75
  // Se o número vem como "3.675,00", ele deve virar 3675.00
  
  if (limpo.includes(',') && limpo.includes('.')) {
    // Caso: 3.675,00 (ponto é milhar, vírgula é decimal)
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (limpo.includes(',')) {
    // Caso: 36,75 (vírgula é decimal)
    limpo = limpo.replace(',', '.');
  } else if (limpo.includes('.')) {
    // Caso: 36.75 (ponto é decimal)
    // Não faz nada, o parseFloat já entende ponto como decimal
  }

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

else if (modeloNorm.includes("mão amiga")) {
    const numPecas = parseNumber(folhasNorm.replace(/\D/g, "")) || 2;
    
    // 1. Lógica de Largura (Mantida da última atualização)
    let acrescimoL = 0;
    if (numPecas === 2) acrescimoL = 50;
    else if (numPecas === 3) acrescimoL = 20;
    else if (numPecas === 4) acrescimoL = 30;
    else if (numPecas === 5) acrescimoL = 40;
    else if (numPecas === 6) acrescimoL = 50;

    const larguraFolha = (L + acrescimoL) / numPecas;

    // 2. Lógica de Altura (NOVAS REGRAS)
    let areaCorpoLocal = 0;
    let descFixa = 0;
    let descMovel = 0;
    let fixas = 0;
    let moveis = 0;

    // Suposição: Se configMaoAmiga indicar "1 Fixa"
    if (configMaoAmiga && configMaoAmiga.includes("1 Fixa")) {
      // Regra: fixa 25mm, moveis 40mm
      descFixa = 25;
      descMovel = 40;
      fixas = 1;
      moveis = numPecas - 1;
    } else {
      // Regra padrão: Todas Correm -> desconta 40mm em todas
      descFixa = 40; // Neste caso todas são móveis
      descMovel = 40;
      fixas = 0;
      moveis = numPecas;
    }

    // 3. Cálculo da Área
    const areaFixas = fixas > 0 ? (arred50(larguraFolha) * arred50(alturaCorpo - descFixa) / 1000000) * fixas : 0;
    const areaMoveis = moveis > 0 ? (arred50(larguraFolha) * arred50(alturaCorpo - descMovel) / 1000000) * moveis : 0;
    
    areaTotalCorpo = areaFixas + areaMoveis;
    
    // 4. Detalhamento para produção
    if(fixas > 0) pecasProducao.push({ desc: "Vidro Fixo M.A.", medida: `${arred50(larguraFolha)} x ${arred50(alturaCorpo - descFixa)}`, qtd: fixas });
    if(moveis > 0) pecasProducao.push({ desc: "Vidro Móvel M.A.", medida: `${arred50(larguraFolha)} x ${arred50(alturaCorpo - descMovel)}`, qtd: moveis });
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