"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { revelarOpcaoAtiva } from "@/utils/opcaoVisivel";

export default function BuscaMaterialInput<T extends { id: string; descricao: string; tipo: string }>({
  item, itensCatalogo, atualizarMaterial, selecionarItemCatalogo,
}: {
  item: { id: string; descricao: string };
  itensCatalogo: T[];
  atualizarMaterial: (id: string, campo: "descricao", valor: string) => void;
  selecionarItemCatalogo: (id: string, catalogo: T) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState(item.descricao);
  const [ativo, setAtivo] = useState(0);
  const [posicao, setPosicao] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");
  const resultados = itensCatalogo.filter(c => !termo || termo === "novo item" || c.descricao.toLocaleLowerCase("pt-BR").includes(termo));
  const indice = Math.min(ativo, Math.max(resultados.length - 1, 0));
  useEffect(() => {
    if (!aberto) return;
    const posicionar = () => {
      const r = input.current?.getBoundingClientRect();
      if (!r) return;
      const abaixo = window.innerHeight - r.bottom - 16;
      const acima = r.top - 16;
      const subir = abaixo < 200 && acima > abaixo;
      const altura = Math.max(60, Math.min(320, subir ? acima : abaixo));
      const width = Math.min(Math.max(r.width, 520), window.innerWidth - 24);
      setPosicao({ left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), top: subir ? r.top - altura - 4 : r.bottom + 4, width, maxHeight: altura });
    };
    posicionar();
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    return () => { window.removeEventListener("resize", posicionar); window.removeEventListener("scroll", posicionar, true); };
  }, [aberto]);
  const selecionar = (catalogo: T) => { selecionarItemCatalogo(item.id, catalogo); setAberto(false); };
  return <>
    <input ref={input} value={aberto ? pesquisa : item.descricao} role="combobox" aria-label="Nome ou código do material"
      aria-expanded={aberto} aria-controls={aberto ? id : undefined} aria-autocomplete="list"
      aria-activedescendant={aberto && resultados.length ? `${id}-${indice}` : undefined}
      onFocus={() => { setPesquisa(item.descricao.toLowerCase() === "novo item" ? "" : item.descricao); setAtivo(0); setAberto(true); }}
      onChange={e => { setPesquisa(e.target.value.toUpperCase()); setAtivo(0); setAberto(true); }}
      onBlur={() => {
        if (aberto && pesquisa.trim()) atualizarMaterial(item.id, "descricao", pesquisa);
        setAberto(false);
      }}
      onKeyDown={e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault(); setAberto(true);
          setAtivo(Math.max(0, Math.min(resultados.length - 1, indice + (e.key === "ArrowDown" ? 1 : -1))));
        } else if (e.key === "Enter" && aberto && resultados[indice]) { e.preventDefault(); selecionar(resultados[indice]); }
        else if (e.key === "Escape") setAberto(false);
        else if (e.key === "Tab") {
          if (aberto && pesquisa.trim()) atualizarMaterial(item.id, "descricao", pesquisa);
          setAberto(false);
        }
      }}
      className="w-full bg-transparent text-xs font-medium uppercase outline-none focus:rounded-md focus:bg-surface-secondary" />
    {aberto && createPortal(<div id={id} role="listbox" aria-label="Materiais encontrados" style={{ ...posicao, position: "fixed", zIndex: 1000 }} className="overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface py-1 shadow-xl">
      {resultados.length ? resultados.map((catalogo, index) => <button key={`${catalogo.tipo}-${catalogo.id}-${index}`} id={`${id}-${index}`} role="option" aria-selected={index === indice}
        ref={el => revelarOpcaoAtiva(el, index === indice)} type="button" tabIndex={-1}
        onMouseDown={e => e.preventDefault()} onClick={() => selecionar(catalogo)}
        className={`block w-full whitespace-normal px-3 py-2 text-left text-xs text-text-primary ${index === indice ? "bg-primary/10" : "hover:bg-surface-secondary"}`}>
        {catalogo.descricao}<span className="ml-2 text-text-secondary">{catalogo.tipo}</span>
      </button>) : <p className="px-3 py-2 text-sm text-text-secondary">Nenhum material encontrado.</p>}
    </div>, document.body)}
  </>;
}
