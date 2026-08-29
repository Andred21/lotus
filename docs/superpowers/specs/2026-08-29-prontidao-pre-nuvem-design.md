# Spec — Prontidão pré-nuvem: CI legível, espelho atualizado e release provado

> Bloco `prontidao-pre-nuvem` · item 20 do `backlog.md` · lane-b · 2026-08-29
> Context packet: nenhum (`Contexto: não` — as fontes são o repositório e a API do GitHub, lidas
> nesta sessão e registradas na §3).
> Branch: `chore/prontidao-pre-nuvem`, nascida de `infra/producao-provisionamento-aws@50f3a1f3` e
> mesclada com `main@37e0e2d4` (merge `5b121aaa`) antes do primeiro artefato.

## 1. O problema

O item 11 entregou o CI de governança e o artefato imutável por SHA; o item 12 (promoção e
rollback) está **estacionado** porque não há host; o item 10 (conta AWS) está pronto para planejar.
Antes de gastar uma decisão em nuvem, o João pediu três coisas, nesta ordem: entender o que o CI
faz e por que aparece vermelho a cada integração; entender e confiar no caminho
`Andred21/lotus → Gatika-CL/lotus`; e **comprovar que o código que chega ao corporativo funciona**
— para só então desenhar o CD sobre um alvo real.

O que a leitura desta sessão mediu (§3) diz que o CI não tem falha — tem **um sinal ilegível**:
`audit-dev` reprova em todo run por advisories transitivas de devDeps, e o `continue-on-error`
faz o job aparecer vermelho sem decidir nada. Ao mesmo tempo o corporativo está **onze PRs atrás**
da origem, e **ninguém nunca puxou** o par `ghcr.io/gatika-cl/lotus-{app,web}:<sha>` para
provar que ele sobe: as provas do runtime (item 10, 2026-08-22) usaram imagem construída localmente.
O CD do item 12 promoveria um artefato que só existe como manifesto no registry.

## 2. Objetivo

Deixar o código e o caminho de release o mais preparados possível **sem tocar em nuvem**:

1. vermelho no CI volta a significar "bloqueia"; advisory de dependência de desenvolvimento
   **passa a reprovar e a segurar a imagem** (decisão do João nesta sessão, revertendo o
   "reporta, não reprova" do item 11), e os sete advisories atuais são corrigidos;
2. `Gatika-CL/main` volta a espelhar o tip de `Andred21/main`;
3. o par publicado no GHCR do corporativo é **puxado e executado nesta máquina** pela mesma
   sequência que o host fará (`login → pull → up → /up`), com script repetível a cada espelho;
4. quem chega ao repositório lê no `CONTRIBUINDO.md` como interpretar o CI e como provar um release.

**Não-objetivos**, cada um com dono declarado:

| Fora | Dono |
|---|---|
| EC2, RDS, S3, SES, TLS, DNS, CloudWatch | item 10, estacionado atrás deste |
| Workflow de deploy/rollback, Environment, secrets no corporativo | item 12, estacionado |
| Visibilidade de `Andred21/lotus` e branch protection | decisão adiada pelo João (§3.5); registrada em `P-62`, não executada |
| Trocar `docker-compose.prod.yml`, `Dockerfile.prod`, overlay de sonda | entregues no item 10 (runtime); este bloco só os consome |
| Fixar transitivas por `pnpm.overrides` | não pedido; o bump dentro dos ranges basta hoje |
| Job agendado de advisories | não pedido; `audit-dev` segue no `pull_request`/`push` |

## 3. Restrições medidas (2026-08-29)

### 3.1 O CI não falha; o `audit-dev` pinta

- 25 runs mais recentes do workflow `CI` em `Andred21/lotus`: todos `success`, exceto runs
  `cancelled` em `pull_request` (push novo na mesma PR cancela o anterior — `concurrency`, e é
  desenho). As quatro únicas falhas do histórico são sondas deliberadas do item 11
  (`32889018234`, `32802067520`) e duas iterações da PR do próprio item 11.
- Em **todo** run, o job `audit-dev` termina `failure` no step "Advisories em toda a arvore JS"
  (`composer audit --locked` passa). `continue-on-error: true` no job mantém o run verde; o job fica
  com X vermelho. É isso que o João viu como "falha ao subir integrações".
