const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function carregar(arquivo) {
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(
    nome => carregar(path.resolve(path.dirname(arquivo), `${nome}.ts`)), modulo, modulo.exports);
  return modulo.exports;
}
const { calcularEspelho, quantidadePecasEspelho, trocarVidroEspelho } = carregar(path.resolve(__dirname, '../src/utils/calculoEspelhos.ts'));
const { trocarVidroComposicaoEspelhos } = carregar(path.resolve(__dirname, '../src/utils/espelhosCentral.ts'));
const acabamento = (campos = {}) => ({ id: 7, empresa_id: 'empresa-a', nome: 'Redondo LED adesivo (Lapidado)',
  tipo_visual: 'lapidado-redondo_led', tipo_calculo: 'unitário', preco: 500,
  sobra_largura: 0, sobra_altura: 0, preco_jato: 0, preco_adesivo: 0, porcentagem_aumento: 0, ...campos });
const entrada = (acb = acabamento(), campos = {}) => ({ largura: 1000, altura: 1000, quantidade: 1, precoVidroM2: 100, acabamento: acb, ...campos });

test('LED segue preço e sobras cadastrados, sem margem ou percentual fixo', () => {
  assert.equal(calcularEspelho(entrada(acabamento({ sobra_largura: 30, sobra_altura: 30 }))).total, 669);
  assert.equal(calcularEspelho(entrada(acabamento({ preco: 999, sobra_largura: 80, sobra_altura: 80 }))).total, 1323);
});
test('renomear acabamento não altera a regra financeira', () => {
  assert.equal(calcularEspelho(entrada()).total,
    calcularEspelho(entrada(acabamento({ nome: 'Outro nome' }))).total);
});
test('cada unidade usa a base correta e multiplica a quantidade', () => {
  for (const [tipo_calculo, total] of [['m2', 220], ['metro_linear', 280], ['unitário', 220], ['porcentagem', 220]]) {
    assert.equal(calcularEspelho(entrada(acabamento({ tipo_calculo, preco: 10, porcentagem_aumento: 10 }), { quantidade: 2 })).total, total);
  }
});
test('sobras em cm e arredondamento de 50 mm se aplicam a cada peça do jogo', () => {
  const c = calcularEspelho(entrada(acabamento({ tipo_visual: 'bisote-jogo', preco: 0, sobra_largura: 1, sobra_altura: 2 }), { divisoesLargura: 2, divisoesAltura: 2 }));
  assert.equal(c.memoriaCalculo.larguraCobrada, 550);
  assert.equal(c.memoriaCalculo.alturaCobrada, 550);
  assert.equal(c.m2, 1.21);
  assert.equal(c.total, 121);
});
test('jogo 2x2 cobra 8 metros e quatro unidades de acabamento', () => {
  const campos = { divisoesLargura: 2, divisoesAltura: 2 };
  const linear = calcularEspelho(entrada(acabamento({ tipo_visual: 'lapidado-jogo', tipo_calculo: 'metro_linear', preco: 10 }), campos));
  assert.equal(linear.memoriaCalculo.metrosLineares, 8);
  assert.equal(linear.total, 180);
  assert.equal(calcularEspelho(entrada(acabamento({ tipo_visual: 'lapidado-jogo', preco: 10 }), campos)).total, 140);
});
test('divisões de jogo não alteram espelho de outro formato nem quantidade no PDF', () => {
  const c = calcularEspelho(entrada(null, { divisoesLargura: 3, divisoesAltura: 2 }));
  assert.equal(c.quantidadePecas, 1);
  assert.equal(quantidadePecasEspelho({ tipoVisual: 'padrao', quantidade: 2, divisoesLargura: 3 }), 2);
  assert.equal(quantidadePecasEspelho({ tipoVisual: 'lapidado-jogo', quantidade: 2, divisoesLargura: 3, divisoesAltura: 2 }), 12);
});
test('zero nos adicionais é zero, e adicionais preenchidos valem em qualquer formato', () => {
  assert.equal(calcularEspelho(entrada(acabamento({ preco: 0 }))).total, 100);
  const c = calcularEspelho(entrada(acabamento({ nome: 'Orgânico', tipo_visual: 'lapidado-organico', preco: 0, preco_jato: 20, preco_adesivo: 30 })));
  assert.equal(c.total, 150);
});
test('porcentagem incide apenas no vidro, com adicionais separados', () => {
  const c = calcularEspelho(entrada(acabamento({ tipo_calculo: 'porcentagem', porcentagem_aumento: 25, preco_jato: 20, preco_adesivo: 30 })));
  assert.equal(c.memoriaCalculo.valorAcabamento, 25);
  assert.equal(c.total, 175);
});
test('valores decimais e arredondamento monetário', () => {
  const c = calcularEspelho(entrada(acabamento({ preco: '12,50', preco_jato: '0,01' }), { largura: 1001, altura: 1001 }));
  assert.equal(c.m2, 1.1025);
  assert.equal(c.total, 122.76);
});
test('configuração inválida não se converte silenciosamente em acabamento gratuito', () => {
  assert.throws(() => calcularEspelho(entrada(acabamento({ tipo_calculo: 'inexistente' }))), /Unidade/);
  assert.throws(() => calcularEspelho(entrada(acabamento({ preco: -1 }))), /Preço/);
  assert.throws(() => calcularEspelho(entrada(acabamento({ preco_jato: 'abc' }))), /jato/);
  assert.throws(() => calcularEspelho(entrada(null, { quantidade: 1.5 })), /inteiro/);
  assert.throws(() => calcularEspelho(entrada(null, { largura: -1 })), /Largura/);
});
const itemSalvo = () => {
  const acb = acabamento({ tipo_calculo: 'porcentagem', porcentagem_aumento: 20, preco_jato: 10 });
  const calculo = calcularEspelho(entrada(acb));
  return { id: 'i', vidroId: 'v1', acabamentoId: acb.id, descricao: 'Espelho prata - ' + acb.nome,
    tipoVisual: acb.tipo_visual, medidas: '1000x1000', larguraReal: 1000, alturaReal: 1000, quantidade: 1,
    divisoesLargura: 1, divisoesAltura: 1, precoVidroM2: 100, ...calculo };
};
test('snapshot é independente do cadastro e sobrevive à persistência JSON', () => {
  const acb = acabamento(); const c = calcularEspelho(entrada(acb)); acb.preco = 999;
  assert.equal(c.memoriaCalculo.entrada.acabamento.preco, 500);
  const salvo = JSON.parse(JSON.stringify(c));
  assert.equal(calcularEspelho(salvo.memoriaCalculo.entrada).total, salvo.total);
});
test('troca de vidro recalcula porcentagem e mantém jato e unidade do snapshot', () => {
  const item = itemSalvo();
  const novo = trocarVidroEspelho(item, { id: 'v2', descricao: 'Espelho bronze', preco: 200 });
  assert.equal(novo.total, 250);
  assert.equal(novo.memoriaCalculo.valorAcabamento, 40);
  assert.equal(novo.memoriaCalculo.valorJato, 10);
  assert.equal(novo.vidroId, 'v2');
  assert.equal(item.total, 130);
});
test('item antigo sem snapshot exige revisão em vez de perder acabamento', () => {
  assert.throws(() => trocarVidroEspelho({ total: 500 }, { id: 'v2', descricao: 'Espelho', preco: 200 }), /antes da atualização/);
});
test('Central sincroniza snapshot, materiais, relação e total ao trocar vidro', () => {
  const item = itemSalvo();
  const comp = { projeto: 'Espelhos avulsos', espelhoItens: [item],
    materiais: [{ id: 'm', descricao: 'ESPELHO', qtd: 1, unidade: 'm2', valorUnitario: 130 }],
    vidrosAvulsos: [{ id: 'a', vidro: item.descricao, medida: '1000x1000', quantidade: 1, valorTotal: 130 }] };
  const novo = trocarVidroComposicaoEspelhos(comp, { id: 'v2', descricao: 'Espelho bronze', preco: 200 }, () => true);
  assert.equal(novo.valorTotal, 250);
  assert.equal(novo.materiais[0].valorUnitario, 250);
  assert.equal(novo.vidrosAvulsos[0].valorTotal, 250);
  assert.equal(novo.vidrosAvulsos[0].areaCobradaM2, 1);
  assert.equal(novo.espelhoItens[0].memoriaCalculo.total, 250);
  assert.equal(comp.espelhoItens[0].total, 130);
});
test('troca parcial preserva o item de outro vidro', () => {
  const um = itemSalvo(); const dois = { ...itemSalvo(), descricao: 'Outro vidro' };
  const c = trocarVidroComposicaoEspelhos({ projeto: 'Espelhos avulsos', espelhoItens: [um, dois] },
    { id: 'v2', descricao: 'Espelho bronze', preco: 200 }, desc => desc !== 'Outro vidro');
  assert.equal(c.valorTotal, 380);
  assert.equal(c.espelhoItens[1], dois);
});

