const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const legado = require('./fixtures/box2Folhas-legado.cjs');
const arquivo = path.resolve(__dirname, '../src/utils/calculos-projetos/box2Folhas.ts');
const modulo = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(modulo.exports);
const { calcularVidrosBox2Folhas: calcular, calcularConjuntoBox2Folhas: conjunto } = modulo.exports;

test('equivalência integral com o cálculo anterior: 1.512 combinações', () => {
  for (const largura of [0, 1, 1000, 1385, 1400, 1499, 1500, 1501, 1999, 2000, 2001, 2400])
    for (const altura of [0, 20, 35, 55, 2000, 2035, 2800])
      for (const quantidade of [0, 1, 2])
        for (const trilho of ['Padrão', 'Até o teto', '', 'Tradicional', 'Outro', 'Escolher']) {
          const entrada = { largura, altura, quantidade, trilho };
          assert.deepEqual(calcular(entrada), legado(entrada));
        }
});

test('um conjunto: fabricação separada da cobrança, nos dois trilhos', () => {
  const padrao = conjunto({ largura: 1400, altura: 2800, trilho: 'Padrão' });
  const teto = conjunto({ largura: 1400, altura: 2800, trilho: 'Até o teto' });
  assert.deepEqual(padrao.pecas.map(p => p.fabricacao), [
    { largura: 700, altura: 2765 }, { largura: 750, altura: 2800 },
  ]);
  assert.deepEqual(teto.pecas.map(p => p.fabricacao), [
    { largura: 700, altura: 2745 }, { largura: 750, altura: 2780 },
  ]);
  assert.deepEqual(teto.pecas.map(p => p.cobranca), [
    { largura: 700, altura: 2750 }, { largura: 750, altura: 2800 },
  ]);
});

test('dois boxes iguais: alterar um vão não muda o outro nem duplica peças', () => {
  const entrada = Object.freeze({ largura: 1400, altura: 2800, trilho: 'Padrão' });
  const primeiro = conjunto(entrada);
  const segundo = conjunto(entrada);
  const anterior = structuredClone(segundo);
  const revisto = conjunto({ ...entrada, largura: 1385 });
  assert.deepEqual(primeiro, segundo);
  assert.deepEqual(segundo, anterior);
  assert.equal(revisto.pecas[0].fabricacao.largura, 692.5);
  assert.equal(revisto.pecas[1].fabricacao.largura, 742.5);
  assert.equal(revisto.pecas.length + segundo.pecas.length, 4);
  assert.deepEqual(conjunto(entrada), primeiro);
});

test('prévia repetida não modifica entrada, preços ou avulsos no snapshot', () => {
  const snapshot = { total: 10950.66, desconto: 10, avulsos: Array.from({ length: 17 }, (_, i) => ({ id: i })),
    entrada: Object.freeze({ largura: 1400, altura: 2800, trilho: 'Padrão' }) };
  const antes = structuredClone(snapshot);
  const a = conjunto(snapshot.entrada);
  const b = conjunto(snapshot.entrada);
  assert.deepEqual(a, b);
  assert.deepEqual(snapshot, antes);
  assert.equal('total' in a, false);
});

test('prévia rejeita medidas inválidas e trilho desconhecido', () => {
  for (const n of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => conjunto({ largura: n, altura: 2800, trilho: 'Padrão' }));
    assert.throws(() => conjunto({ largura: 1400, altura: n, trilho: 'Padrão' }));
  }
  assert.throws(() => conjunto({ largura: 1400, altura: 35, trilho: 'Padrão' }));
  assert.throws(() => conjunto({ largura: 1400, altura: 55, trilho: 'Até o teto' }));
  assert.throws(() => conjunto({ largura: 1400, altura: 2800, trilho: 'Desconhecido' }));
});

test('arredondamento não altera fabricação e área comercial mantém precisão anterior', () => {
  const c = calcular({ largura: 1385, altura: 2800, quantidade: 2, trilho: 'Até o teto' });
  assert.equal(c.larguraFixaMedida, 692.5);
  assert.equal(c.larguraFixa, 700);
  assert.equal(c.areaFixa, 3.85);
  assert.equal(c.areaMovel, 4.2);
  assert.equal(c.areaTotalCobrada, 8.05);
});
