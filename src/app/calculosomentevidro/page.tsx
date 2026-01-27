    "use client"
    import { useState, useEffect, useRef } from 'react'
    import { supabase } from "@/lib/supabaseClient"
    import { Trash2, Home, UserPlus, ImageIcon, Search, Printer, Plus, X } from "lucide-react"
    import { calcularProjeto, parseNumber } from "@/utils/glass-calc"
    import { useRouter } from 'next/navigation' 

    export default function CalculoProjetosVidros() {
      const router = useRouter()
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
      const [corKit, setCorKit] = useState("Escolher Puxador")
      const [tipoOrcamento, setTipoOrcamento] = useState("Escolher Tipo de Trilho")
      const [anguloCanto, setAnguloCanto] = useState("Padrão")
      
      const [larguraVao, setLarguraVao] = useState("")
      const [larguraVaoB, setLarguraVaoB] = useState("") 
      const [alturaVao, setAlturaVao] = useState("")
      const [alturaBandeira, setAlturaBandeira] = useState("")
      const [buscaVidroBandeira, setBuscaVidroBandeira] = useState("");
      const [vidroSelBandeira, setVidroSelBandeira] = useState<any>(null);
      const [mostrarVidrosBandeira, setMostrarVidrosBandeira] = useState(false);
      const [vidroBandeiraIndex, setVidroBandeiraIndex] = useState(-1);
      const [quantidade, setQuantidade] = useState("1")
      const [configMaoAmiga, setConfigMaoAmiga] = useState("Escolher Configuração");
      const [roldana, setRoldana] = useState("Carrinho Simples");
      const clienteInputRef = useRef<HTMLInputElement>(null);
      const modeloRef = useRef<HTMLSelectElement>(null)
      const larguraRef = useRef<HTMLInputElement>(null)
      const alturaRef = useRef<HTMLInputElement>(null);
      const qtdRef = useRef<HTMLInputElement>(null);
      const scrollVidrosRef = useRef(null);
      const [precoVidroFinal, setPrecoVidroFinal] = useState<number | null>(null);
      const [clienteSel, setClienteSel] = useState<any>(null);
      const formatarNomeVidro = (v: any) => {
        const nome = v.nome?.trim() || "";
        const espessura = String(v.espessura || "")
            .replace(/mm/gi, "")   // remove qualquer mm existente
            .trim();

        return `${nome} ${espessura}mm`;
        };

    const buscarPrecoEspecial = async (vidroId: number, clienteId: string) => {
    const { data, error } = await supabase
      .from('vidro_precos_clientes')
      .select('preco')
      .eq('vidro_id', vidroId)
      .eq('cliente_id', clienteId)
      .single();

    if (data && !error) return data.preco;
    return null;
  };

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
  }, []);

  // --- 2. MONITOR DE PREÇO ESPECIAL (O QUE ESTAVA FALTANDO) ---
  useEffect(() => {
    async function atualizarPreco() {
      if (clienteSel?.id && vidroSel?.id) {
        const precoEspecial = await buscarPrecoEspecial(vidroSel.id, clienteSel.id);
        if (precoEspecial) {
          // Atualiza o vidro selecionado com o preço do cliente
          setVidroSel((prev: any) => ({
            ...prev,
            preco: precoEspecial
          }));
          console.log("🚀 Preço Especial Aplicado:", precoEspecial);
        }
      }
    }
    atualizarPreco();
  }, [clienteSel?.id, vidroSel?.id]); // Roda sempre que mudar o cliente ou o vidro

  // --- FILTROS (MANTENHA OS SEUS) ---
  // --- FILTROS CORRIGIDOS E TIPADOS ---
const clientesFiltrados = clientes.filter((c: any) => 
  c.nome?.toLowerCase().includes(buscaCliente.toLowerCase())
);

// Filtro para o Vidro Principal
const vidrosFiltrados = vidros.filter((v: any) => {
  const nomeFormatado = formatarNomeVidro(v).toLowerCase();
  return nomeFormatado.includes(buscaVidro.toLowerCase());
});

// Filtro para o Vidro da Bandeira (Independente)
const vidrosBandeiraFiltrados = vidros.filter((v: any) => {
  const nomeFormatado = formatarNomeVidro(v).toLowerCase();
  return nomeFormatado.includes(buscaVidroBandeira.toLowerCase());
});

