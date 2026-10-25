# Higiene e manutenção da produção — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** limpar a produção e fechar as lacunas de higiene do automático: poda de imagens no deploy,
retry do backup, journald/apt, reboot automático, política e lifecycle do S3, Q-1 e pnpm no portão.

**Architecture:** scripts de `deploy/bin/` e o `user-data.sh` mudam com catraca em
`frontend/tests/` (por execução onde há gate, lição 19); política e lifecycle do S3 viram JSON
versionado em `deploy/aws/`; o runbook e os ADRs registram; a produção é mexida pelo João em duas
tasks finais, com Claude conferindo só leitura.

**Tech Stack:** bash (`set -euo pipefail`), vitest com `spawnSync` e fakes no PATH, AWS CLI v2, Docker
29, Ubuntu noble (`unattended-upgrades`, systemd-journald).

**Spec:** `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/spec.md`

## Global Constraints

- Bucket: `lotus-prod-760144413534`. App: `arn:aws:iam::760144413534:role/lotus-ec2`. Infra:
  `arn:aws:iam::760144413534:user/lotus-infra`.
- Prazos do S3: documentos 7 dias de versão antiga; `user-photos/` 1 dia; `backups/` sem mudança
  (atual 30, versão antiga 7, multipart 7).
- Imagens do Lotus: `ghcr.io/gatika-cl/lotus-app`, `lotus-web`, `lotus-clamav`, tag = SHA de 40 hex.
  Nunca `docker image rm -f`.
- journald `SystemMaxUse=200M`; apt `AutocleanInterval "7"`; reboot automático `08:30` (UTC no host).
- Retry do upload: 3 tentativas; IMDS com `AWS_METADATA_SERVICE_NUM_ATTEMPTS=3` e
  `AWS_METADATA_SERVICE_TIMEOUT=5`.
- Lição 19 do `docs/README.md`: todo gate tem sonda (`|| true` ou o `exit` apagado) que reprova a
  catraca; `toContain`/`indexOf` não contam como catraca de gate.
- Toda escrita em produção é do João; Claude confere por SSH/AWS só leitura.
- O bloco não toca `backend/` nem `frontend/src/`.
- Comentário de script no estilo do arquivo vizinho: português, explicando o porquê.

## Review Focus

1. Mesmo SHA promovido de novo: o anterior sai do ledger, não do `CURRENT_SHA` (Task 2, caso
   `mesmo SHA`).
2. Primeiro deploy, ledger sem `fim` ok de outro SHA: guarda só o atual e sai 0 (Task 2, caso
   `sem anterior`).
3. `docker image rm` recusado (imagem presa a contêiner parado): as outras saem, o script sai 1 e a
   promoção continua OK (Tasks 2 e 3).
4. As três tentativas de upload falham: `backup-db.sh` sai 1 e o dump do `/tmp` some (Task 4).
5. Consulta do S3 que falha no `verificar-backup.sh` alerta "consulta falhou", nunca "nenhum backup"
   (Task 5).

---

### Task 1: pnpm no portão do `lane.sh abrir`

**Files:**
- Modify: `.claude/scripts/lane.sh` (`verbo_abrir`, entre a checagem 1 e o `PORTAO OK`)
- Modify: `.claude/tests/lane-abrir.tests.sh`
- Modify: `CLAUDE.md` (§6, bloco do frontend)

**Interfaces:**
- Consumes: `PNPM=${LANE_PNPM:-pnpm}` (já existe), `recusar`, `nada_criado` do teste.
- Produces: recusa `PORTAO RECUSOU: pnpm ausente no PATH (<valor de $PNPM>): rode corepack enable pnpm e abra de novo`.

- [ ] **Step 1: teste que falha.** Em `lane-abrir.tests.sh`, um caso com `FAKE_PNPM=/nao/existe/pnpm`
  rodando `abrir 33 chore harness-sinal-de-contexto-cheio`: `assert_recusa 'pnpm ausente'` e
  `nada_criado "$main" 'pnpm ausente'`.
- [ ] **Step 2:** `bash .claude/tests/run-all.sh` → o caso novo FALHA (hoje sai `LANE PELA METADE`).
- [ ] **Step 3:** em `verbo_abrir`, `command -v "$PNPM" >/dev/null 2>&1 || recusar "..."` antes do
  `PORTAO OK` e de qualquer `git worktree add`. No `CLAUDE.md` §6, uma linha: node novo no nvm pede
  `corepack enable pnpm` (o pnpm vem do `packageManager` do `package.json`).
