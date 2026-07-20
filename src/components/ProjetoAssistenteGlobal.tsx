"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, HelpCircle, Search, Settings, Trash2, X } from "lucide-react";

type PainelTipo = "ajuda" | "config" | null;

type TopicoAjuda = {
  titulo: string;
  categoria: string;
  texto: string;
};

const rotasProjetos = new Set([
  "/box2fls",
  "/boxcanto",
  "/boxcanto3f",
  "/deslizante2f",
  "/deslizante3f",
  "/deslizante4f",
  "/deslizante5f",
  "/deslizante6f",
  "/fixos",
  "/fixo-bandeira",
  "/jc2f-barra",
  "/jc2f-kit",
  "/jc2fcs",
  "/jc2fcs-kit",
  "/jc4f-barra",
  "/jc4f-kit",
  "/jc4fcs",
  "/jc4fcs-kit",
  "/max",
  "/pc2f-barra",
  "/pc2f-kit",
  "/pc2fcb",
  "/pc2fcb-kit",
  "/pc4f-barra",
  "/pc4f-kit",
  "/pc4fcb",
  "/pc4fcb-kit",
  "/pfv1f-barra",
  "/pfv1f-kit",
  "/pfv2f-barra",
  "/pfv2f-kit",
  "/pg",
  "/pg2f",
  "/pgf",
  "/pma2f",
  "/pma2f4m",
  "/pma3f",
  "/pma4f",
  "/pma5f",
  "/pma6f",
]);

const normalizarTexto = (texto?: string | number | null) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const nomeProjetoPorRota = (rota: string) => {
  const nomes: Record<string, string> = {
    "/box2fls": "Box 2 folhas",
    "/boxcanto": "Box de canto",
    "/boxcanto3f": "Box de canto 3 folhas",
    "/fixos": "Fixos",
    "/fixo-bandeira": "Fixo com bandeira",
    "/max": "Max",
    "/pg": "Porta de giro 1 folha",
    "/pg2f": "Porta de giro 2 folhas",
    "/pgf": "Porta de giro com fixo lateral",
    "/pma2f4m": "Mao amiga 2 fixas + 4 moveis",
  };

  if (nomes[rota]) return nomes[rota];
  if (rota.includes("pfv1f")) return "Porta fora vao 1 folha";
  if (rota.includes("pfv2f")) return "Porta fora vao 2 folhas";
  if (rota.includes("pc2fcb")) return "Porta de correr 2 folhas com bandeira";
  if (rota.includes("pc4fcb")) return "Porta de correr 4 folhas com bandeira";
  if (rota.includes("pc2f")) return "Porta de correr 2 folhas";
  if (rota.includes("pc4f")) return "Porta de correr 4 folhas";
  if (rota.includes("jc2fcs")) return "Janela 2 folhas com sacada";
  if (rota.includes("jc4fcs")) return "Janela 4 folhas com sacada";
  if (rota.includes("jc2f")) return "Janela de correr 2 folhas";
  if (rota.includes("jc4f")) return "Janela de correr 4 folhas";
  if (rota.includes("pma")) return "Mao amiga";
  if (rota.includes("deslizante")) return "Deslizante";
  return "Projeto";
};

