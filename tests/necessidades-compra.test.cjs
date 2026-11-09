const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const loaded = { exports: {} };
new Function("module", "exports", ts.transpileModule(fs.readFileSync("src/utils/necessidadesCompra.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports);
const { necessidadesCompra: extrair } = loaded.exports;
const base = { id: "ficticio", numero: 1, cliente: "Teste", obra: "Teste", situacao: "conferencia", itens: [], origem_snapshot: null };
test("preços vêm das linhas salvas, nunca do total do projeto",()=>{
 const manual=extrair({...base,itens:[{tipo:'vidro',vidro:'Incolor',largura:565,altura:985,quantidade:2,preco:98.87,unidade:'und',catalogo:{precoM2:164.78}}]}).itens[0];
 assert.equal(manual.precoOrcadoUnitario,98.87);assert.equal(manual.precoOrcadoM2,164.78);
 const projeto=extrair({...base,itens:[{descricao:'VIDRO FIXO 635x1865 INCOLOR',quantidade:1.235,unidade:'m2',valorUnitario:164.78}]}).itens[0];
 assert.equal(projeto.precoOrcadoM2,164.78);
 const desconhecido=extrair({...base,itens:[{tipo:'vidro',vidro:'Incolor',largura:1000,altura:1000,quantidade:1,total:500}]}).itens[0];
 assert.equal(desconhecido.precoOrcadoUnitario,undefined);
});
test("vidro manual fornece área comercial sem alterar quantidade e identidade legadas", () => {
 const m=extrair({...base,itens:[{tipo:"vidro",vidro:"Incolor 8",largura:565,altura:985,quantidade:2,unidade:"und"}]}).itens[0];
 assert.equal(m.quantidade,2);assert.equal(m.unidade,"und");assert.equal(m.areaPorUnidade,0.6);assert.equal(m.pecas,2);assert.equal(m.vidro,true);
});
test("vidro de projeto em m² não multiplica a área novamente", () => {
 const m=extrair({...base,itens:[{descricao:"VIDRO FIXO 635×1865 INCOLOR",quantidade:1.235,unidade:"m2"}]}).itens[0];
 assert.equal(m.quantidade,1.235);assert.equal(m.areaPorUnidade,1);assert.equal(m.pecas,1);assert.equal(m.medida,"");
});
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
test("box salvo diretamente no cálculo aparece no pedido e em compras", () => {
 const snapshot = { valor_total: 450, itens: { tipo: "box2fls", dados: { projeto: "Box 2 folhas", largura: 1200, altura: 1900, quantidade: 2, corKit: "Preto", puxador: "Com puxador", trinco: "Padrão" }, materiais: [{ descricao: "Kit box", qtd: 2, unidade: "kit" }, { vidroDescricao: "Incolor 8mm", descricao: "Vidro", qtd: 4, unidade: "peças", medida: "600 x 1900 mm" }], resumo: { valorTotal: 450 } } };
 const antes = JSON.stringify(snapshot);
 const projetos = loaded.exports.projetosPedido(snapshot);
 assert.equal(projetos.length, 1);
 assert.equal(projetos[0].projeto, "Box 2 folhas");
 assert.equal(projetos[0].desenhoUrl, "/desenhos/box-padraopuxador.png");
 assert.equal(projetos[0].valorTotal, 450);
 const r = extrair({ ...base, origem_snapshot: snapshot });
 assert.equal(r.itens.length, 2);
 assert.equal(r.itens[0].quantidade, 2);
 assert.equal(r.itens[1].quantidade, 4);
 assert.equal(r.itens[0].cor, "Preto");
 assert.equal(JSON.stringify(snapshot), antes);
});
test("itemCentral individual é reconhecido sem duplicar composição", () => {
 const item = { projeto: "Sacada", materiais: [{ descricao: "Torre", qtd: 3, unidade: "und" }] };
 assert.equal(extrair({ ...base, origem_snapshot: { itens: { itemCentral: item } } }).itens.length, 1);
});