- [ ] **Step 4:** `bash .claude/tests/run-all.sh` → tudo verde. Sonda: comentar o `|| recusar` → o caso
  reprova; desfazer.
- [ ] **Step 5:** commit `chore(42): lane.sh confere o pnpm antes do portao`.

### Task 2: `podar-imagens.sh`

**Files:**
- Create: `deploy/bin/podar-imagens.sh` (executável)
- Create: `frontend/tests/podar-imagens.test.ts`
- Create: `frontend/tests/fixtures/podar-imagens/docker`

**Interfaces:**
- Produces: `podar-imagens.sh <sha_atual>`; ambiente `LOTUS_BASE` (default `/opt/lotus`), lê
  `$BASE/releases.jsonl`. Saída: `0` tudo removido ou nada a remover, `1` alguma remoção recusada
  (segue removendo as outras), `2` uso (SHA fora de 40 hex). Stdout: `mantidas: <atual> <anterior|nenhum>`
  e uma linha `removida: <repo>:<tag>` por imagem; recusa vai no stderr.
- Regra do anterior: o `sha` da última linha do ledger com `"evento":"fim"` e `"resultado":"ok"`
  cujo `sha` ≠ `<sha_atual>`. Sem jq (o host não garante): grep/sed na forma que o `deploy.sh` grava.

- [ ] **Step 1: fixture `docker`** no molde de `fixtures/conferir-golive/docker`: registra chamadas em
  `$FAKE_LOG`; `image ls` responde as tags de `$FAKE_IMAGENS` (uma `repo:tag` por linha) filtrando
  pelo repositório pedido; `image rm <ref>` sai 1 se `<ref>` está em `$FAKE_RM_RECUSA`; `image prune -f`
  sai 0.
- [ ] **Step 2: testes que falham** (`podar-imagens.test.ts`, por execução com `LOTUS_BASE`
  temporário):
  - `guarda o atual e o anterior`: 4 SHAs por repo, ledger com `fim ok` de A, B, C; atual = C →
    removidas exatamente as tags fora de {B, C} dos três repos; status 0.
  - `mesmo SHA`: ledger `fim ok` de B depois C depois C; atual = C → mantém B.
  - `sem anterior`: ledger vazio; atual = C → mantém só C; `mantidas: C nenhum`; status 0.
  - `fim falha não conta`: último `fim` de B é `falha` → o anterior é o `fim ok` antes dele.
  - `fora do Lotus fica`: `gotenberg/gotenberg:8` e `mysql:8.0` em `$FAKE_IMAGENS` nunca aparecem
    num `image rm`.
  - `sem -f`: nenhuma chamada registrada contém `-f` num `image rm`.
  - `recusa segue e sai 1`: `$FAKE_RM_RECUSA` com uma tag → as outras saem, status 1.
  - `uso`: SHA com 39 hex → status 2, nenhuma chamada de `image rm`.
- [ ] **Step 3:** `cd frontend && pnpm test podar-imagens` → FALHA (script não existe).
- [ ] **Step 4:** escrever o script. Cabeçalho no estilo de `verificar-backup.sh` (por que existe,
  `BASE="${LOTUS_BASE:-/opt/lotus}"`, saídas). Depois das remoções, `docker image prune -f` (só
  dangling).
- [ ] **Step 5:** `pnpm test podar-imagens` → PASS. Sondas: trocar o `exit 1` da recusa por `exit 0` →
  `recusa segue e sai 1` reprova; tirar o filtro `sha ≠ atual` → `mesmo SHA` reprova. Desfazer.
- [ ] **Step 6:** commit `feat(42): podar-imagens.sh guarda o SHA atual e o anterior`.

### Task 3: o `deploy.sh` chama a poda

**Files:**
- Modify: `deploy/bin/deploy.sh` (depois de `mv -f "$NOVO" "$BASE/CURRENT_SHA"`, antes do `DEPLOY OK`)
- Modify: `frontend/tests/deploy-sh.test.ts`

**Interfaces:**
- Consumes: `podar-imagens.sh <sha_atual>` da Task 2 (sai ≠ 0 quando alguma remoção falha).

