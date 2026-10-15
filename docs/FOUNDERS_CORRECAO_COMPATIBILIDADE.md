# Founders — relatório de compatibilidade da correção de segurança

## Escopo revisado

Arquivo principal:

- `database/20261015_founders_correcao_seguranca.sql`

Arquivos de suporte:

- `database/20261015_founders_correcao_seguranca_diagnostico.sql`
- `database/20261015_founders_correcao_seguranca_validacao.sql`
- `database/20261015_founders_correcao_seguranca_testes.sql`
- `docs/FOUNDERS_STORAGE_CONFIGURACAO_MANUAL.md`

## Compatibilidade com a migração original

Compatível com `database/20261015_founders_fundacao.sql` já aplicada:

1. **Sem operações destrutivas**
   - não usa `DROP TABLE`, `TRUNCATE` ou exclusão de dados de negócio;
   - preserva tabelas e registros existentes.

2. **Assinaturas de RPC preservadas**
   - `gc_founders_empresa_ativa(uuid default null)`
   - `gc_founders_anexar_contribuicao(uuid,text,text,text,text,bigint,text)`
   - `gc_founders_admin_ajustar_pontos(uuid,text,integer,text,text,uuid)`
   - `gc_founders_admin_atualizar_contribuicao(uuid,text,integer,text)`
   - `gc_founders_resgatar_beneficio(uuid,integer,text,text)`

3. **Mudanças comportamentais intencionais (sem quebra de contrato)**
   - `gc_founders_empresa_ativa` agora bloqueia consulta de empresa arbitrária por usuária não-admin;
   - `gc_founders_anexar_contribuicao` valida objeto e metadados reais no Storage;
   - hardening de privilégios diretos de escrita e EXECUTE em funções internas.

4. **Storage permanece fora da migração de ownership**
   - nenhuma tentativa de `ALTER TABLE storage.objects ...`;
   - políticas e bucket seguem por configuração manual no painel do Supabase.

## Riscos de compatibilidade identificados

1. **Metadados de Storage fora do padrão**
   - se `metadata.size` ou MIME estiver ausente/inconsistente, o RPC de anexo rejeita o registro.

2. **Ownership de objeto no Storage**
   - a validação tenta usar `owner` ou `owner_id` quando disponível;
   - se o upload não gravar owner compatível com a sessão, o anexo é bloqueado.

3. **Reaprovação após rejeição estornada**
   - contribuição rejeitada e já estornada não é recreditada automaticamente;
   - recrédito exige ajuste administrativo auditável.

4. **Permissões de leitura em `storage.objects`**
   - se o ambiente restringir leitura a ponto de disparar `insufficient_privilege`, a função falha em modo seguro (`42501`) e deve-se validar no backend administrativo antes do RPC.

## Ordem de aplicação recomendada

1. Executar `database/20261015_founders_correcao_seguranca_diagnostico.sql`.
2. Aplicar `database/20261015_founders_correcao_seguranca.sql`.
3. Configurar bucket/policies conforme `docs/FOUNDERS_STORAGE_CONFIGURACAO_MANUAL.md`.
4. Executar `database/20261015_founders_correcao_seguranca_validacao.sql`.
5. Executar `database/20261015_founders_correcao_seguranca_testes.sql` (transacional com rollback).
