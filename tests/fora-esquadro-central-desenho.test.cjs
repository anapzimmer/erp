const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react');
const api={};
const compilar=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports',compilar(fs.readFileSync('src/utils/foraEsquadroVisual.ts','utf8')))(api);
const entrada={largura:4200,alturaInicial:1800,alturaFinal:0,quantidade:3,pecasDivisao:4};
test('três vãos preservam quatro folhas e altura final zero',()=>{
 const d=api.medidasDesenhoForaEsquadro(entrada);assert.equal(d.divisoes,4);assert.equal(d.alturaFinal,0);
 assert.equal(api.topoForaEsquadro(d.alturaInicial,d.alturaFinal,428,366).yFinal,428);
});
test('zero também é preservado no lado esquerdo',()=>assert.equal(api.medidasDesenhoForaEsquadro({...entrada,alturaInicial:0,alturaFinal:1800}).alturaInicial,0));
test('recupera geometria das peças quando faltam os campos do vão',()=>{
 const d=api.medidasDesenhoForaEsquadro({quantidade:7,foraEsquadroPecas:[{alturaEsquerda:0,alturaDireita:900},{alturaEsquerda:900,alturaDireita:1800}]});
 assert.deepEqual([d.alturaInicial,d.alturaFinal,d.divisoes],[0,1800,2]);
});
test('legado lê milhares, decimais e ponta zero nas medidas detalhadas',()=>{
 const d=api.medidasDesenhoForaEsquadro({medidasDetalhadas:'Peça 1: real 1.000 mm | 1.800,5 mm / 900,25 mm - cálculo 1000 x 1850 mm\nPeça 2: real 1.000 mm | 900,25 mm / 0 mm - cálculo 1000 x 950 mm'});
 assert.deepEqual([d.alturaInicial,d.alturaFinal,d.divisoes],[1800.5,0,2]);
});
test('não inventa inclinação de 35% quando não há altura final',()=>assert.equal(api.medidasDesenhoForaEsquadro({altura:1000}).alturaFinal,1000));
function carregarComponente(path,nome){
 const src=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile(path,src,99,true,ts.ScriptKind.TSX);
 const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===nome);
 const cores={frame:'#111',ink:'#111',glass:'#fff',edge:'#aaa',panelBg:'#fff',softMuted:'#777',white:'#fff',muted:'#555'};
 const contexto={React,...api,DRAWING_COLORS:cores,PDF_COLORS:cores,Svg:'svg',Rect:'rect',Path:'path',Line:'line',Text:'text',G:'g'};
 return new Function(...Object.keys(contexto),compilar(node.getText(ast))+';return '+nome)(...Object.values(contexto));
}
function elementos(node){if(!node||typeof node!=='object')return [];return [node,...React.Children.toArray(node.props?.children).flatMap(elementos)];}
for(const [path,nome]of [['src/app/(projetos)/central-impressao/page.tsx','ForaEsquadroPreview'],['src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx','ForaEsquadroDesenhoPDF']]){
 const render=carregarComponente(path,nome);
 test(nome+' mantém três divisórias e a ponta triangular no desenho renderizado',()=>{
  const nodes=elementos(render({item:entrada}));
  assert.equal(nodes.filter(n=>n.type==='g').length,3);
  const forma=nodes.find(n=>n.type==='polygon'||n.type==='path');
  assert.match(forma.props.points||forma.props.d,/828[, ]428/);
  const outro=elementos(render({item:{...entrada,quantidade:1}})).find(n=>n.type==='polygon'||n.type==='path');
  assert.equal(forma.props.points||forma.props.d,outro.props.points||outro.props.d);
 });
}
