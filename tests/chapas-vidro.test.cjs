const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const dados = require('../src/data/chapasPlanilha.json');
const api = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('src/utils/chapasVidro.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText)(api, nome=>require(path.resolve('src',nome.replace('@/', ''))));
const dimensoes = (nome, espessura, tipo='Temperado') => api.chapasDisponiveisVidro({nome,espessura,tipo}).map(c=>`${c.largura_mm}x${c.altura_mm}`).sort();
test('incolor 10 mm reúne tamanhos registrados e recebimento, com largura maior',()=>{
  assert.deepEqual(dimensoes('Incolor','10mm'),['3210x2200','3210x2400','3600x2200','3600x2400','3600x2600']);
});
test('medidas de recebimento também atendem linhas sem estoque atual',()=>assert.deepEqual(dimensoes('Incolor','05mm'),['3210x2200','3210x2400']));
test('produto sem medida ou sem correspondência recebe padrão',()=>{
  for(const nome of ['Produto novo','Mini boreal']) assert.deepEqual(dimensoes(nome,'08mm'),['3210x2200']);
});
test('laminado não se confunde com monolítico de mesma espessura total',()=>{
  assert.deepEqual(dimensoes('Incolor','04+04mm','Laminado'),['3660x2140']);
  assert.notDeepEqual(dimensoes('Incolor','08mm'),['3660x2140']);
});
test('espelhos, acidatos e vidros especiais conservam suas correspondências',()=>{
  assert.deepEqual(dimensoes('Espelho Bronze','04mm','Lapidado'),['3300x2400']);
  assert.deepEqual(dimensoes('Espelho Prata','04mm','Bisotê'),['3210x2400','3210x2540']);
  assert.deepEqual(dimensoes('Acidato Incolor','08mm'),['3660x2140']);
  assert.deepEqual(dimensoes('Canelado','04mm'),['2440x1900']);
  assert.deepEqual(dimensoes('Mini Boreal','04mm'),['1900x1900']);
});
test('mantém personalizado e normaliza orientação e repetição sem mutar entrada',()=>{
  const vidro={nome:'Incolor',espessura:'10mm',chapas:[{largura_mm:2000,altura_mm:4000},{largura_mm:4000,altura_mm:2000}]};
  assert.deepEqual(api.chapasDisponiveisVidro(vidro),[{largura_mm:4000,altura_mm:2000}]);
  assert.equal(vidro.chapas[0].largura_mm,2000);
});
test('64 referências com medidas positivas e orientação correta',()=>{
  assert.equal(dados.vidros.length,64);
  assert.equal(dados.vidros.filter(v=>v.chapas.length).length,57);
  for(const v of dados.vidros) for(const c of v.chapas) assert.ok(c.largura_mm>=c.altura_mm&&c.altura_mm>0);
});
