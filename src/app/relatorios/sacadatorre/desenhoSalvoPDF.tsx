import React from "react";
import { Svg, G, Rect, Line, Path, Text, Circle, Ellipse, Polygon, Polyline, Defs, LinearGradient, Stop } from "@react-pdf/renderer";

// Interpreta somente primitivas do desenho local; nunca carrega URLs ou imagens externas.
export function desenhoSalvoPDF(url: string | undefined, width: number | string, height: number): React.ReactNode {
  if (!url?.startsWith("data:image/svg+xml") || typeof DOMParser === "undefined") return null;
  try {
    const comma = url.indexOf(",");
    const xml = url.slice(0, comma).includes(";base64") ? atob(url.slice(comma + 1)) : decodeURIComponent(url.slice(comma + 1));
    if (xml.length > 500000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
    const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
    if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") return null;
    const attr = (e: Element, name: string) => Array.from(e.attributes).find(a => a.name === name)?.value;
    // O retângulo externo delimita a sacada; as cotas ficam fora dele.
    const frame = Array.from(doc.documentElement.children).find(e => e.localName === "rect");
    const bounds = frame ? { x: Number(attr(frame, "x")), y: Number(attr(frame, "y")), w: Number(attr(frame, "width")), h: Number(attr(frame, "height")) } : null;
    const tags = { svg: Svg, g: G, rect: Rect, line: Line, path: Path, text: Text, circle: Circle, ellipse: Ellipse, polygon: Polygon, polyline: Polyline, defs: Defs, linearGradient: LinearGradient, stop: Stop };
    const attributes = new Set(["viewBox", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "rx", "ry", "cx", "cy", "r", "d", "points", "fill", "stroke", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "transform", "text-anchor", "font-size", "font-weight", "id", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "stroke-linecap", "stroke-linejoin"]);
    function render(element: Element, key: number): React.ReactNode {
      const tag = element.localName as keyof typeof tags;
      if (!Object.hasOwn(tags, tag)) return null;
      const component = tags[tag];
      if (!component) return null; // Sombras/filtros não suportados pelo renderizador PDF.
      if (bounds && tag === "text" && /\bmm\s*$/.test(element.textContent || "")) return null;
      if (bounds && tag === "line") {
        const x1 = Number(attr(element, "x1")), x2 = Number(attr(element, "x2"));
        const y1 = Number(attr(element, "y1")), y2 = Number(attr(element, "y2"));
        if ((x1 < bounds.x && x2 < bounds.x) || (y1 > bounds.y + bounds.h && y2 > bounds.y + bounds.h)) return null;
      }
      const props: Record<string, unknown> = { key };
      for (const attr of Array.from(element.attributes)) {
        if (!attributes.has(attr.name) || /url\((?!#[\w-]+\))/i.test(attr.value)) continue;
        props[attr.name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = attr.value;
      }
      if (tag === "text") {
        // O SVG usa pesos CSS (ex.: "600"); o PDF exige um peso numérico
        // e uma fonte registrada. Helvetica é nativa e dispensa arquivos externos.
        const peso = props.fontWeight;
        props.fontFamily = "Helvetica";
        props.fontWeight = peso === "bold" || Number(peso) >= 600 ? 700 : 400;
      }
      if (tag === "svg") Object.assign(props, { width, height, preserveAspectRatio: "xMidYMid meet" });
      if (tag === "svg" && bounds && bounds.w > 0 && bounds.h > 0) props.viewBox = `${bounds.x - 8} ${bounds.y - 8} ${bounds.w + 16} ${bounds.h + 16}`;
      const children = tag === "text" ? element.textContent : Array.from(element.children).map(render);
      return React.createElement(component as React.ElementType, props, children);
    }
    return render(doc.documentElement, 0);
  } catch { return null; }
}
