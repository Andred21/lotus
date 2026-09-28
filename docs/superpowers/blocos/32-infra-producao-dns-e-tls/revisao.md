# Bloco 32 — revisão de sprint

Revisão de 2026-09-27, pela skill `revisar-sprint`, do intervalo `0c2c3d57..4e38b990` (base da lane
até o handoff). Risco **alto**: o `env.prod.example` mexe no cookie de sessão do Sanctum
(`SESSION_SECURE_COOKIE`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, lei §5.4) e na
`CERTIFICATE_VALIDATION_URL`, que é a base do QR de um documento legal. Duas lentes: a revisão
Claude pelo gabarito do projeto e uma revisão independente do Codex, pelo plugin `codex-companion`
em read-only (o MCP `mcp__codex__codex` não existia na sessão — o fallback da Task 1 do próprio
bloco, exercido aqui pela primeira vez).

**Verificado pela revisão.** As três catracas passam (27 testes em `nginx-conf`, `recarregar-nginx`
e `env-prod-example`). Seis sondas da lição 19, feitas com `cp` no scratchpad e `git diff
--exit-code` no fim, reprovam todas: hook sem `nginx -t`, hook com `|| true`, hook com `restart`,
HSTS do server sem `always`, `location /` sem a repetição do HSTS, `APP_URL` em `http://`. O hook
funciona sem as variáveis de imagem porque o `docker-compose.prod.yml` tem default em todas
(`${LOTUS_IMAGE:-…}`), e a produção o executou com `rc=0`. O fallback do Codex usa flags que o
`codex-companion` 1.0.6 aceita (`task --fresh`, `--write` só na execução delegada). A CI da PR #21 e
da PR #23 do `lotus-site` passou no job `check` (DoD 2, que o audit não registrava).

**Órfãos:** nenhum. O `recarregar-nginx.sh` tem catraca, runbook e a conferência do botão; as três
catracas rodam no projeto `repo` do vitest. Nenhum código de `backend/` ou `frontend/src` mudou.

**Conformidade com a spec.** DoD 1 a 6, 8 e 9 provados no audit. O DoD 7 não (Q-1). O DoD 8 pede o
botão verde "depois de tudo", e o último verde (botão 3) é anterior à Task 11 — equivalente, porque
a Task 11 só escreveu em `/etc/letsencrypt`, que a conferência não lê.

## Achados

### [Q-1] A prova que substitui o DoD 7 é mais fraca do que o texto diz — `pendencias/abertas.md:833`, `audits/…:137-142`
**Encontrado:** a P-89 lista como "provado de fora no lugar" que `/validar/<uuid>` responde 200 e
que o `CERTIFICATE_VALIDATION_URL` "está entre os seis campos contados no host". O 200 é o fallback
da SPA: o `location /` do `tls.conf` faz `try_files $uri $uri/ /index.html`, e **qualquer** caminho
responde 200 — `/validar/…` prova o mesmo que `/xyz`. E o `grep -c = 6` conta linhas do arquivo, não
o que o app carregou: o entrypoint roda `config:cache`, e dos seis campos só os três da sessão foram
vistos em efeito (o `Set-Cookie` e o login). Que o `CertificateValidationUrl::base()` de produção devolve
`https://app.lotusotec.cl` não foi medido.
**Sênior faria:** uma leitura sem escrita no container de produção, que o João roda e o audit
registra:
`sudo docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml -f /opt/lotus/docker-compose.prod-tls.yml exec -T app php artisan tinker --execute 'echo app(\App\Domains\Certification\Services\CertificateValidationUrl::class)->base();'`
→ `https://app.lotusotec.cl` (`laravel/tinker` está no `require`, não no `require-dev`). Com isso o
resto da P-89 fica só o desenho do QR no PDF, que as suítes do item 29 cobrem. E a frase do 200
passa a dizer o que prova: a SPA é servida em https, não a validação.
**Por quê:** `efeito_externo: sim` e a invariante 11 pedem a prova do efeito externo antes de
`closed`, e o `estado.md` deixa para o review decidir se a P-89 basta. Basta se o que ela afirma ter
provado estiver provado.
**Fere:** lei §5.8 (DoD = critério provado); lição 13.
**Severidade:** 🟡 em breve · **Esforço:** P