const topicosGerais: TopicoAjuda[] = [
  {
    categoria: "Fluxo",
    titulo: "Como montar um projeto",
    texto: "Comece preenchendo largura, altura e quantidade. Depois selecione o vidro, a cor do material e as variacoes do projeto, como trilho, puxador, trinco, tipo de kit, movimentacao ou tubo. A relacao de materiais recalcula automaticamente conforme essas escolhas.",
  },
  {
    categoria: "Fluxo",
    titulo: "Ordem recomendada de preenchimento",
    texto: "Para evitar recalculo errado, preencha primeiro medidas e quantidade, depois vidro e cor do material. Em seguida escolha as variacoes do projeto. Por ultimo confira a relacao de materiais e o valor total.",
  },
  {
    categoria: "Medidas",
    titulo: "Como informar largura e altura",
    texto: "As medidas devem ser digitadas em milimetros. Exemplo: para 2,10 m, digite 2100. Evite ponto, virgula ou texto junto da medida. O sistema limita campos principais para evitar numeros fora do padrao do projeto.",
  },
  {
    categoria: "Medidas",
    titulo: "Medida real x medida de cobranca",
    texto: "A descricao do vidro procura mostrar a medida real da peca calculada. Para cobranca em m2, o sistema pode arredondar a medida para cima conforme a regra de vidro, normalmente de 5 em 5 cm.",
  },
  {
    categoria: "Vidros",
    titulo: "Como escolher o vidro",
    texto: "Digite parte do nome, cor ou espessura do vidro. A lista filtra os vidros cadastrados. Depois de selecionar, o sistema usa a espessura para decidir perfis compativeis e usa o preco cadastrado para calcular o valor.",
  },
  {
    categoria: "Vidros",
    titulo: "Vidro nao aparece na lista",
    texto: "Confira se o vidro esta cadastrado para a empresa, se tem nome e espessura preenchidos e se o termo digitado bate com o cadastro. Alguns calculos dependem da espessura, como 08 mm, 10 mm ou laminado equivalente.",
  },
  {
    categoria: "Central",
    titulo: "PDF+",
    texto: "Use PDF+ para enviar o item para a central de impressao. La voce junta varios projetos do mesmo orcamento, confere miniaturas, medidas, quantidade, valores e pode gerar o PDF completo do pedido.",
  },
  {
    categoria: "Edicao",
    titulo: "Editar item da central",
    texto: "Quando um item volta da central para edicao, salvar atualiza o mesmo item e retorna para a central. Assim evita duplicar projetos no orcamento.",
  },
  {
    categoria: "Orcamento",
    titulo: "Salvar orcamento",
    texto: "O botao Salvar grava o orcamento no sistema. Em orcamentos novos, a numeracao e criada automaticamente no momento do salvamento.",
  },
  {
    categoria: "Orcamento",
    titulo: "Diferenca entre PDF+ e Salvar",
    texto: "PDF+ leva o projeto para a central de impressao, onde varios itens podem ficar no mesmo orcamento. Salvar grava o orcamento no banco do sistema. Em uma edicao vinda da central, Salvar atualiza o item e volta para a central.",
  },
  {
    categoria: "Vidros",
    titulo: "Tabela de preco do cliente",
    texto: "O valor do vidro considera o vidro escolhido e, quando o cliente tem uma tabela especifica, usa o preco do grupo desse cliente.",
  },
  {
    categoria: "Valores",
    titulo: "Como conferir os totais",
    texto: "Confira separadamente valor de vidro, valor de kit/perfis/tubos e valor de ferragens. Se um grupo parecer zerado ou alto demais, verifique se a cor, o codigo e o cadastro do item estao corretos.",
  },
  {
    categoria: "Materiais",
    titulo: "Cor dos materiais",
    texto: "Perfis, kits, tubos e ferragens devem acompanhar a cor escolhida no projeto quando houver cadastro correspondente. Cilindros e itens sem cor podem servir para todas as cores.",
  },
  {
    categoria: "Materiais",
    titulo: "Material nao entrou no calculo",
    texto: "Quando um material nao aparece, confira se o codigo esta cadastrado, se a cor bate com a cor selecionada, se o preco existe e se o projeto realmente usa aquele item naquela variacao.",
  },
  {
    categoria: "Materiais",
    titulo: "Material entrou com cor errada",
    texto: "A cor vem do cadastro do item e da cor escolhida no projeto. Se aparecer branco, bronze ou outra cor indevida, confira o campo de cores do cadastro e se existe o mesmo codigo na cor correta.",
  },
  {
    categoria: "Perfis",
    titulo: "Barra, corte e aproveitamento",
    texto: "Projetos por barra geram cortes em milimetros e calculam quantas barras serao necessarias. Na central, a otimizacao pode melhorar o aproveitamento quando existem varias medidas do mesmo perfil.",
  },
  {
    categoria: "Kits",
    titulo: "Como o sistema escolhe kits",
    texto: "Nos projetos por kit, o sistema procura o kit cadastrado mais proximo acima da medida necessaria, respeitando modelo, quantidade de folhas, largura, altura e espessura quando essa regra existir no projeto.",
  },
  {
    categoria: "Rascunho",
    titulo: "Nao perder a digitacao",
    texto: "As paginas de calculo podem manter rascunho no navegador. Se atualizar a tela, os dados digitados tendem a voltar enquanto o rascunho estiver ativo.",
  },
  {
    categoria: "Materiais",
    titulo: "Itens manuais",
    texto: "Use Adicionar item para completar algo especial. Os itens automaticos podem mudar quando medidas, cor, vidro ou variacoes forem alteradas.",
  },
  {
    categoria: "Conferencia",
    titulo: "Antes de imprimir",
    texto: "Confira cliente, obra, medidas, quantidade de vao, quantidade de pecas, vidro, cor do material, variacoes escolhidas, desenho e relacao de materiais. Essa revisao evita salvar um orcamento com opcao antiga.",
  },
  {
    categoria: "Erros comuns",
    titulo: "Valor zerado",
    texto: "Valor zerado normalmente indica item sem preco, vidro sem tabela, cliente sem grupo de preco esperado ou material nao encontrado na cor escolhida.",
  },
  {
    categoria: "Erros comuns",
    titulo: "Desenho nao mudou",
    texto: "Se o desenho nao muda, confira se a variacao escolhida realmente troca imagem naquele projeto. Algumas paginas mudam desenho por puxador, trinco, fechadura, movimentacao ou tipo de carrinho.",
  },
];

