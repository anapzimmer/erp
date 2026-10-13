const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/utils/desenhoTemperaJanela4.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(api);
const medidas = { larguraFixaMedida: 502.5, alturaFixaMedida: 1141, larguraMovelMedida: 552.5, alturaMovelMedida: 1181 };
test('gabarito Ø12: centros 50 mm das laterais e 20 mm do topo somente nos móveis', () => {
  const pecas = api.pecasJanela4(medidas, 1);
  assert.deepEqual(api.furosRoldana(pecas[0]), []);
  assert.deepEqual(api.furosRoldana(pecas[3]), []);
  for (const p of [pecas[1], pecas[2]]) assert.deepEqual(api.furosRoldana(p), [{x:50,y:20,diametro:12},{x:502.5,y:20,diametro:12}]);
});
test('preserva medidas reais sem arredondamento e quantidade por posição', () => {
  const p = api.pecasJanela4(medidas, 3);
  assert.deepEqual(p.map(x=>x.largura),[502.5,552.5,552.5,502.5]);
  assert.deepEqual(p.map(x=>x.altura),[1141,1181,1181,1141]);
  assert.equal(p.reduce((n,x)=>n+x.quantidade,0),12);
});
test('conjunto tem quatro roldanas e o trinco adiciona só dois símbolos', () => {
  const sem = api.marcasJanela4(false), com = api.marcasJanela4(true);
  assert.equal(sem.filter(x=>x.tipo==='circle').length,8);
  assert.equal(com.length-sem.length,2);
});
test('fixos não recebem ferragens; móveis têm duas roldanas e trinco opcional', () => {
  for (const p of api.pecasJanela4(medidas,1)) {
    const sem=api.marcasJanela4(false,p), com=api.marcasJanela4(true,p);
    assert.equal(sem.filter(x=>x.tipo==='circle').length,p.movel?4:0);
    assert.equal(com.length-sem.length,p.movel?1:0);
  }
});
test('fechos dos móveis ficam espelhados no encontro central', () => {
  const p=api.pecasJanela4(medidas,1);
  const fecho=i=>api.furosFechoCentral(p[i]);
  assert.equal(fecho(1)[0].x,531.5);
  assert.equal(fecho(2)[0].x,21);
  for(const i of [1,2]) {
    assert.equal(fecho(i)[1].y-fecho(i)[0].y,50);
    assert.equal(fecho(i)[0].diametro,16);
    assert.equal((fecho(i)[0].y+fecho(i)[1].y)/2,590.5);
  }
  assert.deepEqual(api.furosFechoCentral(p[0]),[]);
  assert.deepEqual(api.furosFechoCentral(p[3]),[]);
});
