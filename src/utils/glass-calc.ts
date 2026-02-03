// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  const limpo = value.toString().replace(',', '.');
  return parseFloat(limpo) || 0;
};

export const arred50 = (medida: number) => Math.ceil(medida / 50) * 50;

export const calcularProjeto = (config: any) => {
  const { modelo, folhas, largura, larguraB, altura, alturaB, precoM2, configMaoAmiga, tipoOrcamento, alturaPorta,precoVidroBandeira} = config;
  
  let areaTotalM2 = 0;
  let detalhePecas = "";
  
  const L = parseNumber(largura);
  const LB = parseNumber(larguraB); 
  const A = parseNumber(altura);
  const AB = parseNumber(alturaB); 
  const preco = parseNumber(precoM2);

  const folhasNorm = (folhas || "").toLowerCase().trim();
  const modeloNorm = (modelo || "").toLowerCase().trim();

  
  const LTOT = (modeloNorm.includes("canto")) ? L + LB : L;
  const alturaCorpo = (modeloNorm.includes("bandeira") || modeloNorm.includes("com bandeira")) ? (A - AB) : A;

  // --- 1. PORTA GIRO / BASCULANTE / MAX (1 FOLHA) ---
  if (folhasNorm === "1 folha" || modeloNorm.includes("giro") || modeloNorm.includes("basculante") || modeloNorm.includes("max")) {
    const divisor = (modeloNorm.includes("giro") && folhasNorm === "2 folhas") ? 2 : 1;
    const pecaL = LTOT / divisor;
    areaTotalM2 = ((arred50(pecaL) * arred50(alturaCorpo)) / 1000000) * divisor;
    detalhePecas = `${divisor} peça(s): ${arred50(pecaL)}x${arred50(alturaCorpo)}`;
  }

  // --- 2. BOX TRADICIONAL (Sua lógica exata) ---
  else if (modeloNorm.includes("box tradicional")) {
    if (folhasNorm === "2 folhas") {
      const baseL = LTOT / 2;
      const fixoL = baseL;
      const movelL = baseL + 50;
      areaTotalM2 = (arred50(fixoL) * arred50(alturaCorpo) + arred50(movelL) * arred50(alturaCorpo)) / 1000000;
      detalhePecas = `Fixo: ${arred50(fixoL)}x${arred50(alturaCorpo)} | Móvel: ${arred50(movelL)}x${arred50(alturaCorpo)}`;
    } 
    else if (folhasNorm === "3 folhas") {
      // 2 Fixos (333 -> 350) + 1 Móvel (383 -> 400)
      const baseL = LTOT / 3;
      const fixoL = baseL;
      const movelL = baseL + 50;
      areaTotalM2 = ((arred50(fixoL) * arred50(alturaCorpo) * 2) + (arred50(movelL) * arred50(alturaCorpo))) / 1000000;
      detalhePecas = `2 Fixos: ${arred50(fixoL)}x${arred50(alturaCorpo)} | 1 Móvel: ${arred50(movelL)}x${arred50(alturaCorpo)}`;
    }
    else if (folhasNorm === "4 folhas") {
      // 2 Fixos (250 -> 250) + 2 Móveis (300 -> 300)
      const baseL = LTOT / 4;
      const fixoL = baseL;
      const movelL = baseL + 50;
      areaTotalM2 = ((arred50(fixoL) * arred50(alturaCorpo) * 2) + (arred50(movelL) * arred50(alturaCorpo) * 2)) / 1000000;
      detalhePecas = `2 Fixos: ${arred50(fixoL)}x${arred50(alturaCorpo)} | 2 Móveis: ${arred50(movelL)}x${arred50(alturaCorpo)}`;
    }
  }

 // --- 3. JANELA PADRÃO (COM DESCONTOS DE ALTURA 60/20) ---
else if (modeloNorm.includes("janela") && !modeloNorm.includes("bandeira") && !modeloNorm.includes("canto")) {
  let fixas = 0, moveis = 0, numPecas = 0;

  if (folhasNorm.includes("2 folhas")) { numPecas = 2; fixas = 1; moveis = 1; }
  else if (folhasNorm.includes("4 folhas")) { numPecas = 4; fixas = 2; moveis = 2; }

  if (numPecas > 0) {
    const baseL = L / numPecas;
    
    // Descontos padrão informados por você
    const altFixa = alturaCorpo - 60;
    const altMovel = alturaCorpo - 20;

    const areaFixas = (arred50(baseL) * arred50(altFixa) / 1000000) * fixas;
    const areaMoveis = (arred50(baseL + 50) * arred50(altMovel) / 1000000) * moveis;

    areaTotalM2 = areaFixas + areaMoveis;
    detalhePecas = `${fixas} Fixas (${arred50(altFixa)}mm alt) | ${moveis} Móveis (${arred50(altMovel)}mm alt)`;
  }
}

// --- 4. SISTEMA MÃO AMIGA (PORTAS E JANELAS) ---
if (modeloNorm.includes("mão amiga") || modeloNorm.includes("deslizante")) {
  let numPecas = 0;
  let trespasse = 0;

  // 1. Identifica o número total de peças e o trespasse necessário
  if (configMaoAmiga === "Todas Correm") {
    numPecas = parseNumber(folhasNorm.replace(/\D/g, ""));
    
    // Regra: 2f=50, 3f=20, 4f=30, 5f=40, 6f=50
    if (numPecas === 2 || numPecas === 6) trespasse = 50;
    else if (numPecas === 3) trespasse = 20;
    else if (numPecas === 4) trespasse = 30;
    else if (numPecas === 5) trespasse = 40;
  } else {
    // Configuração Fixa + Móveis (Ex: 1 Fixa e 2 Móveis = 3 peças)
    const numeros = configMaoAmiga.match(/\d+/g);
    numPecas = numeros ? numeros.reduce((acc: number, curr: string) => acc + parseNumber(curr), 0) : 0;
    
    // Regra: 3p=20, 4p=30, 5p=40, 6p=50
    if (numPecas === 3) trespasse = 20;
    else if (numPecas === 4) trespasse = 30;
    else if (numPecas === 5) trespasse = 40;
    else if (numPecas === 6) trespasse = 50;
  }

  // 2. Executa o cálculo se houver peças identificadas
  if (numPecas > 0) {
    // (Vão + Trespasse) / número de peças
    const pecaL = (L + trespasse) / numPecas;
    const pecaA = alturaCorpo; 

    // M² = (Largura Arred. x Altura Arred.) * Qtd de Peças
    areaTotalM2 = (arred50(pecaL) * arred50(pecaA) / 1000000) * numPecas;
    
    detalhePecas = `${numPecas} Peças (Mão Amiga - Tresp. ${trespasse}mm): ${arred50(pecaL)}x${arred50(pecaA)}`;
  }
}

// --- 5. PORTAS PADRÃO (2, 4 e 6 FOLHAS) COM DESCONTO DE TRILHO ---
if (modeloNorm.includes("porta") && !modeloNorm.includes("mão amiga") && !modeloNorm.includes("giro")) {
  let numPecas = 0;
  let fixas = 0;
  let moveis = 0;

  // Define a composição com base nas folhas
  if (folhasNorm.includes("2 folhas")) { numPecas = 2; fixas = 1; moveis = 1; }
  else if (folhasNorm.includes("4 folhas")) { numPecas = 4; fixas = 2; moveis = 2; }
  else if (folhasNorm.includes("6 folhas")) { numPecas = 6; fixas = 4; moveis = 2; }

  if (numPecas > 0) {
    const baseL = L / numPecas;
    const pecaLFixa = baseL;
    const pecaLMovel = baseL + 50;

    // Lógica de Descontos de Altura por Trilho
    let descFixa = 0;
    let descMovel = 0;

    const trilho = (tipoOrcamento || "").toLowerCase();
    
    if (trilho.includes("embutido")) {
      descFixa = 40;
      descMovel = 0; // Medida do próprio vão
    } else { 
      // Aparente ou Interrompido
      descFixa = 60;
      descMovel = 25;
    }

    const pecaAFixa = alturaCorpo - descFixa;
    const pecaAMovel = alturaCorpo - descMovel;

    // Cálculo da área separada
    const areaFixas = (arred50(pecaLFixa) * arred50(pecaAFixa) / 1000000) * fixas;
    const areaMoveis = (arred50(pecaLMovel) * arred50(pecaAMovel) / 1000000) * moveis;

    areaTotalM2 = areaFixas + areaMoveis;
    detalhePecas = `${fixas} Fixas (${arred50(pecaAFixa)}mm alt) | ${moveis} Móveis (${arred50(pecaAMovel)}mm alt)`;
  }
}

// --- 6. FIXOS (DIVISÃO SIMPLES) ---
if (modeloNorm.includes("fixo")) {
  // Extrai apenas o número da string (ex: "3 folhas" -> 3)
  const numPecas = parseNumber(folhasNorm.replace(/\D/g, ""));

  if (numPecas > 0) {
    const pecaL = L / numPecas;
    const pecaA = alturaCorpo;

    // Cálculo: (Largura Arred. x Altura Arred.) * Total de Peças
    areaTotalM2 = (arred50(pecaL) * arred50(pecaA) / 1000000) * numPecas;
    
    detalhePecas = `${numPecas} Peça(s) Fixa(s): ${arred50(pecaL)}x${arred50(pecaA)}`;
  }
}

// --- 7. JANELAS DE CANTO ---
else if (modeloNorm.includes("canto")) {
  const LA = parseNumber(largura);  // Lado A
  const LB = parseNumber(larguraB); // Lado B
  const A = alturaCorpo;

  if (folhasNorm.includes("4 folhas")) {
    // Como se fossem 2 janelas de 2 folhas
    // Lado A (1 Fixo + 1 Móvel)
    const baseLA = LA / 2;
    const areaA = (arred50(baseLA) * arred50(A) + arred50(baseLA + 50) * arred50(A)) / 1000000;
    
    // Lado B (1 Fixo + 1 Móvel)
    const baseLB = LB / 2;
    const areaB = (arred50(baseLB) * arred50(A) + arred50(baseLB + 50) * arred50(A)) / 1000000;

    areaTotalM2 = areaA + areaB;
    detalhePecas = `Canto 4f: LadoA(2p) + LadoB(2p)`;
  } 
  else if (folhasNorm.includes("3 folhas")) {
    // Lado A: 1 folha fixa (Largura A * Altura - 60mm)
    const areaA = (arred50(LA) * arred50(A - 60)) / 1000000;

    // Lado B: Como janela 2 folhas (1 Fixo + 1 Móvel sobre a Largura B)
    const baseLB = LB / 2;
    const areaB = (arred50(baseLB) * arred50(A) + arred50(baseLB + 50) * arred50(A)) / 1000000;

    areaTotalM2 = areaA + areaB;
    detalhePecas = `Canto 3f: LadoA(1f fixa) + LadoB(2f padrão)`;
  }
}


// --- 8. LÓGICA PARA BANDEIRAS (JANELA OU PORTA) ---
if (modeloNorm.includes("bandeira")) {
  const altTotal = A;
  const altBand = AB; 
  const altCorpo = altTotal - altBand; 

  // Se a altura do corpo ou da bandeira for <= 0, algo está errado nos campos
  if (altCorpo <= 0 || altBand <= 0) {
    console.warn("⚠️ Alturas inválidas: Total", altTotal, "Bandeira", altBand);
  }

  let fixas = 1, moveis = 1, numPecas = 2;
  if (folhasNorm.includes("4 folhas")) { numPecas = 4; fixas = 2; moveis = 2; }
  if (folhasNorm.includes("6 folhas")) { numPecas = 6; fixas = 4; moveis = 2; }

  const baseL = L / numPecas;
  
  // Descontos padrão: 60mm na fixa e 25mm na móvel (ajuste conforme sua necessidade)
  const descF = 60;
  const descM = modeloNorm.includes("porta") ? 25 : 20;

  const areaF = (arred50(baseL) * arred50(altCorpo - descF) / 1000000) * fixas;
  const areaM = (arred50(baseL + 50) * arred50(altCorpo - descM) / 1000000) * moveis;
  const areaTotalCorpo = areaF + areaM;
  
  // Cálculo da Bandeira
  const areaBandeira = (arred50(L) * arred50(altBand)) / 1000000;

  // GARANTIA DE PREÇO: Se precoVidroBandeira for 0, usa o preco (180,00)
  const pCorpo = preco; 
  const pBand = parseNumber(config.precoVidroBandeira) > 0 
                ? parseNumber(config.precoVidroBandeira) 
                : preco;

  const valorTotal = (areaTotalCorpo * pCorpo) + (areaBandeira * pBand);

  return {
    area: Number((areaTotalCorpo + areaBandeira).toFixed(3)),
    valorVidro: Number(valorTotal.toFixed(2)),
    detalhe: `Corpo: ${areaTotalCorpo.toFixed(2)}m² (R$${pCorpo}) | Band: ${areaBandeira.toFixed(2)}m² (R$${pBand})`
  };
}

// Retorno padrão para modelos sem bandeira
return {
  area: Number(areaTotalM2.toFixed(3)),
  valorVidro: Number((areaTotalM2 * preco).toFixed(2)),
  detalhe: detalhePecas
};

};