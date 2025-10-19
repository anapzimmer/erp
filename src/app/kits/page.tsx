"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home, Package, Layers, Palette, Upload, Download } from "lucide-react"

// Tipagem
type Kit = {
  id: number
  nome: string
  largura: number
  altura: number
  categoria: string
  cores: string
  preco_por_cor: string
}

// Tema
const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
  hover: "#F3F4F6",
}

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([])
  const [novoKit, setNovoKit] = useState<Omit<Kit, "id">>({
    nome: "",
    largura: 0,
    altura: 0,
    categoria: "",
    cores: "",
    preco_por_cor: "",
  })
  const [editando, setEditando] = useState<Kit | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarConfirm, setMostrarConfirm] = useState(false)

  

  // Mover os estados de alerta e confirm para o topo do componente
  const [modalAlerta, setModalAlerta] = useState<{ mensagem: string, tipo: "info" | "erro", callback?: () => void } | null>(null)
  const [modalConfirm, setModalConfirm] = useState<{
  mensagem: string,
  onConfirm: () => void,
  onCancel?: () => void
} | null>(null)


  // Alerta padrão do sistema
  const mostrarAlerta = (mensagem: string) => {
    setModalAlerta({ mensagem, tipo: "info" });
  }

  // Confirmação padrão do sistema
  const mostrarConfirmacao = (mensagem: string, onConfirm: () => void, onCancel?: () => void) => {
    setModalConfirm({ mensagem, onConfirm, onCancel: onCancel || (() => setMostrarConfirm(false)) });
  }

  // Exportar CSV
  const exportarCSV = () => {
    const csvHeader = ["Nome","Largura","Altura","Categoria","Cores","Preço"];
    const csvRows = kits.map(k => [k.nome, k.largura, k.altura, k.categoria, k.cores, k.preco_por_cor]);
    const csvContent = [csvHeader, ...csvRows].map(e => e.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "kits.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Importar CSV
  const importarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const linhas = text.split("\n").slice(1); // ignora header

      for (const linha of linhas) {
        if (!linha.trim()) continue;

        const cols = linha.split(";").map(c => c.trim());
        if (cols.length < 6) continue;

        const [nome, larguraStr, alturaStr, categoria, cores, precoStr] = cols;
        const largura = Number(larguraStr.replace(",", "."));
        const altura = Number(alturaStr.replace(",", "."));
        const preco = precoStr.replace(",", ".");

        const { data: existentes, error } = await supabase
          .from("kits")
          .select("*")
          .eq("nome", nome)
          .eq("largura", largura)
          .eq("altura", altura)
          .eq("categoria", categoria)
          .eq("cores", cores);

        if (error) { console.error(error); continue; }

        if (existentes?.length) {
          const kitExistente = existentes[0];
          if (kitExistente.preco_por_cor !== preco) {
            await supabase.from("kits").update({ preco_por_cor: preco }).eq("id", kitExistente.id);
          }
        } else {
          await supabase.from("kits").insert([{
            nome,
            largura,
            altura,
            categoria,
            cores,
            preco_por_cor: preco
          }]);
        }
      }

      await carregarKits();
    };

    reader.readAsText(file);
  }

  // Filtros
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroCor, setFiltroCor] = useState("")

  // Carregar Kits
  const carregarKits = async () => {
    const { data, error } = await supabase.from("kits").select("*").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar kits:", error)
    else setKits((data as Kit[]) || [])
  }

  // Permitir "Enter" para confirmar a exclusão no modal
useEffect(() => {
  carregarKits();
  if (!modalConfirm) return;

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      modalConfirm.onConfirm();
    }
  };

  window.addEventListener("keydown", handleEnter);

  return () => {
    window.removeEventListener("keydown", handleEnter);
  };
}, [modalConfirm]); // <- modalConfirm entra como dependência


  // KPIs
  const totalKits = kits.length
  const totalCategorias = new Set(kits.map(k => k.categoria)).size
  const totalCores = new Set(kits.map(k => k.cores)).size

  // Salvar
  const salvarKit = async () => {
    if (!novoKit.nome.trim()) { mostrarAlerta("Nome é obrigatório."); return; }
    if (!novoKit.largura || !novoKit.altura) { mostrarAlerta("Largura e Altura são obrigatórios."); return; }
    if (!novoKit.cores.trim()) { mostrarAlerta("Cor é obrigatória."); return; }
    if (!novoKit.preco_por_cor.trim()) { mostrarAlerta("Preço por cor é obrigatório."); return; }

    setCarregando(true)

    if (editando) {
      const { error } = await supabase.from("kits").update(novoKit).eq("id", editando.id)
      setCarregando(false)
      if (error) { alert("Erro ao atualizar kit: " + error.message); return }
      setEditando(null)
      setMostrarModal(false)
    } else {
      const kitParaSalvar = { ...novoKit, preco_por_cor: novoKit.preco_por_cor } // mantém string
      const { error } = await supabase.from("kits").insert([kitParaSalvar])
      setCarregando(false)
      if (error) { alert("Erro ao salvar kit: " + error.message); return; }
    }

    await carregarKits()
    setMostrarModal(false)
    setMostrarConfirm(true)
  }

  const confirmarNovoValor = (resposta: boolean) => {
    setMostrarConfirm(false)
    if (resposta) {
      setNovoKit({ nome: novoKit.nome, largura: novoKit.largura, altura: novoKit.altura, categoria: novoKit.categoria, cores: "", preco_por_cor: "" })
      setMostrarModal(true)
    } else {
      setNovoKit({ nome: "", largura: 0, altura: 0, categoria: "", cores: "", preco_por_cor: "" })
    }
  }

  const editarKit = (kit: Kit) => {
    setEditando(kit)
    setNovoKit({ nome: kit.nome, largura: kit.largura, altura: kit.altura, categoria: kit.categoria, cores: kit.cores, preco_por_cor: kit.preco_por_cor })
    setMostrarModal(true)
    }

