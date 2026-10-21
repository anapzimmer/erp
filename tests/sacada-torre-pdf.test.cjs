const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:1,jsx:2,target:9,esModuleInterop:true}}).outputText;
test('gera PDF completo com o SVG real da sacada e cotas semibold', {skip:process.platform!=='win32'}, async()=>{
 const file='src/app/(calculos)/calculo/sacadatorre/page.tsx';
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,99,true,ts.ScriptKind.TSX);
 const decl=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations[0].name.getText(ast)==='gerarSvgSacadaTorre');
 const svg=new Function('corPerfilSvg','DRAWING_COLORS',compile(decl.getText(ast))+';return gerarSvgSacadaTorre({largura:3000,altura:1000,divisoes:3,torresPorVidro:2,codigoTorre:"TORRE",corPerfil:"fosco"});')(()=>({fill:'#9aa0a6',stroke:'#68717a',shadow:'#c4c9ce'}),{ink:'#333',glass:'#fff'});
 // Usa o parser XML do Windows para reproduzir o DOM do navegador sem dependências novas.
 const ps="[xml]$doc=[Console]::In.ReadToEnd(); function Convert-Element($e) { @{localName=$e.LocalName; attributes=@($e.Attributes|ForEach-Object {@{name=$_.Name;value=$_.Value}}); textContent=$e.InnerText; children=@($e.ChildNodes|Where-Object {$_.NodeType -eq 'Element'}|ForEach-Object {Convert-Element $_})} }; Convert-Element $doc.DocumentElement | ConvertTo-Json -Depth 50 -Compress";
 const tree=JSON.parse(require('child_process').execFileSync('powershell',['-NoProfile','-Command',ps],{input:svg,encoding:'utf8'}));
 const DOMParser=class{parseFromString(){return {documentElement:tree,querySelector:()=>null};}};
 const out={};new Function('exports','require','DOMParser',compile(fs.readFileSync('src/app/relatorios/sacadatorre/desenhoSalvoPDF.tsx','utf8')))(out,require,DOMParser);
 const {renderToBuffer,Document,Page}=await import('@react-pdf/renderer');
 const drawing=out.desenhoSalvoPDF('data:image/svg+xml,'+encodeURIComponent(svg),500,250);
 assert.ok(drawing);
 const buffer=await renderToBuffer(React.createElement(Document,null,React.createElement(Page,null,drawing)));
 assert.equal(buffer.subarray(0,5).toString(),'%PDF-');assert.ok(buffer.length>1000);
 if(process.env.GLASSCODE_PDF_TEST_OUTPUT)fs.writeFileSync(process.env.GLASSCODE_PDF_TEST_OUTPUT,buffer);
});
for(const path of ['src/app/(projetos)/central-impressao/page.tsx','src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx']){
 const src=fs.readFileSync(path,'utf8'), ast=ts.createSourceFile(path,src,99,true,ts.ScriptKind.TSX);
 const selected=ast.statements.filter(n=>ts.isVariableStatement(n)&&['ehSacadaComTorre','multiplicadorPecasProjeto'].includes(n.declarationList.declarations[0].name.getText(ast)));
 const fn=new Function(compile(selected.map(n=>n.getText(ast)).join('\n'))+';return multiplicadorPecasProjeto;')();
 test(path+' conta cada vidro dividido por vão',()=>{
  for(const nome of ['Sacada com torre','Sacada na torre']){
   assert.equal(2*fn(nome,{pecasDivisao:3}),6);
   assert.equal(fn(nome,{pecasDivisao:4}),4);
   assert.equal(fn(nome,{}),1);
  }
 });
}
test('desenho vetorial preserva três vidros, seis torres e contorno fosco',()=>{
 const src=fs.readFileSync('src/app/relatorios/sacadatorre/DesenhoSacadaTorrePDF.tsx','utf8');
 const out={};new Function('exports','require',compile(src))(out,n=>n==='react'?React:n==='@react-pdf/renderer'?{G:'g',Line:'line',Rect:'rect',Svg:'svg',Text:'text'}:n==='./desenhoSalvoPDF'?{desenhoSalvoPDF:()=>null}:{PDF_COLORS:{softMuted:'#888',muted:'#777',white:'#fff',ink:'#333'}});
 const node=out.DesenhoSacadaTorrePDF({larguraVaoMm:3000,alturaVaoMm:1000,divisoesPorVao:3,torresPorVidro:2});
 const walk=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props.children).flatMap(walk)];
 const nodes=walk(node);
 assert.equal(nodes.filter(n=>n.type==='g'&&String(n.key).includes('vidro-')).length,3);
 assert.equal(nodes.filter(n=>n.type==='rect'&&n.props.width===12&&n.props.height!==18).length,6);
 assert.equal(nodes.filter(n=>n.type==='rect'&&n.props.fill==='#e5e7e9').length,4);
 assert.ok(!nodes.some(n=>n.props.stroke==='#000000'||n.props.fill==='#000000'));
});
test('PDF prioriza o desenho salvo no orçamento em vez de reconstruir a geometria',()=>{
 const src=fs.readFileSync('src/app/relatorios/sacadatorre/DesenhoSacadaTorrePDF.tsx','utf8'),out={};
 const saved=React.createElement('svg',{viewBox:'0 0 900 420'});
 new Function('exports','require',compile(src))(out,n=>n==='react'?React:n==='./desenhoSalvoPDF'?{desenhoSalvoPDF:(url,w,h)=>{assert.equal(url,'desenho-do-orcamento');assert.equal(w,112);assert.equal(h,104);return saved;}}:{});
 assert.equal(out.DesenhoSacadaTorrePDF({desenhoUrl:'desenho-do-orcamento',width:112,height:104}),saved);
});
