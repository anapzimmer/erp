"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
// 🔥 Importando ícones novos
import { Home, Package, Tags, DollarSign, Layers, Copy, Upload, Download, Search, Edit3, Trash2 } from "lucide-react"

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

  // Filtros
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroCores, setFiltroCores] = useState("")
  const [filtroCodigo, setFiltroCodigo] = useState("") // 🔥 Novo Filtro por Código

  const exibirMensagem = (texto: string, tipo: "sucesso" | "erro" = "sucesso") => {
    setMensagem({ texto, tipo })
    setTimeout(() => setMensagem(null), 3000)
  }

  const carregarFerragens = useCallback(async () => {
    const { data, error } = await supabase.from("ferragens").select("*").order("codigo", { ascending: true })
    if (error) console.error("Erro ao carregar ferragens:", error)
    else setFerragens((data as Ferragem[]) || [])
  }, [])

  useEffect(() => {
    carregarFerragens();
  }, [carregarFerragens]);

  // --- ESC PARA FECHAR MODAIS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMostrarModal(false)
        setModalDeletar(null)
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const confirmarDelecao = async () => {
    if (!modalDeletar) return
    const { id } = modalDeletar
    const { error } = await supabase.from("ferragens").delete().eq("id", id)
    if (error) exibirMensagem("Erro ao excluir ferragem: " + error.message, "erro")
    else {
      setFerragens(prev => prev.filter(f => f.id !== id))
      exibirMensagem("Ferragem excluída com sucesso!")
    }
    setModalDeletar(null)
  }

  // --- EXPORTAR CSV ---
  const exportarCSV = () => {
    if (!ferragens.length) return;
    const headers = ["Código", "Nome", "Cores", "Preço", "Categoria", "Código Interno"];
    const rows = ferragens.map(f => [f.codigo, f.nome, f.cores, f.preco, f.categoria, f.codigo_interno]);
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
    reader.onload = async (e) => {
      let text = e.target?.result as string;
      const linhas = text.split(/\r?\n/).filter(l => l.trim() !== "");
      linhas.shift();
      for (const linha of linhas) {
        const [codigo, nome, cores, preco, categoria] = linha.split(";");
        let precoLimpo = preco?.trim().replace(",", ".") || "0";
        await supabase.from("ferragens").insert([{
          codigo: codigo?.trim() || "",
          nome: padronizarTexto(nome || ""),
          cores: padronizarTexto(cores || ""),
          preco: isNaN(parseFloat(precoLimpo)) ? "0.00" : parseFloat(precoLimpo).toFixed(2),
          categoria: padronizarTexto(categoria || ""),
          codigo_interno: crypto.randomUUID()
        }]);
      }
      carregarFerragens();
      exibirMensagem("Importação concluída!");
    };
    reader.readAsText(file);
  };

  // --- SALVAR ---
  const salvarFerragem = async () => {
    if (!novoItem.codigo.trim() || !novoItem.nome.trim()) {
      exibirMensagem("Código e Nome são obrigatórios.", "erro")
      return
    }
    setCarregando(true)

    let precoFormatado = novoItem.preco.toString().replace(",", ".")
    novoItem.preco = isNaN(Number(precoFormatado)) ? "0.00" : Number(precoFormatado).toFixed(2)

    if (editando) {
      const { error } = await supabase.from("ferragens").update(novoItem).eq("id", editando.id)
      setCarregando(false)
      if (error) { exibirMensagem("Erro ao atualizar: " + error.message, "erro"); return }
    } else {
      if (!novoItem.codigo_interno) novoItem.codigo_interno = crypto.randomUUID()
      const { error } = await supabase.from("ferragens").insert([novoItem])
      setCarregando(false)
      if (error) { exibirMensagem("Erro ao salvar: " + error.message, "erro"); return }
    }
    setNovoItem({ codigo: "", nome: "", preco: "", categoria: "", cores: "", codigo_interno: "" })
    setEditando(null)
    setMostrarModal(false)
    carregarFerragens()
    exibirMensagem("Operação realizada!")
  }

  // --- AÇÕES ---
  const editarFerragem = (item: Ferragem) => {
    setEditando(item)
    setNovoItem({ ...item })
    setMostrarModal(true)
  }

  const pedirDelecao = (item: Ferragem) => {
    setModalDeletar({ id: item.id, nome: item.nome })
  }

  const duplicarFerragem = (item: Ferragem) => {
    setEditando(null)
    setNovoItem({
      codigo: item.codigo,
      nome: item.nome,
      preco: item.preco,
      categoria: item.categoria,
      cores: "",
      codigo_interno: crypto.randomUUID(),
    })
    setMostrarModal(true)
  }

  // --- FILTROS (Lógica) ---
  const ferragensFiltradas = ferragens.filter(f =>
    f.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
    f.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()) &&
    f.cores.toLowerCase().includes(filtroCores.toLowerCase()) &&
    f.codigo.toLowerCase().includes(filtroCodigo.toLowerCase()) // 🔥 Filtro por código
  )

  const totalFerragens = ferragens.length
  const comPreco = ferragens.filter(f => Number(f.preco) > 0).length
  const categoriasDistintas = new Set(ferragens.map(f => f.categoria).filter(Boolean)).size
  const coresDistintas = new Set(ferragens.map(f => f.cores).filter(Boolean)).size

  function abrirModalNovo() {
    setEditando(null)
    setNovoItem({ codigo: "", nome: "", preco: "", categoria: "", cores: "", codigo_interno: "" })
    setMostrarModal(true)
  }
  const padronizarTexto = (texto: string) => {
    return texto.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()).trim()
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      {mensagem && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold z-50 shadow-lg`}
          style={{ backgroundColor: mensagem.tipo === "sucesso" ? theme.success : theme.error, color: "#FFF" }}>
          {mensagem.texto}
        </div>
      )}

      {/* BARRA DO TOPO */}
      <div className="flex justify-between items-center mb-6 mt-2 px-2">
        <button onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          <Home className="w-5 h-5 text-white" />
          Home
        </button>

        <div className="flex gap-2">
          <button onClick={exportarCSV} className="p-2 rounded-full shadow-sm hover:bg-gray-100 transition" title="Exportar CSV">
            <Download className="w-5 h-5 text-gray-600" />
          </button>
          <label htmlFor="importarCSV" className="p-2 rounded-full shadow-sm cursor-pointer hover:bg-gray-100 transition" title="Importar CSV">
            <Upload className="w-5 h-5 text-gray-600" />
          </label>
          <input type="file" id="importarCSV" accept=".csv" className="hidden" onChange={importarCSV} />
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
        {/* 🔥 Input de código adicionado */}
        <input type="text" placeholder="Código" value={filtroCodigo} onChange={e => setFiltroCodigo(e.target.value)} className="p-2 rounded border w-32" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Categoria" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Cores" value={filtroCores} onChange={e => setFiltroCores(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md bg-white">
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
                <td className="p-3 font-mono">{item.codigo}</td>
                <td className="p-3">{item.nome}</td>
                <td className="p-3">{item.cores}</td>
                <td className="p-3 font-semibold">{Number(item.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-3">{item.categoria}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarFerragem(item)} className="p-2 rounded-lg hover:bg-gray-100" title="Editar">
                    <Edit3 className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={() => duplicarFerragem(item)} className="p-2 rounded-lg hover:bg-gray-100" title="Duplicar">
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={() => pedirDelecao(item)} className="p-2 rounded-lg hover:bg-gray-100" title="Deletar">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Cadastro/Edição Melhorado 🔥 */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">

          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Package className="text-[#92D050]" size={24} />
                {editando ? "Editar Ferragem" : "Nova Ferragem"}
              </h2>

              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <div className="grid grid-cols-2 gap-4">

              <input
                type="text"
                autoFocus
                placeholder="Código *"
                value={novoItem.codigo}
                onChange={e => setNovoItem({ ...novoItem, codigo: e.target.value })}
                className="p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#92D050] outline-none"
              />

              <input
                type="text"
                placeholder="Preço (ex: 10,50)"
                value={novoItem.preco}
                onChange={e => setNovoItem({ ...novoItem, preco: e.target.value })}
                className="p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#92D050] outline-none"
              />

              <input
                type="text"
                placeholder="Nome *"
                value={novoItem.nome}
                onChange={e => setNovoItem({ ...novoItem, nome: padronizarTexto(e.target.value) })}
                className="col-span-2 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#92D050] outline-none"
              />

              <input
                type="text"
                placeholder="Cores"
                value={novoItem.cores}
                onChange={e => setNovoItem({ ...novoItem, cores: padronizarTexto(e.target.value) })}
                className="p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#92D050] outline-none"
              />

              <input
                type="text"
                placeholder="Categoria"
                value={novoItem.categoria}
                onChange={e => setNovoItem({ ...novoItem, categoria: padronizarTexto(e.target.value) })}
                className="p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#92D050] outline-none"
              />

              <input
                type="text"
                placeholder="Código Interno"
                value={novoItem.codigo_interno || ""}
                onChange={e => setNovoItem({ ...novoItem, codigo_interno: e.target.value })}
                className="col-span-2 p-3 rounded-xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-[#92D050] outline-none"
              />
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>

              <button
                onClick={salvarFerragem}
                disabled={carregando}
                className="px-6 py-2.5 rounded-xl font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
              </button>
            </div>

          </div>
        </div>
      )}


      {/* Modal Deletar 🔥 */}
      {modalDeletar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">

          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <Trash2 className="text-red-500" size={22} />
                Confirmar Exclusão
              </h3>

              <button
                onClick={() => setModalDeletar(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {/* MENSAGEM */}
            <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
              Deseja realmente excluir <span className="font-bold">{modalDeletar.nome}</span>?
              <br />
              Esta ação não poderá ser desfeita.
            </p>

            {/* BOTÕES */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalDeletar(null)}
                className="px-6 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarDelecao}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                Sim, excluir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}