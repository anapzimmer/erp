//src/app/admin/tabelas/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { PlusCircle, Trash2, Percent, Check, Search, Layers3, DollarSign, Edit2, TableProperties, Upload, FileText, Link2, Sparkles, X, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
// 🔥 IMPORTANTE: Importar o hook de tema
import { useTheme } from "@/context/ThemeContext"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar";
import CadastrosAvisoModal from "@/components/CadastrosAvisoModal";

// --- Tipagens ---
type TabelaPreco = { id: string; nome: string } // de number para string
type Vidro = { id: string; codigo?: string | null; nome: string; preco: number; espessura: string; tipo: string; } // de number para string
type ItemTabela = {
  id: string; // de number para string
  grupo_preco_id: string; // de number para string
  vidro_id: string; // de number para string
  preco: number;
  vidros?: { nome: string; espessura: string; tipo: string; }
}

export default function GestaoPrecosPage() {
  const router = useRouter()
  // 🔥 Consumir o tema do contexto
  const { theme } = useTheme();
  const [empresaIdAtual, setEmpresaIdAtual] = useState<string>("");

  // --- Estados de Auth e UI ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("Carregando...");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(true);

  // --- Estados da Lógica de Negócio ---
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([])
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [tabelaSelecionada, setTabelaSelecionada] = useState<TabelaPreco | null>(null)
  const [itensTabela, setItensTabela] = useState<ItemTabela[]>([])
  const [modalSucessoAberto, setModalSucessoAberto] = useState<{ aberto: boolean, mensagem: string }>({ aberto: false, mensagem: "" });

  const [nomeNovaTabela, setNomeNovaTabela] = useState("")
  const [percentualReajuste, setPercentualReajuste] = useState<string>("5")
  const [termoPesquisa, setTermoPesquisa] = useState("")
  const [novoVidroId, setNovoVidroId] = useState("")
  const [novoPrecoVidro, setNovoPrecoVidro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [modalAvisoAberto, setModalAvisoAberto] = useState<{ aberto: boolean, mensagem: string }>({ aberto: false, mensagem: "" });
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    titulo: string;
    mensagem: string;
    confirmar?: () => void;
    tipo?: "sucesso" | "erro" | "aviso";
    labelConfirmar?: string;
    labelCancelar?: string;
  } | null>(null);
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [novoPrecoEdicao, setNovoPrecoEdicao] = useState<string>("");
  const [editandoTabelaId, setEditandoTabelaId] = useState<string | null>(null);
  const [nomeTabelaEdicao, setNomeTabelaEdicao] = useState("");
  const arquivoTabelaRef = useRef<HTMLInputElement>(null);

  type LinhaImportada = {
    codigo: string;
    descricao: string;
    precoAtual: number;
    minimoAtual: number;
  };

  type AcaoPendente = "vincular" | "criar" | "ignorar";

  type ItemPendente = LinhaImportada & {
    acao: AcaoPendente;
    vidroSelecionadoId: string;
    sugestaoVidroId?: string;
    novoNome: string;
    novaEspessura: string;
    novoTipo: string;
  };

  type ImportacaoPendente = {
    nomeTabela: string;
    reconhecidos: Array<{ item: LinhaImportada; vidro: Vidro }>;
    pendentes: ItemPendente[];
  };

  const [importacaoPendente, setImportacaoPendente] = useState<ImportacaoPendente | null>(null);

  const normalizarTexto = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();

  const moedaBrasileiraParaNumero = (valor: string) =>
    Number(valor.replace(/\./g, "").replace(",", "."));

  const interpretarArquivoTabela = (conteudo: string) => {
    const linhas = conteudo.split(/\rx\n/);
    const linhaTabela = linhas.find((linha) => /^\s*TABELA\s+/i.test(linha));

    const nomeTabela = linhaTabela ? linhaTabela
          .replace(/^\s*TABELA\s+/i, "")
          .replace(/\s+-\s+[^-]+\s*$/, "")
          .trim()
      : "Tabela importada";

    const itens: LinhaImportada[] = [];

    for (const linha of linhas) {
      const correspondencia = linha.match(
        /^\s*(\S+)\s+(.+x)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+_{3,}/
      );

      if (!correspondencia) continue;

      itens.push({
        codigo: correspondencia[1].trim(),
        descricao: correspondencia[2].trim(),
        precoAtual: moedaBrasileiraParaNumero(correspondencia[3]),
        minimoAtual: moedaBrasileiraParaNumero(correspondencia[4]),
      });
    }

    return { nomeTabela, itens };
  };

  const extrairDadosDescricao = (descricao: string) => {
    const descricaoLimpa = descricao.trim().replace(/\s+/g, " ");
    const espessuraEncontrada = descricaoLimpa.match(/\b(\d{1,2}(?:\s*\+\s*\d{1,2})x)\s*MM\b/i);
    const espessura = espessuraEncontrada ? espessuraEncontrada[1].replace(/\s/g, "").split("+").map((p) => p.padStart(2, "0")).join("+") + "mm"
      : "";

    const tiposConhecidos = ["temperado", "laminado", "comum", "espelho", "aramado", "insulado"];
    const tipoEncontrado = tiposConhecidos.find((tipo) => descricaoLimpa.toLowerCase().includes(tipo));
    const tipo = tipoEncontrado ? tipoEncontrado.charAt(0).toUpperCase() + tipoEncontrado.slice(1) : "";

    const nome = descricaoLimpa
      .replace(/\b\d{1,2}(?:\s*\+\s*\d{1,2})x\s*MM\b/gi, "")
      .replace(new RegExp(`\\b(${tiposConhecidos.join("|")})\\b`, "gi"), "")
      .replace(/\s+/g, " ")
      .trim();

    return { nome: nome || descricaoLimpa, espessura, tipo };
  };

  const pontuarSemelhanca = (item: LinhaImportada, vidro: Vidro) => {
    const descricao = normalizarTexto(item.descricao);
    const nome = normalizarTexto(vidro.nome);
    let pontos = 0;

    if (descricao === nome) pontos += 100;
    else if (descricao.includes(nome) || nome.includes(descricao)) pontos += 55;

    const palavrasDescricao = new Set(item.descricao.toUpperCase().split(/\s+/).map(normalizarTexto).filter(Boolean));
    const palavrasVidro = vidro.nome.toUpperCase().split(/\s+/).map(normalizarTexto).filter(Boolean);
    pontos += palavrasVidro.filter((palavra) => palavrasDescricao.has(palavra)).length * 12;

    const espessuraDescricao = item.descricao.match(/\b(\d{1,2}(?:\s*\+\s*\d{1,2})x)\s*MM\b/i)?.[1]?.replace(/\s/g, "");
    const espessuraVidro = vidro.espessura.replace(/\D|mm/gi, "");
    if (espessuraDescricao && normalizarTexto(espessuraDescricao) === normalizarTexto(espessuraVidro)) pontos += 25;

    if (vidro.tipo && descricao.includes(normalizarTexto(vidro.tipo))) pontos += 20;
    return pontos;
  };

  const importarTabelaTxt = async (arquivo: File) => {
    if (!empresaIdAtual) {
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível identificar a empresa." });
      return;
    }

    if (!arquivo.name.toLowerCase().endsWith(".txt")) {
      setModalAvisoAberto({ aberto: true, mensagem: "Selecione um arquivo TXT válido." });
      return;
    }

    setCarregando(true);
    try {
      const conteudo = await arquivo.text();
      const { nomeTabela, itens } = interpretarArquivoTabela(conteudo);
      if (!itens.length) throw new Error("Nenhum produto foi reconhecido no arquivo.");

      const { data: vidrosBanco, error: erroVidros } = await supabase
        .from("vidros")
        .select("id, codigo, nome, preco, espessura, tipo")
        .eq("empresa_id", empresaIdAtual)
        .order("nome");
      if (erroVidros) throw erroVidros;

      const catalogo = (vidrosBanco || []) as Vidro[];
      const porCodigo = new Map(
        catalogo.filter((v) => v.codigo).map((v) => [normalizarTexto(v.codigo || ""), v])
      );
      const porNome = new Map(catalogo.map((v) => [normalizarTexto(v.nome), v]));

      const reconhecidos: Array<{ item: LinhaImportada; vidro: Vidro }> = [];
      const pendentes: ItemPendente[] = [];

      for (const item of itens) {
        const encontrado = porCodigo.get(normalizarTexto(item.codigo)) || porNome.get(normalizarTexto(item.descricao));
        if (encontrado) {
          reconhecidos.push({ item, vidro: encontrado });
          continue;
        }

        const sugestao = [...catalogo]
          .map((vidro) => ({ vidro, pontos: pontuarSemelhanca(item, vidro) }))
          .sort((a, b) => b.pontos - a.pontos)[0];
        const usarSugestao = sugestao && sugestao.pontos >= 35;
        const dados = extrairDadosDescricao(item.descricao);

        pendentes.push({
          ...item,
          acao: usarSugestao ? "vincular" : "criar",
          vidroSelecionadoId: usarSugestao ? sugestao.vidro.id : "",
          sugestaoVidroId: usarSugestao ? sugestao.vidro.id : undefined,
          novoNome: dados.nome,
          novaEspessura: dados.espessura,
          novoTipo: dados.tipo,
        });
      }

      if (!pendentes.length) {
        setImportacaoPendente({ nomeTabela, reconhecidos, pendentes: [] });
        await confirmarImportacao({ nomeTabela, reconhecidos, pendentes: [] });
        return;
      }

      setImportacaoPendente({ nomeTabela, reconhecidos, pendentes });
    } catch (error: any) {
      console.error("Erro ao analisar tabela:", error);
      setModalAvisoAberto({ aberto: true, mensagem: error?.message || "Não foi possível analisar a tabela." });
    } finally {
      setCarregando(false);
      if (arquivoTabelaRef.current) arquivoTabelaRef.current.value = "";
    }
  };

  const atualizarItemPendente = (indice: number, alteracoes: Partial<ItemPendente>) => {
    setImportacaoPendente((atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        pendentes: atual.pendentes.map((item, i) => i === indice ? { ...item, ...alteracoes } : item),
      };
    });
  };

  const confirmarImportacao = async (dadosForcados?: ImportacaoPendente) => {
    const dados = dadosForcados || importacaoPendente;
    if (!dados || !empresaIdAtual) return;

    const vinculosInvalidos = dados.pendentes.filter((item) => item.acao === "vincular" && !item.vidroSelecionadoId);
    const novosInvalidos = dados.pendentes.filter(
      (item) => item.acao === "criar" && (!item.novoNome.trim() || !item.novaEspessura.trim() || !item.novoTipo.trim())
    );
    if (vinculosInvalidos.length || novosInvalidos.length) {
      setModalAvisoAberto({ aberto: true, mensagem: "Revise os itens destacados. Para criar um vidro, informe nome, espessura e tipo; para vincular, selecione um cadastro." });
      return;
    }

    setCarregando(true);
    try {
      const { data: tabelaExistente, error: erroTabelaExistente } = await supabase
        .from("tabelas")
        .select("id, nome")
        .eq("empresa_id", empresaIdAtual)
        .ilike("nome", dados.nomeTabela)
        .maybeSingle();
      if (erroTabelaExistente) throw erroTabelaExistente;

      let tabelaImportada = tabelaExistente;
      if (!tabelaImportada) {
        const { data: novaTabela, error: erroNovaTabela } = await supabase
          .from("tabelas")
          .insert({ nome: dados.nomeTabela, empresa_id: empresaIdAtual })
          .select("id, nome")
          .single();
        if (erroNovaTabela) throw erroNovaTabela;
        tabelaImportada = novaTabela;
      }

      const registros: Array<{ grupo_preco_id: string; vidro_id: string; preco: number; empresa_id: string }> =
        dados.reconhecidos.map(({ item, vidro }) => ({
          grupo_preco_id: tabelaImportada!.id,
          vidro_id: vidro.id,
          preco: item.precoAtual,
          empresa_id: empresaIdAtual,
        }));

      let vinculados = 0;
      let criados = 0;
      let ignorados = 0;

      for (const item of dados.pendentes) {
        if (item.acao === "ignorar") {
          ignorados++;
          continue;
        }

        let vidroId = item.vidroSelecionadoId;
        if (item.acao === "vincular") {
          const { error: erroVinculo } = await supabase
            .from("vidros")
            .update({ codigo: item.codigo.toUpperCase() })
            .eq("id", vidroId)
            .eq("empresa_id", empresaIdAtual);
          if (erroVinculo) throw new Error(`Não foi possível vincular ${item.codigo}: ${erroVinculo.message}`);
          vinculados++;
        } else {
          const { data: novoVidro, error: erroNovoVidro } = await supabase
            .from("vidros")
            .insert({
              codigo: item.codigo.toUpperCase(),
              nome: item.novoNome.trim(),
              espessura: item.novaEspessura.trim(),
              tipo: item.novoTipo.trim(),
              preco: item.precoAtual,
              empresa_id: empresaIdAtual,
            })
            .select("id")
            .single();
          if (erroNovoVidro) throw new Error(`Não foi possível criar ${item.codigo}: ${erroNovoVidro.message}`);
          vidroId = novoVidro.id;
          criados++;
        }

        registros.push({
          grupo_preco_id: tabelaImportada.id,
          vidro_id: vidroId,
          preco: item.precoAtual,
          empresa_id: empresaIdAtual,
        });
      }

      if (registros.length) {
        const { error: erroImportacao } = await supabase
          .from("vidro_precos_grupos")
          .upsert(registros, { onConflict: "grupo_preco_id,vidro_id" });
        if (erroImportacao) throw erroImportacao;
      }

      await carregarTabelas(empresaIdAtual);
      await carregarTodosVidros(empresaIdAtual);
      setTabelaSelecionada(tabelaImportada);
      await carregarItensTabela(tabelaImportada.id);
      setImportacaoPendente(null);
      setModalSucessoAberto({
        aberto: true,
        mensagem: `${registros.length} preço(s) salvos na tabela “${tabelaImportada.nome}”. Vinculados: ${vinculados}. Novos vidros: ${criados}. Ignorados: ${ignorados}.`,
      });
    } catch (error: any) {
      console.error("Erro ao confirmar importação:", error);
      setModalAvisoAberto({ aberto: true, mensagem: error?.message || "Não foi possível concluir a importação." });
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (item: ItemTabela) => {
    if (!tabelaSelecionada) return; // Segurança extra
    setEditandoItemId(item.id);
    setNovoPrecoEdicao(item.preco.toString());
  };

  const salvarEdicaoPreco = async (id: string) => {
  if (!novoPrecoEdicao || isNaN(parseFloat(novoPrecoEdicao))) return;

  setCarregando(true); // Feedback visual
  const precoNumerico = parseFloat(novoPrecoEdicao);

  const { error } = await supabase
    .from("vidro_precos_grupos")
    .update({ preco: precoNumerico })
    .eq("id", id);

  if (!error) {
    // 1. Atualiza o estado local IMEDIATAMENTE para refletir na tela
    setItensTabela(prev => 
      prev.map(item => item.id === id ? { ...item, preco: precoNumerico } : item)
    );

    // 2. Limpa o estado de edição
    setEditandoItemId(null);
    setNovoPrecoEdicao("");
    
    // 3. Opcional: Recarrega do banco para garantir sincronia total
    if (tabelaSelecionada?.id) {
      await carregarItensTabela(tabelaSelecionada.id);
    }

    setModalSucessoAberto({ aberto: true, mensagem: "Preço atualizado com sucesso." });
  } else {
    console.error("Erro ao salvar preço:", error);
    setModalAvisoAberto({ aberto: true, mensagem: "Erro ao atualizar preço no banco." });
  }
  setCarregando(false);
};

  const excluirTabela = async (tabela: TabelaPreco) => {
    if (!empresaIdAtual) {
      console.error("Faltando ID da tabela ou da empresa");
      return;
    }

    setCarregando(true);
    const diagnostico: Record<string, unknown> = {
      tabelaId: tabela.id,
      tabelaNome: tabela.nome,
      empresaId: empresaIdAtual,
    };

    try {
      console.group("[TABELAS] Diagnóstico da exclusão");
      console.log("Iniciando exclusão da tabela:", diagnostico);

      const { data: tabelaAntes, error: erroTabelaAntes } = await supabase
        .from("tabelas")
        .select("id, nome, empresa_id")
        .eq("id", tabela.id)
        .maybeSingle();

      diagnostico.tabelaAntes = tabelaAntes || null;
      if (erroTabelaAntes) {
        diagnostico.erroTabelaAntes = erroTabelaAntes;
        throw erroTabelaAntes;
      }

      if (!tabelaAntes) {
        throw new Error("Não encontrei essa tabela no banco antes da exclusão. Pode ser empresa diferente, permissão/RLS ou ID incorreto.");
      }

      if (String(tabelaAntes.empresa_id) !== String(empresaIdAtual)) {
        throw new Error(`A tabela pertence à empresa ${tabelaAntes.empresa_id}, mas a página está usando a empresa ${empresaIdAtual}.`);
      }

      const { count: precosRemovidos, error: erroPrecos } = await supabase
        .from("vidro_precos_grupos")
        .delete({ count: "exact" })
        .eq("grupo_preco_id", tabela.id);

      diagnostico.precosRemovidos = precosRemovidos ?? 0;
      if (erroPrecos) throw erroPrecos;

      const { count: clientesAtualizados, error: erroClientes } = await supabase
        .from("clientes")
        .update({ grupo_preco_id: null }, { count: "exact" })
        .eq("grupo_preco_id", tabela.id)
        .eq("empresa_id", empresaIdAtual);

      diagnostico.clientesAtualizados = clientesAtualizados ?? 0;
      if (erroClientes) throw erroClientes;

      const { count: tabelasRemovidas, error: erroTabela } = await supabase
        .from("tabelas")
        .delete({ count: "exact" })
        .eq("id", tabela.id)
        .eq("empresa_id", empresaIdAtual);

      diagnostico.tabelasRemovidas = tabelasRemovidas ?? 0;
      if (erroTabela) throw erroTabela;

      const { data: tabelaDepois, error: erroTabelaDepois } = await supabase
        .from("tabelas")
        .select("id, nome, empresa_id")
        .eq("id", tabela.id)
        .maybeSingle();

      diagnostico.tabelaDepois = tabelaDepois || null;
      if (erroTabelaDepois) {
        diagnostico.erroTabelaDepois = erroTabelaDepois;
        throw erroTabelaDepois;
      }

      console.log("Resultado da exclusão:", diagnostico);

      if (tabelaDepois) {
        throw new Error(`O Supabase encontrou a tabela, mas bloqueou o DELETE por política RLS. Registros afetados: ${tabelasRemovidas ?? 0}. Execute o SQL database/tabelas_rls_fi?.sql no Supabase.`);
      }

      setTabelas(prev => prev.filter(t => t.id !== tabela.id));
      setTabelaSelecionada(null);
      setItensTabela([]);
      setEditandoTabelaId(null);
      setNomeTabelaEdicao("");
      setModalConfirmacao(null);
      setModalSucessoAberto({ aberto: true, mensagem: "Tabela removida com sucesso." });
      await carregarTabelas(empresaIdAtual);
    } catch (error: any) {
      diagnostico.erro = error?.message || error;
      console.error("Erro ao excluir tabela:", error);
      console.log("Diagnóstico completo:", diagnostico);
      setModalAvisoAberto({
        aberto: true,
        mensagem: `Não foi possível excluir a tabela.\n${error?.message || "Verifique se ela está vinculada a algum cadastro."}\n\nAbra o console e procure por [TABELAS] Diagnóstico da exclusão.`,
      });
    } finally {
      console.groupEnd();
      setCarregando(false);
    }
  };

  // --- Efeitos de Inicialização e Auth ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push("/login");
          return;
        }
        setUsuarioEmail(authData.user.email || "Usuário");

        const { data: perfil } = await supabase
          .from("perfis_usuarios")
          .select("empresa_id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (perfil) {
          // 🔥 SALVE O ID AQUI
          setEmpresaIdAtual(perfil.empresa_id);

          const { data: empresaData } = await supabase
            .from("empresas")
            .select("nome")
            .eq("id", perfil.empresa_id)
            .single();

          if (empresaData) setNomeEmpresa(empresaData.nome);

          // 🔥 PASSE O ID PARA AS FUNÇÕES DE CARREGAMENTO
          await carregarTabelas(perfil.empresa_id);
          await carregarTodosVidros(perfil.empresa_id);
        }
      } catch (error) {
        console.error("Erro ao iniciar tabela de precos:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // --- Funções de Carregamento de Dados ---
  const carregarTabelas = useCallback(async (empresaId: string) => {
    const { data } = await supabase
      .from("tabelas")
      .select("*")
      .eq("empresa_id", empresaId) // 🔥 Agora empresaId é conhecido
      .order("nome", { ascending: true });
    setTabelas(data || []);
  }, []);

  const carregarTodosVidros = useCallback(async (empresaId: string) => {
    // Se o empresaId vier vazio, tentamos pegar do usuário logado
    let idParaFiltrar = empresaId;

    if (!idParaFiltrar) {
      const { data: { user } } = await supabase.auth.getUser();
      idParaFiltrar = user?.user_metadata?.empresa_id;
    }

    if (!idParaFiltrar) return;

    const { data, error } = await supabase
      .from("vidros")
      .select("id, codigo, nome, espessura, tipo, preco")
      .eq("empresa_id", idParaFiltrar); // Filtro agora está blindado

    if (error) {
      console.error("Erro ao carregar vidros:", error);
    } else {
      const vidrosFormatados = data?.map(v => ({
        id: v.id,
        codigo: v.codigo,
        nome: `${v.nome} - ${v.espessura}mm - ${v.tipo}`,
        preco: v.preco,
        espessura: v.espessura,
        tipo: v.tipo
      })) || [];
      setVidros(vidrosFormatados);
    }
  }, []);

  const carregarItensTabela = useCallback(async (tabelaId: string) => { // de number para string
    setCarregando(true)
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, vidros(nome, espessura, tipo)")
      .eq("grupo_preco_id", tabelaId)
      .order("id", { ascending: true }) // mudei de vidros(nome) para id para evitar erro de join

    if (data) setItensTabela(data)
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (tabelaSelecionada) {
      carregarItensTabela(tabelaSelecionada.id)
    } else {
      setItensTabela([])
    }
  }, [tabelaSelecionada, carregarItensTabela])

  // --- Ações ---
  const criarTabela = async () => {
    // Log para você ver no console (F12) o que está vindo vazio
    // Verifique se o log mostra o UUID correto da empresa antes do erro
console.log("Enviando empresa_id:", empresaIdAtual);

    if (!nomeNovaTabela.trim()) {
      setModalAvisoAberto({ aberto: true, mensagem: "Informe um nome para a tabela de preços." });
      return;
    }

    if (!empresaIdAtual) {
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível identificar a empresa. Atualize a página e tente novamente." });
      return;
    }

    setCarregando(true);
    const { error } = await supabase
      .from("tabelas")
      .insert({
        nome: nomeNovaTabela,
        empresa_id: empresaIdAtual
      });

    if (!error) {
      setNomeNovaTabela("");
      carregarTabelas(empresaIdAtual);
      setModalSucessoAberto({ aberto: true, mensagem: "Tabela criada com sucesso." });
    } else {
      console.error("Erro ao criar:", error);
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível criar a tabela no banco de dados." });
    }
    setCarregando(false);
  };

  const iniciarEdicaoTabela = (tabela: TabelaPreco) => {
    setEditandoTabelaId(tabela.id);
    setNomeTabelaEdicao(tabela.nome);
  };

  const cancelarEdicaoTabela = () => {
    setEditandoTabelaId(null);
    setNomeTabelaEdicao("");
  };

  const salvarNomeTabela = async (tabela: TabelaPreco) => {
    const nomeLimpo = nomeTabelaEdicao.trim();

    if (!nomeLimpo) {
      setModalAvisoAberto({ aberto: true, mensagem: "Informe um nome para a tabela." });
      return;
    }

    if (!empresaIdAtual) {
      setModalAvisoAberto({ aberto: true, mensagem: "Não foi possível identificar a empresa. Atualize a página e tente novamente." });
      return;
    }

    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("tabelas")
        .update({ nome: nomeLimpo })
        .eq("id", tabela.id)
        .eq("empresa_id", empresaIdAtual)
        .select("id, nome")
        .single();

      if (error) throw error;
      if (!data) throw new Error("A tabela não foi atualizada no banco.");

      const tabelaAtualizada = data as TabelaPreco;
      setTabelas((atuais) => atuais.map((item) => item.id === tabela.id ? tabelaAtualizada : item));
      setTabelaSelecionada((atual) => atual?.id === tabela.id ? tabelaAtualizada : atual);
      cancelarEdicaoTabela();
      setModalSucessoAberto({ aberto: true, mensagem: "Nome da tabela atualizado com sucesso." });
    } catch (error: any) {
      console.error("Erro ao editar tabela:", error);
      setModalAvisoAberto({ aberto: true, mensagem: `Não foi possível editar o nome da tabela. ${error?.message || ""}` });
    } finally {
      setCarregando(false);
    }
  };

const adicionarVidroATabela = async () => {
  if (!tabelaSelecionada?.id || !novoVidroId || !novoPrecoVidro) {
    setModalAvisoAberto({ aberto: true, mensagem: "Preencha todos os campos obrigatórios." });
    return;
  }

  setCarregando(true);

const { error } = await supabase
  .from("vidro_precos_grupos")
  .upsert({
    grupo_preco_id: tabelaSelecionada.id,
    vidro_id: novoVidroId,
    preco: parseFloat(novoPrecoVidro),
    empresa_id: empresaIdAtual
  }, { onConflict: 'grupo_preco_id, vidro_id' }); // Especifique as colunas do conflito

  if (error) {
    // Tratando o erro 409 especificamente
    if (error.code === '23505') { 
      setModalAvisoAberto({ 
        aberto: true, 
        mensagem: "Este vidro já está cadastrado nesta tabela. Edite o preço na lista abaixo se desejar alterar." 
      });
    } else {
      setModalAvisoAberto({ aberto: true, mensagem: "Erro ao salvar: " + error.message });
    }
  } else {
    // Sucesso...
    setNovoVidroId("");
    setNovoPrecoVidro("");
    carregarItensTabela(tabelaSelecionada.id);
    setModalSucessoAberto({ aberto: true, mensagem: "Vidro adicionado com sucesso." });
  }
  setCarregando(false);
};

  const confirmarExclusao = async (item: ItemTabela) => {
    const { error } = await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("id", item.id);
    if (!error) {
      carregarItensTabela(tabelaSelecionada!.id);
      setModalConfirmacao(null);
      setModalSucessoAberto({ aberto: true, mensagem: "Vidro removido com sucesso." });
    }
  };

  const vidrosFiltrados = useMemo(() => {
    if (!termoPesquisa.trim()) return vidros;
    const palavrasPesquisa = termoPesquisa.toLowerCase().trim().split(/\s+/);
    return vidros.filter(v => {
      const nomeVidro = v.nome.toLowerCase();
      return palavrasPesquisa.every(palavra => nomeVidro.includes(palavra));
    });
  }, [vidros, termoPesquisa])

  const aplicarReajuste = async () => {
    if (!tabelaSelecionada || !percentualReajuste) return

    const perc = parseFloat(percentualReajuste)
    if (isNaN(perc)) {
      setModalAvisoAberto({ aberto: true, mensagem: "Informe um percentual válido para reajuste." })
      return
    }

    const fator = 1 + (perc / 100)
    setCarregando(true)

    try {
      const { data: itensAtuais, error: erroBusca } = await supabase
        .from("vidro_precos_grupos")
        .select("id, preco")
        .eq("grupo_preco_id", tabelaSelecionada.id)

      if (erroBusca) throw erroBusca

      const atualizacoes = (itensAtuais || []).map((item) => {
        const precoAtual = Number(item.preco) || 0
        const novoPreco = Number((precoAtual * fator).toFixed(2))

        return supabase
          .from("vidro_precos_grupos")
          .update({ preco: novoPreco })
          .eq("id", item.id)
      })

      const resultados = await Promise.all(atualizacoes)
      const erroAtualizacao = resultados.find((resultado) => resultado.error)
      if (erroAtualizacao?.error) throw erroAtualizacao.error

      await carregarItensTabela(tabelaSelecionada.id)
      setModalSucessoAberto({ aberto: true, mensagem: "Reajuste aplicado com sucesso." })
    } catch (error: any) {
      setModalAvisoAberto({ aberto: true, mensagem: "Erro ao aplicar reajuste: " + (error?.message || "Erro desconhecido") })
    } finally {
      setCarregando(false)
      setModalConfirmacao(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.menuBackgroundColor, borderBottomColor: theme.menuBackgroundColor, borderLeftColor: theme.menuBackgroundColor }}></div>
      </div>
    );
  }

   return (
    <div className="flex min-h-screen text-gray-900 overflow-x-hidden" style={{ backgroundColor: theme.screenBackgroundColor }}>

  <Sidebar 
    showMobileMenu={showMobileMenu}
    setShowMobileMenu={setShowMobileMenu}
    nomeEmpresa={nomeEmpresa}
    expandido={sidebarExpandido}
    setExpandido={setSidebarExpandido}
  />

  {showMobileMenu && (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setShowMobileMenu(false)}
    />
  )}

  <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">

    <Header
      setShowMobileMenu={setShowMobileMenu}
      nomeEmpresa={nomeEmpresa}
      usuarioEmail={usuarioEmail}
      handleSignOut={handleSignOut}
    />

        <main className="p-4 md:p-8 flex-1">
          <div
            className="mb-6 rounded-[24px] border p-6 md:p-8 shadow-sm"
            style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}14` }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `${theme.menuIconColor}14`, borderColor: `${theme.menuIconColor}2E`, color: theme.menuIconColor }}
                >
                  <TableProperties size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: `${theme.contentTextLightBg}8A` }}>
                    Configurações
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold md:text-3xl" style={{ color: theme.contentTextLightBg }}>Tabelas</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Gerencie tabelas de preço, vincule vidros e aplique reajustes sem sair do padrão visual do sistema.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:w-[430px]">
                {[
                  { label: "Tabelas", valor: tabelas.length },
                  { label: "Vidros", valor: vidros.length },
                  { label: "Itens", valor: itensTabela.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border px-4 py-3"
                    style={{ backgroundColor: `${theme.screenBackgroundColor}B8`, borderColor: `${theme.contentTextLightBg}12` }}
                  >
                    <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold" style={{ color: theme.contentTextLightBg }}>{item.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 rounded-[22px] border p-4 md:flex-row md:items-center md:justify-between md:p-5 shadow-sm" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}14` }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border" style={{ backgroundColor: `${theme.menuIconColor}12`, borderColor: `${theme.menuIconColor}26`, color: theme.menuIconColor }}>
                <FileText size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>Importar tabela pelo relatório TXT</h2>
                <p className="mt-1 text-sm text-slate-500">O sistema identifica a tabela, procura os produtos pelo código e salva os preços automaticamente.</p>
              </div>
            </div>

            <input
              ref={arquivoTabelaRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => {
                const arquivo = event.target.files?.[0];
                if (arquivo) importarTabelaTxt(arquivo);
              }}
            />

            <button
              type="button"
              onClick={() => arquivoTabelaRef.current?.click()}
              disabled={carregando}
              className="flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.menuBackgroundColor, color: theme.contentTextDarkBg, boxShadow: `0 12px 28px ${theme.menuBackgroundColor}24` }}
            >
              <Upload size={18} />
              {carregando ? "Importando..." : "Enviar tabela TXT"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">

            <div className="h-fit rounded-[22px] border p-5 shadow-sm xl:col-span-1" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}14` }}>
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: theme.contentTextLightBg }}>
                <Layers3 size={18} style={{ color: theme.menuIconColor }} /> Grupos de Preço
              </h2>

              <div className="relative mb-5 group/add">
                <input
                  type="text"
                  value={nomeNovaTabela}
                  onChange={e => setNomeNovaTabela(e.target.value)}
                  placeholder="Nova tabela..."
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 pr-14 text-sm outline-none focus:border-slate-300"
                />
                <button
                  onClick={criarTabela}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2 transition-all duration-200"
                  style={{ backgroundColor: theme.menuBackgroundColor, color: theme.contentTextDarkBg }}
                >
                  <PlusCircle size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {tabelas.map(t => {
                  const editandoEstaTabela = editandoTabelaId === t.id;
                  return (
                  <div
                    key={t.id}
                    className={`w-full group text-left p-3 rounded-2xl text-sm font-medium flex justify-between items-center transition-all ${tabelaSelecionada?.id === t.id ? 'shadow-inner' : 'hover:bg-slate-50'
                      }`}
                    style={{
                      backgroundColor: tabelaSelecionada?.id === t.id ? `${theme.menuBackgroundColor}15` : 'transparent',
                      color: tabelaSelecionada?.id === t.id ? theme.menuBackgroundColor : 'inherit',
                      border: `1px solid ${tabelaSelecionada?.id === t.id ? `${theme.menuBackgroundColor}80` : '#E2E8F0'}`
                    }}
                  >
                    {editandoEstaTabela ? (
                      <input
                        value={nomeTabelaEdicao}
                        onChange={(e) => setNomeTabelaEdicao(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void salvarNomeTabela(t);
                          if (e.key === "Escape") cancelarEdicaoTabela();
                        }}
                        autoFocus
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
                      />
                    ) : (
                      <div className="flex-1 cursor-pointer truncate" onClick={() => setTabelaSelecionada(t)}>
                        <span className="truncate">{t.nome}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {editandoEstaTabela ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void salvarNomeTabela(t)}
                            disabled={carregando}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Salvar nome"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelarEdicaoTabela}
                            disabled={carregando}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            title="Cancelar edição"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          {tabelaSelecionada?.id === t.id && <Check size={17} style={{ color: theme.menuIconColor }} />}

                          <button
                            type="button"
                            onClick={() => iniciarEdicaoTabela(t)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar nome da tabela"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalConfirmacao({
                              titulo: "Confirmar exclusão",
                              mensagem: `Deseja excluir a tabela \"${t.nome}\"x Esta ação não pode ser desfeita.`,
                              confirmar: () => excluirTabela(t),
                              labelConfirmar: "Excluir",
                              labelCancelar: "Cancelar",
                            })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Excluir tabela"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>

            <div className="rounded-[22px] border p-5 shadow-sm xl:col-span-3" style={{ backgroundColor: theme.contentTextDarkBg, borderColor: `${theme.contentTextLightBg}14` }}>
              {tabelaSelecionada ? (
                <>
                  <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tabela selecionada</p>
                      <h2 className="mt-1 text-2xl font-semibold" style={{ color: theme.contentTextLightBg }}>{tabelaSelecionada.nome}</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="relative">
                        <Percent size={16} className="absolute left-3 top-3.5 text-gray-400" />
                        <input type="number" value={percentualReajuste} onChange={e => setPercentualReajuste(e.target.value)} placeholder="%" className="w-24 rounded-xl border border-slate-200 bg-white p-2.5 pl-9 text-sm font-semibold" />
                      </div>
                      <button
                        onClick={() => setModalConfirmacao({
                          titulo: "Confirmar reajuste",
                          mensagem: `Deseja aplicar reajuste de ${percentualReajuste}% na tabela \"${tabelaSelecionada?.nome}\"?`,
                          confirmar: aplicarReajuste,
                          labelConfirmar: "Aplicar",
                          labelCancelar: "Cancelar",
                        })}
                        disabled={carregando}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: theme.menuIconColor, color: "#FFF" }}
                      >
                        {carregando ? "Processando..." : "Reajustar %"}
                      </button>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-12">
                    <div className="md:col-span-5 relative">
                      <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="text" value={termoPesquisa} onChange={e => setTermoPesquisa(e.target.value)} placeholder="Pesquisar vidro..." className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-10 text-sm" />
                    </div>
                    <select
                      value={novoVidroId}
                      onChange={e => setNovoVidroId(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-sm md:col-span-4"
                    >
                      <option value="">Selecione o Vidro</option>
                      {vidrosFiltrados.map(v => (
                        <option key={v.id} value={v.id}>{v.nome}</option>
                      ))}
                    </select>
                    <div className="md:col-span-2 relative">
                      <DollarSign size={16} className="absolute left-3 top-3.5 text-gray-400" />
                      <input type="number" value={novoPrecoVidro} onChange={e => setNovoPrecoVidro(e.target.value)} placeholder="Preço" className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-8 text-sm" />
                    </div>
                    <button
                      onClick={adicionarVidroATabela}
                      disabled={carregando}
                      className="flex items-center justify-center rounded-xl p-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 md:col-span-1"
                      style={{ backgroundColor: theme.menuIconColor, color: "#FFF" }}
                    >
                      {carregando ? (
                        <div
                          className="w-5 h-5 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFF' }}
                        />
                      ) : (
                        <PlusCircle size={20} />
                      )}
                    </button>
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Vidro / Especificação</th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Preço (R$)</th>
                          <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensTabela.map((item) => (
                          <tr key={item.id} className="group border-b border-slate-100 transition-all hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: theme.contentTextLightBg }}
                                >
                                  {item.vidros?.nome}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-tight">
                                  {item.vidros?.espessura} | {item.vidros?.tipo}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center">
                              {editandoItemId === item.id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={novoPrecoEdicao}
                                    onChange={(e) => setNovoPrecoEdicao(e.target.value)}
                                    className="w-24 p-1.5 border-2 rounded-lg text-xs font-bold outline-none transition-all"
                                    // 🔥 Borda cor tema ao selecionar (focus)
                                    style={{ borderColor: theme.menuIconColor }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => salvarEdicaoPreco(item.id)}
                                    className="hover:scale-110 transition-transform p-1 rounded-md"
                                    style={{ color: theme.menuIconColor }} // Check cor Turquesa
                                  >
                                    <Check size={20} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold" style={{ color: theme.contentTextLightBg }}>
                                  R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                <button
                                  onClick={() => iniciarEdicao(item)}
                                  className="p-2 hover:bg-white rounded-lg shadow-sm text-gray-400 hover:text-blue-500 transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setModalConfirmacao({
                                    titulo: "Confirmar exclusão",
                                    mensagem: `Deseja excluir ${item.vidros?.nome} desta tabela?`,
                                    confirmar: () => confirmarExclusao(item),
                                    labelConfirmar: "Excluir",
                                    labelCancelar: "Cancelar",
                                  })}
                                  className="p-2 hover:bg-white rounded-lg shadow-sm text-gray-400 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center text-slate-500">
                  <TableProperties size={44} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-base font-semibold">Nenhuma tabela selecionada</p>
                  <p className="text-sm">Selecione um grupo de preço ao lado para gerenciar.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>


      {importacaoPendente && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 md:p-6">
          <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl shadow-2xl border border-white/20 flex flex-col" style={{ backgroundColor: theme.modalBackgroundColor }}>
            <div className="p-5 md:p-7 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={20} style={{ color: theme.menuIconColor }} />
                  <h2 className="text-xl md:text-2xl font-black" style={{ color: theme.modalTextColor }}>Conferir produtos da importação</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Tabela <strong>{importacaoPendente.nomeTabela}</strong>: {importacaoPendente.reconhecidos.length} reconhecido(s) e {importacaoPendente.pendentes.length} aguardando decisão.
                </p>
              </div>
              <button onClick={() => setImportacaoPendente(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={22} /></button>
            </div>

            <div className="overflow-y-auto p-4 md:p-6 space-y-4">
              {importacaoPendente.pendentes.map((item, indice) => {
                const selecionado = vidros.find((v) => v.id === item.vidroSelecionadoId);
                const incompleto = item.acao === "vincular" ? !item.vidroSelecionadoId
                  : item.acao === "criar" && (!item.novoNome || !item.novaEspessura || !item.novoTipo);

                return (
                  <div key={`${item.codigo}-${indice}`} className={`rounded-2xl border p-4 ${incompleto ? "border-amber-300 bg-amber-50/40" : "border-gray-100"}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm px-2.5 py-1 rounded-lg bg-gray-100" style={{ color: theme.modalTextColor }}>{item.codigo}</span>
                          <span className="font-bold text-sm" style={{ color: theme.modalTextColor }}>{item.descricao}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Preço importado: R$ {item.precoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => atualizarItemPendente(indice, { acao: "vincular" })} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border" style={{ backgroundColor: item.acao === "vincular" ? theme.menuBackgroundColor : "#FFF", color: item.acao === "vincular" ? "#FFF" : theme.modalTextColor }}><Link2 size={15} /> Vincular</button>
                        <button onClick={() => atualizarItemPendente(indice, { acao: "criar" })} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border" style={{ backgroundColor: item.acao === "criar" ? theme.menuIconColor : "#FFF", color: item.acao === "criar" ? "#FFF" : theme.modalTextColor }}><PlusCircle size={15} /> Criar novo</button>
                        <button onClick={() => atualizarItemPendente(indice, { acao: "ignorar" })} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${item.acao === "ignorar" ? "bg-gray-700 text-white" : "bg-white text-gray-500"}`}><AlertTriangle size={15} /> Ignorar</button>
                      </div>
                    </div>

                    {item.acao === "vincular" && (
                      <div>
                        {item.sugestaoVidroId && item.vidroSelecionadoId === item.sugestaoVidroId && (
                          <p className="text-xs font-semibold mb-2" style={{ color: theme.menuIconColor }}>Sugestão automática encontrada</p>
                        )}
                        <select value={item.vidroSelecionadoId} onChange={(e) => atualizarItemPendente(indice, { vidroSelecionadoId: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm">
                          <option value="">Selecione um vidro cadastrado</option>
                          {vidros.map((vidro) => <option key={vidro.id} value={vidro.id}>{vidro.codigo ? `${vidro.codigo} — ` : ""}{vidro.nome} | {vidro.espessura} | {vidro.tipo}</option>)}
                        </select>
                        {selecionado && <p className="text-xs text-gray-500 mt-2">O código <strong>{item.codigo}</strong> será gravado em “{selecionado.nome}”.</p>}
                      </div>
                    )}

                    {item.acao === "criar" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={item.novoNome} onChange={(e) => atualizarItemPendente(indice, { novoNome: e.target.value })} placeholder="Nome do vidro" className="p-3 rounded-xl border border-gray-200 text-sm" />
                        <input value={item.novaEspessura} onChange={(e) => atualizarItemPendente(indice, { novaEspessura: e.target.value })} placeholder="Espessura, ex.: 08mm" className="p-3 rounded-xl border border-gray-200 text-sm" />
                        <input value={item.novoTipo} onChange={(e) => atualizarItemPendente(indice, { novoTipo: e.target.value })} placeholder="Tipo, ex.: Temperado" className="p-3 rounded-xl border border-gray-200 text-sm" />
                      </div>
                    )}

                    {item.acao === "ignorar" && <p className="text-xs text-gray-500">Este produto não será salvo e voltará a aparecer em uma próxima importação.</p>}
                  </div>
                );
              })}
            </div>

            <div className="p-5 md:p-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">Os produtos já reconhecidos serão atualizados automaticamente após a confirmação.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setImportacaoPendente(null)} disabled={carregando} className="px-5 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-600">Cancelar</button>
                <button onClick={() => confirmarImportacao()} disabled={carregando} className="px-6 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: theme.modalButtonBackgroundColor }}>
                  {carregando ? "Salvando..." : "Confirmar importação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CadastrosAvisoModal
        aviso={modalSucessoAberto.aberto ? {
            titulo: "Operação concluída",
            mensagem: modalSucessoAberto.mensagem,
            tipo: "sucesso",
          }
          : modalAvisoAberto.aberto ? {
              titulo: "Atenção",
              mensagem: modalAvisoAberto.mensagem,
              tipo: "aviso",
            }
            : null}
        onClose={() => {
          setModalSucessoAberto({ aberto: false, mensagem: "" });
          setModalAvisoAberto({ aberto: false, mensagem: "" });
        }}
        colors={{
          bg: theme.modalBackgroundColor,
          text: theme.modalTextColor,
          primaryButtonBg: theme.modalButtonBackgroundColor,
          primaryButtonText: theme.modalButtonTextColor,
          success: theme.modalIconSuccessColor,
          error: theme.modalIconErrorColor,
          warning: theme.modalIconWarningColor,
        }}
      />

      <CadastrosAvisoModal
        aviso={modalConfirmacao}
        onClose={() => setModalConfirmacao(null)}
        colors={{
          bg: theme.modalBackgroundColor,
          text: theme.modalTextColor,
          primaryButtonBg: theme.modalButtonBackgroundColor,
          primaryButtonText: theme.modalButtonTextColor,
          success: theme.modalIconSuccessColor,
          error: theme.modalIconErrorColor,
          warning: theme.modalIconWarningColor,
        }}
      />

    </div>
  )
}