- [ ] **Step 1: teste que falha** em `deploy-sh.test.ts`: `a poda roda depois do CURRENT_SHA e a falha
  dela vira aviso` — no texto sem comentários, a linha `"$BASE/bin/podar-imagens.sh" "$SHA" || ...`
  existe, o índice dela é maior que o do `mv -f "$NOVO" "$BASE/CURRENT_SHA"`, e o `||` leva a um
  `echo "aviso: ..." >&2` sem `exit`.
- [ ] **Step 2:** `pnpm test deploy-sh` → FALHA.
- [ ] **Step 3:** acrescentar a chamada com o aviso `aviso: a poda de imagens falhou; a promocao segue OK`.
  Atualizar a linha "Sequência:" do cabeçalho (`... -> CURRENT_SHA -> poda -> ledger fim`).
- [ ] **Step 4:** `pnpm test deploy-sh` → PASS. Sonda: tirar o `|| echo ...` → reprova; desfazer.
- [ ] **Step 5:** commit `feat(42): deploy.sh poda imagens depois da promocao`.

### Task 4: retry no `backup-db.sh`

**Files:**
- Modify: `deploy/bin/backup-db.sh`
- Modify: `frontend/tests/backup-db.test.ts`
- Create: `frontend/tests/fixtures/backup-db/docker`, `frontend/tests/fixtures/backup-db/aws`

**Interfaces:**
- Produces: `BASE="${LOTUS_BASE:-/opt/lotus}"`; espera entre tentativas `LOTUS_BACKUP_ESPERA_S`
  (default `30`, dobra a cada falha: 30, 60); stderr por falha `aviso: upload falhou (tentativa N de 3)`;
  depois da terceira `erro: upload falhou 3 vezes` e `exit 1`. Exporta as duas variáveis de IMDS do
  Global Constraints.

- [ ] **Step 1: fixtures.** `docker`: `compose ... ps -q mysql` imprime `mysql-falso`; `exec` imprime um
  dump de mais de 10 KiB terminado em `-- Dump completed`. `aws`: conta chamadas num arquivo de
  `$FAKE_DIR`; falha (stderr `Unable to locate credentials`, exit 255) enquanto a contagem ≤
  `$FAKE_FALHAS`; grava o ambiente recebido de `AWS_METADATA_SERVICE_*` em `$FAKE_LOG`.
- [ ] **Step 2: testes que falham** (novo `describe` por execução, `LOTUS_BASE` temporário com `.env`
  contendo `LOTUS_BACKUP_BUCKET=balde`, `LOTUS_BACKUP_ESPERA_S=0`):
  - `duas falhas e sai na terceira`: `FAKE_FALHAS=2` → status 0, 3 chamadas ao `aws`, 2 avisos.
  - `três falhas saem 1`: `FAKE_FALHAS=3` → status 1, `erro: upload falhou 3 vezes`, nenhum
    `/tmp/lotus-*.sql*` novo sobra.
  - `IMDS com folga`: o `aws` recebeu `AWS_METADATA_SERVICE_NUM_ATTEMPTS=3` e `..._TIMEOUT=5`.
  Ajustar as asserções textuais antigas que leem a linha única do `aws s3 cp`.
- [ ] **Step 3:** `pnpm test backup-db` → FALHA.
- [ ] **Step 4:** implementar o laço só em volta do upload (o dump roda uma vez; o `trap` já apaga).
- [ ] **Step 5:** `pnpm test backup-db` → PASS. Sonda: trocar o `exit 1` final por `exit 0` → `três
  falhas saem 1` reprova; desfazer.
- [ ] **Step 6:** commit `fix(42): backup-db.sh tenta o upload tres vezes`.

### Task 5: `verificar-backup.sh` distingue consulta falha de bucket vazio

**Files:**
- Modify: `deploy/bin/verificar-backup.sh`
- Modify: `frontend/tests/verificar-backup.test.ts`
- Modify: `frontend/tests/fixtures/verificar-backup/aws`

**Interfaces:**
- Produces: consulta do `list-objects-v2` que sai ≠ 0 → `gritar "Lotus: a consulta dos backups em
  s3://$BUCKET/backups/ falhou. Nao da para afirmar que ha copia; confira as credenciais da instancia."`
  Bucket vazio (`None`) mantém a mensagem atual do ADR-09. Exporta as variáveis de IMDS.

