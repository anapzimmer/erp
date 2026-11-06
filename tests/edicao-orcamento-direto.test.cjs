const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function handler(context) {
 const source = ts.createSourceFile("page.tsx", fs.readFileSync("src/app/(calculos)/fixos/page.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let expression;
 function visit(n) { if (ts.isVariableDeclaration(n) && n.name.getText(source) === "salvarOrcamento") expression = n.initializer.getText(source); ts.forEachChild(n, visit); }
 visit(source); assert.ok(expression);
 const js = ts.transpileModule("const executar = " + expression, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 return new Function(...Object.keys(context), js + ";return executar;")(...Object.values(context));
}
function fixture(error = null, editId = "original", ativo = {id:"original"}) {
 const calls = [];
 const db = { update(p) { calls.push(["update", p.numero_formatado]); return this; }, eq(k,v) { calls.push([k,v]);return this; }, select() { return this; }, async single() { return { error }; } };
 const context = {
  revisaoPedidoToken:null, orcamentoAtivo:ativo, editId, centralItemId:null,
  enviarParaCentralImpressao:()=>calls.push(["central"]), empresaId:"empresa-teste", dados:{numero:"OR123",cliente:"Cliente fictício",data:"01/01/2026"},
  setSalvandoOrcamento:()=>{}, gerarNumeroOrcamento:()=>{throw Error("Não pode gerar número");},
  materiais:[], calculoVidro:{areaTotalCobrada:1}, totalVidros:1,valorVidros:10,valorPerfis:0,valorFerragens:0,totalMateriais:10,
  DRAWING_COLORS:{ink:"#000"},supabase:{from:()=>db},
  window:{localStorage:{removeItem:()=>calls.push(["limpar"])}},PROJETO_INDIVIDUAL_DRAFT_KEY:"ficticio",
  encerrarOrcamentoAtivo:id=>calls.push(["encerrar",id]),router:{push:p=>calls.push(["retorno",p])},returnTo:"/admin/relatorio.orcamento",
  setDados:()=>{},setMensagemSistema:m=>calls.push(["mensagem",m.tipo]), console:{error:()=>{}}
 };
 return {run:handler(context),calls};
}
test("edição atualiza o mesmo número, filtra empresa e encerra sem PDF+", async()=>{
 const f=fixture();await f.run();
 assert.deepEqual(f.calls[0],["update","OR123"]);
 assert.ok(f.calls.some(c=>c[0]==="id"&&c[1]==="original"));
 assert.ok(f.calls.some(c=>c[0]==="empresa_id"&&c[1]==="empresa-teste"));
 assert.ok(f.calls.some(c=>c[0]==="encerrar"));
 assert.ok(f.calls.some(c=>c[0]==="retorno"));
 assert.ok(!f.calls.some(c=>c[0]==="central"));
});
test("falha no banco mantém edição aberta e não apaga rascunho",async()=>{
 const f=fixture({message:"Falha fictícia"});await f.run();
 assert.ok(!f.calls.some(c=>["encerrar","retorno","limpar"].includes(c[0])));
 assert.ok(f.calls.some(c=>c[0]==="mensagem"&&c[1]==="erro"));
});
test("orçamento novo em atendimento mantém fluxo da central",async()=>{
 const f=fixture(null,null);await f.run();assert.deepEqual(f.calls,[["central"]]);
});

test("edição encerra pelo ID mesmo quando hook oculta atendimento ativo", async()=>{
 const f=fixture(null,"original",null);await f.run();
 assert.ok(f.calls.some(c=>c[0]==="encerrar"&&c[1]==="original"));
 assert.ok(f.calls.some(c=>c[0]==="retorno"));
});
