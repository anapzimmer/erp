"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Box, Star, Tag, DollarSign, Upload, Download, Edit2, Trash2, PlusCircle, X, Building2, ChevronDown, LogOut, Settings, Menu, ChevronRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"

// --- Tipagens ---
type Vidro = { id: string; nome: string; espessura: string; tipo: string; preco: number; empresa_id: string; }
type PrecoGrupo = { id: string; vidro_id: string; grupo_preco_id: string; preco: number; grupo_nome?: string }
type Grupo = { id: string; nome: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

import { LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase, UsersRound } from "lucide-react"

const menuPrincipal: MenuItem[] = [
  { nome: "Dashboard", rota: "/", icone: LayoutDashboard },
  { nome: "Orçamentos", rota: "/orcamentos", icone: FileText, submenu: [{ nome: "Espelhos", rota: "/espelhos" }, { nome: "Vidros", rota: "/calculovidro" }, { nome: "Vidros PDF", rota: "/calculovidroPDF" },] },
  { nome: "Imagens", rota: "/imagens", icone: ImageIcon },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3 },
]
const menuCadastros: MenuItem[] = [
  { nome: "Clientes", rota: "/clientes", icone: UsersRound },
  { nome: "Vidros", rota: "/vidros", icone: Square },
  { nome: "Perfis", rota: "/perfis", icone: Package },
  { nome: "Ferragens", rota: "/ferragens", icone: Wrench },
  { nome: "Kits", rota: "/kits", icone: Boxes },
  { nome: "Serviços", rota: "/servicos", icone: Briefcase },
]

// --- Utils ---
const formatarParaBanco = (texto: string) => { if (!texto) return ""; return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1) }
const padronizarEspessura = (valor: string) => { if (!valor) return ""; const limpo = valor.replace(/\s/g, "").toLowerCase(); const partes = limpo.split("+").map(p => p.replace(/\D/g, "").padStart(2, "0")); const partesValidas = partes.filter(p => p !== "00"); if (partesValidas.length === 0) return ""; return partesValidas.join("+") + "mm" }