- [ ] **Step 1: testes que falham:** `consulta falha alerta consulta, não ausência` (fixture com o
  `list-objects-v2` saindo 255 → status 1, mensagem publicada contém `a consulta dos backups` e não
  contém `nenhum backup`); `bucket vazio segue nenhum backup`; `IMDS com folga`.
- [ ] **Step 2:** `pnpm test verificar-backup` → FALHA.
- [ ] **Step 3:** trocar `|| echo None` por captura do status da consulta.
- [ ] **Step 4:** `pnpm test verificar-backup` → PASS. Sonda: voltar o `|| echo None` → o primeiro
  caso reprova; desfazer.
- [ ] **Step 5:** commit `fix(42): verificar-backup.sh nao le consulta falha como bucket vazio`.

### Task 6: journald, apt e reboot automático no `user-data.sh`

**Files:**
- Modify: `deploy/aws/user-data.sh`
- Modify: `frontend/tests/user-data.test.ts`

**Interfaces:**
- Produces, no host: `/etc/systemd/journald.conf.d/lotus.conf` (`[Journal]` / `SystemMaxUse=200M`);
  `/etc/apt/apt.conf.d/52lotus-limpeza` (`APT::Periodic::AutocleanInterval "7";`);
  `/etc/apt/apt.conf.d/53lotus-reboot` (`Unattended-Upgrade::Automatic-Reboot "true";` e
  `Unattended-Upgrade::Automatic-Reboot-Time "08:30";`). Arquivos separados porque a Task 10 liga o
  reboot só depois da janela. Cada um é escrito só quando o conteúdo muda; o journald reinicia só
  quando o dele muda.

- [ ] **Step 1: testes que falham** em `user-data.test.ts`: os três arquivos com o conteúdo exato;
  `53lotus-reboot` sobrescreve o `50unattended-upgrades` pela ordem do nome; nenhuma origem nova em
  `Allowed-Origins` (o repo do Docker continua fora).
- [ ] **Step 2:** `pnpm test user-data` → FALHA.
- [ ] **Step 3:** implementar, com comentário do porquê do 08:30 UTC (depois do backup 06:10, da
  conferência 06:40, das podas de 03:10/03:40 Santiago e do `apt-daily-upgrade`).
- [ ] **Step 4:** `pnpm test user-data` → PASS.
- [ ] **Step 5:** commit `feat(42): user-data com teto do journal, limpeza do apt e reboot automatico`.

### Task 7: política e lifecycle do S3 versionados

**Files:**
- Create: `deploy/aws/s3-politica.json`, `deploy/aws/s3-lifecycle.json`
- Create: `frontend/tests/s3-bucket.test.ts`

**Interfaces:**
- Produces: política com quatro `Deny`, `Sid` exatos: `SoHttps` (`s3:*`, bucket e `/*`,
  `Bool aws:SecureTransport false`), `NinguemApagaDeVez` (`s3:DeleteObjectVersion`, `/*`),
  `ApagarSoAppEInfra` (`s3:DeleteObject`, `/*`, `ArnNotEquals aws:PrincipalArn [lotus-ec2, lotus-infra]`),
  `ProtecaoSoInfra` (as oito ações do spec §8.1 regra 4, bucket, `ArnNotEquals aws:PrincipalArn
  lotus-infra`). Lifecycle com `expira-backups` (idêntica à medida em 2026-10-25), `fotos`
  (`user-photos/`, `NoncurrentVersionExpiration` 1, `ExpiredObjectDeleteMarker` true) e `documentos`
  (filtro vazio, `NoncurrentVersionExpiration` 7, `ExpiredObjectDeleteMarker` true,
  `AbortIncompleteMultipartUpload` 7). A regra geral sobreposta resolve `user-photos/` pelo prazo
  menor porque o lifecycle age no primeiro prazo vencido. JSON não tem comentário: o link da página
  da AWS sobre filtros sobrepostos vai para a §3 do README (Task 8).

- [ ] **Step 1: testes que falham** em `s3-bucket.test.ts`: o JSON parseia; exatamente quatro
  statements, todos `Deny`, com os `Sid` acima; a lista de exceção do `ApagarSoAppEInfra` é
  exatamente os dois ARNs; `ProtecaoSoInfra` contém as oito ações; nenhum statement `Allow`;
  lifecycle com os três IDs e os valores exatos. Sonda embutida: um caso que remove o `lotus-ec2` de
  uma cópia em memória e confere que a função de validação reprova.
