import { DRAWING_COLORS } from "@/design/drawing";

export type ForaEsquadroLateral = {
  larguraSuperior: number;
  larguraInferior: number;
  altura: number;
  divisoes: number;
  lado: "esquerdo" | "direito";
};
export function calcularPecasLateral(d: ForaEsquadroLateral, molde = false) {
  const n = Math.max(1, Math.min(12, Math.floor(d.divisoes || 1)));
  const menor = Math.min(d.larguraSuperior, d.larguraInferior);
  const base = menor / n;
  const arredondar = (v: number) => Math.ceil(Math.max(0, v) / 50) * 50;
  return Array.from({ length: n }, (_, i) => {
    const ponta = i === (d.lado === "direito" ? n - 1 : 0);
    const larguraSuperior = base + (ponta ? d.larguraSuperior - menor : 0);
    const larguraInferior = base + (ponta ? d.larguraInferior - menor : 0);
    const largura = Math.max(larguraSuperior, larguraInferior);
    const acrescimoPonta = ponta && d.larguraSuperior !== d.larguraInferior ? 50 : 0;
    const larguraCalculo = molde ? largura + 100 : arredondar(largura + acrescimoPonta);
    const alturaCalculo = molde ? d.altura + 100 : arredondar(d.altura);
    return { indice: i + 1, largura, larguraSuperior, larguraInferior, alturaEsquerda: d.altura, alturaDireita: d.altura,
      queda: larguraSuperior - larguraInferior, larguraCalculo, alturaCalculo, area: larguraCalculo * alturaCalculo / 1_000_000 };
  });
}
export function geometriaLateral(d: ForaEsquadroLateral) {
  const max = Math.max(d.larguraSuperior, d.larguraInferior, 1);
  const sx = 700 / max, x = 100, y = 90, h = 300;
  const esquerda = d.lado === "esquerdo";
  const ts = x + (esquerda ? (max - d.larguraSuperior) * sx : 0);
  const bs = x + (esquerda ? (max - d.larguraInferior) * sx : 0);
  const te = ts + d.larguraSuperior * sx, be = bs + d.larguraInferior * sx;
  const n = Math.max(1, Math.min(12, Math.floor(d.divisoes || 1)));
  const base = Math.min(d.larguraSuperior, d.larguraInferior) / n;
  const cortes = Array.from({length:n-1},(_,i)=> esquerda ? x+700-base*(i+1)*sx : x+base*(i+1)*sx);
  return { path: `M ${ts} ${y} L ${te} ${y} L ${be} ${y+h} L ${bs} ${y+h} Z`, cortes,
    labels: [{x:(ts+te)/2,y:55,texto:`Superior: ${d.larguraSuperior} mm`}, {x:(bs+be)/2,y:430,texto:`Inferior: ${d.larguraInferior} mm`},
      {x:450,y:475,texto:`Altura fixa: ${d.altura} mm · ${n} peça(s) · inclinação à ${esquerda ? "esquerda" : "direita"}`} ] };
}
export function desenhoLateralUrl(d: ForaEsquadroLateral) {
  const g = geometriaLateral(d);
  const { ink, frame, edge, glass } = DRAWING_COLORS;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520"><rect width="920" height="520" rx="28" fill="#ffffff"/><path d="${g.path}" fill="${glass}" stroke="${frame}" stroke-width="2.4" stroke-linejoin="round"/><path d="${g.path}" fill="none" stroke="${edge}" stroke-width="13" stroke-linejoin="round" opacity="0.95"/><path d="${g.path}" fill="none" stroke="${frame}" stroke-width="1.4" stroke-linejoin="round" opacity="0.78"/>${g.cortes.map(x=>`<line x1="${x}" x2="${x}" y1="90" y2="390" stroke="${frame}" stroke-width="1.8" opacity="0.82"/>`).join("")}${g.labels.map(l=>`<text x="${l.x}" y="${l.y}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" fill="${ink}">${l.texto}</text>`).join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
