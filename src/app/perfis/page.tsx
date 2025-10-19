"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home, Layers, Palette, Tag, Package, Copy } from "lucide-react"
import { Download, Upload } from "lucide-react";

type Perfil = {
  id: string // UUID gerado pelo Supabase
  codigo: string
  nome: string
  cores: string
  preco: number | null   // <- corrigido
  categoria: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
  hover: "#F3F4F6",
}

export default function PerfisPage() {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [novoPerfil, setNovoPerfil] = useState<Omit<Perfil, "id">>({
    codigo: "",
    nome: "",
    cores: "",
    preco: null,   // <- corrigido
    categoria: "",
  })
  const [editando, setEditando] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCor, setFiltroCor] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")

  const [mensagem, setMensagem] = useState<string>("")
  const [mostrarMensagem, setMostrarMensagem] = useState(false)
  const [precoTexto, setPrecoTexto] = useState("")

// Para controle do modal de confirmação
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [idParaDeletar, setIdParaDeletar] = useState<string | null>(null)

  const pedirConfirmacaoDeletar = (id: string) => {
  setIdParaDeletar(id)
  setMostrarConfirmacao(true)
}

const confirmarDeletar = async () => {
  if (!idParaDeletar) return

  const { error } = await supabase.from("perfis").delete().eq("id", idParaDeletar)
  if (error) {
    exibirMensagem("Erro ao excluir perfil: " + error.message)
  } else {
    setPerfis(prev => prev.filter(p => p.id !== idParaDeletar))
    exibirMensagem("Perfil excluído com sucesso!")
  }

  setMostrarConfirmacao(false)
  setIdParaDeletar(null)
}


  const exibirMensagem = (texto: string) => {
  setMensagem(texto)
  setMostrarMensagem(true)
  setTimeout(() => setMostrarMensagem(false), 4000) // fecha automático após 4s
}


// Adicione este useEffect dentro do componente PerfisPage
useEffect(() => {
  if (!mostrarConfirmacao) return;

  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      confirmarDeletar();
    }
  };

  window.addEventListener("keydown", handleEnter);

  return () => {
    window.removeEventListener("keydown", handleEnter);
  };
}, [mostrarConfirmacao]); // <- array de dependências consistente

  
  // --- CARREGAMENTO ---
  const carregarPerfis = async () => {
    const { data, error } = await supabase.from("perfis").select("*").order("codigo", { ascending: true })
    if (error) console.error("Erro ao carregar perfis:", error)
    else setPerfis((data as Perfil[]) || [])
  }

  useEffect(() => { carregarPerfis() }, [])
  

  // --- SALVAR ---
  const salvarPerfil = async () => {
if (!novoPerfil.codigo.trim()) { 
  exibirMensagem("Código é obrigatório."); 
  return; 
}

if (!novoPerfil.nome.trim()) { 
  exibirMensagem("Nome é obrigatório."); 
  return; 
}
    
    setCarregando(true)

    const perfilParaSalvar = { ...novoPerfil, preco: novoPerfil.preco ?? null }

    if (editando) {
      const { error } = await supabase.from("perfis").update(perfilParaSalvar).eq("id", editando.id)
      setCarregando(false)
      if (error) { exibirMensagem("Erro ao atualizar perfil: " + error.message); return }
    } else {
      // Inserção sem id, Supabase gera UUID
      const { error } = await supabase.from("perfis").insert([perfilParaSalvar])
      setCarregando(false)
      if (error) { exibirMensagem("Erro ao salvar perfil: " + error.message); return }
    }

    await carregarPerfis()
    setNovoPerfil({ codigo: "", nome: "", cores: "", preco: null, categoria: "" })
    setEditando(null)
    setMostrarModal(false)
  }

  // --- EDITAR ---
  const editarPerfil = (perfil: Perfil) => {
    setEditando(perfil)
    setNovoPerfil({ ...perfil })
    setMostrarModal(true)
  }

  // --- DELETAR ---
  const deletarPerfil = async (id: string) => {
  // Mostra alerta de confirmação no topo do sistema
  const confirmar = window.confirm("Tem certeza que deseja excluir?") // temporário, podemos trocar por modal
  if (!confirmar) return

  const { error } = await supabase.from("perfis").delete().eq("id", id)
  if (error) {
    exibirMensagem("Erro ao excluir perfil: " + error.message)
  } else {
    setPerfis(prev => prev.filter(p => p.id !== id))
    exibirMensagem("Perfil excluído com sucesso!")
  }
}


  // --- DUPLICAR ---
  const duplicarPerfil = (perfil: Perfil) => {
    setEditando(null)
    setNovoPerfil({
      codigo: perfil.codigo,
      nome: perfil.nome,
      cores: perfil.cores,
      preco: perfil.preco,
      categoria: perfil.categoria,
    })
    setMostrarModal(true)
  }

  // --- FILTROS ---
  const perfisFiltrados = perfis.filter(p =>
    p.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
    p.cores.toLowerCase().includes(filtroCor.toLowerCase()) &&
    p.categoria.toLowerCase().includes(filtroCategoria.toLowerCase())
  )

  // --- MÉTRICAS ---
  const totalPerfis = perfis.length
  const categoriasDistintas = Array.from(new Set(perfis.map(p => p.categoria).filter(Boolean))).length
  const coresDistintas = Array.from(new Set(perfis.map(p => p.cores).filter(Boolean))).length
  const comPreco = perfis.filter(p => p.preco !== null).length

