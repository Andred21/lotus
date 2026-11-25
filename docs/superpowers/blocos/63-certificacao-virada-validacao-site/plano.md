# Bloco 63 — Virada da validação para o site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O QR do certificado passa a apontar para `https://lotusotec.cl/validar/<uuid>`, o QR antigo do app redireciona com `301`, e a tela de validação sai do app.

**Architecture:** O QR novo é valor de env (o backend não muda). O `301` é uma `location` de nginx idêntica no `prod.conf` e no 443 do `tls.conf`, guardada pela catraca textual e medida num `nginx:alpine`. A saída da tela remove a rota, os arquivos que só ela usa, o token tipográfico e o bloco de locale, e atualiza docs e a P-89.

**Tech Stack:** nginx (`nginx:alpine`), React 19 + TS (Vite), Vitest, i18next, Docker.

**Spec:** `docs/superpowers/blocos/63-certificacao-virada-validacao-site/spec.md`

## Global Constraints

- Domínio do QR novo, exato: `https://lotusotec.cl` (sem barra final).
- Destino do `301`, exato: `return 301 https://lotusotec.cl$request_uri;`.
- Cabeçalho da `location`, exato: `location ~ ^/validar(/|$)` — casa `/validar` e `/validar/...`, não `/validarx`.
- Conteúdo e layout do PDF não mudam; backend não muda; `GET /api/publico/certificados/{uuid}`, a consulta e o PDF públicos ficam.
- `SessionBootstrap` fica onde está.
- 3 locales com chaves idênticas (`es-CL`, `pt-BR`, `en`).
- Gate do frontend: `pnpm build` + `pnpm lint` + `pnpm test`, de `frontend/`.
- `backlog.md` não se edita nas tasks: a D-70 sai no fechamento, pelo `/finalizar-bloco`.

## Review Focus

1. QR com query string (`/validar/<uuid>?utm=x`): o `301` preserva a query — medido na Task 2, Step 6.
2. `/validar` sem uuid (link antigo, favorito): também vai ao site — catraca e medição da Task 2.
3. Caminho vizinho (`/validarx`, `/validacion`) e API (`/api/publico/certificados/...`): não redirecionam — catraca e medição da Task 2.
4. HSTS no `301` do 443: a `location` nova não pode ter `add_header`, ou cancela o HSTS do server — catraca da Task 2.
5. Chave de locale órfã ou faltando num idioma depois da remoção: o `plural.test.ts` e a paridade de locales da suíte pegam — Task 3, Step 5.

---

### Task 1: QR novo no molde de produção

**Files:**
- Modify: `frontend/tests/env-prod-example.test.ts:27-38`
- Modify: `deploy/aws/env.prod.example:91-101`
- Modify: `deploy/aws/README.md:744` e o parágrafo de `:754`

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: Mudar a catraca para o valor novo**

Em `env-prod-example.test.ts`, criar `const SITE = 'lotusotec.cl'` ao lado de `DOMINIO` e trocar só a linha de `CERTIFICATE_VALIDATION_URL` do `it.each`:

```ts
['CERTIFICATE_VALIDATION_URL', `https://${SITE}`],
```

Os outros cinco campos continuam com `DOMINIO`.

- [ ] **Step 2: Rodar e ver falhar**

Run (de `frontend/`): `pnpm test tests/env-prod-example.test.ts`
Expected: FAIL em `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl`, recebido `https://app.lotusotec.cl`.

- [ ] **Step 3: Trocar o valor no molde**

`env.prod.example:101` passa a `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl   # na fase sem DNS: VAZIA`. No bloco de comentário acima (`:91-100`), uma linha nova: a base é o **site** institucional, não o app, desde o bloco 63; o `/validar/*` do app responde `301` para lá.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test tests/env-prod-example.test.ts`
Expected: PASS.

- [ ] **Step 5: Runbook**

`README.md:744`, coluna "Agora": `https://lotusotec.cl`. No parágrafo de `:754`, uma frase: desde o bloco 63 a base é o site, e o `/validar/*` do app responde `301` para ele.

