/** Rola somente a lista, sem deslocar a página ou tirar o foco da busca. */
export function revelarOpcaoAtiva(elemento: HTMLElement | null, ativa: boolean) {
  if (!elemento || !ativa) return;
  const lista = elemento.parentElement;
  if (!lista) return;
  const item = elemento.getBoundingClientRect();
  const area = lista.getBoundingClientRect();
  if (item.bottom > area.bottom) lista.scrollTop += item.bottom - area.bottom;
  else if (item.top < area.top) lista.scrollTop -= area.top - item.top;
}
