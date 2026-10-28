const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/utils/comparacaoValorRevisao.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(mod.exports);
const comparar = mod.exports.compararValorRevisao;
test('mostra acréscimo, redução e igualdade em centavos', () => {
  assert.equal(comparar({valorTotal:100},{valorTotal:120}).diferenca,20);
  assert.equal(comparar({valorTotal:100},{valorTotal:80}).diferenca,-20);
  assert.equal(comparar({valorTotal:0.1},{valorTotal:0.3}).diferenca,0.2);
  assert.equal(comparar({total:'10.00'},{valorTotal:10}).diferenca,0);
});
test('valor zero é válido, valor ausente ou inválido não vira zero', () => {
  assert.equal(comparar({valorTotal:0},{valorTotal:10}).diferenca,10);
  for (const v of [undefined,null,'',true,NaN,Infinity,-1,'1.234,56']) {
    assert.equal(comparar({valorTotal:v},{valorTotal:10}).diferenca,null);
    assert.equal(comparar({valorTotal:10},{valorTotal:v}).diferenca,null);
  }
});
test('preserva totais com descontos sem multiplicar quantidade ou somar materiais', () => {
  const antes = Object.freeze({valorTotal:90,quantidade:2,materiais:[{valorTotal:100}],desconto:10});
  const depois = Object.freeze({valorTotal:110,quantidade:2,materiais:[{valorTotal:120}],desconto:10});
  assert.deepEqual(comparar(antes,depois),{anterior:90,recalculado:110,diferenca:20});
  assert.equal(comparar({materiais:[{valorTotal:100}]},depois).anterior,null);
});
