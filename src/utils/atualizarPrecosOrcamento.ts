import { descricaoVidroCompativel } from "./vidros";
import { calcularEspelho, type ItemEspelhoSalvo } from "./calculoEspelhos";

export type MaterialPreco = { id: string; descricao: string; qtd: number; valorUnitario: number; unidade: string; personalizadoCatalogo?: boolean };
type VidroOriginal = { descricao?: string; vidro_id?: string | number; medidaCalc?: string; precoVidroM2?: number; qtd?: number; total?: number; valorUnitario?: number; totalOriginal?: number; observacaoPreco?: string };
export type ProjetoPreco = { id: string; projeto?: string; vidro?: string; precoVidroM2?: number; valorTotal?: number; materiais?: MaterialPreco[]; vidrosAvulsos?: Array<{ precoVidroM2?: number; valorTotal: number; areaCobradaM2?: number }>; itensOriginais?: VidroOriginal[]; espelhoItens?: ItemEspelhoSalvo[] };
export type PrecoAtual = { id?: string; descricao: string; preco: number | null; vidro?: boolean; alternativas?: string[] };
export type AlteracaoPreco = { chave: string; projetoId?: string; materialId: string; indiceVidro?: number; descricao: string; anterior: number; atual: number | null; quantidade: number; motivo?: string };
const normalizar = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const separarMm = (v: string) => v.replace(/(\d)mm\b/gi, "$1 mm");
const precoValido = (v: number | null | undefined): v is number => v != null && Number.isFinite(v) && v >= 0;
const areaOriginal = (v: VidroOriginal) => {
  const medidas = v.medidaCalc?.match(/^\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
  return medidas ? Number(medidas[1].replace(",", ".")) * Number(medidas[2].replace(",", ".")) * Number(v.qtd || 0) / 1e6 : 0;
};

export function compararPrecosOrcamento(projetos: ProjetoPreco[], avulsos: MaterialPreco[], catalogo: PrecoAtual[]): AlteracaoPreco[] {
  const linhas: AlteracaoPreco[] = [];
  const comparar = (material: MaterialPreco, projeto?: ProjetoPreco) => {
    // Itens compostos possuem acabamentos, acréscimos e totais em estruturas
    // próprias: não tratar o valor agregado como preço puro do vidro.
    const composto = Boolean(projeto?.itensOriginais?.length || projeto?.espelhoItens?.length || projeto?.vidrosAvulsos?.length);
    const candidatos = catalogo.filter(c => c.vidro
      ? /^(m2|m²)$/i.test(material.unidade) && descricaoVidroCompativel(separarMm(c.descricao), separarMm(material.descricao))
      : [c.descricao, ...(c.alternativas || [])].some(d => normalizar(d) === normalizar(material.descricao)));
    const encontrado = candidatos.length === 1 ? candidatos[0] : null;
    const atual = !composto && encontrado?.preco != null && Number.isFinite(encontrado.preco) && encontrado.preco >= 0 ? encontrado.preco : null;
    linhas.push({ chave: `${projeto?.id || "avulsos"}:${material.id}`, projetoId: projeto?.id, materialId: material.id,
      descricao: material.descricao, anterior: material.valorUnitario, atual, quantidade: material.qtd,
      motivo: composto ? "Item composto: manter preço e revisar no cálculo de origem."
        : candidatos.length > 1 ? "Mais de um cadastro corresponde: preço mantido."
        : atual === null ? "Preço atual não localizado com segurança."
        : material.personalizadoCatalogo ? "Material personalizado: confira o preço negociado." : undefined });
  };
  projetos.forEach(p => {
    if (p.espelhoItens?.length && p.materiais?.length === p.espelhoItens.length) {
      p.espelhoItens.forEach((v, i) => {
        const candidatos = catalogo.filter(c => c.vidro && v.vidroId != null && String(c.id) === String(v.vidroId));
        const preco = candidatos.length === 1 ? candidatos[0].preco : null;
        let seguro = v.memoriaCalculo?.versao === 1 && precoValido(v.precoVidroM2) && precoValido(preco);
        if (seguro) {
          try { calcularEspelho({ ...v.memoriaCalculo!.entrada, precoVidroM2: preco }); }
          catch { seguro = false; }
        }
        linhas.push({ chave: `${p.id}:espelho:${i}`, projetoId: p.id, materialId: p.materiais![i].id, descricao: v.descricao || "Espelho", anterior: v.precoVidroM2 || 0,
          atual: seguro ? preco : null, quantidade: v.m2 || 0, motivo: seguro ? "Preço do espelho por m². Regras de acabamento e ajustes monetários mantidos." : "Espelho sem memória completa ou preço identificado: valor mantido." });
      });
      return;
    }
    if (p.itensOriginais?.length && p.vidrosAvulsos?.length === p.itensOriginais.length && p.materiais?.length === p.itensOriginais.length) {
      p.itensOriginais.forEach((v, i) => {
        const candidatos = catalogo.filter(c => c.vidro && (v.vidro_id != null ? String(c.id) === String(v.vidro_id) : descricaoVidroCompativel(separarMm(c.descricao), separarMm(v.descricao || ""))));
        const preco = candidatos.length === 1 ? candidatos[0].preco : null;
        const area = areaOriginal(v);
        const percentual = v.observacaoPreco?.match(/acr[eé]scimo de (\d+(?:[.,]\d+)?)%/i);
        const fator = percentual ? 1 + Number(percentual[1].replace(",", ".")) / 100 : 1;
        const valido = area > 0 && precoValido(v.precoVidroM2) && precoValido(preco) && typeof v.total === "number";
        linhas.push({ chave: `${p.id}:vidro:${i}`, projetoId: p.id, materialId: p.materiais![i].id, indiceVidro: i,
          descricao: v.descricao || p.materiais![i].descricao, anterior: v.precoVidroM2 || 0, atual: valido ? Math.round(preco! * fator * 100) / 100 : null, quantidade: area,
          motivo: valido ? `Preço do vidro por m². Serviços e ajustes monetários mantidos.${percentual ? ` Acréscimo de ${percentual[1]}% mantido.` : ""}` : "Preço ou memória de cálculo incompletos: valor mantido." });
      });
      return;
    }
    if (!p.materiais?.length) linhas.push({ chave: p.id, projetoId: p.id, materialId: "", descricao: p.projeto || "Projeto", anterior: p.valorTotal || 0, atual: null, quantidade: 1, motivo: "Sem preços unitários identificáveis: revisar no cálculo de origem." });
    else p.materiais.forEach(m => comparar(m, p));
  });
  avulsos.forEach(m => comparar(m));
  return linhas;
}

export function aplicarPrecosOrcamento<T extends ProjetoPreco, M extends MaterialPreco>(projetos: T[], avulsos: M[], linhas: AlteracaoPreco[], selecionadas: Set<string>) {
  const precos = new Map(linhas.filter(l => selecionadas.has(l.chave) && l.atual !== null).map(l => [l.chave, l.atual!]));
  const material = <V extends MaterialPreco>(m: V, projetoId = "avulsos"): V => precos.has(`${projetoId}:${m.id}`) ? { ...m, valorUnitario: precos.get(`${projetoId}:${m.id}`)! } : m;
  return {
    projetos: projetos.map(p => {
      if (p.espelhoItens?.length && p.materiais?.length === p.espelhoItens.length) {
        let diferenca = 0;
        const materiais = [...p.materiais], vidrosAvulsos = p.vidrosAvulsos ? [...p.vidrosAvulsos] : undefined;
        const espelhoItens = p.espelhoItens.map((v, i) => {
          const preco = precos.get(`${p.id}:espelho:${i}`);
          if (preco === undefined || !v.memoriaCalculo) return v;
          const novo = calcularEspelho({ ...v.memoriaCalculo.entrada, precoVidroM2: preco });
          const delta = novo.total - v.memoriaCalculo.total;
          diferenca += delta;
          const total = Math.round((Number(v.total || 0) + delta) * 100) / 100;
          materiais[i] = { ...materiais[i], valorUnitario: materiais[i].qtd > 0 ? total / materiais[i].qtd : materiais[i].valorUnitario };
          if (vidrosAvulsos?.[i]) vidrosAvulsos[i] = { ...vidrosAvulsos[i], precoVidroM2: preco, valorTotal: total, areaCobradaM2: novo.m2 };
          return { ...v, total, precoVidroM2: preco, memoriaCalculo: novo.memoriaCalculo };
        });
        return { ...p, materiais, vidrosAvulsos, espelhoItens, precoVidroM2: espelhoItens.length === 1 ? espelhoItens[0].precoVidroM2 : p.precoVidroM2, valorTotal: Math.round(((p.valorTotal || 0) + diferenca) * 100) / 100 };
      }
      if (p.itensOriginais?.length && p.vidrosAvulsos?.length === p.itensOriginais.length && p.materiais?.length === p.itensOriginais.length) {
        let diferenca = 0;
        const materiais = [...p.materiais], vidrosAvulsos = [...p.vidrosAvulsos];
        const itensOriginais = p.itensOriginais.map((v, i) => {
          const preco = precos.get(`${p.id}:vidro:${i}`);
          if (preco === undefined) return v;
          const delta = Math.round(areaOriginal(v) * (preco - Number(v.precoVidroM2)) * 100) / 100;
          diferenca += delta;
          const total = Math.round((Number(v.total) + delta) * 100) / 100;
          materiais[i] = { ...materiais[i], valorUnitario: materiais[i].qtd > 0 ? total / materiais[i].qtd : materiais[i].valorUnitario };
          vidrosAvulsos[i] = { ...vidrosAvulsos[i], precoVidroM2: preco, valorTotal: total, areaCobradaM2: areaOriginal(v) };
          return { ...v, precoVidroM2: preco, total, valorUnitario: Number(v.valorUnitario || 0) + delta / Number(v.qtd || 1), totalOriginal: v.totalOriginal == null ? undefined : v.totalOriginal + delta };
        });
        return { ...p, materiais, vidrosAvulsos, itensOriginais, valorTotal: Math.round(((p.valorTotal || 0) + diferenca) * 100) / 100 };
      }
      const materiais = p.materiais?.map(m => material(m, p.id));
      const diferenca = (materiais || []).reduce((s, m, i) => s + m.qtd * (m.valorUnitario - p.materiais![i].valorUnitario), 0);
      const vidroAtualizado = materiais?.filter((m, i) => /^(m2|m²)$/i.test(m.unidade) && m.valorUnitario !== p.materiais![i].valorUnitario && descricaoVidroCompativel(separarMm(p.vidro || ""), separarMm(m.descricao)));
      const valoresVidro = new Set(vidroAtualizado?.map(m => m.valorUnitario));
      // Preserva o ajuste monetário que já existia no total do projeto.
      return { ...p, materiais, precoVidroM2: p.precoVidroM2 != null && valoresVidro.size === 1 ? [...valoresVidro][0] : p.precoVidroM2, valorTotal: Math.round(((p.valorTotal || 0) + diferenca) * 100) / 100 };
    }),
    avulsos: avulsos.map(m => material(m)),
  };
}
