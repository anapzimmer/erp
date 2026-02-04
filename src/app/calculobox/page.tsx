"use client"
import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/lib/supabaseClient"
import { Trash2, Home, Package, Printer, UserPlus, Pencil, AlertCircle, RefreshCw, Image as ImageIcon, PlusCircle, Search, ClipboardList} from "lucide-react"

export default function CalculoVidros() {
  const [modoProducao, setModoProducao] = useState(false);
  const [modoSeparacao, setModoSeparacao] = useState(false)
  const [clienteIndex, setClienteIndex] = useState(0);
  const adicionalContainerRef = useRef<HTMLDivElement>(null);
  const [indiceAdicional, setIndiceAdicional] = useState(0);
  const [vidroIndex, setVidroIndex] = useState(0);
  const larguraRef = useRef<HTMLInputElement>(null);
  const alturaRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const adicionarRef = useRef<HTMLButtonElement>(null);
  const adicionalInputRef = useRef<HTMLInputElement>(null);
  const qtdAdicionalRef = useRef<HTMLInputElement>(null);
  const btnAddAdicionalRef = useRef<HTMLButtonElement>(null);
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [mostrarModalRecalculo, setMostrarModalRecalculo] = useState(false);
  const [mostrarModalConfirmarRecalculo, setMostrarModalConfirmarRecalculo] = useState(false);
  const [vidroOrigemSel, setVidroOrigemSel] = useState<any>(null);
  const [modoTrocaVidro, setModoTrocaVidro] = useState<"todos" | "origem">("todos");
  const [deveImprimir, setDeveImprimir] = useState(false);
  const [itemAlvoTroca, setItemAlvoTroca] = useState(null);

  const theme = {
    primary: "#1C415B",
    secondary: "#92D050",
    danger: "#EF4444" 
  };

  const getImagemBox = (mod: string, fol: string) => {
    if (mod === "Reto") {
      if (fol === "2 folhas") return "/desenhos/box-padrao.png";
      if (fol === "3 folhas") return "/desenhos/box-padrao3f.png";
      if (fol === "4 folhas") return "/desenhos/box-padrao4f.png";
    }
    if (mod === "Canto") {
      if (fol === "3 folhas") return "/desenhos/box-canto3f.png";
      if (fol === "4 folhas") return "/desenhos/box-canto4f.png";
    }
    return null;
  };

  const calcularM2Vidro = (largura: number, altura: number) => {
  const larguraArredondada = Math.ceil(largura / 50) * 50;
  const alturaArredondada = Math.ceil(altura / 50) * 50;

  return (larguraArredondada * alturaArredondada) / 1_000_000;
};

  // --- ESTADOS ---
  const [vidros, setVidros] = useState<any[]>([])
  // --- TROCA DE VIDRO EM LOTE ---
  const [mostrarModalTrocaVidro, setMostrarModalTrocaVidro] = useState(false);
  const [vidroLoteSel, setVidroLoteSel] = useState<any>(null);
  const [buscaVidroLote, setBuscaVidroLote] = useState("");
  const [vidroLoteIndex, setVidroLoteIndex] = useState(0);
  const [clientes, setClientes] = useState<any[]>([])
  const [kits, setKits] = useState<any[]>([])
  const [precosEspeciais, setPrecosEspeciais] = useState<any[]>([])
  const [selecionados, setSelecionados] = useState<any[]>([])
  
  // Estados para Ferragens e Perfis (Adicionais)
  const [ferragens, setFerragens] = useState<any[]>([])
  const [perfis, setPerfis] = useState<any[]>([])
  
  const [buscaAdicional, setBuscaAdicional] = useState("")
  const [mostrarAdicionais, setMostrarAdicionais] = useState(false)
  const [adicionalSel, setAdicionalSel] = useState<any>(null)

  const [itens, setItens] = useState<any[]>([])
  const [clienteSel, setClienteSel] = useState<any>(null)
  const [buscaCliente, setBuscaCliente] = useState("")

  const [modelo, setModelo] = useState<string>("") 
  const [folhas, setFolhas] = useState<string>("")
  const [tipoBox, setTipoBox] = useState<"Padrão" | "Até o teto">("Padrão")
  const [estiloKit, setEstiloKit] = useState<"Tradicional" | "Quadrado">("Tradicional")
  const [corSel, setCorSel] = useState("Branco")
  const [vidroSel, setVidroSel] = useState<any>(null)
  const [buscaVidro, setBuscaVidro] = useState("")
  const [mostrarVidros, setMostrarVidros] = useState(false)
  const [larguraVao, setLarguraVao] = useState("")
  const [larguraVaoB, setLarguraVaoB] = useState("") 
  const [alturaVao, setAlturaVao] = useState("")
  const [quantidade, setQuantidade] = useState("1")
  
  const [valorAdicional, setValorAdicional] = useState("")
  const [quantidadeAdicional, setQuantidadeAdicional] = useState("1")
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<any[]>([])

  const [trocaVidroAplicada, setTrocaVidroAplicada] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    show: boolean, title: string, message: string, type: 'confirm' | 'alert' | 'delete', action?: () => void
  }>({ show: false, title: '', message: '', type: 'alert' });

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    const savedItens = localStorage.getItem('orcamento_itens');
    const savedCliente = localStorage.getItem('orcamento_cliente');
    if (savedItens) setItens(JSON.parse(savedItens));
    if (savedCliente) {
        const parsedCliente = JSON.parse(savedCliente);
        setClienteSel(parsedCliente);
        setBuscaCliente(parsedCliente.nome);
    }
  }, []);