- [ ] **Step 6: Commit**

```bash
git add frontend/tests/env-prod-example.test.ts deploy/aws/env.prod.example deploy/aws/README.md
git commit -m "feat(63): QR do certificado aponta para o site"
```

---

### Task 2: `301` do QR antigo no nginx

**Files:**
- Modify: `frontend/tests/nginx-conf.test.ts` (describe novo ao fim do arquivo)
- Modify: `docker/nginx/prod.conf` (`location` nova antes de `location /assets/`)
- Modify: `deploy/nginx/tls.conf` (a mesma `location` no servidor 443, antes de `location /assets/`)

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: Escrever os testes**

Ao fim de `nginx-conf.test.ts`, um describe `'o QR antigo vai ao site (bloco 63)'`, com `const VALIDAR = 'location ~ ^/validar(/|$)'` e os casos:

```ts
it('o redirect é IDÊNTICO nos dois arquivos', () => {
  expect(corpo(TLS_443, VALIDAR)).toBe(corpo(PROD_80, VALIDAR))
})

it('leva ao site com caminho e query preservados', () => {
  expect(corpo(PROD_80, VALIDAR)).toBe('return 301 https://lotusotec.cl$request_uri;')
})

it('casa /validar e /validar/<uuid>, e não o vizinho nem a API', () => {
  const padrao = new RegExp(VALIDAR.replace(/^location ~ /, ''))
  for (const sim of ['/validar', '/validar/', '/validar/00000000-0000-0000-0000-000000000000'])
    expect(padrao.test(sim), sim).toBe(true)
  for (const nao of ['/validarx', '/validacion', '/', '/api/publico/certificados/x'])
    expect(padrao.test(nao), nao).toBe(false)
})

it('não tem add_header — é assim que o 301 do 443 herda o HSTS do server', () => {
  expect(corpo(TLS_443, VALIDAR)).not.toMatch(/^add_header /m)
})

it('o servidor 80 do tls.conf não ganha o redirect — ele manda tudo a https primeiro', () => {
  expect(TLS_80).not.toContain(VALIDAR)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `frontend/`): `pnpm test tests/nginx-conf.test.ts`
Expected: FAIL com `bloco ausente: location ~ ^/validar(/|$)` nos três primeiros casos que leem o corpo.

- [ ] **Step 3: Escrever a `location` nos dois arquivos**

```nginx
location ~ ^/validar(/|$) {
    return 301 https://lotusotec.cl$request_uri;
}
```

Em `prod.conf` e no 443 do `tls.conf`, antes de `location /assets/`, com um comentário curto acima: o QR impresso de antes do bloco 63 leva a `app.lotusotec.cl/validar/<uuid>`, e a validação mora no site; sem `add_header`, para o 443 herdar o HSTS. O comentário do fallback do SPA em `prod.conf:59-60` deixa de citar `/validar/:uuid` como exemplo de rota de cliente e passa a citar `/definir-clave/:token`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test tests/nginx-conf.test.ts`
Expected: PASS, todos os casos do arquivo, os antigos inclusive.

- [ ] **Step 5: Subir o `prod.conf` num `nginx:alpine`**

Da raiz da lane:

```bash
docker run --rm -d --name lotus63-prova-nginx --add-host app:127.0.0.1 \
  -v "$PWD/docker/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro" \
  -p 127.0.0.1:18063:80 nginx:alpine
docker exec lotus63-prova-nginx nginx -t
```

O `--add-host` só faz o `fastcgi_pass app:9000` resolver na partida, e o stack não precisa estar de pé.
Expected: `nginx -t` com `syntax is ok` e `test is successful`.

- [ ] **Step 6: Medir o comportamento**

```bash
for p in '/validar/00000000-0000-0000-0000-000000000000?utm=x' /validar /validarx / /api/publico/certificados/x; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://127.0.0.1:18063$p"
done
docker stop lotus63-prova-nginx
```

