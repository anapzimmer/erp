//app/src/app/%28cadastros%29/cadastros/vidros/page.tsx

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { DRAWING_COLORS } from "@/design/drawing";
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { decodeCsvFile } from "@/utils/csvEncoding"
import { Box, Tag, Upload, Download, Edit2, Trash2, Square, PlusCircle, X, Printer, Loader2, CheckCircle2, AlertCircle, Search, ListChecks, Eraser, CheckSquare2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"
import { VidrosPDF } from "@/app/relatorios/vidros/VidrosPDF"
import { useTheme } from "@/context/ThemeContext" // 🔥 Importando o contexto de tema
import { PDFDownloadLink } from "@react-pdf/renderer";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ThemeLoader from "@/components/ThemeLoader"
import ImportarTabelaVidrosModal from "@/components/ImportarTabelaVidrosModal"
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal"

// --- Tipagens ---
type Vidro = { id: string; codigo: string | null; nome: string; espessura: string; tipo: string; preco: number; empresa_id: string; }
type PrecoGrupo = { id: string; vidro_id: string; grupo_preco_id: string; preco: number; grupo_nome?: string }
type Grupo = { id: string; nome: string }
type MenuItem = { nome: string; rota: string; icone: any; submenu?: { nome: string; rota: string }[] }


// --- Utils ---
const formatarParaBanco = (texto: string) => { if (!texto) return ""; return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1) }
const formatarTipoVidro = (texto: string) => {
  const limpo = (texto || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!limpo) return "";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}