useEffect(() => {
  const buscarPrecosEspeciais = async () => {
    // Se não tiver cliente selecionado, limpa a lista de preços especiais
    if (!clienteSel?.id) {
      setPrecosEspeciais([]);
      return;
    }

    const { data, error } = await supabase
      .from('vidro_precos_clientes')
      .select('vidro_id, preco, cliente_id') // Adicionei cliente_id para conferência
      .eq('cliente_id', clienteSel.id);

    if (!error && data) {
      setPrecosEspeciais(data);
      console.log("Preços especiais carregados para o cliente:", data);
    } else {
      setPrecosEspeciais([]);
    }
  };

  buscarPrecosEspeciais();
}, [clienteSel?.id]);

  // Carregar dados do Supabase incluindo Ferragens e Perfis
  useEffect(() => {
    async function load() {
      const { data: v } = await supabase.from('vidros').select('*')
      const { data: c } = await supabase.from('clientes').select('*').order('nome', { ascending: true })
      const { data: k } = await supabase.from('kits').select('*')
      const { data: pe } = await supabase.from('vidro_precos_clientes').select('*')
      const { data: f } = await supabase.from('ferragens').select('*')
      const { data: p } = await supabase.from('perfis').select('*')
      
      if (v) setVidros(v)
      if (c) setClientes(c)
      if (k) setKits(k)
      if (pe) setPrecosEspeciais(pe)
      if (f) setFerragens(f)
      if (p) setPerfis(p)
    }
    load()
  }, [])

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      adicionalContainerRef.current &&
      !adicionalContainerRef.current.contains(event.target as Node)
    ) {
      setMostrarAdicionais(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


  // Lista combinada para busca de adicionais
  const listaAdicionais = [
  ...ferragens.map(f => ({
    ...f,
    origin: 'ferragem',
    label: `${f.codigo || ''} - ${f.nome}`,
    search: `${f.codigo || ''} ${f.nome}`.toLowerCase()
  })),
  ...perfis.map(p => ({
    ...p,
    origin: 'perfil',
    label: `${p.codigo || ''} - ${p.nome}`,
    search: `${p.codigo || ''} ${p.nome}`.toLowerCase(),
    preco: Number(p.preco)
  }))
];

  const formatarPreco = (valor: number) => 
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handlePrint = () => {
    if (itens.length === 0) {
      setModalConfig({ show: true, title: "Atenção", message: "Adicione um item antes de imprimir.", type: 'alert' });
      return;
    }
    window.print();
  };

const resetTotal = () => {
  setItens([]);
  setClienteSel(null);
  setBuscaCliente("");

  setVidroSel(null);
  setBuscaVidro("");
  setMostrarVidros(false);

  setModelo("");
  setFolhas("");
  setTipoBox("Padrão");
  setEstiloKit("Tradicional");
  setCorSel("Branco");

  setLarguraVao("");
  setAlturaVao("");
  setQuantidade("1");

  setEditandoId(null);
};


  const resetFormulario = () => {
  setModelo("");
  setFolhas("");
  setTipoBox("Padrão");
  setEstiloKit("Tradicional");
  setCorSel("Branco");

  setVidroSel(null);
  setBuscaVidro("");

  setLarguraVao("");
  setLarguraVaoB("");
  setAlturaVao("");
  setQuantidade("1");

  setEditandoId(null);

  // adicionais
  setAdicionaisSelecionados([]);
  setBuscaAdicional("");
  setValorAdicional("");
  setQuantidadeAdicional("1");
  setAdicionalSel(null);
};

  const handleNovoOrcamento = () => {
    setModalConfig({ show: true, title: "Novo Orçamento?", message: "Isso apagará tudo, inclusive o que está salvo.", type: 'confirm', action: resetTotal });
  };

  const handleExcluirItem = (id: number) => {
    setModalConfig({ show: true, title: "Excluir?", message: "Tem certeza?", type: 'delete', action: () => setItens(itens.filter(i => i.id !== id)) });
  };

  const handleMedidaChange = (value: string, setter: (val: string) => void) => {
    if (value.length <= 4) setter(value);
  };

  const arredondar5cm = (valor: number) => Math.ceil(valor / 50) * 50

  const adicionarAdicional = () => {
  // 1. Verificação de segurança: Se não houver nada selecionado, não faz nada
  if (!adicionalSel) {
    setModalConfig({ 
      show: true, 
      title: "Atenção", 
      message: "Selecione um adicional da lista antes de adicionar.", 
      type: 'alert' 
    });
    return;
  }

  // 2. Se chegou aqui, o adicionalSel existe e podemos ler o .codigo e .nome
  setAdicionaisSelecionados(prev => [
    ...prev,
    {
      codigo: adicionalSel.codigo || "S/C", // Adicionado fallback caso código seja nulo
      nome: adicionalSel.nome,
      quantidade: Number(quantidadeAdicional) || 1,
      valor: Math.max(0, Number(valorAdicional.toString().replace(',', '.')) || 0)
    }
  ]);

  // 3. Limpa os campos após adicionar
  setBuscaAdicional("");
  setValorAdicional("");
  setQuantidadeAdicional("1");
  setAdicionalSel(null);
  setMostrarAdicionais(false);
};

const excluirAdicionalNoForm = (indexParaRemover: number) => {
  setAdicionaisSelecionados(prev => prev.filter((_, idx) => idx !== indexParaRemover));
};

const calcularItemBox = ({
  modelo, folhas, tipoBox, estiloKit, corSel, vidroSel, larguraVao, larguraVaoB, alturaVao, quantidade, adicionaisSelecionados,clienteSel,
  kits, precosEspeciais}: any) => {

  const L = Number(larguraVao);
  const LB = Number(larguraVaoB || 0);
  const A = Number(alturaVao);
  const Qtd = Number(quantidade);

  // --- PREÇO DO VIDRO ---
  let precoM2Vidro = Number(vidroSel.preco);

  if (clienteSel) {
    const especial = precosEspeciais.find((p: any) =>
      String(p.cliente_id) === String(clienteSel.id) &&
      Number(p.vidro_id) === Number(vidroSel.id)
    );
    if (especial) precoM2Vidro = Number(especial.preco);
  }

  // --- PEÇAS ---
  let pecas: any[] = [];
  const altF = tipoBox === "Padrão" ? A - 35 : A - 55;
  const altM = tipoBox === "Padrão" ? A : A - 20;

  if (modelo === "Reto") {
    if (folhas === "2 folhas") {
      pecas = [
        { desc: 'F', l: L / 2, a: altF, q: 1 },
        { desc: 'M', l: (L / 2) + 50, a: altM, q: 1 }
      ];
    } else if (folhas === "3 folhas") {
      const fixo = L / 3;
      pecas = [
        { desc: 'F', l: fixo, a: altF, q: 2 },
        { desc: 'M', l: fixo + 100, a: altM, q: 1 }
      ];
    } else if (folhas === "4 folhas") {
      const fixo = L / 4;
      pecas = [
        { desc: 'F', l: fixo, a: altF, q: 2 },
        { desc: 'M', l: fixo + 50, a: altM, q: 2 }
      ];
    }
  } else if (modelo === "Canto") {
    if (folhas === "3 folhas") {
      pecas = [
        { desc: 'F (Canto)', l: L, a: altF, q: 1 },
        { desc: 'F', l: LB / 2, a: altF, q: 1 },
        { desc: 'M', l: (LB / 2) + 50, a: altM, q: 1 }
      ];
    } else if (folhas === "4 folhas") {
      pecas = [
        { desc: 'F (A)', l: L / 2, a: altF, q: 1 },
        { desc: 'M (A)', l: (L / 2) + 50, a: altM, q: 1 },
        { desc: 'F (B)', l: LB / 2, a: altF, q: 1 },
        { desc: 'M (B)', l: (LB / 2) + 50, a: altM, q: 1 }
      ];
    }
  }

  // --- KIT ---
  const larguraKitRef = modelo === "Canto" ? (L + LB) : L;

  const kitEncontrado = kits
    .filter((k: any) => {
      const matchCat = k.categoria === `Kit Box ${estiloKit}`;
      const matchCor = k.cores?.toLowerCase() === corSel.toLowerCase();
      const matchLarg = Number(k.largura) >= larguraKitRef;

      if (modelo === "Canto") {
        return matchCat && matchCor && matchLarg && k.nome?.toLowerCase().includes("canto");
      }

      return matchCat && matchCor && matchLarg;
    })
    .sort((a: any, b: any) => Number(a.largura) - Number(b.largura))[0];

  const precoKitUnidade = kitEncontrado
    ? Number(kitEncontrado.preco || kitEncontrado.preco_por_cor)
    : 0;

  // --- CÁLCULOS ---
const areaTotalM2 = pecas.reduce(
  (acc, p) => acc + (calcularM2Vidro(p.l, p.a) * p.q),
  0
);

  const vVidro = areaTotalM2 * precoM2Vidro * Qtd;
  const vKit = precoKitUnidade * Qtd;
  const vAdicionaisTotal = adicionaisSelecionados.reduce(
    (acc: number, a: any) => acc + (a.valor * a.quantidade * Qtd),
    0
  );

  return {
    pecas,
    kitEncontrado,
    precoKitUnidade,
    totalVidro: vVidro,
    totalKit: vKit,
    totalAdicionais: vAdicionaisTotal,
    total: vVidro + vKit + vAdicionaisTotal
  };
};


const adicionarItem = (confirmado = false) => {
  // 1. Definição da imagem e variáveis numéricas no topo (Corrige o erro de Runtime)
  const imagemCaminho = getImagemBox(modelo, folhas);
  const L = Number(larguraVao);
  const LB = Number(larguraVaoB);
  const A = Number(alturaVao); 
  const Qtd = Number(quantidade);

  // 2. Validação de Campos Vazios
  if (!vidroSel || !larguraVao || !alturaVao || !modelo || !folhas || (modelo === "Canto" && !larguraVaoB)) {
    setModalConfig({ 
      show: true, 
      title: "Atenção", 
      message: "Preencha Modelo, Folhas, Medidas e Vidro antes de adicionar.", 
      type: 'alert' 
    });
    return;
  }

  // 3. Alerta de Altura usando o seu Modal Padrão (Substitui o window.confirm)
  if (A > 1950 && !confirmado) {
    const temPerfilAdicional = adicionaisSelecionados.some(adic => 
      adic.nome.toLowerCase().includes("perfil")
    );

    if (!temPerfilAdicional) {
      setModalConfig({ 
        show: true, 
        title: "Altura Especial", 
        message: "Este box tem mais de 1,95m de altura. Verifique se é necessário adicionar Perfis de Prolongamento nos adicionais.", 
        type: 'confirm', 
        action: () => adicionarItem(true) // Chama a si mesmo passando 'true' para pular este bloco
      });
      return; // Interrompe a execução para esperar a decisão do usuário
    }
  }

  // 4. Início dos Cálculos
let precoM2Vidro = Number(vidroSel.preco);

if (clienteSel && precosEspeciais.length > 0) {
  // Como agora a lista só tem preços DESTE cliente (devido ao useEffect acima),
  // só precisamos conferir se o vidro_id bate.
  const especial = precosEspeciais.find(p => 
    Number(p.vidro_id) === Number(vidroSel.id)
  );

  if (especial) {
    precoM2Vidro = Number(especial.preco);
    console.log("Preço especial aplicado com sucesso!");
  }
}

  let pecas: { desc: string, l: number, a: number, q: number }[] = [];
  const altF = tipoBox === "Padrão" ? A - 35 : A - 55;
  const altM = tipoBox === "Padrão" ? A : A - 20;

  if (modelo === "Reto") {
    if (folhas === "2 folhas") {
      pecas = [{ desc: 'F', l: L / 2, a: altF, q: 1 }, { desc: 'M', l: (L / 2) + 50, a: altM, q: 1 }];
    } else if (folhas === "3 folhas") {
      const fixo = L / 3;
      pecas = [{ desc: 'F', l: fixo, a: altF, q: 2 }, { desc: 'M', l: fixo + 100, a: altM, q: 1 }];
    } else if (folhas === "4 folhas") {
      const fixo = L / 4;
      pecas = [{ desc: 'F', l: fixo, a: altF, q: 2 }, { desc: 'M', l: fixo + 50, a: altM, q: 2 }];
    }
  } else if (modelo === "Canto") {
    if (folhas === "3 folhas") {
      pecas = [{ desc: 'F (Canto)', l: L, a: altF, q: 1 }, { desc: 'F', l: LB / 2, a: altF, q: 1 }, { desc: 'M', l: (LB / 2) + 50, a: altM, q: 1 }];
    } else if (folhas === "4 folhas") {
      pecas = [{ desc: 'F (A)', l: L / 2, a: altF, q: 1 }, { desc: 'M (A)', l: (L / 2) + 50, a: altM, q: 1 }, { desc: 'F (B)', l: LB / 2, a: altF, q: 1 }, { desc: 'M (B)', l: (LB / 2) + 50, a: altM, q: 1 }];
    }
  }

  const larguraKitRef = modelo === "Canto" ? (L + LB) : L;
  const kitEncontrado = kits.filter(k => {
    const matchCat = k.categoria === `Kit Box ${estiloKit}`;
    const matchCor = k.cores?.toLowerCase() === corSel.toLowerCase();
    const matchLarg = Number(k.largura) >= larguraKitRef;
    if (modelo === "Canto") return matchCat && matchCor && matchLarg && k.nome?.toLowerCase().includes("canto");
    return matchCat && matchCor && matchLarg;
  }).sort((a, b) => Number(a.largura) - Number(b.largura))[0];

  const precoKitUnidade = kitEncontrado ? Number(kitEncontrado.preco || kitEncontrado.preco_por_cor) : 0;
  const areaTotalM2 = pecas.reduce((acc, p) => acc + ((arredondar5cm(p.l) * arredondar5cm(p.a)) / 1000000) * p.q, 0);
  
  const vVidro = (areaTotalM2 * precoM2Vidro) * Qtd;
  const vKit = precoKitUnidade * Qtd;
  const vAdicionaisTotal = adicionaisSelecionados.reduce(
    (acc, a) => acc + (a.valor * a.quantidade * Qtd),
    0
  );

  // 5. Criação do Objeto Item (imagemCaminho agora está acessível)
  const novoItem = {
    id: editandoId || Date.now(),
    descricao: `Box ${modelo} ${folhas} ${tipoBox}`,
    imagem: imagemCaminho,
    vidroInfo: `${vidroSel.nome} ${vidroSel.espessura}mm - ${vidroSel.tipo}`,
    kitInfo: kitEncontrado ? `${kitEncontrado.nome} - ${formatarPreco(precoKitUnidade)}` : "Kit não localizado",
    adicionais: adicionaisSelecionados,
    medidaVao: modelo === "Canto" 
        ? [`L(A): ${L} + L(B): ${LB}`, `A: ${A}mm`]
        : `L: ${L} x A: ${A}mm`,
    pecas: pecas,
    quantidade: Qtd,
    totalVidro: vVidro,
    totalKit: vKit,
    totalAdicionais: vAdicionaisTotal,
    total: vVidro + vKit + vAdicionaisTotal,
    raw: { 
      tipoBox,
      estiloKit,
      corSel,
      vidroId: vidroSel.id,
      // Aqui separamos as larguras para não "grudar" os números
      larguraVao: Number(L), 
      larguraVaoB: modelo === "Canto" ? Number(LB) : null,
      alturaVao: Number(A),
      quantidade: Qtd,
      modelo,
      folhas
    }
  };

  // 6. Atualização do Estado com Troca Inteligente por Tipo
  if (editandoId) {
    const itemOriginal = itens.find(i => i.id === editandoId);
    const vidroAntigoId = itemOriginal?.raw.vidroId;
    const novoVidroId = vidroSel.id;

    // Se o vidro mudou, perguntamos se quer mudar os "irmãos" (mesmo tipo de vidro)
    if (vidroAntigoId !== novoVidroId) {
      const nomeVidroAntigo = itemOriginal?.vidroInfo.split('-')[0] || "deste tipo";
      const outrosDoMesmoTipo = itens.filter(i => i.raw.vidroId === vidroAntigoId && i.id !== editandoId);

      if (outrosDoMesmoTipo.length > 0 && window.confirm(`Você alterou este item para ${vidroSel.nome}. Deseja aplicar essa mesma troca para os outros ${outrosDoMesmoTipo.length} itens que também são ${nomeVidroAntigo}?`)) {
        
        const listaAtualizada = itens.map(item => {
          // Se for o que estou editando OU se for do mesmo tipo do antigo
          if (item.id === editandoId || item.raw.vidroId === vidroAntigoId) {
            const r = item.raw;
            const calc = calcularItemBox({
              ...r,
              vidroSel: vidroSel, // Aplica o novo vidro
              adicionaisSelecionados: item.adicionais,
              clienteSel, kits, precosEspeciais
            });

            return {
              ...item,
              vidroInfo: `${vidroSel.nome} ${vidroSel.espessura}mm - ${vidroSel.tipo}`,
              pecas: calc.pecas,
              totalVidro: calc.totalVidro,
              totalKit: calc.totalKit,
              totalAdicionais: calc.totalAdicionais,
              total: calc.total,
              raw: { ...r, vidroId: vidroSel.id }
            };
          }
          return item;
        });
        setItens(listaAtualizada);
      } else {
        // Se recusar ou não houver outros, salva só o atual
        setItens(itens.map(i => i.id === editandoId ? novoItem : i));
      }
    } else {
      // Se não mudou o vidro, apenas salva a edição (medidas, etc)
      setItens(itens.map(i => i.id === editandoId ? novoItem : i));
    }
  } else {
    setItens(prev => [...prev, novoItem]);
  }

  // 7. Reset do Formulário e Foco
  setLarguraVao("");
  setLarguraVaoB("");
  setAlturaVao("");
  setQuantidade("1");
  setEditandoId(null);
  setAdicionaisSelecionados([]);
  
  setTimeout(() => {
    larguraRef.current?.focus();
  }, 100);
};


  const editarItem = (item: any) => {
    const r = item.raw;
    const vEncontrado = vidros.find(v => v.id === r.vidroId);
    setModelo(r.modelo); setFolhas(r.folhas); setTipoBox(r.tipoBox); setEstiloKit(r.estiloKit);
    setCorSel(r.corSel); setVidroSel(vEncontrado);
    if (vEncontrado) setBuscaVidro(`${vEncontrado.nome} ${vEncontrado.espessura}mm - ${vEncontrado.tipo}`);
    setLarguraVao(String(r.larguraVao)); 
    setLarguraVaoB(String(r.larguraVaoB || "")); 
    setAlturaVao(String(r.alturaVao)); 
    setLarguraVao(String(r.larguraVao)); 
    setLarguraVaoB(String(r.larguraVaoB || "")); 
    setAlturaVao(String(r.alturaVao));

    setQuantidade(String(r.quantidade));
    setAdicionaisSelecionados(item.adicionais || []);
    setBuscaAdicional("");
    setValorAdicional("");
    setQuantidadeAdicional("1");
    setAdicionalSel(null);
    setEditandoId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const totalVidros = itens.reduce((acc, i) => acc + i.totalVidro, 0);
  const totalKits = itens.reduce((acc, i) => acc + i.totalKit, 0);
  const totalAdicionais = itens.reduce((acc, i) => acc + (i.totalAdicionais || 0), 0);
  const totalOrcamento = totalVidros + totalKits + totalAdicionais;
  const previewImagem = getImagemBox(modelo, folhas);

  const listaVidros = vidros.filter(v =>
  `${v.nome} ${v.espessura} ${v.tipo}`.toLowerCase().includes(buscaVidro.toLowerCase())
);

const modeloRef = useRef<HTMLSelectElement>(null);
const gerarResumoMateriais = () => {
  const resumo = {
    vidros: {} as Record<string, { m2: number; pecas: number }>,
    kits: {} as Record<string, number>,
    adicionais: {} as Record<string, number>
  };

  itens.forEach(item => {
    // 1. Agrupar Vidros
    const vKey = item.vidroInfo;
    if (!resumo.vidros[vKey]) resumo.vidros[vKey] = { m2: 0, pecas: 0 };
    
    const m2TotalItem = item.pecas.reduce(
  (acc: number, p: any) => acc + (calcularM2Vidro(p.l, p.a) * p.q),
  0
);
    resumo.vidros[vKey].m2 += m2TotalItem * Number(item.quantidade);
    resumo.vidros[vKey].pecas += item.pecas.reduce((acc: number, p: any) => acc + p.q, 0) * Number(item.quantidade);

    // 2. Agrupar Kits
    const kKey = `${item.kitInfo} - ${item.descricao.split(' ')[0]}`; // Ex: Branco - Reto
    resumo.kits[kKey] = (resumo.kits[kKey] || 0) + Number(item.quantidade);

    // 3. Agrupar Adicionais
    item.adicionais?.forEach((adic: any) => {
      resumo.adicionais[adic.nome] = (resumo.adicionais[adic.nome] || 0) + (Number(adic.quantidade) * Number(item.quantidade));
    });
  });

  return resumo;
};
const resumo = gerarResumoMateriais();
const [nomeObra, setNomeObra] = useState("");
const [nomeObraTemp, setNomeObraTemp] = useState("");

const [aguardandoImpressao, setAguardandoImpressao] = useState(false);

const handleImprimir = () => {
  if (modoProducao) {
    // Abrimos o modal. O nomeObraTemp já é atualizado pelo input do modal.
    setModalConfig({
      show: true,
      title: "Nome da Obra",
      message: "Informe o nome da obra (opcional):",
      type: "confirm",
      action: () => {
        // PASSO 1: Atualiza o estado principal
        setNomeObra(nomeObraTemp);
        
        // PASSO 2: Fecha o modal imediatamente
        setModalConfig((prev) => ({ ...prev, show: false }));

        // PASSO 3: Imprime (O navegador deve detectar a mudança do estado no render seguinte)
        window.print();
      }
    });
    return;
  }
  window.print();
};
const handleGerarPedido = () => {
  if (!clienteSel?.nome) {
    setShowModalCliente(true); 
  } else {
    window.print(); 
  }
};

const aplicarTrocaVidroEmLote = () => {
  if (!vidroLoteSel) return;
  const idsParaTrocar = selecionados.length > 0 
    ? selecionados 
    : itens.map(i => i.id);

  const itensRecalculados = itens.map(item => {
      if (idsParaTrocar.includes(item.id)) {
      return {
        ...item,
        raw: {
          ...item.raw,
          vidroId: vidroLoteSel.id
        },
        vidroInfo: `${vidroLoteSel.nome} ${vidroLoteSel.espessura}mm - ${vidroLoteSel.tipo}`,
      };
    }
   return item;
  });

  setItens(itensRecalculados);
  setSelecionados([]);   
  setMostrarModalTrocaVidro(false);
  setBuscaVidroLote("");
  setVidroLoteSel(null);
  
  setModalConfig({
    show: true,
    title: "Vidro alterado",
    message: `A troca foi aplicada a ${idsParaTrocar.length} item(ns). Deseja recalcular os valores?`,
    type: "confirm",
    action: () => {
      recalcularTodosOsItens();
    }
  });
};

const abrirConfirmacaoRecalculo = () => {
  if (itens.length === 0) {
    setModalConfig({
      show: true,
      title: "Atenção",
      message: "Não há itens para recalcular.",
      type: "alert"
    });
    return;
  }

  setMostrarModalConfirmarRecalculo(true);
};


const recalcularTodosOsItens = () => {
  setItens(itensAtuais =>
    itensAtuais.map(item => {
      const r = item.raw;
      const vidroAtual = vidros.find(v => v.id === r.vidroId);
      if (!vidroAtual) return item;

      const calc = calcularItemBox({
        ...r,
        vidroSel: vidroAtual,
        adicionaisSelecionados: item.adicionais,
        clienteSel,
        kits,
        precosEspeciais
      });

      return {
        ...item,
        pecas: calc.pecas,
        totalVidro: calc.totalVidro,
        totalKit: calc.totalKit,
        totalAdicionais: calc.totalAdicionais,
        total: calc.total,
        kitInfo: calc.kitEncontrado
          ? `${calc.kitEncontrado.nome} - ${formatarPreco(calc.precoKitUnidade)}`
          : "Kit não localizado"
      };
    })
  );

  setMostrarModalRecalculo(false);
};

   return (
    <div className="p-4 sm:p-8 bg-[#F8FAFC] min-h-screen text-[#1C415B] font-sans relative">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; padding: 0 !important; }
          .printable-area { margin: 0 !important; padding: 0 !important; }
          .print-bg-primary { 
            background-color: #1C415B !important; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            color: white !important;
          }
          .divide-y-dashed tr {
            border-bottom: 1px dashed #D1D5DB !important;
          }
          .divide-y-dashed tr:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>

      {/* MODAL */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm no-print px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} style={{ color: modalConfig.type === 'delete' ? theme.danger : theme.secondary }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-center">{modalConfig.title}</h3>
            <p className="text-gray-500 text-sm mb-6 text-center">{modalConfig.message}</p>
            {modalConfig.title === "Nome da Obra" && (
                <input 
                  type="text"
                  value={nomeObraTemp}
                  onChange={(e) => setNomeObraTemp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Em vez de window.print aqui, chamamos a action do modal
                      if(modalConfig.action) modalConfig.action(); 
                      setModalConfig((prev) => ({ ...prev, show: false }));
                    }
                  }}
                  placeholder="Ex: Obra Apto 302"
                  className="w-full mt-2 p-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#92D050]"
                />
              )}

            <div className="flex gap-3">
              {(modalConfig.type === 'confirm' || modalConfig.type === 'delete') && (
                <button onClick={() => setModalConfig({...modalConfig, show: false})} className="flex-1 py-3 rounded-xl font-semibold text-gray-400 border border-gray-100">Cancelar</button>
              )}
              <button onClick={() => { if(modalConfig.action) modalConfig.action(); setModalConfig({...modalConfig, show: false}); }} className="flex-1 py-3 rounded-xl font-semibold text-white shadow-md" style={{ backgroundColor: modalConfig.type === 'delete' ? theme.danger : theme.primary }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {mostrarModalTrocaVidro && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm no-print px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
            
            <h3 className="text-lg font-bold mb-2 text-center text-[#1C415B]">
              Trocar cor vidros
            </h3>

            <p className="text-xs text-gray-500 mb-4 text-center">
              Esta ação irá alterar o vidro de <b>todos os itens do orçamento</b>.
            </p>

            {/* INPUT DE VIDRO */}
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                placeholder="Buscar novo vidro..."
                value={buscaVidroLote}
                onChange={(e) => {
                  setBuscaVidroLote(e.target.value);
                  setVidroLoteSel(null);
                  setVidroLoteIndex(0);
                }}
              />

              {buscaVidroLote && (
                <div className="absolute z-[120] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-40 overflow-auto">
                  {vidros
                    .filter(v =>
                      `${v.nome} ${v.espessura} ${v.tipo}`
                        .toLowerCase()
                        .includes(buscaVidroLote.toLowerCase())
                    )
                    .map((v, idx) => (
                      <div
                        key={v.id}
                        className={`p-2 cursor-pointer text-[11px] border-b last:border-0
                          ${idx === vidroLoteIndex ? "bg-[#F0FDF4]" : "hover:bg-[#F0FDF4]"}`}
                        onClick={() => {
                          setVidroLoteSel(v);
                          setBuscaVidroLote(`${v.nome} ${v.espessura}mm - ${v.tipo}`);
                        }}
                      >
                        <div className="font-bold">{v.nome}</div>
                        <div className="text-gray-400">{v.espessura}mm - {v.tipo}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {mostrarModalRecalculo && (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm no-print px-4">
    <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
      
      <h3 className="text-lg font-bold text-[#1C415B] mb-3">
        Recalcular orçamento?
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        A cor do vidro foi alterada.<br />
        Deseja recalcular os valores com base nessa nova cor?
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => setMostrarModalRecalculo(false)}
          className="flex-1 py-3 rounded-xl border text-gray-500 font-medium"
        >
          Não agora
        </button>

        <button
          onClick={() => {
            setMostrarModalRecalculo(false);
            recalcularTodosOsItens();
          }}
          className="flex-1 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: theme.primary }}
        >
          Recalcular agora
        </button>
      </div>
    </div>
  </div>
)}


      {/* AÇÕES */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => {
            setMostrarModalTrocaVidro(false);
            setBuscaVidroLote("");
            setVidroLoteSel(null);
          }}
          className="flex-1 py-3 rounded-xl font-semibold text-gray-400 border"
        >
          Cancelar
        </button>

        <button
          disabled={!vidroLoteSel}
          onClick={() => aplicarTrocaVidroEmLote()}
          className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: theme.primary }}
        >
          Aplicar troca
        </button>
      </div>
    </div>
  </div>
)}
          
      {/* HEADER */}
      <header className="no-print">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => (window.location.href = "/")} className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}><Home className="w-5 h-5 text-white" /></button>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">Cálculo Box Frontal</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNovoOrcamento} className="px-4 py-2 rounded-xl font-medium border bg-white" style={{ color: theme.primary, borderColor: theme.primary }}>Novo Orçamento</button>
            <button onClick={handlePrint} className="px-4 py-2 rounded-xl font-medium border bg-white flex items-center gap-2" style={{ color: theme.primary, borderColor: theme.primary }}><Printer size={18} /> Gerar PDF</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4 relative no-print">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente:</span>
          <div className="relative flex-1 max-w-md"> 
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              className="w-full py-1.5 px-2 bg-transparent border-b border-gray-200 outline-none text-sm font-medium focus:border-[#92D050] transition-colors" 
              placeholder="Pesquisar cliente..." 
              value={buscaCliente} 
              onFocus={() => {
                if(buscaCliente.length > 0) setMostrarClientes(true);
              }}
              onBlur={() => setTimeout(() => setMostrarClientes(false), 200)} 
              onChange={(e) => { 
                const valor = e.target.value;
                setBuscaCliente(valor); 
                setClienteSel(null); 
                setMostrarClientes(valor.length > 0); 
                setClienteIndex(0); // Reseta o índice ao digitar
              }}
              onKeyDown={(e) => {
                if (!mostrarClientes) return;

                const listaFiltrada = clientes.filter(c => 
                  c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
                );

                if (e.key === " ") {
                  e.preventDefault();
                  setClienteIndex(prev => Math.min(prev + 1, listaFiltrada.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setClienteIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    const escolhido = listaFiltrada[clienteIndex];
                    if (escolhido) {
                      setClienteSel(escolhido);
                      setBuscaCliente(escolhido.nome);
                      setMostrarClientes(false);
                      // Removemos o foco da largura e deixamos APENAS no modelo
                      setTimeout(() => modeloRef.current?.focus(), 100); 
                    }
                  }
              }}
            />            
            <button 
              onClick={() => window.location.href = "/clientes"} 
              className="p-2 rounded-lg text-white shadow-sm flex-shrink-0 hover:opacity-90 transition-opacity" 
              style={{ backgroundColor: theme.primary }}
            >
              <UserPlus size={18} />
            </button>
          </div>

          {/* LISTA COM DESTAQUE DE SELEÇÃO */}
          {mostrarClientes && buscaCliente.length > 0 && (
            <div className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {clientes
                  .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
                  .map((c, idx) => (
                    <div 
                      key={c.id} 
                      className={`p-3 text-sm border-b border-gray-50 last:border-none flex justify-between items-center transition-colors
                        ${idx === clienteIndex ? 'bg-blue-50 border-l-4 border-l-[#92D050]' : 'hover:bg-gray-50'}`} 
                      onMouseEnter={() => setClienteIndex(idx)} // Sincroniza o mouse com o teclado
                      onClick={() => { 
                        setClienteSel(c); 
                        setBuscaCliente(c.nome); 
                        setMostrarClientes(false);
                        larguraRef.current?.focus();
                      }}
                    >
                      <span className={`font-medium ${idx === clienteIndex ? 'text-[#1C415B]' : 'text-gray-700'}`}>
                        {c.nome}
                      </span>
                      {idx === clienteIndex && (
                        <span className="text-[10px] text-[#92D050] font-bold uppercase tracking-tighter">Enter para selecionar</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
       {/* INPUTS DE CÁLCULO */}
        <div className={`bg-white p-6 rounded-3xl shadow-sm border-2 mb-8 ${editandoId ? 'border-[#92D050]' : 'border-gray-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-300 uppercase">Modelo / Folhas</label>
                    {/* ADICIONADO border-gray-200 ABAIXO */}
                    <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl mb-1 text-xs" value={modelo} onChange={e => { setModelo(e.target.value); setLarguraVaoB(""); }}>
                        <option value="">Modelo...</option><option value="Reto">Reto</option><option value="Canto">Canto</option>
                    </select>
                    {/* ADICIONADO border-gray-200 ABAIXO */}
                    <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" value={folhas} onChange={e => setFolhas(e.target.value)}>
                        <option value="">Folhas...</option><option value="2 folhas">2 Folhas</option><option value="3 folhas">3 Folhas</option><option value="4 folhas">4 Folhas</option>
                    </select>
                </div>
                <div className="col-span-1">
                    <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">Tipo / Estilo</label>
                    {/* ADICIONADO border-gray-200 ABAIXO */}
                    <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl mb-1 text-xs" value={tipoBox} onChange={e => setTipoBox(e.target.value as any)}>
                        <option value="Padrão">Box Padrão</option><option value="Até o teto">Até o Teto</option>
                    </select>
                    {/* ADICIONADO border-gray-200 ABAIXO */}
                    <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" value={estiloKit} onChange={e => setEstiloKit(e.target.value as any)}>
                        <option value="Tradicional">Tradicional</option><option value="Quadrado">Quadrado</option>
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block border-gray-200">Vidro / Cor Kit</label>
                    <div className="relative mb-1">
                        {/* ADICIONADO border-gray-200 ABAIXO */}
                        <input
                         type="text"
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                        placeholder="Buscar vidro..."
                        value={buscaVidro}
                        onFocus={() => setMostrarVidros(true)}
                        onBlur={() => setTimeout(() => setMostrarVidros(false), 150)}
                        onChange={(e) => {
                          setBuscaVidro(e.target.value);
                          setVidroSel(null);
                          setMostrarVidros(true);
                          setVidroIndex(0);
                        }}
                        onKeyDown={(e) => {
                          if (!mostrarVidros) return;

                       if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setVidroIndex(prev => Math.min(prev + 1, listaVidros.length - 1));
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setVidroIndex(prev => Math.max(prev - 1, 0));
                          }
                          if (e.key === "Enter") {
                          e.preventDefault();
                          const escolhido = listaVidros[vidroIndex]; 
                          if (escolhido) {
                            setVidroSel(escolhido);
                            setBuscaVidro(`${escolhido.nome} ${escolhido.espessura}mm - ${escolhido.tipo}`);
                            setMostrarVidros(false);
                            larguraRef.current?.focus();
                          }
                        }
                        }}
                      />
                        {mostrarVidros && (
                            <div className="absolute z-[60] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-48 overflow-auto no-print">
                                {listaVidros.map((v, index) => (
                                  <div
                                    key={v.id}
                                    className={`p-2.5 cursor-pointer text-[11px] border-b last:border-0 
                                      ${index === vidroIndex ? "bg-[#F0FDF4]" : "hover:bg-[#F0FDF4]"}`}
                                    onClick={() => {
                                      setVidroSel(v);
                                      setBuscaVidro(`${v.nome} ${v.espessura}mm - ${v.tipo}`);
                                      setMostrarVidros(false);
                                    }}
                                  >
                                    <div className="font-bold">{v.nome}</div><div className="text-gray-400">{v.espessura}mm - {v.tipo}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" value={corSel} onChange={e => setCorSel(e.target.value)}>
                        <option value="Branco">Branco</option><option value="Preto">Preto</option><option value="Fosco">Fosco</option>
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block ">
                      {modelo === "Canto" ? (folhas === "3 folhas" ? "Fixo Canto (mm)" : "Lado A (mm)") : "Largura (mm)"}
                    </label>
                    <input
                        ref={larguraRef}
                        type="number"
                        className="w-full p-2 bg-gray-50 border border-gray-200 border-gray-300 rounded-xl font-medium"
                        value={larguraVao}
                        onChange={e => handleMedidaChange(e.target.value, setLarguraVao)}
                        onKeyDown={(e) => {if (e.key === "Enter") alturaRef.current?.focus();
                    }}
                      />
                  </div>
                
                <div className="col-span-1">
                    {modelo === "Canto" ? (
                      <>
                        <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">
                          {folhas === "3 folhas" ? "Vão 2F (mm)" : "Lado B (mm)"}
                        </label>
                        <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium" value={larguraVaoB} onChange={e => handleMedidaChange(e.target.value, setLarguraVaoB)}/>
                      </>
                    ) : (
                      <>
                        <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block  border-gray-200">Altura (mm)</label>
                        <input
                        ref={alturaRef}
                        type="number"
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                        value={alturaVao}
                        onChange={e => handleMedidaChange(e.target.value, setAlturaVao)}
                      onKeyDown={(e) => {if (e.key === "Enter") quantidadeRef.current?.focus();}}/>
                      </>
                    )}
                </div>

                <div className="col-span-1 grid grid-cols-2 gap-2">
                  {modelo === "Canto" && (
                    <div>
                      <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">Alt (mm)</label>
                      <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium" value={alturaVao} onChange={e => handleMedidaChange(e.target.value, setAlturaVao)}/>
                    </div>
                  )}
                  <div className={modelo !== "Canto" ? "col-span-2" : ""}>
                    <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">Qtd</label>
                    <input
                      ref={quantidadeRef}
                      type="number"
                      min={1}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                      value={quantidade}
                      onChange={e => setQuantidade(e.target.value)}
                      onKeyDown={(e) => {
                       if (e.key === "Enter") adicionarRef.current?.click();
                      }}
                    />
                  </div>
                </div>

                {/* ADICIONAIS PUXANDO DO SUPABASE */}
                <div className="col-span-full mt-2 pt-2 border-t border-dashed border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                   <div ref={adicionalContainerRef} className="md:col-span-4 relative" >
                      <label className="text-[10px] uppercase text-[#92D050] mb-1 flex items-center gap-1 ">
                        <PlusCircle size={12}/> Adicional (Ferragens/Perfis)
                      </label>
                      <div className="relative">
                        {!buscaAdicional && (
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        )}
                       <input 
                        ref={adicionalInputRef}
                        type="text"
                        className="w-full p-2 pl-8 bg-gray-0 border border-gray-200 rounded-xl text-xs"
                        placeholder="Código ou nome do adicional"
                        value={buscaAdicional}
                        onFocus={() => setMostrarAdicionais(true)}
                        onChange={(e) => {
                          setBuscaAdicional(e.target.value);
                          setAdicionalSel(null);
                          setIndiceAdicional(0);
                          setMostrarAdicionais(true);
                        }}
                        onKeyDown={(e) => {
                          if (!mostrarAdicionais) return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setIndiceAdicional((prev) =>
                              Math.min(prev + 1, listaAdicionais.length - 1)
                            );
                          }

                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setIndiceAdicional((prev) =>
                              Math.max(prev - 1, 0)
                            );
                          }

                          if (e.key === "Enter") {
                            e.preventDefault();
                            const listaFiltrada = listaAdicionais.filter(a => a.search.includes(buscaAdicional.toLowerCase()));
                            const item = listaFiltrada[indiceAdicional]; 
                            if (item) {
                              setAdicionalSel(item);
                              setBuscaAdicional(item.label);
                              setValorAdicional(String(item.preco || 0));
                              setMostrarAdicionais(false);
                              setTimeout(() => qtdAdicionalRef.current?.focus(), 100);
                            }
                          }
                        }}
                      />

                      </div>
                      <div className="md:col-span-1">
                      <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">
                        Qtd Adic.
                      </label>
                      <input
                      ref={qtdAdicionalRef}
                      type="number"
                      min={1}
                      className="w-full p-2 bg-[#F0FDF4] border border-[#D1FAE5] rounded-xl text-xs font-bold"
                      value={quantidadeAdicional}
                      onChange={e => setQuantidadeAdicional(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          btnAddAdicionalRef.current?.click();
                        }
                      }}
                    />
                    </div>
                      {mostrarAdicionais && (
                        <div className="absolute z-[70] w-full mt-1 bg-white border rounded-xl shadow-xl max-h-48 overflow-auto no-print">
                            {listaAdicionais .filter(a => a.search.includes(buscaAdicional.toLowerCase())).map((a, idx) => (
                                <div key={idx} className={`p-2.5 cursor-pointer text-[11px] border-b last:border-0 ${idx === indiceAdicional ? "bg-[#F0FDF4]" : "hover:bg-[#F0FDF4]"}`} 
                                     onClick={() => { 
                                       setAdicionalSel(a); 
                                       setBuscaAdicional(a.label); 
                                       setValorAdicional(String(a.preco));
                                       setMostrarAdicionais(false); 
                                       setQuantidadeAdicional("1");
                                     }}>
                                    <div>
                                      <div className="font-bold">
                                      {a.codigo && <span className="text-[9px] text-gray-400 mr-1">{a.codigo}</span>}
                                      {a.nome}
                                    </div>
                                      <div className="text-[9px] text-gray-400 uppercase">{a.origin} | {a.cores || 'Sem cor'}</div>
                                    </div>
                                    <div className="font-bold text-[#1C415B]">{formatarPreco(a.preco)}</div>
                                </div>
                            ))}
                        </div>
                      )}
                   </div>
                   <div className="md:col-span-1">
                      <label className="text-[10px] font-medium uppercase text-gray-400 mb-1 block">Valor Unit.</label>
                      <input type="number" className="w-full p-2 bg-[#F0FDF4] border border-[#D1FAE5] rounded-xl text-xs font-bold" placeholder="0,00" value={valorAdicional} onChange={e => setValorAdicional(e.target.value)} />
                   </div>
                   <button
                      ref={btnAddAdicionalRef}
                      className="w-full py-2 rounded-xl font-bold text-xs uppercase shadow-sm transition-transform active:scale-95"
                      style={{ backgroundColor: theme.secondary, color: theme.primary }}
                      onClick={() => {
                        adicionarAdicional();
                        setTimeout(() => adicionalInputRef.current?.focus(), 100);
                      }}
                    >
                      + Adicional
                    </button>
                    
                      <button
                      ref={adicionarRef}
                      onClick={() => {adicionarItem();setTimeout(() => larguraRef.current?.focus(), 100);}}
                      className="w-full text-white py-3 rounded-xl font-bold text-xs uppercase shadow-md transition-transform active:scale-95"
                      style={{ backgroundColor: theme.primary }}
                    >
                      {editandoId ? "SALVAR" : "ADICIONAR"}
                    </button>
                  <button
                      type="button"
                      onClick={() => setMostrarModalTrocaVidro(true)}
                      className="mt-2 text-[10px] flex items-center gap-1 text-gray-400 hover:text-[#92D050] transition-colors uppercase font-bold tracking-wider"
                    >
                      <RefreshCw size={10} className="animate-spin-slow" />
                      Trocar vidro de todos os itens
                    </button>
                  </div>

  {/* LISTA DE ADICIONAIS SELECIONADOS */}
            {adicionaisSelecionados.length > 0 && (
            <div className="col-span-full mt-2 space-y-1">
              {adicionaisSelecionados.map((a, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_50px_80px_30px] items-center bg-gray-50 rounded-lg px-3 py-1 text-[11px]"
                >
                  <span className="truncate font-medium text-left">
                    {a.codigo && `${a.codigo} - `}{a.nome}
                  </span>
                  <span className="text-center text-gray-500">x{a.quantidade}</span>
                  <span className="text-right font-bold" style={{ color: theme.primary }}>
                    {formatarPreco(a.valor)}
                  </span>
                  
                  {/* BOTÃO DE EXCLUIR: Só aparece se estivermos editando um item ou se houver algo para remover */}
                  <button 
                    onClick={() => excluirAdicionalNoForm(idx)}
                    className="flex justify-end text-red-500 hover:text-red-700 transition-colors"
                    title="Remover adicional"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
            </div>
            <div className="lg:col-span-3 flex flex-col items-center justify-center border-l border-gray-100 pl-6 text-center">
                <div className="w-60 h-60 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-dashed border border-gray-200">
                    {previewImagem ? <img src={previewImagem} alt="Preview" className="w-full h-full object-contain p-2" /> : (
                      <div className="text-gray-400 text-[10px]">
                        <ImageIcon className="mx-auto mb-1 opacity-20" size={30} />
                        {modelo && folhas ? "NÃO EXISTE" : "SELECIONE"}
                      </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </header>


{/* ABINHAS DE NAVEGAÇÃO */}
<div className="flex items-center gap-2 mb-6 no-print"> 
  <button 
    onClick={() => { setModoProducao(false); setModoSeparacao(false); }}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!modoProducao && !modoSeparacao ? 'bg-white shadow-sm border border-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <Search size={16} /> Voltar para Edição
  </button>

  <button 
    onClick={() => { setModoProducao(true); setModoSeparacao(false); }}
    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${modoProducao ? 'bg-[#1C415B] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
  >
    <Package size={16} /> Pedido de Produção
  </button>

  <button 
    onClick={() => { setModoSeparacao(true); setModoProducao(false); }}
    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${modoSeparacao ? 'bg-[#1C415B] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
  >
    <ClipboardList size={16} /> Separação de Materiais
  </button>
</div>

        {(modoProducao || modoSeparacao) && (
          <button 
            onClick={handleImprimir}
            className="no-print fixed bottom-10 right-10 bg-[#1C415B] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50"
          >
            <Printer size={28} />
          </button>
        )}

{/* ÁREA DE IMPRESSÃO */}
<main className="printable-area ">

  {/* 1. CABEÇALHO */}
  <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-100">
    <div>
      <h2 className="text-2xl font-bold uppercase tracking-tighter" style={{ color: theme.primary }}>
        {modoSeparacao 
          ? "Relatório de Separação de Materiais" 
          : modoProducao 
            ? "Ordem de Produção / Pedido" 
            : "Orçamento de Vidros"}
      </h2>
      
            <div className="mt-2 space-y-0.5">
           <p className="text-[12px] font-normal" style={{ color: theme.primary }}>
    Emissão: {new Date().toLocaleDateString('pt-BR')}
  </p>
        
            <div className="mt-4 space-y-1">
             <p className="text-[12px] font-normal" style={{ color: theme.primary }}>
    Cliente: <strong className="uppercase">{clienteSel?.nome || "Consumidor"}</strong>
  </p>
              {nomeObraTemp && (
    <p className="text-[12px] font-normal" style={{ color: theme.primary }}>
      Obra: <strong className="uppercase">{nomeObraTemp}</strong>
    </p>
              )}
            </div>
          </div>
        </div>
                
          <div className="w-40">
            <img src="/logo.png" alt="Logo" className="w-full h-auto object-contain" />
            </div>
         </div>
       
        {/* 2. CONTEÚDO CONDICIONAL */}
        {(!modoProducao && !modoSeparacao) ? (
          /* --- MODO ORÇAMENTO --- */
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="print-bg-primary" style={{ backgroundColor: theme.primary }}>
                  <tr className="text-white text-xs uppercase font-bold">
                    <th className="p-4">Descrição / Vidro</th>
                    <th className="p-4 text-center">Qtd</th>
                    <th className="p-4 text-center">Medida do Vão (MM)</th>
                    <th className="p-4 text-center">Peças (MM)</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 divide-y-dashed text-[13px]">
                  {itens.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                      <td className="p-4 flex items-center gap-4">
                        <img src={item.imagem} className="w-28 h-20 object-contain" alt="Box" />
                        <div>
                          <div className="font-bold uppercase" style={{ color: theme.primary }}>{item.descricao}</div>
                          <div className="text-gray-500 text-xs font-medium">{item.vidroInfo}</div>
                          <div className="text-[10px] italic flex items-center gap-1" style={{ color: theme.secondary }}>
                            <Package size={10}/> {item.kitInfo}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium">{item.quantidade}</td>
                      <td className="p-4 text-center">
                         {Array.isArray(item.medidaVao) ? (
                           <div className="flex flex-col leading-tight text-xs">
                             <span>{item.medidaVao[0]}</span>
                             <span>{item.medidaVao[1]}</span>
                           </div>
                         ) : <span>{item.medidaVao}</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 text-[10px]">
                          {item.pecas?.map((p: any, idx: number) => (
                            <div key={idx} className="whitespace-nowrap">
                              <span className="font-bold">{p.desc}:</span> {Math.round(p.l)}x{Math.round(p.a)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-sm" style={{ color: theme.primary }}>
                          {formatarPreco(item.total)}
                        </div>
                      </td>
                      <td className="p-4 text-center no-print">
                         <button onClick={() => editarItem(item)} className="mr-2"><Pencil size={16}/></button>
                         <button onClick={() => handleExcluirItem(item.id)} className="text-red-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col items-end">
              <div className="text-right p-4 rounded-xl shadow-lg font-bold bg-white border-2" style={{ color: theme.primary, borderColor: theme.secondary }}>
                Total Geral: {formatarPreco(totalOrcamento)}
              </div>
            </div>
          </>
          ) : modoProducao ? (
          /* --- MODO PEDIDO: LAYOUT DE FICHAS CORRIGIDO --- */
                   <div className="space-y-6 print:space-y-0">
              {itens.map((item, index) => (
                <div
                key={item.id}
                className="border-2 border-gray-300 rounded-[30px] overflow-hidden bg-white mb-2 print-safe"
                style={{ 
                  marginTop: index === 0 ? '0' : '10px'
                }}
              >
                {/* Cabeçalho da Ficha */}
             <div className="bg-gray-100 p-4 border-b-2 border-gray-200 flex justify-between items-center">
                <span className="font-black text-[#1C415B] uppercase text-sm">
                  Item {index + 1}: {item.descricao}
                </span>
                <span className="text-[11px] font-bold text-[#1C415B] uppercase tracking-widest">
                  {nomeObraTemp && (
                        <span className="text-[11px] font-black text-[#1C415B] uppercase tracking-widest bg-gray-200 px-3 py-1 rounded-full">
                          OBRA: {nomeObraTemp}
                        </span>
                      )}
                </span>
              </div>

                  <div className={`flex flex-row ${index === 0 ? "print:min-h-0" : "print:min-h-[300px]"}`}>
                    {/* LADO ESQUERDO: DESENHO E MEDIDAS REVISADAS */}
                    <div className={`w-2/3 border-r-2 border-gray-100 flex flex-col items-center justify-center bg-[#FDFDFD] ${index === 0 ? "p-4 print:p-2" : "p-6"}`}>
                      
                      <div className={`flex items-center justify-center w-full gap-8 ${index === 0 ? "mb-2" : "mb-6"}`}>
                        {/* Desenho */}
                        <img 
                          src={item.imagem} 
                          alt="Box" 
                          className={`w-auto object-contain ${index === 0 ? "max-h-[220px] print:max-h-[160px]" : "max-h-[220px]"}`} 
                        />

                      {/* Medida Altura */}
                     <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Altura do Vão</span>
                      <div className="bg-white text-[#1C415B] px-6 py-2 rounded-xl text-3xl font-black border border-gray-200 shadow-sm">
                        {Number(item.raw.alturaVao)} <span className="text-sm font-normal opacity-50">mm</span>
                      </div>
                    </div>
                    </div>

                    {/* Localize esta div que envolve as medidas de largura */}
                    <div className="flex gap-4 w-full justify-center px-4 mt-2"> 
                        {item.descricao.toUpperCase().includes("CANTO") ? (
                          <>
                            {/* Lado A */}
                            <div className="flex flex-col items-center min-w-[140px]"> 
                              <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lado A (mm)</span>
                              <div className="bg-white text-[#1C415B] w-full py-3 px-4 rounded-2xl text-4xl font-black text-center border border-gray-200 shadow-sm">
                                {Array.isArray(item.raw.larguraVao) ? item.raw.larguraVao[0] : item.raw.larguraVao}
                              </div>
                            </div>

                            {/* Lado B */}
                            <div className="flex flex-col items-center min-w-[140px]"> 
                              <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lado B (mm)</span>
                              <div className="bg-white text-[#1C415B] w-full py-3 px-4 rounded-2xl text-4xl font-black text-center border border-gray-200 shadow-sm">
                                {item.raw.larguraVaoB || (Array.isArray(item.raw.larguraVao) ? item.raw.larguraVao[1] : "---")}
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Box Reto */
                          <div className="flex flex-col items-center min-w-[200px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Largura do Vão (mm)</span>
                            <div className="bg-white text-[#1C415B] w-full py-3 px-6 rounded-2xl text-4xl font-black text-center border border-gray-200 shadow-sm">
                              {item.raw.larguraVao}
                            </div>
                          </div>
                        )}
                    </div>
                    </div>

                  {/* LADO DIREITO: STATUS E VIDRO */}
                  <div className="w-1/3 p-8 flex flex-col justify-between bg-white">
                    <div className="space-y-10">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantidade</span>
                        <div className="text-7xl font-black text-red-600 leading-none mt-2">{item.quantidade}</div>
                        <span className="text-xs font-bold text-red-600 uppercase">Unidades</span>
                      </div>

                      <div className="pt-8 border-t border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Especificações do Vidro</p>
                        <div className="space-y-1">
                          <div className="text-xl font-bold text-[#1C415B] leading-tight">
                            {item.vidroInfo.split(' - ')[0]}
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            Tipo: {item.vidroInfo.split(' - ')[1] || "8mm"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-dashed pt-4">
                      <p className="text-[9px] font-bold text-gray-300 uppercase">Obs. Interna:</p>
                      <div className="h-16 w-full bg-gray-50 rounded-lg border border-gray-100"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (

          /* --- MODO SEPARAÇÃO DE MATERIAIS (MANTIDO CONFORME ORIGINAL) --- */
          <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold uppercase mb-8 flex items-center gap-2" style={{ color: theme.primary }}>
              <Package size={20} /> Resumo para Estoque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">Vidros Totalizados</p>
                <div className="space-y-4">
                  {itens.map((item, idx) => (
                    <div key={idx} className="pb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2" style={{ color: theme.primary }}>{item.descricao}</p>
                      <div className="space-y-2">
                        {item.pecas.map((p: any, pIdx: number) => {
                          const larguraArredondada = Math.ceil(p.l / 50) * 50;
                          const alturaArredondada = Math.ceil(p.a / 50) * 50;
                          const m2Peca = (larguraArredondada * alturaArredondada) / 1000000;
                          return (
                            <div key={pIdx} className="flex justify-between text-sm text-gray-700">
                              <div className="flex flex-1 items-baseline">
                                <span className="min-w-fit">{p.desc}: {Math.round(p.l)} (L) x {Math.round(p.a)} (A)</span>
                                <div className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-1"></div>
                              </div>
                              <span className="text-gray-900 ml-2">{p.q} {p.q > 1 ? 'peças' : 'peça'} | {(m2Peca * p.q).toFixed(2)} m²</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center">
                    <div className="flex flex-1 items-baseline">
                      <span className="text-sm uppercase tracking-tight text-gray-600">Total m² de vidro</span>
                      <div className="flex-1 border-b border-dotted border-gray-400 mx-2 mb-1"></div>
                    </div>
                    <span className="text-lg font-black" style={{ color: theme.primary }}>
                        {itens.reduce((total: number, item: any) => {
                          const m2Item = item.pecas.reduce((accP: number, p: any) => {
                            const lArr = Math.ceil(p.l / 50) * 50;
                            const aArr = Math.ceil(p.a / 50) * 50;
                            return accP + ((lArr * aArr) / 1000000) * p.q;
                          }, 0);
                          return total + m2Item;
                        }, 0).toFixed(2)} m²
                      </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">Acessórios e Kits</p>
                <div className="space-y-2">
                  {Object.entries(resumo.kits).map(([nome, qtd]) => (
                    <div key={nome} className="flex justify-between text-sm text-gray-700">
                      <div className="flex flex-1 items-baseline">
                        <span className="min-w-fit">Kit {nome}</span>
                        <div className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-1"></div>
                      </div>
                      <span className="text-gray-900 ml-2 font-medium">x{qtd}</span>
                    </div>
                  ))}
                  {Object.entries(resumo.adicionais).map(([nome, qtd]) => (
                    <div key={nome} className="flex justify-between text-sm text-gray-700">
                      <div className="flex flex-1 items-baseline">
                        <span className="min-w-fit">{nome}</span>
                        <div className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-1"></div>
                      </div>
                      <span className="text-gray-900 ml-2 font-medium">x{qtd}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
         )}
      </main>
    </div>
  );
}