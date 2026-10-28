const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

// Apenas PostgreSQL descartável em memória. Nenhuma conexão ou segredo externo.
const sql = fs.readFileSync('database/20261027_conjuntos_estrutura.sql', 'utf8');
const a = '00000000-0000-0000-0000-000000000001';
const b = '00000000-0000-0000-0000-000000000002';
const pedido = '10000000-0000-0000-0000-000000000001';
const outroPedido = '10000000-0000-0000-0000-000000000002';
const autor = '20000000-0000-0000-0000-000000000001';
const unidade = n => `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

async function base() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema glasscode_private;
    create table auth.users(id uuid primary key);
    insert into auth.users values('${autor}');
    create table public.gc_pedidos(id uuid primary key,empresa_id uuid not null,total numeric,situacao text);
    insert into gc_pedidos values('${pedido}','${a}',10950.66,'conferencia'),('${outroPedido}','${b}',500,'conferencia');
    -- Contrato mínimo comprovado pela API, não réplica das políticas remotas.
    create table public.gc_pedido_unidades(id uuid primary key,pedido_id uuid not null references gc_pedidos(id),
      empresa_id uuid not null,projeto_id text not null,situacao text not null default 'pendente',versao int not null default 1,
      projeto_tipo text,numero_unidade int,origem_campo text default 'documentoPdfCompleto',
      largura_conferida_mm numeric,altura_conferida_mm numeric,origem_linha_id text,
      largura_original_mm numeric,altura_original_mm numeric);
    alter table public.gc_pedidos enable row level security;
    alter table public.gc_pedido_unidades enable row level security;
    create function public.gc_modulo_permitido(uuid,text) returns boolean language sql stable as $$
      select $1::text=current_setting('test.empresa',true) and $2='gestao'
        and coalesce(current_setting('test.bloqueada',true),'false')<>'true'
    $$;
  `);
  for (let i = 1; i <= 25; i++) await db.query(
    'insert into gc_pedido_unidades(id,pedido_id,empresa_id,projeto_id,projeto_tipo,numero_unidade) values($1,$2,$3,$4,$5,$6)',
    [unidade(i), pedido, a, i <= 4 ? 'box' : i <= 8 ? 'canto' : 'avulsos',
      i <= 4 ? 'Box 2 folhas' : 'Outro', i <= 4 ? Math.ceil(i/2) : 1]);
  return db;
}
const inserir = (db, numero, campos = {}) => db.query(`
  insert into gc_pedido_conjuntos(empresa_id,pedido_id,projeto_id,numero_conjunto,tipo_projeto,origem_campo,
    revisao_origem,largura_original_mm,altura_original_mm,configuracao_original,motor_versao,autor,motivo)
  values($1,$2,$3,$4,'box2folhas','documentoPdfCompleto',2,1400,2800,'{"trilho":"Até o teto"}',
    'box2folhas-v1',$5,'Preparação de conjunto') returning id`,
  [campos.empresa || a, campos.pedido || pedido, campos.projeto || 'box', numero, autor]);
const vincular = (db, id, n, papel, campos = {}) => db.query(`
  insert into gc_pedido_conjunto_pecas(conjunto_id,unidade_id,empresa_id,pedido_id,projeto_id,papel,autor)
  values($1,$2,$3,$4,$5,$6,$7)`,
  [id, unidade(n), campos.empresa || a, campos.pedido || pedido, campos.projeto || 'box', papel, autor]);

test('migração recusa estrutura ausente sem criar substitutos', async () => {
  const db = await base();
  try {
    await db.exec('alter table gc_pedido_unidades rename to unidades_preservadas');
    await assert.rejects(db.exec(sql), /Estrutura de pedidos\/unidades não encontrada/);
    await db.exec('rollback');
    assert.equal((await db.query("select to_regclass('public.gc_pedido_conjuntos') t")).rows[0].t, null);
    assert.equal((await db.query('select count(*)::int n from unidades_preservadas')).rows[0].n, 25);
  } finally { await db.close(); }
});

