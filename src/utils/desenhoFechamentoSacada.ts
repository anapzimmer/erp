export type FechamentoDesenhoInput = {
  largura: number; alturaInferior: number; alturaSuperior: number;
  divisoesInferior: number; divisoesSuperior: number;
  tipoSacada: "panoramica" | "tubo";
};
export function geometriaFechamentoSacada(o: FechamentoDesenhoInput) {
  const inferior = o.alturaInferior || 1000, superior = o.alturaSuperior || 1500;
  const h = Math.min(185, Math.max(110, 390 * (inferior + superior) / (o.largura || 3000)));
  const meio = 16 + h * superior / (inferior + superior);
  const rects: {x:number;y:number;width:number;height:number;fill:string;stroke:string}[] = [];
  const rect = (x:number,y:number,width:number,height:number,metal=false) => rects.push({x,y,width,height,fill:metal?'#DCE2E4':'#F5F8F9',stroke:'#9AAAB1'});
  const linhas: {x1:number;y1:number;x2:number;y2:number}[] = [];
  for (const [y,altura,n] of [[22,meio-22,o.divisoesSuperior],[meio+6,16+h-meio-12,o.divisoesInferior]]) {
    const divs=Math.max(1,Math.floor(n||1)), w=390/divs;
    for(let i=0;i<divs;i++) {
      rect(20+i*w,y,w,altura);
      linhas.push({x1:20+i*w+w*.2,y1:y+altura*.75,x2:20+i*w+w*.65,y2:y+altura*.15});
    }
  }
  const divs=Math.max(1,Math.floor(o.divisoesInferior||1));
  for(let i=0;i<=divs;i++) {
    const x=20+390*i/divs;
    // Laterais contidas na largura da travessa, sem degrau nos cantos.
    const lateralX = i === 0 ? 20 : i === divs ? 405 : x - 2.5;
    rect(lateralX,meio+6,5,16+h-meio-6,true);
    if(o.tipoSacada==='panoramica') rect(x-6,16+h,12,3,true);
  }
  rect(20,16,390,6,true);rect(20,meio,390,6,true);
  // Neste conjunto, o vidro inferior termina no perfil de base em ambos os modelos.
  rect(20,16+h-6,390,6,true);
  return {rects,linhas};
}
export function gerarSvgFechamentoSacada(o:FechamentoDesenhoInput) {
  const g=geometriaFechamentoSacada(o);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 225">${g.rects.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${r.fill}" stroke="${r.stroke}" stroke-width=".8"/>`).join('')}${g.linhas.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="white" stroke-width="1.5"/>`).join('')}</svg>`;
}
