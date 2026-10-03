const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/formatarNome.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api });

for (const [entrada, esperado] of [
  ['VIDRO INCOLOR', 'Vidro Incolor'],
  ['Tabela a', 'Tabela A'],
  ['TABELA B', 'Tabela B'],
  ['  MARIA   DA SILVA  ', 'Maria Da Silva'],
  ['JOÃO GONÇALVES', 'João Gonçalves'],
  ['VIDRAÇARIA CENTRAL LTDA', 'Vidraçaria Central LTDA'],
  ['comercial vidro me', 'Comercial Vidro ME'],
  ['CHAPA ACM E PERFIL PVC', 'Chapa ACM E Perfil PVC'],
  ['ANA BOX COR', 'Ana Box Cor'],
  ['DOBRADIÇA 1101A-PT E VT66', 'Dobradiça 1101A-PT E VT66'],
  ['CONTRA V/V 1504ATA-PT', 'Contra V/V 1504ATA-PT'],
  ['VIDRO INCOLOR 08MM', 'Vidro Incolor 08mm'],
  ['VIDRO 10 MM', 'Vidro 10 mm'],
  ['EMPRESA S/A', 'Empresa S/A'],
  ['EMPRESA S.A.', 'Empresa S.A.'],
  ['CHAPECÓ SC', 'Chapecó SC'],
  ['', ''],
  [null, ''],
]) test(JSON.stringify(entrada) + ' → ' + esperado, () => {
  assert.equal(api.formatarNomePadrao(entrada), esperado);
  assert.equal(api.formatarNomePadrao(esperado), esperado, 'formatação deve ser estável');
});
