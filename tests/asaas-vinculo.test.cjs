const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
function setup(owner=true){
 const calls=[];const m={exports:{}};
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},rpc:async(name,args)=>{calls.push({name,args});return {data:owner,error:null};}};
 const deps={'server-only':{},'@supabase/supabase-js':{createClient:()=>db},'@/lib/asaas/client':{
  ambienteAsaas:()=> 'production',categoriaErroAsaas:()=> 'TEST',asaasRequest:async path=>{calls.push({name:'GET',path});return {id:'sub_test',customer:'cus_test',value:99.90,billingType:'PIX',cycle:'MONTHLY',status:'ACTIVE'};},
 }};
 const code=ts.transpileModule(fs.readFileSync('src/app/api/asaas/vincular/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require','process',code)(m,m.exports,n=>deps[n],{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fake.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fake',SUPABASE_SERVICE_ROLE_KEY:'fake'}});
 return {api:m.exports,calls};
}
function request(auth=true){return new Request('https://fake.invalid/api/asaas/vincular',{method:'POST',headers:auth?{Authorization:'Bearer fictional'}:{},body:JSON.stringify({empresa:'11111111-1111-1111-1111-111111111111',assinatura:'sub_test',plano:'completo'})});}
test('Only platform owner can bind subscriptions; unauthorized requests never query Asaas',async()=>{
 const noAuth=setup();assert.equal((await noAuth.api.POST(request(false))).status,401);assert.equal(noAuth.calls.length,0);
 const denied=setup(false);assert.equal((await denied.api.POST(request())).status,403);assert.deepEqual(denied.calls.map(c=>c.name),['gc_proprietaria']);
});
test('Owner binding reads Asaas values and never processes payment or creates charges',async()=>{
 const {api,calls}=setup();assert.equal((await api.POST(request())).status,200);
 assert.deepEqual(calls.map(c=>c.name),['gc_proprietaria','GET','gc_asaas_vincular_painel']);
 assert.equal(calls[2].args.p_valor,9990);assert.equal(calls[2].args.p_ambiente,'production');assert.equal(calls[2].args.p_autor,'owner');
});