- `pnpm audit` local: **7 advisories**, todos transitivos de devDeps, todos com correção dentro do
  range já declarado:

  | Pacote | Instalado | Corrigido em | Chega por |
  |---|---|---|---|
  | `brace-expansion` (3 advisories, `high`) | 5.0.6 | ≥ 5.0.9 | `minimatch@10.2.5` → 10.2.6 pede `^5.0.8` |
  | `nanoid` (2, `high`) | 3.3.15 | ≥ 3.3.18 | `postcss` |
  | `postcss` (2, `high`/`moderate`) | 8.5.15 | ≥ 8.5.23 (registry: 8.5.26) | `vite`, `@tailwindcss/vite`, `vitest` |

  `pnpm audit --prod`: "No known vulnerabilities found". Nenhum range em `package.json` precisa
  mudar — o bump é só no `pnpm-lock.yaml`.
- `image` tem `needs: [backend, frontend, types-drift, audit-prod, procedencia]`. `audit-dev` não
  entra hoje, por decisão escrita no item 11.

### 3.2 O espelho está onze PRs atrás, e funciona

- `upstream/main@3d158773` = espelho de `24c2105d` (2026-08-25). `origin/main@37e0e2d4` hoje;
  entre os dois, PRs #75–#85.
- `scripts/espelhar-corporativo.sh --simular` em `37e0e2d4`: "CI verde", árvore filtrada com
  **1270** arquivos (origem 1537), raiz sem `.claude/`, `.agents/`, `docs/`, `CONTRIBUINDO.md`.
- Corporativo: run `32888129954` para `3d158773` com `procedencia` e `image` `success`.
  `ESPELHO_FONTE=Andred21/lotus` definida em 2026-08-25.
- A lista de exclusões que o script aplica sai do commit espelhado (`git show $FONTE:.espelho-exclusoes`),
  e o script recusa commit cujo run `CI` não esteja `completed success`. Com a §4.2, essa recusa
  passa a cobrir também advisory de dev.

### 3.3 O par corporativo nunca foi puxado

- `docker manifest inspect ghcr.io/gatika-cl/lotus-app:3d158773e92ee7cd25abe0b03c8464f05d629eb9`
  sem login → `denied`. O pacote
  existe (`image` verde + step "O par existe no GHCR"), a leitura é que exige credencial.
- O token do `gh` desta máquina tem `admin:public_key, gist, read:org, repo` — **sem
  `read:packages`**. Nenhuma credencial de leitura do GHCR corporativo existe hoje, nem aqui nem
  em host algum: é a mesma lacuna que o item 12 declarou como pré-requisito do host.
- `docker-compose.prod.yml` aceita `LOTUS_IMAGE`, `LOTUS_WEB_IMAGE`, `LOTUS_ENV_FILE`,
  `LOTUS_HTTP_PORT`; `docker-compose.prod-probe.yml` + `docker/probe.env` sobem MySQL, MinIO e
  Mailpit de sonda. Tudo isso **atravessa o espelho** (não está em `.espelho-exclusoes`).
- Portas da sonda: `8081` (nginx), `9002` (MinIO), `8026` (Mailpit). Esta worktree usa offset +1
  (`.env`: `8081/3308/8026/9002/9003/5174`) — **a stack de dev desta árvore e a sonda não sobem
  juntas**; o Compose falha alto com "port is already allocated" (ADR-13), que é a detecção.

### 3.4 Esta branch estava 103 commits atrás

`infra/producao-provisionamento-aws@50f3a1f3` tinha 4 commits próprios (todos docs de estado e os
dois packets) sobre `main@83945ff3`. A `main` andou 103 commits. O merge `5b121aaa` já trouxe a
`main` para cá; único conflito foi `docs/superpowers/state.md`, resolvido mantendo o bloco da
lane-b desta árvore e tudo o mais da `main`.

### 3.5 O repositório pessoal está público — e a decisão registrada diz o contrário