test('estrutura, vínculos, isolamento e histórico sem alterar peças existentes', async t => {
  const db = await base();
  try {
    const antes = (await db.query('select * from gc_pedido_unidades order by id')).rows;
    await db.exec(sql);
    await t.test('instala vazia, mantendo as 25 peças e o contrato', async () => {
      assert.equal((await db.query('select count(*)::int n from gc_pedido_conjuntos')).rows[0].n, 0);
      assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows, antes);
      assert.equal(Number((await db.query('select total from gc_pedidos where id=$1', [pedido])).rows[0].total), 10950.66);
    });
    const c1 = (await inserir(db, 1)).rows[0].id;
    const c2 = (await inserir(db, 2)).rows[0].id;
    await t.test('dois conjuntos independentes, quatro vínculos sem recriar peças', async () => {
      await vincular(db,c1,1,'fixo'); await vincular(db,c1,2,'movel');
      await vincular(db,c2,3,'fixo'); await vincular(db,c2,4,'movel');
      assert.equal((await db.query('select count(*)::int n from gc_pedido_conjunto_pecas')).rows[0].n, 4);
      assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows, antes);
    });
    await t.test('recusa conjunto repetido, peça repetida e papel duplicado', async () => {
      await assert.rejects(inserir(db,1), /unique/);
      await assert.rejects(vincular(db,c2,1,'fixo'), /unique/);
      await assert.rejects(vincular(db,c1,3,'fixo'), /unique/);
    });
    await t.test('integridade composta recusa outro projeto, pedido e empresa', async () => {
      const c3 = (await inserir(db,3)).rows[0].id;
      await assert.rejects(vincular(db,c3,1,'fixo'),e=>e.code==='23505' && /unidade_id/.test(e.message));
      await assert.rejects(vincular(db,c3,5,'fixo'), /foreign key/);
      await assert.rejects(inserir(db,4,{empresa:b}), /foreign key/);
      await assert.rejects(vincular(db,c3,6,'fixo',{pedido:outroPedido,empresa:b}), /foreign key/);
    });
    await t.test('medição versionada e histórico sem alterar o segundo conjunto', async () => {
      await assert.rejects(db.query('update gc_pedido_conjuntos set versao=4 where id=$1',[c1]), /Versão/);
      await db.query(`update gc_pedido_conjuntos set largura_conferida_mm=1385,altura_conferida_mm=2800,
        situacao='medida_registrada',versao=2,motivo='Conferência do vão' where id=$1`,[c1]);
      assert.equal((await db.query('select versao from gc_pedido_conjuntos where id=$1',[c2])).rows[0].versao,1);
      const h=(await db.query("select anterior,novo from gc_pedido_conjunto_historico where conjunto_id=$1 and evento='alteracao'",[c1])).rows[0];
      assert.equal(h.anterior.largura_original_mm,1400); assert.equal(h.novo.largura_conferida_mm,1385);
      await assert.rejects(db.query('update gc_pedido_conjuntos set largura_original_mm=1,versao=3 where id=$1',[c1]),/imutáveis/);
      await assert.rejects(db.query('delete from gc_pedido_conjuntos where id=$1',[c1]),/apagados/);
      await assert.rejects(db.exec('delete from gc_pedido_conjunto_pecas'),/removidos/);
      await assert.rejects(db.exec("update gc_pedido_conjunto_historico set motivo='fraude'"),/imutável/);
      await assert.rejects(db.exec('delete from gc_pedido_conjunto_historico'),/imutável/);
      await assert.rejects(db.query("update gc_pedido_conjuntos set situacao='liberado',versao=3 where id=$1",[c1]),/check constraint/);
    });
    await t.test('usuários só leem sua empresa com Gestão ativa; nenhuma escrita autorizada', async () => {
      await db.exec(`set test.empresa='${a}'; set role authenticated`);
      assert.equal((await db.query('select count(*)::int n from gc_pedido_conjuntos')).rows[0].n,3);
      await assert.rejects(inserir(db,9),/permission denied/);
      await assert.rejects(db.exec('delete from gc_pedido_conjunto_historico'),/permission denied/);
      await assert.rejects(db.exec('update gc_pedido_conjuntos set versao=5'),/permission denied/);
      await assert.rejects(vincular(db,c1,7,'movel'),/permission denied/);
      await db.exec(`set test.empresa='${b}'`);
      for (const table of ['gc_pedido_conjuntos','gc_pedido_conjunto_pecas','gc_pedido_conjunto_historico'])
        assert.equal((await db.query(`select count(*)::int n from ${table}`)).rows[0].n,0);
      await db.exec(`set test.empresa='${a}'; set test.bloqueada='true'`);
      assert.equal((await db.query('select count(*)::int n from gc_pedido_conjuntos')).rows[0].n,0);
      await db.exec('reset role; set role anon');
      await assert.rejects(db.exec('select * from gc_pedido_conjuntos'),/permission denied/);
      await db.exec('reset role');
      assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
    });
  } finally { await db.close(); }
});

