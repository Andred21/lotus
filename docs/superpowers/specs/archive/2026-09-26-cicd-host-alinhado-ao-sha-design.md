# Spec — `cicd-host-alinhado-ao-sha` — 2026-09-26

> Item 31 do backlog, aberto pelo João em 2026-09-26 juntando duas fichas de `pendencias/` que têm
> o mesmo gatilho, "o próximo commit que mudar `deploy/bin/deploy.sh`": a **P-88** (o dono das
> imagens é variável de ambiente) e a **P-87** (o host guarda por cópia o que o botão não promove, e
> nada avisa quando fica para trás). A **P-86** entra **condicional** (§6). `Contexto: não`: as fontes
> são as três fichas, `deploy/bin/deploy.sh`, `.github/workflows/deploy.yml`,
> `deploy/aws/criar-oidc-e-role.sh` e o runbook `deploy/aws/README.md`, todos no repositório. O
> número 30 foi saltado porque a branch órfã `chore/30-harness-estado-por-bloco` já o usa.

## 1. Contexto

### 1.1 O que já existe

- **Botão de promoção** (`deploy.yml`, item 12): confere formato, `PROMOVER`, SHA na `main`, CI
  verde e trio no GHCR; assume `lotus-deploy` por OIDC; manda `AWS-RunShellScript` executar
  `/opt/lotus/bin/deploy.sh <sha>` no host.
- **A role** já pode `ssm:SendCommand` com `AWS-RunShellScript` na instância e ler a invocação
  (`criar-oidc-e-role.sh:89-95`). O documento é genérico: qualquer comando cabe nele.
- **O host** guarda em `/opt/lotus` (`750 root:root`), instalados à mão pelo runbook §7:
  `docker-compose.prod.yml`, `docker-compose.prod-tls.yml`, `nginx/tls.conf`, `bin/deploy.sh`,
  `bin/backup-db.sh`, `bin/verificar-backup.sh` e o `.env` (40 chaves no molde
  `deploy/aws/env.prod.example`, nenhuma comentada).

### 1.2 O que falta

1. **P-88.** `deploy.sh:102` monta `DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"`. Por SSH, a variável
   promove o trio do repositório pessoal, que é público. A regra "produção roda sempre
   `ghcr.io/gatika-cl/`" vale por padrão, não por mecanismo.
2. **P-87.** O botão promove imagens. O resto que o SHA pressupõe chega ao host por cópia, e nada
   compara. Em 2026-09-26 o compose, o overlay, o `tls.conf` e o `.env` estavam atrás da `main` havia
   seis dias; os scripts só chegaram porque o João reinstalou à mão.

## 2. Decisões do brainstorming

| # | Decisão | Alternativas recusadas |
|---|---|---|
| D1 | **Detectar, não entregar** (direção (a) da P-87). O host continua sendo a fonte; o botão recusa quando o host diverge. | (b) entregar pelo SSM: limite de tamanho do parâmetro incerto, talvez S3 + escrita na IAM, instalador atômico novo exercido só em produção. (c-imagem) pacote na imagem `app` com `deploy.sh` se reescrevendo por `exec`: a troca de script em rollback é o tipo de mecanismo que só se prova em produção. Os dois ficam como evolução se a sincronização manual incomodar. |
| D2 | **Duas classes, duas referências.** Runtime (os dois composes e o `tls.conf`) é comparado com o **SHA alvo**; ferramenta (`bin/*.sh`) com a **`main`**; as chaves do `.env` com o `env.prod.example` do **SHA alvo**. | Uma referência só. Com o SHA alvo para tudo, um rollback exigiria reinstalar o `deploy.sh` antigo, que traz de volta o dono variável e gates mais fracos. Com a `main` para tudo, um rollback rodaria o compose novo sobre a imagem velha sem aviso. |
| D3 | **Comparação no runner, leitura no host.** O host só lista hashes e nomes de chave por um SSM de leitura; quem decide é um script versionado que roda no runner. | Comparar no host: o script de comparação viraria mais um arquivo copiado à mão, sujeito ao mesmo defeito que ele mede. |
| D4 | O script mora em **`.github/scripts/conferir-alinhamento.sh`**, não em `deploy/bin/`. | `deploy/bin/`: o runbook §7 passaria a copiar para o host um arquivo que o host nunca executa, e a conferência passaria a exigi-lo lá. |
| D5 | **Sem escape no workflow.** Divergência reprova; o remédio é o §7. | Um input `ignorar_alinhamento`: repetiria o escape de schema que a catraca do item 12 proíbe no caminho automatizado. |
| D6 | **P-88 por literal**, `gatika-cl` fixo no `deploy.sh`, incluindo o `docker login -u`. | Allowlist de donos: não há segundo dono legítimo. |
| D7 | **P-86 condicional**, sem release-sonda (decisão do item 12 mantida). | Fabricar migration inócua: ficaria para sempre na história e no banco. |

