# Bloco 59 — `email-credenciais-e-teste-de-redator` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar o SES do sandbox, provar a entrega a dois domínios externos e deixar o João validar
em produção a interface real de um redator, com senha temporária, limpeza e rastro.

**Architecture:** uma correção de texto em `lang/es_CL.json` (TDD); três scripts PHP de `tinker`
versionados na pasta do bloco, que mudam o `User` pelo Eloquent e se recusam fora da allowlist;
ensaio local completo; duas fases de produção em duas mãos (o João escreve, a sessão lê e confere);
docs com os números reais.

**Tech Stack:** Laravel 13 (PHP 8.3) no container `app`, PsySH/`tinker`, Mailpit, AWS CLI
`--profile lotus`, SSH de leitura em `ubuntu@18.230.53.197`.

**Spec:** `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/spec.md`

## Global Constraints

- Contas de produção do teste: **252 e 253**, e só elas (D4). E-mail delas **nunca** muda (D2).
- Senha de teste: `Str::password(32)`, impressa uma vez, nunca gravada em arquivo (D9).
- Limpeza: `Str::random(64)` invisível, `remember_token` nulo, `sessions` do `user_id` apagadas (D10).
- Mudança no `User` só pelo Eloquent (`save()`), nunca `DB::table('users')->update` (D8, ADR-08).
- Em produção, **só requisição de leitura** no checklist; nenhum `POST/PUT/PATCH/DELETE` (D14).
- Escrita em produção e na AWS é do João; a sessão entrega o comando pronto e confere por leitura
  (memória `escrita-remota-prod-bloqueada-auto-mode`). AWS sempre com `--profile lotus`.
- `audit.md`: nenhuma senha, nenhum token, nenhum e-mail completo de terceiro; horários em
  America/Santiago (spec §6).
- Pint só nos arquivos PHP tocados, de dentro de `backend/`; `lang/es_CL.json` não passa pelo Pint.
- Defeito achado no checklist vira ticket em `blocos/59-…/tickets/`, não correção (spec §4.3).

## Review Focus

1. **`APP_ENV` errado em produção** faria o script escolher a allowlist local `[2, 5]`. Esperado:
   o script recusa toda conta que não seja `type=redator` ativa — em produção, 2 é admin. Coberto
   na Task 2, Step 4 (sonda com allowlist adulterada).
2. **Script rodado duas vezes.** `trocar-senha` gera senha nova a cada vez; `limpar-senha` é
   idempotente. Coberto na Task 2, Step 5.
3. **`SESSION_DRIVER` diferente de `database`** faria a limpeza afirmar zero sessões sem apagar
   nada. Esperado: `limpar-senha` recusa se `config('session.driver') !== 'database'`. Task 2,
   Step 2.
4. **O rodapé novo vazar para `pt_BR`/`en`** ou quebrar a paridade. Esperado: só `es_CL` muda;
   `LocaleParityTest` verde. Task 1, Step 4.
5. **Gravação acidental durante o checklist em produção.** Esperado: registrada no `audit.md` na
   hora, com horário e o que foi gravado. Task 4, Step 6.

---

### Task 1: Rodapé do e-mail em es-CL trata por "tú"

