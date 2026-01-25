// src/utils/glass-calc.ts

export const parseNumber = (value: any): number => {
  if (!value) return 0;
  const limpo = value.toString().replace(',', '.');
  return parseFloat(limpo) || 0;
};

// Arredondamento de 50 em 50mm (Padrão de vidraçaria)
export const arred50 = (medida: number) => Math.ceil(medida / 50) * 50;

export const calcularProjeto = (config: any) => {
  const { modelo, folhas, largura, larguraB, altura, alturaB, precoM2 } = config;
  
  let areaTotalM2 = 0;
  let detalhePecas = "";
  
  const L = parseNumber(largura);
  const LB = parseNumber(larguraB); // Para Janela Canto
  const A = parseNumber(altura);
  const AB = parseNumber(alturaB); // Altura da Bandeira
  const preco = parseNumber(precoM2);

  // Define a largura total baseada no modelo
  const LTOT = (modelo === "Janela Canto" || modelo === "Box Canto") ? L + LB : L;
  
  // Define a altura do corpo (se tiver bandeira, desconta a altura dela)
  const alturaCorpo = (modelo === "Janela Bandeira" || modelo === "Porta com Bandeira") ? (A - AB) : A;

  // --- LÓGICA: 2 FOLHAS (1 FIXO + 1 MÓVEL) ---
  if (folhas === "2 folhas") {
    const fixoL = LTOT / 2;
    const fixoA = alturaCorpo - 60; // Seu desconto de 60mm
    const areaFixa = (arred50(fixoL) * arred50(fixoA)) / 1000000;

    const movelL = (LTOT / 2) + 50; // Largura da fixa + transpasse 50mm
    const movelA = alturaCorpo - 20; // Seu desconto de 20mm
    const areaMovel = (arred50(movelL) * arred50(movelA)) / 1000000;

    areaTotalM2 = areaFixa + areaMovel;
    detalhePecas = `Fixo: ${arred50(fixoL)}x${arred50(fixoA)} | Móvel: ${arred50(movelL)}x${arred50(movelA)}`;
  } 

  // --- LÓGICA: 4 FOLHAS (2 FIXAS + 2 MÓVEIS) OU CANTO ---
  else if (folhas === "4 folhas" || modelo === "Janela Canto") {
    const baseL = LTOT / 4;
    
    const fixoL = baseL;
    const fixoA = alturaCorpo - 60;
    const areaFixas = ((arred50(fixoL) * arred50(fixoA)) / 1000000) * 2;

    const movelL = baseL + 50;
    const movelA = alturaCorpo - 20;
    const areaMoveis = ((arred50(movelL) * arred50(movelA)) / 1000000) * 2;

    areaTotalM2 = areaFixas + areaMoveis;
    detalhePecas = `2 Fixos: ${arred50(fixoL)}x${arred50(fixoA)} | 2 Móveis: ${arred50(movelL)}x${arred50(movelA)}`;
  }

  // --- ACRÉSCIMO DA BANDEIRA (SE EXISTIR) ---
  if ((modelo === "Janela Bandeira" || modelo === "Porta com Bandeira") && AB > 0) {
    // Geralmente bandeira é dividida em 2 peças fixas
    const bandL = L / 2;
    const areaBandeira = ((arred50(bandL) * arred50(AB)) / 1000000) * 2;
    areaTotalM2 += areaBandeira;
    detalhePecas += ` | Bandeiras: 2pcs ${arred50(bandL)}x${arred50(AB)}`;
  }

  return {
    area: areaTotalM2,
    valorVidro: areaTotalM2 * preco,
    detalhe: detalhePecas
  };
};