# Design — Identity · ativação de acesso do redator

> Spec do `active_work_item` `identity-ativacao-acesso-redator`. Escrita em 2026-08-18, sobre a
> árvore da branch `feat/identity-ativacao-acesso-redator`, a partir de `main@2c7b249`.
> Context Packet: `context-packets/2026-08-18-identity-ativacao-acesso-redator.md` (`status: ready`).

## 1. O defeito que o bloco fecha

`CreateRedatorAction` cria o `User` com `is_active=false` "até o fluxo de ativação", e o fluxo nunca
existiu: `UserProvisioner.php:40` grava uma senha `bin2hex(random_bytes(16))` que ninguém recebe, e
nenhuma tela vira o bit. **Nenhum redator autentica**, então a view `redator` do Dashboard — entregue
e testada no bloco B2 da Sprint 5 — é inalcançável por quem deveria usá-la. É a RN-01 pela metade: a
regra permite que o redator autentique, o cadastro nunca o habilita.

O Context Packet acrescentou o que o backlog não sabia, e é fonte canônica, não preferência:

- **RF-USR-09** — a credencial de admin e de redator **vai por e-mail do sistema**; não há
  auto-registro.
- **RF-ROL-05** — a role correspondente ao tipo é associada **automaticamente no cadastro**. O
  código não atribui role nenhuma ao redator, então isto é **divergência com a fonte**, não melhoria.

## 2. Fronteira do bloco

Backend **e** frontend, no mesmo bloco. Não é o corte da casa (Dashboard e Meu Perfil foram partidos
por camada), e a razão de fugir dele é o DoD: *"o redator autentica"* só se prova com as telas
públicas no ar. Um bloco de backend fecharia com o mesmo defeito que abriu este item — trabalho
entregue e inalcançável.

**A P-03 dispara e a exceção está declarada no `state.md`:** o bloco é backend e roda na worktree
`fix-frontend`, não na main tree, por decisão do João. Compose é um só; migration, seed e teste de
integração disputam o mesmo MySQL com `/home/jvbat/projetos/lotus`.

**A base não contém `arquivados-e-restauracao`** (fechado em `feat/arquivados-e-restauracao@3d7e95c`,
não integrado). Conflito de merge em `User`/Identity é previsto, não descoberto.

## 3. Decisões

| # | Decisão | Escolha | Descartado |
|---|---|---|---|
| D1 | Alcance | **Só redator.** Staff segue com senha digitada pelo admin | Redator + staff no mesmo bloco; desenho genérico por `type` sem consumidor |
| D2 | Corte | **Bloco único ponta a ponta** | Partir backend × frontend; partir primeiro-acesso × recuperação |
| D3 | Mecanismo | **Link por e-mail**, um mecanismo servindo primeiro acesso e recuperação | Senha gerada no e-mail; senha escolhida pelo admin |
| D4 | `is_active` do redator | **`true` no cadastro**, com revogação pelo admin | Ativar na conclusão do link; ativar por ação administrativa separada |
| D5 | TTL | **Dois brokers na mesma tabela**: `invites` 7 dias, `users` 60 min | TTL único de 24h; padrão 60 min com reenvio obrigatório |
| D6 | Superfície da revogação | **Switch no formulário do redator**, encerrando todas as sessões | Ação dedicada "revogar acesso"; deixar revogação fora do bloco |
| D7 | E-mail em dev | **Mailpit no compose**, como gotenberg e minio | Manter `MAIL_MAILER=log`; decidir na execução |
| D8 | Reenvio de convite | **Entra no bloco** | Ficar fora |

**D8 tem motivo medido, e não é conveniência:** os redatores já cadastrados nasceram
`is_active=false` com senha aleatória. Sem reenvio não existe caminho para dar acesso a eles — o
switch liga a conta e ninguém sabe a senha, e eles não sabem que existem para pedir recuperação.

## 4. Fluxo

**Primeiro acesso.** Admin cadastra → `CreateRedatorAction` cria o `User` com `type=redator`,
`is_active=true`, role `redator` e a senha aleatória que **continua sem dono** (valor não-nulo, não
credencial) → `SendRedatorAccessInvitationAction` dispara em `DB::afterCommit` → e-mail com
`{app.frontend_url}/definir-clave/{token}` → redator define a senha → volta ao login e entra.

**Recuperação.** Qualquer usuário que autentica pede em `/recuperar-clave` → mesmo e-mail, mesmo
destino, TTL de 60 min.

**Link morto cai na tela de recuperação.** Expiração não vira chamado para o admin.

`config('app.frontend_url')` já existe (`config/app.php:57`) e `FRONTEND_URL` já está no
`.env.example:40` — o link não precisa de env nova.

## 5. Contrato de API

Rotas públicas, fora de `auth:sanctum`, com `throttle` — o repo hoje não tem nenhum.

