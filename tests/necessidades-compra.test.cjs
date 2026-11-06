const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const loaded = { exports: {} };
new Function("module", "exports", ts.transpileModule(fs.readFileSync("src/utils/necessidadesCompra.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports);
const { necessidadesCompra: extrair } = loaded.exports;
const base = { id: "ficticio", numero: 1, cliente: "Teste", obra: "Teste", situacao: "conferencia", itens: [], origem_snapshot: null };
test("pedido manual exclui serviços e mantém medidas", () => {
 const r = extrair({ ...base, itens: [{ tipo: "vidro", vidro: "Incolor", quantidade: 2, largura: 1000, altura: 800 }, { tipo: "servico", descricao: "Instalação", quantidade: 1 }] });
 assert.equal(r.itens.length, 1); assert.equal(r.itens[0].medida, "1000 × 800 mm"); assert.equal(r.itens[0].quantidade, 2);
});
test("snapshot usa representação canônica sem duplicar avulsos e vãos", () => {
 const avulso = { descricao: "Parafuso", qtd: 10, unidade: "und" };
 const doc = [{ quantidade: 5, materiais: [{ descricao: "Perfil", qtd: 2, unidade: "barra" }] }, { id: "materiais-avulsos", materiais: [avulso] }];
 const r = extrair({ ...base, origem_snapshot: { itens: { documentoPdfCompleto: doc, projetosPdf: doc, materiaisAvulsos: [avulso] } } });
 assert.equal(r.itens.length, 2); assert.equal(r.itens[0].quantidade, 2); assert.equal(r.itens[1].quantidade, 10);
});
test("cancelamentos e entregues não geram necessidades", () => {
 for (const situacao of ["cancelado", "entregue"]) assert.equal(extrair({ ...base, situacao, itens: [{ descricao: "Material", quantidade: 3 }] }).itens.length, 0);
});
test("revisão substitui quantidades sem acumular e não usa preço como quantidade", () => {
 const pedido = { ...base, itens: [{ descricao: "Material", quantidade: 3, unidade: "und", preco: 100 }] };
 assert.equal(extrair(pedido).itens[0].quantidade, 3);
 assert.equal(extrair({ ...pedido, itens: [{ ...pedido.itens[0], quantidade: 4 }] }).itens[0].quantidade, 4);
 assert.deepEqual(extrair(pedido), extrair(pedido));
});
test("dados desconhecidos ou inválidos exigem conferência", () => {
 assert.ok(extrair({ ...base, origem_snapshot: { itens: { inesperado: [] } } }).avisos.length);
 assert.equal(extrair({ ...base, itens: [{ descricao: "Erro", quantidade: -1 }] }).itens.length, 0);
});
test("duas representações de vidro não são somadas silenciosamente", () => {
 const linha = { vidro: "Vidro teste", qtd: 2 };
 const r = extrair({ ...base, origem_snapshot: { itens: { projetosPdf: [{ materiais: [linha], vidrosAvulsos: [linha] }] } } });
 assert.equal(r.itens.length, 1); assert.ok(r.avisos.length);
});