**Divergência entre revisores, para o João decidir.** O Codex classificou o DoD 7 aberto como
**alta**: a P-89 não altera o critério aprovado na spec, e fechar o bloco sem o QR provado fere a
§5.8. A revisão Claude trata a decisão do João de não criar dado de teste em produção como decisão
consciente registrada (P-89), portanto não achado por si. O achado é só a evidência. As saídas:
(a) aceitar a P-89 com a leitura acima (recomendação Claude); (b) segurar o bloco em `blocked` até o
primeiro certificado real (linha do Codex); (c) cumprir a D4 como escrita, emitindo e revogando
sobre dado de teste — o que o João já recusou.

### [Q-2] Marcadores `<…>` em comando que se cola durante a queda viram redirecionamento — `deploy/aws/README.md:580,652`
**Encontrado:** `sudo certbot certonly … -m <e-mail> --non-interactive` (§11.2, com o nginx já
parado) e `sudo /opt/lotus/bin/deploy.sh <X — o sha de 40 hexadecimais do 11.4>` (recuo de
emergência). Colados literais, o shell lê `<` como redirecionamento de entrada e o comando não roda.
**Aconteceu na execução:** o audit (Task 10) registra que a primeira tentativa do certbot "não chegou
a rodar: o marcador do e-mail foi colado literal", dentro da janela de 4 min 25 s de queda.
**Sênior faria:** definir as variáveis no 11.1, antes do `stop nginx`, e usar só `"$EMAIL"` e `"$X"`
nos blocos da queda e do recuo, com um portão barato (`[[ $X =~ ^[0-9a-f]{40}$ ]]`). O e-mail da
conta ACME já existe (`contacto@lotusotec.cl`, audit) e pode ir literal.
**Por quê:** o runbook descreve um comando que, seguido à letra, não roda — e no único trecho em que
cada minuto é produção fora do ar ou um recuo de emergência.
**Fere:** lição 13. Achado do Codex, conferido no arquivo e no audit.
**Severidade:** 🟡 em breve · **Esforço:** P

### [Q-3] ADR-14 ainda lista o TLS automático como `[FASE 2]` a resolver — `docs/adrs.md:135`
**Encontrado:** `**Itens [FASE 2] a resolver:** TLS automático (Let's Encrypt + Certbot no Nginx); …`.
O item 32 o resolveu, e de outro jeito: certbot no **host**, emissão `--standalone`, renovação por
webroot com o deploy hook versionado `deploy/bin/recarregar-nginx.sh`, HSTS de um ano, sem alarme de
expiração até o item 34.
**Sênior faria:** uma emenda datada no molde da de 2026-09-21 (a do deploy reproduzível), dizendo
que o item está vencido e como ficou, sem apagar o texto original.
**Por quê:** o ADR é o que se consulta antes de decidir infra (`CLAUDE.md` §3). A spec §4.5 dizia
"ADR-14: nada além da emenda já feita", mas isso foi escrito antes de o TLS existir.
**Fere:** lição 13. Achado do Codex, conferido.
**Severidade:** 🟢 melhoria · **Esforço:** P

