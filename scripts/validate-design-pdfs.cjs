// Local visual QA fixtures, with synthetic data. Does not access Supabase.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args); };
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, resolveJsonModule: true } }).outputText, file);
const React = require('react');
const { renderToFile, Font } = require('@react-pdf/renderer');
const createElement = React.createElement;
React.createElement = (type, props, ...children) => {
  if (type === 'IMAGE' && typeof props?.src === 'string' && props.src.startsWith('/')) props = { ...props, src: fs.readFileSync(path.join(root, 'public', props.src)) };
  return createElement(type, props, ...children);
};
const { CalculoVidroPDF } = require('../src/app/relatorios/calculovidros/CalculoVidroPDF.tsx');
const { EspelhosPDF } = require('../src/app/relatorios/espelhos/EspelhosPDF.tsx');
const { FerragensPDF } = require('../src/app/relatorios/ferragens/FerragensPDF.tsx');
const { ProjetoIndividualPDF } = require('../src/app/relatorios/projetoindividual/ProjetoIndividualPDF.tsx');
const { CentralImpressaoPDF } = require('../src/app/relatorios/centralimpressao/CentralImpressaoPDF.tsx');
delete Font.getRegisteredFonts().Inter;
Font.register({ family: 'Inter', fonts: [400,500,600,700].map(weight => ({ src: path.join(root, 'public/fonts', weight === 400 ? 'Inter-Regular.ttf' : 'Inter-SemiBold.ttf'), fontWeight: weight })) });
const logoUrl = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'public/glasscode-light.png')).toString('base64');
const shared = { nomeEmpresa: 'Empresa de demonstração', nomeCliente: 'Cliente de demonstração', nomeObra: 'Obra de demonstração', numeroOrcamento: 'QA-001', logoUrl, themeColor: 'var(--text-primary)', textColor: 'var(--text-primary)' };
const material = { id: 'qa-1', descricao: 'Vidro temperado incolor 06 mm', qtd: 2, unidade: 'm²', valorUnitario: 145 };
const fixtures = [
  ['vidros', CalculoVidroPDF, { ...shared, itens: [{ id: 1, descricao: material.descricao, tipo: 'Temperado', precoVidroM2: 145, medidaReal: '1000 x 1000', medidaCalc: '1000 x 1000', qtd: 2, total: 290 }], pesoTotal: 30, metragemTotal: 2, valorTotal: 290, totalPecas: 2 }],
  ['espelhos', EspelhosPDF, { ...shared, itens: [{ id: 1, descricao: 'Espelho incolor 04 mm', medidas: '1000 x 1000', quantidade: 2, total: 290, precoVidroM2: 145, tipoVisual: 'redondo', m2: 2, larguraReal: 1000, alturaReal: 1000 }] }],
  ['ferragens', FerragensPDF, { empresa: shared.nomeEmpresa, logoUrl, dados: [{ id: 'qa', codigo: '1001', nome: 'Dobradiça', cores: 'Branco', categoria: 'Ferragem', preco: 42 }], coresEmpresa: { primary: 'var(--primary)' } }],
  ['projeto', ProjetoIndividualPDF, { nomeEmpresa: shared.nomeEmpresa, logoUrl, themeColor: shared.themeColor, dados: { projeto: 'PC4FCB', numero: 'QA-001', data: '2026-09-19', cliente: shared.nomeCliente, obra: shared.nomeObra, largura: 2000, altura: 2100, quantidade: 1, trilho: 'Padrão', vidro: material.descricao, corKit: 'Branco', materiais: [material] } }],
  ['central', CentralImpressaoPDF, { ...shared, cliente: shared.nomeCliente, obra: shared.nomeObra, itens: [{ id: 'qa', numero: 'QA-001', projeto: 'Sacada grapa', cliente: shared.nomeCliente, medidas: '2000 x 1000', largura: 2000, altura: 1000, quantidade: 1, modo: 'grapa', desenhoUrl: '', vidro: material.descricao, materiais: [material] }] }],
];
(async () => {
  const output = path.join(root, 'tmp/pdfs'); fs.mkdirSync(output, { recursive: true });
  for (const [name, Component, props] of fixtures) { await renderToFile(React.createElement(Component, props), path.join(output, `design-${name}.pdf`)); console.log(`Rendered ${name}`); }
})().catch(error => { console.error(error); process.exitCode = 1; });
