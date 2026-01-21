"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { Home, Package, Tags, DollarSign, Layers, Copy, Upload, Download } from "lucide-react"


type Ferragem = {
  id: string
  codigo: string
  nome: string
  preco: string
  categoria: string
  cores: string
  codigo_interno?: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
  hover: "#F3F4F6",
  success: "#92D050",
  error: "#F44336"
}

export default function FerragensPage() {
  const [ferragens, setFerragens] = useState<Ferragem[]>([])
  const [novoItem, setNovoItem] = useState<Omit<Ferragem, "id">>({
    codigo: "",
    nome: "",
    preco: "",
    categoria: "",
    cores: "",
    codigo_interno: "",
  })
  const [editando, setEditando] = useState<Ferragem | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: "sucesso" | "erro" } | null>(null)
  const [modalDeletar, setModalDeletar] = useState<{ id: string; nome: string } | null>(null)

  const pedirDelecao = (item: Ferragem) => {
    setModalDeletar({ id: item.id, nome: item.nome })
  }

  // --- FUNÇÃO DE MENSAGEM ---
  const exibirMensagem = (texto: string, tipo: "sucesso" | "erro" = "sucesso") => {
    setMensagem({ texto, tipo })
    setTimeout(() => setMensagem(null), 3000)
  }

  const confirmarDelecao = async () => {
    if (!modalDeletar) return
    const { id } = modalDeletar
    const { error } = await supabase.from("ferragens").delete().eq("id", id)
    if (error) setMensagem({ texto: "Erro ao excluir ferragem: " + error.message, tipo: "erro" })
    else {
      setFerragens(prev => prev.filter(f => f.id !== id))
      setMensagem({ texto: "Ferragem excluída com sucesso!", tipo: "sucesso" })
    }
    setModalDeletar(null)
    setTimeout(() => setMensagem(null), 3000)
  }


  // --- EXPORTAR CSV ---
  const exportarCSV = () => {
    if (!ferragens.length) return;

    const headers = ["Código", "Nome", "Cores", "Preço", "Categoria"];
    const rows = ferragens.map(f => [f.codigo, f.nome, f.cores, f.preco, f.categoria]);

    // usa ponto e vírgula para separar colunas no Excel
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ferragens.csv");
    link.click();
  };

  // --- IMPORTAR CSV ---
  const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    // Quando o arquivo terminar de ler
    reader.onload = async (e) => {
      let text: string;

      // Se veio como ArrayBuffer (TextDecoder)
      if (e.target?.result instanceof ArrayBuffer) {
        const decoder = new TextDecoder("iso-8859-1"); // Excel Windows padrão
        text = decoder.decode(e.target.result);
      } else {
        // Se veio como string direto
        text = e.target?.result as string;
      }

      if (!text) {
        exibirMensagem("Erro ao ler o arquivo CSV", "erro");
        return;
      }

      // 🔹 Normaliza acentuação (mantém acentos corretos)
      // Se quiser manter os acentos, não precisa remover marcas:
      text = text.normalize("NFC");

      // 🔹 Divide linhas e ignora vazias
      const linhas = text.split(/\r?\n/).filter(l => l.trim() !== "");
      const header = linhas.shift(); // remove header

      const novosItens: Omit<Ferragem, "id">[] = linhas.map(linha => {
        const [codigo, nome, cores, preco, categoria] = linha.split(";");

        // Normaliza e trata preço
        let precoNumero = preco?.trim() || "0";
        // Substitui vírgula por ponto
        precoNumero = precoNumero.replace(",", ".");
        // Converte para número
        const precoFloat = parseFloat(precoNumero);
        // Garante duas casas decimais
        const precoFinal = isNaN(precoFloat) ? "0.00" : precoFloat.toFixed(2);

      return {
      codigo: codigo?.trim() || "",
      nome: padronizarTexto(nome || ""),
      cores: padronizarTexto(cores || ""),
      preco: precoFinal,
      categoria: padronizarTexto(categoria || ""),
      codigo_interno: crypto.randomUUID()
    };
      });

      // 🔹 Busca ferragens existentes
      const { data: ferragensExistentes, error: erroBusca } = await supabase.from("ferragens").select("*");
      if (erroBusca) {
        exibirMensagem("Erro ao buscar ferragens existentes: " + erroBusca.message, "erro");
        return;
      }

      const novasFerragens: any[] = [];
      const paraAtualizar: any[] = [];

      novosItens.forEach(novo => {
        const existente = ferragensExistentes?.find(
          e =>
            e.codigo === novo.codigo &&
            e.nome === novo.nome &&
            e.cores === novo.cores
        );

        if (!existente) {
          novasFerragens.push(novo);
        } else if (existente.preco !== novo.preco) {
          paraAtualizar.push({ ...existente, preco: novo.preco });
        }
      });

      // 🔹 Atualiza preços
      for (const item of paraAtualizar) {
        await supabase.from("ferragens")
          .update({ preco: item.preco })
          .eq("codigo", item.codigo)
          .eq("nome", item.nome)
          .eq("cores", item.cores);
      }

      // 🔹 Insere novos itens
      for (const item of novasFerragens) {
        const { error } = await supabase.from("ferragens").insert(item);
        if (error && !error.message.includes("duplicate key")) {
          exibirMensagem("Erro ao importar CSV: " + error.message, "erro");
          return;
        }
      }

      await carregarFerragens();
      exibirMensagem(
        `Importação concluída! • ${novasFerragens.length} novas • ${paraAtualizar.length} preços atualizados`
      );
    };

    // 🔹 Ler como ArrayBuffer para TextDecoder
    reader.readAsArrayBuffer(file);
  };

  // Filtros
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroCores, setFiltroCores] = useState("")

  useEffect(() => {
    carregarFerragens();
  }, []);


  // --- CARREGAR FERRAGENS ---
  const carregarFerragens = async () => {
    const { data, error } = await supabase.from("ferragens").select("*").order("codigo", { ascending: true })
    if (error) console.error("Erro ao carregar ferragens:", error)
    else setFerragens((data as Ferragem[]) || [])
  }

  useEffect(() => {
    if (!modalDeletar) return;

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        confirmarDelecao(); // chama a função de exclusão
      }
    };

    window.addEventListener("keydown", handleEnter);

    // Remove o listener quando o modal fecha
    return () => window.removeEventListener("keydown", handleEnter);
  }, [modalDeletar]);


  // --- SALVAR ---
  const salvarFerragem = async () => {
    // Validações básicas
    if (!novoItem.codigo.trim()) {
      setMensagem({ texto: "Código é obrigatório.", tipo: "erro" })
      setTimeout(() => setMensagem(null), 3000)
      return
    }
    if (!novoItem.nome.trim()) {
      setMensagem({ texto: "Código é obrigatório.", tipo: "erro" });
      setTimeout(() => setMensagem(null), 3000);
      return;
    }

    setCarregando(true)

    // --- Normaliza o preço ---
    let precoFormatado = novoItem.preco.replace(",", ".") // troca vírgula por ponto
    if (isNaN(Number(precoFormatado))) {
      setMensagem({ texto: "Preço inválido.", tipo: "erro" })
      setTimeout(() => setMensagem(null), 3000)
      setCarregando(false)
      return
    }
    novoItem.preco = Number(precoFormatado).toFixed(2) // sempre com 2 casas decimais

    // --- Salvar no banco ---
    if (editando) {
      const { error } = await supabase
        .from("ferragens")
        .update(novoItem)
        .eq("id", editando.id)
      setCarregando(false)
      if (error) {
        alert("Erro ao atualizar ferragem: " + error.message);
        return
      }
    } else {
      // Garante que novoItem tenha codigo_interno
      if (!novoItem.codigo_interno) novoItem.codigo_interno = crypto.randomUUID()

      const { error } = await supabase.from("ferragens").insert([novoItem])
      setCarregando(false)
      if (error) {
        alert("Erro ao salvar ferragem: " + error.message);
        return
      }
    }

    // --- Resetar form ---
    setNovoItem({ codigo: "", nome: "", preco: "", categoria: "", cores: "", codigo_interno: "" })
    setEditando(null)
    setMostrarModal(false)
    carregarFerragens()
  }


  // --- EDITAR ---
  const editarFerragem = (item: Ferragem) => {
    setEditando(item)
    setNovoItem({ ...item })
    setMostrarModal(true)
  }

  // --- DELETAR ---
  const deletarFerragem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ferragem?")) return
    const { error } = await supabase.from("ferragens").delete().eq("id", id)
    if (error) setMensagem({ texto: "Erro ao excluir ferragem: " + error.message, tipo: "erro" })
    else {
      setFerragens(prev => prev.filter(f => f.id !== id))
      setMensagem({ texto: "Ferragem excluída com sucesso!", tipo: "sucesso" })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  // --- DUPLICAR ---
  const duplicarFerragem = (item: Ferragem) => {
    setEditando(null)
    setNovoItem({
      codigo: item.codigo,         // mantém o mesmo código
      nome: item.nome,             // mantém o mesmo nome
      preco: item.preco,
      categoria: item.categoria,
      cores: "",                   // o usuário preenche a cor
      codigo_interno: crypto.randomUUID(), // ID único para evitar conflito
    })
    setMostrarModal(true)
  }


  // --- FILTROS ---
  const ferragensFiltradas = ferragens.filter(f =>
    f.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
    f.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()) &&
    f.cores.toLowerCase().includes(filtroCores.toLowerCase())
  )

  // --- MÉTRICAS ---
  const totalFerragens = ferragens.length
  const comPreco = ferragens.filter(f => Number(f.preco) > 0).length
  const categoriasDistintas = new Set(ferragens.map(f => f.categoria).filter(Boolean)).size
  const coresDistintas = new Set(ferragens.map(f => f.cores).filter(Boolean)).size

  function abrirModalNovo() {
    setEditando(null)
    setNovoItem({ codigo: "", nome: "", preco: "", categoria: "", cores: "" })
    setMostrarModal(true)
  }
  const padronizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }


  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      {mensagem && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold z-50`}
          style={{ backgroundColor: mensagem.tipo === "sucesso" ? theme.success : theme.error, color: "#FFF" }}>
          {mensagem.texto}
        </div>
      )}

      {/* BARRA DO TOPO */}
      <div className="flex justify-between items-center mb-6 mt-2 px-2">
        {/* Botão Home - lado esquerdo */}
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}
        >
          <Home className="w-5 h-5 text-white" />
          Home
        </button>

        {/* Botões Importar / Exportar - lado direito */}
        <div className="flex gap-2">
          <button
            onClick={exportarCSV}
            className="p-2 rounded-full shadow-sm hover:bg-gray-100 transition"
            title="Exportar CSV"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>

          <label
            htmlFor="importarCSV"
            className="p-2 rounded-full shadow-sm cursor-pointer hover:bg-gray-100 transition"
            title="Importar CSV"
          >
            <Upload className="w-5 h-5 text-gray-600" />
          </label>
          <input
            type="file"
            id="importarCSV"
            accept=".csv"
            className="hidden"
            onChange={importarCSV}
          />
        </div>
      </div>


      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Ferragens</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{ titulo: "Total", valor: totalFerragens, icone: Package },
        { titulo: "Com Preço", valor: comPreco, icone: DollarSign },
        { titulo: "Categorias", valor: categoriasDistintas, icone: Tags },
        { titulo: "Cores Distintas", valor: coresDistintas, icone: Layers }]
          .map(card => (
            <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
              <card.icone className="w-6 h-6 mb-2 text-[#92D050]" />
              <h3 className="text-gray-500">{card.titulo}</h3>
              <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
            </div>
          ))}
      </div>

      {/* Botão Novo Item */}
      <div className="flex justify-center mb-6">
        <button onClick={abrirModalNovo} className="px-6 py-2 rounded-2xl font-bold shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Item
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por categoria" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por cores" value={filtroCores} onChange={e => setFiltroCores(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Cores</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Categoria</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ferragensFiltradas.map(item => (
              <tr key={item.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{item.codigo}</td>
                <td className="p-3">{item.nome}</td>
                <td className="p-3">{item.cores}</td>
                <td className="p-3">{Number(item.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-3">{item.categoria}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarFerragem(item)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
                  </button>
                  <button onClick={() => duplicarFerragem(item)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Copy className="w-5 h-5 text-[#1C415B]" />
                  </button>
                  <button onClick={() => pedirDelecao(item)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/delete.png" alt="Deletar" width={20} height={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
          <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Ferragem" : "Novo Item"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Código *" value={novoItem.codigo} onChange={e => setNovoItem({ ...novoItem, codigo: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Nome *" value={novoItem.nome} onChange={e => setNovoItem({ ...novoItem, nome: padronizarTexto(e.target.value) })}
                className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Cores" value={novoItem.cores} onChange={e => setNovoItem({ ...novoItem, cores: padronizarTexto(e.target.value) })
} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Preço" value={novoItem.preco} onChange={e => setNovoItem({ ...novoItem, preco: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Categoria" value={novoItem.categoria} onChange={e => setNovoItem({ ...novoItem, categoria: padronizarTexto(e.target.value) })
}
 className="w-full p-2 rounded-lg border" />
              <div className="flex justify-between gap-3 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition">
                  Cancelar
                </button>
                <button onClick={salvarFerragem} disabled={carregando} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "theme.primary" }}>
                  {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalDeletar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
          <div className="p-6 rounded-2xl shadow-lg w-full max-w-sm bg-white">
            <h2 className="text-xl font-semibold mb-4">Confirmar exclusão</h2>
            <p className="mb-4">Deseja realmente excluir <strong>{modalDeletar.nome}</strong>?</p>
            <div className="flex justify-between gap-3">
              <button onClick={() => setModalDeletar(null)} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition">
                Não
              </button>
              <button onClick={confirmarDelecao} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "theme.primary" }}>
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

