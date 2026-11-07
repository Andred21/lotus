# 01: Rotas de módulo sem permissão não abrem para o redator

**What to build:** o redator que digita a URL de um módulo que não tem (`/comercial`,
`/comercial/presupuestos/:id`, `/personas`, `/administracion`, `/cursos`, `/certificados`) hoje vê
o cabeçalho do módulo e o aviso "Could not load the data / You do not have permission for this
action", vindo do 403 da API. Em `/certificados` nem o aviso aparece: a página fica com o título e um
cartão vazio. A API está correta (403 em todos, medido no ensaio local); falta a SPA tratar a rota
pela permissão do usuário, como já trata o menu lateral, que mostra só Dashboard e Operations.

Origem: ensaio local do bloco 59 (Fase A do `audit.md`), checklist §4.3 item 5, contas 2 e 5 do seed
(2026-11-07).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] Um redator que abre a URL de um módulo sem permissão cai num destino único e explícito
      (redirecionamento ao início ou página "sem acesso"), igual para todos os módulos.
- [ ] `/certificados` deixa de renderizar vazio para quem não tem a permissão.
- [ ] O admin continua abrindo todos os módulos.
- [ ] A regra sai das permissões do `/api/me`, não do `type`, para valer quando surgir papel novo.
