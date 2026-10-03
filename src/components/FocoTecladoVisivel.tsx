"use client";
import { useEffect } from "react";

export default function FocoTecladoVisivel() {
  useEffect(() => {
    let frame = 0;
    const navegar = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const campo = document.activeElement;
        if (!(campo instanceof HTMLElement)) return;
        const r = campo.getBoundingClientRect();
        if (r.top < 100 || r.bottom > window.innerHeight - 120) {
          campo.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        }
      });
    };
    document.addEventListener("keydown", navegar);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", navegar); };
  }, []);
  return null;
}
