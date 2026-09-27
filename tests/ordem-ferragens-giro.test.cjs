const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/ordemMateriais.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const codigos=['1101A','1201A','1103A','1013A','1520AROU-CIL','1520TAROU-CIL','1520P','1520TAP','MFLY','1531','1504A','1504ATA','1504TA','1038B','1038.C','1335'];
for(const cor of ['', '-PT', '-BC', '-BZ']) test('ordena ferragens com acabamento '+(cor||'sem sufixo'),()=>{
 const itens=codigos.map(c=>({descricao:c+cor+' - FERRAGEM VIDRO / VIDRO',unidade:'und'}));
 const embaralhados=[...itens].reverse();
 assert.deepEqual(embaralhados.sort(api.compararMateriaisRelacao),itens);
 assert.deepEqual([...itens].reverse().sort((a,b)=>api.ordemMaterialRelacao(a)-api.ordemMaterialRelacao(b)),itens);
});
test('código cadastrado e descrição usam a mesma ordem',()=>{
 for(const codigo of codigos) assert.equal(api.ordemMaterialRelacao({codigo:codigo+'-PT'}),api.ordemMaterialRelacao({descricao:codigo+'-PT - PEÇA'}));
});
test('vidro permanece antes das ferragens',()=>assert.ok(api.ordemMaterialRelacao({descricao:'VIDRO 2 PECAS',unidade:'m2'})<api.ordemMaterialRelacao({descricao:'1101A-PT - DOBRADICA'})));
