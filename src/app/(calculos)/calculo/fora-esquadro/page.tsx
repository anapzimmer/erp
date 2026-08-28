"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Calculator, Eraser, FilePlus2, Layers3, Printer, Search, TriangleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { ForaEsquadroPDF } from "@/app/relatorios/foraesquadro/ForaEsquadroPDF";
import { supabase } from "@/lib/supabaseClient";
import { localizarVidroPorDescricao } from "@/utils/vidros";
import { normalizarPrecoCatalogo } from "@/utils/precos";

type PecaForaEsquadro = {
  indice: number;
  largura: number;
  alturaEsquerda: number;
  alturaDireita: number;
  queda: number;
  larguraCalculo: number;
  alturaCalculo: number;
  area: number;
};

type ClienteCadastro = {
  id: string;
  nome: string;
  grupo_preco_id?: string | null;
};

type VidroCadastro = {
  id: string;
  nome: string;
  espessura?: string | number | null;
  tipo?: string | null;
  preco?: number | null;
};

type PrecoVidroGrupo = {
  vidro_id: string;
  grupo_preco_id: string | null;
  preco: number;
};

const CENTRAL_IMPRESSAO_KEY = "glasscode:central-impressao:composicao";
const CENTRAL_IMPRESSAO_CLIENTE_KEY = "glasscode:central-impressao:cliente";

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const limitarNumero = (valor: string, maxDigitos = 5) =>
  Number(String(valor || "").replace(/\D/g, "").slice(0, maxDigitos)) || 0;

const formatarMm = (valor: number) =>
  `${Math.round(Number(valor || 0)).toLocaleString("pt-BR")} mm`;

const formatarM2 = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const arredondarVidro50 = (valor: number) => Math.ceil(Math.max(0, Number(valor || 0)) / 50) * 50;

const criarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

const formatarVidroCadastro = (vidro: VidroCadastro) => {
  const espessura = vidro.espessura ? String(vidro.espessura).replace(/\s*mm$/i, "") : "";
  const tipo = vidro.tipo ? String(vidro.tipo).trim() : "";
  return [vidro.nome, espessura ? `${espessura}mm` : "", tipo].filter(Boolean).join(" ");
};

const calcularPecas = ({
  largura,
  alturaInicial,
  alturaFinal,
  divisoes,
}: {
  largura: number;
  alturaInicial: number;
  alturaFinal: number;
  divisoes: number;
}): PecaForaEsquadro[] => {
  const totalDivisoes = Math.max(1, Math.min(12, Math.floor(divisoes || 1)));
  const larguraPeca = largura / totalDivisoes;
  const quedaPorDivisao = (alturaInicial - alturaFinal) / totalDivisoes;

  return Array.from({ length: totalDivisoes }, (_, index) => {
    const alturaEsquerda = alturaInicial - quedaPorDivisao * index;
    const alturaDireita = alturaInicial - quedaPorDivisao * (index + 1);
    const larguraCalculo = arredondarVidro50(larguraPeca);
    const alturaCalculo = arredondarVidro50(Math.max(alturaEsquerda, alturaDireita) + 50);
    const area = (larguraCalculo * alturaCalculo) / 1_000_000;

    return {
      indice: index + 1,
      largura: larguraPeca,
      alturaEsquerda,
      alturaDireita,
      queda: quedaPorDivisao,
      larguraCalculo,
      alturaCalculo,
      area,
    };
  });
};