## 3. Escopo

**Dentro:**
- `deploy/bin/deploy.sh`: dono literal (§4).
- `.github/scripts/conferir-alinhamento.sh` (novo) e o passo que o chama em `deploy.yml` (§5).
- Catracas: `frontend/tests/deploy-sh.test.ts` (dono), `frontend/tests/workflow-deploy.test.ts`
  (passo novo) e `frontend/tests/conferir-alinhamento.test.ts` (novo, comportamental).
- Runbook `deploy/aws/README.md`: §7 (o que a conferência mede, e que o script dela não vai ao
  host), §8 (o passo novo no botão) e §8.1 (rollback com runtime diferente).
- Fichas P-86, P-87 e P-88 e a lição 19, com os pares nominais novos.

**Fora:**
- Entregar arquivos ao host (D1).
- Conferir o caminho por SSH: é contingência, e continua sem conferência (§8, risco declarado).
- Valores do `.env`: só nomes de chave atravessam.
- Mudança de IAM, de SG ou do documento SSM.

## 4. P-88 — o dono fixo

- `DONO=gatika-cl`, sem expansão de variável. O cabeçalho perde a linha de `LOTUS_RELEASE_OWNER`.
- As três imagens e o `docker login -u` usam o mesmo literal.
- **Catraca** em `deploy-sh.test.ts`: todo `ghcr.io/<dono>/` do código (fora de comentário) é
  `gatika-cl` ou `$DONO`; a atribuição de `DONO` é exatamente o literal; `LOTUS_RELEASE_OWNER` não
  aparece. **Sonda obrigatória:** devolver `DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"` tem de
  reprovar; `DONO=andred21` também.

## 5. P-87 — a conferência de alinhamento

### 5.1 O que o host devolve

Um `send-command` **só de leitura**, antes do de deploy, cuja saída tem duas partes:

```text
<sha256>  docker-compose.prod.yml
<sha256>  docker-compose.prod-tls.yml
<sha256>  nginx/tls.conf
<sha256>  bin/deploy.sh
...                              (um por bin/*.sh existente no host)
--- chaves
APP_NAME
APP_ENV
...                              (nomes das chaves ativas do .env, nunca o valor)
```

Arquivo de runtime ausente no host sai como `AUSENTE  <caminho>`. Os nomes do `.env` saem por um
filtro que corta no `=` — a catraca garante que nenhum comando da leitura imprime o que vem depois
dele.

### 5.2 O que o script decide

`conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>`:

| Classe | No host | Referência | Divergência |
|---|---|---|---|
| runtime | `docker-compose.prod.yml`, `docker-compose.prod-tls.yml` | mesmos nomes na raiz do **alvo** | `diferente` ou `ausente` |
| runtime | `nginx/tls.conf` | `deploy/nginx/tls.conf` do **alvo** | `diferente` ou `ausente` |
| ferramenta | `bin/<x>.sh` | cada `deploy/bin/<x>.sh` da **`main`** | `diferente` ou `ausente` |
| chaves | nomes do `.env` | chaves ativas de `deploy/aws/env.prod.example` do **alvo** | `chave faltando: <NOME>` |

Script a mais no host e chave a mais no `.env` **não** reprovam: não quebram o SHA, e reprovar por
eles puniria sobra inofensiva.

Saída: com divergência, uma linha por item, o ponteiro para o runbook §7 e **exit 1**; sem
divergência, uma linha de "host alinhado" e **exit 0**. Listagem sem o marcador `--- chaves`, ou
vazia, é erro (exit 1), não "tudo alinhado": SSM que devolveu nada não prova alinhamento.

### 5.3 O passo no workflow

Depois de `Quem eu sou na AWS`, antes de `deploy.sh no host, por SSM`:

1. `actions/checkout` do SHA alvo em `alvo/` e da `main` em `main/`.
2. `send-command` com o comando de leitura de §5.1, polling até estado final, stdout para arquivo.
   Estado final diferente de `Success` reprova.
3. `main/.github/scripts/conferir-alinhamento.sh saida.txt alvo main`. O script vem da `main`,
   como toda ferramenta (D2).

O passo de deploy só roda se este passar. Nenhum escape (D5).

### 5.4 Consequência para o rollback

Se o runtime mudou entre o SHA rodando e o alvo, o botão recusa, nomeando o arquivo. O remédio é
instalar pelo §7 os arquivos **do SHA alvo** e só então promover — que é exatamente o que o rollback
precisava e ninguém avisava. Os scripts nunca voltam: a referência deles é a `main`.

Consequência para frente: todo merge que mudar `deploy/bin/*.sh` trava o botão até a reinstalação.
É o efeito desejado — o gatilho que a P-87 descreve deixa de depender de alguém lembrar.

## 6. P-86 — condicional

Na execução, conferir se existe SHA na `main` com migration que a produção não tem. Se existir, a
promoção dele fecha a ficha pelo gatilho escrito nela (`inicio` com `dump`, objeto no S3,
`verificar-backup.sh` aprovando). Se não existir, a ficha fica intacta com nota datada.

## 7. Catracas (lição 19)

Cada uma ancora comparação e saída de falha, não palavra: a sonda que remove o `exit 1` ou acrescenta
`|| true` tem de reprovar.

- **`conferir-alinhamento.test.ts`** executa o script sobre fixtures em diretório temporário:
  alinhado → 0; e, cada um em caso próprio, compose diferente, `tls.conf` ausente, `deploy.sh`
  diferente, script da `main` ausente no host, chave faltando e listagem sem marcador → 1 com a
  linha nomeando o item. Chave e script a mais → 0. Por execução, não por texto.
- **`workflow-deploy.test.ts`**: o passo de conferência existe e vem **antes** do de deploy; o
  checkout do alvo usa `inputs.sha` e o da `main` usa `main`; o comando de leitura não contém `>`,
  `mv`, `cp`, `rm`, `install`, `tee` nem `sed -i`; o `.env` passa pelo filtro que corta no `=`; o
  script chamado é o de `main/`; não há input nem variável de escape.
- **`deploy-sh.test.ts`**: §4.

## 8. Limites e riscos declarados

- **O SSH não é conferido.** `sudo deploy.sh <sha>` por SSH continua promovendo com o host como
  estiver. É contingência, e o runbook §8 passa a dizer que ela pula a conferência.
- **Detectar não sincroniza.** A instalação segue manual pelo §7; o que muda é que o esquecimento
  para o botão em vez de passar.
- **A leitura corre no mesmo host que ela mede**, com root. Um host comprometido pode mentir na
  listagem; isso está fora do modelo de ameaça deste bloco, que é esquecimento, não adversário.

## 9. Definition of Done — comportamento provado

1. `deploy.sh` com `gatika-cl` literal; a catraca de §4 vista reprovar pelas duas sondas.
2. `conferir-alinhamento.sh` com os casos de §7 verdes, e a catraca vista reprovar com o `exit 1`
   trocado por `exit 0`.
3. `workflow-deploy.test.ts` com as asserções de §7, vistas reprovar pela sonda que apaga o passo e
   pela que acrescenta `|| true` à chamada do script.
4. **Vermelho ao vivo:** depois do merge e do espelho, **antes** de reinstalar, o botão com o SHA
   espelhado reprova no passo de conferência com `bin/deploy.sh diferente` entre as linhas, o passo de
   deploy não roda, e o ledger do host não ganha linha nova.
5. **Verde ao vivo:** o João reinstala pelo §7; o botão promove o mesmo SHA; `/up` 200; `fim` com
   `resultado ok` no ledger; `grep -c LOTUS_RELEASE_OWNER /opt/lotus/bin/deploy.sh` devolve 0.
6. P-86 fechada pelo gatilho dela, ou nota datada de que não houve release com migration.
7. Runbook §7, §8 e §8.1 descrevem a conferência, o rollback com runtime diferente e o SSH sem
   conferência; P-87 e P-88 encerradas; lição 19 com os pares
   `.github/scripts/conferir-alinhamento.sh` ↔ `frontend/tests/conferir-alinhamento.test.ts`.