const topicosPorPerfil = (rota: string): TopicoAjuda[] => {
  const topicos: TopicoAjuda[] = [];

  if (rota.includes("fixo-bandeira")) {
    topicos.push(
      {
        categoria: "Fixo com bandeira",
        titulo: "Vidro inferior e vidro bandeira",
        texto: "A parte de baixo usa altura ate o tubo. A bandeira usa a diferenca entre altura total e altura ate o tubo. Os dois vidros dividem a largura pela quantidade de folhas.",
      },
      {
        categoria: "Tubo",
        titulo: "Uso do tubo",
        texto: "O tubo pode calcular somente na largura ou na largura mais a altura da bandeira, conforme a opcao escolhida.",
      },
      {
        categoria: "Fixo com bandeira",
        titulo: "Quantidade de vidros",
        texto: "Se escolher 4 folhas, o sistema gera 4 vidros inferiores e 4 vidros de bandeira. A quantidade total de pecas considera as duas partes multiplicadas pela quantidade de vaos.",
      },
      {
        categoria: "Fixo com bandeira",
        titulo: "Vidros com espessuras diferentes",
        texto: "O vidro inferior e o vidro da bandeira podem ter espessuras diferentes. O perfil U acompanha a espessura de cada parte: 10 mm usa VT10, 8 mm ou 6 mm usa VT66.",
      }
    );
  }

  if (rota.includes("fixos") && !rota.includes("fixo-bandeira")) {
    topicos.push({
      categoria: "Fixos",
      titulo: "Divisao dos fixos",
      texto: "Escolha de 1 a 6 pecas. O vao desconta folga e divide a largura pela quantidade de pecas escolhida.",
    }, {
      categoria: "Fixos",
      titulo: "Perfis dos fixos",
      texto: "O projeto fixo usa perfil U nos quatro lados. O sistema calcula 2 cortes na largura e 2 cortes na altura, agrupando os cortes em barras conforme a espessura do vidro.",
    });
  }

  if (rota.includes("pc") || rota.includes("pfv") || rota.includes("jc")) {
    topicos.push(
      {
        categoria: "Kit ou barra",
        titulo: "Modo de calculo",
        texto: "Paginas com final KIT usam kits cadastrados. Paginas com barra calculam perfis por cortes e podem participar da otimizacao na central de impressao.",
      },
      {
        categoria: "Portas e janelas",
        titulo: "Puxador e trinco",
        texto: "Quando o projeto tem puxador ou trinco, essas escolhas mudam ferragens e, em alguns modelos, tambem mudam o desenho apresentado no orcamento.",
      },
      {
        categoria: "Portas e janelas",
        titulo: "Quantidade de pecas",
        texto: "A quantidade de pecas nao e a quantidade de vaos. Uma janela 4 folhas com quantidade 1 e um vao, mas gera 4 pecas de vidro no total do projeto.",
      }
    );
  }

  if (rota.includes("cb") || rota.includes("cs")) {
    topicos.push({
      categoria: "Bandeira ou sacada",
      titulo: "Altura parcial",
      texto: "Quando existe bandeira ou sacada, a altura informada no campo especifico separa o vidro principal do vidro superior ou inferior.",
    }, {
      categoria: "Bandeira ou sacada",
      titulo: "Tubo escolhido",
      texto: "Nos projetos com bandeira ou sacada, o tubo e selecionado na lista de perfis cadastrados como tubo quadrado ou retangular. A cor do material filtra a lista.",
    });
  }

  if (rota.includes("pma")) {
    topicos.push(
      {
        categoria: "Mao amiga",
        titulo: "Todas correm ou fixas",
        texto: "A escolha da movimentacao muda quantidade de roldanas, perfil U, fechaduras, puxadores e desenho do projeto.",
      },
      {
        categoria: "Mao amiga",
        titulo: "Trilhos PMA",
        texto: "Em vaos maiores, alguns projetos trocam VT68/VT39 por perfis de mais guias, como VT268 e VT239, conforme a regra do numero de folhas.",
      },
      {
        categoria: "Mao amiga",
        titulo: "Roldanas",
        texto: "A quantidade de roldanas depende da quantidade de folhas moveis. Todas correm usa mais roldanas; quando existe uma fixa, as roldanas reduzem conforme as folhas que realmente correm.",
      },
      {
        categoria: "Mao amiga",
        titulo: "Porta, janela ou kit pia",
        texto: "A escolha do tipo do projeto muda ferragens. Janela costuma usar fecho; porta usa conjunto de fechadura; kit pia usa os itens especificos do modelo.",
      }
    );
  }

  if (rota.includes("deslizante")) {
    topicos.push(
      {
        categoria: "Deslizante",
        titulo: "Carrinho simples ou inteiro",
        texto: "Carrinho simples usa roldanas por unidade. Carrinho inteiro usa o item por metro linear, calculado pela largura do vao.",
      },
      {
        categoria: "Deslizante",
        titulo: "Trilhos de 6 e 7 metros",
        texto: "O sistema pode escolher entre barras de 6000 mm e 7000 mm para melhorar aproveitamento dos trilhos superior e inferior.",
      },
      {
        categoria: "Deslizante",
        titulo: "Todas correm ou 1 fixa",
        texto: "A movimentacao altera quantidade de roldanas e perfil U. Todas correm usa roldanas em todas as folhas; com 1 fixa, apenas as moveis recebem roldanas.",
      },
      {
        categoria: "Deslizante",
        titulo: "Item 3000 por metro",
        texto: "Quando o carrinho inteiro usa o item 3000, ele deve ser tratado por metro linear, calculado pela largura do vao, e nao como barra comum da otimizacao.",
      }
    );
  }

  if (rota.includes("box")) {
    topicos.push(
      {
        categoria: "Box",
        titulo: "Escolha do kit",
        texto: "O kit deve ser o modelo cadastrado mais proximo acima da largura e altura maxima do box, respeitando tradicional, quadrado ou Evidence.",
      },
      {
        categoria: "Box",
        titulo: "Altura padrao ou ate o teto",
        texto: "A escolha muda as folgas dos vidros e pode adicionar perfis extras apenas quando o kit selecionado nao atende a altura.",
      },
      {
        categoria: "Box",
        titulo: "Box de canto",
        texto: "No box de canto, o sistema usa largura A e largura B. Para escolher o kit de canto, as larguras podem ser somadas conforme a regra do modelo cadastrado.",
      },
      {
        categoria: "Box",
        titulo: "Puxador do box",
        texto: "Quando o box usa puxador, confira se a cor Gold, Cromado ou Rose existe no cadastro do puxador. No box de canto, alguns modelos usam puxador duplo.",
      }
    );
  }

  if (rota.includes("pg")) {
    topicos.push(
      {
        categoria: "Porta de giro",
        titulo: "Tipo de fechadura",
        texto: "A escolha entre 1520, 1520TA ou sem fechadura muda placas, cilindros, contra e acessorios usados no projeto.",
      },
      {
        categoria: "Porta de giro",
        titulo: "Ferragens padrao, grande ou dobradica",
        texto: "A selecao das ferragens muda os codigos principais e o desenho apresentado no orcamento.",
      },
      {
        categoria: "Porta de giro",
        titulo: "Porta de giro 2 folhas",
        texto: "Na porta de giro 2 folhas, existem 2 vidros de giro e algumas ferragens dobram. As fechaduras principais permanecem por conjunto conforme a regra do projeto.",
      },
      {
        categoria: "Porta de giro",
        titulo: "Fixo lateral",
        texto: "Na porta de giro com fixo lateral, informe a medida da porta de giro. O restante do vao forma o fixo, e os perfis do fixo entram conforme a espessura do vidro.",
      }
    );
  }

  if (rota.includes("max")) {
    topicos.push(
      {
        categoria: "Max",
        titulo: "Tipos de Max",
        texto: "Max unico usa apenas um vidro. Max V/V, com tubo e bandeira separam max e fixo, mudando cantoneiras, tubos e ferragens.",
      },
      {
        categoria: "Max",
        titulo: "Max com tubo",
        texto: "Quando o projeto for Max com tubo, selecione o tubo na lista de perfis. Se o tubo nao aparecer, confira cadastro, cor e descricao do perfil.",
      }
    );
  }

  return topicos;
};

