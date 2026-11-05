const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies={}) {
  const m={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('module','exports','require',code)(m,m.exports,n=>n==='server-only'?{}:dependencies[n]);
  return m.exports;
}
const fixture={id:'pay_ficticio',customer:'cus_ficticio',subscription:'sub_ficticia',billingType:'CREDIT_CARD',value:279.90,dueDate:'2026-11-04',status:'CONFIRMED'};
function setup(payment=fixture, error=false){
  const calls=[];
  const api=load('src/lib/asaas/pagamentos.ts',{'./client':{ambienteAsaas:()=> 'sandbox',asaasRequest:async path=>path.startsWith('/payments?')?{data:[payment],hasMore:false}:payment}});
  const db={rpc:async(name,args)=>{if(name==='gc_asaas_vinculo_ativo')return {data:true,error:null};calls.push({name,args});return {data:true,error:error?{code:'TEST'}:null};}};
  return {api,db,calls};
}
test('Card and boleto use current provider price and same payment ledger RPC',async()=>{
  for(const billingType of ['CREDIT_CARD','BOLETO','PIX']){
    const {api,db,calls}=setup({...fixture,billingType});
    await api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id,value:1}});
    assert.equal(calls[0].name,'gc_asaas_processar_pagamento');
    assert.equal(calls[0].args.p_valor_centavos,27990);
    assert.equal(calls[0].args.p_modalidade,billingType);
    assert.equal(calls[1].name,'gc_asaas_finalizar_evento');
  }
});

test('Unknown or wrong-environment subscription cannot credit access',async()=>{
  const {api}=setup();const calls=[];
  const db={rpc:async(name)=>{calls.push(name);return {data:false,error:null};}};
  await assert.rejects(api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id}}),/SEM_VINCULO/);
  assert.deepEqual(calls,['gc_asaas_vinculo_ativo']);
});
test('Refunds, overdue, deletion and chargebacks reach the ledger',async()=>{
  for(const status of ['REFUNDED','OVERDUE','CHARGEBACK_REQUESTED']){
    const {api,db,calls}=setup({...fixture,status});
    await api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id}});
    assert.equal(calls[0].args.p_status,status);
  }
  const {api}=setup();
  assert.equal(api.validarPagamento({...fixture,deleted:true}).status,'DELETED');
});
test('Unsupported states remain flagged for reconciliation without granting access',async()=>{
  const {api,db,calls}=setup({...fixture,status:'REFUND_IN_PROGRESS'});
  assert.equal(await api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id}}),'conciliacao_pendente');
  assert.deepEqual(calls.map(c=>c.name),['gc_asaas_finalizar_evento']);
  assert.equal(calls[0].args.p_erro,'ESTADO_NAO_SUPORTADO');
});
test('Invalid monetary precision, dates and changed identity never credit',async()=>{
  for(const extra of [{value:1.001},{dueDate:'2026-02-30'},{id:'pay_other'},{value:NaN}]){
    const {api,db,calls}=setup({...fixture,...extra});
    await assert.rejects(api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id}}));
    assert.equal(calls.length,0);
  }
});
test('Database failures remain retryable and are never marked processed',async()=>{
  const {api,db,calls}=setup(fixture,true);
  await assert.rejects(api.processarEventoAsaas(db,{id:'evt_test',payment:{id:fixture.id}}));
  assert.equal(calls.length,1);
});
