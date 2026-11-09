const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = {exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/utils/compras.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {saldoCompra} = mod.exports;
test('quantidade de peças não repete m² e mantém conversão parcial',()=>{
 for(const [area,pecas] of [[1.5,2],[7.425,9],[1.65,1]]){
  const m={vidro:true,unidade:'m2',quantidade:area,pecas};
  assert.equal(mod.exports.quantidadeEmPecas(m,area),pecas);
  assert.ok(Math.abs(mod.exports.quantidadePorPeca(m)*pecas-area)<0.000001);
 }
 assert.equal(mod.exports.quantidadeEmPecas({vidro:true,unidade:'m2',quantidade:7.425,pecas:9},2.475),3);
 assert.equal(mod.exports.quantidadeEmPecas({vidro:true,unidade:'und',quantidade:2},2),2);
 assert.equal(mod.exports.quantidadeEmPecas({vidro:true,unidade:'m2',quantidade:2},2),null);
});
test('medidas saem da descrição somente na apresentação, sem mudar identidade',()=>{
 const m={descricao:'VIDRO FIXO 635x1865 INCOLOR 08MM TEMPERADO',medida:'',vidro:true};
 assert.deepEqual(mod.exports.apresentacaoMaterial(m),{descricao:'VIDRO FIXO INCOLOR 08MM TEMPERADO',medida:'635 × 1865 mm'});
 assert.equal(m.medida,'');assert.match(m.descricao,/635x1865/);
});
test('comparativo usa quantidade parcial e mesmo arredondamento da compra',()=>{
 const m={vidro:true,areaPorUnidade:0.6,precoOrcadoUnitario:98.87};
 assert.deepEqual(mod.exports.compararCompra(m,2,'143'),{compra:171.6,orcado:197.74,diferenca:26.14});
 assert.equal(mod.exports.compararCompra(m,1,'').diferenca,null);
 assert.equal(mod.exports.compararCompra({...m,precoOrcadoUnitario:undefined},1,'143').orcado,null);
 assert.ok(mod.exports.compararCompra(m,1,'200').diferenca<0);
});
const material={chave:'p:0',descricao:'Ferragem',unidade:'und',medida:'',cor:'Preto',quantidade:10};
const compras=[{id:'c',cancelada:false}];
const itens=[{id:'i',compra_id:'c',pedido_id:'p',chave:'p:0',material,quantidade:6}];
test('dez necessários, seis comprados, três recebidos: quatro a comprar e três aguardando',()=>{
 assert.deepEqual(saldoCompra('p',material,itens,compras,[{item_id:'i',quantidade:3}]),{comprado:6,recebido:3,aguardando:3,faltante:4,excedente:0});
});
test('revisão de material e outra empresa/pedido não reutilizam compra antiga',()=>{
 assert.equal(saldoCompra('p',{...material,cor:'Branco'},itens,compras,[]).faltante,10);
 assert.equal(saldoCompra('outro',material,itens,compras,[]).faltante,10);
});
test('estorno recompõe entrega pendente; cancelamento recompõe compra; redução avisa excesso',()=>{
 assert.equal(saldoCompra('p',material,itens,compras,[{item_id:'i',quantidade:3},{item_id:'i',quantidade:-3}]).aguardando,6);
 assert.equal(saldoCompra('p',material,itens,[{id:'c',cancelada:true}],[]).faltante,10);
 assert.equal(saldoCompra('p',{...material,quantidade:4},itens,compras,[]).excedente,2);
});
