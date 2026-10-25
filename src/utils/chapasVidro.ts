import tabela from "@/data/chapasPlanilha.json";
import type { ChapaVidro } from "./regraMedidaVidro";

type Vidro = { nome: string; espessura: string; tipo?: string; chapas?: ChapaVidro[] | null };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\binc\b/g, "incolor").replace(/\bfum\b/g, "fume").replace(/\bvrd\b/g, "verde")
  .replace(/\bbrz\b/g, "bronze").replace(/\besp\b/g, "espelho").replace(/\bref\b/g, "reflecta")
  .replace(/extra\s*clear/g, "extra clear").replace(/\s+/g, " ").trim();

function identidade(nome: string, tipo = "") {
  const texto = normalizar(`${nome} ${tipo}`);
  const codigo = texto.match(/\b(stb|str|st|brn)\s*(\d{3})\b/);
  const especial = codigo ? `${codigo[1]}${codigo[2]}`
    : texto.match(/silver\s*(20|32)/)?.[0].replace(/\s/g, "")
      || ["acustico", "sunlight", "mini boreal", "pontilhado", "canelado", "extra clear", "acidato", "reflecta", "espelho"].find(v => texto.includes(v));
  const laminado = /laminad/.test(texto) || /\d\s*\+\s*\d/.test(texto);
  const cor = /\bfume\b/.test(texto) ? "fume" : /\bbronze\b/.test(texto) ? "bronze" : /\bverde\b/.test(texto) ? "verde" : /\bazul\b/.test(texto) ? "azul" : /\bincolor\b|\bprata\b/.test(texto) ? "incolor" : "";
  // Códigos de linha identificam seu produto; não confundir com o vidro comum da mesma cor.
  if (codigo || especial?.startsWith("silver")) return `${laminado}:${especial}`;
  if (especial) return `${laminado}:${especial}:${["espelho", "reflecta", "acidato"].includes(especial) ? cor || "incolor" : ""}`;
  // Só aceita nomes comuns explícitos, sem aproximar produtos desconhecidos.
  const nomeLimpo = normalizar(nome).replace(/\d+(?:\s*[+/]\s*\d+)?\s*mm\b/g, "").replace(/\b(vidro|laminado|temperado|float|comum|incolor|fume|verde|bronze|azul)\b/g, "").replace(/[\s-]/g, "");
  return cor && !nomeLimpo ? `${laminado}:comum:${cor}` : `desconhecido:${texto}`;
}
const espessura = (s: string) => normalizar(s).replace(/mm/g, "").replace(/\s/g, "").split(/([+/])/).map(v => /^\d+$/.test(v) ? String(Number(v)) : v).join("");

export function normalizarChapas(chapas: ChapaVidro[]): ChapaVidro[] {
  const unicas = new Map<string, ChapaVidro>();
  for (const chapa of chapas) {
    const largura_mm = Math.max(chapa.largura_mm, chapa.altura_mm);
    const altura_mm = Math.min(chapa.largura_mm, chapa.altura_mm);
    if (!Number.isFinite(largura_mm) || !Number.isFinite(altura_mm) || altura_mm <= 0) throw new Error("Informe medidas de chapa maiores que zero.");
    unicas.set(`${largura_mm}x${altura_mm}`, { largura_mm, altura_mm });
  }
  return [...unicas.values()];
}

/** Referência de dimensões, sem importar saldo de estoque ou preços. */
export function sugerirChapasVidro(vidro: Vidro): ChapaVidro[] {
  const chave = identidade(`${vidro.nome} ${vidro.espessura}`, vidro.tipo);
  const e = espessura(vidro.espessura);
  const encontradas = tabela.vidros.filter(v => {
    const m = v.descricao.match(/(\d+(?:\s*[+/]\s*\d+)?)\s*mm/i);
    const medida = m ? espessura(m[1]) : "";
    const nome = v.descricao.replace(/\([^)]*\)/g, "").replace(/\bcebrace\b/gi, "").replace(/\bT\b/g, "").trim();
    return identidade(nome) === chave && (!medida || medida === e || (medida.includes("/") && medida.split("/").includes(e)));
  });
  const chapas = normalizarChapas(encontradas.flatMap(v => v.chapas));
  return chapas.length ? chapas : [{ largura_mm: 3210, altura_mm: 2200 }];
}

export function chapasDisponiveisVidro(vidro: Vidro): ChapaVidro[] {
  return vidro.chapas?.length ? normalizarChapas(vidro.chapas) : sugerirChapasVidro(vidro);
}
