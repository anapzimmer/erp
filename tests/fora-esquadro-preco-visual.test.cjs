const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const source=fs.readFileSync('src/app/(calculos)/calculo/fora-esquadro/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',source,99,true,4),fns={};
function visit(n){if(ts.isVariableDeclaration(n)&&['clienteSelecionado','precoVidroM2'].includes(n.name.getText(ast))) fns[n.name.getText(ast)]=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit)}visit(ast);
const call=(name,ctx)=>vm.runInNewContext(ts.transpileModule('('+fns[name]+')()',{compilerOptions:{target:7}}).outputText,ctx);
const clientes=[{nome:'CLIENTE Á',grupo_preco_id:'A'}];
test('cliente normalizado mantém tabela vinculada',()=>assert.equal(call('clienteSelecionado',{clientes,clienteBusca:' Cliente a '}).grupo_preco_id,'A'));
const base={clienteBusca:'Cliente',clienteSelecionado:clientes[0],vidroSelecionado:{id:'v',preco:590},precosVidroGrupos:[{vidro_id:'v',grupo_preco_id:'A',preco:145}],normalizarPrecoCatalogo:Number};
test('usa 145 da tabela do cliente em vez de 590 base',()=>assert.equal(call('precoVidroM2',base),145));
test('sem preço vinculado não usa base silenciosamente',()=>assert.equal(call('precoVidroM2',{...base,precosVidroGrupos:[]}),0));
test('cliente desconhecido não recebe preço base',()=>assert.equal(call('precoVidroM2',{...base,clienteSelecionado:null}),0));
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/foraEsquadroVisual.ts','utf8'),{compilerOptions:{module:1}}).outputText,{exports:api});
test('diferença pequena aparece inclinada nos dois sentidos e alturas iguais ficam retas',()=>{const a=api.topoForaEsquadro(2000,1990,400,300),b=api.topoForaEsquadro(1990,2000,400,300),c=api.topoForaEsquadro(2000,2000,400,300);assert.equal(a.yFinal-a.yInicial,36);assert.equal(b.yInicial-b.yFinal,36);assert.equal(c.yInicial,c.yFinal)});

let calcular;function buscar(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='calcularPecas') calcular=n.initializer.getText(ast);ts.forEachChild(n,buscar)}buscar(ast);
const pecas=entrada=>vm.runInNewContext(ts.transpileModule('('+calcular+')(entrada)',{compilerOptions:{target:7}}).outputText,{entrada,arredondarVidro50:v=>Math.ceil(Math.max(0,v)/50)*50});
test('molde acrescenta 100mm por dimensão antes dos 30%',()=>{const p=pecas({largura:1000,alturaInicial:2000,alturaFinal:1800,divisoes:1,molde:true})[0];assert.equal(p.larguraCalculo,1100);assert.equal(p.alturaCalculo,2100);assert.ok(Math.abs(p.area*100*1.3-300.3)<0.001)});
test('sem molde mantém regra de cálculo anterior',()=>{const p=pecas({largura:1000,alturaInicial:2000,alturaFinal:1800,divisoes:1})[0];assert.equal(p.larguraCalculo,1000);assert.equal(p.alturaCalculo,2050)});
