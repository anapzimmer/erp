# Migração da identidade Glass Code

## Inventário anterior à implementação — 19/09/2026

- 160 arquivos em `src`; páginas de cálculo repetem estilos próprios, além de módulos CSS para login, dashboard, plataforma e relatório de orçamentos.
- `ThemeContext` lê todas as cores de `configuracoes_branding` e grava variáveis inline no documento. A página `/configuracoes/branding` edita 18 cores, duas logos e salva por empresa.
- As duas logos já existem: `configuracoes_branding.logo_light` (fundo claro) e `logo_dark` (fundo escuro). O cadastro atual usa data URLs. Não foi encontrado ConfigEmpresa nem uso frontend de empresas.cor/cor_secundaria. Não é necessária alteração de schema para duas logos.
- Header centraliza navegação; Sidebar é um adaptador desativado. Toast, CadastrosAvisoModal, importadores, assistente, aviso de conta e seleção de cliente são componentes compartilhados.
- Há Tailwind com cores literais, hexadecimais inline, CSS próprio e concatenações de transparência sobre cores do contexto. Substituições precisam distinguir interface, desenhos, materiais e impressão.
- PDFs usam React PDF e uma paleta parcial em `relatorios/shared/pdfLayout.ts`; também há documentos com estilos locais. Desenhos de materiais e cores comerciais devem manter seu significado.
- Não existe um modo escuro global consistente. As logos eram escolhidas manualmente por página e o Header sempre preferia a clara.
- Armazenamento de orçamento ativo, preferências de corte e segurança não pertencem ao branding e serão preservados.

## Decisões documentadas antes das alterações

1. Manter as colunas antigas de cores no banco, sem leitura ou escrita pela interface. Reutilizar logo_light/logo_dark, apresentadas como Logo clara/Logo escura. Nenhum SQL destrutivo, mudança de RLS ou de permissão.
2. Adicionar somente preferência visual local de tema claro/escuro/sistema. Tokens oficiais são globais; empresas não podem escolher cores.
3. Manter a interface pública do contexto para compatibilidade dos componentes, mas suas cores passam a ser referências semânticas fixas. Transparência será expressa por color-mix, não concatenação de hexadecimal.
4. Impressão usa paleta fixa clara, separada dos tokens reativos da tela. Geometrias, fórmulas, preços e fluxos não serão alterados.
5. Cinza secundário de texto terá contraste reforçado para leitura; Industrial Silver permanece em detalhes e elementos não textuais.
6. Novos uploads de logo serão normalizados para PNG com limite de dimensão, pois o gerador PDF aceita PNG/JPEG e não interpreta SVG/WebP como imagem. A conversão ocorre localmente, antes de salvar nas mesmas colunas existentes, sem alterar outras configurações da empresa.

## Validação

- TypeScript: aprovado, sem erros.
- ESLint completo: zero erros e 914 avisos. Ainda há dívida de lint; a execução não está livre de avisos. A medição inicial de src tinha 933 avisos, em escopo distinto.
- Build de produção: aprovado, com 76 páginas estáticas geradas.
- Testes: 33 aprovados, incluindo verificações existentes de autorização/isolamento com PGlite e novos testes de contraste e fallback de logos.
- git diff --check: aprovado.
- Revisão visual representativa: login claro/escuro e mobile, dashboard, navegação/dropdown mobile, tabela e modal de clientes em tablet claro/escuro e cálculo PC4FCB-kit em desktop escuro. Problemas de fonte, sobreposição do cabeçalho, abertura ao toque e contraste encontrados foram corrigidos.
- Cinco PDFs sintéticos (vidros, espelhos, ferragens, projeto e central) foram gerados, renderizados e conferidos. Mantêm fundo branco, texto legível e desenhos. Artefatos locais em tmp/pdfs, sem dados reais de clientes.

## Estrutura e componentes entregues

