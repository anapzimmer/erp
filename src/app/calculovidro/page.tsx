"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import Sidebar from "@/components/Sidebar"
import {
  Menu, Building2, ChevronDown, Wrench, X, Trash2, Plus,
  Calculator, Sparkles, ClipboardList, Edit2 // <--- Adicione este cara aqui
} from "lucide-react"

// Funções de apoio
const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50;

export default function PaginaBase() {
  const { theme } = useTheme()
  const { nomeEmpresa, user, empresaId, loading: checkingAuth } = useAuth()

  // Estados do Layout (EXATAMENTE COMO VOCÊ ENVIOU)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarExpandido, setSidebarExpandido] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Estados de Dados do Supabase
  const [listaClientes, setListaClientes] = useState<any[]>([])
  const [listaVidros, setListaVidros] = useState<any[]>([])
  const [listaServicos, setListaServicos] = useState<any[]>([])

  // Estados do Orçamento
  const [clienteId, setClienteId] = useState("")
  const [obra, setObra] = useState("")
  const [largura, setLargura] = useState("")
  const [altura, setAltura] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [vidroSelecionado, setVidroSelecionado] = useState<any>(null)
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])

  // Edição de Modal
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<number | null>(null);
  const [idAtualizado, setIdAtualizado] = useState<number | null>(null);
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false);
  const larguraRef = useRef<HTMLInputElement>(null);
  const alturaRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);

  const router = { push: (url: string) => console.log(url) }
  const handleLogout = () => console.log("logout")

  const handleEditarItem = (item: any) => {
    setEditandoId(item.id); // Salva o ID para sabermos que é uma edição

    const [l, a] = item.medidaCalc.split('x');
    setLargura(l.replace(/\D/g, '')); // Pega só os números
    setAltura(a.replace(/\D/g, ''));
    setQuantidade(item.qtd);

    const vidro = listaVidros.find(v => item.descricao.includes(v.nome));
    if (vidro) setVidroSelecionado(vidro);

    const servico = listaServicos.find(s => s.nome === item.servico);
    setServicoSelecionado(servico || null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    async function carregarDados() {
      // Só dispara se o hook de auth já terminou de carregar e temos uma empresa
      if (checkingAuth || !empresaId) return;

      try {
        console.log("Carregando dados para a empresa:", empresaId);

        const [resC, resV, resS] = await Promise.all([
          supabase.from('clientes').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('vidros').select('*').eq('empresa_id', empresaId).order('nome'),
          supabase.from('servicos').select('*').eq('empresa_id', empresaId).order('nome')
        ]);

        if (resC.data) setListaClientes(resC.data);

        if (resV.data) {
          setListaVidros(resV.data);
          // Seleciona o primeiro vidro automaticamente se a lista não estiver vazia
          if (resV.data.length > 0) setVidroSelecionado(resV.data[0]);
        }

        if (resS.data) setListaServicos(resS.data);

      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
      }
    }

    carregarDados();
  }, [empresaId, checkingAuth]); // Depende do ID da empresa e do status do loading

  // 3. Adicione esta trava de segurança antes do return principal
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1e3a5a]"></div>
      </div>
    );
  }

  const adicionarItem = () => {
    const l = parseFloat(largura);
    const a = parseFloat(altura);
    if (!l || !a || !vidroSelecionado) return alert("Preencha as dimensões!");

    const lCalc = arredondar5cm(l);
    const aCalc = arredondar5cm(a);
    const areaM2 = (lCalc / 1000) * (aCalc / 1000);
    const areaCobrada = areaM2 < 0.25 ? 0.25 : areaM2;

    let total = areaCobrada * Number(vidroSelecionado.preco);
    if (servicoSelecionado) {
      if (servicoSelecionado.unidade === 'm²') total += areaM2 * Number(servicoSelecionado.preco);
      else total += Number(servicoSelecionado.preco);
    }

    const novoItem = {
      // AQUI A MÁGICA: Se estiver editando, mantém o ID antigo. Se não, gera um novo.
      id: editandoId || Date.now(),
      descricao: `${vidroSelecionado.nome} ${vidroSelecionado.espessura || ''}`,
      medidaCalc: `${lCalc}x${aCalc} mm`,
      qtd: quantidade,
      servico: servicoSelecionado?.nome || "",
      total: total * quantidade
    };

    if (editandoId) {
      setItens(itens.map(i => i.id === editandoId ? novoItem : i));
      setEditandoId(null);
    } else {
      setItens([...itens, novoItem]);
    }

    setLargura("");
    setAltura("");
    setQuantidade(1); // Voltamos para 1 para facilitar o próximo

    larguraRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Lógica de "pulo" de campo
      if (document.activeElement === larguraRef.current) {
        alturaRef.current?.focus();
      } else if (document.activeElement === alturaRef.current) {
        qtdRef.current?.focus();
      } else {
        // Se estiver no último campo (Qtd), ele adiciona
        adicionarItem();
        // O foco volta para a largura automaticamente (conforme configuramos no adicionarItem)
        setTimeout(() => larguraRef.current?.focus(), 50);
      }
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: theme.screenBackgroundColor }}>

      {/* SIDEBAR - PADRÃO ORIGINAL */}
      <div className={`${sidebarExpandido ? "w-64" : "w-20"} transition-all duration-300 hidden md:flex flex-col border-r border-gray-100 flex-shrink-0 sticky top-0 h-screen`} style={{ backgroundColor: theme.menuBackgroundColor }}>
        <Sidebar showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} nomeEmpresa={nomeEmpresa} expandido={sidebarExpandido} setExpandido={setSidebarExpandido} />
      </div>

      <div className="flex-1 flex flex-col w-full min-w-0">

        {/* HEADER - PADRÃO ORIGINAL RESTAURADO */}
        <header className="border-b border-gray-100 py-4 px-6 flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu size={22} />
            </button>

            <div className="flex flex-col">
              <h1 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none">Orçamento</h1>
              <span className="text-xs text-gray-300 font-medium"># {Date.now().toString().slice(-6)}</span>
            </div>

            {/* BOTÃO SALVAR DISCRETO */}
            {itens.length > 0 && (
              <button
                onClick={() => console.log("Salvando...")}
                className="ml-4 flex items-center gap-2 px-4 py-1.5 bg-[#1e3a5a]/5 text-[#1e3a5a] rounded-full text-[10px] font-bold uppercase tracking-tighter hover:bg-[#1e3a5a] hover:text-white transition-all active:scale-95"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Salvar Alterações
              </button>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:opacity-75 transition-all">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Building2 size={16} className="text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{nomeEmpresa}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-1xl shadow-xl border border-gray-100 p-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">Logado como</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl">
                  <Wrench size={16} /> Configurações
                </button>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                  <X size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {/* IDENTIFICAÇÃO: CLIENTE E OBRA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase">Cliente:</span>
              <select className="flex-1 p-2 outline-none text-sm bg-transparent" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 px-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Obra:</span>
              <input type="text" placeholder="Identificação da obra" className="flex-1 p-2 outline-none text-sm" value={obra} onChange={(e) => setObra(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">

              {/* CARD DIMENSÕES (MANTIDO) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">

                {/* AVISO DE EDIÇÃO SOFISTICADO */}
                {editandoId && (
                  <div className="absolute top-0 left-0 w-full bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Edit2 size={14} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Modo Edição Ativo</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setLargura(""); setAltura("");
                      }}
                      className="text-amber-700 hover:text-amber-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editandoId ? 'mt-6' : ''}`} style={{ color: theme.menuBackgroundColor }}>
                  <Calculator size={20} /> Dimensões
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Largura</label>
                    <input
                      ref={larguraRef}
                      type="text"
                      placeholder="0"
                      value={largura}
                      onChange={(e) => setLargura(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--menu-icon-color)] focus:ring-2 focus:ring-[var(--menu-icon-color)]/10"
                      style={{ '--menu-icon-color': theme.menuIconColor } as any}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Altura</label>
                    <input
                      ref={alturaRef}
                      type="text"
                      placeholder="0"
                      value={altura}
                      onChange={(e) => setAltura(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/10"
                      style={{ '--focus-color': theme.menuIconColor } as any}
                    />
                  </div>
                  {/* CAMPO QUANTIDADE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Qtd</label>
                    <input
                      ref={qtdRef}
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      onKeyDown={handleKeyDown}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm transition-all 
               focus:border-[var(--focus-color)] focus:ring-2 focus:ring-[var(--focus-color)]/10"
                      style={{ '--focus-color': theme.menuIconColor } as any}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Material</label>
                  <select
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm text-gray-700"
                    value={vidroSelecionado?.id}
                    onChange={(e) => setVidroSelecionado(listaVidros.find(v => v.id === e.target.value))}
                  >
                    <option value="">Selecione o material...</option>
                    {listaVidros.map(v => (
                      <option key={v.id} value={v.id}>
                        {/* Aqui montamos a exibição: Nome/Cor + Espessura + Tipo */}
                        {v.nome} {v.cor ? `- ${v.cor}` : ''} {v.espessura ? `(${v.espessura})` : ''} {v.tipo ? `| ${v.tipo}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Acabamentos</h3>
                </div>

                {/* CAIXA COM ROLAGEM: Altura fixa para mostrar aprox. 2 itens */}
                <div className="space-y-2 max-h-[115px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Opção Padrão Estilizada */}
                  <div
                    onClick={() => setServicoSelecionado(null)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${!servicoSelecionado ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                  >
                    <span className={`text-sm font-medium ${!servicoSelecionado ? 'text-amber-700' : 'text-gray-500'}`}>
                      Nenhum
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!servicoSelecionado ? 'border-amber-500' : 'border-gray-300'}`}>
                      {!servicoSelecionado && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                    </div>
                  </div>

                  {/* Lista de outros serviços */}
                  {listaServicos.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setServicoSelecionado(s)}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${servicoSelecionado?.id === s.id ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                    >
                      <span className={`text-sm font-medium ${servicoSelecionado?.id === s.id ? 'text-amber-700' : 'text-gray-500'}`}>
                        {s.nome}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${servicoSelecionado?.id === s.id ? 'border-amber-500' : 'border-gray-300'}`}>
                        {servicoSelecionado?.id === s.id && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center w-full pt-4">
                  <button
                    onClick={() => {
                      if (editandoId) {
                        // Remove o antigo e adiciona o novo com os dados atualizados
                        setItens(prev => prev.filter(i => i.id !== editandoId));
                        setEditandoId(null);
                      }
                      adicionarItem();
                    }}
                    className="w-1/2 py-2.5 bg-white text-[#1e3a5a] border border-[#1e3a5a]/30 rounded-xl font-bold hover:bg-[#1e3a5a]/5 hover:border-[#1e3a5a] transition-all flex items-center justify-center gap-2"
                  >
                    {editandoId ? <Sparkles size={18} /> : <Plus size={18} />}
                    <span>{editandoId ? "Atualizar Item" : "Adicionar Item"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#1e3a5a]" />
                    <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">Resumo do Pedido</h3>
                  </div>
                  {itens.length > 0 && (
                    <button
                      onClick={() => setMostrarModalLimpar(true)} // Agora abre o modal em vez do confirm do navegador
                      className="text-[10px] font-bold text-gray-300 hover:text-red-500 transition-colors uppercase tracking-tighter"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto flex-1">
                  {itens.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#f8fafc] text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Descrição</th>
                          <th className="px-6 py-4 text-center">Medidas</th>
                          <th className="px-6 py-4 text-center">Qtd</th>
                          <th className="px-6 py-4 text-right">Subtotal</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-50">
                        {itens.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-700">{item.descricao}</div>
                              <div className="text-[10px] text-gray-400 uppercase">{item.servico}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-600">
                              {item.medidaCalc}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-bold text-gray-500">
                                {item.qtd}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-[#1e3a5a]">
                              {formatarMoeda(item.total)}
                            </td>
                            {/* Dentro do seu itens.map na tabela */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditarItem(item)}
                                  className="p-2 rounded-lg transition-colors hover:bg-gray-50"
                                  style={{ color: theme.menuIconColor }} // Aplica a cor do tema (verde)
                                >
                                  <Edit2 size={16} />
                                </button>

                                <button
                                  onClick={() => setItemParaExcluir(item.id)}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Calculator size={40} className="opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Nenhum item adicionado ao orçamento</p>
                    </div>
                  )}
                </div>

                {/* Rodapé Ultra Discreto */}
                <div className="p-5 bg-white border-t border-gray-50 flex items-center justify-between px-8">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Itens:
                      </span>
                      <span className="text-sm font-bold text-gray-500">
                        {itens.length.toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Divisor sutil */}
                    <div className="h-4 w-[1px] bg-gray-100" />

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Subtotal:
                      </span>
                      <span className="text-sm font-medium text-gray-400">
                        {formatarMoeda(itens.reduce((acc, i) => acc + i.total, 0))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#1e3a5a]/40 uppercase tracking-[0.3em]">
                      Total Geral
                    </span>
                    <span className="text-xl font-light text-[#1e3a5a] tracking-tight">
                      {formatarMoeda(itens.reduce((acc, i) => acc + i.total, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {itemParaExcluir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Remover Item?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Tem certeza que deseja remover este item do pedido? Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex border-t border-gray-50">
                <button
                  onClick={() => setItemParaExcluir(null)}
                  className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    setItens(itens.filter(i => i.id !== itemParaExcluir));
                    setItemParaExcluir(null);
                  }}
                  className="flex-1 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 border-l border-gray-50 transition-colors"
                >
                  EXCLUIR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Adicione este Modal no final do componente (perto do outro modal) */}
        {mostrarModalLimpar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={28} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Esvaziar orçamento?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Isso irá remover **todos os {itens.length} itens** da sua lista atual. Essa ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex border-t border-gray-50">
                <button
                  onClick={() => setMostrarModalLimpar(false)}
                  className="flex-1 px-6 py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    setItens([]);
                    setMostrarModalLimpar(false);
                  }}
                  className="flex-1 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 border-l border-gray-50 transition-colors"
                >
                  LIMPAR TUDO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}