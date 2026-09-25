# Revisão de navegação e suporte — 24/09/2026

## Navegação

- Visitantes acessam o site, recursos, planos e como funciona sem autenticação.
- Login bem-sucedido usa `/dashboard`, substituindo o login no histórico.
- Sessão existente em `/` ou `/login` segue para `/dashboard`; rotas internas não são redirecionadas indiscriminadamente.
- Recuperação de senha preserva o link recebido e tem prioridade sobre o dashboard.
- Autenticação compartilhada responde a entrada/saída da sessão; o hook useAuth reutiliza o contexto.
- Links antigos do site foram corrigidos. Redirecionamentos preservam `/glasscode` e `/glasscode/planos`.

## Suporte

- Aviso discreto no canto inferior direito das telas internas para usuário e proprietária.
- Atualização de avisos e conversas a cada 20 segundos com a aba visível.
- O aviso abre a conversa correspondente, inclusive na aba Suporte da plataforma.
- Fechar o aviso não marca a mensagem como lida. Uma nova mensagem volta a exibir o aviso.
- Abrir a conversa registra apenas a leitura das mensagens já carregadas, por usuário. Mensagens que chegam depois continuam pendentes.
- Consultas de cliente ficam restritas aos chamados da sua empresa; a visão administrativa exige gc_proprietaria().
- Nenhuma mensagem real foi enviada durante os testes.

## Ativação necessária

Executar `database/suporte_notificacoes.sql` no SQL Editor do projeto Supabase que contém as tabelas do suporte. O script é transacional e pode ser reaplicado. Acrescenta uma tabela privada de leituras com RLS e duas funções; não altera mensagens, anexos ou políticas existentes do suporte.

Recarregar as sessões de cliente e administradora após a atualização. Chamados anteriores ainda não lidos neste novo controle podem aparecer como pendentes na primeira utilização. A leitura é individual, inclusive entre pessoas da mesma empresa.

Não há conexão administrativa com o Supabase disponível nesta sessão; a migration não foi executada no banco remoto. Sem ela, os avisos não ficam ativos.

## Validação

- 38 testes aprovados, incluindo redirecionamento, recuperação de senha, isolamento de empresas, leitura individual e preservação de mensagens novas.
- SQL executado em PostgreSQL local via PGlite, com papéis autenticados e acessos negados verificados.
- TypeScript e build de produção aprovados. ESLint dos arquivos revisados sem erros (há avisos).
- Conferido no navegador: página principal pública e botão Começar agora abrindo o login.
- Não foi possível testar duas contas autenticadas no navegador disponível. Após ativar o SQL, validar cliente enviando, administradora respondendo e ambos abrindo/fechando as conversas.