- [ ] **Step 2:** `pnpm test s3-bucket` → FALHA.
- [ ] **Step 3:** escrever os dois JSON.
- [ ] **Step 4:** `pnpm test s3-bucket` → PASS. `python3 -m json.tool` nos dois arquivos sai 0.
- [ ] **Step 5:** commit `feat(42): politica e lifecycle do bucket versionados`.

### Task 8: runbook, Q-1 e ADRs

**Files:**
- Modify: `deploy/aws/README.md` (§3, §7, `:533`, `:1433`, `:1465`, seção nova `## 16. Manutenção do host`)
- Modify: `docs/adrs.md` (ADR-11, ADR-14)
- Create: `frontend/tests/runbook-higiene.test.ts`

**Interfaces:**
- Consumes: `podar-imagens.sh` (Task 2), os dois JSON (Task 7), os três arquivos do host (Task 6).

- [ ] **Step 1: testes que falham** em `runbook-higiene.test.ts`: nenhum `docker rm -f ` sem `v` no
  README; a linha `scp` e a `mv` da §7 citam `podar-imagens.sh`; a §3 aplica
  `file://deploy/aws/s3-lifecycle.json` e `file://deploy/aws/s3-politica.json`; o README tem a receita
  `copy-object` com `?versionId=`; a §16 cita os três arquivos do host. Rodar também
  `conferir-golive.test.ts`, que prende a mesma linha `scp`.
- [ ] **Step 2:** `pnpm test runbook-higiene` → FALHA.
- [ ] **Step 3:** editar o README:
  - §3: os dois `put-bucket-*` com os JSON; quem pode apagar e mexer na proteção; saída de
    emergência (raiz no console com MFA → bucket → Permissions → Bucket policy → Delete); a nota da
    sobreposição do lifecycle com o link da AWS; subseção "Desfazer um apagão" (`list-object-versions`,
    `copy-object --copy-source "<bucket>/<chave>?versionId=<id>"`, conferir, por que não se remove a
    marca);
  - §7: `podar-imagens.sh` no `scp` e no `mv`;
  - Q-1: `docker rm -fv` nas três linhas;
  - §16: limpeza manual com `podar-imagens.sh`; journald/apt; reboot automático (08:30 UTC, o que
    o alarme faz); janela manual repetível (listar pendente, §14.7 desliga, `apt-get upgrade`,
    reboot se `/var/run/reboot-required`, conferir, §14.7 religa).
  - ADR-11: emenda datada de 2026-10-25 (ninguém apaga de vez, 7 dias, fotos 1 dia, quem apaga e
    quem mexe na proteção). ADR-14: emenda (reboot automático na janela, poda no deploy).
- [ ] **Step 4:** `pnpm test` inteiro → PASS.
- [ ] **Step 5:** commit `docs(42): runbook da higiene, Q-1 e emendas dos ADR-11 e ADR-14`.

### Task 9: produção — host (João roda, Claude confere)

**Files:**
- Create: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md`
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md` (itens 1–4; o
  João preenche Resultado e Data)

**Interfaces:**
- Consumes: Tasks 2, 6 e 8 mescladas na lane (o script e os trechos vêm da árvore da lane).

- [ ] **Step 1: medição antes** (Claude, SSH só leitura): `df -h /`, `docker image ls` dos três repos,
  `docker volume ls -qf dangling=true`, `uname -r`, `ls /var/run/reboot-required`,
  `apt list --upgradable | wc -l`, `timedatectl`, estado do `lotus-prod-disco`. Registrar.
- [ ] **Step 2: limpeza única** (João): `scp` do `podar-imagens.sh` para `/tmp`;
  `sudo bash /tmp/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"`; `docker ps -a --filter volume=901f0f78…`
  vazio e então `sudo docker volume rm 901f0f78…`; `sudo rm /opt/lotus/prova-certificado.php /tmp/podar-imagens.sh`.
  Esperado: dois SHAs por repo, zero volume dangling, disco < 80%, alarme volta a OK.