const gerarDesenhoForaEsquadroUrl = ({
  largura,
  alturaInicial,
  alturaFinal,
  divisoes,
  pecas,
}: {
  largura: number;
  alturaInicial: number;
  alturaFinal: number;
  divisoes: number;
  pecas: PecaForaEsquadro[];
}) => {
  const svgW = 920;
  const svgH = 520;
  const padX = 92;
  const padTop = 62;
  const padBottom = 92;
  const drawW = svgW - padX * 2;
  const maxAltura = Math.max(alturaInicial, alturaFinal, 1);
  const minAltura = Math.min(alturaInicial, alturaFinal);
  const drawH = svgH - padTop - padBottom;
  const x0 = padX;
  const yBase = padTop + drawH;
  const yInicial = yBase - (alturaInicial / maxAltura) * drawH;
  const yFinal = yBase - (alturaFinal / maxAltura) * drawH;
  const totalDivisoes = Math.max(1, Math.min(12, Math.floor(divisoes || 1)));
  const panelW = drawW / totalDivisoes;
  const pontos = `${x0},${yBase} ${x0 + drawW},${yBase} ${x0 + drawW},${yFinal} ${x0},${yInicial}`;
  const yTopoEm = (index: number) => yInicial + (yFinal - yInicial) * (index / totalDivisoes);
  const linhasDivisao = Array.from({ length: Math.max(totalDivisoes - 1, 0) }, (_, index) => {
    const posicao = index + 1;
    const x = x0 + panelW * posicao;
    const yTop = yTopoEm(posicao);
    const altura = pecas[index]?.alturaDireita ?? 0;

    return `
      <g>
        <line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBase}" stroke="#b9c9d4" stroke-width="1.8" opacity="0.82"/>
        <text x="${x + 8}" y="${yTop - 10}" font-size="18" font-family="Segoe UI, Arial" fill="#0f2742">${Math.round(altura)}</text>
      </g>
    `;
  }).join("");

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <defs>
        <linearGradient id="vidroForaEsquadro" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#dff1f8"/>
          <stop offset="100%" stop-color="#eef8fc"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${svgW}" height="${svgH}" rx="28" fill="#f8fafc"/>
      <polygon points="${pontos}" fill="url(#vidroForaEsquadro)" stroke="#b9c9d4" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="${pontos}" fill="none" stroke="#e4eef4" stroke-width="13" stroke-linejoin="round" opacity="0.95"/>
      <polygon points="${pontos}" fill="none" stroke="#b9c9d4" stroke-width="1.4" stroke-linejoin="round" opacity="0.78"/>
      <line x1="${x0 + 44}" y1="${yInicial + 44}" x2="${x0 + drawW * 0.68}" y2="${yTopoEm(totalDivisoes * 0.68) + 54}" stroke="#ffffff" stroke-width="8" opacity="0.22"/>
      <line x1="${x0 + drawW * 0.38}" y1="${yTopoEm(totalDivisoes * 0.38) + 58}" x2="${x0 + drawW - 64}" y2="${yFinal + 72}" stroke="#ffffff" stroke-width="6" opacity="0.24"/>
      ${linhasDivisao}
      <line x1="${x0}" y1="${yBase + 32}" x2="${x0 + drawW}" y2="${yBase + 32}" stroke="#2086e8" stroke-width="1.6"/>
      <line x1="${x0}" y1="${yBase + 22}" x2="${x0}" y2="${yBase + 42}" stroke="#2086e8" stroke-width="1.6"/>
      <line x1="${x0 + drawW}" y1="${yBase + 22}" x2="${x0 + drawW}" y2="${yBase + 42}" stroke="#2086e8" stroke-width="1.6"/>
      <text x="${x0 + drawW / 2}" y="${yBase + 62}" text-anchor="middle" font-size="21" font-family="Segoe UI, Arial" font-weight="500" fill="#0f2742">${formatarMm(largura)}</text>
      <text x="${x0 + 14}" y="${(yInicial + yBase) / 2}" text-anchor="start" font-size="19" font-family="Segoe UI, Arial" fill="#0f2742">${formatarMm(alturaInicial)}</text>
      <text x="${x0 + drawW - 14}" y="${(yFinal + yBase) / 2}" text-anchor="end" font-size="19" font-family="Segoe UI, Arial" fill="#0f2742">${formatarMm(alturaFinal)}</text>
      ${
        minAltura === 0
          ? `<text x="${x0 + drawW - 8}" y="${yBase - 10}" text-anchor="end" font-size="15" font-family="Segoe UI, Arial" fill="#64748b">termina em zero</text>`
          : ""
      }
    </svg>
  `);
};

function CampoMedida({
  label,
  value,
  suffix = "mm",
  maxDigitos = 5,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  maxDigitos?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 transition focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
      <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="mt-1.5 flex items-end gap-2">
        <input
          type="number"
          min={0}
          value={value}
          inputMode="numeric"
          onKeyDown={(event) => {
            if (["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault();
          }}
          onChange={(event) => onChange(limitarNumero(event.target.value, maxDigitos))}
          className="w-full min-w-0 bg-transparent text-lg font-medium leading-tight text-[#0f2742] outline-none"
        />
        <span className="pb-0.5 text-xs font-medium text-slate-500">{suffix}</span>
      </span>
    </label>
  );
}

function ResumoCard({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{titulo}</p>
      <p className="mt-2 text-xl font-medium leading-tight text-[#0f2742]">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detalhe}</p>
    </article>
  );
}

function CampoBusca<T extends { id: string }>({
  label,
  value,
  placeholder,
  itens,
  carregando,
  formatar,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  itens: T[];
  carregando?: boolean;
  formatar: (item: T) => string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <label className="relative rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 transition focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
      <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <Search size={15} className="text-slate-400" />
        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => setAberto(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setAberto(true);
          }}
          className="w-full min-w-0 bg-transparent text-sm font-medium leading-tight text-[#0f2742] outline-none placeholder:text-slate-400"
        />
      </span>

      {aberto ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {carregando ? (
            <div className="px-3 py-2.5 text-xs text-slate-500">Carregando...</div>
          ) : itens.length > 0 ? (
            itens.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(item);
                  setAberto(false);
                }}
                className="block w-full px-3 py-2.5 text-left text-xs font-medium text-[#0f2742] transition hover:bg-sky-50"
              >
                {formatar(item)}
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-xs text-slate-500">Nenhum resultado encontrado.</div>
          )}
        </div>
      ) : null}
    </label>
  );
}

function DesenhoForaEsquadro({
  largura,
  alturaInicial,
  alturaFinal,
  divisoes,
  pecas,
}: {
  largura: number;
  alturaInicial: number;
  alturaFinal: number;
  divisoes: number;
  pecas: PecaForaEsquadro[];
}) {
  const svgW = 920;
  const svgH = 520;
  const padX = 92;
  const padTop = 62;
  const padBottom = 92;
  const drawW = svgW - padX * 2;
  const maxAltura = Math.max(alturaInicial, alturaFinal, 1);
  const minAltura = Math.min(alturaInicial, alturaFinal);
  const drawH = svgH - padTop - padBottom;
  const x0 = padX;
  const yBase = padTop + drawH;
  const yInicial = yBase - (alturaInicial / maxAltura) * drawH;
  const yFinal = yBase - (alturaFinal / maxAltura) * drawH;
  const totalDivisoes = Math.max(1, Math.min(12, Math.floor(divisoes || 1)));
  const panelW = drawW / totalDivisoes;
  const pontos = `${x0},${yBase} ${x0 + drawW},${yBase} ${x0 + drawW},${yFinal} ${x0},${yInicial}`;

  const yTopoEm = (index: number) => {
    const proporcao = index / totalDivisoes;
    return yInicial + (yFinal - yInicial) * proporcao;
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">Vista frontal</p>
          <h2 className="mt-1 text-lg font-medium text-[#0f2742]">Desenho fora de esquadro</h2>
        </div>
        <TriangleRight className="text-slate-400" size={25} strokeWidth={1.8} />
      </div>

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" role="img" aria-label="Desenho do vidro fora de esquadro">
        <defs>
          <linearGradient id="vidroForaEsquadro" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dff1f8" />
            <stop offset="100%" stopColor="#eef8fc" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={svgW} height={svgH} rx="28" fill="#f8fafc" />
        <polygon points={pontos} fill="url(#vidroForaEsquadro)" stroke="#b9c9d4" strokeWidth="2.4" strokeLinejoin="round" />
        <polygon points={pontos} fill="none" stroke="#e4eef4" strokeWidth="13" strokeLinejoin="round" opacity="0.95" />
        <polygon points={pontos} fill="none" stroke="#b9c9d4" strokeWidth="1.4" strokeLinejoin="round" opacity="0.78" />
        <line x1={x0 + 44} y1={yInicial + 44} x2={x0 + drawW * 0.68} y2={yTopoEm(totalDivisoes * 0.68) + 54} stroke="#ffffff" strokeWidth="8" opacity="0.22" />
        <line x1={x0 + drawW * 0.38} y1={yTopoEm(totalDivisoes * 0.38) + 58} x2={x0 + drawW - 64} y2={yFinal + 72} stroke="#ffffff" strokeWidth="6" opacity="0.24" />

        {Array.from({ length: Math.max(totalDivisoes - 1, 0) }, (_, index) => {
          const posicao = index + 1;
          const x = x0 + panelW * posicao;
          const yTop = yTopoEm(posicao);
          const altura = pecas[index]?.alturaDireita ?? 0;

          return (
            <g key={posicao}>
              <line x1={x} y1={yTop} x2={x} y2={yBase} stroke="#b9c9d4" strokeWidth="1.8" opacity="0.82" />
              <text x={x + 8} y={yTop - 10} fontSize="18" fontFamily="Segoe UI, Arial" fill="#0f2742">
                {Math.round(altura)}
              </text>
            </g>
          );
        })}

        <line x1={x0} y1={yBase + 32} x2={x0 + drawW} y2={yBase + 32} stroke="#2086e8" strokeWidth="1.6" />
        <line x1={x0} y1={yBase + 22} x2={x0} y2={yBase + 42} stroke="#2086e8" strokeWidth="1.6" />
        <line x1={x0 + drawW} y1={yBase + 22} x2={x0 + drawW} y2={yBase + 42} stroke="#2086e8" strokeWidth="1.6" />
        <text x={x0 + drawW / 2} y={yBase + 62} textAnchor="middle" fontSize="21" fontFamily="Segoe UI, Arial" fontWeight="500" fill="#0f2742">
          {formatarMm(largura)}
        </text>

        <text x={x0 + 14} y={(yInicial + yBase) / 2} textAnchor="start" fontSize="19" fontFamily="Segoe UI, Arial" fill="#0f2742">
          {formatarMm(alturaInicial)}
        </text>
        <text x={x0 + drawW - 14} y={(yFinal + yBase) / 2} textAnchor="end" fontSize="19" fontFamily="Segoe UI, Arial" fill="#0f2742">
          {formatarMm(alturaFinal)}
        </text>

        {minAltura === 0 ? (
          <text x={x0 + drawW - 8} y={yBase - 10} textAnchor="end" fontSize="15" fontFamily="Segoe UI, Arial" fill="#64748b">
            termina em zero
          </text>
        ) : null}
      </svg>
    </article>
  );
}

export default function ForaEsquadroPage() {
  const router = useRouter();
  const { user, empresaId, nomeEmpresa, loading, signOut } = useAuth();
  const { theme } = useTheme();
  const [largura, setLargura] = useState(2000);
  const [alturaInicial, setAlturaInicial] = useState(1000);
  const [alturaFinal, setAlturaFinal] = useState(200);
  const [quantidade, setQuantidade] = useState(1);
  const [divisoes, setDivisoes] = useState(3);
  const [mostrarPreco, setMostrarPreco] = useState(false);
  const [clientes, setClientes] = useState<ClienteCadastro[]>([]);
  const [vidros, setVidros] = useState<VidroCadastro[]>([]);
  const [precosVidroGrupos, setPrecosVidroGrupos] = useState<PrecoVidroGrupo[]>([]);
  const [clienteBusca, setClienteBusca] = useState("");
  const [vidroBusca, setVidroBusca] = useState("");
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [carregandoVidros, setCarregandoVidros] = useState(false);

  const pecas = useMemo(
    () => calcularPecas({ largura, alturaInicial, alturaFinal, divisoes }),
    [alturaFinal, alturaInicial, divisoes, largura]
  );
  const desenhoAtualUrl = useMemo(
    () =>
      gerarDesenhoForaEsquadroUrl({
        largura,
        alturaInicial,
        alturaFinal,
        divisoes,
        pecas,
      }),
    [alturaFinal, alturaInicial, divisoes, largura, pecas]
  );

  const areaPorVao = useMemo(() => pecas.reduce((total, peca) => total + peca.area, 0), [pecas]);
  const areaTotal = areaPorVao * Math.max(1, quantidade || 1);
  const quedaTotal = alturaInicial - alturaFinal;
  const quedaPorDivisao = quedaTotal / Math.max(1, divisoes || 1);
  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.nome === clienteBusca) || null,
    [clienteBusca, clientes]
  );
  const vidroSelecionado = useMemo(
    () => localizarVidroPorDescricao(vidros, vidroBusca, formatarVidroCadastro),
    [vidroBusca, vidros]
  );
  const precoVidroM2 = useMemo(() => {
    if (!vidroSelecionado) return 0;

    const precoGrupo = clienteSelecionado?.grupo_preco_id
      ? precosVidroGrupos.find(
          (preco) =>
            String(preco.vidro_id) === String(vidroSelecionado.id) &&
            String(preco.grupo_preco_id) === String(clienteSelecionado.grupo_preco_id)
        )
      : null;

    return normalizarPrecoCatalogo(precoGrupo?.preco ?? vidroSelecionado.preco ?? 0);
  }, [clienteSelecionado, precosVidroGrupos, vidroSelecionado]);
  const valorTotal = areaTotal * precoVidroM2;

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 8);
    return clientes.filter((cliente) => cliente.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [clienteBusca, clientes]);

  const vidrosFiltrados = useMemo(() => {
    const termo = vidroBusca.trim().toLowerCase();
    if (!termo) return vidros.slice(0, 8);
    return vidros.filter((vidro) => formatarVidroCadastro(vidro).toLowerCase().includes(termo)).slice(0, 8);
  }, [vidroBusca, vidros]);

  useEffect(() => {
    let ativo = true;

    const carregarCadastros = async () => {
      if (!empresaId) return;

      setCarregandoClientes(true);
      setCarregandoVidros(true);

      const [
        { data: clientesData, error: clientesError },
        { data: vidrosData, error: vidrosError },
        { data: precosData, error: precosError },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, grupo_preco_id")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
        supabase
          .from("vidros")
          .select("id, nome, espessura, tipo, preco")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true }),
        supabase
          .from("vidro_precos_grupos")
          .select("vidro_id, grupo_preco_id, preco")
          .eq("empresa_id", empresaId),
      ]);

      if (!ativo) return;

      if (clientesError) {
        console.error("Erro ao carregar clientes:", clientesError);
        setClientes([]);
      } else {
        setClientes((clientesData || []) as ClienteCadastro[]);
      }

      if (vidrosError) {
        console.error("Erro ao carregar vidros:", vidrosError);
        setVidros([]);
      } else {
        setVidros((vidrosData || []) as VidroCadastro[]);
      }

      if (precosError) {
        console.error("Erro ao carregar preços por tabela:", precosError);
        setPrecosVidroGrupos([]);
      } else {
        setPrecosVidroGrupos((precosData || []) as PrecoVidroGrupo[]);
      }

      setCarregandoClientes(false);
      setCarregandoVidros(false);
    };

    carregarCadastros();

    return () => {
      ativo = false;
    };
  }, [empresaId]);

  const enviarParaCentral = () => {
    if (!vidroSelecionado || !precoVidroM2) {
      setMostrarPreco(true);
      return;
    }

    const quantidadeVaos = Math.max(1, quantidade || 1);
    const vidroDescricao = formatarVidroCadastro(vidroSelecionado);
    const vidrosAvulsos = pecas.map((peca) => {
      const valorPeca = peca.area * precoVidroM2 * quantidadeVaos;
      const larguraReal = Math.round(peca.largura);
      const alturaMaiorReal = Math.round(Math.max(peca.alturaEsquerda, peca.alturaDireita));
      return {
        id: criarId(),
        quantidade: quantidadeVaos,
        medida: `${larguraReal} x ${alturaMaiorReal} mm`,
        vidro: vidroDescricao,
        valorTotal: Number(valorPeca.toFixed(2)),
      };
    });

    const medidasDetalhadas = pecas
      .map(
        (peca) =>
          `Peça ${peca.indice}: real ${formatarMm(peca.largura)} | ${formatarMm(peca.alturaEsquerda)} / ${formatarMm(
            peca.alturaDireita
          )} - cálculo ${Math.round(peca.larguraCalculo)} x ${Math.round(peca.alturaCalculo)} mm`
      )
      .join("\n");

    const materiais = [
      {
        id: criarId(),
        qtd: Number(areaTotal.toFixed(3)),
        unidade: "m2",
        descricao: `VIDRO FORA DE ESQUADRO ${vidroDescricao}`.toUpperCase(),
        valorUnitario: precoVidroM2,
      },
    ];

    const itemCentral = {
      id: criarId(),
      numero: "novo",
      projeto: "Vidros avulsos - fora de esquadro",
      cliente: clienteSelecionado?.nome || "",
      medidas: `${pecas.length * quantidadeVaos} peça(s) | ${formatarM2(areaTotal)} m²`,
      largura,
      altura: Math.max(alturaInicial, alturaFinal),
      alturaInicial,
      alturaFinal,
      quantidade: quantidadeVaos,
      modo: "Vidro",
      desenhoUrl: desenhoAtualUrl,
      vidro: vidroDescricao,
      corKit: "",
      corPerfil: "",
      trilho: "",
      puxador: "",
      tamanhoPuxador: "",
      trinco: "",
      pecasDivisao: pecas.length,
      medidasDetalhadas,
      foraEsquadroPecas: pecas,
      vidrosAvulsos,
      valorTotal: Number(valorTotal.toFixed(2)),
      materiais,
      origemRota: "/calculo/fora-esquadro",
      origemTipo: "fora-esquadro",
    };

    try {
      const salvo = window.localStorage.getItem(CENTRAL_IMPRESSAO_KEY);
      const lista = salvo ? JSON.parse(salvo) : [];
      window.localStorage.setItem(CENTRAL_IMPRESSAO_KEY, JSON.stringify([...lista, itemCentral]));
      if (clienteSelecionado?.nome) window.localStorage.setItem(CENTRAL_IMPRESSAO_CLIENTE_KEY, clienteSelecionado.nome);
      router.push("/central-impressao");
    } catch (erro) {
      console.warn("Não foi possível enviar o fora de esquadro para a central:", erro);
    }
  };

  const limpar = () => {
    setLargura(0);
    setAlturaInicial(0);
    setAlturaFinal(0);
    setQuantidade(1);
    setDivisoes(1);
    setVidroBusca("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4"
          style={{
            borderTopColor: "transparent",
            borderRightColor: theme.menuBackgroundColor,
            borderBottomColor: theme.menuBackgroundColor,
            borderLeftColor: theme.menuBackgroundColor,
          }}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen text-[#0f2742]" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <Header
        nomeEmpresa={nomeEmpresa}
        usuarioEmail={user?.email || ""}
        handleSignOut={signOut}
        logoUrl={theme.logoLightUrl}
      />

      <section className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 p-4 md:p-6 print:px-0">
        <section
          className="rounded-3xl border p-4 shadow-sm md:p-5"
          style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}12` }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]"
                  style={{ backgroundColor: `${theme.menuIconColor}10`, color: theme.menuIconColor }}
                >
                  <Calculator size={14} />
                  Fora de esquadro
                </div>
                <h1 className="mt-2 text-xl font-medium leading-tight md:text-2xl" style={{ color: theme.contentTextLightBg }}>
                  Cálculo de vidro fora de esquadro
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarPreco((atual) => !atual)}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/70"
                  style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                >
                  <Calculator size={17} /> Calcular preço
                </button>
                <PDFDownloadLink
                  document={
                    <ForaEsquadroPDF
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl}
                      largura={largura}
                      alturaInicial={alturaInicial}
                      alturaFinal={alturaFinal}
                      quantidade={quantidade}
                      divisoes={divisoes}
                      pecas={pecas}
                      areaPorVao={areaPorVao}
                      areaTotal={areaTotal}
                      cliente={clienteSelecionado?.nome || ""}
                      vidro={vidroSelecionado ? formatarVidroCadastro(vidroSelecionado) : ""}
                      precoM2={vidroSelecionado && precoVidroM2 ? precoVidroM2 : 0}
                      valorTotal={vidroSelecionado && precoVidroM2 ? valorTotal : 0}
                    />
                  }
                  fileName={`Fora de esquadro ${largura}x${alturaInicial}-${alturaFinal}.pdf`}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/70"
                  style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                >
                  {({ loading: pdfLoading }) => (
                    <>
                      {pdfLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      ) : (
                        <Printer size={17} />
                      )}
                      Imprimir
                    </>
                  )}
                </PDFDownloadLink>
                <button
                  type="button"
                  onClick={enviarParaCentral}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/70"
                  style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                >
                  <FilePlus2 size={17} /> PDF+
                </button>
                <button
                  type="button"
                  onClick={limpar}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/70"
                  style={{ borderColor: `${theme.contentTextLightBg}22`, color: theme.contentTextLightBg }}
                >
                  <Eraser size={17} /> Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
              <CampoMedida label="Largura" value={largura} onChange={setLargura} />
              <CampoMedida label="Altura inicial" value={alturaInicial} onChange={setAlturaInicial} />
              <CampoMedida label="Altura final" value={alturaFinal} onChange={setAlturaFinal} />
              <CampoMedida label="Quantidade" value={quantidade} suffix="und" maxDigitos={3} onChange={(valor) => setQuantidade(Math.max(1, valor))} />

              <label className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 transition focus-within:border-emerald-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Divisões</span>
                <select
                  value={divisoes}
                  onChange={(event) => setDivisoes(Number(event.target.value))}
                  className="mt-1.5 w-full bg-transparent text-lg font-medium leading-tight text-[#0f2742] outline-none"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao} {opcao === 1 ? "peça" : "peças"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mostrarPreco ? (
              <div className="grid gap-2.5 rounded-3xl border border-slate-200 bg-white/80 p-3 md:grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr]">
                <CampoBusca
                  label="Cliente"
                  value={clienteBusca}
                  placeholder="Digite para buscar cliente..."
                  itens={clientesFiltrados}
                  carregando={carregandoClientes}
                  formatar={(cliente) => cliente.nome}
                  onChange={setClienteBusca}
                  onSelect={(cliente) => setClienteBusca(cliente.nome)}
                />
                <CampoBusca
                  label="Vidro"
                  value={vidroBusca}
                  placeholder="Digite o vidro..."
                  itens={vidrosFiltrados}
                  carregando={carregandoVidros}
                  formatar={formatarVidroCadastro}
                  onChange={setVidroBusca}
                  onSelect={(vidro) => setVidroBusca(formatarVidroCadastro(vidro))}
                />
                <ResumoCard
                  titulo="Preço do m²"
                  valor={precoVidroM2 ? moeda(precoVidroM2) : "R$ 0,00"}
                  detalhe={clienteSelecionado?.grupo_preco_id ? "Tabela do cliente" : "Preço base do vidro"}
                />
                <ResumoCard
                  titulo="Valor total"
                  valor={moeda(valorTotal)}
                  detalhe={`${formatarM2(areaTotal)} m² cobrados`}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResumoCard
                titulo="Queda total"
                valor={formatarMm(Math.abs(quedaTotal))}
                detalhe={quedaTotal >= 0 ? "Descendo da inicial para a final" : "Subindo da inicial para a final"}
              />
              <ResumoCard
                titulo="Queda por divisão"
                valor={formatarMm(Math.abs(quedaPorDivisao))}
                detalhe="Diferença proporcional entre cada corte"
              />
              <ResumoCard
                titulo="Área por vão"
                valor={`${formatarM2(areaPorVao)} m²`}
                detalhe="Soma das peças de um vão"
              />
              <ResumoCard
                titulo="Área total"
                valor={`${formatarM2(areaTotal)} m²`}
                detalhe={`Considerando ${quantidade || 1} vão(s)`}
              />
            </div>

            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Layers3 size={18} className="text-emerald-600" />
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[#0f2742]">Relação das peças</h2>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Peça</th>
                      <th className="px-4 py-3 text-left font-medium">Largura</th>
                      <th className="px-4 py-3 text-left font-medium">Alt. esquerda</th>
                      <th className="px-4 py-3 text-left font-medium">Alt. direita</th>
                      <th className="px-4 py-3 text-left font-medium">Queda</th>
                      <th className="px-4 py-3 text-left font-medium">Medida cálculo</th>
                      <th className="px-4 py-3 text-right font-medium">Área</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pecas.map((peca, index) => (
                      <tr key={peca.indice} className={`border-t border-slate-200 text-[#0f2742] ${index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}>
                        <td className="px-4 py-3">Peça {peca.indice}</td>
                        <td className="px-4 py-3">{formatarMm(peca.largura)}</td>
                        <td className="px-4 py-3">{formatarMm(peca.alturaEsquerda)}</td>
                        <td className="px-4 py-3">{formatarMm(peca.alturaDireita)}</td>
                        <td className="px-4 py-3">{formatarMm(Math.abs(peca.queda))}</td>
                        <td className="px-4 py-3">{Math.round(peca.larguraCalculo)} x {Math.round(peca.alturaCalculo)} mm</td>
                        <td className="px-4 py-3 text-right">{formatarM2(peca.area)} m²</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <DesenhoForaEsquadro
            largura={largura}
            alturaInicial={alturaInicial}
            alturaFinal={alturaFinal}
            divisoes={divisoes}
            pecas={pecas}
          />
        </section>
      </section>
    </main>
  );
}
