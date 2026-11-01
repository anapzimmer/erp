type PosicaoTubo = "sem" | "em-cima" | "entre-meios" | "em-cima-e-entre-meios";
type Opcoes = { largura: number; altura: number; divisoes: number; grapasLaterais: number; grapasInferiores: number; grapas1305PorUniao: number; tuboPosicao: PosicaoTubo; corPerfil?: string };
type Retangulo = { x: number; y: number; width: number; height: number };

/** Mesmas proporções e margens da Sacada Torre, sem torres ou moldura periférica. */
export function geometriaSacadaGrapa(o: Opcoes) {
  const divs = Math.max(1, Math.floor(o.divisoes || 1));
  const panelW = Math.max(155, Math.min(250, 780 / divs));
  const glassW = panelW * divs;
  const glassH = Math.max(160, Math.min(235, panelW * Math.max(.65, Math.min(1.25, (o.altura || 1100) / Math.max((o.largura || 3000) / divs, 1)))));
  const left = 90, top = 24, bottom = top + glassH;
  const count = (n: number) => Math.max(0, Math.floor(n || 0));
  const size = 11, tubeW = 8;
  const vidros: Retangulo[] = [], tubos: Retangulo[] = [], grapas: Retangulo[] = [], unioes: { x: number; y: number }[] = [];
  const square = (x: number, y: number) => grapas.push({ x, y, width: size, height: size });
  const posY = (i: number, n: number) => top + (n <= 1 ? 39 : 39 + (glassH - 78) * i / (n - 1));
  const meio = o.tuboPosicao === "entre-meios" || o.tuboPosicao === "em-cima-e-entre-meios";
  if (o.tuboPosicao === "em-cima" || o.tuboPosicao === "em-cima-e-entre-meios") tubos.push({ x: left - 1, y: top - tubeW, width: glassW + 2, height: tubeW });
  for (let i = 0; i < divs; i++) {
    const x = left + i * panelW;
    vidros.push({ x: x + 1, y: top, width: panelW - 2, height: glassH });
    for (let j = 0; j < count(o.grapasInferiores); j++) square(x + panelW * (j + 1) / (count(o.grapasInferiores) + 1) - size / 2, bottom - size / 2);
  }
  for (let j = 0; j < count(o.grapasLaterais); j++) {
    const y = posY(j, count(o.grapasLaterais)) - size / 2;
    square(left + .5, y); square(left + glassW - size - .5, y);
  }
  for (let i = 1; i < divs; i++) {
    const x = left + i * panelW;
    if (meio) {
      tubos.push({ x: x - tubeW / 2, y: top, width: tubeW, height: glassH });
      for (let j = 0; j < count(o.grapasLaterais); j++) {
        const y = posY(j, count(o.grapasLaterais)) - size / 2;
        square(x - tubeW / 2 - size, y); square(x + tubeW / 2, y);
      }
    } else {
      for (let j = 0; j < count(o.grapas1305PorUniao); j++) {
        const y = posY(j, count(o.grapas1305PorUniao));
        unioes.push({ x: x - 11, y }, { x: x + 11, y });
      }
    }
  }
  return { vidros, tubos, grapas, unioes, left, top, bottom, glassW, glassH, width: glassW + left + 56, height: bottom + 100 };
}

export function gerarSvgSacadaGrapa(o: Opcoes) {
  const g = geometriaSacadaGrapa(o);
  const rect = (r: Retangulo, fill: string, stroke = "#9AAAB1") => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" role="img" aria-label="Sacada com grapas e tubo opcional">
    <defs><linearGradient id="gcGrapaGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F6F8F8"/><stop offset="1" stop-color="#EAF1F3"/></linearGradient></defs>
    ${g.vidros.map(r => rect(r, "url(#gcGrapaGlass)") + `<path d="M${r.x + r.width * .18} ${r.y + r.height * .65} l${r.width * .38} ${-r.height * .53}" stroke="#fff" stroke-width="8" opacity=".23"/>`).join("")}
    ${g.tubos.map(r => rect(r, "#E7ECEE", "#A7B2B7")).join("")}
    ${g.grapas.map(r => rect(r, "#FFFFFF")).join("")}
    ${g.unioes.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="#FFFFFF" stroke="#9AAAB1" stroke-width="1.1"/>`).join("")}
    <g stroke="#A7B2B7" stroke-width=".8" fill="none"><path d="M${g.left - 25} ${g.top}v${g.glassH} M${g.left - 31} ${g.top}h12 M${g.left - 31} ${g.bottom}h12 M${g.left} ${g.bottom + 55}h${g.glassW} M${g.left} ${g.bottom + 49}v12 M${g.left + g.glassW} ${g.bottom + 49}v12"/></g>
    <text transform="translate(${g.left - 43} ${g.top + g.glassH / 2}) rotate(-90)" font-family="Arial,sans-serif" font-size="13" text-anchor="middle" fill="#7E8C93">${Math.round(o.altura || 0)} mm</text>
    <text x="${g.left + g.glassW / 2}" y="${g.bottom + 75}" font-family="Arial,sans-serif" font-size="14" text-anchor="middle" fill="#7E8C93">${Math.round(o.largura || 0)} mm</text>
  </svg>`;
}
