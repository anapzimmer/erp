"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, PencilLine, Trash2, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { ProjetoIndividualMaterial } from "@/app/relatorios/projetoindividual/ProjetoIndividualPDF";
import { atualizarPerfilExtra, atualizarPerfisExtras, type PerfilExtra, type MedidasPerfilExtra } from "@/utils/perfisExtras";
import { normalizarPrecoCatalogo } from "@/utils/precos";

type Perfil = { id: string | number; codigo?: string | null; nome: string; nome_completo?: string | null; cores?: string | null; preco?: number | null };
type Props = MedidasPerfilExtra & { perfis: Perfil[]; materiais: ProjetoIndividualMaterial[]; setMateriais: Dispatch<SetStateAction<ProjetoIndividualMaterial[]>> };
const inicial: PerfilExtra = { perfilId: "", referencia: "altura", medidaManual: 1000, ajuste: 0, quantidadePorVao: 1 };
const rotulo = (p: Perfil) => `${p.codigo || ""} - ${p.nome_completo || p.nome}${p.cores ? ` | ${p.cores}` : ""}`.toUpperCase();

export default function PerfisExtrasProjeto({ perfis, materiais, setMateriais, altura, largura, quantidade }: Props) {
  const { theme } = useTheme();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<PerfilExtra>(inicial);
  const [erro, setErro] = useState("");
  const extras = materiais.filter(item => item.perfilExtra);
  const medidaBase = form.referencia === "manual" ? form.medidaManual : form.referencia === "altura" ? altura : largura;
  const medidaFinal = medidaBase + form.ajuste;
  const pecasTotais = form.quantidadePorVao * quantidade;
  useEffect(() => { setMateriais(lista => atualizarPerfisExtras(lista, { altura, largura, quantidade })); }, [altura, largura, quantidade, materiais, setMateriais]);
  const salvar = () => {
    const perfil = perfis.find(p => String(p.id) === form.perfilId);
    const base = form.referencia === "manual" ? form.medidaManual : form.referencia === "altura" ? altura : largura;
    if (!perfil) { setErro("Selecione um perfil do cadastro."); return; }
    if (!Number.isFinite(base + form.ajuste) || base + form.ajuste <= 0 || !Number.isInteger(form.quantidadePorVao) || form.quantidadePorVao < 1 || form.quantidadePorVao > 100 || !Number.isInteger(quantidade) || quantidade < 1) {
      setErro("Informe uma medida positiva, a quantidade de vãos e de 1 a 100 peças por vão."); return;
    }
    const existente = materiais.find(item => item.id === editando);
    const item = atualizarPerfilExtra({
      id: editando || crypto.randomUUID(), qtd: 0, unidade: "barra",
      descricao: `${rotulo(perfil)} [PERFIL EXTRA]`,
      valorUnitario: existente?.perfilExtra?.perfilId === form.perfilId ? existente.valorUnitario : normalizarPrecoCatalogo(perfil.preco),
      codigoPerfil: perfil.codigo || String(perfil.id), comprimentoBarra: 6000, perfilExtra: { ...form },
    }, { altura, largura, quantidade });
    setMateriais(lista => editando ? lista.map(atual => atual.id === editando ? item : atual) : [...lista, item]);
    setAberto(false); setEditando(null); setErro("");
  };
  const campo = { backgroundColor: theme.screenBackgroundColor, color: theme.contentTextLightBg };
  return <section className="rounded-2xl border border-slate-200 bg-white p-4" style={{ color: theme.contentTextLightBg }}>
    <div className="flex items-center justify-between gap-3"><span>Perfis extras do projeto</span><button type="button" className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setForm(inicial); setEditando(null); setErro(""); setAberto(true); }}><Plus size={16} />Adicionar perfil extra</button></div>
    {extras.map(item => <div key={item.id} className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><div><p>{item.descricao}</p><p className="mt-1 opacity-70">{item.perfilExtra?.referencia} · {item.perfilExtra?.quantidadePorVao} peça(s) por vão · {item.cortes?.length || 0} corte(s) · {item.cortes?.[0] || 0} mm{item.perfilExtra?.ajuste ? ` · ajuste ${item.perfilExtra.ajuste} mm` : ""}</p></div><div className="flex gap-2"><button type="button" aria-label="Editar perfil extra" onClick={() => { setForm(item.perfilExtra!); setEditando(item.id); setErro(""); setAberto(true); }}><PencilLine size={17} /></button><button type="button" aria-label="Excluir perfil extra" onClick={() => setMateriais(lista => lista.filter(atual => atual.id !== item.id))}><Trash2 size={17} /></button></div></div>)}
    {aberto && <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <div className="flex justify-between"><span>{editando ? "Editar perfil extra" : "Novo perfil extra"}</span><button type="button" aria-label="Fechar formulário" onClick={() => setAberto(false)}><X size={18} /></button></div>
      <label className="block text-sm">Perfil<select style={campo} className="mt-1 w-full rounded-lg border p-2" value={form.perfilId} onChange={e => setForm({ ...form, perfilId: e.target.value })}><option value="">Selecione o perfil e a cor</option>{perfis.map(p => <option key={p.id} value={String(p.id)}>{rotulo(p)}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-sm">Usar medida<select style={campo} className="mt-1 w-full rounded-lg border p-2" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value as PerfilExtra["referencia"] })}><option value="altura">Altura do vão</option><option value="largura">Largura do vão</option><option value="manual">Manual</option></select></label>
        {form.referencia === "manual" && <label className="text-sm">Medida (mm)<input style={campo} className="mt-1 w-full rounded-lg border p-2" type="number" min="1" value={form.medidaManual} onChange={e => setForm({ ...form, medidaManual: Number(e.target.value) })} /></label>}
        <label className="text-sm">Ajuste (mm)<input style={campo} className="mt-1 w-full rounded-lg border p-2" type="number" value={form.ajuste} onChange={e => setForm({ ...form, ajuste: Number(e.target.value) })} /></label>
        <label className="text-sm">Peças por vão<input style={campo} className="mt-1 w-full rounded-lg border p-2" type="number" min="1" max="100" value={form.quantidadePorVao} onChange={e => setForm({ ...form, quantidadePorVao: Number(e.target.value) })} /></label>
      </div>
      {Number.isFinite(medidaFinal) && medidaFinal > 0 && Number.isInteger(pecasTotais) && pecasTotais > 0 && <p aria-live="polite" className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        {pecasTotais} peça(s) de {Math.ceil(medidaFinal).toLocaleString("pt-BR")} mm no total ({form.quantidadePorVao} por vão).
      </p>}
      <p className="text-xs opacity-70">Barras de 6.000 mm. Os cortes acompanham as medidas e a quantidade de vãos e entram no aproveitamento da central. Ajustes negativos descontam milímetros.</p>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50" onClick={salvar}>{editando ? "Aplicar alteração" : "Adicionar ao projeto"}</button>
    </div>}
  </section>;
}