// Executa as funções reais da tela com dependências locais, sem gravar no banco.
function funcaoDaTela(nome, contexto) {
  const arquivo = path.resolve(__dirname, '../src/app/(calculos)/calculo/espelhos/page.tsx');
  const texto = fs.readFileSync(arquivo, 'utf8');
  const ast = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaracao;
  function visitar(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === nome) declaracao = node;
    ts.forEachChild(node, visitar);
  }
  visitar(ast);
  assert.ok(declaracao, `Função ${nome} encontrada na tela`);
  const codigo = ts.transpileModule(`const resultado = ${declaracao.initializer.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return new Function(...Object.keys(contexto), `${codigo}\nreturn resultado;`)(...Object.values(contexto));
}
test('tela calcula o acabamento selecionado e grava sua memória junto ao item', () => {
  const regra = acabamento({ preco: 30 });
  const contexto = { largura: '1001', altura: '1000', quantidade: 2, vidroId: 'v1', acabamentoId: '7',
    vidrosDB: [{ id: 'v1', nome: 'Espelho', tipo: 'Prata', espessura: '4 mm', preco: 100 }],
    acabamentosDB: [acabamento({ id: 8, preco: 999 }), regra], divisoesLargura: 1, divisoesAltura: 1,
    catalogosCarregados: true, erroCatalogo: '', useMemo: fn => fn(), calcularEspelho,
    itemEmEdicao: null, criarId: () => 'novo', normalizarPrecoCatalogo: Number };
  contexto.calculoAtual = funcaoDaTela('calculoAtual', contexto);
  const item = funcaoDaTela('criarItemDoFormulario', contexto)();
  assert.equal(item.acabamentoId, '7');
  assert.equal(item.total, 270);
  assert.equal(item.memoriaCalculo.entrada.acabamento.preco, 30);
  assert.equal(item.memoriaCalculo.arredondamentoMm, 50);
  assert.match(item.descricao, /Lapidado/);
});
test('tela bloqueia acabamento excluído em vez de assumir preço zero', () => {
  const calculo = funcaoDaTela('calculoAtual', { largura: '1000', altura: '1000', quantidade: 1,
    vidroId: 'v1', acabamentoId: 'removido', vidrosDB: [{ id: 'v1', preco: 100 }], acabamentosDB: [],
    divisoesLargura: 1, divisoesAltura: 1, catalogosCarregados: true, erroCatalogo: '',
    useMemo: fn => fn(), calcularEspelho });
  assert.match(calculo.erro, /acabamento não está disponível/);
  assert.equal(calculo.memoriaCalculo, undefined);
});
test('salvamento usa o item em edição atualizado sem perder a memória', () => {
  const antigo = itemSalvo(); const atualizado = { ...antigo, total: 250 };
  const obter = funcaoDaTela('obterItensParaSalvar', { itemEmEdicao: antigo.id,
    camposOriginaisRef: { current: 'medidas anteriores' }, largura: '2000', altura: '1000', quantidade: 1,
    vidroId: 'v1', acabamentoId: '7', divisoesLargura: 1, divisoesAltura: 1,
    criarItemDoFormulario: () => atualizado, listaItens: [antigo] });
  assert.equal(obter()[0], atualizado);
});
test('edição com cadastro inválido impede salvar alterações silenciosamente', () => {
  let aviso = '';
  const obter = funcaoDaTela('obterItensParaSalvar', { itemEmEdicao: 'i',
    camposOriginaisRef: { current: 'anterior' }, largura: '2000', altura: '1000', quantidade: 1,
    vidroId: 'v1', acabamentoId: 'removido', divisoesLargura: 1, divisoesAltura: 1,
    criarItemDoFormulario: () => null, listaItens: [itemSalvo()], calculoAtual: { erro: 'Acabamento indisponível' },
    setModalAvisoTitulo: () => {}, setModalAvisoMensagem: msg => { aviso = msg; }, setShowModalAviso: () => {} });
  assert.equal(obter(), undefined);
  assert.equal(aviso, 'Acabamento indisponível');
});