- [ ] **Step 3: journald e apt** (João): os dois arquivos da Task 6, `systemctl restart systemd-journald`,
  `journalctl --vacuum-size=200M`, `apt-get clean`. Esperado: `journalctl --disk-usage` ≤ 200M.
- [ ] **Step 4: janela manual** (João): §14.7 desliga ações; `apt-get update && apt-get -y upgrade`;
  `apt list --upgradable` (o que ficar retido vai para o registro e para o João decidir); `sudo reboot`.
  Claude mede o tempo fora pela sonda e confere: `uname -r` = `7.0.0-1014-aws` ou mais novo, seis
  contêineres `Up`, `curl /up` 200, log do MySQL sem `crash recovery`; §14.7 religa e `describe-alarms`
  mostra `ActionsEnabled` true. Mais de 3 minutos fora → registrar e voltar ao João antes do Step 5.
- [ ] **Step 5: reboot automático** (João): o `53lotus-reboot`; `apt-config dump | grep Automatic-Reboot`
  mostra `true` e `08:30`; `timedatectl` em UTC (outro fuso → ajustar o horário e a Task 6).
- [ ] **Step 6:** commit `docs(42): execucao do host em producao`.

### Task 10: produção — S3 (João roda, Claude confere)

**Files:**
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md`
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md` (item 5)

**Interfaces:**
- Consumes: os JSON da Task 7 e o runbook da Task 8.

- [ ] **Step 1** (João): `put-bucket-lifecycle-configuration --lifecycle-configuration file://deploy/aws/s3-lifecycle.json --profile lotus`.
- [ ] **Step 2** (João): login na raiz da conta `760144413534` no console, com MFA. Registrar data.
- [ ] **Step 3** (João): `put-bucket-policy --policy file://deploy/aws/s3-politica.json --profile lotus`.
- [ ] **Step 4: negações** (Claude, só leitura): `aws iam simulate-principal-policy --resource-policy
  file://deploy/aws/s3-politica.json` para `user/gabriel`, `user/JoaoVBA`,
  `role/OrganizationAccountAccessRole`, `role/administrador`, `role/lotus-ec2`, `user/lotus-infra` ×
  `s3:DeleteObject`, `s3:DeleteObjectVersion`, `s3:PutBucketPolicy`, com `aws:SecureTransport=true`
  e `aws:PrincipalArn` no contexto. Esperado: `DeleteObject` permitido só para `lotus-ec2` e
  `lotus-infra`; `DeleteObjectVersion` negado para todos; `PutBucketPolicy` só para `lotus-infra`.
  E uma chamada real (João): `delete-object --version-id` num objeto de `probes/` → `AccessDenied`.
- [ ] **Step 5: órfãos.** Claude recalcula: chaves atuais fora de `backups/` e `probes/` contra
  `SELECT path FROM files UNION SELECT photo_path FROM users WHERE photo_path IS NOT NULL` (todas as
  linhas, arquivadas inclusive). O João apaga cada uma com `aws s3 rm` (marca, desfazível por 7 dias).
  Registrar a lista.
- [ ] **Step 6: desfazer** (João, pela receita do README): `probes/desfazer-teste.txt` criado, apagado,
  restaurado por `copy-object`, conteúdo conferido, apagado de novo.
- [ ] **Step 7:** `get-bucket-policy` e `get-bucket-lifecycle-configuration` batem com os JSON.
- [ ] **Step 8:** commit `docs(42): execucao do S3 em producao`.

Depois do merge, a lane de aceitação cobre os itens 6 a 8 da `## Verificação externa` (reinstalar
os scripts, promoção real com a poda, backup do dia seguinte). Não são tasks deste plano.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 4, 5, 6, 7 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma: 3 (consome a 2), 8 (consome 2, 6 e 7), 9 (consome 2,
6 e 8) e 10 (consome 7 e 8, e divide `execucao-producao.md` com a 9).

## Handoff de execução

- `executor: claude` — o bloco mexe em política de segurança do bucket de peso legal e em produção, com
  julgamento fora do plano nas Tasks 9 e 10.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-mecanico` (Tasks 1, 3, 6), `implementador-integracao`
  (Tasks 2, 4, 5, 7, 8), `revisor-task` em cada uma, `revisor-branch` no fim. As Tasks 9 e 10 rodam
  na sessão principal com o João, sem subagente.
- `paths_autorizados`: não se aplica (`executor: claude`).
