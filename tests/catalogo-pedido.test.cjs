const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function carregar(nome) {
  const arquivo = path.resolve('src/utils', nome + '.ts'), mod = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(id => carregar(id.replace('./', '')), mod, mod.exports);
  return mod.exports;
}
const { calcularItemCatalogo: calcular } = carregar('catalogoPedido');
const { totalPedido, validarItensPedido } = carregar('pedidos');
const base = { material: { id: 'vidro-teste', nome: 'Incolor', preco: 100 }, tipo: 'vidros', quantidade: 2, largura: 1001, altura: 1000, precos: [], regra: { limite_mm: 3210, percentual: 7 } };
test('vidro arredonda 5cm e cobra quantidade uma vez', () => {
  const i = calcular(base); assert.equal(i.preco, 105); assert.equal(totalPedido([i]), 210); assert.equal(i.largura, 1001); assert.ok(validarItensPedido([i]));
});
test('tabela do cliente e limite medido antes do arredondamento', () => {
  const args = { ...base, grupo: 'cliente-a', precos: [{ vidro_id: 'vidro-teste', grupo_preco_id: 'cliente-a', preco: 200 }] };
  assert.equal(calcular({ ...args, largura: 3210 }).preco, 650);
  assert.equal(calcular({ ...args, largura: 3211 }).preco, 695.5);
  assert.equal(calcular({ ...args, grupo: 'outro' }).preco, 105);
});
test('regra personalizada e snapshot não mudam após cadastro', () => {
  const regra = { limite_mm: 1000, percentual: 10 };
  const i = calcular({ ...base, regra }); regra.percentual = 30;
  assert.equal(i.preco, 115.5); assert.equal(i.catalogo.regra.percentual, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(i)), i);
});
test('perfis aproveitam cortes e cobram por barra', () => {
  const i = calcular({ ...base, tipo: 'perfis', quantidade: 5, comprimento: 2000 });
  assert.equal(i.quantidade, 2); assert.equal(totalPedido([i]), 200); assert.equal(i.unidade, 'barra');
  assert.equal(calcular({ ...base, tipo: 'perfis', quantidade: 5 }).quantidade, 5);
});
test('ferragens e kits usam preço da cor selecionada por unidade', () => {
  for (const tipo of ['kits', 'ferragens']) {
    const i = calcular({ ...base, tipo, material: { id: 'preto', nome: 'Teste', cores: 'Preto', preco: '16,25' } });
    assert.equal(totalPedido([i]), 32.5); assert.match(i.descricao, /Preto/);
  }
});
test('bloqueia medidas, quantidades e cadastros sem preço', () => {
  for (const patch of [{ largura: 0 }, { altura: NaN }, { quantidade: 1.5 }, { quantidade: Infinity }, { material: { id: 1, nome: 'Sem preço' } }, { tipo: 'perfis', comprimento: 6001 }]) assert.throws(() => calcular({ ...base, ...patch }));
});
