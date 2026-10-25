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
  new Function('require', 'module', 'exports', codigo)(nome => carregar(
    nome.startsWith('@/') ? path.resolve(__dirname, '../src', nome.slice(2) + '.ts') : path.resolve(path.dirname(arquivo), nome + '.ts')
  ), modulo, modulo.exports);
  return modulo.exports;
}
const { corMaterialSelecionada, materiaisConformeCor, resultadoConformeCor } = carregar(path.resolve(__dirname, '../src/utils/materiaisConformeCor.ts'));

test('seleções vazias e placeholders não liberam materiais', () => {
  for (const cor of [undefined, null, '', ' ', 'Escolher', 'Escolher cor perfil', 'Não selecionada', 'Nao selecionada', 'Selecione']) {
    assert.equal(corMaterialSelecionada(cor), false, String(cor));
  }
  for (const cor of ['Branco', 'Preto', 'Fosco', 'Bronze', 'Inox']) assert.equal(corMaterialSelecionada(cor), true);
});

test('apenas vidro compõe o total sem cor; escolher e retirar cor não perde materiais nem preços editados', () => {
  const materiais = [
    { id: 'vidro', descricao: 'VIDRO FIXO 1000x1000 INCOLOR', unidade: 'm2', qtd: 2, valorUnitario: 198 },
    { id: 'kit', descricao: 'KIT JANELA', unidade: 'und', qtd: 1, valorUnitario: 300 },
    { id: 'suporte', descricao: 'SUPORTE VIDRO', unidade: 'und', qtd: 4, valorUnitario: 20 },
    { id: 'extra', descricao: 'VIDRO PERFIL EXTRA', unidade: 'm2', perfilExtra: {}, qtd: 1, valorUnitario: 90 },
  ];
  const copia = structuredClone(materiais);
  const semCor = materiaisConformeCor(materiais, 'Escolher');
  assert.deepEqual(semCor.map(m => m.id), ['vidro']);
  assert.equal(semCor.reduce((s, m) => s + m.qtd * m.valorUnitario, 0), 396);
  assert.strictEqual(materiaisConformeCor(materiais, 'Preto'), materiais);
  assert.deepEqual(materiaisConformeCor(materiais, ''), semCor);
  assert.deepEqual(materiais, copia);
});

for (const [arquivo, funcao, extras] of [
  ['sacada-torre-calc', 'calcularSacadaTorre', { quantidadeTorresPorVidro: 1, torreCodigo: 'TORRE', precoTorreUnitario: 150 }],
  ['sacada-grapa-calc', 'calcularSacadaGrapa', { grapasLateraisPorVao: 2, grapasInferioresPorVao: 2, grapas1305PorUniao: 1, tuboPosicao: 'em-cima', tuboCodigo: 'TUBO', precoTuboBarra: 100 }],
]) test(`${arquivo}: sem cor mantém medidas, peças e vidro, sem cobrar acessórios ou perfis`, () => {
  const calcular = carregar(path.resolve(__dirname, `../src/utils/${arquivo}.ts`))[funcao];
  const completo = calcular({ larguraVaoMm: 3000, alturaVaoMm: 1000, quantidadeVaos: 2, quantidadeDivisoesLargura: 3, precoVidroM2: 198, precoGrapa3019: 25, precoGrapa1305: 30, ...extras });
  assert.ok(completo.totalGeral > completo.totalVidro);
  const parcial = resultadoConformeCor(completo, '');
  assert.equal(parcial.totalGeral, completo.totalVidro);
  assert.equal(parcial.quantidadeTotalVidros, 6);
  assert.equal(parcial.areaTotalVidro, completo.areaTotalVidro);
  assert.deepEqual(parcial.acessorios, []);
  assert.deepEqual(parcial.perfis, []);
  assert.equal(parcial.totalPerfis + parcial.totalAcessorios, 0);
  assert.strictEqual(resultadoConformeCor(completo, 'Branco'), completo);
});
