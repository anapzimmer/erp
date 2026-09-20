const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('presença exige sessão real, consulta exclusiva e expira o sinal',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema glasscode_private;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',nullif(current_setting('test.sid',true),''))$$;
 create function public.gc_proprietaria() returns boolean language sql as $$select coalesce(current_setting('test.owner',true),'false')='true'$$;`);
 await db.exec(fs.readFileSync('database/painel_presenca.sql','utf8'));
 const uid='10000000-0000-4000-8000-000000000001',sid='20000000-0000-4000-8000-000000000001';
 await db.exec(`insert into auth.users values('${uid}');insert into auth.sessions values('${sid}','${uid}',null);set test.uid='${uid}';set test.sid='${sid}';set role authenticated;`);
 await db.query('select gc_registrar_presenca()');
 await assert.rejects(db.query('select gc_consultar_presenca($1::uuid[])',[[uid]]));
 await db.exec("set test.owner='true'");
 const read=async()=> (await db.query('select gc_consultar_presenca($1::uuid[]) p',[[uid]])).rows[0].p;
 assert.equal((await read())[uid].online,true);
 await db.exec("reset role;update glasscode_private.presenca_sessoes set visto_em=now()-interval '2 minutes';set role authenticated;");
 assert.equal((await read())[uid].online,false);
 await db.exec(`reset role;delete from auth.sessions;set role authenticated;`);
 await assert.rejects(db.query('select gc_registrar_presenca()'));
 assert.deepEqual(await read(),{});
 }finally{await db.close();}
});
