# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-87 — o botão promove imagens, mas o host guarda compose, `tls.conf`, `.env` e os próprios scripts de `deploy/bin/` por cópia, e nada avisa quando eles ficam para trás

**Encerrada em 2026-09-26 (item 31), pela direção (a), detectar.** O botão confere o
host antes de promover (`.github/scripts/conferir-alinhamento.sh`, runtime e chaves
contra o SHA alvo, `bin/*.sh` contra a `main`), sem escape. Recusou ao vivo com
`bin/deploy.sh diferente`
([run 36264643022](https://github.com/Gatika-CL/lotus/actions/runs/36264643022)) e
promoveu depois da reinstalação
([run 36265032582](https://github.com/Gatika-CL/lotus/actions/runs/36265032582)). O SSH
segue sem conferência, declarado no runbook §8.

**Bloco:** cicd-promocao-deploy-e-rollback (item 12); hospedada por `cicd-host-alinhado-ao-sha`
(item 31) desde 2026-09-26, que escolheu a direção (a) · **Quem decide:** João · **Gatilho:** o
próximo commit que mudar `docker-compose.prod.yml`, `docker-compose.prod-tls.yml`,
`deploy/nginx/tls.conf`, `deploy/aws/env.prod.example` ou `deploy/bin/*.sh`, ou o João escolher o
mecanismo abaixo. Revisar em **2026-10-31**.

Medido em 2026-09-26, antes do primeiro disparo do botão:
- o host rodava o compose do `db8f8736`, sem o healthcheck do clamav que olha a idade da base
  (`f9b56707`, Q-9);
- o overlay e o `tls.conf` eram os do `53ca6ce7`, sem a renovação (Q-6) e sem a isenção do `/up`
  (Q-1);
- o `.env` não tinha 10 das 40 chaves do molde (Q-2). Sem `APP_LOCALE`, a produção respondia em
  `en`.

As três correções vieram do review do item 10, em 2026-09-20, e nenhuma chegou ao host em seis
dias. O runbook §7 só instala esses arquivos quando o host nasce, e o `deploy.sh` — que o botão
invoca — promove **imagens** por SHA. Nada compara o que o host guarda com o que o SHA promovido
espera, e um rollback herda os arquivos do host, não os do SHA alvo. Nesta execução o João
sincronizou tudo à mão (audit do item 12, "Antes do botão"), mas a causa segue aberta: o próximo
desvio passa do mesmo jeito.

Direções, para o João escolher:

- (a) **Detectar:** a imagem `app` carrega os hashes dos arquivos de compose e do `tls.conf`, e os
  nomes das chaves do molde. O gate do `deploy.sh` compara com o host, como já faz com as
  migrations. O host continua sendo a fonte.
- (b) **Entregar:** o botão manda os arquivos de compose e o `tls.conf` pelo próprio SSM antes do
  `deploy.sh`, e o SHA vira a fonte. O `.env` não tem como ir assim, porque tem segredo; dele só
  vale conferir os nomes.
- (c) **Procedimento:** a §8 do runbook ganha o passo "antes de promover, confira a §7", e o risco
  fica aceito por escrito.

**Emenda de 2026-09-26 (review do item 12, Q-4).** A ficha nasceu sem `deploy/bin/*.sh`, que é o
caso mais grave. O botão não leva o `deploy.sh`: ele executa a cópia que está no host. O gate, o
ledger e o dump deste bloco chegaram lá porque o João reinstalou o script à mão ("Antes do botão"
no audit). Uma correção desses scripts pode entrar na `main` e nunca rodar em produção.

O gatilho já disparou. As correções do review mudaram o `deploy.sh`: agora ele grava
`schema_a_frente` e passa o rótulo do dump. Também mudaram o `backup-db.sh`, cuja chave agora vai
até o segundo e aceita rótulo. **Depois do merge, os dois precisam ser reinstalados pela §7 do
runbook antes do próximo disparo do botão.** Enquanto isso não acontecer, o host continua com a
versão anterior. Nada quebra, mas o escape não deixa rastro, e o dump do deploy pode colidir com o
do cron.

As direções mudam assim:

- Em (a), o `deploy.sh` não consegue conferir a si mesmo. Uma cópia velha não tem a conferência
  nova. Para os scripts, quem detecta é o workflow: ele pede o `sha256sum` de `/opt/lotus/bin/*.sh`
  por SSM e compara com o SHA promovido.
- Em (b), os scripts entram no pacote que o SSM entrega, junto com o compose e o `tls.conf`.

**Disparo de 2026-09-26, pago à mão.** O review do item 12 mudou `deploy.sh` e `backup-db.sh`
(`19aeb734`). Depois do merge e do espelho, o João reinstalou os dois pelo runbook §7, às 08:40Z.
Host, `origin/main` e o corporativo `df30a6bd` ficaram com os mesmos hashes, e o botão promoveu o
`df30a6bd` com o script novo (audit do item 12, "Depois do fechamento"). **A causa segue aberta:**
foi de novo sincronização manual, e nada teria avisado se ela não acontecesse.

## P-88 — o `deploy.sh` aceita promover imagem de qualquer dono do GHCR, inclusive do repositório pessoal

**Encerrada em 2026-09-26 (item 31).** `DONO=gatika-cl` literal no `deploy.sh`, com o
`docker login -u` pelo mesmo dono; a catraca de `deploy-sh.test.ts` foi vista reprovar
com `${LOTUS_RELEASE_OWNER:-gatika-cl}` devolvido e com `DONO=andred21`; o host roda o
script novo desde o
[run 36265032582](https://github.com/Gatika-CL/lotus/actions/runs/36265032582) (`grep -c
LOTUS_RELEASE_OWNER` = 0).

**Bloco:** `cicd-host-alinhado-ao-sha` (item 31), desde 2026-09-26 · **Quem decide:** João ·
**Gatilho:** o próximo commit que mudar
`deploy/bin/deploy.sh` (o mesmo da **P-87**, para que o host receba as duas correções numa
reinstalação só), ou o João promover a correção. Revisar em **2026-10-31**.

**A regra:** a produção roda **sempre** imagem de `ghcr.io/gatika-cl/`, nunca de
`ghcr.io/andred21/`. Decisão do João em 2026-09-26, no fechamento do item 12.

**Hoje ela vale por padrão, não por mecanismo.** O `deploy.sh` monta o nome das três imagens com
`DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"`: o dono é uma variável de ambiente com `gatika-cl` como
padrão. Um `LOTUS_RELEASE_OWNER=andred21 /opt/lotus/bin/deploy.sh <sha do pessoal>` por SSH promove
o trio do repositório pessoal. As imagens de `andred21` são **públicas** no GHCR, então o pull nem
precisa de credencial. Nenhuma catraca de `frontend/tests/deploy-sh.test.ts` reprova isso.

**Medido em 2026-09-26, só por leitura, e a produção estava certa:**
- os quatro containers nossos (`app`, `scheduler`, `nginx`, `clamav`) rodam
  `ghcr.io/gatika-cl/lotus-*:1142911b…`, e as sete imagens `ghcr.io` em cache no host são todas de
  `gatika-cl`;
- `1142911b`, `a5fc92bb` e `683e6221` existem em `Gatika-CL/lotus` como `release: espelho de …`,
  com `Source-Commit`, e o `1142911b` não existe em `Andred21/lotus` (422);
- o ledger tem seis deploys, todos para `1142911b` ou `a5fc92bb`;
- `LOTUS_RELEASE_OWNER` não aparece em `/opt/lotus`, em `/etc/environment` nem no perfil do root,
  e o `deploy.yml` não a passa no comando do SSM.

**Fecha quando:**
- o `deploy.sh` tiver `gatika-cl` fixo, sem variável de ambiente;
- uma catraca em `deploy-sh.test.ts` reprovar qualquer outro dono, e for vista reprovar pela sonda
  que devolve o `${LOTUS_RELEASE_OWNER:-…}`;
- o host tiver o `deploy.sh` novo, pela reinstalação do runbook §7.

*(P-87 e P-88, encerradas pelo item 31 em 2026-09-26. A **`P-59`**, a **`P-75`** e a **`P-79`**
saíram no fechamento do item 12.)*

> **O número `P-73` está queimado, e o `P-74` foi disputado.** O `P-73` pertenceu à advisory do
> `browserslist`. Os fechamentos do item 25 e do item 26 abriram, cada um, uma ficha que o reusou
> por engano; as duas foram renumeradas no mesmo dia — a do item 25 para **`P-74`** e as do item 26
> para **`P-75`** e **`P-76`**, nesta ordem de integração. Número de pendência não se reusa nem se
> renumera para trás: é a mesma regra que o `state.md` escreveu para o rótulo de bloco na colisão
> de 2026-09-02.

> **Os números `P-77`, `P-78` e `P-79` foram disputados em 2026-09-20.** Dois blocos fecharam no
> mesmo dia, em árvores diferentes, e cada um alocou a mesma faixa: o
> `infra-producao-provisionamento-aws` (item 10 v2, `lane-b`) e o `harness-hooks-de-guarda` (item 28,
> `lane-a`). O item 10 integrou primeiro, pela **PR #105**, então os três IDs são dele. As três
> fichas do item 28 foram renumeradas **na integração**, não no fechamento: `P-77` → **`P-82`** (a
> spec do harness), `P-78` → **`P-83`** (as sete decisões de política) e `P-79` → **`P-84`** (o
> harness fora de doc versionado). É o mesmo precedente do `P-73`: renumera quem chega depois, nunca
> quem já está publicado. **A causa é estrutural, não descuido** — a numeração é um contador global
> sem reserva, e duas lanes que fecham no mesmo dia sem integrar entre si colidem por construção. A
> **`P-55`** é o lugar onde esse tipo de invariante de `state.md` está sendo discutido.

## Rastro anterior, já removido

**A P-59, a P-75 e a P-79 saíram no fechamento do `cicd-promocao-deploy-e-rollback` (item 12,
2026-09-26)**, o primeiro posterior ao do `backend-config-e-conteudo-de-documento` (item 29), que as
encerrou em 2026-09-25: a P-59 por mecanismo, com o `'UTC'` literal como decisão escrita e o
`FusoDoNegocio` dono da data de calendário (catracas `FusoDeArmazenamentoTest` e
`DataDeCalendarioTest`); a P-75 por veredito escrito, pois a config nunca divergiu do ambiente; e a
P-79 por mecanismo, com a chave própria do QR, obrigatória e `https` em produção, provada no QR
decodificado do PDF. O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-82 saiu no fechamento do `backend-config-e-conteudo-de-documento` (item 29, 2026-09-25)**, o
primeiro posterior ao do `harness-hooks-de-guarda` (item 28), que a abriu e a encerrou em 2026-09-20
pelos dois lados do gatilho: a spec dos hooks corrigida (§5.2, §5.3, §9 e §11) e o `run-all.sh` com o
`trap limpar_descartes EXIT` que a §9 prometia, provado nos dois sentidos (0 sobras com o trap, 2 com
a linha neutralizada). A spec arquivada está em
[`../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md`](../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md);
o rastro durável, nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-58 saiu nos dois fechamentos de 2026-09-20** — o do
`infra-producao-provisionamento-aws` (item 10 v2), que integrou primeiro, e o do
`harness-hooks-de-guarda` (item 28) —, os primeiros posteriores ao do
`frontend-arrumacao-de-testes` (item 27), que a encerrou em 2026-09-04 por mecanismo: o
`compose-dev.test.ts` passou a afastar os `.env*` das **duas** raízes que o `vite.config.ts` lê — a
do repositório (`loadEnv(mode, RAIZ, 'LOTUS_')`) e a de `frontend/` (`loadEnv(mode, __dirname,
'VITE_')`) —, e o gate deixou de depender do disco de quem roda, provado com o arquivo posto e
retirado duas vezes (3 falhas na versão pré-Task-7, 12/12 na nova, com o mesmo `frontend/.env` no
disco). O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**As três do `backend-envelope-de-erro-e-recusa-de-dominio` (item 26) saíram no fechamento do
`dominio-decisoes-de-rbac-e-semantica` (2026-09-04)**, o primeiro da `lane-a` posterior ao bloco que
as encerrou em 2026-09-03 — a **P-71** e a **P-72** (as recusas literais e o `detail` do 419 saindo
para `lang/` nos três locales, com o resíduo nomeado na **P-76**) e a metade de **comportamento** da
**P-60** (a validação pública do certificado com snapshot incompleto, fechada por decisão escrita); a
metade de **dado de dev** dela segue viva na **P-44**. O rastro durável está nos commits e nas linhas
de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-69, a P-68, a P-70, a P-30 e a P-42 saíram no fechamento do `frontend-arrumacao-de-testes`
(2026-09-04)**, o primeiro posterior ao do `frontend-dividas-de-mecanismo` (item 25), que as
encerrou em 2026-09-03 — e nenhuma saiu na fé: a **P-69** fechou no `setupFiles` com `cleanup()`
global mais as catracas `CLEANUP_A_MAO` e a guarda estática do `desmonte-global.test.ts`; a
**P-70**, na allowlist `DETALHE_LOCALIZADO` de 403/404/429 do `screenDetail`; a **P-30**, no
`warning` alinhado ao amarelo do `AppTag`, com régua de contraste própria (a borda que ela abriu
vive na **P-74**); a **P-68** e a **P-42**, por decisão escrita — a razão da assimetria de
`max-lines` ao lado da régua e a emenda datada ao D1 da spec arquivada da célula de identidade, as
duas sem tocar código. O rastro durável está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-73 e a P-67 saíram no fechamento do `frontend-dividas-de-mecanismo` (2026-09-03)**, o primeiro
posterior aos dos blocos que as encerraram. A **P-73** fechou em 2026-09-02 na PR #93, por bump só
de lockfile (`browserslist` 4.28.4 → 4.28.8), com `pnpm audit` de volta a **0** e o `package.json`
intacto. A **P-67** fechou em 2026-09-01 no `frontend-decisoes-de-ui-pendentes`, por mecanismo — a
escala de raio saiu da rule para catraca. **O ID `P-73` está queimado:** a ficha que este bloco abriu
nasceu numerada `P-73` por engano e foi renumerada para `P-74` no próprio fechamento, pelo mesmo
precedente de sempre — ID publicado não se reusa. O rastro durável das duas está nos commits e nas
linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-61 e a P-63 saíram no fechamento do `frontend-decisoes-de-ui-pendentes` (2026-09-01)**, o
primeiro posterior aos dos dois blocos que as encerraram em 2026-08-30. A **P-61** fechou no
`hardening-i18n-e-erros-api` por mecanismo — os sete `title` do `ProblemDetails::fromException` e o
`detail` mascarado do 500 saíram do código para `lang/<locale>/problem.php` nos três locales, com o
`LocaleParityTest` recusando chave que exista em um só, e a borda que ela não cobria (o 419) vive
nomeada na [P-72](./abertas.md). A **P-63** fechou no `frontend-triagem-dos-audits-do-item-18`,
também por mecanismo — a legenda do `AppLineChart` ganhou conteúdo próprio
(`shared/ui/AppLineChart/legend.tsx`, `<ul role="list">`) e o mini-reset deixou de tirar semântica
de lista renderizada por biblioteca, medido na run 5 (`audits/2026-08-29-item19-run5.md`): zero `ul`
sem `role` no Dashboard. O rastro durável das duas está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).


**Saíram no fechamento do `hardening-acesso-ownership-e-integridade` (2026-08-23), o primeiro
posterior ao do BD-15, que é a condição que as seis linhas pediam:** a **P-18** (página de
fechamento do Notion com `Sprint` divergente), a **P-20** (`openspout/openspout` sem ADR hospedeiro,
que virou o ADR-20), a **P-21** (`simple-qrcode` sem nota no ADR-12, que virou a nota de
2026-08-22), a **P-23** (a coluna `Contexto` do `progress.md`, declarada e não restaurada), a
**P-39** (o plano do BD-6 sobre o RBAC de `GET /api/courses`, que virou a lição 18) e a **P-43**
(`der-fisico.md` chamando `certificates` de "planejada", fechada pelas duas lanes em paralelo, e
cuja lacuna remanescente virou a [P-52](./abertas.md#p-52)).

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu no fechamento do
`feedbacks-resolver-escopo` e no do `BD-15-docs-guardrails-e-sincronizacao` (2026-08-22) — os
primeiros **posteriores** ao do BD-12, que é o que a linha do índice pedia. A **P-29** (corrida de
unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em duas profundidades)
foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram no fechamento do
`bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o que a linha
do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a **P-37**
(`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
