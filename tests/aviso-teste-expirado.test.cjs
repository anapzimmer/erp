const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
test('aviso oferece WhatsApp do suporte com mensagem de teste expirado', () => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/components/AvisoTesteExpirado.tsx','utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
  vm.runInNewContext(code,{exports,require});
  const html=renderToStaticMarkup(React.createElement(exports.default));
  assert.match(html,/Seu prazo de teste expirou/);
  assert.match(html,/Chamar suporte no WhatsApp/);
  const url=new URL(html.match(/href="([^"]+)"/)[1]);
  assert.equal(url.origin,'https://wa.me');
  assert.equal(url.pathname,'/5546988271599');
  assert.match(url.searchParams.get('text'),/Meu prazo de teste do Glass Code expirou/);
});
