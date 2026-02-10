"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseClient"
import { formatarPreco } from "@/utils/formatarPreco"
import { Home, Box, Star, Tag, DollarSign, Upload, Download } from "lucide-react"


type Vidro = {
  id: number
  nome: string
  espessura: string
  tipo: string
  preco: number
}

// 1. TIPO ATUALIZADO PARA GRUPOS
type PrecoGrupo = {
  id: number
  vidro_id: number
  grupo_preco_id: number // Agora é ID do grupo
  preco: number
  grupo_nome?: string      // Nome do grupo para exibir no modal
}

type Grupo = {
  id: number
  nome: string
}

const theme = {
  primary: "#1C415B",
  secondary: "#92D050",
  text: "#1C415B",
  background: "#F9FAFB",
  border: "#F2F2F2",
  cardBg: "#FFFFFF",
}

const padronizarTexto = (texto: string) => {
  if (!texto) return ""
  const t = texto.trim().toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const padronizarEspessura = (valor: string) => {
  if (!valor) return ""
  const limpo = valor.replace(/\s/g, "").toLowerCase()
  const partes = limpo.split("+").map(p =>
    p.replace(/\D/g, "").padStart(2, "0")
  )
  const partesValidas = partes.filter(p => p !== "00")
  if (partesValidas.length === 0) return ""
  return partesValidas.join("+") + "mm"
}


export default function VidrosPage() {
  const [vidros, setVidros] = useState<Vidro[]>([])
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [idParaDeletar, setIdParaDeletar] = useState<number | null>(null)

  const [novoVidro, setNovoVidro] = useState<Omit<Vidro, "id">>({ nome: "", espessura: "", tipo: "", preco: 0 })
  const [editando, setEditando] = useState<Vidro | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  // 2. ESTADOS ATUALIZADOS PARA GRUPOS
  const [precosGruposModal, setPrecosGruposModal] = useState<PrecoGrupo[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])


  const pedirConfirmacaoDeletar = (id: number) => {
    setIdParaDeletar(id)
    setMostrarConfirmacao(true)
  }

  const confirmarDeletar = async () => {
    if (idParaDeletar !== null) {
      await deletarVidro(idParaDeletar)
      setIdParaDeletar(null)
      setMostrarConfirmacao(false)
    }
  }

  const mostrarAlerta = (mensagem: string) => {
    const alerta = document.createElement("div")
    alerta.textContent = mensagem
    alerta.style.position = "fixed"
    alerta.style.top = "20px"
    alerta.style.right = "20px"
    alerta.style.backgroundColor = theme.secondary
    alerta.style.color = theme.primary
    alerta.style.padding = "12px 20px"
    alerta.style.borderRadius = "12px"
    alerta.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
    alerta.style.zIndex = "9999"
    alerta.style.fontWeight = "bold"
    alerta.style.transition = "opacity 0.3s"
    alerta.style.opacity = "1"

    document.body.appendChild(alerta)

    setTimeout(() => {
      alerta.style.opacity = "0"
      setTimeout(() => alerta.remove(), 300)
    }, 3000)
  }

  // --- Exportar CSV ---
  const exportarCSV = () => {
    if (vidros.length === 0) {
      alert("Não há vidros para exportar!");
      return;
    }

    const header = ["Nome", "Espessura", "Tipo", "Preço"];
    const rows = vidros.map(v => [
      `"${v.nome.replace(/"/g, '""')}"`,
      `"${v.espessura.replace(/"/g, '""')}"`,
      `"${v.tipo.replace(/"/g, '""')}"`,
      v.preco.toFixed(2)
    ]);

    const csvContent = [header, ...rows].map(e => e.join(";")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "vidros.csv");
    link.click();
  };


  // --- Importar CSV ---
  const importarCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const linhas = text.split("\n").slice(1); // ignora cabeçalho

    const novosVidros: Omit<Vidro, "id">[] = linhas
      .map(linha => {
        const [nomeRaw, espRaw, tipoRaw, precoRaw] = linha.split(";").map(c => c?.trim());
        if (!nomeRaw) return null;

        const nome = padronizarTexto(nomeRaw.replace(/"/g, "").trim());
        const tipo = padronizarTexto(tipoRaw?.replace(/"/g, "").trim() || "");
        const espessura = padronizarEspessura(espRaw?.replace(/"/g, "").trim() || "");
        const preco = Number(precoRaw?.replace(",", ".").trim()) || 0;

        return { nome, espessura, tipo, preco };
      })
      .filter(Boolean) as Omit<Vidro, "id">[];

    let novosInseridos = 0;
    let atualizados = 0;

    for (const v of novosVidros) {
      // Busca vidro existente
      const { data: existente, error: erroBusca } = await supabase
        .from("vidros")
        .select("id, preco")
        .eq("nome", v.nome)
        .eq("espessura", v.espessura)
        .eq("tipo", v.tipo)
        .maybeSingle();

      if (erroBusca) {
        console.error("Erro ao buscar vidro:", erroBusca.message);
        continue;
      }

      if (!existente) {
        // 🔹 Não existe → insere
        const { error: erroInsert } = await supabase.from("vidros").insert(v);
        if (!erroInsert) novosInseridos++;
      } else if (existente.preco !== v.preco) {
        // 🔹 Existe mas preço diferente → atualiza apenas o preço
        const { error: erroUpdate } = await supabase
          .from("vidros")
          .update({ preco: v.preco })
          .eq("id", existente.id);

        if (!erroUpdate) atualizados++;
      }
      // 🔸 Se for igual, ignora
    }

    await carregarVidros();

    mostrarAlerta(
      `Importação concluída!\n${novosInseridos} novos itens adicionados e ${atualizados} preços atualizados.`
    );
  };

  // filtros
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroEspessura, setFiltroEspessura] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")

  // --- Carregar dados ---
  const carregarVidros = async () => {
    const { data, error } = await supabase.from("vidros").select("*").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar vidros:", error)
    else
      setVidros(
        (data as Vidro[]).map(v => ({
          ...v,
          preco: Number((v.preco ?? 0).toString().replace(",", ".")) || 0
        })) || []
      )
  }

  // 3. CARREGAR GRUPOS NO LUGAR DE CLIENTES
  const carregarGrupos = async () => {
    const { data, error } = await supabase.from("tabelas").select("id, nome").order("nome", { ascending: true })
    if (error) console.error("Erro ao carregar grupos:", error)
    else setGrupos(data || [])
  }

  useEffect(() => {
    carregarVidros()
    carregarGrupos()
  }, [])

  // --- Cards ---
  const calcularPrecoMedio = () => {
    if (vidros.length === 0) return "R$ 0,00"
    const total = vidros.reduce((acc, v) => acc + v.preco, 0)
    return formatarPreco(total / vidros.length)
  }

  const getMaisProcurados = () => vidros.slice(0, 1).map(v => v.nome).join(", ") || "-"
  const contarPrecoEspecial = () => precosGruposModal.filter(p => !isNaN(p.preco) && p.preco > 0).length

  // --- CRUD ---
  const abrirModalNovoVidro = () => {
    setEditando(null)
    setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 })
    setPrecosGruposModal([])
    setMostrarModal(true)
  }

  const editarVidro = async (vidro: Vidro) => {
    setEditando(vidro)
    setNovoVidro({ ...vidro })

    // 4. BUSCAR PREÇOS POR GRUPO NO MODAL
    const { data } = await supabase
      .from("vidro_precos_grupos")
      .select("*, grupo:tabelas(nome)")
      .eq("vidro_id", vidro.id)

    const precosFormatados = (data || []).map((p: any) => ({
      id: p.id,
      vidro_id: p.vidro_id,
      grupo_preco_id: p.grupo_preco_id,
      preco: Number(p.preco) || 0,
      grupo_nome: p.grupo?.nome || ""
    }))

    setPrecosGruposModal(precosFormatados)
    setMostrarModal(true)
  }

  const salvarVidro = async () => {
    if (!novoVidro.nome.trim()) { mostrarAlerta("Nome é obrigatório."); return }
    if (!novoVidro.espessura.trim()) { mostrarAlerta("Espessura é obrigatória."); return }
    if (!novoVidro.tipo.trim()) { mostrarAlerta("Tipo é obrigatória."); return }

    setCarregando(true)
    let vidroId = editando?.id

    const vidroPadronizado = {
      ...novoVidro,
      nome: padronizarTexto(novoVidro.nome),
      tipo: padronizarTexto(novoVidro.tipo),
      espessura: padronizarEspessura(novoVidro.espessura)
    }

    if (editando) {
      const { error } = await supabase
        .from("vidros")
        .update(vidroPadronizado)
        .eq("id", editando.id)

    } else {
      const { data, error } = await supabase
        .from("vidros")
        .insert([vidroPadronizado])
        .select()
        .single()
      if (error) { setCarregando(false); mostrarAlerta("Erro ao salvar vidro: " + error.message); return }
      vidroId = data.id
    }


    // 5. ATUALIZAR LÓGICA DE SALVAR PREÇOS NO SUPABASE
    const { data: precosOriginais } = await supabase
      .from("vidro_precos_grupos")
      .select("id")
      .eq("vidro_id", vidroId)

    const idsOriginais = precosOriginais?.map(p => p.id) || []
    const idsAtuais = precosGruposModal.filter(p => p.id).map(p => p.id)

    // 🔹 Excluir do banco os preços removidos no modal
    const idsParaExcluir = idsOriginais.filter(id => !idsAtuais.includes(id))
    if (idsParaExcluir.length > 0) {
      const { error: erroDelete } = await supabase
        .from("vidro_precos_grupos")
        .delete()
        .in("id", idsParaExcluir)

      if (erroDelete) {
        console.error("Erro ao excluir preços removidos:", erroDelete.message)
      }
    }

    // 🔹 Inserir ou atualizar os preços existentes
    for (const p of precosGruposModal) {
      if (!p.grupo_preco_id || isNaN(p.preco)) continue
      if (p.id && p.id !== 0) {
        await supabase.from("vidro_precos_grupos").update({ preco: p.preco }).eq("id", p.id)
      } else {
        await supabase.from("vidro_precos_grupos").insert([{
          vidro_id: vidroId,
          grupo_preco_id: p.grupo_preco_id,
          preco: p.preco
        }])
      }
    }

    setNovoVidro({ nome: "", espessura: "", tipo: "", preco: 0 })
    setEditando(null)
    setPrecosGruposModal([])
    setMostrarModal(false)
    setCarregando(false)
    carregarVidros()
    mostrarAlerta("Vidro atualizado com sucesso!")
  }

  const deletarVidro = async (id: number) => {
    // 1. Excluir os preços especiais na tabela 'vidro_precos_grupos'
    const { error: erroPrecos } = await supabase
      .from("vidro_precos_grupos")
      .delete()
      .eq("vidro_id", id)

    if (erroPrecos) {
      console.error("Erro ao excluir preços especiais:", erroPrecos.message)
      mostrarAlerta("Erro ao excluir preços especiais: " + erroPrecos.message)
      return
    }

    // 2. Excluir o vidro na tabela 'vidros'
    const { error } = await supabase.from("vidros").delete().eq("id", id)

    if (error) {
      alert("Erro ao excluir vidro: " + error.message)
    } else {
      // Se a exclusão for bem-sucedida, atualiza o estado
      setVidros(prev => prev.filter(v => v.id !== id))
      mostrarAlerta("Vidro e preços especiais excluídos com sucesso!")
    }
  }

  const vidrosFiltrados = vidros.filter(
    v =>
      v.nome.toLowerCase().includes(filtroNome.toLowerCase()) &&
      v.espessura.toLowerCase().includes(filtroEspessura.toLowerCase()) &&
      v.tipo.toLowerCase().includes(filtroTipo.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background, color: theme.text }}>

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

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard de Vidros</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 mb-5">
        {[
          { titulo: "Total de Vidros", valor: vidros.length, icone: Box },
          { titulo: "Mais Procurado", valor: getMaisProcurados(), icone: Star },
          { titulo: "Preço Médio", valor: calcularPrecoMedio(), icone: DollarSign },
          { titulo: "Grupos Especiais", valor: contarPrecoEspecial(), icone: Tag }
        ]
          .map(card => (
            <div key={card.titulo} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center justify-center">
              <card.icone className="w-6 h-6 mb-2 text-[#1C415B]" />
              <h3 className="text-gray-500">{card.titulo}</h3>
              <p className="text-2xl font-bold text-[#1C415B]">{card.valor}</p>
            </div>
          ))}
      </div>

      {/* Novo Vidro */}
      <div className="flex justify-center gap-2 mb-4">
        {/* Botão Novo Vidro */}
        <button
          onClick={abrirModalNovoVidro}
          className="px-6 py-2 rounded-2xl font-bold shadow print:hidden"
          style={{ backgroundColor: theme.secondary, color: theme.primary }}
        >
          Novo Vidro
        </button>
      </div>


      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 print:hidden">
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por espessura" value={filtroEspessura} onChange={e => setFiltroEspessura(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
        <input type="text" placeholder="Filtrar por tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 rounded border" style={{ borderColor: theme.border }} />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="w-full text-left border-collapse">
          <thead style={{ backgroundColor: theme.primary, color: "#FFF" }}>
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Espessura</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Preço</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vidrosFiltrados.map(v => (
              <tr key={v.id} className="border-b hover:bg-[#f3f6f9]" style={{ borderColor: theme.border }}>
                <td className="p-3">{v.nome}</td>
                <td className="p-3">{v.espessura}</td>
                <td className="p-3">{v.tipo}</td>
                <td className="p-3">{formatarPreco(v.preco)}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => editarVidro(v)} className="p-1 rounded hover:bg-[#E5E7EB]">
                    <Image src="/icons/editar.png" alt="Editar" width={20} height={20} />
                  </button>
                  <button onClick={() => pedirConfirmacaoDeletar(v.id)} className="p-1 rounded hover:bg-[#E5E7EB]">  <Image src="/icons/delete.png" alt="Deletar" width={20} height={20} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 px-4">
          <div className="p-6 rounded-2xl shadow-md w-full max-w-md bg-white border" style={{ borderColor: theme.border }}>
            <h2 className="text-xl font-semibold mb-4">{editando ? "Editar Vidro" : "Novo Vidro"}</h2>

            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={novoVidro.nome} onChange={e => setNovoVidro({ ...novoVidro, nome: padronizarTexto(e.target.value) })} className="w-full p-2 rounded border" style={{ borderColor: theme.border }} />
              <input type="text" placeholder="Espessura *" value={novoVidro.espessura} onChange={e => setNovoVidro({ ...novoVidro, espessura: padronizarEspessura(e.target.value) })} className="w-full p-2 rounded border" style={{ borderColor: theme.border }} />
              <input type="text" placeholder="Tipo *" value={novoVidro.tipo} onChange={e => setNovoVidro({ ...novoVidro, tipo: padronizarTexto(e.target.value) })} className="w-full p-2 rounded border" style={{ borderColor: theme.border }} />
              <input type="number" min={0} placeholder="Preço Base" value={novoVidro.preco} onChange={e => setNovoVidro({ ...novoVidro, preco: Number(e.target.value) })} className="w-full p-2 rounded border" style={{ borderColor: theme.border }} />
              
              {/* Preços por Grupo */}
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Preços por Grupo</h3>
                {precosGruposModal.map((p, index) => (
                  <div key={index} className="flex gap-2 mb-2">
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
                      className="p-2 rounded border flex-1"
                      placeholder="Nome do Grupo"
                    />
                    <datalist id="listaGrupos">
                      {grupos.map(g => (
                        <option key={g.id} value={g.nome} />
                      ))}
                    </datalist>

                    <input
                      type="number"
                      placeholder="Preço"
                      value={p.preco}
                      onChange={e => {
                        const novos = [...precosGruposModal]
                        novos[index].preco = Number(e.target.value)
                        setPrecosGruposModal(novos)
                      }}
                      className="p-2 rounded border w-32"
                    />
                    <button onClick={() => setPrecosGruposModal(precosGruposModal.filter((_, i) => i !== index))} className="bg-red-500 text-white px-2 rounded">X</button>
                  </div>
                ))}
                <button onClick={() => setPrecosGruposModal([...precosGruposModal, { id: 0, vidro_id: editando?.id || 0, grupo_preco_id: 0, preco: 0, grupo_nome: "" }])} className="px-2 py-1 bg-[#92D050] text-white rounded">+ Adicionar preço</button>
              </div>

              <div className="flex justify-between gap-2 mt-4">
                <button onClick={() => setMostrarModal(false)} className="flex-1 py-2 rounded-2xl font-bold" style={{ backgroundColor: theme.primary, color: "#FFF" }}>Cancelar</button>
                <button onClick={salvarVidro} disabled={carregando} className="flex-1 py-2 rounded-2xl font-bold" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
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
            <p className="text-center mb-6">Tem certeza que deseja excluir este vidro?</p>
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