Expected:
- `/validar/0000…?utm=x -> 301 https://lotusotec.cl/validar/00000000-0000-0000-0000-000000000000?utm=x`
- `/validar -> 301 https://lotusotec.cl/validar`
- `/validarx -> 200` (fallback do SPA)
- `/ -> 200`
- `/api/publico/certificados/x -> 502` (chegou ao fastcgi, que não existe aqui)

Copie a saída para o relatório da task. Ela é a prova de comportamento da spec, §5.2.

- [ ] **Step 7: Commit**

```bash
git add frontend/tests/nginx-conf.test.ts docker/nginx/prod.conf deploy/nginx/tls.conf
git commit -m "feat(63): 301 do QR antigo para o site"
```

---

### Task 3: Saída da tela de validação do app

**Files:**
- Modify: `frontend/src/app/router/AppRouter.tsx:18,31-34` (import e rota)
- Delete: `frontend/src/features/certification/components/Validation/` inteira (`ValidationPage.tsx`, `ValidationPage.test.tsx`, `ValidationPageFolio.test.tsx`, `StatusHeading.tsx`, `NotFoundCard.tsx`)
- Delete: `frontend/src/features/certification/hooks/useValidationPage.ts`, `useValidationPage.test.tsx`
- Delete: `frontend/src/features/certification/api/usePublicCertificate.ts`
- Modify: `frontend/src/shared/ui/typography.ts:78-86` (sai `validationVerdictClass` e o docblock)
- Modify: `frontend/src/shared/ui/typography.test.ts:2,61-67` (sai o import e o caso do veredito)
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json` (sai `certificate.validation`)
- Modify: `frontend/src/shared/config/locales/plural.test.ts:37` (sai `'certificate.validation.hours'`)
- Modify (só comentário): `frontend/src/app/App.tsx:3-6`, `frontend/src/shared/testing/providers.tsx:70`, `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx:62`, `frontend/src/shared/hooks/useEntityPhoto.test.tsx:17`, `frontend/src/app/pages/Dashboard/useDashboard.test.tsx:181`, `frontend/src/features/certification/components/Historial/HistorialTableRowActions.test.tsx:12`

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: Medir o que sai antes de remover**

Run (de `frontend/`):
```bash
grep -rn "certificate\.validation" src --include=*.ts --include=*.tsx | grep -v "components/Validation/\|hooks/useValidationPage"
```
Expected: só `src/shared/config/locales/plural.test.ts:37`. Se aparecer qualquer outro leitor, pare e reporte: a spec assume que o bloco de locale é só da tela.

- [ ] **Step 2: Remover rota, arquivos e token**

Apague os arquivos de **Files** e a rota `/validar/:uuid` do `AppRouter`, com o import e o comentário dela. Tire `validationVerdictClass` de `typography.ts` e o caso dele de `typography.test.ts`.

- [ ] **Step 3: Remover o bloco de locale**

Tire a chave `validation` de dentro de `certificate` nos três JSON, e `'certificate.validation.hours'` da lista do `plural.test.ts`.

- [ ] **Step 4: Comentários**

- `App.tsx`: a rota pública fora do bootstrap passa a ser `/definir-clave/:token`, no lugar de `/validar/:uuid`.
- Comentários que citam `useValidationPage.test.tsx` ou `ValidationPage.test.tsx` como exemplo (`providers.tsx`, `useEntityPhoto.test.tsx`, `useDashboard.test.tsx`, `HistorialTableRowActions.test.tsx`): passam a dizer que o caso era da tela de validação, que saiu do app no bloco 63, sem caminho de arquivo que não existe mais.
- `CertificateViewDialog.tsx:62`: a menção à `ValidationPage` vira a página de validação do site.

- [ ] **Step 5: Gate**

Run (de `frontend/`):
```bash
grep -rn "ValidationPage\|useValidationPage\|usePublicCertificate\|validationVerdictClass\|StatusHeading\|NotFoundCard\|/validar/:uuid" src
pnpm build && pnpm lint && pnpm test
```
Expected: o `grep` só acha comentários que dizem que a tela saiu, e nenhum import. `build`, `lint` e `test` verdes. A paridade de chaves entre locales está na suíte.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src
git commit -m "feat(63): tela de validação sai do app"
```