const adicionaisFiltrados = adicionaisDB.filter((a: any) => 
    a.nome?.toLowerCase().includes(buscaAdicional.toLowerCase()) || 
    a.codigo?.toLowerCase().includes(buscaAdicional.toLowerCase())
).slice(0, 8);

    const arredondar5 = (medida: number) => Math.ceil(medida / 50) * 50;

 
    const imgPath = ((): string => {
    if (!modelo || modelo.includes("Escolher")) return "";

    const modeloBase = modelo.toLowerCase().trim();
    const folhasBase = folhas.toLowerCase();
    const puxadorBase = corKit.toLowerCase();

    // 1️⃣ MÃO AMIGA
    if (modeloBase.includes("mão amiga")) {
        if (configMaoAmiga.includes("Escolher")) return "";
        let fSufixo = "";
        if (configMaoAmiga === "Todas Correm") {
            if (folhasBase.includes("escolher")) return "";
            fSufixo = `${folhasBase.replace(/\D/g, "")}fs`;
        } else {
            fSufixo = `${configMaoAmiga.replace(/\D/g, "")}fs`;
        }
        let tipoSufixo = "simples";
        if (modeloBase.includes("porta") && puxadorBase === "com puxador") {
            tipoSufixo = "completo";
        }
        return `/desenhos/pma-${fSufixo}-${tipoSufixo}.png`;
    }

    // 2️⃣ DESLIZANTE (NOVO)
    if (modeloBase.includes("deslizante")) {
        if (configMaoAmiga.includes("Escolher")) return "";

        let fSufixo = "";
        if (configMaoAmiga === "Todas Correm") {
            if (folhasBase.includes("escolher")) return "";
            fSufixo = `${folhasBase.replace(/\D/g, "")}fls`;
        } else {
            // Extrai números: "1 Fixa + 2 Móveis" vira "12"
            fSufixo = `${configMaoAmiga.replace(/\D/g, "")}fls`;
        }

        const rSufixo = roldana === "Carrinho Inteiro" ? "ci" : "cs";
        const tipoSufixo = puxadorBase === "com puxador" ? "completo" : "simples";

        return `/desenhos/deslizante-${fSufixo}-${rSufixo}-${tipoSufixo}.png`;
    }

    // 3️⃣ FIXO, BASCULANTE E BOX
    if (modeloBase === "fixo") {
        if (folhasBase.includes("escolher")) return "";
        return `/desenhos/fixo-${folhasBase.replace(" ", "")}.png`;
    }
    if (modeloBase.includes("basculante")) {
        if (folhasBase.includes("1 folha")) return "/desenhos/basculate-unica.png";
        return "/desenhos/sem-imagem.png";
    }
    if (modeloBase.includes("box tradicional")) {
        if (folhasBase.includes("1 folha") || folhasBase.includes("5") || folhasBase.includes("6")) return "/desenhos/sem-imagem.png";
        if (folhasBase.includes("2 folhas")) return puxadorBase === "com puxador" ? "/desenhos/box-puxadorduplo.png" : "/desenhos/box-padrao.png";
        if (folhasBase.includes("3 folhas")) return "/desenhos/box-padrao3f.png";
        if (folhasBase.includes("4 folhas")) return "/desenhos/box-padrao4f.png";
    }
    if (modeloBase.includes("box canto")) {
        if (folhasBase.includes("1") || folhasBase.includes("2") || folhasBase.includes("5") || folhasBase.includes("6")) return "/desenhos/sem-imagem.png";
        if (folhasBase.includes("3 folhas")) return "/desenhos/box-canto3f.png";
        if (folhasBase.includes("4 folhas")) return "/desenhos/box-canto4f.png";
    }

    // 4️⃣ MAX
    if (modeloBase === "max") {
        return folhasBase.includes("1 folha") ? "/desenhos/max-unica.png" : "/desenhos/sem-imagem.png";
    }

    // 5️⃣ JANELAS GENÉRICAS
    if (modeloBase.includes("janela")) {
        if (folhasBase.includes("1") || folhasBase.includes("3") || folhasBase.includes("5") || folhasBase.includes("6")) return "/desenhos/sem-imagem.png";
        if (trinco.includes("Escolher")) return "";
        const t = trinco === "Com trinco" ? "c" : "s";
        const f = folhasBase.includes("2") ? "2fls" : "4fls";
        if (modeloBase === "janela padrão") return `/desenhos/janela-${t}-trinco-${f}.png`;
        if (modeloBase === "janela bandeira") return `/desenhos/janela-${trinco === "Com trinco" ? "bct" : "bst"}-trinco-${f}.png`;
        if (modeloBase === "janela canto") return `/desenhos/janela-${anguloCanto === "90°" ? "canto90" : "canto"}-${trinco === "Com trinco" ? "ct" : "st"}.png`;
    }

    // 6️⃣ PORTA
    if (modeloBase === "porta") {
        if (folhasBase.includes("escolher")) return "";

        const trincosEspeciais = [
            "trinco simples + chave", 
            "chave + chave", 
            "trinco duplo + chave", 
            "trinco simples + trinco duplo"
        ];
        const eTrincoEspecial = trincosEspeciais.includes(trinco.toLowerCase());

        if (folhasBase.includes("2 folhas")) {
            if (puxadorBase === "com puxador") {
                if (trinco === "Com trinco") return "/desenhos/porta2fls-completo.png";
                return "/desenhos/porta2fls-completo1.png";
            } else {
                if (trinco === "Com trinco") return "/desenhos/porta2fls-simples.png";
                return "/desenhos/janela-s-trinco-2fls.png";
            }
        }

        if (folhasBase.includes("4 folhas")) {
            if (puxadorBase === "com puxador") {
                if (trinco === "Com trinco") return "/desenhos/porta4fls-completo2.png";
                if (trinco === "Sem trinco" || trinco.includes("Escolher")) return "/desenhos/porta4fls-completo3.png";
                return "/desenhos/porta4fls-completo1.png";
            } else {
                if (trinco === "Com trinco") return "/desenhos/porta4fls-completo4.png";
                if (eTrincoEspecial) return "/desenhos/porta4fls-completo5.png";
                return "/desenhos/janela-s-trinco-4fls.png";
            }
        }

        if (folhasBase.includes("6 folhas")) {
            return (puxadorBase === "com puxador") 
                ? "/desenhos/porta6fls-4f2m-completo.png" 
                : "/desenhos/porta6fls-4f2m-simples.png";
        }
    }
    // 7️⃣ PORTA FORA DO VÃO
if (modeloBase.includes("porta fora vão")) {
    const f = folhasBase.replace(/\D/g, "");
    if (f === "1" || f === "2") {
        const sufixo = puxadorBase === "com puxador" ? "completo" : "";
        return `/desenhos/portaforavao-${f}fls${sufixo}.png`;
    }
    return "/desenhos/sem-imagem.png";
}

// 8️⃣ PORTA DE GIRO
if (modeloBase.includes("porta giro")) {
    const f = folhasBase.replace(/\D/g, "");
    if (["1", "2", "4"].includes(f)) {
        const sufixo = puxadorBase === "com puxador" ? "completo" : "";
        return `/desenhos/portagiro-${f}fls${sufixo}.png`;
    }
    return "/desenhos/sem-imagem.png";
}

// 9️⃣ PORTA COM BANDEIRA (Regras de Sufixos Corrigidas)
if (modeloBase.includes("porta com bandeira")) {
    const f = folhasBase.replace(/\D/g, "");
    
    const trincosEspeciais = [
        "trinco simples + chave", 
        "chave + chave", 
        "trinco duplo + chave", 
        "trinco simples + trinco duplo"
    ];
    const eTrincoEspecial = trincosEspeciais.includes(trinco.toLowerCase());

    // --- Lógica para 4 Folhas (Seguindo sua lista exata) ---
    if (f === "4") {
        if (puxadorBase === "com puxador") {
            // Puxadores + Trincos Compostos
            if (eTrincoEspecial) return "/desenhos/portaband4fls-completa2.png";
            
            // Puxadores + 1 Trinco Simples
            if (trinco === "Com trinco") return "/desenhos/portaband4fls-completa.png";
            
            // Só Puxador (Sem trinco)
            return "/desenhos/portaband4fls-completa1.png";
        } else {
            // SEM PUXADOR + Trincos Compostos
            if (eTrincoEspecial) return "/desenhos/portaband4fls-completa3.png";
            
            // SEM PUXADOR + Somente 1 Trinco
            if (trinco === "Com trinco") return "/desenhos/portaband4fls-simples.png";
            
            // SEM PUXADOR e SEM TRINCO
            return "/desenhos/portaband4fls.png";
        }
    }

    // --- Lógica para 2 Folhas (Mantendo o padrão funcional) ---
    if (f === "2") {
        if (puxadorBase === "com puxador" && trinco === "Com trinco") return "/desenhos/portaband2fls-completa.png";
        if (trinco === "Com trinco") return "/desenhos/portaband2fls-simples.png";
        return "/desenhos/portaband2fls.png";
    }

    return "/desenhos/sem-imagem.png";
}

    return "";
})();

 const adicionarItem = () => {
    if (!vidroSel) {
        alert("Por favor, selecione um vidro antes de adicionar.");
        return;
    }
    if (!larguraVao || !alturaVao) {
        alert("Preencha largura e altura.");
        return;
    }

    const modeloAtual = modelo || "Janela";
    const folhasAtuais = folhas || "2 folhas";

    // 1. Cálculo base do projeto (Vidro + Perfis padrão do cálculo)
    const resultado = calcularProjeto({
        modelo: modeloAtual,
        folhas: folhasAtuais,
        largura: larguraVao,
        larguraB: larguraVaoB,
        altura: alturaVao,        
        alturaPorta: alturaBandeira, 
        precoVidroBandeira: vidroSelBandeira?.preco || vidroSel.preco, 
        precoM2: vidroSel.preco,
        configMaoAmiga: configMaoAmiga,
        tipoOrcamento: tipoOrcamento,
    });

    // 2. Cálculo dos Adicionais da Lista (Ferragens/Perfis extras que você clicou em Adicionar)
    const totalAdicionaisExtras = adicionaisPendentes.reduce((acc, adic) => {
        return acc + (parseNumber(adic.valor) * parseNumber(adic.qtd));
    }, 0);

    // 3. SOMA TUDO: (Valor do Vidro/Projeto + Adicionais Extras) * Quantidade de Vãos
    const qtdVao = parseNumber(quantidade);
    const valorFinal = (resultado.valorVidro + totalAdicionaisExtras) * qtdVao;

    // 4. Montar os Detalhes (Trinco, Puxador, Trilho, etc.) - Pula o que for "Escolher"
    const opcionaisArray = [];
    if (trinco && !trinco.includes("Escolher")) opcionaisArray.push(`Trinco: ${trinco}`);
    if (corKit && !corKit.includes("Escolher")) opcionaisArray.push(corKit);
    if (tipoOrcamento && !tipoOrcamento.includes("Escolher")) opcionaisArray.push(`Trilho: ${tipoOrcamento}`);
    if (configMaoAmiga && !configMaoAmiga.includes("Escolher")) opcionaisArray.push(`Modelo: ${configMaoAmiga}`);
    if (roldana && modelo.includes("Deslizante")) opcionaisArray.push(`Roldana: ${roldana}`);
    
    // Adiciona também os nomes das ferragens extras da lista
    adicionaisPendentes.forEach(a => opcionaisArray.push(`${a.nome} (x${a.qtd})`));

    const detalhesTexto = opcionaisArray.join(" • ");

    // 5. Monta o objeto para a tabela
const novoItem = {
    id: Date.now(),
    descricao: `${modelo} ${folhas}`, 
    vidroInfo: modelo.toLowerCase().includes("bandeira") 
        ? `Porta: ${formatarNomeVidro(vidroSel)} | Band: ${vidroSelBandeira ? formatarNomeVidro(vidroSelBandeira) : formatarNomeVidro(vidroSel)}`
        : formatarNomeVidro(vidroSel),
    detalhes: opcionaisArray, // Agora salvamos como ARRAY para listar um embaixo do outro
    areaM2: resultado.area,           
    adicionais: adicionaisPendentes.map(a => ({
        qtd: a.qtd,
        nome: a.nome || a.descricao || "Item sem nome" // Garante que não apareça undefined
    })), 
    medidaVao: `${larguraVao}x${alturaVao}`,
    quantidade: quantidade,
    imagem: imgPath,
    total: valorFinal
};

    setItens([...itens, novoItem]);
    
    // Limpeza
    setLarguraVao(""); 
    setLarguraVaoB(""); 
    setAlturaVao(""); 
    setQuantidade("1");
    setAdicionaisPendentes([]); 

    setTimeout(() => { larguraRef.current?.focus(); }, 100);
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
  setTipoOrcamento("Escolher Tipo de Trilho")
  setCorKit("Escolher Puxador")
  setAnguloCanto("Padrão")

  // Medidas
  setLarguraVao("")
  setLarguraVaoB("")
  setAlturaVao("")
  setAlturaBandeira("")
  setQuantidade("")

  // Adicionais
  setBuscaAdicional("")
  setMostrarAdicionais(false)
  setAdicionalIndex(-1)
  setQtdAdicional("1")
  setValorUnitAdicional("0,00")
  setAdicionaisPendentes([])
  setBuscaVidroBandeira("");
  setVidroSelBandeira(null);
  setAlturaBandeira("");
  // Foco inicial
  setTimeout(() => {
        clienteInputRef.current?.focus();
    }, 100); // O timeout garante que o foco ocorra após a limpeza dos estados
}