export default function ProjetoAssistenteGlobal() {
  const pathname = usePathname();
  const rotaAtual = useMemo(() => `/${(pathname || "").split("/").filter(Boolean)[0] || ""}`, [pathname]);
  const ativoNestaRota = rotasProjetos.has(rotaAtual);
  const [painel, setPainel] = useState<PainelTipo>(null);
  const [busca, setBusca] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [config, setConfig] = useState({
    corPadrao: "Escolher",
    quantidadePadrao: 1,
    lembrarRascunho: true,
    avisarCamposZerados: true,
    mostrarValoresPdf: true,
    mostrarMateriaisPdf: true,
    ajudaDetalhada: true,
  });

  const storageKey = `glasscode:${rotaAtual.replace("/", "") || "projeto"}:assistente`;
  const projetoNome = nomeProjetoPorRota(rotaAtual);
  const topicos = useMemo(() => [...topicosGerais, ...topicosPorPerfil(rotaAtual)], [rotaAtual]);
  const topicosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return topicos;
    return topicos.filter((topico) =>
      normalizarTexto(`${topico.categoria} ${topico.titulo} ${topico.texto}`).includes(termo)
    );
  }, [busca, topicos]);

  useEffect(() => {
    if (!ativoNestaRota) return;

    const onClick = (event: MouseEvent) => {
      const alvo = event.target as HTMLElement | null;
      const acionador = alvo?.closest("button,a") as HTMLElement | null;
      const texto = normalizarTexto(acionador?.textContent);

      if (!acionador) return;
      if (texto.includes("ajuda")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setPainel("ajuda");
      }
      if (texto.includes("configuracoes") || texto.includes("configura")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setPainel("config");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [ativoNestaRota]);

  useEffect(() => {
    if (!ativoNestaRota) return;
    try {
      const salvoLocal = window.localStorage.getItem(storageKey);
      if (!salvoLocal) return;
      setConfig((atual) => ({ ...atual, ...JSON.parse(salvoLocal) }));
    } catch {
      // Preferencias locais nao devem bloquear a tela.
    }
  }, [ativoNestaRota, storageKey]);

  useEffect(() => {
    if (!ativoNestaRota) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
    } catch {
      // Preferencias locais nao devem bloquear a tela.
    }
  }, [ativoNestaRota, config, storageKey]);

  if (!ativoNestaRota || !painel) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/25 p-4 pt-8 backdrop-blur-[1px]">
      <section className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 ${painel === "ajuda" ? "max-w-4xl" : "max-w-2xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#07385a]/10 text-[#07385a]">
              {painel === "ajuda" ? <HelpCircle size={22} /> : <Settings size={22} />}
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#0f2742]">
                {painel === "ajuda" ? "Ajuda do projeto" : "Configuracoes do projeto"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{projetoNome}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPainel(null);
              setBusca("");
              setSalvo(false);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        {painel === "ajuda" ? (
          <div className="p-5">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Pesquisar por vidro, tubo, puxador, PDF, salvar, cor, roldana, kit..."
                className="w-full bg-transparent text-sm font-medium text-[#0f2742] outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {topicosFiltrados.length} tópico(s) encontrado(s)
              </span>
              <span>
                Dica: pesquise pelo nome do item, variação ou problema que apareceu.
              </span>
            </div>
            <div className="mt-4 max-h-[58vh] space-y-3 overflow-auto pr-1">
              {topicosFiltrados.length > 0 ? (
                topicosFiltrados.map((topico) => (
                  <article key={`${topico.categoria}-${topico.titulo}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#07385a]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#07385a]">
                        {topico.categoria}
                      </span>
                      <h3 className="text-sm font-semibold text-[#0f2742]">{topico.titulo}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{topico.texto}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-[#0f2742]">Nenhum topico encontrado</p>
                  <p className="mt-1 text-sm text-slate-500">Tente pesquisar por outro termo.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <CampoConfig label="Cor padrao" value={config.corPadrao} onChange={(valor) => setConfig((atual) => ({ ...atual, corPadrao: valor }))} />
              <CampoNumeroConfig
                label="Quantidade padrao"
                value={config.quantidadePadrao}
                onChange={(valor) => setConfig((atual) => ({ ...atual, quantidadePadrao: Math.max(1, valor) }))}
              />
            </div>
            <div className="mt-4 grid gap-2">
              <ToggleConfig titulo="Salvar rascunho automaticamente" descricao="Mantem dados digitados no navegador quando a pagina permite rascunho." ativo={config.lembrarRascunho} onChange={(valor) => setConfig((atual) => ({ ...atual, lembrarRascunho: valor }))} />
              <ToggleConfig titulo="Avisar campos zerados" descricao="Preferencia preparada para futuras validacoes antes de PDF+ ou salvamento." ativo={config.avisarCamposZerados} onChange={(valor) => setConfig((atual) => ({ ...atual, avisarCamposZerados: valor }))} />
              <ToggleConfig titulo="Mostrar valores no PDF" descricao="Preferencia global para os proximos controles de impressao." ativo={config.mostrarValoresPdf} onChange={(valor) => setConfig((atual) => ({ ...atual, mostrarValoresPdf: valor }))} />
              <ToggleConfig titulo="Mostrar materiais no PDF" descricao="Preferencia global para relacoes de material no PDF." ativo={config.mostrarMateriaisPdf} onChange={(valor) => setConfig((atual) => ({ ...atual, mostrarMateriaisPdf: valor }))} />
              <ToggleConfig titulo="Ajuda detalhada" descricao="Mantem a auto ajuda completa com regras gerais e especificas do projeto." ativo={config.ajudaDetalhada} onChange={(valor) => setConfig((atual) => ({ ...atual, ajudaDetalhada: valor }))} />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  const prefixo = `glasscode:${rotaAtual.replace("/", "")}`;
                  Object.keys(window.localStorage)
                    .filter((chave) => chave.startsWith(prefixo) && chave.includes("rascunho"))
                    .forEach((chave) => window.localStorage.removeItem(chave));
                  setSalvo(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Trash2 size={16} />
                Limpar rascunho desta pagina
              </button>
              <div className="flex items-center gap-3">
                {salvo ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={16} />
                    Configuracao salva
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPainel(null)}
                  className="rounded-xl bg-[#07385a] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CampoConfig({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold text-[#0f2742] outline-none">
        {["Escolher", "Preto", "Branco", "Fosco", "Gold", "Cromado", "Rose"].map((opcao) => (
          <option key={opcao} value={opcao}>{opcao}</option>
        ))}
      </select>
    </label>
  );
}

function CampoNumeroConfig({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 1))}
        className="mt-1 w-full bg-transparent text-sm font-semibold text-[#0f2742] outline-none"
      />
    </label>
  );
}

function ToggleConfig({ titulo, descricao, ativo, onChange }: { titulo: string; descricao: string; ativo: boolean; onChange: (ativo: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50">
      <span>
        <span className="block text-sm font-semibold text-[#0f2742]">{titulo}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{descricao}</span>
      </span>
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${ativo ? "bg-[#18bd72]" : "bg-slate-300"}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${ativo ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}