### [Q-4] O §11 não rodou na ordem do runbook, e a P-77 diz "de ponta a ponta" — `pendencias/abertas.md:816`, `audits/…:79-92`
**Encontrado:** o botão 1 promoveu com o `.env` ainda na fase sem DNS (11.4 antes do 11.3). Entre o botão 1
(01:27:47Z) e a recriação do `app` pelo botão 2 (~01:34Z), a produção serviu HTTPS com HSTS e
cookie sem `Secure` e sem `Domain`. Depois
vieram a edição do `.env`, o botão 2 com 502 e o botão 3 verde. O audit narra os fatos, mas não os
marca como **desvio do plano**, como faz com os outros. A P-77 resume tudo como "§11 executado de
ponta a ponta", e a ordem 11.3 → 11.4, a que o runbook manda, nunca foi exercida junta.
**Sênior faria:** um "Desvio do plano" no audit, na Task 10, e na P-77 "executado de ponta a ponta,
com o 11.4 antes do 11.3 (audit)". O estado final não muda: está provado.
**Por quê:** audit de sistema com peso legal registra a ordem que rodou, não a que devia rodar.
**Fere:** lição 13. Achado do Codex, conferido.
**Severidade:** 🟢 melhoria · **Esforço:** P

## Fora do escopo — registrar no fechamento

O audit já os propõe como pendência do fechamento; ficam aqui para não se perderem:

- **Corrida do gate `/up` do `deploy.sh`** (`deploy.sh:213`): num deploy que recria o `app` e não
  recria o nginx, o laço de saúde passa na hora (o nginx já estava `healthy`) e o `curl /up` bate
  antes do php-fpm novo escutar. Foi o botão 2, com 502.
- **`/api/*` autenticada sem `Accept: application/json` dá 500**, não 401: o middleware de
  autenticação tenta `route('login')`, que não existe. É anterior ao item 32 e fere o espírito da
  §5.4 (401 RFC 7807 esperado).
- **Token do `reviewing` na própria skill:** o `revisar-sprint/SKILL.md:39` manda gravar
  `next_action: review_active_work_item`, mas o contrato (`estados.sh`) exige
  `approve_review_findings`. Esta revisão seguiu o contrato, como a do bloco 30. O item 35 aposenta
  a skill, então não vale correção aqui.

## Decisão

O João aprovou os quatro achados em 2026-09-27, todos para corrigir neste bloco. Na divergência do
DoD 7, escolheu a saída (a): a P-89 fica, e a leitura do `CertificateValidationUrl::base()` no
contêiner de produção entra como a prova do efeito externo que falta.

## Correções

Todas feitas e provadas em 2026-09-27. A suíte do projeto `repo` do vitest fecha com 298 de 298,
incluindo `repo-docs-refs` e `conferir-alinhamento`, que leem os documentos tocados.

- **Q-1, `86743182`.** Leitura sem escrita no contêiner `app` de produção, pela sessão, por SSH:
  `CertificateValidationUrl::base()` devolveu `https://app.lotusotec.cl` (2026-09-28T02:27:14Z), com
  `app()->environment()` = `production` e `configurationIsCached()` verdadeiro (02:27:57Z). O
  `CertificatePdfService` monta o QR com `para()`, e o
  `CertificatePdfTest::test_qr_aponta_para_a_chave_de_validacao_quando_preenchida` prova que o QR
  carrega `<base>/validar/<uuid>`. O audit (Task 12) e a P-89 registram isso, e a frase do 200 passa
  a dizer que ele só prova a SPA servida em https. A P-89 fica só com o QR lido de um PDF de produção.
- **Q-2, `d2572936`.** `EMAIL` e `X` nascem no 11.1, antes do `stop nginx`, com o portão
  `[[ $X =~ ^[0-9a-f]{40}$ ]]`. O 11.2 usa `"${EMAIL:?defina no 11.1}"` e o recuo
  `"${X:?defina no 11.1}"`. Provado em bash: o portão recusa o texto do molde e aceita o `X` do
  item 32; com a variável vazia, `${…:?}` aborta a linha antes de o comando rodar, em shell
  interativo e não interativo. O `deploy.sh:21` já recusava SHA fora de 40 hexadecimais.
- **Q-3, `0b77fc0d`.** Emenda datada ao ADR-14, no molde da de 2026-09-21. O item `[FASE 2]` do TLS
  fica vencido, com a forma como ficou. O texto original não sai.
- **Q-4, `29ea8066`.** "Desvio do plano" no audit, na Task 10. A P-77 diz "de ponta a ponta, com o
  11.4 antes do 11.3".
