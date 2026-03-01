"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "@/components/Sidebar"
import { Plus, Calculator, Trash2, ReceiptText, Menu, Building2, ChevronDown, Wrench, X, ChevronLeft,ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function CalculoEspelhosPage() {
  const { theme } = useTheme();
  const { nomeEmpresa, user } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false); // Adicionado state do menu
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = { push: (url: string) => console.log(url) }; // Simulação do router
  const handleLogout = () => console.log("logout"); // Simulação do logout
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // --- ESTADOS ---
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [vidrosDB, setVidrosDB] = useState<any[]>([]);
  const [vidroId, setVidroId] = useState("");
  const [acabamentosDB, setAcabamentosDB] = useState<any[]>([]);
  const [acabamentoId, setAcabamentoId] = useState("");
  const [listaItens, setListaItens] = useState<any[]>([]);

  // --- CONFIGURAÇÃO VISUAL EXATA ---
  const opcoesVisual = useMemo(() => [
    { value: 'padrao', label: 'Reta', className: 'rounded-none border-2 border-gray-400' },
    { value: 'lapidado', label: 'Lapidado', className: 'rounded-sm border-4 border-gray-400' },
    { value: 'bisote', label: 'Bisotê', className: 'rounded-sm border-[8px] border-double border-gray-400' },
    { value: 'molde', label: 'Molde', className: 'rounded-[20px_5px_20px_5px] border-2 border-gray-400' },
    { value: 'organico', label: 'Orgânico', className: 'rounded-[50px_30px_70px_30px] border-2 border-gray-400' },
    { value: 'redondo', label: 'Redondo', className: 'rounded-full border-2 border-gray-400' },
    // LEDS
    { value: 'led', label: 'LED', className: 'rounded border-4 border-gray-400 relative after:absolute after:inset-2 after:border-2 after:border-dashed after:border-gray-500 after:rounded' },
    { value: 'redondo_led', label: 'Redondo LED', className: 'rounded-full border-4 border-gray-400 relative after:absolute after:inset-3 after:border-2 after:border-dashed after:border-gray-500 after:rounded-full' },
    // OVAL
    { value: 'semi_oval', label: 'Semi Oval', className: 'rounded-t-full border-4 border-gray-400' },
    { value: 'capsula_vertical', label: 'Oval Vertical', className: 'rounded-full border-4 border-gray-400', size: 'w-10 h-16' },
    // JOGO
    { value: 'jogo', label: 'Jogo', className: 'grid grid-cols-3 gap-0.5 p-0.5' }
  ], []);

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
        setAcabamentoId(aData[0].id.toString());
      }
    };
    carregarDados();
  }, []);

  // --- CÁLCULO ---
  const calculoAtual = useMemo(() => {
    const lOriginal = parseFloat(largura) || 0;
    const aOriginal = parseFloat(altura) || 0;
    const vidro = vidrosDB.find(v => v.id === vidroId);
    const acb = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));

    if (!vidro || lOriginal === 0 || aOriginal === 0) return { m2: 0, total: 0 };

    const sobraL = acb ? (Number(acb.sobra_largura) || 0) : 0;
    const sobraA = acb ? (Number(acb.sobra_altura) || 0) : 0;
    const lComMargem = lOriginal + sobraL;
    const aComMargem = aOriginal + sobraA;

    const lCalc = Math.ceil(lComMargem / 50) * 50;
    const aCalc = Math.ceil(aComMargem / 50) * 50;
    const areaM2 = (lCalc * aCalc) / 1_000_000;

    let valorBase = areaM2 * vidro.preco;
    let adicional = 0;

    if (acb) {
      if (acb.tipo_calculo === 'porcentagem') {
        adicional = valorBase * (Number(acb.preco) / 100);
      } else if (acb.tipo_calculo === 'metro_linear') {
        adicional = ((lOriginal + aOriginal) * 2 / 1000) * Number(acb.preco);
      } else if (acb.tipo_calculo === 'unitário') {
        adicional = Number(acb.preco);
      }
    }

    return {
      m2: areaM2 * quantidade,
      total: (valorBase + adicional) * quantidade
    };
  }, [largura, altura, quantidade, vidroId, acabamentoId, vidrosDB, acabamentosDB]);

  const adicionarAoPedido = () => {
    if (calculoAtual.total === 0) return;
    const vSel = vidrosDB.find(v => v.id === vidroId);
    const aSel = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));

    const descricaoFinal = aSel
      ? `${vSel?.nome} ${vSel?.espessura} ${vSel?.tipo} - ${aSel?.nome}`
      : `${vSel?.nome} ${vSel?.espessura} ${vSel?.tipo}`;

    setListaItens([...listaItens, {
      id: Date.now(),
      descricao: descricaoFinal,
      medidas: `${largura}x${altura}`,
      quantidade: quantidade,
      total: calculoAtual.total
    }]);

    setLargura("");
    setAltura("");
    setQuantidade(1);
    setAcabamentoId("");
  };

  // --- FUNÇÃO RenderPreview ATUALIZADA (Correção Semi-Oval) ---
  const RenderPreview = useMemo(() => {
    const acb = acabamentosDB.find(a => Number(a.id) === Number(acabamentoId));
    const tipoVisual = acb?.tipo_visual || 'padrao';

    const l = parseFloat(largura) || 100;
    const a = parseFloat(altura) || 100;

    const maxDim = 280;
    const scale = Math.min(maxDim / Math.max(l, a), 1);
    const width = l * scale;
    const height = a * scale;

    const baseStyle: React.CSSProperties = {
      transition: 'all 0.3s ease-out',
      borderStyle: 'solid',
      borderColor: '#94a3b8',
      backgroundColor: '#cbd5e1',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    };

    if (tipoVisual.includes('jogo')) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width, height }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{
              ...baseStyle,
              width: '100%',
              height: '100%',
              borderWidth: '2px',
              borderRadius: '2px',
              backgroundColor: '#cbd5e1'
            }} />
          ))}
        </div>
      );
    }

    let borderRadius = '4px';
    let borderWidth = '2px';
    let borderColor = '#94a3b8';
    let clipPath = 'none'; // Adicionado clipPath
    let customWidth = width;
    let customHeight = height;

    // --- LÓGICA DE FORMAS ---
    if (tipoVisual.includes('redondo')) {
      borderRadius = '50%';
      const minDim = Math.min(width, height);
      customWidth = minDim;
      customHeight = minDim;
    }
    else if (tipoVisual.includes('oval') || tipoVisual.includes('capsula')) {
      borderRadius = '80%';
      customWidth = Math.min(width, height) * 0.7;
      customHeight = Math.max(width, height);
    }
    // --- CORREÇÃO AQUI: Reta embaixo, redonda em cima com clip-path ---
    else if (tipoVisual.includes('semi_oval')) {
      borderRadius = '0px'; // Remove border-radius para não interferir
      // Cria um caminho: começa no canto inferior esquerdo, vai pro superior, 
      // faz a curva em cima e desce para o inferior direito.
      clipPath = 'ellipse(100% 100% at 50% 0%)';
    }
    else if (tipoVisual.includes('organico') || tipoVisual.includes('molde')) {
      borderRadius = '60% 40% 70% 30% / 30% 60% 40% 70%';
    }

    if (tipoVisual.includes('bisote')) {
      borderWidth = '12px';
      borderColor = '#e2e8f0';
    }

    if (tipoVisual.includes('led')) {
      baseStyle.boxShadow = '0 0 15px rgba(255,255,255,0.5)';
    }

    return (
      <div style={{
        ...baseStyle,
        width: customWidth,
        height: customHeight,
        borderRadius,
        borderWidth,
        borderColor,
        clipPath // Aplica o corte
      }} />
    );
  }, [largura, altura, acabamentoId, acabamentosDB]);
  

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>
      <div className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:block flex-shrink-0`}>
      <Sidebar 
        showMobileMenu={showMobileMenu} 
        setShowMobileMenu={setShowMobileMenu} 
        nomeEmpresa={nomeEmpresa || "Empresa"} 
        expandido={sidebarExpandido} 
        setExpandido={setSidebarExpandido} // <--- ADICIONE ESTA LINHA AQUI
      />
    </div>

      {/* --- SEU LAYOUT ORIGINAL --- */}
      <div className="flex-1 flex flex-col w-full min-w-0">
      <header
  className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm no-print"
  style={{ backgroundColor: theme.menuTextColor || '#ffffff' }}
>
  {/* --- LADO ESQUERDO ALTERADO --- */}
  <div className="flex items-center gap-2 md:gap-4">
    <button
      onClick={() => setShowMobileMenu(true)}
      className="md:hidden p-2 rounded-lg hover:bg-gray-100"
    >
      <Menu size={24} className="text-gray-600" />
    </button>
    
    {/* Ícone e Título da Página */}
    <div className="flex items-center gap-2 text-gray-800">
      {/* CORREÇÃO: Usando a cor do tema para o ícone */}
      <Calculator size={22} style={{ color: theme.menuIconColor }} />
      <h1 className="text-lg md:text-xl font-bold truncate">
        Cálculo de Espelho
      </h1>
    </div>
    {/* --------------------------------- */}
  </div>

  <div className="flex items-center gap-3">
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          <Building2 size={16} />
        </div>
        <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
      </button>

      {showUserMenu && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium">Logado como</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.email || "usuario@email.com"}</p>
          </div>
          <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            <Wrench size={18} className="text-gray-400" /> Configurações
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <X size={18} className="text-red-500" /> Sair
          </button>
        </div>
      )}
    </div>
  </div>
</header>

        <main className="p-4 md:p-8 flex-1">
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
                        type="number"
                        placeholder="mm"
                        value={largura}
                        onChange={(e) => setLargura(e.target.value)}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Altura</label>
                      <input
                        type="number"
                        placeholder="mm"
                        value={altura}
                        onChange={(e) => setAltura(e.target.value)}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm"
                        style={{ "--tw-ring-color": theme.menuIconColor } as any}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 mt-1 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-all text-sm font-bold text-center text-gray-500"
                        style={{
                          "--tw-ring-color": theme.menuIconColor
                        } as any}
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

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {listaItens.length > 0 ? (
                    <>
                      <div className="divide-y divide-gray-50">
                        {listaItens.map((item) => (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/40 transition-all group">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600">{item.descricao}</span>
                                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  {item.medidas}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 tracking-tight">Quantidade: {item.quantidade}</p>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-sm font-bold text-gray-500">
                                {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <button
                                onClick={() => setListaItens(listaItens.filter(i => i.id !== item.id))}
                                className="p-2 text-gray-200 hover:text-red-400 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Rodapé Discreto */}
                      <div className="p-5 bg-gray-50/30 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ">Total Orçamento</span>
                        <div className="text-right">
                          <span className="text-2xl font-black" style={{ color: theme.menuBackgroundColor }}>
                            {listaItens.reduce((acc, item) => acc + item.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center">
                      <p className="text-[11px] font-medium text-gray-300 uppercase tracking-widest">Nenhum item adicionado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}