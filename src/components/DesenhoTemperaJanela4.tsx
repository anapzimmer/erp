import React from "react";
import { Svg, Rect, Circle, Line, Text } from "@react-pdf/renderer";
import { marcasJanela4, type PecaJanela4 } from "@/utils/desenhoTemperaJanela4";

export default function DesenhoTemperaJanela4({ comTrinco, peca, pdf = false }: { comTrinco: boolean; peca?: PecaJanela4; pdf?: boolean }) {
  const marcas = marcasJanela4(comTrinco, peca, true);
  const componentes: Record<string, React.ElementType> = pdf ? { rect: Rect, circle: Circle, line: Line, text: Text } : { rect: "rect", circle: "circle", line: "line", text: "text" };
  const conteudo = marcas.map((m, i) => React.createElement(componentes[m.tipo], { ...m.props, key: i }, m.texto));
  return pdf ? <Svg viewBox="0 0 580 370" width={520} height={332}>{conteudo}</Svg> : <svg viewBox="0 0 580 370" className="w-full bg-white" role="img" aria-label={`Janela 4 folhas: roldanas e fechos nas folhas móveis, ${comTrinco ? "com" : "sem"} trincos inferiores`}>{conteudo}</svg>;
}
