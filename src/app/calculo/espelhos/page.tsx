"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "@/components/Sidebar"
import { Plus, Calculator, Trash2, ReceiptText, Save, Check, AlertTriangle, Sparkles, Printer, X, Pencil, ClipboardList } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { PDFDownloadLink } from '@react-pdf/renderer'; // Se for baixar
import { EspelhosPDF } from '@/app/relatorios/espelhos/EspelhosPDF'
import Header from "@/components/Header"
import { useRouter, useSearchParams } from "next/navigation";
import ThemeLoader from "@/components/ThemeLoader"

type ShapeStyle = {
  width: number;
  height: number;
  borderRadius?: string;
  clipPath?: string;
};

async function gerarNumeroOrcamento() {
  const hoje = new Date();
  const prefixoData = `OR${hoje.getFullYear().toString().slice(-2)}${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const { data: ultimos } = await supabase
    .from("orcamentos")
    .select("numero_formatado")
    .like("numero_formatado", `${prefixoData}%`)
    .order("numero_formatado", { ascending: false })
    .limit(1);

  let seq = 1;
  if (ultimos && ultimos.length > 0) {
    seq = parseInt(String(ultimos[0].numero_formatado).slice(-3), 10) + 1;
  }

  return `${prefixoData}${String(seq).padStart(3, "0")}`;
}

function getShapeStyle(
  tipoVisual: string,
  width: number,
  height: number
): ShapeStyle {

  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  // PADRÃO
  let shape: ShapeStyle = {
    width,
    height,
    borderRadius: '4px'
  };

  if (tipoVisual.includes('redondo')) {
    shape = {
      width: minDim,
      height: minDim,
      borderRadius: '50%'
    };
  }

  else if (tipoVisual.includes('oval_vertical')) {
    shape = {
      width: minDim * 0.7,
      height: maxDim,
      borderRadius: '50%'
    };
  }

  else if (tipoVisual.includes('oval_horizontal') || tipoVisual === 'oval') {
    shape = {
      width: maxDim,
      height: minDim * 0.7,
      borderRadius: '50%'
    };
  }

  else if (tipoVisual.includes('capsula')) {
    shape = {
      width: maxDim,
      height: minDim * 0.5,
      borderRadius: '9999px'
    };
  }

  else if (tipoVisual.includes('semi_oval')) {
    shape = {
      width,
      height,
      borderRadius: '50% 50% 0 0'
    };
  }

  else if (tipoVisual.includes('organico')) {
    shape = {
      width,
      height,
      borderRadius: '47% 53% 61% 39% / 42% 58% 36% 64%'
    };
  }

  else if (tipoVisual.includes('molde')) {
    shape = {
      width,
      height,
      borderRadius: '30% 70% 50% 50%'
    };
  }

  return shape;
}

export default function CalculoEspelhosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { theme } = useTheme();
  const { nomeEmpresa, user, empresaId } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false); // Adicionado state do menu
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
  const carregadoRef = useRef(false);
  // No topo, junto com os outros estados
  const larguraInputRef = useRef<HTMLInputElement>(null);
  const [showModalSucesso, setShowModalSucesso] = useState(false);

  // --- ESTADOS ---
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [vidrosDB, setVidrosDB] = useState<any[]>([]);
  const [vidroId, setVidroId] = useState("");
  const [acabamentosDB, setAcabamentosDB] = useState<any[]>([]);
  const [acabamentoId, setAcabamentoId] = useState("");
  const [listaItens, setListaItens] = useState<any[]>([]);
  const [showModalPDF, setShowModalPDF] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeObra, setNomeObra] = useState("");
  const [divisoesLargura, setDivisoesLargura] = useState(1);
  const [divisoesAltura, setDivisoesAltura] = useState(1);
  const [showModalSalvar, setShowModalSalvar] = useState(false)
  const [showModalAviso, setShowModalAviso] = useState(false);

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const carregarDados = async () => {
      const { data: vData } = await supabase.from("vidros").select("*").ilike('nome', '%espelho%').order("nome");
      if (vData && vData.length > 0) {
        setVidrosDB(vData);
        setVidroId(vData[0].id);
      }
      const { data: aData } = await supabase.from("acabamentos").select("*").order("nome");
      if (aData && aData.length > 0) {
        setAcabamentosDB(aData);
        setAcabamentoId(""); // começa como Nenhum
      }
    };
    carregarDados();
  }, []);

  const buscarOrcamentoParaEdicao = async (id: string) => {
    try {
      const { data: orcamento, error } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!orcamento) return;

      setNomeCliente(orcamento.cliente_nome || "");
      setNomeObra(orcamento.obra_referencia || "");
      setUltimoNumeroGerado(orcamento.numero_formatado || "");

      if (Array.isArray(orcamento.itens)) {
        setListaItens(orcamento.itens);
      }
    } catch (error) {
      console.error("Erro ao carregar orçamento de espelho para edição:", error);
    }
  };

  useEffect(() => {
    if (!editId || carregadoRef.current || vidrosDB.length === 0) return;

    buscarOrcamentoParaEdicao(editId);
    carregadoRef.current = true;
  }, [editId, vidrosDB.length]);

  const handleLogout = async () => {
    try {
      // 1. Faz o logout no Supabase
      await supabase.auth.signOut();

      // 2. Redireciona o usuário para a página de login (ou home)
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // --- CÁLCULO DEPURADO ---
  const calculoAtual = useMemo(() => {
    const lOriginal = parseFloat(largura) || 0;
    const aOriginal = parseFloat(altura) || 0;
    const vidro = vidrosDB.find(v => v.id === vidroId);
    const acb = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));

    const divisoesL = Math.max(1, Number(divisoesLargura));
    const divisoesA = Math.max(1, Number(divisoesAltura));
    const totalPecas = divisoesL * divisoesA;

    if (!vidro || lOriginal === 0 || aOriginal === 0) return { m2: 0, total: 0 };

    // 1. DEFINIR SOBRAS
    const sobraL = acb ? (Number(acb.sobra_largura) || 0) : 0;
    const sobraA = acb ? (Number(acb.sobra_altura) || 0) : 0;

    // 2. APLICAR SOBRA E ARREDONDAMENTO
    const lCalc = Math.ceil((lOriginal + sobraL) / 50) * 50;
    const aCalc = Math.ceil((aOriginal + sobraA) / 50) * 50;

    // 3. ÁREA TOTAL (Bruta ou do Jogo)
    let areaTotalM2 = 0;
    let ehJogo = acb?.tipo_visual?.includes('jogo');

    if (ehJogo) {
      // Cálculo específico para Jogo: área de cada pecinha * total
      const lPeca = Math.ceil(((lOriginal / divisoesL) + sobraL) / 50) * 50;
      const aPeca = Math.ceil(((aOriginal / divisoesA) + sobraA) / 50) * 50;
      areaTotalM2 = (lPeca * aPeca * totalPecas) / 1_000_000;
    } else {
      // Cálculo normal
      areaTotalM2 = (lCalc * aCalc) / 1_000_000;
    }

    // 4. VALOR BASE DO VIDRO (Área Total * Preço)
    let valorVidro = areaTotalM2 * Number(vidro.preco);
    let totalComAdicionais = valorVidro;

    // 5. APLICAR ADICIONAIS DO ACABAMENTO
    if (acb) {
      if (acb.tipo_calculo === 'porcentagem') {
        const percentual = Number(acb.porcentagem_aumento || 0)
        totalComAdicionais += valorVidro * (percentual / 100)
      }
      else if (acb.tipo_calculo === 'm2') {
        totalComAdicionais += areaTotalM2 * Number(acb.preco);
      }
      else if (acb.tipo_calculo === 'metro_linear') {
        totalComAdicionais += ((lOriginal + aOriginal) * 2 / 1000) * Number(acb.preco);
      } else if (acb.tipo_calculo === 'unitário') {
        totalComAdicionais += Number(acb.preco);
      }
    }

    return {
      m2: areaTotalM2 * quantidade,
      total: totalComAdicionais * quantidade
    };
  }, [largura, altura, quantidade, vidroId, acabamentoId, vidrosDB, acabamentosDB, divisoesLargura, divisoesAltura]);

  const [ultimoNumeroGerado, setUltimoNumeroGerado] = useState("");

  const adicionarAoPedido = () => {
    if (calculoAtual.total === 0) return;
    const vSel = vidrosDB.find(v => v.id === vidroId);
    const aSel = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));

    // --- LÓGICA DE LIMPEZA ---
    let nomeAcabamento = aSel?.nome || '';

    // Remove termos repetitivos como "(Lapidado)" ou "(Bisotê)" do nome do acabamento
    nomeAcabamento = nomeAcabamento
      .replace(/\(Lapidado\)/g, '')
      .replace(/\(Bisotê\)/g, '')
      .trim();

    const descricaoFinal = aSel
      ? `${vSel?.nome} ${vSel?.espessura} ${vSel?.tipo} - ${nomeAcabamento}`
      : `${vSel?.nome} ${vSel?.espessura} ${vSel?.tipo}`;

    setListaItens([...listaItens, {
      id: Date.now(),
      descricao: descricaoFinal,
      medidas: `${largura}x${altura}`,
      quantidade: quantidade,
      total: calculoAtual.total,

      // 🔥 ESSENCIAL PARA O PDF
      tipoVisual: aSel?.tipo_visual || 'padrao',
      larguraReal: Number(largura),
      alturaReal: Number(altura),
      divisoesLargura: divisoesLargura,
      divisoesAltura: divisoesAltura,
    }]);

    // Limpa apenas as medidas, mantém o vidro e acabamento selecionados
    setLargura("");
    setAltura("");
    setQuantidade(1);

    // DEVOLVE O FOCO PARA A LARGURA
    setTimeout(() => {
      larguraInputRef.current?.focus();
    }, 10);
  };

  // --- FUNÇÃO RenderPreview ATUALIZADA (Correção Semi-Oval) ---
  const RenderPreview = useMemo(() => {

    const acb = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));
    const tipoVisual = acb?.tipo_visual || 'padrao';

    const l = parseFloat(largura) || 100;
    const a = parseFloat(altura) || 100;

    const maxDim = 280;
    const scale = maxDim / Math.max(l, a);

    const width = l * scale;
    const height = a * scale;

    if (tipoVisual.includes('jogo')) {

      const temBisote = tipoVisual.includes('bisote');
      const bisoteSize = 10;

      return (
        <div
          style={{
            width,
            height,
            position: "relative",
            borderRadius: "8px",
            boxSizing: "border-box",
            overflow: "hidden",
            background: temBisote
              ? "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%, #cbd5e1 100%)"
              : "transparent",
            padding: temBisote ? bisoteSize : 0
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, divisoesLargura)}, 1fr)`,
              gridTemplateRows: `repeat(${Math.max(1, divisoesAltura)}, 1fr)`,
              gap: "6px",
              background: "#f1f5f9",
              borderRadius: temBisote ? "6px" : "6px"
            }}
          >
            {Array.from({ length: divisoesLargura * divisoesAltura }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#cbd5e1",
                  borderRadius: "4px",
                  boxShadow: "#94a3b8"
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    const shape = getShapeStyle(tipoVisual, width, height);

    const baseStyle: React.CSSProperties = {
      transition: 'all 0.3s ease-out',
      borderStyle: 'solid',
      borderColor: '#94a3b8',
      backgroundColor: '#cbd5e1',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: '2px'
    };

    if (tipoVisual.includes('bisote')) {
      baseStyle.borderWidth = '12px';
      baseStyle.borderColor = '#e2e8f0';
    }

    if (tipoVisual.includes('led')) {
      baseStyle.boxShadow = '0 0 18px rgba(255,255,255,0.4)';
    }
    return (
      <div
        style={{
          ...baseStyle,
          width: shape.width,
          height: shape.height,
          borderRadius: shape.borderRadius,
          clipPath: shape.clipPath
        }}
      >
        {tipoVisual.includes('led') && (
          <div
            style={{
              position: 'absolute',
              inset: '12px',
              borderRadius: 'inherit',
              border: '2px dashed rgba(255,255,255,0.7)',
              pointerEvents: 'none',
              boxShadow: '0 0 12px rgba(255,255,255,0.5)'
            }}
          />
        )}
      </div>
    );
  }, [largura, altura, acabamentoId, acabamentosDB, divisoesLargura, divisoesAltura]);

  const handleSalvarOrcamento = async () => {
    // Validação
    if (!nomeCliente || listaItens.length === 0) {
      setShowModalAviso(true); // Abre o modal de aviso
      return; // Interrompe a execução
    }
    // 1. Validação (mantive a lógica de validação)
    if (!nomeCliente || listaItens.length === 0) {
      // Dica: Aqui você poderia trocar por um modal de erro ou toast notification
      alert("Preencha o cliente e adicione itens.");
      return;
    }

    try {
      let numero = "";
      if (editId) {
        const { data: atual } = await supabase
          .from("orcamentos")
          .select("numero_formatado")
          .eq("id", editId)
          .single();
        numero = atual?.numero_formatado || "OR-EDIT";
      } else {
        numero = await gerarNumeroOrcamento();
      }

      const totalGeral = listaItens.reduce((sum, item) => sum + item.total, 0);
      const metragemTotal = listaItens.reduce((sum, item) => sum + (item.m2 || 0), 0);

      const payload = {
        numero_formatado: numero,
        cliente_nome: nomeCliente,
        obra_referencia: nomeObra,
        itens: listaItens,
        valor_total: Number(totalGeral) || 0,
        metragem_total: Number(metragemTotal) || 0,
        theme_color: theme.contentTextLightBg,
        empresa_id: empresaId
      };

      let data: any = null;
      let error: any = null;

      if (editId) {
        const { data: dataUpdate, error: errorUpdate } = await supabase
          .from("orcamentos")
          .update(payload)
          .eq("id", editId)
          .select("numero_formatado")
          .single();
        data = dataUpdate;
        error = errorUpdate;
      } else {
        const { data: dataInsert, error: errorInsert } = await supabase
          .from("orcamentos")
          .insert(payload)
          .select("numero_formatado")
          .single();
        data = dataInsert;
        error = errorInsert;
      }

      if (error) throw error;

      if (editId) {
        router.push('/admin/relatorio.orcamento');
        return;
      }

      // 2. SUCESSO: Limpa os estados e fecha o modal de salvar
      setUltimoNumeroGerado(data.numero_formatado);
      setListaItens([]);
      setShowModalSalvar(false); // Fecha o modal de preenchimento
      setShowModalPDF(false);    // Fecha caso estivesse aberto
      setShowModalSucesso(true);

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar orçamento.");
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      {/* Sidebar Container */}
      <div
        className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:flex flex-col border-r border-gray-100 flex-shrink-0 sticky top-0 h-screen`}
        style={{ backgroundColor: theme.menuBackgroundColor }} // Garante que a cor do fundo da sidebar acompanhe
      >
        <Sidebar
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa="Nome da Sua Empresa"
          expandido={sidebarExpandido}
          setExpandido={setSidebarExpandido}
        />
      </div>


      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col w-full min-w-0">

        {/* AQUI ESTÁ A MÁGICA: Chamando o seu componente padronizado */}
        <Header
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleLogout}
          setShowMobileMenu={() => { }}
        >
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col border-l border-gray-200 pl-6">
              <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Orçamento Espelho</h1>
              <span className="text-xs text-gray-800 "># {ultimoNumeroGerado || "NOVO"}</span>
            </div>

            {/* ÁREA DE AÇÕES DISCRETAS */}
            <div className="ml-6 flex items-center gap-3 animate-fade-in">
              <button
                onClick={() => setShowModalSalvar(true)}
                className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5a] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a527d] transition-all active:scale-95 shadow-lg shadow-[#1e3a5a]/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Salvar Orçamento
              </button>

              {/* Ícone discreto para PDF */}
              <button
                onClick={() => setShowModalPDF(true)}
                className="flex items-center gap-2 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-all ml-2"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>
        </Header>


        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          {/* O header antigo foi removido daqui */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
            {/* Coluna Esquerda: Configurações */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Largura</label>
                      <input
                        ref={larguraInputRef} // Adicione a ref aqui
                        type="number"
                        placeholder="mm"
                        value={largura}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setLargura(value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('input-altura')?.focus()} // Pula para altura
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Altura</label>
                      <input
                        id="input-altura" // Adicione um ID para facilitar o foco
                        type="number"
                        placeholder="mm"
                        value={altura}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setAltura(value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('input-qtd')?.focus()} // Pula para quantidade
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Qtd</label>
                      <input
                        id="input-qtd" // Adicione um ID
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            adicionarAoPedido(); // Adiciona e volta para a largura
                          }
                        }}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm font-bold text-center text-gray-500"
                        style={{
                          "--tw-ring-color": theme.menuIconColor
                        } as any}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                        Div. Jogo Largura
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={divisoesLargura}
                        onChange={(e) => setDivisoesLargura(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                        Div. Jogo Altura
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={divisoesAltura}
                        onChange={(e) => setDivisoesAltura(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Selecione o Espelho</label>
                    <select
                      value={vidroId}
                      onChange={(e) => setVidroId(e.target.value)}
                      className="w-full p-3 mt-1 rounded-xl border border-gray-200 bg-white focus:ring-2 outline-none transition-all text-sm text-gray-600 cursor-pointer"
                      style={{ "--tw-ring-color": theme.menuIconColor } as any}
                    >
                      {vidrosDB.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nome} {v.espessura} - {v.tipo} ({Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/m²)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4" style={{ color: theme.menuBackgroundColor }}>Acabamentos</h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {/* OPÇÃO: SEM ACABAMENTO */}
                  <label className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer border border-transparent transition-all">
                    <span className="text-sm font-medium text-gray-500">Nenhum / Apenas Lapidado</span>
                    <input
                      type="radio"
                      name="acabamento"
                      checked={acabamentoId === ""}
                      onChange={() => setAcabamentoId("")}
                      className="w-5 h-5"
                      style={{ accentColor: theme.menuIconColor }}
                    />
                  </label>

                  {/* LISTA DO BANCO */}
                  {acabamentosDB.map((item) => {
                    // Define o estilo do ícone baseado no tipo_visual do banco
                    let iconStyle = "border-2 border-gray-400";
                    if (item.tipo_visual.includes('redondo')) iconStyle = "rounded-full border-2 border-gray-400";
                    else if (item.tipo_visual.includes('bisote')) iconStyle = "rounded-sm border-4 border-double border-gray-400";
                    else if (item.tipo_visual.includes('organico') || item.tipo_visual.includes('molde')) iconStyle = "rounded-[20px] border-2 border-gray-400";
                    else if (item.tipo_visual.includes('led')) iconStyle = "rounded border-4 border-gray-400";

                    return (
                      <label key={item.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer border border-transparent transition-all">
                        {/* --- EXIBIÇÃO DO DESENHO NA LISTA --- */}
                        <div className={`flex-shrink-0 bg-gray-300 w-10 h-10 ${iconStyle} flex items-center justify-center`}>
                          {item.tipo_visual.includes('jogo') && (
                            <div className="grid grid-cols-3 gap-0.5 p-0.5 h-full w-full">
                              {[...Array(9)].map((_, i) => <div key={i} className="bg-white rounded-sm"></div>)}
                            </div>
                          )}
                          {item.tipo_visual.includes('led') && (
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                          )}
                        </div>

                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">{item.nome}</span>
                          {/* Mostra o tipo técnico do banco como label secundária */}
                          <p className="text-xs text-gray-400 capitalize">{item.tipo_visual.replace(/-/g, ' ')}</p>
                        </div>

                        <input
                          type="radio"
                          name="acabamento"
                          checked={acabamentoId === item.id.toString()}
                          onChange={() => setAcabamentoId(item.id.toString())}
                          className="w-5 h-5"
                          style={{ accentColor: theme.menuIconColor }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview e Tabela */}
            <div className="lg:col-span-8 space-y-6">
              {/* Preview Area */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[350px] flex flex-col items-center justify-center relative">
                <div className="flex items-center justify-center relative">
                  {RenderPreview}
                  <span className="absolute -bottom-10 text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-tighter">
                    {largura || 0} x {altura || 0} mm
                  </span>
                </div>
              </div>

              {/* Botão de Adição e Valor Atual */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal do item</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {calculoAtual.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <button
                  onClick={adicionarAoPedido}
                  disabled={calculoAtual.total === 0}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border-2 transition-all disabled:opacity-30 active:scale-95"
                  style={{
                    borderColor: theme.menuIconColor,
                    color: theme.menuIconColor,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.menuIconColor;
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.menuIconColor;
                  }}
                >
                  <Plus size={18} /> Adicionar
                </button>
              </div>

              {/* LISTA DE ITENS DISCRETA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <ReceiptText size={14} /> Resumo do Pedido
                  </h3>
                  <button
                    onClick={() => setListaItens([])}
                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-tighter transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Limpar Tudo
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {listaItens.length > 0 ? (
                    <>
                      <div className="divide-y divide-gray-100">
                        {listaItens.map((item, index) => (
                          <div key={item.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">

                            {/* Lado Esquerdo: Descrição e Detalhes */}
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1">

                                {/* Descrição */}
                                <h4
                                  className="text-sm font-semibold truncate leading-tight"
                                  style={{ color: theme.contentTextLightBg }}
                                >
                                  {item.descricao}
                                </h4>

                                {/* Medidas */}
                                <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {item.medidas}
                                </span>
                              </div>

                              {/* Quantidade */}
                              <p className="text-xs text-gray-500 mt-1.5">
                                Quantidade: <span className="font-medium text-gray-700">{item.quantidade}</span>
                              </p>
                            </div>

                            {/* Lado Direito: Preço e Ações */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              {/* Preço Unitário */}
                              <span
                                className="text-sm font-bold whitespace-nowrap mr-2"
                                style={{ color: theme.contentTextLightBg }}
                              >
                                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>

                              {/* --- BOTÃO DE EDITAR (Cor do Tema) --- */}
                              <button
                                onClick={() => {
                                  setLargura(item.medidas.split('x')[0]);
                                  setAltura(item.medidas.split('x')[1]);
                                  setQuantidade(item.quantidade);
                                  setListaItens(listaItens.filter(i => i.id !== item.id));
                                }}
                                title="Editar item"
                                style={{ '--hover-color': theme.menuIconColor } as any}
                                className="p-2 rounded-lg text-gray-400 hover:text-[var(--hover-color)] hover:bg-[var(--hover-color)]/10 transition-all duration-200"
                              >
                                <Pencil size={16} />
                              </button>

                              {/* --- BOTÃO DE REMOVER (Vermelho Erro) --- */}
                              <button
                                onClick={() => setListaItens(listaItens.filter(i => i.id !== item.id))}
                                title="Remover item"
                                style={{ '--hover-color': theme.modalIconErrorColor } as any}
                                className="p-2 rounded-lg text-gray-400 hover:text-[var(--hover-color)] hover:bg-[var(--hover-color)]/10 transition-all duration-200"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* --- RODAPÉ COM A SOMA TOTAL --- */}
                      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Total do Orçamento</span>

                        {/* Soma Total */}
                        <span
                          className="text-lg font-bold"
                          style={{ color: theme.contentTextLightBg }}
                        >
                          {listaItens.reduce((sum, item) => sum + item.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </>
                  ) : (
                    // Estado Vazio
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <ClipboardList size={28} className="mb-3" />
                      <p className="text-sm font-medium">Nenhum item adicionado ao orçamento.</p>
                      <p className="text-xs mt-1">Comece adicionando as dimensões e o tipo de espelho.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE FINALIZAÇÃO E DOWNLOAD */}
      {showModalPDF && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div
            style={{
              backgroundColor: theme.modalBackgroundColor,
              color: theme.modalTextColor,
              borderColor: '#F3F4F6',
            }}
            className="w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 border overflow-hidden flex flex-col md:flex-row"
          >
            {/* LADO ESQUERDO */}
            <div className="p-8 md:w-2/5 flex flex-col justify-center items-center text-center" style={{ backgroundColor: `${theme.menuIconColor}08` }}>
              <div className="p-4 rounded-full mb-6" style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}>
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Finalizar Orçamento</h3>
              <p className="text-sm opacity-70">Preencha os dados ao lado para personalizar seu PDF antes de baixar.</p>
            </div>

            {/* LADO DIREITO */}
            <div className="p-8 md:w-3/5 flex flex-col">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowModalPDF(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 mb-8 flex-grow">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Cliente</label>
                  <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full bg-transparent border-b py-2.5 outline-none text-sm" placeholder="Nome do cliente..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Obra / Referência</label>
                  <input type="text" value={nomeObra} onChange={(e) => setNomeObra(e.target.value)} className="w-full bg-transparent border-b py-2.5 outline-none text-sm" placeholder="Ex: Apartamento 402..." />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-auto">

                {/* BAIXAR PDF */}
                <PDFDownloadLink
                  document={
                    <EspelhosPDF
                      itens={listaItens}
                      nomeEmpresa={nomeEmpresa}
                      logoUrl={theme.logoLightUrl || '/glasscode.png'}
                      themeColor={theme.contentTextLightBg}
                      nomeCliente={nomeCliente}
                      nomeObra={nomeObra}
                    />
                  }
                  fileName={`Orçamento_${nomeCliente?.replace(/[^a-z0-9]/gi, '') || 'cliente'}.pdf`}
                  className="w-full"
                >
                  {({ loading }) => (
                    <button
                      disabled={loading}
                      className="w-full px-5 py-3 rounded-xl font-semibold bg-[#1e3a5a] text-white hover:bg-[#2a527d] transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Printer size={16} />
                      {loading ? "Gerando PDF..." : "Baixar Orçamento"}
                    </button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE SALVAR ORÇAMENTO */}
      {showModalSalvar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div
            style={{
              backgroundColor: theme.modalBackgroundColor || '#FFFFFF',
              color: theme.modalTextColor || '#1F2937',
            }}
            className="w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 border border-gray-100 overflow-hidden flex flex-col md:flex-row"
          >
            {/* LADO ESQUERDO (Acentuado) */}
            <div
              className="p-8 md:w-2/5 flex flex-col justify-center items-center text-center"
              style={{ backgroundColor: `${theme.menuIconColor}08` }}
            >
              <div
                className="p-4 rounded-full mb-6"
                style={{
                  backgroundColor: `${theme.menuIconColor}15`,
                  color: theme.menuIconColor,
                }}
              >
                <Save size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Salvar Orçamento</h3>
              <p className="text-sm opacity-70">Preencha os dados ao lado para salvar o orçamento no sistema.</p>
            </div>

            {/* LADO DIREITO (Formulário) */}
            <div className="p-8 md:w-3/5 flex flex-col">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowModalSalvar(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 mb-8 flex-grow">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 py-2.5 outline-none text-sm focus:border-gray-400"
                    placeholder="Nome do cliente..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-50">Obra / Referência</label>
                  <input
                    type="text"
                    value={nomeObra}
                    onChange={(e) => setNomeObra(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 py-2.5 outline-none text-sm focus:border-gray-400"
                    placeholder="Ex: Apartamento 402..."
                  />
                </div>
              </div>

              <button
                onClick={handleSalvarOrcamento}
                className="w-full px-4 py-3 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2 hover:opacity-90"
                style={{ backgroundColor: theme.menuBackgroundColor }}
              >
                <Save size={16} />
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE SUCESSO */}
      {showModalSucesso && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-500">
          <div
            className="backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 w-72 flex items-center gap-4 ring-1 ring-black/5"
            style={{
              backgroundColor: `${theme.modalBackgroundColor || '#FFFFFF'}F0`, // Adiciona leve transparência
              borderRight: `4px solid ${theme.menuIconColor}`,
              color: theme.modalTextColor
            }}
          >
            {/* Ícone com a cor do tema */}
            <div
              className="p-2 rounded-xl flex-shrink-0"
              style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}
            >
              <Sparkles size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-tight opacity-90">Salvo com sucesso!</h3>
                <button
                  onClick={() => setShowModalSucesso(false)}
                  className="opacity-30 hover:opacity-100 transition-colors ml-2"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-[11px] mt-0.5 font-mono opacity-60">
                Ref: <span className="font-bold" style={{ color: theme.menuIconColor }}>{ultimoNumeroGerado}</span>
              </p>

              <button
                onClick={() => {
                  setShowModalSucesso(false);
                  router.push('/admin/relatorio.orcamento');
                }}
                className="text-[10px] font-bold opacity-50 hover:opacity-100 uppercase tracking-wider mt-2 flex items-center gap-1 transition-colors"
              >
                <ClipboardList size={12} />
                Ver Histórico
              </button>
            </div>
          </div>
        </div>
      )}
      {showModalAviso && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border border-gray-100"
            style={{
              backgroundColor: theme.modalBackgroundColor || '#FFFFFF',
              color: theme.modalTextColor || '#1F2937'
            }}
          >
            {/* Ícone com Animação de Pulso */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-amber-200 animate-ping opacity-20"></div>
              <AlertTriangle size={32} className="text-amber-500 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold mb-2">Quase lá!</h3>
            <p className="text-sm opacity-60 mb-8">
              Para prosseguir, certifique-se de que o <strong>nome do cliente</strong> foi preenchido e que existem <strong>itens adicionados</strong> ao orçamento.
            </p>

            <button
              onClick={() => setShowModalAviso(false)}
              className="px-8 py-2 rounded-xl text-sm transition-all border-1 hover:bg-opacity-10 active:bg-opacity-100"
              style={{
                borderColor: theme.menuIconColor,
                color: theme.menuIconColor,
                backgroundColor: 'transparent'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}