`GET /repos/Andred21/lotus` → `"visibility": "public"`, sem branch protection (`404 Branch not
protected`). `ghcr.io/andred21/lotus-app:37e0e2d4…` responde manifesto **sem autenticação**. A
`P-62` registra que o João **recusou** abrir o código ("troca confidencialidade por régua"); o 403
de protection foi medido só em `Gatika-CL/lotus`. Em repositório público, protection é grátis. O
João decidiu nesta sessão **adiar**: o bloco não muda visibilidade nem protection; a divergência
entra datada na `P-62`.

## 4. Desenho

### 4.1 Estado e fila

- `backlog.md` ganha o **item 20** `prontidao-pre-nuvem` pelo fim da fila (o 18 fechou na lane-c, o
  19 existe). Acrescentar item fora do main tree segue o precedente **P-55**, com o João presente.
- A lane-b troca `active_work_item` para o 20 e passa a `planning`; os itens **10 e 12 ficam
  estacionados** em `parked_work_items` (lista, no lugar do campo singular). O 10 retoma depois
  deste bloco, sobre `main` já com o par provado; o 12 quando o 10 provisionar o host.
- Branch `chore/prontidao-pre-nuvem` nesta worktree (`../lotus-infra`). O bloco não toca
  `backend/`; a única stack que sobe é a sonda de release (§4.3), em projeto Compose próprio.

### 4.2 CI legível: `audit-dev` reprova e segura a imagem

Duas mudanças em `.github/workflows/ci.yml`, e nada mais nele:

1. **`continue-on-error: true` sai do job `audit-dev`.** Advisory em qualquer árvore reprova o run.
2. **`audit-dev` entra no `needs` do `image`.** Reprovar sem segurar a imagem seria meio-termo: o
   run vermelho e o par publicado ao mesmo tempo, exatamente a incoerência que o item 11 evitou
   para os outros gates.

O comentário do job muda de texto — a decisão anterior ("reporta e não reprova") vira registro
histórico com a data de reversão, e o risco que ela evitava fica **assumido pelo João**: uma
advisory transitiva de ferramenta trava a fila até o bump. A saída correta para isso é o bump (que
a §3.1 mostra ser barato quando os ranges já cobrem a correção), nunca desligar o check.

Correção dos sete advisories: `pnpm update brace-expansion nanoid postcss minimatch` de dentro de
`frontend/`, `package.json` intacto; `pnpm install --frozen-lockfile` (o que o job `frontend` roda)
precisa continuar passando com o lockfile novo. `pnpm audit` local fica em zero antes do push.

Semântica resultante, que o `CONTRIBUINDO.md` passa a explicar: **vermelho = bloqueia merge e
imagem**; `cancelled` em PR = push novo cancelou run velho; em `pull_request` rodam **cinco** jobs
(`backend`, `frontend`, `types-drift`, `audit-prod`, `audit-dev`) e **todos decidem**; em `push`
para `main` entra o sexto, `procedencia`, e **o par só existe para SHA com os seis verdes**. Os
textos que hoje dizem "quatro gates verdes" (`pre-push`) e "cinco gates" sem dizer que um deles
não decidia passam a dizer isso.

### 4.3 Espelho atualizado e release provado

**Ordem obrigatória**, porque cada passo depende do anterior ter produzido evidência:

1. PR deste bloco com a §4.2 mescla em `Andred21/main` → run `push` verde, `image` publica o par
   do merge no GHCR pessoal.
2. `scripts/espelhar-corporativo.sh` (sem `--simular`) publica **um** commit de espelho com a
   árvore filtrada desse merge, trailer `Source-Commit`. É o espelho de onze PRs de uma vez — o
   script já faz isso por desenho (uma árvore por release, não um commit por PR).
3. CI corporativo: `procedencia` confere o trailer contra `ESPELHO_FONTE`; `image` publica
   `ghcr.io/gatika-cl/lotus-app:<sha-corporativo>` e `lotus-web:<sha-corporativo>`.
4. `scripts/provar-release.sh <sha-corporativo>` puxa e executa esse par aqui.

**Credencial.** Passo que só o João pode dar: criar um PAT **clássico** com escopo `read:packages`
(fine-grained não lê GHCR) e rodar `docker login ghcr.io -u Andred21 --password-stdin`. O token não
entra no repositório nem em arquivo versionado; vive no keychain do Docker desta máquina. O host do
item 10/12 precisará de credencial **própria** e só de leitura — esta serve de molde, não de valor.

