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
  "transpasse",
  "cadeirinha",
  "outro perfil u",
  "tubo",
  "cantoneira",
]

const ehPerfilU = (nome: string): boolean => {
  const compacto = nome.replace(/[^a-z0-9]/g, "")
  return (
    /\bperfil\W*u\b/.test(nome) ||
    /\bu\W*perfil\b/.test(nome) ||
    compacto.includes("perfilu") ||
    compacto.includes("ubaguete") ||
    nome.includes("baguete")
  )
}

const temCodigoPerfil = (nome: string, codigo: string): boolean =>
  nome.replace(/[^a-z0-9]/g, "").includes(codigo.toLowerCase())

const ORDEM_FERRAGENS_LOGICA = [
  ["1101a", "1101 a"],
  ["1201a", "1201 a"],
  ["1103a", "1103 a"],
  ["1013a", "1013 a"],
  ["placa da 1520", "placa 1520"],
  ["cilindro da 1520", "cilindro 1520"],
  ["contra da 1520", "contra 1520", "contra-fechadura 1520", "contra fechadura 1520"],
  ["macaneta", "maçaneta"],
  ["puxador", "puxadores"],
  ["roldana"],
  ["kit batente", "batente"],
  ["fecho", "fechadura", "fechaduras"],
  ["porta cadeado", "porta-cadeado", "porta cadeados", "porta-cadeados"],
  ["trinco castanha", "trinco", "castanha"],
]

export const getPesoPerfilLogico = (nomePerfil?: string | null): number => {
  const nome = normalizarTexto(nomePerfil)

  for (let i = 0; i < ORDEM_PERFIS_LOGICA.length; i += 1) {
    const termo = ORDEM_PERFIS_LOGICA[i]

    if (termo === "perfil u") {
      if (ehPerfilU(nome) && (temCodigoPerfil(nome, "vt10") || temCodigoPerfil(nome, "vt66"))) return i
      continue
    }

    if (termo === "outro perfil u") {
      if (ehPerfilU(nome)) return i
      continue
    }

    if (nome.includes(termo)) return i
  }

  return ORDEM_PERFIS_LOGICA.length
}

export const getPesoFerragemLogica = (nomeFerragem?: string | null): number => {
  const nome = normalizarTexto(nomeFerragem)
  const nomeCompacto = nome.replace(/[^a-z0-9]/g, "")

  for (let i = 0; i < ORDEM_FERRAGENS_LOGICA.length; i += 1) {
    const grupo = ORDEM_FERRAGENS_LOGICA[i]
    if (grupo.some((termo) => {
      const termoNormalizado = normalizarTexto(termo)
      const termoCompacto = termoNormalizado.replace(/[^a-z0-9]/g, "")
      return nome.includes(termoNormalizado) || (!!termoCompacto && nomeCompacto.includes(termoCompacto))
    })) return i
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
