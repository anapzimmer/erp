const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {test}=require('node:test');const assert=require('node:assert/strict');
function functionsFrom(path,names,globals={}){
 const source=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),decls=new Map(),selected=new Set();
 for(const stmt of ast.statements){if(ts.isVariableStatement(stmt))for(const d of stmt.declarationList.declarations)if(ts.isIdentifier(d.name))decls.set(d.name.text,`const ${d.getText(ast)};`);if(ts.isFunctionDeclaration(stmt)&&stmt.name)decls.set(stmt.name.text,stmt.getText(ast));}
 function add(name){if(selected.has(name)||!decls.has(name)||name in globals)return;selected.add(name);const a=ts.createSourceFile('x.tsx',decls.get(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function walk(n){if(ts.isIdentifier(n))add(n.text);ts.forEachChild(n,walk);}walk(a);}
 names.forEach(add);const code=[...selected].reverse().map(n=>decls.get(n)).join('\n');return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText+`\n;({${names.join(',')}})`,globals);
}
const central=functionsFrom('src/app/(projetos)/central-impressao/page.tsx',['calcularOtimizacaoPerfis'],{descricaoSemMarcadorExtra:s=>s.replace(/\s*\[PERFIL EXTRA\]\s*$/i,'')});
const pdf=functionsFrom('src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx',['consolidarPerfisPorOrigem'],functionsFrom('src/utils/ordemMateriais.ts',['compararMateriaisRelacao','ehKitBatenteMaterial','ordemPerfilMaterial']));
const extra={id:'extra',descricao:'U01 - PERFIL PARA VIDRO | BRANCO [PERFIL EXTRA]',codigoPerfil:'U01',unidade:'barra',qtd:1,valorUnitario:120,comprimentoBarra:6000,cortes:[2000,2000],perfilExtra:{perfilId:'1',referencia:'altura',quantidadePorVao:1,ajuste:0,medidaManual:0}};
for(const page of ['fixos','pg','pg2f','pfv1f-kit','pfv1f-barra','pfv2f-kit','pfv2f-barra'])test(`${page}: recálculo de vidro preserva perfil extra`,()=>{
 const s=fs.readFileSync(`src/app/(calculos)/${page}/page.tsx`,'utf8');const expression=s.match(/const indiceVidro = ([\s\S]*?);/)[1];const lista=[structuredClone(extra),{id:'vidro',descricao:'VIDRO INCOLOR',unidade:'m2',qtd:2}];assert.equal(vm.runInNewContext(expression,{lista}),1);
});
test('perfil extra de dois vãos chega ao aproveitamento e à relação da obra após serializar',()=>{
 const item=JSON.parse(JSON.stringify({projeto:'Porta de giro',quantidade:2,materiais:[extra]}));
 const barras=central.calcularOtimizacaoPerfis([item]);assert.equal(barras.length,1);assert.equal(barras[0].totalCortes,2);assert.equal(barras[0].barras.length,1);
 const relacao=pdf.consolidarPerfisPorOrigem([item],'projetos');assert.equal(relacao.length,1);assert.equal(relacao[0].codigo,'U01');assert.equal(relacao[0].qtd,1);
});


const vitrine=functionsFrom('src/app/(calculos)/fixo-bandeira/page.tsx',['formatarDescricaoTubo']);
test('tubo escolhido na vitrine e extra em outro projeto compartilham uma barra',()=>{
 const descricao=vitrine.formatarDescricaoTubo({codigo:'T01',nome:'TUBO RETANGULAR',cores:'Branco'});
 const tubo={...extra,perfilExtra:undefined,codigoPerfil:'T01',descricao,cortes:[3500]};
 const adicional={...extra,codigoPerfil:'T01',descricao:'T01 - TUBO RETANGULAR CADASTRADO | BRANCO [PERFIL EXTRA]',cortes:[2000]};
 const resultado=central.calcularOtimizacaoPerfis([{projeto:'Fixo com bandeira',materiais:[tubo]},{projeto:'Porta de giro',materiais:[adicional]}]);
 assert.equal(resultado.length,1);assert.equal(resultado[0].totalCortes,2);assert.equal(resultado[0].barras.length,1);assert.equal(resultado[0].barrasOriginais,2);assert.equal(resultado[0].valorOtimizado,120);
});
test('cores e comprimentos de barra diferentes permanecem separados',()=>{
 const materiais=[extra,{...extra,descricao:extra.descricao.replace('BRANCO','PRETO')},{...extra,comprimentoBarra:3000}];
 assert.equal(central.calcularOtimizacaoPerfis([{projeto:'Fixos',materiais}]).length,3);
});