**Files:**
- Modify: `backend/lang/es_CL.json:85`
- Test: `backend/tests/Feature/Identity/AccessEmailContentTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: nada consumido por outra task.

- [ ] **Step 1: Escrever o teste que reprova**

```php
public function test_o_rodape_do_convite_em_es_cl_trata_por_tu(): void
{
    app()->setLocale('es_CL');
    $user = User::factory()->create(['email' => 'ana@lotus.cl']);

    $html = (string) (new RedatorAccessInvitation('tok-123'))->toMail($user)->render();

    $this->assertStringContainsString('Si tienes problemas para hacer clic en el botón', $html);
    $this->assertStringContainsString('copia y pega la URL de abajo', $html);
    $this->assertStringNotContainsString('copie y pegue', $html);
    $this->assertStringNotContainsString('Si está teniendo', $html);
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=test_o_rodape_do_convite_em_es_cl_trata_por_tu`
Expected: FAIL, `Si tienes problemas` ausente.

- [ ] **Step 3: Trocar o valor da chave em `backend/lang/es_CL.json:85`**

A chave (inglês) não muda. Valor exato (D13):

```
"Si tienes problemas para hacer clic en el botón \":actionText\", copia y pega la URL de abajo\nen tu navegador:"
```

- [ ] **Step 4: Rodar o teste novo, a paridade e o arquivo inteiro**

Run: `docker compose exec -T app php artisan test --filter='AccessEmailContentTest|LocaleParityTest'`
Expected: PASS. E `git diff --stat -- backend/lang/` mostra só `es_CL.json`, 1 linha.

- [ ] **Step 5: Commit**

```bash
git add backend/lang/es_CL.json backend/tests/Feature/Identity/AccessEmailContentTest.php
git commit -m "fix(identity): rodape do e-mail em es-CL trata por tu"
```

---

### Task 2: Scripts de produção — impressão digital, troca e limpeza

**Files:**
- Create: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/impressao-digital.php`
- Create: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/trocar-senha.php`
- Create: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/limpar-senha.php`
- Create: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/README.md`

**Interfaces:**
- Consumes: nada.
- Produces (usado nas Tasks 3 e 4):
  - Os três arquivos rodam por stdin: `docker compose exec -T app php artisan tinker < <arquivo>`
    no local, `ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 "sudo docker exec -i
    lotus-app-1 php artisan tinker" < <arquivo>` em produção.
  - Allowlist, a mesma nos três, no topo:
    `$ids = app()->environment('production') ? [252, 253] : [2, 5];`
    (local: 2 = Juan Morales, 1 turma no seed; 5 = Carlos Fuentes, 0 turma).
  - Guarda, a mesma nos três, antes de qualquer escrita: para cada id, `User::find($id)` existe,
    `type === 'redator'`, `is_active === true`; senão imprime `RECUSADO: <id> <motivo>` e não
    escreve **nenhum** id (checa todos antes do primeiro `save()`).
  - Linha de impressão digital, formato fixo:
    `<id> type=<type> ativo=<0|1> hash=<8 hex> sessoes=<n> convites=<n> resets=<n> logins=<n> updated_at=<iso>`
    com `hash = substr(hash('sha256', $user->getAuthPassword()), 0, 8)`, `convites` e `resets`
    contados por `email` em `invitation_tokens`/`password_reset_tokens`, `logins` em `login_logs`
    por `user_id`.

- [ ] **Step 1: `impressao-digital.php`** — leitura pura: guarda (sem recusar escrita, só aponta)
  e uma linha de impressão digital por id. Imprime também `env=<APP_ENV> session=<driver>`.

- [ ] **Step 2: `trocar-senha.php` e `limpar-senha.php`**
  - `trocar-senha`: guarda; para cada id, `$senha = Str::password(32)`,
    `$user->password = Hash::make($senha); $user->save();`, imprime `<id> senha=<senha>` e a
    impressão digital nova. Nenhuma variável sobra com a senha depois do loop (`unset`).
  - `limpar-senha`: recusa inteira se `config('session.driver') !== 'database'`; guarda; para cada
    id, `$user->password = Hash::make(Str::random(64)); $user->setRememberToken(null);
    $user->save(); DB::table('sessions')->where('user_id', $id)->delete();` e imprime a impressão
    digital nova. Não imprime a senha.

- [ ] **Step 3: Provar que o stdin do `tinker` executa o arquivo** (no local)

Run: `docker compose exec -T app php artisan tinker < docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/impressao-digital.php`
Expected: `env=local session=<driver>` e duas linhas de impressão digital, ids 2 e 5. Se o PsySH
não executar o stdin, troque a invocação por `php artisan tinker --execute "$(cat <arquivo>)"` no
local, e escreva no `README.md` a forma que funcionou nos dois lados antes de seguir.

- [ ] **Step 4: Guarda recusa conta fora do perfil** (Review Focus 1)

Copie `trocar-senha.php` para o scratchpad trocando a allowlist por `[1, 2]` (1 é admin no seed),
rode a cópia e depois `impressao-digital.php`.
Expected: `RECUSADO: 1 type=admin`, e o `hash` de 2 igual ao de antes (nada escrito).

- [ ] **Step 5: Troca, re-troca e limpeza dupla** (Review Focus 2 e 3)

Rode, na ordem, `impressao-digital` (H0), `trocar-senha` (H1), `trocar-senha` (H2),
`limpar-senha` (H3), `limpar-senha` (H4).
Expected: H0, H1, H2, H3 e H4 todos diferentes por id; `sessoes=0` depois de cada limpeza; o
login com a senha de H2 recusado depois de H3 (`curl` no `/api/login` da lane, 8081, com o
cookie CSRF do `/sanctum/csrf-cookie`).

- [ ] **Step 6: `README.md` dos scripts** — para que servem, ordem (impressão → troca → checklist
  → limpeza → impressão), as duas invocações que funcionaram no Step 3, e as proibições: não
  editar a allowlist em produção, não colar a senha em lugar nenhum.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/
git commit -m "feat(59): scripts de senha temporaria e limpeza para teste de redator"
```

---

### Task 3: Ensaio local do checklist e da sonda

**Files:**
- Create: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/audit.md`
- Create (se houver defeito): `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/tickets/<NN>-<slug>.md`

**Interfaces:**
- Consumes: Task 2 (os três scripts, a allowlist local `[2, 5]`, o formato da impressão digital).
- Produces: `audit.md` com a seção `## Fase A — ensaio local`; as Tasks 4 e 5 acrescentam seções.

- [ ] **Step 1: Stack e frontend da lane**

Run: `docker compose up -d` e, em `frontend/`, `pnpm dev --port 5174` em segundo plano.
Expected: `http://localhost:8081/up` 200 e a SPA em `http://localhost:5174`.

- [ ] **Step 2: Impressão digital (H0) e troca de senha nas contas 2 e 5**, pelos scripts.

- [ ] **Step 3: Checklist do spec §4.3, itens 1 a 6, com a conta 2 e com a conta 5**, pela SPA
  (skill `playwright-cli`, uma captura por item, salva no scratchpad, não no repo) e pela API
  (`curl` com cookie de sessão). Respostas esperadas: conta 5 em `GET /api/turmas/<id da turma
  de 2>` → 404; as duas em `GET /api/budgets` e `GET /api/users` → 403.

- [ ] **Step 4: Recusa de escrita, só no local (D14)**

Com a conta 2: `POST /api/turmas/<turma própria>/conclude` → 403 (`operation.turma.complete` é
admin-only). Com a conta 5: `POST /api/turmas/<turma de 2>/documents` → 404 (turma alheia).
Com a conta 2: `submit_docs` e `record_result` na turma própria, pela SPA → aceitos.

- [ ] **Step 5: Limpeza e impressão digital final** — H0, troca e limpeza diferentes; `sessoes=0`.

- [ ] **Step 6: Sonda local** — no `tinker` da lane, com o mailer forçado para o Mailpit
  (`config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'mailpit', 'mail.mailers.smtp.port' => 1025])`),
  o `Mail::raw` do runbook §13.3 para `sonda-a@prismusai.com` e `sonda-b@gmail.com`.
  Expected: as duas no Mailpit (`http://localhost:8026/api/v1/messages`). Prova só o comando; a
  entrega real é da Task 5.

- [ ] **Step 7: Escrever `## Fase A — ensaio local` no `audit.md`** — data e hora, impressões
  digitais H0/troca/limpeza, resultado de cada item do checklist por conta, os códigos HTTP do
  Step 3 e do Step 4, a sonda, e os tickets abertos (ou "nenhum defeito").

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/audit.md docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/tickets/
git commit -m "docs(59): ensaio local do checklist do redator e da sonda"
```

---

### Task 4: Produção — pedido à AWS e teste com os redatores 252 e 253

Task em duas mãos: a sessão prepara e confere, o João roda as escritas.

**Files:**
- Modify: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/audit.md`
- Create (se houver defeito): `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/tickets/<NN>-<slug>.md`

**Interfaces:**
- Consumes: Task 2 (scripts e invocação de produção); Task 3 (`audit.md` e o checklist já
  ensaiado).
- Produces: `audit.md` com `## Fase B — pedido à AWS` e `## Fase C — teste em produção`; o nº do
  caso da AWS, consumido pela Task 5.

- [ ] **Step 1: Entregar ao João o pedido de production access** — o comando do runbook §13.6 com
  `--profile lotus` e a `--use-case-description` do spec §5 passo 2, sem acento. O João roda e cola
  o retorno.

- [ ] **Step 2: Conferir por leitura** — `aws sesv2 get-account --region sa-east-1 --profile lotus
  --query '{prod:ProductionAccessEnabled,review:Details.ReviewDetails}'`. Expected: `ReviewDetails`
  com `Status: PENDING` e `CaseId`. Registrar no `audit.md`.

- [ ] **Step 3: H0 em produção** — a sessão roda `impressao-digital.php` pela invocação de
  produção (leitura). Expected: `env=production session=database`, ids 252 e 253 com `type=redator
  ativo=1`, `sessoes=0 convites=0 resets=0 logins=0`. Qualquer outra coisa: PARE e mostre ao João.

- [ ] **Step 4: O João roda `trocar-senha.php`** e guarda as duas senhas na sessão dele. A sessão
  anota a hora de início da janela.

- [ ] **Step 5: O João percorre o checklist §4.3** com 252 e com 253, só leitura (D14), e dita o
  resultado; a sessão registra.

- [ ] **Step 6: Gravação acidental** (Review Focus 5) — se houver, o João avisa na hora; a sessão
  registra horário, conta, tela e o que foi gravado, e lê o `audits` da entidade para anexar o id.

- [ ] **Step 7: O João roda `limpar-senha.php`**; a sessão roda `impressao-digital.php`.
  Expected: hash diferente de H0 e do pós-troca, `sessoes=0`. A sessão anota a hora de fim da
  janela e lê `login_logs` de 252 e 253 nela (contagem e horários, sem IP).

- [ ] **Step 8: Escrever `## Fase B` e `## Fase C` no `audit.md`** e commitar.

```bash
git add docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/
git commit -m "docs(59): pedido de production access e teste do redator em producao"
```

---

### Task 5: Produção — sonda, aviso ao site e docs

Roda quando o `get-account` mostrar `ProductionAccessEnabled: true`. Se a aprovação não sair até
o `/finalizar-bloco`, esta task vai para a lane de aceitação (spec §5).

**Files:**
- Modify: `docs/adrs.md` (ADR-23, emenda de 2026-11-07, depois da emenda de 2026-10-01)
- Modify: `deploy/aws/README.md` (§13.1 e §13.6)
- Modify: `docs/superpowers/pendencias/abertas.md` (P-98)
- Modify: `docs/superpowers/backlog.md` (FUT-4)
- Modify: `docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/audit.md`

**Interfaces:**
- Consumes: Task 4 (nº do caso, data do pedido).
- Produces: nada consumido por outra task.

- [ ] **Step 1: Readback** — `get-account` com `--profile lotus`. Expected: `prod: true`, cota
  nova. Registrar.

- [ ] **Step 2: Sonda real** — entregar ao João o bloco de `tinker` interativo do runbook §13.3
  com duas linhas `Mail::raw` (o endereço `@prismusai.com` e o Gmail **não** verificado que ele
  escolher). Antes, a sessão confere com `aws sesv2 list-email-identities` que o Gmail escolhido
  não está na lista. O João cola o `Authentication-Results` dos dois. Expected: `spf=pass`,
  `dkim=pass`, `dmarc=pass` nos dois; `aws ses get-send-statistics` sem `Bounces`/`Rejects` no
  intervalo. Registrar só o domínio de cada destinatário.

- [ ] **Step 3: Aviso ao site** — redigir a linha para a sessão do `lotus-site` (D-54 de lá): "a
  conta SES saiu do sandbox em <data>; o teto de 200/24 h que freava o `/api/contacto` deixou de
  existir; cota nova <n>/24 h". O João entrega; registrar no `audit.md` quando e por onde.

- [ ] **Step 4: Docs** (spec §4.4)
  - ADR-23: emenda de 2026-11-07 — o gatilho "verificar externo virando rotina" disparou (três
    redatores externos); data do pedido e da aprovação, nº do caso, cota nova, efeito no site; a
    identidade pessoal fica (D12).
  - Runbook: §13.1 passa a dizer que destinatário não precisa mais de verificação desde a data;
    §13.6 registra pedido, caso, texto usado e readback.
  - P-98: tira a metade do redator, fica a do alerta (spec §4.4); revisar em 2026-12-07.
  - FUT-4: o pré-requisito do production access sai, o resto fica.

- [ ] **Step 5: `## Fase D — sonda e docs` no `audit.md`** e commit.

```bash
git add docs/adrs.md deploy/aws/README.md docs/superpowers/pendencias/abertas.md docs/superpowers/backlog.md docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/audit.md
git commit -m "docs(59): SES fora do sandbox, sonda, ADR-23 e runbook"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2 | sim (`backend/lang/es_CL.json` + teste × `blocos/59-…/scripts/`) | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma. As Tasks 3, 4 e 5 são sequenciais: 3 consome 2,
4 consome 2 e 3, 5 consome 4, e as três escrevem o mesmo `audit.md`.

## Handoff de execução

- **executor:** `claude`. As Tasks 3 a 5 tocam produção, a AWS e julgamento sobre o que o checklist
  mostra; a Task 2 é a guarda de escrita em conta real.
- **Sessão:** opus, esforço da sessão.
- **Papéis (`.claude/papeis.md`):** `implementador-mecanico` para a Task 1; `implementador-integracao`
  para a Task 2; `revisor-task` depois de cada uma; `revisor-branch` no fim. As Tasks 3, 4 e 5
  rodam na própria sessão, sem despacho: dependem do stack da lane, do navegador e das duas mãos com
  o João.
- **paths_autorizados:** não se aplica (`executor: claude`).