const deletarKit = (id: number) => {
  mostrarConfirmacao(
    "Tem certeza que deseja excluir este kit?",
    async () => {
      const { error } = await supabase.from("kits").delete().eq("id", id)
      if (error) mostrarAlerta("Erro ao excluir kit: " + error.message)
      else setKits(prev => prev.filter(k => k.id !== id))
      setModalConfirm(null) // fecha o modal após confirmação
    }
  )
}



  const kitsFiltrados = kits.filter(
    k => k.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
         k.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()) &&
         k.cores.toLowerCase().includes(filtroCor.toLowerCase())
  )
  return (
        <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
       <div className="mb-6 flex justify-between items-center">
  <button
    onClick={() => window.location.href = "/"}
    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
    style={{ backgroundColor: theme.secondary, color: theme.primary }}
  >
    <Home className="w-5 h-5" />
    Home
  </button>

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


      <h1 className="text-3xl font-bold mb-6 text-center">Gerenciar Kits</h1>

      {/* Cards informativos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="p-6 rounded-2xl shadow bg-white flex items-center gap-4">
          <Package className="w-10 h-10 text-[#92D050]" />
          <div>
            <p className="text-sm">Total de Kits</p>
            <h3 className="text-xl font-bold">{totalKits}</h3>
          </div>
        </div>
        <div className="p-6 rounded-2xl shadow bg-white flex items-center gap-4">
          <Layers className="w-10 h-10 text-[#92D050]" />
          <div>
            <p className="text-sm">Categorias distintas</p>
            <h3 className="text-xl font-bold">{totalCategorias}</h3>
          </div>
        </div>
        <div className="p-6 rounded-2xl shadow bg-white flex items-center gap-4">
          <Palette className="w-10 h-10 text-[#92D050]" />
          <div>
            <p className="text-sm">Cores distintas</p>
            <h3 className="text-xl font-bold">{totalCores}</h3>
          </div>
        </div>
      </div>

      {/* Botão Novo Kit */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => { setEditando(null); setNovoKit({ nome: "", largura: 0, altura: 0, categoria: "", cores: "", preco_por_cor: "" }); setMostrarModal(true) }}
          className="px-6 py-2 rounded-2xl font-bold shadow"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}
        >
          Novo Kit
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por categoria" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por cor" value={filtroCor} onChange={e => setFiltroCor(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Largura</th>
              <th className="p-3">Altura</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Cor</th>
              <th className="p-3">Preço</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {kitsFiltrados.map(kit => (
              <tr key={kit.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{kit.nome}</td>
                <td className="p-3">{kit.largura}</td>
                <td className="p-3">{kit.altura}</td>
                <td className="p-3">{kit.categoria}</td>
                <td className="p-3">{kit.cores}</td>
                <td className="p-3">{formatarPreco(Number(kit.preco_por_cor))}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarKit(kit)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
                  </button>
                  <button  onClick={() => deletarKit(kit.id)} className="p-1 rounded hover:bg-[#E5E7EB]"> <Image src="/icons/delete.png" alt="Deletar" width={20} height={20} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Novo/Editar Kit */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
          <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Kit" : "Novo Kit"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={novoKit.nome} onChange={e => setNovoKit({ ...novoKit, nome: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="number" placeholder="Largura *" value={novoKit.largura} onChange={e => setNovoKit({ ...novoKit, largura: Number(e.target.value) })} className="w-full p-2 rounded-lg border" />
              <input type="number" placeholder="Altura *" value={novoKit.altura} onChange={e => setNovoKit({ ...novoKit, altura: Number(e.target.value) })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Categoria" value={novoKit.categoria} onChange={e => setNovoKit({ ...novoKit, categoria: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Cor *" value={novoKit.cores} onChange={e => setNovoKit({ ...novoKit, cores: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Preço por cor *" value={novoKit.preco_por_cor} onChange={e => setNovoKit({ ...novoKit, preco_por_cor: e.target.value })} className="w-full p-2 rounded-lg border" />

              <div className="flex justify-between gap-3 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition">
                  Cancelar
                </button>
                <button onClick={salvarKit} disabled={carregando} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "#FFF" }}>
                  {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
{modalConfirm && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
    <div className="p-6 rounded-2xl shadow-lg w-full max-w-md bg-white">
      <h2 className="text-xl font-semibold mb-4">{modalConfirm.mensagem}</h2>
      <div className="flex justify-between mt-4 gap-3">
        <button
          onClick={() => modalConfirm.onCancel?.()}
          className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition"
        >
          Cancelar
        </button>
        <button
          onClick={() => modalConfirm.onConfirm()}
          className="flex-1 py-2 rounded-2xl font-semibold"
          style={{ backgroundColor: theme.secondary, color: "#FFF" }}
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}