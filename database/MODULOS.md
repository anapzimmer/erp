# Módulos: primeira etapa

Executar `database/20261025_modulos_empresa.sql` no SQL Editor como administrador, após as migrações de painel e testes existentes. A transação falha se essas dependências não estiverem instaladas. Nenhuma empresa recebe módulos automaticamente.

Painel > Empresas > Módulos permite à proprietária liberar/revogar Gestão e Produção, com motivo obrigatório. Produção exige Gestão. Os contratos de cálculo existentes não são alterados. Não há cobrança automática.

`/modulos` consulta as liberações da empresa autenticada. É uma página informativa: pedidos, financeiro, estoque e corte ainda não foram implementados nesta etapa.

## Contrato de segurança para as próximas etapas

- Cada tabela operacional deve ter `empresa_id NOT NULL`, RLS e políticas que combinem vínculo/permissão do funcionário com `gc_modulo_permitido(empresa_id, 'gestao' ou 'producao')` em USING e WITH CHECK. A contratação não substitui a permissão funcional do funcionário.
- APIs devem usar o JWT verificado do usuário; não usar service_role para contornar essas políticas.
- Nenhuma tabela operacional deve ser publicada antes de testes com dois tenants e acesso direto à API/banco.
- As funções administrativas verificam a proprietária também no banco. Dados de contrato e auditoria ficam em schema privado, sem escrita direta de authenticated/anon.
- A interface não é barreira de segurança. Revogação deve ser conferida pelo banco a cada operação futura; polling apenas atualiza a indicação visual.
- Não adicionar permissões aos planos antigos por inferência. Catalogar separadamente as rotas e operações de Essencial/Profissional/Completo antes de ativar restrições retroativas.

## Validação após instalar

1. Como proprietária, liberar Gestão para uma empresa e conferir histórico; Produção marca Gestão obrigatoriamente.
2. Como usuário dessa empresa, consultar gc_meus_modulos; sem liberação retorna false.
3. Como usuário de outra empresa, gc_modulo_permitido(empresa_alheia,'gestao') deve retornar false.
4. Usuário comum chamando gc_salvar_modulos ou gc_modulos_admin diretamente deve receber acesso negado.
5. Revogar Gestão e confirmar que Produção também é revogada e que uma nova consulta retorna false.
6. Confirmar que conta suspensa ou teste vencido não obtém acesso.

Migração e testes de isolamento no Supabase precisam ser executados no ambiente real; verificação TypeScript/build local não os substitui.