**`scripts/provar-release.sh <sha>`** — o contrato:

- entrada: SHA de 40 hexadecimais; dono do registry derivado do remote `upstream`
  (`gatika-cl`, minúsculas, como o job `image` faz), sobrescrevível por `LOTUS_RELEASE_OWNER` para
  provar o par pessoal;
- pré-condições que falham alto: `docker manifest inspect` dos dois alvos (sem login, a mensagem
  diz o que falta); nenhuma imagem `lotus-*:local` é construída (`--no-build`, `--pull never` no
  `up`);
- execução: projeto Compose `lotus-release`, `docker-compose.prod.yml` + `docker-compose.prod-probe.yml`,
  `LOTUS_IMAGE`/`LOTUS_WEB_IMAGE` nos dois alvos por SHA, `LOTUS_ENV_FILE=docker/probe.env`,
  `LOTUS_HTTP_PORT=8081`; `pull` dos dois alvos, `up -d`, espera o healthcheck do `nginx`
  (que já atravessa `nginx → FPM → /up`) ficar `healthy` em até **150 s** (`start_period` 30 s +
  5 tentativas × 15 s = 105 s, com folga), `GET http://127.0.0.1:8081/up` precisa responder `200`;
- saída: imprime os dois `RepoDigest` executados e o veredito; `down -v` em `trap`, sempre —
  a máquina volta ao que era, inclusive em falha;
- código de saída `0` só com `/up` 200 pelo par pedido.

O script atravessa o espelho, de propósito: é ferramenta de prova do runtime, não andaime de
desenvolvimento, e o corporativo pode rodá-lo contra o próprio registry.

Duas execuções fazem parte do bloco: contra `3d158773…` (par que já existe — valida o script antes
de depender dele) e contra o SHA do espelho novo (a prova que o DoD pede).

**Dois PRs, por causa da ordem acima.** O primeiro leva código e docs (§4.2, script, `CONTRIBUINDO`,
`P-62`) e é o que o espelho publica; a prova do passo 4 só existe depois dele. O segundo é o de
fechamento: evidência em `audits/`, `progress.md` e `state.md`. Como `docs/` não atravessa, a
árvore filtrada do segundo é idêntica à do primeiro e o script responde "já tem esta árvore" —
não há segundo espelho.

### 4.4 Docs e pendências

- `CONTRIBUINDO.md` ganha duas seções: **"Como ler o CI"** (os sete jobs e o que cada um decide;
  cor por cor; `cancelled`; o que muda com `audit-dev` no `needs`) e **"Provar um release"**
  (PAT, `docker login`, `provar-release.sh`, o que ele sobe e derruba). "Os cinco gates" ganha a
  frase que faltava — todos decidem —, e a mensagem do `pre-push` troca "quatro gates verdes" por
  cinco.
- `P-62` ganha parágrafo datado de 2026-08-29 com a §3.5; o gatilho passa a incluir "decidir a
  visibilidade de `Andred21/lotus`".
- Evidência datada em `docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md`: runs, SHAs,
  digests, saída do script.

## 5. Decisões

| ID | Decisão | Alternativa recusada e por quê |
|---|---|---|
| D1 | `audit-dev` reprova **e** entra no `needs` do `image` | Só reprovar: run vermelho com par publicado é a incoerência que o item 11 evitou. Só corrigir advisories sem mexer no workflow: o X vermelho voltaria na próxima transitiva e continuaria sem decidir nada |
| D2 | Bump só no lockfile, ranges intactos | `pnpm.overrides`: não pedido; trava versão que o range já cobre |
| D3 | Prova do release por script versionado que atravessa o espelho | Prova manual única em `audits/`: não se repete a cada espelho; o host do item 12 faz a mesma sequência e o script é a especificação executável dela |
| D4 | PAT clássico `read:packages` do João, fora do repositório | Token de deploy do host: é do item 10/12, e ainda não há host. Tornar o pacote público: decisão de visibilidade, adiada |
| D5 | Visibilidade e protection do pessoal **não mudam**; divergência vai para a `P-62` | Tornar privado ou ligar protection agora: o João adiou a decisão |
| D6 | Merge de `main` (não rebase) para trazer os 103 commits | Rebase: quatro conflitos sucessivos no mesmo `state.md`; o merge resolve uma vez e preserva os SHAs dos packets citados no estado |
| D7 | Itens 10 e 12 estacionados em lista | Cancelar o 10 ou devolvê-lo à fila: perde o packet `partial` já pago e o vínculo com o 12 |