---

### Task 4: Docs e P-89

**Files:**
- Modify: `.claude/rules/frontend-fsliced.md:37-39` (parágrafo "Validação QR pública") e `:322` (a lista dos 9 arquivos que montam PrimeReact)
- Modify: `.claude/rules/frontend-estilizacao.md` (linha `<CertificateFolio>` da tabela de tipografia; linha "Hero público (validação por QR)" da tabela de padding)
- Modify: `PRODUCT.md:17-19`
- Modify: `docs/superpowers/pendencias/abertas.md:607-623` (P-89)
- Modify: `docs/superpowers/pendencias/README.md:139` (índice da P-89)

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: Rules**

- `frontend-fsliced.md`: o parágrafo "Validação QR pública" passa a dizer que a validação pública mora no site (`lotusotec.cl/validar`) desde o bloco 63, que o `/validar/*` do app responde `301` no nginx, e que a API pública `/api/publico/certificados/*` segue no app, sem cookie, para o site. Em `:322` a lista é medição datada de 2026-08-16. Acrescente que a `ValidationPage` saiu no bloco 63, sem reescrever a medição.
- `frontend-estilizacao.md`: `<CertificateFolio>` fica só com "diálogo de emissão". A linha "Hero público (validação por QR)" sai da tabela de padding.

- [ ] **Step 2: PRODUCT.md**

"Terceiros sem login" abrem a página de validação do site (`lotusotec.cl/validar/<uuid>`), não mais `/validar/:uuid` do app.

- [ ] **Step 3: P-89**

- Título: o QR em `https://lotusotec.cl/validar/…` não foi decodificado de um PDF de produção.
- Gatilho: o primeiro certificado real emitido depois do deploy do bloco 63 ter o QR decodificado (`pdftoppm` + `zbarimg`) para `https://lotusotec.cl/validar/<uuid>`, e a página do site responder com o estado certo.
- Um parágrafo novo diz que o endereço mudou no bloco 63 e que o histórico acima é do app.
- O índice em `pendencias/README.md:139` acompanha título e gatilho.

- [ ] **Step 4: Verificar refs de doc**

Run (de `frontend/`): `pnpm test tests/repo-docs-refs.test.ts`
Expected: PASS. Nenhum doc normativo cita caminho que saiu na Task 3.

- [ ] **Step 5: Commit**

```bash
git add .claude/rules/frontend-fsliced.md .claude/rules/frontend-estilizacao.md PRODUCT.md docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md
git commit -m "docs(63): validação pública mora no site; P-89 com o endereço novo"
```

---

## Fora das tasks

- **D-70** sai do `backlog.md` no fechamento da lane (`/finalizar-bloco`), com a nota "migrou para o site". Não se edita o backlog numa task.
- **P-89** fecha na aceitação, item 4 da `## Verificação externa` da spec.
- As ações em produção (env, `scp` do `tls.conf`, deploy) são da `## Verificação externa`, não do plano.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 3, 4 | sim — os seis pares conferidos: env/README × nginx × `frontend/src` × rules/PRODUCT/pendências | nenhuma: todas declaram `Consumes: nada` e `Produces: nada` |

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- `executor: claude` — a Task 3 remove tela e chaves com julgamento sobre leitores (Step 1 pode parar), e a Task 2 mede comportamento de borda de produção com container. O bloco é de peso legal (destino do QR) e toca infra versionada que vai ao host.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-mecanico` nas Tasks 1 e 4; `implementador-integracao` nas Tasks 2 e 3; `revisor-task` em toda task; `re-revisor` nas rodadas de correção; `revisor-branch` ao fim.
