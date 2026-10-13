export type MedidasJanela4 = {
  larguraFixaMedida: number; alturaFixaMedida: number;
  larguraMovelMedida: number; alturaMovelMedida: number;
};
export function pecasJanela4(m: MedidasJanela4, quantidade: number) {
  return [
    { id: "P1", nome: "Fixo esquerdo", movel: false, direita: false },
    { id: "P2", nome: "Móvel esquerdo", movel: true, direita: false },
    { id: "P3", nome: "Móvel direito", movel: true, direita: true },
    { id: "P4", nome: "Fixo direito", movel: false, direita: true },
  ].map(p => ({ ...p, quantidade, largura: p.movel ? m.larguraMovelMedida : m.larguraFixaMedida, altura: p.movel ? m.alturaMovelMedida : m.alturaFixaMedida }));
}
export type PecaJanela4 = ReturnType<typeof pecasJanela4>[number];
export const GABARITO_ROLDANA = { lateral: 50, superior: 20, diametro: 12 } as const;
export const GABARITO_FECHO = { lateral: 21, entreCentros: 50, diametro: 16 } as const;
export function furosFechoCentral(peca: PecaJanela4) {
  if (!peca.movel) return [];
  const x = peca.direita ? GABARITO_FECHO.lateral : peca.largura - GABARITO_FECHO.lateral;
  // O gabarito define o par de furos; a posição do conjunto permanece no meio da altura.
  return [-1, 1].map(sentido => ({ x, y: peca.altura / 2 + sentido * GABARITO_FECHO.entreCentros / 2, diametro: GABARITO_FECHO.diametro }));
}
export function furosRoldana(peca: PecaJanela4) {
  if (!peca.movel) return [];
  return [GABARITO_ROLDANA.lateral, peca.largura - GABARITO_ROLDANA.lateral].map(x => ({ x, y: GABARITO_ROLDANA.superior, diametro: GABARITO_ROLDANA.diametro }));
}
export type MarcaDesenho = { tipo: "rect" | "circle" | "line" | "text"; props: Record<string, string | number>; texto?: string };
export function marcasJanela4(comTrinco: boolean, peca?: PecaJanela4, detalharFuracao = false): MarcaDesenho[] {
  const marcas: MarcaDesenho[] = [];
  const rect = (x: number, y: number, width: number, height: number) => marcas.push({ tipo: "rect", props: { x, y, width, height, fill: "white", stroke: "black", strokeWidth: 1.3 } });
  const text = (x: number, y: number, texto: string) => marcas.push({ tipo: "text", props: { x, y, fontSize: 13, textAnchor: "middle", fill: "black" }, texto });
  const line = (x1: number, y1: number, x2: number, y2: number) => marcas.push({ tipo: "line", props: { x1, y1, x2, y2, stroke: "black", strokeWidth: 0.7 } });
  const roller = (x: number, y: number, r: number) => { marcas.push({ tipo: "circle", props: { cx: x, cy: y, r, fill: "white", stroke: "black", strokeWidth: 1 } }); };
  const folha = (x: number, width: number, id: string, movel: boolean, direita: boolean) => {
    rect(x, 75, width, 240);
    text(x + width / 2, 170, id);
    if (movel) {
      if (peca && peca.largura > 0 && peca.altura > 0) {
        for (const furo of furosRoldana(peca)) roller(x + furo.x / peca.largura * width, 75 + furo.y / peca.altura * 240, Math.max(2, furo.diametro / 2 / peca.largura * width));
        for (const furo of furosFechoCentral(peca)) roller(x + furo.x / peca.largura * width, 75 + furo.y / peca.altura * 240, Math.max(2, furo.diametro / 2 / peca.largura * width));
      } else {
        roller(x + 12, 81, 3); roller(x + width - 12, 81, 3);
        const fx = direita ? x + 6 : x + width - 6;
        roller(fx, 190, 3); roller(fx, 200, 3);
      }
      if (comTrinco) rect(direita ? x + 2 : x + width - 19, 299, 17, 12);
    }
  };
  if (peca) {
    folha(220, 140, peca.id, peca.movel, peca.direita);
    text(290, 57, `${peca.largura.toLocaleString("pt-BR")} mm`);
    text(290, 35, `Altura: ${peca.altura.toLocaleString("pt-BR")} mm`);
    text(290, 347, peca.nome);
    if (peca.movel && detalharFuracao) {
      text(100, 92, "Furação da roldana");
      // Detalhe ampliado: 1,4 unidades gráficas por mm.
      line(30, 130, 175, 130); line(30, 130, 30, 220);
      roller(100, 158, 8.4);
      line(86, 158, 114, 158); line(100, 144, 100, 172);
      line(30, 112, 100, 112); line(30, 107, 30, 125); line(100, 107, 100, 125);
      text(65, 108, "50");
      line(48, 130, 48, 158); line(44, 130, 52, 130); line(44, 158, 52, 158);
      text(64, 149, "20");
      line(108, 152, 132, 140); text(149, 143, "Ø12");
      text(100, 243, "Medidas em mm");
      text(100, 261, "Espelhar no outro canto");
      text(478, 92, "Fecho central");
      line(464, 115, 464, 252); line(470, 115, 470, 252);
      for (const cx of [434.6, 499.4]) {
        for (const cy of [151, 221]) {
          roller(cx, cy, 11.2);
          line(cx - 16, cy, cx + 16, cy); line(cx, cy - 16, cx, cy + 16);
        }
      }
      line(434.6, 117, 464, 117); line(470, 117, 499.4, 117);
      for (const cx of [434.6, 464, 470, 499.4]) line(cx, 112, cx, 123);
      text(449, 108, "21"); text(485, 108, "21");
      line(536, 151, 536, 221); line(530, 151, 542, 151); line(530, 221, 542, 221);
      text(553, 190, "50"); text(533, 139, "Ø16"); line(517, 139, 507, 145);
      text(480, 276, "Medidas em mm");
      text(480, 298, "Não refilar perfil 1035");
    }
  } else {
    rect(60, 65, 460, 260);
    folha(70, 110, "P1", false, false); folha(180, 110, "P2", true, false);
    folha(290, 110, "P3", true, true); folha(400, 110, "P4", false, true);
    text(125, 347, "Fixo"); text(235, 347, "Móvel"); text(345, 347, "Móvel"); text(455, 347, "Fixo");
  }
  return marcas;
}