- `src/design/tokens.json`: fonte única das cores oficiais e semânticas. `scripts/generate-design-tokens.cjs` gera tokens.css; executar novamente ao editar os tokens.
- `src/design/components.css`: estilos compartilhados de campos, botões, superfícies, tabelas, diálogos, foco, estados desabilitados, impressão e navegação responsiva.
- `src/design/drawing.ts`: cores concretas para desenhos serializados em SVG/PDF, preservando geometria e cores comerciais de materiais.
- `src/design/companyLogos.ts` e `src/components/ThemeSelect.tsx`: fallback das logos e seleção claro/escuro/sistema.
- ThemeContext, Header, avisos, importadores, assistente, seleção de cliente, componentes de projeto, cadastros, calculadoras, matriz, central, login e painel receberam os tokens comuns, reutilizando a estrutura existente.
- Relatórios usam Inter e paleta clara compartilhada em relatorios/shared/pdfLayout.ts. Incluídas logos padrão PNG/SVG, fontes locais e licença.
- Novos testes de contraste/fallback e gerador de PDFs sintéticos para conferência local.

## Branding removido e referências mantidas

Foram removidos os seletores e previews de cores, a leitura de cores personalizadas e a gravação dessas cores. A tela Aparência e logos permite escolher o modo visual e cadastrar logos. Consultas de branding necessárias às logos permanecem; a preferência de tema é local e não altera a paleta oficial.

Os campos de cores da interface pública do contexto permanecem como referências aos tokens fixos. Parâmetros legados de relatório, como themeColor e coresEmpresa, permanecem por compatibilidade, mas não controlam a paleta impressa. Metadados de desenho que precisam de uma cor concreta usam o grafite oficial.

A busca final não encontrou #1c415b, #39b89f, #4fa2d9, #114b5f ou #00a896 em src, nem seletores type="color" ou referências button_dark_bg/cor_secundaria. Logos das empresas, desenhos raster existentes e cores comerciais de materiais foram preservados.

## Supabase e regras de negócio

Nenhuma migration SQL, exclusão de coluna, alteração de RLS ou operação administrativa no banco foi realizada. Foram reutilizadas configuracoes_branding.logo_light e logo_dark. Colunas antigas de cores permanecem no banco sem consumo pelo frontend. Não é necessário executar SQL.

Fórmulas, preços e regras comerciais não foram modificados. Novos uploads de logo são normalizados para PNG conforme a decisão inicial. O menu foi ajustado para abrir ao toque e se adaptar a larguras menores. Alterações anteriores de avisos/situação de conta presentes no diretório foram preservadas e não devem ser atribuídas integralmente à migração visual.

## Limites da validação

A auditoria de código abrangeu as rotas existentes; a revisão visual foi por amostragem, não uma visita a todas as 76 páginas. Conferir em uso orçamentos históricos, PDFs extensos, logos reais de cada empresa e estados dependentes de dados específicos. O salvamento de novas logos não foi executado em uma empresa real na validação. Não houve publicação em produção.

Os estilos de hover, foco, desabilitado e loading foram migrados; nem todas as combinações foram exercitadas visualmente em cada rota. Os testes de contraste cobrem os pares semânticos definidos e não substituem uma auditoria completa de acessibilidade.

## Arquivos alterados