const padronizarEspessura = (valor: string) => { if (!valor) return ""; const limpo = valor.replace(/\s/g, "").toLowerCase(); const partes = limpo.split("+").map(p => p.replace(/\D/g, "").padStart(2, "0")); const partesValidas = partes.filter(p => p !== "00"); if (partesValidas.length === 0) return ""; return partesValidas.join("+") + "mm" }
const normalizarOrdenacao = (texto: string) =>
  (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const ordemTipoEspelho = (vidro: Vidro) => {
  if (!normalizarOrdenacao(vidro.nome).includes("espelho")) return null;

  const tipo = normalizarOrdenacao(vidro.tipo);
  if (tipo.includes("cortado")) return 0;
  if (tipo.includes("lapidado")) return 1;
  if (tipo.includes("bisote")) return 2;
  return 99;
}
const ordenarVidros = (lista: Vidro[]) =>
  [...lista].sort((a, b) => {
    const porNome = a.nome.localeCompare(b.nome, "pt-BR", { numeric: true, sensitivity: "base" });
    if (porNome !== 0) return porNome;

    const porEspessura = padronizarEspessura(a.espessura).localeCompare(
      padronizarEspessura(b.espessura),
      "pt-BR",
      { numeric: true, sensitivity: "base" },
    );
    if (porEspessura !== 0) return porEspessura;

    const ordemEspelhoA = ordemTipoEspelho(a);
    const ordemEspelhoB = ordemTipoEspelho(b);
    if (ordemEspelhoA !== null || ordemEspelhoB !== null) {
      const porOrdemEspelho = (ordemEspelhoA ?? 99) - (ordemEspelhoB ?? 99);
      if (porOrdemEspelho !== 0) return porOrdemEspelho;
    }

    return formatarTipoVidro(a.tipo).localeCompare(formatarTipoVidro(b.tipo), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

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
  const [novoVidro, setNovoVidro] = useState<Omit<Vidro, "id" | "empresa_id">>({ codigo: "", nome: "", espessura: "", tipo: "", preco: 0 })
  const [editando, setEditando] = useState<Vidro | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarImportador, setMostrarImportador] = useState(false)
  const [precosGruposModal, setPrecosGruposModal] = useState<PrecoGrupo[]>([])
  const [totalPrecosEspeciais, setTotalPrecosEspeciais] = useState(0)
  const [modalAviso, setModalAviso] = useState<{ titulo: string; mensagem: string; confirmar?: () => void; tipo?: 'sucesso' | 'erro' | 'aviso' } | null>(null)
  const [confirmarLimparCatalogo, setConfirmarLimparCatalogo] = useState(false)
  const [vidrosSelecionados, setVidrosSelecionados] = useState<Set<string>>(new Set())
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
    const [
      { data: dataVidros, error: errorVidros },
      { data: dataGrupos, error: errorGrupos },
      { count: totalEspeciais }
    ] = await Promise.all([
      supabase
        .from("vidros")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true })
        .order("espessura", { ascending: true })
        .order("tipo", { ascending: true }),
      supabase.from("tabelas").select("id, nome").eq("empresa_id", empresaId).order("nome", { ascending: true }),
      supabase.from("vidro_precos_grupos").select("id", { head: true, count: "exact" }).eq("empresa_id", empresaId)
    ])

    if (errorVidros) console.error("Erro Vidros:", errorVidros);
    else {
      const listaVidros = (dataVidros || []) as Vidro[];
      const vidrosCorrigidos = listaVidros.map((vidro) => ({
        ...vidro,
        tipo: formatarTipoVidro(vidro.tipo),
      }));
      const pendentesCorrecao = listaVidros.filter(
        (vidro) => vidro.tipo !== formatarTipoVidro(vidro.tipo),
      );

      if (pendentesCorrecao.length) {
        void Promise.all(
          pendentesCorrecao.map((vidro) =>
            supabase
              .from("vidros")
              .update({ tipo: formatarTipoVidro(vidro.tipo) })
              .eq("id", vidro.id)
              .eq("empresa_id", empresaId),
          ),
        ).then((resultados) => {
          const erro = resultados.find((resultado) => resultado.error)?.error;
          if (erro) console.error("Erro ao padronizar tipos dos vidros:", erro.message);
        });
      }

      setVidros(ordenarVidros(vidrosCorrigidos))
      setVidrosSelecionados(new Set())
    }

    if (errorGrupos) console.error("Erro Grupos:", errorGrupos);
    else setGrupos(dataGrupos || [])

    setTotalPrecosEspeciais(totalEspeciais || 0)

    setCarregando(false)
  }, [empresaId])

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId, carregarDados]);

  // --- Lógica (Import, Export, CRUD) ---
  const exportarCSV = () => {
    const csvContent = "Codigo;Nome;Espessura;Tipo;Preco\n"
      + vidros.map(v =>
        `${v.codigo || ""};${formatarParaBanco(v.nome)};${padronizarEspessura(v.espessura)};${formatarParaBanco(v.tipo)};${v.preco}`
      ).join("\n");

    const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vidros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(encodedUri);
  }

  const capitalizarFrase = (texto: string) => {
    if (!texto) return "";
    const limpo = texto.trim().toLowerCase();
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  };

  const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // DEBUG: Verifique se o empresaId está chegando aqui
    console.log("Iniciando importação para Empresa ID:", empresaId);

    if (!file || !empresaId) {
      setModalAviso({ titulo: "Erro", mensagem: "Empresa não identificada ou arquivo ausente." });
      return;
    }

    setCarregando(true);
    try {
      const text = await decodeCsvFile(file);

      const rows = text.split("\n").slice(1);
      let atualizados = 0, inseridos = 0, erros = 0;

      for (const row of rows) {
        if (!row.trim()) continue;
        const colunas = row.replace(/['"]+/g, '').split(";");
        if (colunas.length < 4) { erros++; continue; }

        // Compatível com os dois formatos:
        // antigo: Nome;Espessura;Tipo;Preco
        // novo: Codigo;Nome;Espessura;Tipo;Preco
        const possuiCodigo = colunas.length >= 5;
        const codigo = possuiCodigo ? colunas[0].trim().toUpperCase() : "";
        const nome = possuiCodigo ? colunas[1] : colunas[0];
        const espessura = possuiCodigo ? colunas[2] : colunas[1];
        const tipo = possuiCodigo ? colunas[3] : colunas[2];
        const preco = possuiCodigo ? colunas[4] : colunas[3];

        if (nome && espessura && tipo && preco) {
          try {
            const nomeFormatado = capitalizarFrase(formatarParaBanco(nome));
            const espessuraFormatada = padronizarEspessura(espessura);
            const tipoFormatado = formatarTipoVidro(tipo);
            const precoFormatado = Number(preco.toString().replace(",", "."));

            if (isNaN(precoFormatado)) { erros++; continue; }

            // 1. BUSCA EXISTENTE (Ajustado para evitar erro 400/406)
            let consultaExistente = supabase
              .from("vidros")
              .select("id, preco, codigo")
              .eq("empresa_id", empresaId);

            if (codigo) {
              consultaExistente = consultaExistente.eq("codigo", codigo);
            } else {
              consultaExistente = consultaExistente
                .eq("nome", nomeFormatado)
                .eq("espessura", espessuraFormatada)
                .eq("tipo", tipoFormatado);
            }

            const { data: existente, error: errorSearch } = await consultaExistente.maybeSingle();

            if (existente) {
              if (existente.preco !== precoFormatado) {
                const { error: errorUpdate } = await supabase
                  .from("vidros")
                  .update({ preco: precoFormatado, tipo: tipoFormatado, ...(codigo ? { codigo } : {}) })
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
                  codigo: codigo || null,
                  nome: nomeFormatado,
                  espessura: espessuraFormatada,
                  tipo: tipoFormatado,
                  preco: precoFormatado,
                  empresa_id: empresaId
                }]);

              if (errorInsert) {
                console.error("Erro no Insert (403x):", errorInsert.message);
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
    } catch {
      setCarregando(false);
      setModalAviso({ titulo: "Erro", mensagem: "Falha ao ler o arquivo." });
    }
  }

  const limparDuplicados = () => {
    setModalAviso({
      titulo: "Limpar Duplicados",
      mensagem: "Tem certezax Isso manterá apenas o maior preço para vidros com o mesmo Nome, Espessura e Tipo, e apagará os outros.",
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


  // --- Filtros e Cálculos ---
  const vidrosFiltrados = vidros.filter(v =>
    (filtroNome ? v.nome.toLowerCase().includes(filtroNome.toLowerCase()) : true) &&
    (filtroEspessura ? v.espessura.toLowerCase().includes(filtroEspessura.toLowerCase()) : true) &&
    (filtroTipo ? v.tipo.toLowerCase().includes(filtroTipo.toLowerCase()) : true)
  )

  const alternarSelecaoVidro = (id: string) => {
    setVidrosSelecionados((atuais) => {
      const novos = new Set(atuais)

      if (novos.has(id)) {
        novos.delete(id)
      } else {
        novos.add(id)
      }

      return novos
    })
  }

  const todosFiltradosSelecionados =
    vidrosFiltrados.length > 0 &&
    vidrosFiltrados.every((vidro) => vidrosSelecionados.has(vidro.id))

  const alternarSelecaoFiltrados = () => {
    setVidrosSelecionados((atuais) => {
      const novos = new Set(atuais)

      if (todosFiltradosSelecionados) {
        vidrosFiltrados.forEach((vidro) => novos.delete(vidro.id))
      } else {
        vidrosFiltrados.forEach((vidro) => novos.add(vidro.id))
      }

      return novos
    })
  }

  const excluirVidrosSelecionados = () => {
    const ids = Array.from(vidrosSelecionados)

    if (!ids.length) {
      setModalAviso({
        titulo: "Nenhum vidro selecionado",
        mensagem: "Selecione pelo menos um vidro para excluir.",
        tipo: "aviso",
      })
      return
    }

    setModalAviso({
      titulo: "Excluir vidros selecionados",
      mensagem: `Tem certeza que deseja excluir ${ids.length} ${
        ids.length === 1 ? "vidro" : "vidros"
      }x Os preços especiais associados também serão removidos.`,
      tipo: "aviso",
      confirmar: async () => {
        setCarregando(true)

        try {
          const { error: erroPrecos } = await supabase
            .from("vidro_precos_grupos")
            .delete()
            .in("vidro_id", ids)

          if (erroPrecos) throw erroPrecos

          const { error: erroVidros } = await supabase
            .from("vidros")
            .delete()
            .in("id", ids)
            .eq("empresa_id", empresaId)

          if (erroVidros) throw erroVidros

          setVidros((atuais) =>
            atuais.filter((vidro) => !vidrosSelecionados.has(vidro.id)),
          )
          setVidrosSelecionados(new Set())

          setModalAviso({
            titulo: "Exclusão concluída",
            mensagem: `${ids.length} ${
              ids.length === 1 ? "vidro foi excluído" : "vidros foram excluídos"
            } com sucesso.`,
            tipo: "sucesso",
          })
        } catch (e: any) {
          setModalAviso({
            titulo: "Erro",
            mensagem: "Não foi possível excluir os vidros: " + e.message,
            tipo: "erro",
          })
        } finally {
          setCarregando(false)
        }
        
      },
   
    })
  }

  const executarLimpezaCatalogo = async () => {
    setConfirmarLimparCatalogo(false)
    setCarregando(true)

    try {
      const ids = vidros.map((vidro) => vidro.id)

      const { error: erroPrecos } = await supabase
        .from("vidro_precos_grupos")
        .delete()
        .in("vidro_id", ids)

      if (erroPrecos) throw erroPrecos

      const { error: erroVidros } = await supabase
        .from("vidros")
        .delete()
        .eq("empresa_id", empresaId)

      if (erroVidros) throw erroVidros

      setVidros([])
      setVidrosSelecionados(new Set())

      setModalAviso({
        titulo: "Catálogo limpo",
        mensagem: "Todos os vidros foram excluídos com sucesso.",
        tipo: "sucesso",
      })
   } catch (e: any) {
  let titulo = "Erro ao salvar";
  let mensagem = "Ocorreu um erro inesperado.";

  if (e.message?.includes("vidros_empresa_codigo_unique")) {
    titulo = "Código já cadastrado";
    mensagem =
      "Já existe um vidro cadastrado com este código.\n\nEscolha outro código ou edite o vidro já existente.";
  } else {
    mensagem = e.message;
  }

  setModalAviso({
    titulo,
    mensagem,
    tipo: "erro",
  });
} finally {
  setCarregando(false);
}
  }

  const limparTodosOsVidros = () => {
    if (!vidros.length) {
      setModalAviso({
        titulo: "Catálogo vazio",
        mensagem: "Não existem vidros cadastrados para excluir.",
        tipo: "aviso",
      })
      return
    }

    setConfirmarLimparCatalogo(true)
  }

  const salvarVidro = async () => {
    if (!novoVidro.nome.trim() || !novoVidro.espessura.trim() || !novoVidro.tipo.trim()) { setModalAviso({ titulo: "Atenção", mensagem: "Preencha todos os campos obrigatórios." }); return }
    if (!empresaId) return;
    setCarregando(true)

    const vidroPadronizado = {
      codigo: novoVidro.codigo?.trim() ? novoVidro.codigo.trim().toUpperCase() : null,
      nome: formatarParaBanco(novoVidro.nome),
      tipo: formatarTipoVidro(novoVidro.tipo),
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

      setNovoVidro({ codigo: "", nome: "", espessura: "", tipo: "", preco: 0 }); setEditando(null); setPrecosGruposModal([]); setMostrarModal(false);
      carregarDados();
    } catch (e: any) { setModalAviso({ titulo: "Erro", mensagem: "Erro ao processar: " + e.message }) } finally { setCarregando(false) }
  }

  const deletarVidro = (id: string) => {
    setModalAviso({
      titulo: "Confirmar Exclusão", mensagem: "Tem certeza que deseja excluir este vidrox Isso removerá preços especiais associados.", confirmar: async () => {
        await supabase.from("vidro_precos_grupos").delete().eq("vidro_id", id)
        const { error } = await supabase.from("vidros").delete().eq("id", id)
        if (error) setModalAviso({ titulo: "Erro", mensagem: "Erro ao excluir: " + error.message }); else { setVidros(prev => prev.filter(v => v.id !== id)); setModalAviso(null); }
      }
    })
  }

  const abrirModalParaEdicao = async (vidro: Vidro) => {
    setEditando(vidro);
    setNovoVidro({ codigo: vidro.codigo || "", nome: vidro.nome, espessura: vidro.espessura, tipo: vidro.tipo, preco: vidro.preco });
    const { data } = await supabase.from("vidro_precos_grupos").select("*, grupo:tabelas(nome)").eq("vidro_id", vidro.id)
    const precosFormatados = (data || []).map((p: any) => ({ id: p.id, vidro_id: p.vidro_id, grupo_preco_id: p.grupo_preco_id, preco: Number(p.preco) || 0, grupo_nome: p.grupo?.nome || "" }))
    setPrecosGruposModal(precosFormatados);
    setMostrarModal(true);
  }
  const abrirModalParaNovo = () => { setEditando(null); setNovoVidro({ codigo: "", nome: "", espessura: "", tipo: "", preco: 0 }); setPrecosGruposModal([]); setMostrarModal(true); }

  const calcularPrecoMedio = () => { if (vidros.length === 0) return "R$ 0,00"; const total = vidros.reduce((acc, v) => acc + v.preco, 0); return formatarPreco(total / vidros.length) }
  const getMaisProcurados = () => vidros.slice(0, 1).map(v => v.nome).join(", ") || "-"
  const contarPrecoEspecial = () => totalPrecosEspeciais
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
      .select("logo_light, logo_dark")
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
const logoLight = branding?.logo_light || branding?.logo_dark || null;
  const darkPrimary = "var(--navigation)";
  const darkSecondary = "var(--on-navigation)";
  const darkTertiary = "var(--primary)";
  const textDefault = "var(--text-primary)";

  if (checkingAuth) return <div className="flex items-center justify-center min-h-screen bg-surface-secondary"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}></div></div>;

  return (
    <div className="cadastros-layout flex min-h-screen text-text-primary" style={{ backgroundColor: theme.screenBackgroundColor }}>
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
        <main className="cad-main-panel w-full flex-1 min-w-0 p-4 md:p-6 xl:p-8">
          <section className="mb-6 w-full overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
            <div className="flex flex-col gap-5 p-5 md:p-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 7%, transparent)`,
                    color: theme.menuIconColor,
                  }}
                >
                  <Square size={23} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <h1
                    className="text-2xl font-semibold tracking-tight md:text-3xl"
                    style={{ color: theme.menuBackgroundColor }}
                  >
                    Catálogo de vidros
                  </h1>
                  <p className="mt-1 text-sm font-normal text-text-secondary">
                    Gerencie produtos, códigos, preços e tabelas especiais.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 no-print">
                <button
                  onClick={() => setMostrarImportador(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                  style={{ backgroundColor: theme.menuIconColor }}
                  title="Importar tabela PDF, TXT ou CSV"
                >
                  <Upload size={17} />
                  Importar tabela
                </button>

                {typeof window !== "undefined" && (
                  <PDFDownloadLink
                    document={
                      <VidrosPDF
                        dados={vidrosFiltrados}
                        empresa={nomeEmpresa || "Sua Empresa"}
                        logoUrl={theme.logoLightUrl}
                        coresEmpresa={{
                          primary: theme.menuBackgroundColor,
                          secondary: theme.menuTextColor,
                          tertiary: theme.menuIconColor,
                          textDefault: theme.contentTextLightBg,
                        }}
                      />
                    }
                    fileName={`catalogo_vidros_${(nomeEmpresa || "empresa")
                      .toLowerCase()
                      .replace(/\s+/g, "_")}.pdf`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-secondary"
                    title="Gerar catálogo em PDF"
                  >
                    {({ loading }) =>
                      loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Printer size={18} />
                      )
                    }
                  </PDFDownloadLink>
                )}

                <button
                  onClick={exportarCSV}
                  title="Exportar CSV"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-secondary"
                >
                  <Download size={18} />
                </button>

                <label
                  htmlFor="importarCSV"
                  title="Importar CSV simples"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-secondary"
                >
                  <Upload size={18} />
                  <input
                    type="file"
                    id="importarCSV"
                    accept=".csv"
                    className="hidden"
                    onChange={importarCSV}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* INDICADORES */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { titulo: "Total", valor: vidros.length, icone: Box },
              {
                titulo: "Com código",
                valor: vidros.filter((v) => Boolean(v.codigo)).length,
                icone: CheckCircle2,
              },
              {
                titulo: "Sem código",
                valor: vidros.filter((v) => !v.codigo).length,
                icone: AlertCircle,
              },
              {
                titulo: "Preços especiais",
                valor: contarPrecoEspecial(),
                icone: Tag,
              },
            ].map((card) => (
              <div
                key={card.titulo}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    color: theme.menuIconColor,
                    backgroundColor: `color-mix(in srgb, ${theme.menuIconColor} 6%, transparent)`,
                  }}
                >
                  <card.icone size={19} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xs font-normal text-text-secondary">
                    {card.titulo}
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{ color: theme.menuBackgroundColor }}
                  >
                    {card.valor}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* FILTROS E AÇÕES */}
          <section className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                {[
                  ["Nome", filtroNome, setFiltroNome],
                  ["Espessura", filtroEspessura, setFiltroEspessura],
                  ["Tipo", filtroTipo, setFiltroTipo],
                ].map(([label, valor, setter]: any) => (
                  <div key={label} className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
                    />
                    <input
                      type="text"
                      placeholder={`Buscar por ${String(label).toLowerCase()}...`}
                      value={valor}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-secondary/50 py-2.5 pl-10 pr-3 text-sm text-text-secondary outline-none transition focus:bg-surface focus:ring-2"
                      style={{
                        "--tw-ring-color": `color-mix(in srgb, ${theme.menuIconColor} 15%, transparent)`,
                      } as React.CSSProperties}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={limparDuplicados}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-normal text-text-secondary transition hover:bg-surface-secondary"
                >
                  <Eraser size={16} />
                  Duplicados
                </button>

                <button
                  onClick={limparTodosOsVidros}
                  className="flex items-center gap-2 rounded-xl border border-danger-soft bg-surface px-3.5 py-2.5 text-sm font-normal text-danger transition hover:bg-danger-soft"
                >
                  <Trash2 size={16} />
                  Limpar tudo
                </button>

                <button
                  onClick={abrirModalParaNovo}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm transition hover:brightness-105 active:scale-[0.98]"
                  style={{
                    backgroundColor: theme.menuIconColor,
                    color: theme.buttonDarkText,
                  }}
                >
                  <PlusCircle size={17} />
                  Novo vidro
                </button>
              </div>
            </div>
          </section>

          {vidrosSelecionados.size > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-danger-soft bg-danger-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckSquare2 size={18} className="text-danger" />
                <span>
                  <strong className="font-normal">
                    {vidrosSelecionados.size}
                  </strong>{" "}
                  {vidrosSelecionados.size === 1 ? "item selecionado"
                    : "itens selecionados"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVidrosSelecionados(new Set())}
                  className="rounded-xl px-3 py-2 text-xs font-normal text-text-secondary transition hover:bg-surface"
                >
                  Cancelar seleção
                </button>
                <button
                  onClick={excluirVidrosSelecionados}
                  className="flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-xs font-normal text-on-danger transition hover:bg-danger"
                >
                  <Trash2 size={15} />
                  Excluir selecionados
                </button>
              </div>
            </div>
          )}

          {/* TABELA */}
          <section className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-normal text-text-primary">
                  Vidros cadastrados
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Exibindo {vidrosFiltrados.length} de {vidros.length} produtos
                </p>
              </div>

              <button
                onClick={alternarSelecaoFiltrados}
                disabled={!vidrosFiltrados.length}
                className="flex items-center gap-2 self-start rounded-xl border border-border px-3 py-2 text-xs font-normal text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
              >
                <ListChecks size={15} />
                {todosFiltradosSelecionados ? "Desmarcar visíveis"
                  : "Selecionar visíveis"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-border bg-surface-secondary/80 text-xs text-text-secondary">
                  <tr>
                    <th className="w-14 px-5 py-3.5">
                      <button
                        onClick={alternarSelecaoFiltrados}
                        disabled={!vidrosFiltrados.length}
                        className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                          todosFiltradosSelecionados ? "border-transparent"
                            : "border-border-strong bg-surface"
                        }`}
                        style={todosFiltradosSelecionados ? { backgroundColor: "var(--success)" } : undefined}
                        aria-label="Selecionar todos os itens visíveis"
                      >
                        {todosFiltradosSelecionados && (
                          <CheckCircle2
                            size={15}
                            className="text-white"
                          />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 font-normal">Código</th>
                    <th className="px-4 py-3.5 font-normal">Nome</th>
                    <th className="px-4 py-3.5 font-normal">Espessura</th>
                    <th className="px-4 py-3.5 font-normal">Tipo</th>
                    <th className="px-4 py-3.5 font-normal">Preço base</th>
                    <th className="px-5 py-3.5 text-center font-normal">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border text-text-secondary">
                  {vidrosFiltrados.map((vidro) => {
                    const selecionado = vidrosSelecionados.has(vidro.id)

                    return (
                      <tr
                        key={vidro.id}
                        className={`transition ${
                          selecionado ? "bg-success-soft/40"
                            : "hover:bg-surface-secondary/70"
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => alternarSelecaoVidro(vidro.id)}
                            className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                              selecionado ? "border-transparent" : "border-border-strong bg-surface"
                            }`}
                            style={selecionado ? { backgroundColor: "var(--success)" } : undefined}
                            aria-label={`Selecionar ${vidro.nome}`}
                          >
                            {selecionado && (
                              <CheckCircle2
                                size={15}
                                className="text-white"
                              />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="rounded-lg bg-surface-secondary px-2.5 py-1 text-xs font-normal uppercase text-text-secondary">
                            {vidro.codigo || "Sem código"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-normal text-text-primary">
                          {vidro.nome}
                        </td>
                        <td className="px-4 py-3.5">{vidro.espessura}</td>
                        <td className="px-4 py-3.5">{vidro.tipo}</td>
                        <td
                          className="px-4 py-3.5 font-normal"
                          style={{ color: theme.menuBackgroundColor }}
                        >
                          {formatarPreco(vidro.preco)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => abrirModalParaEdicao(vidro)}
                              className="rounded-lg p-2 text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary"
                              title="Editar"
                            >
                              <Edit2 size={17} />
                            </button>

                            <button
                              onClick={() => deletarVidro(vidro.id)}
                              className="rounded-lg p-2 text-danger transition hover:bg-danger-soft hover:text-danger"
                              title="Excluir"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {!vidrosFiltrados.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <Box size={30} className="mb-3 text-text-secondary" />
                          <p className="font-medium text-text-secondary">
                            Nenhum vidro encontrado
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            Ajuste os filtros ou cadastre um novo produto.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navigation/30 px-4 py-6 backdrop-blur-[2px] animate-fade-in">
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-border shadow-[0_24px_70px_var(--shadow)] transition-all"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-secondary">
                  Catálogo de vidros
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
                  {editando ? "Editar Vidro" : "Cadastrar Vidro"}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Informe os dados principais e, se precisar, preços diferentes por tabela.
                </p>
              </div>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                {/* Inputs Principais */}
                <section className="rounded-2xl border border-border bg-surface-secondary/70 p-4 sm:p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Dados do vidro</h3>
                      <p className="mt-1 text-xs text-text-secondary">Campos obrigatórios marcados com *.</p>
                    </div>
                    <Square size={20} className="text-text-secondary" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Código do produto</label>
                      <input
                        type="text"
                        placeholder="E?: INC08TE"
                        value={novoVidro.codigo || ""}
                        onChange={e => setNovoVidro({ ...novoVidro, codigo: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border border-border bg-surface p-3 text-sm uppercase text-text-primary outline-none transition-all focus:border-transparent focus:ring-2"
                        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                      />
                      <p className="mt-1.5 ml-1 text-[10px] text-text-secondary">Use o mesmo código do fornecedor.</p>
                    </div>

                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Espessura *</label>
                      <input
                        type="text"
                        placeholder="8mm ou 04+04mm"
                        value={novoVidro.espessura}
                        onChange={e => setNovoVidro({ ...novoVidro, espessura: e.target.value })}
                        className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none transition-all focus:border-transparent focus:ring-2"
                        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Nome do vidro *</label>
                      <input
                        type="text"
                        placeholder="E?: Vidro Temperado"
                        value={novoVidro.nome}
                        onChange={e => setNovoVidro({ ...novoVidro, nome: e.target.value })}
                        className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none transition-all focus:border-transparent focus:ring-2"
                        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Tipo *</label>
                      <input
                        type="text"
                        placeholder="Liso, temperado, laminado..."
                        value={novoVidro.tipo}
                        onChange={e => setNovoVidro({ ...novoVidro, tipo: e.target.value })}
                        className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text-primary outline-none transition-all focus:border-transparent focus:ring-2"
                        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">Preço base por m²</label>
                      <div className="flex items-center rounded-xl border border-border bg-surface px-3 transition-all focus-within:border-transparent focus-within:ring-2"
                        style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                      >
                        <span className="mr-2 text-sm font-semibold text-text-secondary">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={novoVidro.preco}
                          onChange={e => setNovoVidro({ ...novoVidro, preco: Number(e.target.value) })}
                          className="w-full bg-transparent py-3 text-sm text-text-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* SEÇÃO DE PREÇOS POR GRUPO */}
                <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary">Tabelas de preço</h3>
                      <p className="mt-1 text-xs text-text-secondary">Valores específicos por grupo de cliente.</p>
                    </div>
                    <button
                      onClick={() => setPrecosGruposModal([...precosGruposModal, { id: "", vidro_id: editando?.id || "", grupo_preco_id: "", preco: 0, grupo_nome: "" }])}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:bg-surface-secondary"
                      style={{ color: "var(--primary)" }}
                    >
                      <PlusCircle size={14} /> Adicionar
                    </button>
                  </div>

                  {precosGruposModal.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-surface-secondary px-4 py-8 text-center">
                      <Tag size={22} className="mx-auto text-text-secondary" />
                      <p className="mt-2 text-sm font-medium text-text-secondary">Nenhum preço especial cadastrado.</p>
                      <p className="mt-1 text-xs text-text-secondary">O sistema usará o preço base para todos os clientes.</p>
                    </div>
                  ) : (
                    <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                      {precosGruposModal.map((p, index) => (
                        <div key={index} className="rounded-2xl border border-border bg-surface-secondary/80 p-3 transition-all hover:border-border">
                          <div className="grid gap-3 sm:grid-cols-[1fr_130px_auto] sm:items-end">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">Tabela</label>
                              <input
                                type="text"
                                list="listaGrupos"
                                value={p.grupo_nome}
                                placeholder="Selecione a tabela"
                                onChange={e => {
                                  const novos = [...precosGruposModal];
                                  novos[index].grupo_nome = e.target.value;
                                  const grupo = grupos.find(g => g.nome === e.target.value);
                                  if (grupo) novos[index].grupo_preco_id = grupo.id;
                                  setPrecosGruposModal(novos);
                                }}
                                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-text-primary outline-none focus:ring-1"
                                style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">Preço m²</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={p.preco}
                                onChange={e => {
                                  const novos = [...precosGruposModal];
                                  novos[index].preco = Number(e.target.value);
                                  setPrecosGruposModal(novos);
                                }}
                                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs font-semibold text-text-primary outline-none focus:ring-1"
                                style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                              />
                            </div>

                            <button
                              onClick={() => setPrecosGruposModal(precosGruposModal.filter((_, i) => i !== index))}
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-danger-soft hover:text-danger"
                              title="Remover preço especial"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button onClick={() => setMostrarModal(false)} className="rounded-2xl bg-surface-secondary px-7 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-border">
                Cancelar
              </button>
              <button onClick={salvarVidro} disabled={carregando}
                className="rounded-2xl px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)" }}>
                {carregando ? "Processando..." : editando ? "Atualizar" : "Salvar Vidro"}
              </button>
            </div>
          </div>
        </div>
      )}


      <ImportarTabelaVidrosModal
        aberto={mostrarImportador}
        onClose={() => setMostrarImportador(false)}
        empresaId={empresaId || ""}
        vidros={vidros}
        onConcluido={carregarDados}
        corPrimaria={theme.menuBackgroundColor}
        corDestaque={theme.menuIconColor}
      />

      {confirmarLimparCatalogo && (
        <div
          className="fixed inset-0 z-[165] flex items-center justify-center px-4 py-6 backdrop-blur-[1px]"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.08)" }}
        >
          <style>{`
            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"],
            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"],
            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="footer"] {
              background: var(--surface) !important;
              background-color: var(--surface) !important;
              color: var(--text-primary) !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"] h2 {
              color: var(--text-primary) !important;
              font-weight: 600 !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"] p {
              color: var(--text-secondary) !important;
              font-weight: 400 !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"] button {
              background: transparent !important;
              color: var(--text-secondary) !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"] {
              position: relative !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              padding: 1.35rem 1.5rem 1.25rem !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] [data-limpar-catalogo-modal="content"] {
              align-items: center !important;
              text-align: center !important;
            }

            .cadastros-layout > div.fixed.inset-0 > div[data-limpar-catalogo-modal="box"] > div[data-limpar-catalogo-modal="header"] button {
              position: absolute !important;
              right: 1rem !important;
              top: 1rem !important;
            }
          `}</style>
          <div
            data-limpar-catalogo-modal="box"
            className="vidros-limpar-catalogo-modal w-full max-w-[420px] overflow-hidden rounded-[18px] border border-border shadow-[0_18px_48px_var(--shadow)]"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
          >
            <div
              data-limpar-catalogo-modal="header"
              className="flex flex-col items-center justify-center gap-3 px-6 pb-5 pt-6 text-center"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div data-limpar-catalogo-modal="content" className="flex min-w-0 flex-col items-center gap-3 text-center">
                <div
                  data-limpar-catalogo-modal="icon"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-danger-soft bg-danger-soft/50 text-danger"
                >
                  <Trash2 size={17} strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-medium leading-6 text-text-primary">
                    Limpar todo o catálogo
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Essa ação excluirá permanentemente todos os {vidros.length} vidros e os preços especiais associados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmarLimparCatalogo(false)}
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-secondary hover:text-text-secondary"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div
              data-limpar-catalogo-modal="footer"
              className="flex justify-center gap-2 border-t border-border px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <button
                type="button"
                onClick={() => setConfirmarLimparCatalogo(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void executarLimpezaCatalogo()}
                className="rounded-xl border border-danger-soft bg-surface px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft active:scale-[0.98]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <CadastrosAvisoModal
        aviso={modalAviso}
        onClose={() => setModalAviso(null)}
        colors={{
          bg: "var(--surface)",
          text: DRAWING_COLORS.ink,
          primaryButtonBg: DRAWING_COLORS.ink,
          primaryButtonText: "var(--surface)",
          success: "var(--success)",
          error: "var(--danger)",
          warning: "var(--warning)",
        }}
      />

      {carregando && !modalAviso && !mostrarModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-navigation/15 px-4 backdrop-blur-[2px]">
          <div className="flex min-w-72 flex-col items-center gap-3 rounded-[22px] border border-border bg-surface px-9 py-8 shadow-[0_22px_60px_var(--shadow)]">
            <div className="relative">
              <div
                className="h-14 w-14 rounded-full border-4 border-border border-t-transparent animate-spin"
                style={{ borderTopColor: theme.menuIconColor }}
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-text-secondary">Processando...</p>
              <p className="mt-1 text-xs text-text-secondary">Aguarde enquanto os dados são atualizados.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