// Criamos um objeto para somar m² por tipo de vidro e contar peças
const resumoVidros = itens.reduce((acc: any, item) => {
  const nomeVidro = item.vidroInfo.split('|')[0].trim(); // Pega o nome do vidro
  acc[nomeVidro] = (acc[nomeVidro] || 0) + item.areaM2;
  return acc;
}, {});

const totalPecas = itens.reduce((acc, item) => acc + item.quantidade, 0);
const valorTotalGeral = itens.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans text-[#1C415B]">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-[#92D050] rounded-lg shadow-sm"><Home className="text-white" size={24} /></div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">Cálculo de Projetos - Só VIDRO</h1>
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
            <input ref={clienteInputRef} tabIndex={1} type="text" className={`w-full py-1 text-sm border-b border-gray-200 bg-transparent px-2 ${focusClass}`} value={buscaCliente} placeholder="Pesquisar cliente..." 
                onChange={(e) => { setBuscaCliente(e.target.value); setMostrarClientes(true); setClienteIndex(-1); }}
                onKeyDown={(e) => {
                if (e.key === "ArrowDown") setClienteIndex(p => Math.min(p + 1, clientesFiltrados.length - 1));
                if (e.key === "ArrowUp") setClienteIndex(p => Math.max(p - 1, 0));
                if (e.key === "Enter") {
                    const sel = clienteIndex >= 0 ? clientesFiltrados[clienteIndex] : clientesFiltrados[0];
                    if (sel) { setClienteSel(sel); setBuscaCliente(sel.nome);  setMostrarClientes(false); modeloRef.current?.focus(); }
                }
                }}
            />
            {mostrarClientes && buscaCliente && (
                <div className="absolute top-full w-full bg-white border rounded-xl shadow-xl z-50 max-h-60 overflow-auto py-2">
                {clientesFiltrados.map((c, i) => (
                    <div key={c.id} className={`px-4 py-2 text-xs cursor-pointer ${i === clienteIndex ? "bg-[#F4FFF0] text-[#1C415B] font-bold" : "hover:bg-gray-50"}`} onClick={() => { setClienteSel(c); setBuscaCliente(c.nome); setMostrarClientes(false); modeloRef.current?.focus(); }}>{c.nome}</div>
                ))}
                </div>
            )}
            </div>
            <button 
              onClick={() => router.push('/clientes')} 
              className="p-2 bg-[#1C415B] text-white rounded-xl hover:bg-opacity-90 transition-all shadow-md active:scale-95"
              title="Cadastrar Novo Cliente"
            >
              <UserPlus size={20} />
            </button>
           </div>

        {/* BOX CONFIGURAÇÃO */}
<div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 mb-6 shadow-sm">
  <div className="grid grid-cols-12 gap-8">

    {/* ================= COLUNA ESQUERDA ================= */}
    <div className="col-span-10">

      <div className="grid grid-cols-4 gap-4">

      {/* 1️⃣ JANELA / FOLHAS / TRINCO */}
<div className="flex flex-col gap-2">
  <label className="text-[10px] text-gray-300 uppercase">PROJETOS</label>

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
    <option>Basculante</option>
    <option>Box Tradicional</option>
    <option>Box Canto</option>
    <option>Fixo</option>
    <option value="Janela Padrão">Janela</option>
    <option value="Janela Bandeira">Janela Bandeira</option>
    <option value="Janela Canto">Janela Canto</option>
    <option>Janela Mão Amiga</option>
    <option>Max</option>
    <option>Porta </option>
    <option>Porta com Bandeira</option>
    <option>Porta Deslizante</option>
    <option>Porta Fora Vão</option>
    <option>Porta Giro</option>
    <option>Porta Mão Amiga</option>
  </select>

  {/* CONFIGURAÇÃO PARA CANTO */}
  {modelo === "Janela Canto" && (
    <div className="flex flex-col gap-1 animate-in fade-in duration-500">
      <label className="text-[10px] font-bold text-[#1C415B] uppercase ml-1">
        Tipo do fecho (Canto)
      </label>
      <select
        className={`border border-[#92D050] rounded-xl p-2.5 text-sm ${focusClass}`}
        value={anguloCanto}
        onChange={e => setAnguloCanto(e.target.value)}
      >
        <option>Escolher Modelo</option>
        <option value="Padrão">Canto Padrão (Perfil)</option>
        <option value="90°">Canto 90° (Vidro/Vidro)</option>
      </select>
    </div>
  )}

  {/* NOVO: TIPO DE ROLDANA (Aparece apenas para Deslizante) */}
  {modelo === "Porta Deslizante" && (
    <div className="flex flex-col gap-1 animate-in fade-in duration-500">
      <label className="text-[10px] font-bold text-[#1C415B] uppercase ml-1">
        Tipo de Roldana
      </label>
      <select
        className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
        value={roldana}
        onChange={e => setRoldana(e.target.value)}
      >
        <option value="Carrinho Simples">Carrinho Simples</option>
        <option value="Carrinho Inteiro">Carrinho Inteiro</option>
      </select>
    </div>
  )}

    {/* CAIXA UNIFICADA: Mão Amiga e Deslizante */}
  {(modelo === "Janela Mão Amiga" || modelo === "Porta Mão Amiga" || modelo === "Porta Deslizante") && (
    <div className="flex flex-col gap-1 animate-in fade-in duration-500">
      <label className="text-[10px] font-bold text-[#1C415B] uppercase ml-1">
        Qual modelo de porta?
      </label>
      <select
        className={`border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#1C415B] transition-all bg-white shadow-sm`}
        value={configMaoAmiga}
        onChange={(e) => setConfigMaoAmiga(e.target.value)}
      >
        <option>Escolher Modelo</option>
        <option value="Todas Correm">Todas Correm</option>
        <option value="1 Fixa + 2 Móveis">1 Fixa + 2 Móveis</option>
        <option value="1 Fixa + 3 Móveis">1 Fixa + 3 Móveis</option>
        <option value="1 Fixa + 4 Móveis">1 Fixa + 4 Móveis</option>
        <option value="1 Fixa + 5 Móveis">1 Fixa + 5 Móveis</option>
        <option value="2 Fixas + 4 Móveis">2 Fixas + 4 Móveis</option>
      </select>
    </div>
  )}

  {/* Lógica Condicional: Esconde o campo Folhas */}
  {(!modelo.toLowerCase().includes("mão amiga") && !modelo.toLowerCase().includes("deslizante") || configMaoAmiga === "Todas Correm") && (
    <div className="flex flex-col gap-1 animate-in fade-in duration-300">
      <select
        className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
        value={folhas}
        onChange={e => setFolhas(e.target.value)}
      >
        <option>Escolher Folhas</option>
        <option value="1 folha">1 Folha</option>
        <option value="2 folhas">2 Folhas</option>
        <option value="3 folhas">3 Folhas</option>
        <option value="4 folhas">4 Folhas</option>
        <option value="5 folhas">5 Folhas</option>
        <option value="6 folhas">6 Folhas</option>
      </select>
    </div>
  )}

  <select
    className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
    value={trinco}
    onChange={e => setTrinco(e.target.value)}
  >
    <option>Escolher trinco</option>
    <option value="Sem trinco">Sem Trinco</option>
    <option value="Com trinco">Com Trinco</option>
    <option>Trinco Simples + Chave</option>
    <option>Chave + Chave</option>
    <option>Trinco Duplo + Chave</option>
    <option>Trinco Simples + Trinco Duplo</option>
  </select>
</div>

        {/* 2️⃣ KIT / COR / VIDRO */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[10px] text-gray-300 uppercase">Tipo do Trilho</label>

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={tipoOrcamento}
            onChange={e => setTipoOrcamento(e.target.value)}
          >
           <option>Escolher Tipo de Trilho</option>
            <option>Aparente</option>
            <option>Interrompido</option>
            <option>Embutido</option>
          </select>

          <select
            className={`border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
            value={corKit}
            onChange={e => setCorKit(e.target.value)}
          >
            <option>Escolher Puxador</option>
            <option>Com Puxador</option>
            <option>Sem Puxador</option>
          </select>

          <div className="relative">
          <input
    type="text"
    className={`w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-1 focus:ring-[#92D050] outline-none`}
    value={buscaVidro}
    placeholder="Pesquisar vidro (ex: Incolor 08)..."
    onChange={e => {
      setBuscaVidro(e.target.value);
      setMostrarVidros(true);
      setVidroIndex(0); // Começa sempre no primeiro da lista filtrada
    }}
    onKeyDown={e => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setVidroIndex(p => {
          const next = Math.min(p + 1, vidrosFiltrados.length - 1);
          // Lógica de Scroll Automático
          const el = document.getElementById(`vidro-item-${next}`);
          el?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setVidroIndex(p => {
          const prev = Math.max(p - 1, 0);
          const el = document.getElementById(`vidro-item-${prev}`);
          el?.scrollIntoView({ block: 'nearest' });
          return prev;
        });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const v = vidrosFiltrados[vidroIndex];
        if (v) {
          setVidroSel(v);
          setBuscaVidro(formatarNomeVidro(v));
          setMostrarVidros(false);
        }
      }
    }}
  />

           {mostrarVidros && buscaVidro && (
    <div 
      ref={scrollVidrosRef}
      className="absolute top-full w-full bg-white border z-50 max-h-56 overflow-y-auto shadow-xl rounded-xl py-2 scroll-smooth"
    >
      {vidrosFiltrados.length > 0 ? (
        vidrosFiltrados.map((v, i) => (
          <div
            id={`vidro-item-${i}`} // ID essencial para o scrollIntoView
            key={v.id}
            className={`px-4 py-2 text-xs cursor-pointer flex justify-between items-center ${
              i === vidroIndex ? "bg-[#F4FFF0] text-[#1C415B] font-bold" : "hover:bg-gray-50 text-gray-600"
            }`}
            onClick={() => {
              setVidroSel(v);
              setBuscaVidro(formatarNomeVidro(v));
              setMostrarVidros(false);
            }}
          >
            <span>{formatarNomeVidro(v)}</span>
            {i === vidroIndex && <div className="w-1 h-4 bg-[#92D050] rounded-full" />}
          </div>
        ))
      ) : (
        <div className="px-4 py-2 text-xs text-gray-400">Nenhum vidro encontrado...</div>
      )}
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
              onChange={e => {if (e.target.value.length <= 4) setLarguraVao(e.target.value);}}
              onKeyDown={e => {
              if (e.key === 'Enter') alturaRef.current?.focus();
            }}
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
              onChange={e => {if (e.target.value.length <= 4) setAlturaVao(e.target.value);}}
              onKeyDown={e => {
              if (e.key === 'Enter') {
                      if (modelo === "Janela Bandeira") {
                          }
                qtdRef.current?.focus();
              }
  }}
            />
          </div>

          {modelo === "Janela Bandeira" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-300 uppercase">Alt. Band.</label>
              <input
                type="number"
                className={`border border-[#92D050] rounded-xl p-2.5 text-center ${focusClass}`}
                value={alturaBandeira}
                onChange={e => {
                    if (e.target.value.length <= 4) setAlturaBandeira(e.target.value);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter') qtdRef.current?.focus();
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-300 uppercase">Qtd</label>
            <input
              ref={qtdRef}
              type="number"
              className={`border border-gray-200 rounded-xl p-2.5 text-center ${focusClass}`}
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Evita comportamentos estranhos do navegador
                adicionarItem();    // CHAMA A SUA FUNÇÃO DE CÁLCULO
              }
            }}
            />
          </div>
        </div>
{modelo.toLowerCase().includes("bandeira") && (
  <div className="flex flex-col gap-3 p-4 bg-[#F4FFF0]/50 rounded-2xl border border-[#92D050]/30 animate-in slide-in-from-top-2 duration-300">
    
    {/* Campo Altura */}
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[#1C415B] uppercase ml-1">Altura da Porta até Tubo (mm)</label>
      <input
        type="number"
        className={`border border-[#92D050] rounded-xl p-2.5 text-center text-sm bg-white ${focusClass}`}
        placeholder="Ex: 400"
        value={alturaBandeira}
        onChange={e => setAlturaBandeira(e.target.value)}
      />
    </div>

    {/* Campo Vidro da Bandeira */}
    <div className="flex flex-col gap-1 relative">
      <label className="text-[10px] font-bold text-[#1C415B] uppercase ml-1">Vidro da Bandeira</label>
      <input
        type="text"
        className={`w-full border border-gray-200 rounded-xl p-2.5 text-sm ${focusClass}`}
        placeholder="Pesquisar vidro da bandeira..."
        value={buscaVidroBandeira}
        onChange={e => {
          setBuscaVidroBandeira(e.target.value);
          setMostrarVidrosBandeira(true);
          setVidroBandeiraIndex(0);
        }}
        onKeyDown={e => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setVidroBandeiraIndex(p => {
              const next = Math.min(p + 1, vidrosBandeiraFiltrados.length - 1);
              document.getElementById(`vidro-band-${next}`)?.scrollIntoView({ block: 'nearest' });
              return next;
            });
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setVidroBandeiraIndex(p => {
              const prev = Math.max(p - 1, 0);
              document.getElementById(`vidro-band-${prev}`)?.scrollIntoView({ block: 'nearest' });
              return prev;
            });
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const v = vidrosBandeiraFiltrados[vidroBandeiraIndex];
            if (v) {
              setVidroSelBandeira(v);
              setBuscaVidroBandeira(formatarNomeVidro(v));
              setMostrarVidrosBandeira(false);
            }
          }
        }}
      />

      {/* Lista de Sugestões da Bandeira */}
      {mostrarVidrosBandeira && buscaVidroBandeira && (
        <div className="absolute top-full w-full bg-white border z-[100] max-h-40 overflow-y-auto shadow-xl rounded-xl py-2 scroll-smooth">
          {vidrosBandeiraFiltrados.length > 0 ? (
            vidrosBandeiraFiltrados.map((v: any, i: number) => (
              <div
                id={`vidro-band-${i}`} // ID para o scroll funcionar
                key={v.id}
                className={`px-4 py-2 text-xs cursor-pointer flex justify-between items-center ${
                  i === vidroBandeiraIndex ? "bg-[#F4FFF0] text-[#1C415B] font-bold" : "hover:bg-gray-50 text-gray-600"
                }`}
                onClick={() => {
                  setVidroSelBandeira(v);
                  setBuscaVidroBandeira(formatarNomeVidro(v));
                  setMostrarVidrosBandeira(false);
                }}
              >
                <span>{formatarNomeVidro(v)}</span>
                {i === vidroBandeiraIndex && <div className="w-1 h-3 bg-[#92D050] rounded-full" />}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-xs text-gray-400 italic">Nenhum vidro encontrado...</div>
          )}
        </div>
      )}
    </div>
  </div>
)}
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
<div className="space-y-4">
  <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 bg-white shadow-sm">
    <table className="w-full text-left text-sm">
      <thead className="bg-[#1C415B] text-white text-[10px] uppercase font-bold tracking-widest">
        <tr>
          <th className="p-4">DESCRIÇÃO / VIDRO / EXTRAS</th>
          <th className="p-4 text-center">QTD</th>
          <th className="p-4 text-center">MEDIDA DO VÃO (MM)</th>
          <th className="p-4 text-center">TOTAL</th>
          <th className="p-4 text-center">AÇÕES</th>
        </tr>
      </thead>
    <tbody className="divide-y divide-gray-50">
  {itens.map((item: any) => ( // Adicionado : any para evitar erro de tipo
    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
     <td className="p-4 flex items-start gap-4">
  {item.imagem && <img src={item.imagem} className="w-16 h-16 object-contain" alt="item" />}
  <div className="flex flex-col gap-0.5">
    <span className="uppercase text-[#1C415B] text-xs font-bold block">{item.descricao}</span>
    
    <span className="text-[11px] text-gray-400 font-normal block">
      {item.vidroInfo} | Área: {item.areaM2.toFixed(3)}m²
    </span>

    {/* LISTA DE DETALHES (Trinco, Trilho, etc) */}
    {item.detalhes && item.detalhes.map((det: string, idx: number) => (
      <span key={idx} className="text-[10px] text-[#92D050] font-medium italic block leading-tight">
        • {det}
      </span>
    ))}

    {/* LISTA DE ADICIONAIS EXTRAS (Ferragens da busca) */}
    {item.adicionais && item.adicionais.length > 0 && (
      <div className="mt-1 pt-1 border-t border-dotted border-gray-200">
        {item.adicionais.map((a: any, i: number) => (
          <span key={i} className="text-[10px] text-gray-500 font-medium block leading-tight">
            + {a.qtd}x {a.nome}
          </span>
        ))}
      </div>
    )}
  </div>
</td>
      <td className="p-4 text-center text-sm font-medium">{item.quantidade}</td>
      <td className="p-4 text-center font-mono text-xs text-gray-500">{item.medidaVao}</td>
      <td className="p-4 text-center text-[#1C415B] font-bold">
        {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td className="p-4 text-center">
        <button 
          onClick={() => setItens(itens.filter(i => i.id !== item.id))} 
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  ))}
</tbody>
    </table>
  </div>

{/* RESUMO TÉCNICO E FINANCEIRO UNIFICADOS */}
{itens.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
    
    {/* Bloco 1: Detalhamento Técnico (Materiais + Itens + Área) */}
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1 bg-[#92D050]"></div>
      
      {/* Cabeçalho do Bloco com Itens e Área Total */}
      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo de Materiais</h4>
        <div className="flex gap-3">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Itens: {itens.length}</span>
          <span className="text-[10px] text-[#1C415B] font-bold uppercase">Área Total: {itens.reduce((acc, item) => acc + item.areaM2, 0).toFixed(2)} m²</span>
        </div>
      </div>

      {/* Lista de Vidros Detalhada */}
      <div className="space-y-2">
        {Object.entries(resumoVidros).map(([nome, area]: any) => (
          <div key={nome} className="flex justify-between items-center text-xs">
            <span className="text-gray-500">{nome}</span>
            <span className="font-bold text-[#92D050] bg-[#F4FFF0] px-2 py-0.5 rounded-lg">{area.toFixed(2)} m²</span>
          </div>
        ))}
      </div>
    </div>

    {/* Bloco 2: Total Financeiro (Limpo) */}
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-center items-end text-right">
      <div className="absolute right-0 top-0 h-full w-1 bg-[#1C415B]"></div>
      
      <h4 className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Valor Total do Orçamento</h4>
      <p className="text-[11px] text-gray-300 mb-4 max-w-[250px]">Total de todos os itens e acessórios selecionados</p>
      
      <div className="text-4xl font-black text-[#1C415B]">
        {valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </div>
    </div>

  </div>
)}
</div>
</div>
    )
    }