## 6. Divergências registradas

- `pre-push` diz "quatro gates verdes" (não contava `audit-dev`); com D1 são cinco em PR, seis
  em `push`. `CONTRIBUINDO.md` diz "cinco gates" sem dizer que um não decidia. Corrige-se no texto.
- `P-62` diz "a `main` dos dois repositórios não tem branch protection — plano free recusa a API":
  verdadeiro para o corporativo; no pessoal, público, a API aceitaria. Registra-se, não se executa.

## 7. Definition of Done — comportamento provado

1. **CI legível:** PR deste bloco com `audit-dev` verde e zero advisory. Numa **sonda** dentro da
   mesma PR (commit com o lockfile rebaixado, depois revertido), `audit-dev` reprova e o run fica
   `failure` — prova de que `continue-on-error` saiu. Após o merge, o run `push` em `main` mostra
   `image` com `audit-dev` entre os jobs de que depende e termina `success`.
2. **Espelho:** `git rev-parse upstream/main^{tree}` é igual à árvore filtrada do merge deste bloco
   (`--simular` imprime o hash); no corporativo, `procedencia` e `image` `success` para esse SHA.
3. **Release provado:** `scripts/provar-release.sh <sha-corporativo>` termina `0` com `/up` 200 e
   imprime os dois digests; a execução contra `3d158773…` também termina `0`. `docker compose -p
   lotus-release ps` vazio depois.
4. **Catracas:** `pnpm lint`, `pnpm test` (inclui `compose-prod.test.ts` e `repo-docs-refs.test.ts`)
   e `pnpm build` verdes de `frontend/`; `pnpm install --frozen-lockfile` passa com o lockfile novo.
5. **Docs:** `CONTRIBUINDO.md` com as duas seções; `P-62` atualizada; evidência em `audits/`;
   `state.md`, `backlog.md` e `progress.md` coerentes no fechamento.

## 8. Entregáveis

- `.github/workflows/ci.yml` (D1)
- `frontend/pnpm-lock.yaml` (D2)
- `scripts/provar-release.sh` (D3)
- `CONTRIBUINDO.md` (§4.4) e o texto da mensagem em `.githooks/pre-push`
- `docs/superpowers/pendencias/abertas.md` (`P-62`) e a linha do índice em `pendencias/README.md`
- `docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md`
- `docs/superpowers/backlog.md` (item 20) e `docs/superpowers/state.md`
- um commit de espelho em `Gatika-CL/main`

## 9. Riscos

| Risco | Mitigação |
|---|---|
| `pnpm update` puxa mais do que os quatro pacotes | `pnpm update <nomes>` é seletivo; `git diff --stat pnpm-lock.yaml` e `pnpm audit` antes do push; o job `frontend` roda a suíte de qualquer forma |
| Sonda vermelha polui a PR | É um commit revertido na própria branch, nunca em `main`; o item 11 fez o mesmo para provar os gates |
| Espelho de onze PRs traz algo que não devia | `--simular` lista a raiz filtrada antes; `procedencia` reprova árvore com path de exclusão |
| PAT com escopo além de `read:packages` | Só esse escopo; sem expiração longa; nunca em arquivo do repositório |
| Sonda de release colide com a stack de dev desta árvore | Derrubar a stack de dev antes; o Compose falha alto em porta ocupada |
| Par corporativo não sobe por algo que o local não reproduz (RDS/S3/SES) | Fora do escopo por desenho: a sonda prova a imagem e a cadeia `nginx → FPM → app → MySQL/MinIO`; a conta AWS é o item 10 |

## 10. Limitações declaradas

- Nada de AWS é provado aqui; MinIO e Mailpit continuam sendo substitutos de dev.
- A régua de `main` segue **compensada** (P-62): nada impede push direto, e este bloco não muda isso.
- O item 12 continua sem host; o que este bloco entrega para ele é a credencial-molde e a sequência
  `login → pull → up → /up` executada e versionada.
