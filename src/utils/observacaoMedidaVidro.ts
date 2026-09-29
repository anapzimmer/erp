export function observacaoMedidaVidro(observacao?: string): string {
  return (observacao || "").split(" | ").filter(t => /acr[eé]scimo|v[aã]o original|pe[cç]a dividida/i.test(t)).map(t => t.replace(/^Vao original medida/i, "Peça dividida — medida original").replace(/^Acrescimo/i, "Acréscimo")).join(" · ");
}
