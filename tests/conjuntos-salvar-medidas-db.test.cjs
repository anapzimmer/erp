const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const evidencia=JSON.parse(fs.readFileSync('docs/conferencia-etapa-c-auditoria-api.json','utf8'));
const empresa='b2ac500e-99be-4b50-a96b-39db8989dfd7';
const pedido='afd02d1b-b222-47f1-98d0-206d05382d8d';
const usuario='20000000-0000-0000-0000-000000000001';
const projeto=evidencia.projetosTecnicos.find(p=>p.projeto==='Box 2 folhas');
test('salvar vão: autorização, persistência, concorrência otimista e atomicidade',async t=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema glasscode_private;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.usuario',true),'')::uuid$$;
   create table auth.users(id uuid primary key); insert into auth.users values('${usuario}');
   create table gc_pedidos(id uuid primary key,empresa_id uuid not null,versao integer,revisao integer,situacao text,origem_snapshot jsonb,total numeric);
   create table gc_pedido_unidades(id uuid primary key,pedido_id uuid not null,empresa_id uuid not null,projeto_id text not null,
     origem_campo text,origem_linha_id text,numero_unidade integer,projeto_tipo text,situacao text,versao integer,
     largura_original_mm numeric,altura_original_mm numeric);
   alter table gc_pedidos enable row level security; alter table gc_pedido_unidades enable row level security;
   -- Contrato de autorização simulado; não substitui auditoria do helper real.
   create function gc_modulo_permitido(uuid,text) returns boolean language sql as $$
     select $1::text=current_setting('test.empresa',true) and coalesce(current_setting('test.bloqueado',true),'false')='false'$$;
   create function glasscode_private.pedido_empresa() returns uuid language plpgsql as $$declare e uuid;
     begin e:=nullif(current_setting('test.empresa',true),'')::uuid;
     if e is null or not public.gc_modulo_permitido(e,'gestao') then raise exception 'Gestão não autorizada'; end if; return e; end $$;
   set test.empresa='${empresa}'; set test.usuario='${usuario}';`);
  await db.query('insert into gc_pedidos values($1,$2,2,2,\'conferencia\',$3,10950.66)',[pedido,empresa,{itens:{documentoPdfCompleto:evidencia.projetosTecnicos}}]);
  // Usa os 25 IDs e as medidas do snapshot real, em banco descartável.
  for(const u of evidencia.unidades) await db.query(`insert into gc_pedido_unidades values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
   [u.id,pedido,empresa,u.projeto_id,u.origem_campo,u.origem_linha_id,u.numero_unidade,u.projeto_tipo,u.situacao,u.versao,u.largura_original_mm,u.altura_original_mm]);
  await db.exec(fs.readFileSync('database/20261027_conjuntos_estrutura.sql','utf8'));
  await db.exec(fs.readFileSync('database/20261028_conjuntos_salvar_medidas.sql','utf8'));
  const antes=(await db.query('select * from gc_pedido_unidades order by id')).rows;
  const pedidoAntes=(await db.query('select * from gc_pedidos')).rows;
  const salvar=(n=1,v=0,l=1350,alt=2800,pv=2)=>db.query(`select * from public.gc_salvar_medidas_conjunto($1,$2,$3,'documentoPdfCompleto',$4,$5,$6,$7,'Medição na obra')`,[pedido,pv,projeto.id,n,v,l,alt]);
  await t.test('sem sessão, outra empresa, módulo bloqueado e escrita direta recusados',async()=>{
   await db.exec("set role authenticated; set test.usuario=''");
   await assert.rejects(salvar(),/Entre novamente/);
   await db.exec(`set test.usuario='${usuario}'; set test.empresa='00000000-0000-0000-0000-000000000001'`);
   await assert.rejects(salvar(),/indisponível/);
   await db.exec(`set test.empresa='${empresa}'; set test.bloqueado='true'`);
   await assert.rejects(salvar(),/não autorizada/);
   await db.exec("set test.bloqueado='false'");
   await assert.rejects(db.exec('delete from gc_pedido_conjuntos'),/permission denied/);
  });
  let primeiro;
  await t.test('salva somente vão 1, com dois vínculos e histórico, sem tocar nas peças ou preço',async()=>{
   primeiro=(await salvar()).rows[0]; assert.equal(primeiro.versao,2);
   assert.equal(Number(primeiro.largura_conferida_mm),1350);
   assert.equal((await db.query('select count(*)::int n from gc_pedido_conjunto_pecas')).rows[0].n,2);
   assert.equal((await db.query('select count(*)::int n from gc_pedido_conjunto_historico')).rows[0].n,4);
  });
  await t.test('segunda aba não sobrescreve; segundo vão independente; nova versão preserva original',async()=>{
   await assert.rejects(salvar(),/mudou/);
   await assert.rejects(salvar(1,2,1300,2800,1),/pedido mudou/);
   const segundo=(await salvar(2,0,1400)).rows[0]; assert.equal(segundo.numero_conjunto,2);
   const revisado=(await salvar(1,2,1385)).rows[0]; assert.equal(revisado.versao,3);
   assert.equal(Number(revisado.largura_original_mm),1400);
   assert.equal(Number((await db.query('select largura_conferida_mm from gc_pedido_conjuntos where numero_conjunto=2')).rows[0].largura_conferida_mm),1400);
  });
  await t.test('medida inválida, produção iniciada e revisão do pedido impedem salvar',async()=>{
   await assert.rejects(salvar(1,3,0),/medidas/); await assert.rejects(salvar(1,3,1400,55),/descontos/);
   await db.exec("reset role; update gc_pedidos set situacao='liberado'; set role authenticated");
   await assert.rejects(salvar(1,3),/conferência/);
   await db.exec("reset role; update gc_pedidos set situacao='conferencia',revisao=3; set role authenticated");
   await assert.rejects(salvar(1,3),/mudou/);
   await db.exec('reset role; update gc_pedidos set revisao=2');
  });
  await t.test('falha no registro do histórico desfaz atualização inteira',async()=>{
   await db.exec(`create function glasscode_private.falha_teste() returns trigger language plpgsql as $$begin raise exception 'Falha simulada'; end$$;
    create trigger falha_teste before insert on gc_pedido_conjunto_historico for each row execute function glasscode_private.falha_teste(); set role authenticated`);
   await assert.rejects(salvar(1,3),/Falha simulada/);
   assert.equal((await db.query('select versao from gc_pedido_conjuntos where numero_conjunto=1')).rows[0].versao,3);
   await db.exec('reset role');
   assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
   assert.deepEqual((await db.query('select * from gc_pedidos')).rows,pedidoAntes);
  });
 }finally{await db.close();}
});
