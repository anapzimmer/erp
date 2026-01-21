    "use client"
    import { useState, useEffect, useRef } from 'react'
    import { supabase } from "@/lib/supabaseClient"
    import { Trash2, Home, UserPlus, ImageIcon, Search, Printer, Plus, X } from "lucide-react"

    export default function CalculoJanelas() {
    const [vidros, setVidros] = useState<any[]>([])
    const [clientes, setClientes] = useState<any[]>([])
    const [adicionaisDB, setAdicionaisDB] = useState<any[]>([])
    const [itens, setItens] = useState<any[]>([])
    
    const [adicionaisPendentes, setAdicionaisPendentes] = useState<any[]>([])
    
    const [buscaCliente, setBuscaCliente] = useState("")
    const [mostrarClientes, setMostrarClientes] = useState(false)
    const [clienteIndex, setClienteIndex] = useState(-1)

    const [buscaVidro, setBuscaVidro] = useState("")
    const [mostrarVidros, setMostrarVidros] = useState(false)
    const [vidroIndex, setVidroIndex] = useState(-1)
    const [vidroSel, setVidroSel] = useState<any>(null)

    const [buscaAdicional, setBuscaAdicional] = useState("")
    const [mostrarAdicionais, setMostrarAdicionais] = useState(false)
    const [adicionalIndex, setAdicionalIndex] = useState(-1)
    const [qtdAdicional, setQtdAdicional] = useState("1")
    const [valorUnitAdicional, setValorUnitAdicional] = useState("0,00")

    const [modelo, setModelo] = useState("Escolher Tipo")
    const [folhas, setFolhas] = useState("Escolher Folhas")
    const [trinco, setTrinco] = useState("Escolher trinco")
    const [corKit, setCorKit] = useState("Escolher cor perfil")
    const [tipoOrcamento, setTipoOrcamento] = useState("Escolher Kit ou Barra") 
    const [anguloCanto, setAnguloCanto] = useState("Padrão")
    
    const [larguraVao, setLarguraVao] = useState("")
    const [larguraVaoB, setLarguraVaoB] = useState("") 
    const [alturaVao, setAlturaVao] = useState("")
    const [alturaBandeira, setAlturaBandeira] = useState("")
    const [quantidade, setQuantidade] = useState("1")

    const modeloRef = useRef<HTMLSelectElement>(null)
    const larguraRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function load() {
        const { data: v } = await supabase.from('vidros').select('*')
        if (v) setVidros(v)
        const { data: c } = await supabase.from('clientes').select('*').order('nome', { ascending: true })
        if (c) setClientes(c)
        const { data: p } = await supabase.from('perfis').select('id, codigo, nome, preco, categoria, cores')
        const { data: f } = await supabase.from('ferragens').select('id, codigo, nome, preco, categoria, cores')
        setAdicionaisDB([...(p || []), ...(f || [])])
        }
        load()
    }, [])

    // Filtros para as buscas
    const clientesFiltrados = clientes.filter(c => c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()));
    const vidrosFiltrados = vidros.filter(v => v.nome?.toLowerCase().includes(buscaVidro.toLowerCase()));
    const adicionaisFiltrados = adicionaisDB.filter(a => 
        a.nome?.toLowerCase().includes(buscaAdicional.toLowerCase()) || 
        a.codigo?.toLowerCase().includes(buscaAdicional.toLowerCase())
    ).slice(0, 8);

    const arredondar5 = (medida: number) => Math.ceil(medida / 50) * 50;

    const calcularPrecoVidro = () => {
        if (!vidroSel || !larguraVao || !alturaVao) return 0;
        
        const L = parseFloat(larguraVao);
        const LB = parseFloat(larguraVaoB || "0");
        const LTOT = modelo === "Janela Canto" ? L + LB : L;
        const A = parseFloat(alturaVao);
        const AB = parseFloat(alturaBandeira || "0");
        const precoM2 = typeof vidroSel.preco === 'string' ? parseFloat(vidroSel.preco.replace(',', '.')) : vidroSel.preco;
        
        let areaTotal = 0;

        if (folhas === "2 folhas") {
        const fixoL = LTOT / 2;
        const fixoA = A - 65;
        const movelL = fixoL + 50;
        const movelA = A - 25;
        areaTotal += (arredondar5(fixoL) * arredondar5(fixoA)) / 1000000;
        areaTotal += (arredondar5(movelL) * arredondar5(movelA)) / 1000000;
        } 
        else if (folhas === "4 folhas" || modelo === "Janela Canto") {
        const altJanela = modelo === "Janela Bandeira" ? (A - AB) : A;
        const fixoL = LTOT / 4;
        const fixoA = altJanela - 65;
        const movelL = fixoL + 50;
        const movelA = altJanela - 25;
        areaTotal += ((arredondar5(fixoL) * arredondar5(fixoA)) / 1000000) * 2;
        areaTotal += ((arredondar5(movelL) * arredondar5(movelA)) / 1000000) * 2;

        if (modelo === "Janela Bandeira" && AB > 0) {
            const bandL = L / 2;
            areaTotal += ((arredondar5(bandL) * arredondar5(AB)) / 1000000) * 2;
        }
        }
        return areaTotal * precoM2;
    };

    const imgPath = ((): string => {
        if (modelo.includes("Escolher") || folhas.includes("Escolher") || trinco.includes("Escolher")) return "";
        const t = trinco === "Com trinco" ? "c" : "s";
        const f = folhas === "2 folhas" ? "2fls" : "4fls";
        if (modelo === "Janela Padrão") return `/desenhos/janela-${t}-trinco-${f}.png`;
        if (modelo === "Janela Bandeira") {
        const bType = trinco === "Com trinco" ? "bct" : "bst";
        return `/desenhos/janela-${bType}-trinco-${f}.png`;
        }
        if (modelo === "Janela Canto") {
        const cType = anguloCanto === "90°" ? "canto90" : "canto";
        const tSuffix = trinco === "Com trinco" ? "ct" : "st";
        return `/desenhos/janela-${cType}-${tSuffix}.png`;
        }
        return "";
    })();

    const adicionarItem = () => {
        if (!larguraVao || !alturaVao || !vidroSel || modelo.includes("Escolher")) return;
        
        let descMedida = `${larguraVao}x${alturaVao}`;
        let descComplemento = "";
        if (modelo === "Janela Canto") {
            descMedida = `${larguraVao}+${larguraVaoB}x${alturaVao}`;
            descComplemento = ` (${anguloCanto})`;
        }
        if (modelo === "Janela Bandeira") descMedida = `${larguraVao}x${alturaVao}+${alturaBandeira}`;

        const valorVidroTotal = calcularPrecoVidro() * parseFloat(quantidade);
        const valorAdicionais = adicionaisPendentes.reduce((acc, adic) => {
        const v = parseFloat(adic.valor.toString().replace(',', '.'));
        return acc + (v * parseFloat(adic.qtd));
        }, 0) * parseFloat(quantidade);

        const novoItem = {
        id: Date.now(),
        descricao: `${modelo} ${folhas} ${trinco}${descComplemento}`,
        vidroInfo: buscaVidro,
        adicionais: [...adicionaisPendentes], 
        medidaVao: descMedida,
        quantidade,
        imagem: imgPath,
        total: valorVidroTotal + valorAdicionais 
        };

        setItens([...itens, novoItem]);
        setLarguraVao(""); setLarguraVaoB(""); setAlturaVao(""); setAlturaBandeira("");
        setAdicionaisPendentes([]); 
        larguraRef.current?.focus();
    };

    const focusClass = "focus:ring-1 focus:ring-[#92D050] focus:border-[#92D050] outline-none transition-all font-normal";

    const handleNovo = () => {
  // Cliente
  setBuscaCliente("")
  setMostrarClientes(false)
  setClienteIndex(-1)

  // Vidro
  setBuscaVidro("")
  setVidroSel(null)
  setMostrarVidros(false)
  setVidroIndex(-1)

  // Configurações
  setModelo("Escolher Tipo")
  setFolhas("Escolher Folhas")
  setTrinco("Escolher trinco")
  setCorKit("Escolher cor perfil")
  setTipoOrcamento("Escolher Kit ou Barra")
  setAnguloCanto("Padrão")

  // Medidas
  setLarguraVao("")
  setLarguraVaoB("")
  setAlturaVao("")
  setAlturaBandeira("")
  setQuantidade("1")

  // Adicionais
  setBuscaAdicional("")
  setMostrarAdicionais(false)
  setAdicionalIndex(-1)
  setQtdAdicional("1")
  setValorUnitAdicional("0,00")
  setAdicionaisPendentes([])

  // Foco inicial
  larguraRef.current?.focus()
}

    return (
        <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans text-[#1C415B]">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-[#92D050] rounded-lg shadow-sm"><Home className="text-white" size={24} /></div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">Cálculo de Janelas</h1>
            </div>
            <div className="flex gap-2">
            <button onClick={() => { 
                setItens([])
                handleNovo()
                }}className="px-4 py-2 border border-[#1C415B] rounded-xl text-sm font-semibold hover:bg-gray-50">Novo Orçamento</button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-[#1C415B] rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm"><Printer size={18} /> Gerar PDF</button>
            </div>
        </div>

        {/* CLIENTE */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4 relative">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Cliente:</span>
            <div className="relative w-96">
            <input tabIndex={1} type="text" className={`w-full py-1 text-sm border-b border-gray-200 bg-transparent px-2 ${focusClass}`} value={buscaCliente} placeholder="Pesquisar cliente..." 
                onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); setClienteIndex(-1); }}
                onKeyDown={(e) => {
                if (e.key === "ArrowDown") setClienteIndex(p => Math.min(p + 1, clientesFiltrados.length - 1));
                if (e.key === "ArrowUp") setClienteIndex(p => Math.max(p - 1, 0));
                if (e.key === "Enter") {
                    const sel = clienteIndex >= 0 ? clientesFiltrados[clienteIndex] : clientesFiltrados[0];
                    if (sel) { setBuscaCliente(sel.nome); setMostrarClientes(false); modeloRef.current?.focus(); }
                }
                }}
            />
            {mostrarClientes && buscaCliente && (
                <div className="absolute top-full w-full bg-white border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-2">
                {clientesFiltrados.map((c, i) => (
                    <div key={c.id} className={`px-4 py-2 text-xs cursor-pointer ${i === clienteIndex ? "bg-[#F4FFF0] text-[#1C415B] font-bold" : "hover:bg-gray-50"}`} onClick={() => { setBuscaCliente(c.nome); setMostrarClientes(false); modeloRef.current?.focus(); }}>{c.nome}</div>
                ))}
                </div>
            )}
            </div>
            <button className="p-2 bg-[#1C415B] text-white rounded-xl"><UserPlus size={20} /></button>
        </div>

        {/* BOX CONFIGURAÇÃO */}
<div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 mb-6 shadow-sm">
  <div className="grid grid-cols-12 gap-8">

    {/* ================= COLUNA ESQUERDA ================= */}
    <div className="col-span-10">

      <div className="grid grid-cols-4 gap-4">

        {/* 1️⃣ JANELA / FOLHAS / TRINCO */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-gray-300 uppercase">Janela</label>

          <select
            ref={modeloRef}
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={modelo}
            onChange={e => {
              setModelo(e.target.value)
              setLarguraVaoB("")
              setAlturaBandeira("")
            }}
          >
            <option>Escolher Tipo</option>
            <option value="Janela Padrão">Janela Padrão</option>
            <option value="Janela Canto">Janela Canto</option>
            <option value="Janela Bandeira">Janela Bandeira</option>
          </select>

          {modelo === "Janela Canto" && (
            <select
              className={`border border-[#92D050] rounded-xl p-2.5 text-sm ${focusClass}`}
              value={anguloCanto}
              onChange={e => setAnguloCanto(e.target.value)}
            >
              <option value="Padrão">Canto Padrão</option>
              <option value="90°">Canto 90°</option>
            </select>
          )}

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={folhas}
            onChange={e => setFolhas(e.target.value)}
          >
            <option>Escolher Folhas</option>
            <option value="2 folhas">2 Folhas</option>
            <option value="4 folhas">4 Folhas</option>
          </select>

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={trinco}
            onChange={e => setTrinco(e.target.value)}
          >
            <option>Escolher trinco</option>
            <option value="Sem trinco">Sem Trinco</option>
            <option value="Com trinco">Com Trinco</option>
          </select>
        </div>

        {/* 2️⃣ KIT / COR / VIDRO */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[10px] text-gray-300 uppercase">Kit / Vidro</label>

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={tipoOrcamento}
            onChange={e => setTipoOrcamento(e.target.value)}
          >
            <option>Escolher Kit ou Barra</option>
            <option value="Kit">Kit Pronto</option>
            <option value="Barra">Barra 6m</option>
          </select>

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={corKit}
            onChange={e => setCorKit(e.target.value)}
          >
            <option>Escolher cor perfil</option>
            <option>Branco</option>
            <option>Preto</option>
            <option>Fosco</option>
          </select>

          <div className="relative">
            <input
              type="text"
              className={`w-full border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
              value={buscaVidro}
              placeholder="Vidro..."
              onChange={e => {
                setBuscaVidro(e.target.value)
                setMostrarVidros(true)
                setVidroIndex(-1)
              }}
              onKeyDown={e => {
                if (e.key === "ArrowDown") setVidroIndex(p => Math.min(p + 1, vidrosFiltrados.length - 1))
                if (e.key === "ArrowUp") setVidroIndex(p => Math.max(p - 1, 0))
                if (e.key === "Enter") {
                  const v = vidroIndex >= 0 ? vidrosFiltrados[vidroIndex] : vidrosFiltrados[0]
                  if (v) {
                    setVidroSel(v)
                    setBuscaVidro(`${v.nome} ${v.espessura}mm ${v.tipo}`)
                    setMostrarVidros(false)
                  }
                }
              }}
            />

            {mostrarVidros && buscaVidro && (
              <div className="absolute top-full w-full bg-white border z-50 max-h-56 overflow-auto shadow-xl rounded-xl py-2">
                {vidrosFiltrados.map((v, i) => (
                  <div
                    key={v.id}
                    className={`px-4 py-2 text-xs cursor-pointer ${
                      i === vidroIndex ? "bg-[#F4FFF0]" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setVidroSel(v)
                      setBuscaVidro(`${v.nome} ${v.espessura}mm ${v.tipo}`)
                      setMostrarVidros(false)
                    }}
                  >
                    {v.nome} {v.espessura}mm {v.tipo}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3️⃣ MEDIDAS */}
        <div className="col-span-2 grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-300 uppercase">Largura</label>
            <input
              ref={larguraRef}
              type="number"
              className={`border border-gray-200 rounded-xl p-2.5 text-center ${focusClass}`}
              value={larguraVao}
              onChange={e => setLarguraVao(e.target.value)}
            />
          </div>

          {modelo === "Janela Canto" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-300 uppercase">Largura B</label>
              <input
                type="number"
                className={`border border-[#92D050] rounded-xl p-2.5 text-center ${focusClass}`}
                value={larguraVaoB}
                onChange={e => setLarguraVaoB(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-300 uppercase">Altura</label>
            <input
              type="number"
              className={`border border-gray-200 rounded-xl p-2.5 text-center ${focusClass}`}
              value={alturaVao}
              onChange={e => setAlturaVao(e.target.value)}
            />
          </div>

          {modelo === "Janela Bandeira" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-300 uppercase">Alt. Band.</label>
              <input
                type="number"
                className={`border border-[#92D050] rounded-xl p-2.5 text-center ${focusClass}`}
                value={alturaBandeira}
                onChange={e => setAlturaBandeira(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-300 uppercase">Qtd</label>
            <input
              type="number"
              className={`border border-gray-200 rounded-xl p-2.5 text-center ${focusClass}`}
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
            />
          </div>
        </div>

      </div>


                {/* ADICIONAIS */}
                <div className="mt-8 pt-4">
                    <div className="flex items-center gap-2 mb-2"><Plus size={14} className="text-[#92D050]" /><span className="text-[10px] font-black text-[#92D050] uppercase">Adicional (Ferragens/Perfis)</span></div>
                    <div className="grid grid-cols-12 gap-4 mb-3">
                    <div className="col-span-8 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="text" placeholder="Pesquisar adicional..." className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm ${focusClass}`} value={buscaAdicional} 
                        onChange={(e) => { setBuscaAdicional(e.target.value); setMostrarAdicionais(true); setAdicionalIndex(-1); }}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") setAdicionalIndex(p => Math.min(p + 1, adicionaisFiltrados.length - 1));
                            if (e.key === "ArrowUp") setAdicionalIndex(p => Math.max(p - 1, 0));
                            if (e.key === "Enter") {
                            const a = adicionalIndex >= 0 ? adicionaisFiltrados[adicionalIndex] : adicionaisFiltrados[0];
                            if (a) { setBuscaAdicional(`${a.codigo} - ${a.nome} ${a.cores ? `(${a.cores})` : ''}`); setValorUnitAdicional(a.preco); setMostrarAdicionais(false); }
                            }
                        }}
                        />
                        {mostrarAdicionais && buscaAdicional && (
                        <div className="absolute top-full w-full bg-white border z-50 max-h-56 overflow-auto shadow-xl rounded-xl py-2">
                            {adicionaisFiltrados.map((a, i) => (
                            <div key={a.id} className={`px-4 py-2 text-xs cursor-pointer flex justify-between ${i === adicionalIndex ? "bg-[#F4FFF0] text-[#1C415B] font-bold" : "hover:bg-gray-50"}`} 
                                onClick={() => { setBuscaAdicional(`${a.codigo} - ${a.nome} ${a.cores ? `(${a.cores})` : ''}`); setValorUnitAdicional(a.preco); setMostrarAdicionais(false); }}>
                                <span>{a.codigo} - {a.nome} <span className="text-gray-400 font-normal">{a.cores ? `(${a.cores})` : ''}</span></span>
                                <span className="text-[#92D050] font-bold">R$ {a.preco}</span>
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                    <div className="col-span-2"><input type="text" className={`w-full p-2 bg-[#F4FFF0] border border-[#92D050]/20 rounded-xl text-sm text-center ${focusClass}`} value={qtdAdicional} onChange={e => setQtdAdicional(e.target.value)} /></div>
                    <div className="col-span-2"><button onClick={() => {
                        if (!buscaAdicional) return;
                        setAdicionaisPendentes([...adicionaisPendentes, { texto: buscaAdicional, qtd: qtdAdicional, valor: valorUnitAdicional }]);
                        setBuscaAdicional(""); setValorUnitAdicional("0,00"); setQtdAdicional("1");
                    }} className="w-full bg-[#92D050] text-white py-2 rounded-xl font-bold text-[10px] uppercase shadow-md">+ Selecionar</button></div>
                    </div>

                    {adicionaisPendentes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-3 rounded-2xl border border-dashed border-gray-200">
                        {adicionaisPendentes.map((adic, idx) => (
                        <div key={idx} className="bg-white px-3 py-1 rounded-full border border-gray-200 text-[10px] flex items-center gap-2">
                            <span className="font-bold text-[#92D050]">{adic.qtd}x</span> {adic.texto}
                            <button onClick={() => setAdicionaisPendentes(adicionaisPendentes.filter((_, i) => i !== idx))}><X size={12} className="text-red-300" /></button>
                        </div>
                        ))}
                    </div>
                    )}

                    <div className="flex justify-end gap-3">
                    <button tabIndex={11} onClick={adicionarItem} className="bg-[#1C415B] text-white px-10 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all outline-none">Adicionar Item ao Orçamento</button>
                    </div>
                </div>
            </div>

            <div className="col-span-2 flex items-center justify-center">
                <div className="w-full aspect-square bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden">
                    {imgPath ? <img src={imgPath} className="w-full h-full object-contain p-4" alt="Preview" /> : <ImageIcon className="text-gray-200" size={40} />}
                </div>
            </div>
            </div>
        </div>

        {/* TABELA RESULTADOS */}
        <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
            <thead className="bg-[#1C415B] text-white text-[10px] uppercase font-bold tracking-widest">
                <tr><th className="p-4">DESCRIÇÃO / VIDRO / EXTRAS</th><th className="p-4 text-center">QTD</th><th className="p-4 text-center">MEDIDA DO VÃO (MM)</th><th className="p-4 text-center">TOTAL</th><th className="p-4 text-center">AÇÕES</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {itens.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 flex items-start gap-4">
                    {item.imagem && <img src={item.imagem} className="w-20 h-20 object-contain" alt="item" />}
                    <div>
                        <span className="uppercase text-[#1C415B] text-xs font-bold block">{item.descricao}</span>
                        <span className="text-[10px] text-gray-400 font-normal block">{item.vidroInfo}</span>
                        {item.adicionais && item.adicionais.map((a: any, i: number) => (
                        <span key={i} className="text-[9px] text-[#92D050] font-medium block">+ {a.qtd}x {a.texto}</span>
                        ))}
                    </div>
                    </td>
                    <td className="p-4 text-center">{item.quantidade}</td>
                    <td className="p-4 text-center font-mono text-xs">{item.medidaVao}</td>
                    <td className="p-4 text-center text-[#92D050] font-bold">
                    {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4 text-center">
                    <button onClick={() => setItens(itens.filter(i => i.id !== item.id))} className="text-red-300 hover:text-red-500"><Trash2 size={18} /></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
    )
    }