A lista inclui arquivos novos e adaptações visuais. Componentes de situação/aviso de conta já tinham trabalho anterior, preservado. database/PAINEL_PLATAFORMA.md e src/lib/situacaoConta.ts já estavam alterados e não integram esta relação visual.
- `.gitignore`
- `docs/IDENTIDADE_GLASS_CODE.md`
- `eslint.config.mjs`
- `public/desenhos/fora-esquadro.svg`
- `public/desenhos/matriz-fechamentosacada.svg`
- `public/desenhos/matriz-peledevidro.svg`
- `public/desenhos/matriz-pinazio.svg`
- `public/desenhos/matriz-sacadafrontal.svg`
- `public/desenhos/matriz-sacadagrapa.svg`
- `public/desenhos/matriz-sacadatorre.svg`
- `public/fonts/Inter-Regular.ttf`
- `public/fonts/Inter-SemiBold.ttf`
- `public/fonts/Inter.ttf`
- `public/fonts/OFL-Inter.txt`
- `public/glasscode-dark.png`
- `public/glasscode-dark.svg`
- `public/glasscode-light.png`
- `public/glasscode-light.svg`
- `scripts/generate-design-tokens.cjs`
- `scripts/validate-design-pdfs.cjs`
- `src/app/(admin)/admin/cadastrotipologia/page.tsx`
- `src/app/(admin)/admin/configuracaotipologia/page.tsx`
- `src/app/(admin)/admin/relatorio.orcamento/page.tsx`
- `src/app/(admin)/admin/relatorio.orcamento/relatorio.module.css`
- `src/app/(admin)/admin/tabelas/page.tsx`
- `src/app/(auth)/login/login.module.css`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/recuperar-senha/page.tsx`
- `src/app/(cadastros)/cadastros/acabamentos/page.tsx`
- `src/app/(cadastros)/cadastros/clientes/page.tsx`
- `src/app/(cadastros)/cadastros/ferragens/page.tsx`
- `src/app/(cadastros)/cadastros/kits/page.tsx`
- `src/app/(cadastros)/cadastros/perfis/page.tsx`
- `src/app/(cadastros)/cadastros/servicos/page.tsx`
- `src/app/(cadastros)/cadastros/vidros/page.tsx`
- `src/app/(calculos)/box2fls/page.tsx`
- `src/app/(calculos)/boxcanto/page.tsx`
- `src/app/(calculos)/boxcanto3f/page.tsx`
- `src/app/(calculos)/calculo/calculovidro/page.tsx`
- `src/app/(calculos)/calculo/espelhos/page.tsx`
- `src/app/(calculos)/calculo/fechamentosacada/page.tsx`
- `src/app/(calculos)/calculo/fora-esquadro/page.tsx`
- `src/app/(calculos)/calculo/peledevidro/page.tsx`
- `src/app/(calculos)/calculo/pinazio/page.tsx`
- `src/app/(calculos)/calculo/sacadafrontal/page.tsx`
- `src/app/(calculos)/calculo/sacadagrapa/page.tsx`
- `src/app/(calculos)/calculo/sacadatorre/page.tsx`
- `src/app/(calculos)/calculojanela/page.tsx`
- `src/app/(calculos)/deslizante2f/page.tsx`
- `src/app/(calculos)/deslizante3f/page.tsx`
- `src/app/(calculos)/deslizante4f/page.tsx`
- `src/app/(calculos)/deslizante5f/page.tsx`
- `src/app/(calculos)/deslizante6f/page.tsx`
- `src/app/(calculos)/fixo-bandeira/page.tsx`
- `src/app/(calculos)/fixos/page.tsx`
- `src/app/(calculos)/jc2f-barra/page.tsx`
- `src/app/(calculos)/jc2f-kit/page.tsx`
- `src/app/(calculos)/jc2fcs-kit/page.tsx`
- `src/app/(calculos)/jc2fcs/page.tsx`
- `src/app/(calculos)/jc4f-barra/page.tsx`
- `src/app/(calculos)/jc4f-kit/page.tsx`
- `src/app/(calculos)/jc4fcb-kit/page.tsx`
- `src/app/(calculos)/jc4fcb/page.tsx`
- `src/app/(calculos)/jc4fcbs/page.tsx`
- `src/app/(calculos)/jc4fcs-kit/page.tsx`
- `src/app/(calculos)/jc4fcs/page.tsx`
- `src/app/(calculos)/max/page.tsx`
- `src/app/(calculos)/pc2f-barra/page.tsx`
- `src/app/(calculos)/pc2f-kit/page.tsx`
- `src/app/(calculos)/pc2fcb-kit/page.tsx`
- `src/app/(calculos)/pc2fcb/page.tsx`
- `src/app/(calculos)/pc4f-barra/page.tsx`
- `src/app/(calculos)/pc4f-kit/page.tsx`
- `src/app/(calculos)/pc4fcb-kit/page.tsx`
- `src/app/(calculos)/pc4fcb/page.tsx`
- `src/app/(calculos)/pfv1f-barra/page.tsx`
- `src/app/(calculos)/pfv1f-kit/page.tsx`
- `src/app/(calculos)/pfv2f-barra/page.tsx`
- `src/app/(calculos)/pfv2f-kit/page.tsx`
- `src/app/(calculos)/pg/page.tsx`
- `src/app/(calculos)/pg2f/page.tsx`
- `src/app/(calculos)/pg2fva/page.tsx`
- `src/app/(calculos)/pgf/page.tsx`
- `src/app/(calculos)/pma2f/page.tsx`
- `src/app/(calculos)/pma2f4m/page.tsx`
- `src/app/(calculos)/pma3f/page.tsx`
- `src/app/(calculos)/pma4f/page.tsx`
- `src/app/(calculos)/pma5f/page.tsx`
- `src/app/(calculos)/pma6f/page.tsx`
- `src/app/(configuracoes)/configuracoes/branding/page.tsx`
- `src/app/(configuracoes)/configuracoes/page.tsx`
- `src/app/(midia)/imagens/page.tsx`
- `src/app/(projetos)/central-impressao/page.tsx`
- `src/app/(projetos)/matriz-projetos/page.tsx`
- `src/app/dashboard.module.css`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/plataforma/Financeiro.tsx`
- `src/app/plataforma/page.tsx`
- `src/app/plataforma/plataforma.module.css`
- `src/app/plataforma/SituacaoBadge.tsx`
- `src/app/plataforma/SituacaoContaModal.tsx`
- `src/app/relatorios/calculovidros/CalculoVidroPDF.tsx`
- `src/app/relatorios/calculovidros/RelatorioObraPDF.tsx`
- `src/app/relatorios/calculovidros/TemperaPDF.tsx`
- `src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx`
- `src/app/relatorios/espelhos/EspelhosPDF.tsx`
- `src/app/relatorios/ferragens/FerragensPDF.tsx`
- `src/app/relatorios/foraesquadro/ForaEsquadroPDF.tsx`
- `src/app/relatorios/jc4fcbs/JC4FCBSPDF.tsx`
- `src/app/relatorios/kits/KitsPDF.tsx`
- `src/app/relatorios/peledevidro/PeleDeVidroPDF.tsx`
- `src/app/relatorios/perfis/PerfisPDF.tsx`
- `src/app/relatorios/pinazio/PinazioPDF.tsx`
- `src/app/relatorios/projetoindividual/ProjetoIndividualPDF.tsx`
- `src/app/relatorios/sacadafrontal/SacadaFrontalPDF.tsx`
- `src/app/relatorios/sacadagrapa/SacadaGrapaPDF.tsx`
- `src/app/relatorios/sacadatorre/SacadaTorrePDF.tsx`
- `src/app/relatorios/shared/pdfLayout.ts`
- `src/app/relatorios/vidros/VidrosPDF.tsx`
- `src/components/AvisoConta.tsx`
- `src/components/CadastrosAvisoModal.tsx`
- `src/components/ClienteQuickCreateButton.tsx`
- `src/components/desenhos/MiniProjetoPinazio.tsx`
- `src/components/desenhos/MiniProjetoPinazioPDF.tsx`
- `src/components/Header.tsx`
- `src/components/ImportarTabelaCatalogoModal.tsx`
- `src/components/ImportarTabelaPerfisModal.tsx`
- `src/components/ImportarTabelaVidrosModal.tsx`
- `src/components/LoteRapidoProjetos.tsx`
- `src/components/PerfisExtrasProjeto.tsx`
- `src/components/PlatformAccessGate.tsx`
- `src/components/ProjetoAssistenteGlobal.tsx`
- `src/components/SecurityProvider.tsx`
- `src/components/ThemeLoader.tsx`
- `src/components/ThemeSelect.tsx`
- `src/components/Toast.tsx`
- `src/context/OrcamentoContext.tsx`
- `src/context/ThemeContext.tsx`
- `src/design/companyLogos.ts`
- `src/design/components.css`
- `src/design/drawing.ts`
- `src/design/tokens.css`
- `src/design/tokens.json`
- `tests/design-system.test.cjs`