// --- EXPORTAR CSV ---
const exportarCSV = () => {
  if (perfis.length === 0) {
    exibirMensagem("Não há perfis para exportar!");
    return;
  }

  const header = ["Código", "Nome", "Cores", "Preço", "Categoria"];

  const rows = perfis.map(p => [
    `"${p.codigo.replace(/"/g, '""')}"`,
    `"${p.nome.replace(/"/g, '""')}"`,
    `"${p.cores.replace(/"/g, '""')}"`,
    p.preco !== null && !isNaN(Number(p.preco)) 
  ? Number(p.preco).toFixed(2).replace(".", ",") 
  : "",
    `"${p.categoria.replace(/"/g, '""')}"`
  ]);

  // junta tudo usando ponto e vírgula como separador
  const csvContent = [header, ...rows].map(e => e.join(";")).join("\r\n");

  // cria o arquivo e força o download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "perfis.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


// --- IMPORTAR CSV ---
const importarCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    // Lê como ArrayBuffer
    const arrayBuffer = e.target?.result as ArrayBuffer;

    // Decodifica como Latin1 (ISO-8859-1) para lidar com acentos
    const decoder = new TextDecoder("iso-8859-1");
    const text = decoder.decode(arrayBuffer);

    const linhas = text.split(/\r?\n/).filter(l => l.trim() !== "");
    const [header, ...rows] = linhas;

    // Espera-se cabeçalho: Código;Nome;Cores;Preço;Categoria
    const novosPerfis: any[] = rows.map(linha => {
      const [codigo, nome, cores, preco, categoria] = linha
        .split(";")
        .map(c =>
          c
            .replace(/^"|"$/g, "")
            .trim()
            // Normaliza acentuação e caracteres especiais
            .normalize("NFC")
        );

      return {
        codigo,
        nome,
        cores,
        preco: preco ? parseFloat(preco.replace("R$", "").replace(",", ".")) : null,
        categoria,
      };
    });

    const perfisExistentes = [...perfis];
    const novosParaInserir: any[] = [];
    const paraAtualizar: any[] = [];

    novosPerfis.forEach(novo => {
      const existente = perfisExistentes.find(
        e =>
          e.codigo === novo.codigo &&
          e.nome === novo.nome &&
          e.cores === novo.cores
      );

      if (!existente) {
        novosParaInserir.push(novo);
      } else if (existente.preco !== novo.preco) {
        paraAtualizar.push({ ...existente, preco: novo.preco });
      }
    });

    if (novosParaInserir.length === 0 && paraAtualizar.length === 0) {
      exibirMensagem("Nenhuma mudança detectada. Todos os itens já estão atualizados!");
      return;
    }

    // Atualiza preços diferentes
    if (paraAtualizar.length > 0) {
      for (const item of paraAtualizar) {
        const { error } = await supabase
          .from("perfis")
          .update({ preco: item.preco })
          .eq("codigo", item.codigo)
          .eq("nome", item.nome)
          .eq("cores", item.cores);

        if (error) {
          exibirMensagem("Erro ao atualizar item: " + error.message);
          return;
        }
      }
    }

    // Insere novos itens
    if (novosParaInserir.length > 0) {
      const { error } = await supabase.from("perfis").insert(novosParaInserir);
      if (error) {
        exibirMensagem("Erro ao importar CSV: " + error.message);
        return;
      }
    }

    // Atualiza estado local
    const atualizados = perfis.map(e => {
      const alterado = paraAtualizar.find(
        p => p.codigo === e.codigo && p.nome === e.nome && p.cores === e.cores
      );
      return alterado ? { ...e, preco: alterado.preco } : e;
    });

    setPerfis([...atualizados, ...novosParaInserir]);

    exibirMensagem(
      `Importação concluída! 
      • ${novosParaInserir.length} novos itens adicionados 
      • ${paraAtualizar.length} preços atualizados`
    );
  };

  // Lê o arquivo como ArrayBuffer
  reader.readAsArrayBuffer(file);
};


  return (
    
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
      {mostrarMensagem && (
  <div
    className="fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-lg z-50"
    style={{ backgroundColor: theme.secondary, color: theme.primary }}
  >
    {mensagem}
  </div>
)}

{/* BARRA DO TOPO */}
<div className="flex justify-between items-center mb-6 mt-2 px-2">
  {/* Botão Home - esquerda */}
  <button
    onClick={() => window.location.href = "/"}
    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
    style={{ backgroundColor: theme.secondary, color: theme.primary }}
  >
    <Home className="w-5 h-5 text-white" />
    Home
  </button>

  {/* Botões de importação/exportação - direita */}
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


      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Perfis</h1>

      

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { titulo: "Total", valor: totalPerfis, icone: Layers },
          { titulo: "Com Preço", valor: comPreco, icone: Tag },
          { titulo: "Cores Distintas", valor: coresDistintas, icone: Palette },
          { titulo: "Categorias", valor: categoriasDistintas, icone: Package }
        ].map(card => (
          <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
            <card.icone className="w-6 h-6 mb-2 text-[#92D050]" />
            <h3 className="text-gray-500">{card.titulo}</h3>
            <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Botão Novo Perfil */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => { setEditando(null); setNovoPerfil({ codigo: "", nome: "", cores: "", preco: null, categoria: "" }); setMostrarModal(true) }}
          className="px-6 py-2 rounded-2xl font-bold shadow"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}>
          Novo Perfil
        </button> 
        
        </div>
       


      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por cor" value={filtroCor} onChange={e => setFiltroCor(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por categoria" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
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
     {perfisFiltrados.map((perfil, index) => (
  <tr
    key={perfil.id ?? `${perfil.nome}-${index}`}
    className="border-b hover:bg-[#f3f6f9]"
    style={{ borderColor: theme.border }}
  >
    <td className="p-3">{perfil.codigo}</td>
    <td className="p-3">{perfil.nome}</td>
    <td className="p-3">{perfil.cores}</td>
    <td className="p-3">
  {perfil.preco !== null && !isNaN(Number(perfil.preco))
    ? formatarPreco(Number(perfil.preco))
    : "-"}
</td>
    <td className="p-3">{perfil.categoria}</td>
    <td className="p-3 flex justify-center gap-2">
      <button
        onClick={() => editarPerfil(perfil)}
        className="p-1 rounded hover:bg-[#E5E7EB]"
      >
        <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
      </button>
      <button
        onClick={() => duplicarPerfil(perfil)}
        className="p-1 rounded hover:bg-[#E5E7EB]"
      >
        <Copy className="w-5 h-5 text-gray-500" />
      </button>
      <button 
  onClick={() => pedirConfirmacaoDeletar(perfil.id)} 
  className="p-1 rounded hover:bg-[#E5E7EB]"
>
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
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Perfil" : "Novo Perfil"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Código *" value={novoPerfil.codigo} onChange={e => setNovoPerfil({ ...novoPerfil, codigo: e.target.value.toUpperCase() })} className="w-full p-2 rounded-lg border"/>
              <input type="text" placeholder="Nome *" value={novoPerfil.nome} onChange={e => setNovoPerfil({ ...novoPerfil, nome: e.target.value })} className="w-full p-2 rounded-lg border" />
              <input type="text" placeholder="Cores" value={novoPerfil.cores} onChange={e => setNovoPerfil({ ...novoPerfil, cores: e.target.value })} className="w-full p-2 rounded-lg border" />
             <input type="number" placeholder="Preço" value={novoPerfil.preco !== null ? novoPerfil.preco : ""} onChange={e => {const valor = e.target.value.replace(",", ".");setNovoPerfil({ ...novoPerfil, preco: valor === "" ? null : Number(valor) })}}  className="w-full p-2 rounded-lg border"/>
              <input type="text" placeholder="Categoria" value={novoPerfil.categoria} onChange={e => setNovoPerfil({ ...novoPerfil, categoria: e.target.value })} className="w-full p-2 rounded-lg border" />
              <div className="flex justify-between gap-3 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition">
                  Cancelar
                </button>
                <button onClick={salvarPerfil} disabled={carregando} className="flex-1 py-2 rounded-2xl font-semibold" style={{ backgroundColor: theme.secondary, color: "#FFF" }}>
                  {carregando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarConfirmacao && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
    <div className="p-6 rounded-2xl shadow-lg w-full max-w-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-center">Confirmar Exclusão</h2>
      <p className="text-center mb-6">Tem certeza que deseja excluir este perfil?</p>
      <div className="flex justify-between gap-3">
        <button
          onClick={() => setMostrarConfirmacao(false)}
          className="flex-1 py-2 rounded-2xl font-semibold bg-gray-300 hover:opacity-90 transition"
        >
          Cancelar
        </button>
        <button
          onClick={confirmarDeletar}
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
