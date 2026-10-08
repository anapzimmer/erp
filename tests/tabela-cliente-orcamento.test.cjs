const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/tabelaClienteOrcamento.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api});
test('reconhece nome antigo em maiúsculas, espaços e acentos',()=>assert.equal(api.identificarTabelaCliente([{nome:'  SCHNEIDER COMÉRCIO  DE VIDROS ',grupo_preco_id:'A'}],'Schneider Comercio De Vidros'),'A'));
test('cliente sem tabela identifica padrão explicitamente',()=>assert.equal(api.identificarTabelaCliente([{nome:'Ana',grupo_preco_id:null}],'ANA'),null));
test('nome desconhecido exige escolha sem atribuir padrão',()=>assert.equal(api.identificarTabelaCliente([{nome:'Ana',grupo_preco_id:'A'}],'Outro'),undefined));
test('homônimos não escolhem uma tabela arbitrariamente',()=>assert.equal(api.identificarTabelaCliente([{nome:'Ana',grupo_preco_id:'A'},{nome:'ANA',grupo_preco_id:'B'}],'Ana'),undefined));
test('cliente vazio não corresponde a registro vazio',()=>assert.equal(api.identificarTabelaCliente([{nome:'',grupo_preco_id:'A'}],' '),undefined));
