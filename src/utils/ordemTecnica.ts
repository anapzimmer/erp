const normalizarTexto = (valor?: string | null): string =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const ORDEM_PERFIS_LOGICA = [
  "superior",
  "capa",
  "inferior",
  "clic",
  "perfil u",
  "u",
  "transpasse",
  "cadeirinha",
]

const ORDEM_FERRAGENS_LOGICA = [
  ["roldana"],
  ["kit batente", "batente"],
  ["fecho", "fechadura", "fechaduras"],
  ["puxador", "puxadores"],
  ["porta cadeado", "porta cadeado", "porta-cadeado", "porta cadeados", "porta-cadeados"],
  ["trinco castanha", "trinco", "castanha"],
]

export const getPesoPerfilLogico = (nomePerfil?: string | null): number => {
  const nome = normalizarTexto(nomePerfil)

  for (let i = 0; i < ORDEM_PERFIS_LOGICA.length; i += 1) {
    const termo = ORDEM_PERFIS_LOGICA[i]

    if (termo === "u") {
      if (/\b(u|u\s*perfil|perfil\s*u)\b/.test(nome)) return i
      continue
    }

    if (nome.includes(termo)) return i
  }

  return ORDEM_PERFIS_LOGICA.length
}

export const getPesoFerragemLogica = (nomeFerragem?: string | null): number => {
  const nome = normalizarTexto(nomeFerragem)

  for (let i = 0; i < ORDEM_FERRAGENS_LOGICA.length; i += 1) {
    const grupo = ORDEM_FERRAGENS_LOGICA[i]
    if (grupo.some((termo) => nome.includes(termo))) return i
  }

  return ORDEM_FERRAGENS_LOGICA.length
}

export const comparePerfisByNome = (a?: string | null, b?: string | null): number => {
  const pesoA = getPesoPerfilLogico(a)
  const pesoB = getPesoPerfilLogico(b)
  if (pesoA !== pesoB) return pesoA - pesoB
  return String(a || "").localeCompare(String(b || ""), "pt-BR")
}

export const compareFerragensByNome = (a?: string | null, b?: string | null): number => {
  const pesoA = getPesoFerragemLogica(a)
  const pesoB = getPesoFerragemLogica(b)
  if (pesoA !== pesoB) return pesoA - pesoB
  return String(a || "").localeCompare(String(b || ""), "pt-BR")
}