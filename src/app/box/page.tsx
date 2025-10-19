"use client"

import { useEffect, useState } from "react"

type BoxLinha = {
  largura: number
  altura: number
  quantidade: number
  alturaTipo: "Padrão" | "Até o teto"
  corKit: "Branco" | "Preto" | "Fosco" | "Dourado" | "Cromado" | "Rosê"
  puxador: string
  kit: "Kit Simples" | "Kit Quadrado"
  larguraFixa: number
  alturaFixa: number
  larguraMovel: number
  alturaMovel: number
}

const arredondar5mm = (valor: number) => Math.ceil(valor / 5) * 5

export default function BoxPage() {
  const [boxList, setBoxList] = useState<BoxLinha[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("boxList")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  const [novoBox, setNovoBox] = useState<Omit<BoxLinha, "larguraFixa" | "alturaFixa" | "larguraMovel" | "alturaMovel">>({
    largura: 0,
    altura: 0,
    quantidade: 1,
    alturaTipo: "Padrão",
    corKit: "Branco",
    puxador: "Simples",
    kit: "Kit Simples"
  })

  // salvar no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("boxList", JSON.stringify(boxList))
    }
  }, [boxList])

  const adicionarBox = () => {
    const { largura, altura, alturaTipo } = novoBox
    if (!largura || !altura) {
      alert("Informe largura e altura")
      return
    }

    // Calcular vidros
    let alturaFixa = alturaTipo === "Padrão" ? altura - 35 : altura - 55
    let larguraFixa = arredondar5mm(largura / 2)

    let larguraMovel = larguraFixa + 50
    let alturaMovel = alturaTipo === "Padrão" ? altura : altura - 20

    const item: BoxLinha = {
      ...novoBox,
      larguraFixa,
      alturaFixa,
      larguraMovel,
      alturaMovel
    }

    setBoxList(prev => [...prev, item])
    setNovoBox(prev => ({ ...prev, largura: 0, altura: 0, quantidade: 1 }))
  }

  const novoOrcamento = () => {
    if (!confirm("Deseja iniciar um novo orçamento?")) return
    setBoxList([])
    localStorage.removeItem("boxList")
  }

  const imagemPuxador = (puxador: string) => {
    if (puxador === "Simples") return "/images/puxador-simples.png"
    return "/images/puxador-duplo.png"
  }

  return (
    <div className="min-h-screen p-6 bg-white text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Cálculo de Box Simples</h1>

      {/* Formulário */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <input
          type="number"
          placeholder="Largura (mm)"
          value={novoBox.largura}
          onChange={e => setNovoBox(prev => ({ ...prev, largura: Number(e.target.value) }))}
          className="p-2 rounded border border-gray-300"
        />
        <input
          type="number"
          placeholder="Altura (mm)"
          value={novoBox.altura}
          onChange={e => setNovoBox(prev => ({ ...prev, altura: Number(e.target.value) }))}
          className="p-2 rounded border border-gray-300"
        />
        <input
          type="number"
          placeholder="Quantidade"
          value={novoBox.quantidade}
          onChange={e => setNovoBox(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
          className="p-2 rounded border border-gray-300"
        />
        <select
          value={novoBox.alturaTipo}
          onChange={e => setNovoBox(prev => ({ ...prev, alturaTipo: e.target.value as any }))}
          className="p-2 rounded border border-gray-300"
        >
          <option value="Padrão">Padrão</option>
          <option value="Até o teto">Até o teto</option>
        </select>
        <select
          value={novoBox.corKit}
          onChange={e => setNovoBox(prev => ({ ...prev, corKit: e.target.value as any }))}
          className="p-2 rounded border border-gray-300"
        >
          <option value="Branco">Branco</option>
          <option value="Preto">Preto</option>
          <option value="Fosco">Fosco</option>
          <option value="Dourado">Dourado</option>
          <option value="Cromado">Cromado</option>
          <option value="Rosê">Rosê</option>
        </select>
      </div>

      {/* Kit e puxador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <select
          value={novoBox.kit}
          onChange={e => setNovoBox(prev => ({ ...prev, kit: e.target.value as any }))}
          className="p-2 rounded border border-gray-300"
        >
          <option value="Kit Simples">Kit Simples</option>
          <option value="Kit Quadrado">Kit Quadrado</option>
        </select>

        <select
          value={novoBox.puxador}
          onChange={e => setNovoBox(prev => ({ ...prev, puxador: e.target.value }))}
          className="p-2 rounded border border-gray-300"
        >
          <option value="Simples">Simples</option>
          <option value="Duplo">Duplo</option>
        </select>

        <div className="flex items-center justify-center">
          <img src={imagemPuxador(novoBox.puxador)} alt="Puxador" className="h-16" />
        </div>
      </div>

      <button
        onClick={adicionarBox}
        className="px-4 py-2 bg-green-500 text-white rounded mb-4"
      >
        Adicionar
      </button>

      <button
        onClick={novoOrcamento}
        className="px-4 py-2 bg-gray-400 text-white rounded mb-4 ml-2"
      >
        Novo Orçamento
      </button>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-2">Qtd</th>
              <th className="p-2">Largura Fixa</th>
              <th className="p-2">Altura Fixa</th>
              <th className="p-2">Largura Móvel</th>
              <th className="p-2">Altura Móvel</th>
              <th className="p-2">Kit</th>
              <th className="p-2">Cor</th>
              <th className="p-2">Puxador</th>
            </tr>
          </thead>
          <tbody>
            {boxList.map((b, i) => (
              <tr key={i} className="border-b border-gray-300">
                <td className="p-2">{b.quantidade}</td>
                <td className="p-2">{b.larguraFixa}</td>
                <td className="p-2">{b.alturaFixa}</td>
                <td className="p-2">{b.larguraMovel}</td>
                <td className="p-2">{b.alturaMovel}</td>
                <td className="p-2">{b.kit}</td>
                <td className="p-2">{b.corKit}</td>
                <td className="p-2">{b.puxador}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