| Rota | Entrada | Saída |
|---|---|---|
| `POST /api/password/forgot` | `email` | **200 genérico sempre**, existindo o e-mail ou não |
| `POST /api/password/reset` | `token`, `email`, `password`, `password_confirmation` | 204; token inválido ou expirado sobe **422 pelo handler RFC 7807**, nunca `abort()` |
| `POST /api/redatores/{redator}/invitation` | — | 204; sob `permission:identity.user.update` |

**A resposta genérica do `forgot` é decisão de segurança, não economia:** resposta distinta por
e-mail existente transforma a rota pública em enumerador de usuários.

Senha: `min:8` + `confirmed`, a régua já vigente em `ProfilePasswordData.php:35` e `UserData.php:58`.
**Política de senha nova não se inventa dentro deste bloco.**

## 6. Mudanças por arquivo

**Backend**

- `config/auth.php` — broker `invites` novo (expire 10080), `users` permanece em 60.
- `app/Domains/Identity/Services/UserProvisioner.php` — `is_active` deixa de ser `false` fixo e passa
  a mapear por `type`: `redator` → `true`; `cliente` e `aluno` → `false`. Fonte única, como a
  checagem de identidade já é.
- `app/Domains/Identity/Actions/CreateRedatorAction.php` — `syncRoles(['redator'])` dentro da
  transação (RF-ROL-05) e disparo do convite em `DB::afterCommit`.
- `app/Domains/Identity/Actions/SendRedatorAccessInvitationAction.php` — nova; gera o token pelo
  broker `invites` e envia a notificação. Serve o cadastro e o reenvio.
- `app/Domains/Identity/Actions/UpdateRedatorAction.php` + `Data/RedatorData.php` — `is_active` vira
  campo de entrada; desligar encerra **todas** as sessões.
- `app/Domains/Identity/Actions/PurgeOtherSessionsAction.php` — ganha o caminho "purgar tudo". Hoje
  preserva `keepSessionId` porque nasceu para troca de senha própria; revogação não preserva nada.
- `app/Domains/Identity/Notifications/RedatorAccessInvitation.php` e `PasswordResetLink.php` — novas.
  Texto por `__()` em `lang/{en,es,es_CL,pt_BR}`, **nunca literal**; o redator não tem locale de
  request, então o e-mail sai em `es_CL`.
- `app/Domains/Identity/Http/Controllers/PasswordResetController.php` e
  `RedatorInvitationController.php` — novos; `app/Domains/Identity/routes.php` recebe as três rotas.
- `docker-compose.yml` — serviço `mailpit` (SMTP 1025, UI 8025); `.env.example` passa a
  `MAIL_MAILER=smtp`, `MAIL_HOST=mailpit`, `MAIL_PORT=1025`.

**Frontend**

- `src/app/router/AppRouter.tsx` — `/definir-clave/:token` e `/recuperar-clave`, públicas, no
  precedente de `/validar/:uuid`.
- `src/features/identity/components/Password/` — `SetPasswordPage`, `ForgotPasswordPage`.
- `src/features/identity/api/passwordApi.ts` e hooks próprios. Nada de import cruzado de feature nem
  PrimeReact fora de `shared/ui` (§5.6).
- `src/features/identity/components/Login/LoginForm.tsx` — link "¿Olvidaste tu clave?".
- `src/features/identity/components/Redator/` — switch de `is_active` e botão de reenvio.
- i18n nas 3 locales do app.
- `src/shared/types/generated.ts` — **regenerado**, nunca editado (lei §5.3): `RedatorData` muda.

## 7. Definition of done

Comportamento provado no navegador, contra a API real:

1. Cadastrar um redator, abrir o Mailpit, clicar o link, definir a senha, autenticar e cair na view
   `redator` do Dashboard.
2. Admin desliga o switch: o login passa a ser recusado **e** a sessão que estava viva morre.
3. Pedir recuperação com e-mail inexistente devolve a mesma resposta que com e-mail existente.
4. Reenviar convite para um redator pré-existente dá acesso a ele.

Testes de backend: convite disparado no cadastro; token de 7 dias aceito e token de 60 min expirado
recusado; `forgot` genérico; throttle; role `redator` atribuída no cadastro; **cliente e aluno
continuam `is_active=false`** — a RN-01 não pode ser afrouxada de carona.

Build verde não é DoD (lei §5.8).

## 8. Fora de escopo — viram débito nomeado no backlog

- **Staff continua com senha digitada pelo admin** (`CreateStaffUserAction.php:41`): divergência viva
  com o RF-USR-09, por decisão de escopo do João (D1).
- **D-36** (envelope RFC 7807 não localizado) segue aberta; este bloco não a fecha, e não repete o
  padrão dela.
- Verificação de e-mail e o hardening de rate limit da EAP 9.1.1 além do throttle destas rotas.
- Expiração, reenvio e revogação **do token** além do que a D5 e a D8 fixam.
