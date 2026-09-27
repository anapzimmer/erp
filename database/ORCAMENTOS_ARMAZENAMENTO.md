# Armazenamento de orçamentos

## Ativação no Supabase
1. Execute `database/orcamentos_armazenamento.sql` no SQL Editor, como administrador do banco.
2. Habilite a extensão **pg_cron** (Database → Extensions), se necessário.
3. Execute `database/orcamentos_armazenamento_agenda.sql`. O job roda diariamente às 03:15 UTC.
4. Na conta proprietária Glass Code, abra **Configurações → Armazenamento de orçamentos**. Informe o e-mail do responsável e clique **Autorizar**. Ele só administra a empresa à qual está vinculado; a autorização pode ser revogada.
5. O responsável escolhe o prazo. O padrão é **Manter sempre**.

A migração é necessária antes de usar os controles novos. Nenhuma migração foi executada remotamente pelo Codex. A aplicação informa se a função ainda não estiver instalada.

## Regras
- 30, 90, 180 ou 365 dias desde a última alteração; opção ilimitada.
- Registros anteriores à instalação começam a contagem na instalação, evitando limpeza retroativa sem revisão.
- A lixeira guarda o próprio registro completo por 30 dias. Restaurar reinicia a contagem. Após 30 dias, a rotina diária elimina definitivamente os elegíveis.
- Prévia manual de até 500 registros, seguida de confirmação explícita. Para lotes maiores, repita a revisão.
- Estados desconhecidos, aprovados, IDs de obras/pedidos e referências por FK são preservados. Textos de obra/referência não são vínculos com obras cadastradas.
- A lixeira sai das consultas normais por RLS restritiva, inclusive dashboard e editores. As políticas de isolamento atuais continuam exigidas; a migração não cria permissão de leitura para outras empresas.
- Exclusão na consulta de orçamentos também usa a lixeira e exige responsável autorizado.
- Uma proteção no banco impede rotinas antigas de apagar registros sem passar pela lixeira. Revise jobs anteriores que usem `excluir_em` para desativá-los ou migrá-los. Eles podem registrar falha, mas não podem ignorar os 30 dias.
- O job só modifica empresas com prazo configurado, exceto a eliminação dos registros que alguém já moveu para a lixeira há mais de 30 dias.

## Validação local
`tests/orcamentos-armazenamento.test.cjs` executa a migração em PostgreSQL embarcado (PGlite) e verifica autorização, isolamento, preservação, restauração e expiração. Defina PGLITE_MODULE com o caminho do pacote para executar.

## Correção de registros legados da Disk Vidros
Execute `orcamentos_corrigir_legado_90dias.sql` uma vez (reexecutável). Remove o bloqueio incorreto por referência textual e recupera as datas apenas da empresa diagnosticada, com o carimbo exato da instalação. Usa o maior valor entre criação, última atualização disponível e vencimento anterior menos 90 dias. Não modifica registros editados/restaurados após a instalação ou já na lixeira. A configuração atual precisa continuar em 90 dias. Não executa a rotina de limpeza; os vencidos elegíveis serão tratados no próximo agendamento.