test('falha no final da instalação desfaz DDL e mantém as 25 unidades', async () => {
  const db=await base();
  try {
    const antes=(await db.query('select * from gc_pedido_unidades order by id')).rows;
    await assert.rejects(db.exec(sql.replace(/commit;\s*$/, 'select 1/0; commit;')), /division by zero/);
    await db.exec('rollback');
    for (const nome of ['gc_pedido_conjuntos','gc_pedido_conjunto_pecas','gc_pedido_conjunto_historico','gc_unidades_conjuntos_identidade'])
      assert.equal((await db.query('select to_regclass($1) t',[`public.${nome}`])).rows[0].t,null);
    assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
  } finally { await db.close(); }
});

test('unicidade por papel e rollback do conjunto com segundo vínculo inválido', async () => {
  const db=await base();
  try {
    await db.exec(sql);
    const c1=(await inserir(db,1)).rows[0].id;
    await vincular(db,c1,1,'fixo');
    await assert.rejects(vincular(db,c1,2,'fixo'), e=>e.code==='23505' && /pkey/.test(e.message));
    await vincular(db,c1,2,'movel');
    await db.query(`insert into gc_pedido_unidades(id,pedido_id,empresa_id,projeto_id,projeto_tipo,numero_unidade)
      values($1,$2,$3,'box','Box 2 folhas',1)`,[unidade(26),pedido,a]);
    await assert.rejects(vincular(db,c1,26,'movel'),e=>e.code==='23505' && /pkey/.test(e.message));
    const antes=(await db.query('select * from gc_pedido_conjunto_historico order by id')).rows;
    await db.exec('begin');
    const c2=(await inserir(db,2)).rows[0].id;
    await vincular(db,c2,3,'fixo');
    await assert.rejects(vincular(db,c2,26,'movel'),/incompatível/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from gc_pedido_conjuntos')).rows[0].n,1);
    assert.deepEqual((await db.query('select * from gc_pedido_conjunto_historico order by id')).rows,antes);
  } finally { await db.close(); }
});

test('contrato informado do gatilho Box: RPC individual não contorna a proteção', async () => {
  const db=await base();
  try {
    // Simulação mínima do contrato fornecido pela usuária, NÃO definição remota.
    await db.exec(`create function glasscode_private.teste_proteger_box() returns trigger language plpgsql as $$
      begin if old.projeto_tipo='Box 2 folhas' and
        (new.situacao,new.largura_conferida_mm,new.altura_conferida_mm) is distinct from
        (old.situacao,old.largura_conferida_mm,old.altura_conferida_mm) then
        raise exception 'Box exige operação por conjunto'; end if; return new; end $$;
      create trigger gc_proteger_unidade_box2folhas before update on gc_pedido_unidades
        for each row execute function glasscode_private.teste_proteger_box();
      create function public.teste_rpc_individual(uuid,text) returns void language sql security definer set search_path='' as $$
        update public.gc_pedido_unidades set situacao=$2 where id=$1
      $$;`);
    const antes=(await db.query('select * from gc_pedido_unidades order by id')).rows;
    const gatilhos=(await db.query("select pg_get_triggerdef(oid) d from pg_trigger where tgname='gc_proteger_unidade_box2folhas'")).rows;
    await db.exec(sql);
    assert.deepEqual((await db.query("select pg_get_triggerdef(oid) d from pg_trigger where tgname='gc_proteger_unidade_box2folhas'")).rows,gatilhos);
    for(const estado of ['conferida','liberada'])
      await assert.rejects(db.query('select teste_rpc_individual($1,$2)',[unidade(1),estado]),/Box exige/);
    await assert.rejects(db.query('update gc_pedido_unidades set largura_conferida_mm=700 where id=$1',[unidade(1)]),/Box exige/);
    await db.exec('begin');
    await db.query('select teste_rpc_individual($1,$2)',[unidade(5),'conferida']);
    await db.query('select teste_rpc_individual($1,$2)',[unidade(9),'conferida']);
    await db.exec('rollback');
    assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
  } finally { await db.close(); }
});

test('consultas de instalação e recuperação vazia preservam unidades; recuperação com dados recusa', async () => {
  const db=await base();
  const ler=nome=>fs.readFileSync(`database/20261028_conjuntos_${nome}.sql`,'utf8');
  try {
    const antes=(await db.query('select * from gc_pedido_unidades order by id')).rows;
    await db.exec(ler('pre_instalacao'));
    await db.exec(sql);
    await db.exec(ler('pos_instalacao'));
    await db.exec(ler('rollback_vazio'));
    assert.equal((await db.query("select to_regclass('public.gc_pedido_conjuntos') t")).rows[0].t,null);
    assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
    await db.exec(sql);
    await inserir(db,1);
    await assert.rejects(db.exec(ler('rollback_vazio')),/Recuperação recusada/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int n from gc_pedido_conjuntos')).rows[0].n,1);
    assert.deepEqual((await db.query('select * from gc_pedido_unidades order by id')).rows,antes);
  } finally { await db.close(); }
});

test('unidade real de outra empresa não pode ser vinculada com identidade adulterada', async () => {
  const db=await base();
  try {
    await db.exec(sql);
    const c=(await inserir(db,1)).rows[0].id;
    await db.query(`insert into gc_pedido_unidades(id,pedido_id,empresa_id,projeto_id,projeto_tipo,numero_unidade)
      values($1,$2,$3,'box','Box 2 folhas',1)`,[unidade(26),outroPedido,b]);
    await assert.rejects(vincular(db,c,26,'fixo'),e=>e.code==='23503');
    await assert.rejects(vincular(db,c,26,'fixo',{empresa:b,pedido:outroPedido}),e=>e.code==='23503');
    await assert.rejects(db.query(`update gc_pedido_conjuntos set configuracao_original='{}',versao=2 where id=$1`,[c]),/imutáveis/);
    await assert.rejects(db.query(`update gc_pedido_conjuntos set revisao_origem=3,versao=2 where id=$1`,[c]),/imutáveis/);
    assert.equal((await db.query('select count(*)::int n from gc_pedido_conjunto_pecas')).rows[0].n,0);
  } finally { await db.close(); }
});

test('inicialização exige medidas conferidas vazias e estado pendente na versão um', async () => {
  const db=await base();
  try {
    await db.exec(sql);
    const c=(await inserir(db,1)).rows[0].id;
    const duplicar=extra=>db.query(`insert into gc_pedido_conjuntos
      select (jsonb_populate_record(null::gc_pedido_conjuntos,
        to_jsonb(c)||$2::jsonb||jsonb_build_object('id',gen_random_uuid(),'numero_conjunto',2))).*
      from gc_pedido_conjuntos c where id=$1`,[c,JSON.stringify(extra)]);
    await assert.rejects(duplicar({largura_conferida_mm:1400,altura_conferida_mm:2800}),/sem medidas/);
    await assert.rejects(duplicar({versao:2}),/versão 1/);
    await assert.rejects(duplicar({situacao:'validada'}),/pendente/);
    assert.equal((await db.query('select count(*)::int n from gc_pedido_conjunto_historico')).rows[0].n,1);
  } finally { await db.close(); }
});
