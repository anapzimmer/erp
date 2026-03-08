"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Box, Star, Tag, DollarSign, Upload, Download, Edit2, Trash2, PlusCircle, X, Printer, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"
import { VidrosPDF } from "app/relatorios/vidros/VidrosPDF"
import { useTheme } from "@/context/ThemeContext" // 🔥 Importando o contexto de tema
import { PDFDownloadLink } from "@react-pdf/renderer";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ThemeLoader from "@/components/ThemeLoader"

// --- Tipagens ---
type Vidro = { id: string; nome: string; espessura: string; tipo: string; preco: number; empresa_id: string; }
type PrecoGrupo = { id: string; vidro_id: string; grupo_preco_id: string; preco: number; grupo_nome?: string }
type Grupo = { id: string; nome: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }

import { LayoutDashboard, FileText, Image as ImageIcon, BarChart3, Square, Package, Wrench, Boxes, Briefcase, UsersRound } from "lucide-react"

// --- Utils ---
const formatarParaBanco = (texto: string) => { if (!texto) return ""; return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1) }
const padronizarEspessura = (valor: string) => { if (!valor) return ""; const limpo = valor.replace(/\s/g, "").toLowerCase(); const partes = limpo.split("+").map(p => p.replace(/\D/g, "").padStart(2, "0")); const partesValidas = partes.filter(p => p !== "00"); if (partesValidas.length === 0) return ""; return partesValidas.join("+") + "mm" }