export default function VidrosPage() {
  const router = useRouter()

  // --- Autenticação (Padronizado) ---
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth();

  // --- Estados de UI e Branding ---
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [logoDark, setLogoDark] = useState<string | null>("/glasscode2.png");
  const [darkPrimary, setDarkPrimary] = useState("#1C415B");
  const [darkSecondary, setDarkSecondary] = useState("#FFFFFF");
  const [darkTertiary, setDarkTertiary] = useState("#39B89F");
  const [darkHover, setDarkHover] = useState("#39B89F");
  const [lightPrimary, setLightPrimary] = useState("#F4F7FA");
  const [lightSecondary, setLightSecondary] = useState("#FFFFFF");
  const [lightTertiary, setLightTertiary] = useState("#1C415B");

  // --- Estados da Lógica de Negócio ---
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [novoVidro, setNovoVidro] = useState<Omit<Vidro, "id" | "empresa_id">>({ nome: "", espessura: "", tipo: "", preco: 0 })
  const [editando, setEditando] = useState<Vidro | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [precosGruposModal, setPrecosGruposModal] = useState<PrecoGrupo[]>([])
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void } | null>(null)

  // --- Estados de Filtro ---
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroEspessura, setFiltroEspessura] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")

  // --- Efeitos ---
  useEffect(() => {
    // Redirecionar se não houver usuário logado
    if (!checkingAuth && !user) {
      router.push("/login");
      return;
    }
  }, [user, checkingAuth, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) { setShowUserMenu(false); } };
    document.addEventListener("mousedown", handleClickOutside);
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // --- Carregar Dados e Branding ---
  const carregarDados = useCallback(async () => {
    // Não tentar carregar se não houver empresaId
    if (!empresaId) return;

    setCarregando(true)
    const [{ data: dataVidros, error: errorVidros }, { data: dataGrupos, error: errorGrupos }] = await Promise.all([
      supabase.from("vidros").select("*").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      supabase.from("tabelas").select("id, nome").eq("empresa_id", empresaId).order("nome", { ascending: true })
    ])

    if (errorVidros) {
      console.error("Erro Vidros:", errorVidros);
    } else {
      setVidros(dataVidros || [])
    }

    if (errorGrupos) {
      console.error("Erro Grupos:", errorGrupos);
    } else {
      setGrupos(dataGrupos || [])
    }

    // Branding
    const { data: brandingData } = await supabase.from("configuracoes_branding").select("*").eq("empresa_id", empresaId).single();
    if (brandingData) {
      setLogoDark(brandingData.logo_dark || "/glasscode2.png");
      setDarkPrimary(brandingData.dark_primary);
      setDarkSecondary(brandingData.dark_secondary);
      setDarkTertiary(brandingData.dark_tertiary);
      setDarkHover(brandingData.dark_hover);
      setLightPrimary(brandingData.light_primary);
      setLightSecondary(brandingData.light_secondary);
      setLightTertiary(brandingData.light_tertiary);
    }
    setCarregando(false)
  }, [empresaId])

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId, carregarDados]);

  // --- Lógica (Import, Export, Limpar, Salvar) ---
  const exportarCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Nome;Espessura;Tipo;Preco\n"
      + vidros.map(v =>
        `${formatarParaBanco(v.nome)};${padronizarEspessura(v.espessura)};${formatarParaBanco(v.tipo)};${v.preco}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vidros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaId) return;
    setCarregando(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        setModalAviso({ titulo: "Erro", mensagem: "Formato de arquivo inválido." });
        setCarregando(false);
        return;
      }
      const rows = text.split("\n").slice(1);
      let atualizados = 0, inseridos = 0, erros = 0;
      for (const row of rows) {
        if (!row.trim()) continue;
        const colunas = row.replace(/['"]+/g, '').split(";");
        if (colunas.length < 4) { erros++; continue; }
        const [nome, espessura, tipo, preco] = colunas;
        if (nome && espessura && tipo && preco) {
          try {
            const nomeFormatado = formatarParaBanco(nome);
            const espessuraFormatada = padronizarEspessura(espessura);
            const tipoFormatado = formatarParaBanco(tipo);
            const precoFormatado = Number(preco.toString().replace(",", "."));
            if (isNaN(precoFormatado)) { erros++; continue; }
            const { data: existente } = await supabase.from("vidros").select("id, preco").eq("nome", nomeFormatado).eq("espessura", espessuraFormatada).eq("tipo", tipoFormatado).eq("empresa_id", empresaId).single();
            if (existente) {
              if (existente.preco !== precoFormatado) {
                const { error: errorUpdate } = await supabase.from("vidros").update({ preco: precoFormatado }).eq("id", existente.id);
                if (errorUpdate) erros++; else atualizados++;
              }
            } else {
              const { error: errorInsert } = await supabase.from("vidros").insert([{ nome: nomeFormatado, espessura: espessuraFormatada, tipo: tipoFormatado, preco: precoFormatado, empresa_id: empresaId }]);
              if (errorInsert) erros++; else inseridos++;
            }
          } catch (e) { erros++; }
        } else { erros++; }
      }
      await carregarDados();
      setCarregando(false);
      setModalAviso({ titulo: "Importação Concluída", mensagem: `Resumo:\n- Atualizados: ${atualizados}\n- Novos: ${inseridos}\n- Erros: ${erros}\n\nVerifique os dados na tabela.` });
      event.target.value = "";
    };
    reader.onerror = () => { setCarregando(false); setModalAviso({ titulo: "Erro", mensagem: "Falha ao ler o arquivo." }); };
    reader.readAsText(file);
  }

  const limparDuplicados = () => {
    setModalAviso({
      titulo: "Limpar Duplicados",
      mensagem: "Tem certeza? Isso manterá apenas o maior preço para vidros com o mesmo Nome, Espessura e Tipo, e apagará os outros.",
      confirmar: async () => {
        setCarregando(true);
        try {
          const { data: todosVidros } = await supabase.from("vidros").select("*").eq("empresa_id", empresaId);
          if (!todosVidros) return;
          const gruposMap: Record<string, Vidro[]> = {};
          todosVidros.forEach(v => {
            const chave = `${v.nome.trim().toLowerCase()}-${padronizarEspessura(v.espessura)}-${v.tipo.trim().toLowerCase()}`;
            if (!gruposMap[chave]) gruposMap[chave] = [];
            gruposMap[chave].push(v);
          });
          const idsParaDeletar: string[] = [];
          Object.values(gruposMap).forEach(grupo => {
            if (grupo.length > 1) {
              grupo.sort((a, b) => b.preco - a.preco);
              const paraRemover = grupo.slice(1);
              idsParaDeletar.push(...paraRemover.map(v => v.id));
            }
          });
          if (idsParaDeletar.length > 0) {
            await supabase.from("vidro_precos_grupos").delete().in("vidro_id", idsParaDeletar);
            await supabase.from("vidros").delete().in("id", idsParaDeletar);
          }
          await carregarDados();
          setModalAviso({ titulo: "Sucesso", mensagem: `${idsParaDeletar.length} duplicados removidos.` });
        } catch (e: any) { setModalAviso({ titulo: "Erro", mensagem: e.message }); } finally { setCarregando(false); }
      }
    });
  }

  const salvarVidro = async () => {
    if (!novoVidro.nome.trim() || !novoVidro.espessura.trim() || !novoVidro.tipo.trim()) { setModalAviso({ titulo: "Atenção", mensagem: "Preencha todos os campos obrigatórios." }); return }
    if (!empresaId) return;
    setCarregando(true)

    const vidroPadronizado = {
      nome: formatarParaBanco(novoVidro.nome),
      tipo: formatarParaBanco(novoVidro.tipo),
      espessura: padronizarEspessura(novoVidro.espessura),
      preco: Number(novoVidro.preco),
      empresa_id: empresaId
    }

    try {
      let vidroId = editando?.id

      if (editando) {
        const { error } = await supabase.from("vidros").update(vidroPadronizado).eq("id", vidroId).eq("empresa_id", empresaId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("vidros").insert([vidroPadronizado]).select().single()
        if (error) throw error
        vidroId = data.id
      }

      if (vidroId) {
        const { data: precosOriginais } = await supabase.from("vidro_precos_grupos").select("id").eq("vidro_id", vidroId)
        const idsOriginais = precosOriginais?.map(p => p.id) || []

        const idsAtuais = precosGruposModal.filter(p => p.id && p.id !== "").map(p => p.id)
        const idsParaExcluir = idsOriginais.filter(id => !idsAtuais.includes(id))

        if (idsParaExcluir.length > 0) { await supabase.from("vidro_precos_grupos").delete().in("id", idsParaExcluir) }

        for (const p of precosGruposModal) {
          if (!p.grupo_preco_id || isNaN(p.preco)) continue

          if (p.id && p.id !== "") {
            await supabase.from("vidro_precos_grupos").update({ preco: p.preco }).eq("id", p.id)
          } else {
            await supabase.from("vidro_precos_grupos").insert([{ vidro_id: vidroId, grupo_preco_id: p.grupo_preco_id, preco: p.preco }])
          }
        }
      }

      setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 }); setEditando(null); setPrecosGruposModal([]); setMostrarModal(false);
      carregarDados();
    } catch (e: any) { setModalAviso({ titulo: "Erro", mensagem: "Erro ao processar: " + e.message }) } finally { setCarregando(false) }
  }

  const deletarVidro = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão", mensagem: "Tem certeza que deseja excluir este vidro? Isso removerá preços especiais associados.", confirmar: async () => {
        await supabase.from("vidro_precos_grupos").delete().eq("vidro_id", id)
        const { error } = await supabase.from("vidros").delete().eq("id", id)
        if (error) setModalAviso({ titulo: "Erro", mensagem: "Erro ao excluir: " + error.message }); else { setVidros(prev => prev.filter(v => v.id !== id)); setModalAviso(null); }
      }
    })
  }

  const abrirModalParaEdicao = async (vidro: Vidro) => {
    setEditando(vidro);
    setNovoVidro({ nome: vidro.nome, espessura: vidro.espessura, tipo: vidro.tipo, preco: vidro.preco });
    const { data } = await supabase.from("vidro_precos_grupos").select("*, grupo:tabelas(nome)").eq("vidro_id", vidro.id)
    const precosFormatados = (data || []).map((p: any) => ({ id: p.id, vidro_id: p.vidro_id, grupo_preco_id: p.grupo_preco_id, preco: Number(p.preco) || 0, grupo_nome: p.grupo?.nome || "" }))
    setPrecosGruposModal(precosFormatados);
    setMostrarModal(true);
  }
  const abrirModalParaNovo = () => { setEditando(null); setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 }); setPrecosGruposModal([]); setMostrarModal(true); }

  // --- Filtros e Cálculos ---
  const vidrosFiltrados = vidros.filter(v =>
    (filtroNome ? v.nome.toLowerCase().includes(filtroNome.toLowerCase()) : true) &&
    (filtroEspessura ? v.espessura.toLowerCase().includes(filtroEspessura.toLowerCase()) : true) &&
    (filtroTipo ? v.tipo.toLowerCase().includes(filtroTipo.toLowerCase()) : true)
  )

  const calcularPrecoMedio = () => { if (vidros.length === 0) return "R$ 0,00"; const total = vidros.reduce((acc, v) => acc + v.preco, 0); return formatarPreco(total / vidros.length) }
  const getMaisProcurados = () => vidros.slice(0, 1).map(v => v.nome).join(", ") || "-"
  const contarPrecoEspecial = () => precosGruposModal.filter(p => !isNaN(p.preco) && p.preco > 0).length
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  // --- Render MenuItem ---
  const renderMenuItem = (item: MenuItem) => { const Icon = item.icone; return (<div key={item.nome} className="group mb-1"> <div onClick={() => { router.push(item.rota); setShowMobileMenu(false); }} className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1" style={{ color: darkSecondary }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${darkHover}33`; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }} > <div className="flex items-center gap-3"> <Icon className="w-5 h-5" style={{ color: darkTertiary }} /> <span className="font-medium text-sm">{item.nome}</span> </div> {item.submenu && <ChevronRight className="w-4 h-4" style={{ color: darkSecondary, opacity: 0.7 }} />} </div> </div>) }

  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: darkPrimary, borderTopColor: 'transparent' }}></div></div>;

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: lightPrimary }}>
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: darkPrimary }}>
        <button onClick={() => setShowMobileMenu(false)} className="md:hidden absolute top-4 right-4 text-white/50"> <X size={24} /> </button>
        <div className="px-3 py-4 mb-4 flex justify-center"> <Image src={logoDark || "/glasscode2.png"} alt="Logo ERP" width={200} height={56} className="h-12 md:h-14 object-contain" /> </div>
        <nav className="flex-1 overflow-y-auto space-y-6 pr-2">
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Principal</p> {menuPrincipal.map(renderMenuItem)} </div>
          <div> <p className="px-3 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: darkTertiary }}>Cadastros</p> {menuCadastros.map(renderMenuItem)} </div>
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">
        {/* TOPBAR */}
        <header className="border-b border-gray-100 py-3 px-4 md:py-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm" style={{ backgroundColor: lightSecondary }}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100"> <Menu size={24} className="text-gray-600" /> </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-200 hover:opacity-75 transition-all">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600"> <Building2 size={16} /> </div>
                {/* Título do Botão */}
                <span className="text-sm font-medium text-gray-700 hidden md:block"> {nomeEmpresa || "Empresa"} </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 mb-2">
                    <p className="text-xs text-gray-400">Logado como</p>
                    {/* Apenas Email aqui */}
                    <p className="text-sm font-semibold text-gray-800 truncate"> {user?.email} </p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); router.push("/configuracoes"); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl"> <Settings size={18} className="text-gray-400" />Configurações </button>
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl"> <LogOut size={18} />Sair </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${darkTertiary}15`, color: darkTertiary }}> <Square size={28} /> </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black" style={{ color: lightTertiary }}>Dashboard de Vidros</h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie seu catálogo de vidros e preços.</p>
              </div>
            </div>
            {/* BOTÕES DE IMPORT/EXPORT */}
            <div className="flex gap-2">
              <button onClick={exportarCSV} className="p-2.5 rounded-xl bg-white border border-gray-100 hover:bg-gray-50" title="Exportar CSV"> <Download className="w-5 h-5 text-gray-600" /> </button>
              <label htmlFor="importarCSV" className="p-2.5 rounded-xl bg-white border border-gray-100 cursor-pointer hover:bg-gray-50" title="Importar CSV"> <Upload className="w-5 h-5 text-gray-600" /> </label>
              <input type="file" id="importarCSV" accept=".csv" className="hidden" onChange={importarCSV} />
            </div>
          </div>

          {/* CARDS INDICADORES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { titulo: "Total", valor: vidros.length, icone: Box },
              { titulo: "Mais Procurado", valor: getMaisProcurados(), icone: Star },
              { titulo: "Preço Médio", valor: calcularPrecoMedio(), icone: DollarSign },
              { titulo: "Grupos Especiais", valor: contarPrecoEspecial(), icone: Tag }
            ].map(card => (
              <div key={card.titulo} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <card.icone className="w-7 h-7 mb-2" style={{ color: darkTertiary }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: darkPrimary }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E BOTAO NOVO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Nome..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1 focus:outline-none" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              <input type="text" placeholder="Espessura..." value={filtroEspessura} onChange={e => setFiltroEspessura(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1 focus:outline-none" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              <input type="text" placeholder="Tipo..." value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-1 focus:outline-none" style={{ borderColor: darkTertiary, "--tw-ring-color": darkTertiary } as React.CSSProperties} />
            </div>
            <div className="flex gap-2">
              <button onClick={limparDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition"> <Trash2 size={18} />Limpar Duplicados</button>
              <button onClick={abrirModalParaNovo} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm hover:opacity-90 transition" style={{ backgroundColor: darkTertiary, color: darkPrimary }}> <PlusCircle size={20} /> Novo Vidro </button>
            </div>
          </div>

          {/* TABELA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse" style={{ fontFamily: 'sans-serif' }}>
              <thead style={{ backgroundColor: darkPrimary, color: darkSecondary }}>
                <tr>
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Espessura</th>
                  <th className="p-4 font-semibold">Tipo</th>
                  <th className="p-4 font-semibold">Preço Base</th>
                  <th className="p-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100" style={{ color: '#374151' }}>
                {vidrosFiltrados.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{v.nome}</td>
                    <td className="p-4">{v.espessura}</td>
                    <td className="p-4">{v.tipo}</td>
                    <td className="p-4 font-semibold" style={{ color: darkPrimary }}>{formatarPreco(v.preco)}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirModalParaEdicao(v)} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: darkPrimary }} title="Editar"> <Edit2 size={18} /> </button>
                        <button onClick={() => deletarVidro(v.id)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50" title="Deletar"> <Trash2 size={18} /> </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold" style={{ color: darkPrimary }}>{editando ? "Editar Vidro" : "Cadastrar Vidro"}</h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nome do Vidro *</label>
                <input type="text" placeholder="Ex: Vidro Temperado" value={novoVidro.nome} onChange={e => setNovoVidro({ ...novoVidro, nome: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Espessura *</label>
                <input type="text" placeholder="Ex: 8mm" value={novoVidro.espessura} onChange={e => setNovoVidro({ ...novoVidro, espessura: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Tipo *</label>
                <input type="text" placeholder="Ex: Liso" value={novoVidro.tipo} onChange={e => setNovoVidro({ ...novoVidro, tipo: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Preço Base (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={novoVidro.preco} onChange={e => setNovoVidro({ ...novoVidro, preco: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
              </div>
            </div>

            {/* SEÇÃO DE PREÇOS POR GRUPO NO MODAL */}
            <div className="pt-4 border-t border-gray-100 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">Preços por Tabela/Grupo</h3>
                <button onClick={() => setPrecosGruposModal([...precosGruposModal, { id: "", vidro_id: editando?.id || "", grupo_preco_id: "", preco: 0, grupo_nome: "" }])} className="text-xs font-semibold flex items-center gap-1 text-blue-600 hover:text-blue-700">
                  <PlusCircle size={14} /> Adicionar Preço Especial
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {precosGruposModal.map((p, index) => (
                  <div key={index} className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 items-center">
                    <input
                      type="text"
                      list="listaGrupos"
                      value={p.grupo_nome}
                      onChange={e => {
                        const novos = [...precosGruposModal]
                        novos[index].grupo_nome = e.target.value
                        const grupo = grupos.find(g => g.nome === e.target.value)
                        if (grupo) novos[index].grupo_preco_id = grupo.id
                        setPrecosGruposModal(novos)
                      }}
                      className="p-2 rounded border border-gray-200 text-xs flex-1 focus:outline-none focus:ring-1"
                      style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties}
                      placeholder="Selecione a tabela"
                    />
                    <datalist id="listaGrupos">
                      {grupos.map(g => (<option key={g.id} value={g.nome} />))}
                    </datalist>
                    <input type="number" step="0.01" placeholder="R$ 0,00" value={p.preco} onChange={e => {
                      const novos = [...precosGruposModal]
                      novos[index].preco = Number(e.target.value)
                      setPrecosGruposModal(novos)
                    }}
                      className="p-2 rounded border border-gray-200 text-xs w-24 focus:outline-none focus:ring-1" style={{ "--tw-ring-color": darkTertiary } as React.CSSProperties} />
                    <button onClick={() => setPrecosGruposModal(precosGruposModal.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-1"> <Trash2 size={16} /> </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button onClick={() => setMostrarModal(false)} className="px-6 py-3 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</button>
              <button onClick={salvarVidro} disabled={carregando} className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: darkPrimary }}>
                {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO / CARREGAMENTO */}
      {(modalAviso || carregando) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 animate-fade-in px-4">
          {carregando && !modalAviso && (
            <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: darkTertiary }} />
              <p className="text-gray-600 font-medium">Processando dados...</p>
            </div>
          )}
          {modalAviso && (
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm border border-gray-100">
              <h2 className="text-xl font-extrabold mb-4 flex items-center gap-3"> <Trash2 className="text-red-500" /> {modalAviso.titulo} </h2>
              <p className="text-gray-600 mb-8 text-sm whitespace-pre-line">{modalAviso.mensagem}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModalAviso(null)} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200">Cancelar</button>
                {modalAviso.confirmar && (<button onClick={() => { modalAviso.confirmar?.(); setModalAviso(null); }} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Confirmar</button>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTÃO VOLTAR AO TOPO */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-50 transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: darkTertiary, color: darkPrimary }}
          title="Voltar ao topo"
        >
          <ChevronDown size={24} className="rotate-180" />
        </button>
      )}
    </div>
  )
}