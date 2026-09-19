# Ativação do painel Glass Code

1. No Supabase Authentication, confira que `engenheiraceo@gmail.com` é sua conta e tem e-mail confirmado.
2. Execute `database/painel_plataforma.sql` no SQL Editor como `postgres`. Tudo é aplicado em uma transação. Se houver erro, nenhuma parte da instalação é mantida.
3. Entre nessa conta no ERP. No menu do usuário, abra **Painel Glass Code**, ou acesse `/plataforma`.
4. Valide com uma empresa de teste: bloquear, confirmar que ela não lê/grava dados, liberar e conferir o histórico.

Se a instalação indicar RLS desativado em `projeto_templates`, execute primeiro `database/projeto_templates_rls_fix.sql` e repita a instalação. Essa correção substitui a política antiga que comparava empresa com usuário pela consulta do vínculo em `perfis_usuarios`. Ela autoriza apenas leitura da própria empresa; registros sem empresa não ficam públicos e nenhuma permissão de escrita é acrescentada.

O instalador grava o UID da conta uma única vez. Não usa metadados editáveis pelo usuário nem verifica somente o e-mail. Uma conta recriada com o mesmo endereço não herda a permissão. Não existe interface para promover outro usuário.

## Proteções e alcance

- Servidor valida o token e a permissão. As funções no banco repetem a autorização, inclusive quando chamadas diretamente pela API do Supabase.
- Cadastros internos e histórico ficam em um schema privado sem acesso pelos clientes. Mudança de estado e registro da ação são atômicos.
- Conta e empresa da proprietária são protegidas contra bloqueio.
- Suspensão é do acesso ao ERP: não apaga registros nem remove a conta do Supabase Auth. A interface verifica o estado a cada minuto e ao voltar para a janela; as políticas do banco restringem cada nova operação imediatamente.
- A instalação acrescenta políticas restritivas às tabelas públicas com RLS e às tabelas com vínculo de empresa. Ela interrompe se encontrar tabela privada sem RLS, para não anunciar uma proteção inexistente. Corrija o isolamento dessa tabela e execute novamente; não desative essa verificação.
- Em novas tabelas, mantenha o isolamento por empresa e a política restritiva `gc_acesso_plataforma` (ou reexecute a instalação). Políticas existentes de isolamento são preservadas.
- Funções preexistentes com `SECURITY DEFINER`, views com privilégios do criador, Storage e serviços com chave privilegiada precisam de revisão própria: podem contornar RLS. O painel não concede acesso a documentos/orçamentos das empresas nem cria impersonação.
- Antes da migração, o ERP continua funcionando; o painel permanece indisponível. Não depende de chave `service_role` na aplicação.
- Ative MFA para a conta proprietária no fluxo de autenticação antes de ampliar operações sensíveis. Esta versão não acrescenta configuração/desafio de MFA.

## Primeira versão

Visão geral, busca/paginação de empresas e usuários, confirmação de e-mail/último acesso, suspensão/liberação com motivo e últimas 100 ações (histórico completo preservado). Novas empresas e contas continuam usando o cadastro existente. Planos, cobrança, alteração de papéis e catálogo oficial ficam para versões seguintes.

## Verificação local

`tests/plataforma-seguranca.test.cjs` executa a migração em PostgreSQL embarcado (PGlite), com papéis autenticado/anônimo, e testa negação de acesso, proteção da proprietária, bloqueio de leitura/escrita, reativação e auditoria. Instale `@electric-sql/pglite` em uma pasta de testes e configure `PGLITE_MODULE` com o caminho do módulo antes de executar `node --test tests/plataforma-seguranca.test.cjs`.
