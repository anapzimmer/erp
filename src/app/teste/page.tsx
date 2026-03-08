"use client";

import { useState, useRef, useEffect } from "react";

// ─── Paleta do sistema ─────────────────────────────────────────────────────────
const C = {
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  blueMid: "#BFDBFE",
  text: "#0F172A",
  textMid: "#475569",
  textLight: "#94A3B8",
  green: "#059669",
  greenLight: "#ECFDF5",
  amber: "#D97706",
  amberLight: "#FFFBEB",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

type TrilhoTipo = "aparente" | "embutido" | "interrompido";

interface Vidro {
  id: number;
  nome: string;
  formulaL: string;
  formulaA: string;
  var_aparente: string;
  var_embutido: string;
  var_interrompido: string;
}

// ─── Ícones ───────────────────────────────────────────────────────────────────
const Ico = {
  Plus:     () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Trash:    () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
  ChevDown: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>,
  Save:     () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>,
  Glass:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  Wrench:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  Layers:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><path d="M12 2l10 6.5-10 6.5L2 8.5zM2 15l10 6.5 10-6.5M2 11.5l10 6.5 10-6.5"/></svg>,
  Window:   () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 21V9"/></svg>,
  Settings: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// ─── Tipos de trilho ──────────────────────────────────────────────────────────
const TRILHOS: { id: TrilhoTipo; label: string; cor: string }[] = [
  { id: "aparente", label: "Aparente", cor: C.blue },
  { id: "embutido", label: "Embutido", cor: C.red },
  { id: "interrompido", label: "Interrompido", cor: C.amber },
];

const ACESSORIOS_DISPONIVEIS = [
  "Espelho de Fechadura","Cremona","Dobradiça Pivô","Barra Antipânico",
  "Sensor de Abertura","Mola Aérea","Limitador de Abertura","Amortecedor","Perfil Anti-vento",
];
const PERFIS_SUGERIDOS  = ["Trilho Superior","Trilho Inferior","Montante Fixo","Montante Móvel","Travessa Superior","Travessa Inferior","Testeira","Calha","Ombreira"];
const FERRAGENS_SUGERIDAS = ["Fecho","Roldana","Escova de Vedação","Puxador","Parafuso de Regulagem","Mola","Dobradiça"];

// Valores fixos de simulação (não expostos ao usuário, só para preview)
const SIM_L = 1500, SIM_A = 2100;

// ─── Avalia fórmula ───────────────────────────────────────────────────────────
function calc(formula: string, L: number, A: number): number | null {
  if (!formula || !formula.trim()) return null;
  try {
    const expr = formula.replace(/L/g, `(${L})`).replace(/A/g, `(${A})`);
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict";return(' + expr + ')')();
    return isFinite(r) ? Math.round(r * 100) / 100 : null;
  } catch { return null; }
}

// ─── Desenho Canvas ────────────────────────────────────────────────────────────
function desenhar(canvas: HTMLCanvasElement | null, numFolhas: number, trilho: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const showEmbutido = trilho === "embutido";
  const PAD = { top: 30, right: 18, bottom: showEmbutido ? 50 : 30, left: 30 };
  const fw = W - PAD.left - PAD.right;
  const fh = H - PAD.top - PAD.bottom;
  const x0 = PAD.left, y0 = PAD.top;
  const fW = fw / numFolhas;

  // Sombra
  ctx.shadowColor = "rgba(0,0,0,0.07)"; ctx.shadowBlur = 12;
  ctx.fillStyle = "#F8FAFC"; ctx.fillRect(x0, y0, fw, fh);
  ctx.shadowBlur = 0;

  // Vidros
  for (let i = 0; i < numFolhas; i++) {
    const fx = x0 + fW * i;
    ctx.fillStyle = "#DBEAFE"; ctx.fillRect(fx + 9, y0 + 9, fW - 18, fh - 18);
    ctx.fillStyle = "rgba(191,219,254,0.35)"; ctx.fillRect(fx + 9, y0 + 9, fW - 18, fh - 18);
    // reflexo
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(fx + 14, y0 + 14, (fW - 18) * 0.28, fh - 28);
    // borda folha
    ctx.strokeStyle = "#64748B"; ctx.lineWidth = 3; ctx.strokeRect(fx + 5, y0 + 5, fW - 10, fh - 10);
    // puxador
    const pDir = i % 2 === 0;
    const px = pDir ? fx + fW - 16 : fx + 9;
    ctx.fillStyle = "#94A3B8"; ctx.beginPath(); ctx.roundRect(px, y0 + fh / 2 - 18, 5, 36, 3); ctx.fill();
    // seta
    if (numFolhas > 1) {
      const dir = i % 2 === 0 ? 1 : -1;
      const ax = fx + fW / 2, ay = y0 + fh - 12;
      ctx.fillStyle = C.blue + "CC"; ctx.beginPath();
      if (dir === 1) { ctx.moveTo(ax-9,ay-5); ctx.lineTo(ax+9,ay); ctx.lineTo(ax-9,ay+5); }
      else           { ctx.moveTo(ax+9,ay-5); ctx.lineTo(ax-9,ay); ctx.lineTo(ax+9,ay+5); }
      ctx.closePath(); ctx.fill();
    }
    // label folha
    ctx.fillStyle = "#94A3B8"; ctx.font = "600 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`F${i+1}`, fx + fW / 2, y0 + 20);
  }

  // Moldura
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 9; ctx.lineJoin = "miter"; ctx.strokeRect(x0, y0, fw, fh);

  // Divisores entre folhas
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 2.5;
  for (let i = 1; i < numFolhas; i++) {
    ctx.beginPath(); ctx.moveTo(x0 + fW * i, y0); ctx.lineTo(x0 + fW * i, y0 + fh); ctx.stroke();
  }

  // Trilho embutido: linha tracejada vermelha abaixo
  if (showEmbutido) {
    ctx.strokeStyle = "#EF4444"; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.moveTo(x0 - 4, y0 + fh + 16); ctx.lineTo(x0 + fw + 4, y0 + fh + 16); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#EF4444"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    ctx.fillText("TRILHO EMBUTIDO", x0 + fw / 2, y0 + fh + 30);
  }

  // Cotas
  ctx.strokeStyle = C.textLight; ctx.lineWidth = 1; ctx.setLineDash([]);
  // Largura
  const cY = y0 - 16;
  ctx.beginPath(); ctx.moveTo(x0, cY); ctx.lineTo(x0 + fw, cY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, cY-4); ctx.lineTo(x0, cY+4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0+fw, cY-4); ctx.lineTo(x0+fw, cY+4); ctx.stroke();
  ctx.fillStyle = C.textMid; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
  ctx.fillText("L", x0 + fw / 2, cY - 4);
  // Altura
  const cX = x0 - 16;
  ctx.beginPath(); ctx.moveTo(cX, y0); ctx.lineTo(cX, y0+fh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cX-4, y0); ctx.lineTo(cX+4, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cX-4, y0+fh); ctx.lineTo(cX+4, y0+fh); ctx.stroke();
  ctx.save(); ctx.translate(cX - 5, y0 + fh / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText("A", 0, 0); ctx.restore();
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{children}</div>;
}
function TH({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 700, color: C.textLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>{children}</div>;
}
function FInput({ value, onChange, placeholder, mono = false, style = {} }: { value: string; onChange: (val: string) => void; placeholder?: string; mono?: boolean; style?: React.CSSProperties }) {
  const [focused, setFocused] = useState(false);
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ width: "100%", border: `1px solid ${focused ? C.blue : C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: mono ? 11 : 13, color: mono ? C.blue : C.text, background: mono ? "#F8FBFF" : C.surface, fontFamily: mono ? "monospace" : "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .15s", ...style }}
    />
  );
}
function AddBtn({ onClick, txt }: { onClick: () => void; txt: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: "100%", padding: "8px", border: `1.5px dashed ${hov ? C.blue : C.borderStrong}`, borderRadius: 8, background: hov ? C.blueLight : "none", color: hov ? C.blue : C.textLight, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, fontFamily: "inherit", transition: "all .15s" }}>
      <Ico.Plus /> {txt}
    </button>
  );
}

function Section({ title, icon, accent = C.blue, badge, defaultOpen = true, hint, children }: { title: string; icon: React.ReactNode; accent?: string; badge?: number; defaultOpen?: boolean; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14, background: C.surface }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        {badge != null && <span style={{ fontSize: 10, background: accent + "18", color: accent, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{badge}</span>}
        <span style={{ color: C.textLight, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><Ico.ChevDown /></span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {hint && <p style={{ fontSize: 11, color: C.textLight, marginTop: -4, marginBottom: 12 }}>{hint}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, onUpdate, onRemove, suggestions }: { item: { id: number; nome: string; formula: string }; onUpdate: (item: { id: number; nome: string; formula: string }) => void; onRemove: () => void; suggestions: string[] }) {
  const res = calc(item.formula, SIM_L, SIM_A);
  const [showSug, setShowSug] = useState(false);
  const filtered = suggestions.filter(s => item.nome.length === 0 || s.toLowerCase().includes(item.nome.toLowerCase()));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 148px 82px 30px", gap: 7, alignItems: "center", marginBottom: 7 }}>
      {/* Nome */}
      <div style={{ position: "relative" }}>
        <FInput value={item.nome} onChange={v => { onUpdate({ ...item, nome: v }); setShowSug(true); }}
          placeholder="Nome do componente..."
          style={{ fontSize: 12 }} />
        {showSug && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 30, boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 150, overflowY: "auto" }}>
            {filtered.map(s => (
              <div key={s} onMouseDown={() => { onUpdate({ ...item, nome: s }); setShowSug(false); }}
                style={{ padding: "8px 12px", fontSize: 12, color: C.textMid, cursor: "pointer" }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = C.blueLight}
                onMouseLeave={e => (e.target as HTMLElement).style.background = "transparent"}
              >{s}</div>
            ))}
          </div>
        )}
      </div>
      {/* Fórmula */}
      <FInput value={item.formula} onChange={v => onUpdate({ ...item, formula: v })} placeholder="L - 10" mono />
      {/* Resultado */}
      <div style={{ background: res !== null ? C.greenLight : C.bg, border: `1px solid ${res !== null ? "#A7F3D0" : C.border}`, borderRadius: 8, padding: "8px 8px", textAlign: "right", fontSize: 11, fontWeight: 700, color: res !== null ? C.green : C.textLight, fontFamily: "monospace" }}>
        {res !== null ? res : "—"}
      </div>
      {/* Remover */}
      <button onClick={onRemove}
        style={{ width: 30, height: 36, background: "none", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer", color: C.textLight, display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textLight; }}
      ><Ico.Trash /></button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function CadastroTipologia() {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nome, setNome] = useState("");
  const [numFolhas, setNumFolhas] = useState(2);
  const [trilho, setTrilho] = useState<TrilhoTipo>("aparente");
  const [acessoriosSel, setAcessoriosSel] = useState<string[]>([]);
  const [perfisGerais, setPerfisGerais] = useState<{ id: number; nome: string; formula: string }[]>([]);
  const [ferragens, setFerragens] = useState<{ id: number; nome: string; formula: string }[]>([]);

  // vidros: um por folha, com formulaL/formulaA base + override por trilho
  const [vidros, setVidros] = useState([
    { id: 1, nome: "Folha 1", formulaL: "L/2 - 12", formulaA: "A - 46", var_aparente: "", var_embutido: "", var_interrompido: "" },
    { id: 2, nome: "Folha 2", formulaL: "L/2 - 12", formulaA: "A - 46", var_aparente: "", var_embutido: "", var_interrompido: "" },
  ]);

  useEffect(() => {
    setVidros(prev => {
      const next: typeof vidros = [];
      for (let i = 0; i < numFolhas; i++) {
        next.push(prev[i] || { id: Date.now() + i, nome: `Folha ${i+1}`, formulaL: `L/${numFolhas} - 12`, formulaA: "A - 46", var_aparente: "", var_embutido: "", var_interrompido: "" });
      }
      return next;
    });
  }, [numFolhas]);

  useEffect(() => { desenhar(canvasRef.current, numFolhas, trilho); }, [numFolhas, trilho]);

  const toggleAcess = (a: string) => setAcessoriosSel(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const addItem    = (list: { id: number; nome: string; formula: string }[], set: React.Dispatch<React.SetStateAction<{ id: number; nome: string; formula: string }[]>>) => set([...list, { id: Date.now(), nome: "", formula: "" }]);
  const updItem    = (list: { id: number; nome: string; formula: string }[], set: React.Dispatch<React.SetStateAction<{ id: number; nome: string; formula: string }[]>>, id: number, u: { id: number; nome: string; formula: string }) => set(list.map(i => i.id === id ? u : i));
  const remItem    = (list: { id: number; nome: string; formula: string }[], set: React.Dispatch<React.SetStateAction<{ id: number; nome: string; formula: string }[]>>, id: number) => set(list.filter(i => i.id !== id));
  const updVidro   = (id: number, field: string, val: string) => setVidros(p => p.map(v => v.id === id ? { ...v, [field]: val } : v));

  const trilhoAtivo = TRILHOS.find(t => t.id === trilho);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "13px 28px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: C.blue, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Ico.Window />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Cadastro de Tipologia</div>
          <div style={{ fontSize: 11, color: C.textLight }}>Vidraçaria · Configuração de Modelos</div>
        </div>
      </div>

      {/* Grid principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", minHeight: "calc(100vh - 62px)" }}>

        {/* ── Formulário ── */}
        <div style={{ padding: "24px 20px 40px 24px", overflowY: "auto", borderRight: `1px solid ${C.border}` }}>

          {/* Bloco topo: nome + nº folhas + trilho */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ marginBottom: 16 }}>
              <Lbl>Nome da Tipologia</Lbl>
              <FInput value={nome} onChange={setNome} placeholder="Ex: Janela Correr 2 Folhas" style={{ fontSize: 14, fontWeight: 600 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Folhas */}
              <div>
                <Lbl>Número de Folhas</Lbl>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1,2,3,4,6].map(n => (
                    <button key={n} onClick={() => setNumFolhas(n)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${numFolhas === n ? C.blue : C.border}`, background: numFolhas === n ? C.blueLight : C.surface, color: numFolhas === n ? C.blue : C.textMid, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trilho */}
              <div>
                <Lbl>Tipo de Trilho</Lbl>
                <div style={{ display: "flex", gap: 6 }}>
                  {TRILHOS.map(t => (
                    <button key={t.id} onClick={() => setTrilho(t.id)}
                      style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${trilho === t.id ? t.cor : C.border}`, background: trilho === t.id ? t.cor + "14" : C.surface, color: trilho === t.id ? t.cor : C.textMid, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Vidros por folha ── */}
          <Section title="Vidros por Folha" icon={<Ico.Glass />} accent={C.blue} badge={vidros.length}
            hint="Fórmulas de largura e altura de cada folha de vidro. Use L e A como variáveis.">
            {vidros.map((v, idx) => {
              // fórmula ativa para o trilho selecionado (override > base)
              const varKey = `var_${trilho}` as keyof Vidro;
const flAtiva = String(v[varKey] || v.formulaL);
const rL = calc(flAtiva, SIM_L, SIM_A);
              const rA = calc(v.formulaA, SIM_L, SIM_A);
              const m2 = rL && rA ? ((rL / 1000) * (rA / 1000)).toFixed(4) : null;

              return (
                <div key={v.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 11, padding: "14px 14px", marginBottom: 12 }}>
                  {/* Cabeçalho */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, background: C.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{idx+1}</div>
                    <input value={v.nome} onChange={e => updVidro(v.id, "nome", e.target.value)}
                      style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "inherit", outline: "none", flex: 1 }} />
                    {m2 && (
                      <div style={{ fontSize: 11, background: C.blueLight, color: C.blue, padding: "3px 10px", borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>{m2} m²</div>
                    )}
                  </div>

                  {/* Fórmulas largura e altura */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <Lbl>Largura do Vidro</Lbl>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <FInput value={v.formulaL} onChange={val => updVidro(v.id, "formulaL", val)} placeholder="L/2 - 12" mono style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: calc(v.formulaL,SIM_L,SIM_A) !== null ? C.green : C.textLight, fontFamily: "monospace", minWidth: 46, textAlign: "right" }}>
                          {calc(v.formulaL,SIM_L,SIM_A) ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Lbl>Altura do Vidro</Lbl>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <FInput value={v.formulaA} onChange={val => updVidro(v.id, "formulaA", val)} placeholder="A - 46" mono style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: calc(v.formulaA,SIM_L,SIM_A) !== null ? C.green : C.textLight, fontFamily: "monospace", minWidth: 46, textAlign: "right" }}>
                          {calc(v.formulaA,SIM_L,SIM_A) ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Variação por trilho */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    <Lbl>Variação da Largura por Trilho</Lbl>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      {TRILHOS.map(t => {
                                  const varKey = `var_${t.id}` as keyof Vidro;
                                  const isAtivo = trilho === t.id;
                                  const rVar = calc(String(v[varKey] || ""), SIM_L, SIM_A);
                        return (
                          <div key={t.id} style={{ background: isAtivo ? t.cor + "10" : C.surface, border: `1px solid ${isAtivo ? t.cor : C.border}`, borderRadius: 8, padding: "8px 9px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: isAtivo ? t.cor : C.textLight, letterSpacing: "0.08em", marginBottom: 5 }}>
                              {t.label.toUpperCase()} {isAtivo && "●"}
                            </div>
                            <input value={v[varKey] || ""} onChange={e => updVidro(v.id, varKey, e.target.value)}
                              placeholder={isAtivo ? "sobrescreve base" : "— opcional —"}
                              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 7px", fontSize: 10, color: t.cor, fontFamily: "monospace", background: "transparent", outline: "none", boxSizing: "border-box" }}
                              onFocus={e => e.target.style.borderColor = t.cor}
                              onBlur={e => e.target.style.borderColor = C.border}
                            />
                            {rVar !== null && (
                              <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", marginTop: 3, textAlign: "right", fontWeight: 700 }}>{rVar}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: C.textLight, marginTop: 6 }}>
                      Preencha para <strong>sobrescrever</strong> a fórmula base da largura quando o trilho selecionado for diferente.
                    </div>
                  </div>
                </div>
              );
            })}
          </Section>

          {/* ── Perfis ── */}
          <Section title="Perfis" icon={<Ico.Layers />} accent={C.purple} badge={perfisGerais.length}
            hint="Perfis da estrutura (trilhos, montantes, travessas...). Fórmula calculada em mm.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 148px 82px 30px", gap: 7, paddingBottom: 8 }}>
              <TH>Componente</TH><TH>Fórmula</TH><TH>Resultado</TH><span/>
            </div>
            {perfisGerais.map(item => (
              <ItemRow key={item.id} item={item} suggestions={PERFIS_SUGERIDOS}
                onUpdate={u => updItem(perfisGerais, setPerfisGerais, item.id, u)}
                onRemove={() => remItem(perfisGerais, setPerfisGerais, item.id)} />
            ))}
            <AddBtn onClick={() => addItem(perfisGerais, setPerfisGerais)} txt="Adicionar Perfil" />
          </Section>

          {/* ── Ferragens ── */}
          <Section title="Ferragens" icon={<Ico.Wrench />} accent={C.amber} badge={ferragens.length}
            hint="Fechos, roldanas, puxadores e demais ferragens.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 148px 82px 30px", gap: 7, paddingBottom: 8 }}>
              <TH>Ferragem</TH><TH>Qtde / Fórmula</TH><TH>Resultado</TH><span/>
            </div>
            {ferragens.map(item => (
              <ItemRow key={item.id} item={item} suggestions={FERRAGENS_SUGERIDAS}
                onUpdate={u => updItem(ferragens, setFerragens, item.id, u)}
                onRemove={() => remItem(ferragens, setFerragens, item.id)} />
            ))}
            <AddBtn onClick={() => addItem(ferragens, setFerragens)} txt="Adicionar Ferragem" />
          </Section>

          {/* ── Acessórios ── */}
          <Section title="Acessórios" icon={<Ico.Settings />} accent={C.green} badge={acessoriosSel.length} defaultOpen={false}
            hint="Acessórios opcionais que podem ser incluídos nesta tipologia.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ACESSORIOS_DISPONIVEIS.map(a => {
                const sel = acessoriosSel.includes(a);
                return (
                  <button key={a} onClick={() => toggleAcess(a)}
                    style={{ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLight : C.surface, color: sel ? C.green : C.textMid, fontSize: 12, fontWeight: sel ? 700 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    {sel && "✓ "}{a}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Salvar */}
          <button
            style={{ width: "100%", padding: 14, background: C.blue, border: "none", borderRadius: 12, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(37,99,235,.22)", transition: "opacity .15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity=".88"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}
          >
            <Ico.Save /> Salvar Tipologia
          </button>
        </div>

        {/* ── Painel Direito: Desenho + Resumo ── */}
        <div style={{ padding: "24px 20px", background: C.bg, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Canvas */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 10, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 4 }}>
              <span style={{ fontSize: 10, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em" }}>VISUALIZAÇÃO TÉCNICA</span>
              {trilhoAtivo && (
                <span style={{ fontSize: 11, background: trilhoAtivo.cor + "18", color: trilhoAtivo.cor, padding: "3px 10px", borderRadius: 8, fontWeight: 700 }}>
                  {trilhoAtivo.label}
                </span>
              )}
            </div>
            <canvas ref={canvasRef} width={360} height={210} style={{ width: "100%", display: "block", borderRadius: 8 }} />
          </div>

          {/* Referência de variáveis */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>VARIÁVEIS DE FÓRMULA</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {["L","A","L/2","A/2","L/3","L/4","A/3"].map(v => (
                <code key={v} style={{ background: C.blueLight, color: C.blue, padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{v}</code>
              ))}
              <code style={{ background: C.bg, color: C.textMid, padding: "3px 9px", borderRadius: 6, fontSize: 11 }}>+ − × / ( )</code>
            </div>
            <div style={{ fontSize: 10, color: C.textLight }}>
              Preview automático com <strong style={{ color: C.textMid }}>L=1500 / A=2100</strong> mm
            </div>
          </div>

          {/* Resumo em tempo real */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", flex: 1 }}>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>RESUMO</div>

            {nome && (
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{nome}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
  {numFolhas} folha{numFolhas > 1 ? "s" : ""} · {trilhoAtivo?.label || ""}
</div>
              </div>
            )}

            {/* Vidros */}
            {vidros.some(v => v.formulaL || v.formulaA) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>VIDROS</div>
                {vidros.map(v => {
                  const flAtiva = String(v[`var_${trilho}`] || v.formulaL);
                  const rL = calc(flAtiva, SIM_L, SIM_A);
                  const rA = calc(v.formulaA, SIM_L, SIM_A);
                  const m2 = rL && rA ? ((rL/1000)*(rA/1000)).toFixed(4) : null;
                  return (
                    <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.textMid }}>{v.nome}</span>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
  {numFolhas} folha{numFolhas > 1 ? "s" : ""} · {trilhoAtivo?.label || "Selecione"}
</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Perfis */}
            {perfisGerais.filter(p => p.nome).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>PERFIS</div>
                {perfisGerais.filter(p => p.nome).map(p => {
                  const r = calc(p.formula, SIM_L, SIM_A);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.textMid }}>{p.nome}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r !== null ? C.green : C.textLight, fontFamily: "monospace" }}>{r !== null ? `${r} mm` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ferragens */}
            {ferragens.filter(f => f.nome).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>FERRAGENS</div>
                {ferragens.filter(f => f.nome).map(f => {
                  const r = calc(f.formula, SIM_L, SIM_A);
                  return (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.textMid }}>{f.nome}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r !== null ? C.green : C.textLight, fontFamily: "monospace" }}>{r !== null ? `${r}` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Acessórios */}
            {acessoriosSel.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>ACESSÓRIOS</div>
                {acessoriosSel.map(a => (
                  <div key={a} style={{ fontSize: 12, color: C.textMid, padding: "4px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
                    <span style={{ color: C.green }}>✓</span> {a}
                  </div>
                ))}
              </div>
            )}

            {!nome && perfisGerais.length === 0 && ferragens.length === 0 && vidros.every(v => !v.formulaL) && (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.textLight, fontSize: 12 }}>
                Preencha os dados ao lado<br />para ver o resumo aqui.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
