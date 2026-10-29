const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const path=require('node:path');
function carregar(file){
 const m={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('exports','require',js)(m.exports,p=>carregar(path.resolve(path.dirname(file),p+'.ts')));
 return m.exports;
}
const {preservarPrecosOrcamento}=carregar('src/utils/preservarPrecosOrcamento.ts');
const {precoMaterialVidro}=carregar('src/utils/regraMedidaVidro.ts');
const {descricaoSemMarcadorExtra,atualizarPerfilExtra}=carregar('src/utils/perfisExtras.ts');
const normalizarTexto=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function efeito(file){
 const s=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let body;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(s)==='useEffect'&&n.arguments[0]?.getText(s).includes('const vidroNome ='))body=n.arguments[0].body.getText(s);ts.forEachChild(n,visit);}
 visit(s);assert.ok(body);
 return ctx=>new Function(...Object.keys(ctx),ts.transpileModule(body.slice(1,-1),{}).outputText)(...Object.values(ctx));
}
for(const rota of ['fixos','fixo-bandeira'])test(`${rota}: retorno da central preserva preços durante restauração e recálculo`,()=>{
 const run=efeito(`src/app/(calculos)/${rota}/page.tsx`);
 const bandeira=rota==='fixo-bandeira';
 let materiais=[{id:'v1',descricao:`VIDRO ${bandeira?'INFERIOR ':''}975x1975 INCOLOR 08MM TEMPERADO`,unidade:'m2',qtd:2,valorUnitario:145}];
 if(bandeira)materiais.push({id:'v2',descricao:'VIDRO BANDEIRA 975x475 INCOLOR 08MM TEMPERADO',unidade:'m2',qtd:0.5,valorUnitario:160});
 const original=structuredClone(materiais);
 const ctx={rascunhoRestaurado:false,carregandoVidros:false,dados:{vidro:'Escolher',vidroBandeira:'Escolher'},calculoVidro:{},precoVidroM2:0,precoVidroBandeiraM2:0,regraMedidaVidro:undefined,normalizarTexto,preservarPrecosOrcamento,precoMaterialVidro,criarMaterial:m=>({id:'novo',...m}),setMateriais:f=>{materiais=f(materiais)},editId:null,centralItemId:'central-1',searchParams:new URLSearchParams()};
 run(ctx);assert.deepEqual(materiais,original);
 Object.assign(ctx,{rascunhoRestaurado:true,carregandoVidros:true,dados:{vidro:'Incolor 08mm Temperado',vidroBandeira:'Incolor 08mm Temperado'},calculoVidro:{larguraMedida:1175,alturaMedida:1975,areaTotalCobrada:2.4,areaInferior:2.4,larguraBandeiraMedida:1175,alturaBandeiraMedida:475,areaBandeira:0.6}});
 run(ctx);assert.deepEqual(materiais,original);
 Object.assign(ctx,{carregandoVidros:false,precoVidroM2:200,precoVidroBandeiraM2:220});run(ctx);
 assert.equal(materiais[0].valorUnitario,145);assert.equal(materiais[0].qtd,2.4);
 if(bandeira)assert.equal(materiais[1].valorUnitario,160);
});
test('central: tubo automático e extras manuais compartilham barras, cores diferentes não',()=>{
 const file='src/app/(projetos)/central-impressao/page.tsx';
 const s=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['extrairCodigoPerfil','itemTemCortesDeBarra','itemParticipaOtimizacaoBarras','origemOtimizacaoItem','chaveOtimizacaoPerfil','dividirCortePorBarra','otimizarCortes','calcularOtimizacaoPerfis'];
 const declarations=[];
 for(const n of s.statements)if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(names.includes(d.name.getText(s)))declarations.push(`const ${d.getText(s)};`);
 assert.equal(declarations.length,names.length);
 const js=ts.transpileModule(declarations.join('\n'),{}).outputText;
 const otimizar=new Function('normalizarTexto','descricaoSemMarcadorExtra','ehSacadaFrontal','ehSacadaComTorre','ehSacadaGrapa','ehPeleDeVidro','ehFechamentoSacada','ordemPerfilOtimizado',js+';return calcularOtimizacaoPerfis;')(normalizarTexto,descricaoSemMarcadorExtra,...Array(5).fill(()=>false),()=>0);
 const base={id:'tubo',codigoPerfil:'TR032',descricao:'TR032 - TUBO RETANGULAR | PRETO',unidade:'barra',qtd:1,valorUnitario:100,comprimentoBarra:6000,cortes:[2400]};
 const extras=[1100,1700].map((medida,i)=>atualizarPerfilExtra({...base,id:`extra${i}`,descricao:base.descricao+' [PERFIL EXTRA]',perfilExtra:{referencia:'manual',medidaManual:medida,ajuste:0,quantidadePorVao:1,perfilId:'1'}},{largura:2400,altura:2000,quantidade:1}));
 const grupos=otimizar([{projeto:'Fixo com bandeira',materiais:[base,...extras]}]);
 assert.equal(grupos.length,1);assert.equal(grupos[0].totalCortes,3);assert.deepEqual(grupos[0].barras,[[2400,1700,1100]]);
 const outro={...extras[0],descricao:'TR032 - TUBO RETANGULAR | BRANCO [PERFIL EXTRA]'};
 assert.equal(otimizar([{projeto:'Fixo com bandeira',materiais:[base,outro]}]).length,2);
});