export default function VidrosPage() {
  const router = useRouter()
  const { theme } = useTheme(); // 🔥 Consumindo o tema

  // --- Autenticação (Padronizado) ---
  const { user, empresaId, nomeEmpresa, loading: checkingAuth } = useAuth();

  // --- Estados de UI ---
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- Estados da Lógica de Negócio ---
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [novoVidro, setNovoVidro] = useState<Omit<Vidro, "id" | "empresa_id">>({ nome: "", espessura: "", tipo: "", preco: 0 })
  const [editando, setEditando] = useState<Vidro | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [precosGruposModal, setPrecosGruposModal] = useState<PrecoGrupo[]>([])
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void; tipo?: 'sucesso' | 'erro' | 'aviso' } | null>(null)
  // --- Estados de Filtro ---
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroEspessura, setFiltroEspessura] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [sidebarExpandido, setSidebarExpandido] = useState(true); // Adicione esta linha
// ...


  // --- Efeitos ---
  useEffect(() => {
    if (empresaId) {
      carregarDados();
      carregarBranding();
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

  // --- Carregar Dados ---
  const carregarDados = useCallback(async () => {
    if (!empresaId) return;

    setCarregando(true)
    const [{ data: dataVidros, error: errorVidros }, { data: dataGrupos, error: errorGrupos }] = await Promise.all([
      supabase.from("vidros").select("*").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      supabase.from("tabelas").select("id, nome").eq("empresa_id", empresaId).order("nome", { ascending: true })
    ])

    if (errorVidros) console.error("Erro Vidros:", errorVidros);
    else setVidros(dataVidros || [])

    if (errorGrupos) console.error("Erro Grupos:", errorGrupos);
    else setGrupos(dataGrupos || [])

    setCarregando(false)
  }, [empresaId])

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId, carregarDados]);

  // --- Lógica (Import, Export, CRUD) ---
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

  const capitalizarFrase = (texto: string) => {
    if (!texto) return "";
    const limpo = texto.trim().toLowerCase();
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  };

  const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // DEBUG: Verifique se o empresaId está chegando aqui
    console.log("Iniciando importação para Empresa ID:", empresaId);

    if (!file || !empresaId) {
      setModalAviso({ titulo: "Erro", mensagem: "Empresa não identificada ou arquivo ausente." });
      return;
    }

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
            const nomeOriginal = colunas[0];
            const nomeFormatado = capitalizarFrase(formatarParaBanco(nomeOriginal));
            const espessuraFormatada = padronizarEspessura(espessura);
            const tipoFormatado = capitalizarFrase(formatarParaBanco(tipo));
            const precoFormatado = Number(preco.toString().replace(",", "."));

            if (isNaN(precoFormatado)) { erros++; continue; }

            // 1. BUSCA EXISTENTE (Ajustado para evitar erro 400/406)
            const { data: existente, error: errorSearch } = await supabase
              .from("vidros")
              .select("id, preco")
              .eq("nome", nomeFormatado)
              .eq("espessura", espessuraFormatada)
              .eq("tipo", tipoFormatado)
              .eq("empresa_id", empresaId)
              .maybeSingle(); // Usar maybeSingle é mais seguro que .single()

            if (existente) {
              if (existente.preco !== precoFormatado) {
                const { error: errorUpdate } = await supabase
                  .from("vidros")
                  .update({ preco: precoFormatado })
                  .eq("id", existente.id);

                if (errorUpdate) {
                  console.error("Erro no Update:", errorUpdate.message);
                  erros++;
                } else {
                  atualizados++;
                }
              }
            } else {
              // 2. INSERE NOVO (Aqui acontece o 403)
              const { error: errorInsert } = await supabase
                .from("vidros")
                .insert([{
                  nome: nomeFormatado,
                  espessura: espessuraFormatada,
                  tipo: tipoFormatado,
                  preco: precoFormatado,
                  empresa_id: empresaId
                }]);

              if (errorInsert) {
                console.error("Erro no Insert (403?):", errorInsert.message);
                erros++;
              } else {
                inseridos++;
              }
            }
          } catch (e) {
            console.error("Erro inesperado na linha:", e);
            erros++;
          }
        } else { erros++; }
      }

      await carregarDados();
      setCarregando(false);
      setModalAviso({
        titulo: "Importação Concluída",
        mensagem: `Resumo:\n- Atualizados: ${atualizados}\n- Novos: ${inseridos}\n- Erros: ${erros}`,
        tipo: "sucesso"
      });
      event.target.value = "";
    };
    reader.onerror = () => {
      setCarregando(false);
      setModalAviso({ titulo: "Erro", mensagem: "Falha ao ler o arquivo." });
    };
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
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icone
    const temSubmenu = !!item.submenu
    const isActive = false; // Implementar lógica de ativação se necessário

    return (
      <div key={item.nome} className="mb-1">
        <div
          onClick={() => {
            if (!temSubmenu) {
              router.push(item.rota)
              setShowMobileMenu(false)
            }
          }}
          className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out hover:translate-x-1"
          style={{
            color: theme.menuTextColor,
            backgroundColor: isActive ? theme.menuHoverColor : "transparent"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.menuHoverColor }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent" }}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: theme.menuIconColor }} />
            <span className="font-medium text-sm">{item.nome}</span>
          </div>
        </div>

        {temSubmenu && (
          <div className="ml-8 mt-1 space-y-1">
            {item.submenu!.map((sub) => (
              <div
                key={sub.nome}
                onClick={() => {
                  router.push(sub.rota)
                  setShowMobileMenu(false)
                }}
                className="text-sm p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-all"
                style={{ color: theme.menuTextColor, opacity: 0.8 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.menuHoverColor }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
              >
                {sub.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  const [branding, setBranding] = useState<any>(null);

const carregarBranding = useCallback(async () => {
  // 1. Só executa se tivermos o ID da empresa logada
  if (!empresaId) return;

  try {
    const { data, error } = await supabase
      .from('configuracoes_branding')
      .select('*')
      .eq('empresa_id', empresaId) // 🔥 FILTRO ESSENCIAL: busca apenas o branding desta empresa
      .single();

    if (error) {
      console.error("Erro ao buscar branding:", error.message);
      return;
    }

    if (data) {
      setBranding(data);
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}, [empresaId]); // O useCallback monitora o empresaId



// 2. Antes de chegar ao PDFDownloadLink, defina as constantes:
const logoLight = branding?.logo_light || null;
  const darkPrimary = branding?.button_dark_bg || '#1C415B';
  const darkSecondary = branding?.button_dark_text || '#FFFFFF';
  const darkTertiary = branding?.menu_hover_color || '#39B89F';
  const textDefault = branding?.content_text_light_bg || '#1C415B';

  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: theme.menuBackgroundColor, borderTopColor: 'transparent' }}></div></div>;

  return (
    <div className="flex min-h-screen text-gray-900" style={{ backgroundColor: theme.screenBackgroundColor }}>
    {/* --- SIDEBAR CORRIGIDA --- */}
<Sidebar
  showMobileMenu={showMobileMenu}
  setShowMobileMenu={setShowMobileMenu}
  nomeEmpresa={nomeEmpresa} // Certifique-se de que essa variável existe
  // Passe estas props se quiser o botão de recolher nesta página:
  expandido={sidebarExpandido} 
  setExpandido={setSidebarExpandido}
/>
{/* ------------------------- */}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col w-full">
        {/* TOPBAR */}
        <Header
          setShowMobileMenu={setShowMobileMenu}
          nomeEmpresa={nomeEmpresa}
          usuarioEmail={user?.email || ""}
          handleSignOut={handleSignOut}

        />

        {/* CONTEÚDO ESPECÍFICO */}
        <main className="p-4 md:p-8 flex-1">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.menuIconColor}15`, color: theme.menuIconColor }}> <Square size={28} /> </div>
              <div>
                <h1 className="text-2xl md:text-42 font-black" style={{ color: theme.menuBackgroundColor }}>Dashboard de Vidros</h1>
                <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Gerencie seu catálogo de vidros e preços.</p>
              </div>
            </div>
            {/* BOTÕES DE AÇÕES SUPERIORES */}
            <div className="flex items-center gap-2 no-print">

              {/* Botão Imprimir PDF */}
              {typeof window !== "undefined" && (
                <PDFDownloadLink
                  document={
                    <VidrosPDF
                      dados={vidrosFiltrados}
                      empresa={nomeEmpresa || "Sua Empresa"}
                      logoUrl={theme.logoLightUrl} // Usa o que já está no tema do sistema
                      coresEmpresa={{
                        primary: theme.menuBackgroundColor, // Cor do menu daquela empresa
                        secondary: theme.menuTextColor,
                        tertiary: theme.menuIconColor,
                        textDefault: '#1C415B'
                      }}
                    />
                  }
                  fileName={`catalogo_vidros_${(nomeEmpresa || "empresa").toLowerCase().replace(/\s+/g, '_')}.pdf`}
                  className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
                >
                  {({ loading }) => (
                    loading ? (
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    ) : (
                      <Printer
                        size={20}
                        className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                        style={{ color: 'inherit' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = darkPrimary}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                      />
                    )
                  )}
                </PDFDownloadLink>
              )}
              {/* Botão Exportar CSV */}
              <button
                onClick={exportarCSV}
                title="Exportar CSV"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Download
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4ca4db"}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
              </button>

              {/* Botão Importar CSV */}
              <label
                htmlFor="importarCSV"
                title="Importar CSV"
                className="group p-2.5 rounded-xl bg-white border border-gray-100 cursor-pointer hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
              >
                <Upload
                  size={20}
                  className="text-gray-500 transition-all duration-300 group-hover:scale-110"
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4ca4db"}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                />
                <input type="file" id="importarCSV" accept=".csv" className="hidden" onChange={importarCSV} />
              </label>
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
                <card.icone className="w-7 h-7 mb-2" style={{ color: theme.menuIconColor }} />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.titulo}</h3>
                <p className="text-2xl font-bold" style={{ color: theme.menuBackgroundColor }}>{card.valor}</p>
              </div>
            ))}
          </div>

          {/* FILTROS E BOTAO NOVO */}
          <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-3">
              {["Nome", "Espessura", "Tipo"].map((label) => (
                <input
                  key={label}
                  type="text"
                  placeholder={`${label}...`}
                  value={label === "Nome" ? filtroNome : label === "Espessura" ? filtroEspessura : filtroTipo}
                  onChange={e => {
                    const v = e.target.value;
                    if (label === "Nome") setFiltroNome(v);
                    else if (label === "Espessura") setFiltroEspessura(v);
                    else setFiltroTipo(v);
                  }}
                  className="p-3 px-5 rounded-2xl border border-gray-100 text-sm bg-white shadow-sm focus:ring-2 focus:outline-none transition-all w-40"
                  style={{ "--tw-ring-color": theme.menuIconColor } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={limparDuplicados} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition"> <Trash2 size={18} />Limpar Duplicados</button>
              <button onClick={abrirModalParaNovo} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: theme.menuIconColor, color: theme.buttonDarkText }}> <PlusCircle size={20} /> Novo Vidro </button>
            </div>
          </div>

          {/* TABELA */}
          <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100">
            <table className="w-full text-sm text-left border-collapse" style={{ fontFamily: 'sans-serif' }}>
              <thead style={{ backgroundColor: theme.menuBackgroundColor, color: theme.menuTextColor }}>
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4 ">Espessura</th>
                  <th className="p-4 ">Tipo</th>
                  <th className="p-4 ">Preço Base</th>
                  <th className="p-4  text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100" style={{ color: '#374151' }}>
                {vidrosFiltrados.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 font-medium">{v.nome}</td>
                    <td className="p-4 text-gray-500 font-medium">{v.espessura}</td>
                    <td className="p-4 text-gray-500 font-medium">{v.tipo}</td>
                    <td className="p-4 text-gray-500 font-medium" style={{ color: theme.menuBackgroundColor }}>{formatarPreco(v.preco)}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirModalParaEdicao(v)} className="p-2.5 rounded-xl hover:bg-gray-100" style={{ color: theme.menuBackgroundColor }} title="Editar"> <Edit2 size={18} /> </button>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-50 animate-fade-in px-4">
          <div
            className="rounded-[2rem] p-10 shadow-2xl w-full max-w-lg border border-white/20 transition-all"
            style={{ backgroundColor: branding?.modal_background_color || '#FFFFFF' }}
          >
            {/* Cabeçalho */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight" style={{ color: branding?.modal_text_color || theme.menuBackgroundColor }}>
                  {editando ? "Editar Vidro" : "Cadastrar Vidro"}
                </h2>
                <div className="h-1 w-8 mt-2 rounded-full" style={{ backgroundColor: branding?.button_dark_bg || theme.menuIconColor }}></div>
              </div>
              <button onClick={() => setMostrarModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Inputs Principais */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Nome do Vidro *</label>
                <input type="text" placeholder="Ex: Vidro Temperado" value={novoVidro.nome} onChange={e => setNovoVidro({ ...novoVidro, nome: e.target.value })}
                  className="w-full p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Espessura *</label>
                <input type="text" placeholder="8mm" value={novoVidro.espessura} onChange={e => setNovoVidro({ ...novoVidro, espessura: e.target.value })}
                  className="w-full p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Tipo *</label>
                <input type="text" placeholder="Liso" value={novoVidro.tipo} onChange={e => setNovoVidro({ ...novoVidro, tipo: e.target.value })}
                  className="w-full p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Preço Base (R$)</label>
                <input type="number" step="0.01" placeholder="0,00" value={novoVidro.preco} onChange={e => setNovoVidro({ ...novoVidro, preco: Number(e.target.value) })}
                  className="w-full p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />
              </div>
            </div>

            {/* SEÇÃO DE PREÇOS POR GRUPO */}
            <div className="pt-6 border-t border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-tight">Tabelas de Preços</h3>
                <button onClick={() => setPrecosGruposModal([...precosGruposModal, { id: "", vidro_id: editando?.id || "", grupo_preco_id: "", preco: 0, grupo_nome: "" }])}
                  className="text-[11px] font-black flex items-center gap-1.5 uppercase tracking-wider hover:opacity-70 transition-opacity"
                  style={{ color: branding?.button_dark_bg || '#2563eb' }}>
                  <PlusCircle size={14} /> Adicionar Preço
                </button>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {precosGruposModal.map((p, index) => (
                  <div key={index} className="flex gap-2 p-2.5 bg-gray-50/80 rounded-2xl border border-gray-100 items-center group transition-all hover:border-gray-200">
                    <input type="text" list="listaGrupos" value={p.grupo_nome} placeholder="Tabela"
                      onChange={e => {
                        const novos = [...precosGruposModal];
                        novos[index].grupo_nome = e.target.value;
                        const grupo = grupos.find(g => g.nome === e.target.value);
                        if (grupo) novos[index].grupo_preco_id = grupo.id;
                        setPrecosGruposModal(novos);
                      }}
                      className="p-2.5 rounded-xl border border-gray-200 text-xs flex-1 focus:bg-white focus:outline-none focus:ring-1"
                      style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />

                    <input type="number" step="0.01" placeholder="R$ 0,00" value={p.preco}
                      onChange={e => {
                        const novos = [...precosGruposModal];
                        novos[index].preco = Number(e.target.value);
                        setPrecosGruposModal(novos);
                      }}
                      className="p-2.5 rounded-xl border border-gray-200 text-xs w-28 font-bold focus:bg-white focus:outline-none focus:ring-1"
                      style={{ "--tw-ring-color": branding?.button_dark_bg || theme.menuIconColor } as React.CSSProperties} />

                    <button onClick={() => setPrecosGruposModal(precosGruposModal.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-4 justify-end">
              <button onClick={() => setMostrarModal(false)} className="px-8 py-3.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all">
                Cancelar
              </button>
              <button onClick={salvarVidro} disabled={carregando}
                className="px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-black/10 transition-all active:scale-95 hover:brightness-110 disabled:opacity-50"
                style={{ backgroundColor: branding?.modal_button_background_color || theme.menuBackgroundColor }}>
                {carregando ? "Processando..." : editando ? "Atualizar" : "Salvar Vidro"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL DE AVISO (Fiel ao Branding do Supabase) */}
      {modalAviso && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-[60] px-4 animate-fade-in">
          <div
            className="rounded-[2rem] p-8 shadow-2xl w-full max-w-sm border border-white/20 flex flex-col items-center text-center"
            style={{ backgroundColor: branding?.modal_background_color || '#FFFFFF' }}
          >

            {/* ÍCONE DINÂMICO BASEADO NO TIPO E BRANDING */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: `${modalAviso.tipo === 'sucesso' ? (branding?.modal_icon_success_color || '#059669') :
                  modalAviso.confirmar ? (branding?.modal_icon_error_color || '#DC2626') :
                    (branding?.modal_icon_warning_color || '#D97706')
                  }15` // O '15' no final adiciona transparência ao fundo do ícone
              }}
            >
              {modalAviso.tipo === 'sucesso' ? (
                <Box style={{ color: branding?.modal_icon_success_color || '#059669' }} size={28} />
              ) : modalAviso.confirmar ? (
                <Trash2 style={{ color: branding?.modal_icon_error_color || '#DC2626' }} size={28} />
              ) : (
                <Tag style={{ color: branding?.modal_icon_warning_color || '#D97706' }} size={28} />
              )}
            </div>

            <h2 className="text-xl font-black mb-2" style={{ color: branding?.modal_text_color || '#1C415B' }}>
              {modalAviso.titulo}
            </h2>

            <p className="text-gray-500 mb-8 text-sm whitespace-pre-line leading-relaxed px-2">
              {modalAviso.mensagem}
            </p>

            <div className="flex gap-3 w-full">
              {modalAviso.confirmar ? (
                <>
                  <button
                    onClick={() => setModalAviso(null)}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { modalAviso.confirmar?.(); setModalAviso(null); }}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                    style={{ backgroundColor: branding?.modal_icon_error_color || '#DC2626' }}
                  >
                    Excluir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalAviso(null)}
                  className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                  style={{
                    backgroundColor: branding?.modal_button_background_color || '#1C415B',
                    color: branding?.modal_button_text_color || '#FFFFFF'
                  }}
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {carregando && !modalAviso && !mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[100] animate-fade-in">
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin" style={{ color: theme.menuIconColor }} />
              <div className="absolute inset-0 rounded-full blur-md opacity-20 animate-pulse" style={{ backgroundColor: theme.menuIconColor }}></div>
            </div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Processando...</p>
          </div>
        </div>
      )}
    </div>
  )
}