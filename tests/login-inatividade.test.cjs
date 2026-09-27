const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/app/(auth)/login/page.tsx','utf8');
const ast=ts.createSourceFile('login.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='handleLogin')handler=node.initializer.getText(ast);ts.forEachChild(node,visit);}
visit(ast);
const js=ts.transpileModule('const handleLogin = '+handler,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function simulate(error){
const now=10000000;let activity=String(now-7200000);const redirects=[],messages=[];
const context={email:'test@example.com',password:'test',setLoading(){},showModal:(...m)=>messages.push(m),translateAuthError:()=> 'Inválido',Date:{now:()=>now},localStorage:{setItem:(key,value)=>{assert.equal(key,'glasscode:last-activity-at');activity=value;}},supabase:{auth:{signInWithPassword:async()=>({error})}},router:{replace:path=>redirects.push({path,expired:now-Number(activity)>=3600000})}};
await vm.runInNewContext(js+'; handleLogin({preventDefault(){}})',context);
return {activity,redirects,messages};
}
test('primeiro login renova inatividade antiga antes de abrir dashboard',async()=>{const r=await simulate(null);assert.deepEqual(r.redirects,[{path:'/dashboard',expired:false}]);assert.equal(r.activity,'10000000');});
test('senha inválida não renova atividade nem abre dashboard',async()=>{const r=await simulate({message:'Invalid login credentials'});assert.equal(r.activity,'2800000');assert.equal(r.redirects.length,0);assert.equal(r.messages.length,1);});
