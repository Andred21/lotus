# 42 — Revisão

## Em aberto

## Rodada 3 — `68790dac..870fbbf7` — 2026-10-27 · Lente 1: opus · Lente 2: sonnet

Aberta pelo `/finalizar-bloco`. O João aprovou corrigir o Q-2 da rodada 2 e duas divergências que a
`auditar-docs` do fechamento mediu em texto do próprio bloco. O `870fbbf7`:
- faz a catraca do §3 exigir o `--resource-policy` e o `aws:PrincipalArn` no simulador do
  `lotus-infra`. Uma sonda que tirou o argumento do README reprovou o teste, e o README voltou de
  uma cópia (`cmp` idêntico);
- faz o §16.1 nomear as três causas da saída 1 do `podar-imagens.sh`, com catraca no §16.

A terceira divergência, o comentário de `deploy/bin/podar-imagens.sh:15` que cita o §8.1.1 em vez
do §8.1, ficou de propósito. Mudar o script muda o sha256 de `bin/`, que o passo "O host esta
alinhado ao SHA alvo" do `deploy.yml` compara com o host, e isso travaria o botão até a
reinstalação pelo §7. Ela vai para a P-97. A lente 1 conferiu que o Q-2 fechou. A lente Codex segue
fora pelo mesmo `model_not_found`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-3 | Menor | O §16.1 e a catraca do runbook citam `erro: docker image prune falhou`, mas o teste "prune falhando" do script confere só o `status` e as remoções, não o stderr. Renomear a mensagem em `podar-imagens.sh:87` deixa a suíte verde e o runbook procurando uma frase que o script não imprime. A da listagem está conferida dos dois lados. | CONFIRMED | `frontend/tests/podar-imagens.test.ts:192-196`, contra `deploy/bin/podar-imagens.sh:87` e `frontend/tests/runbook-higiene.test.ts:74` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

## Rodada 2 — `68790dac..fb16bb9e` — 2026-10-27 · Lente 1: opus · Lente 2: sonnet

O Q-1 da rodada 1 foi aprovado pelo João e corrigido em `fb16bb9e`:
- o runbook §3 e a emenda do ADR-11 dão o IAM como saída de emergência;
- antes do `put`, o simulador prova que o `lotus-infra` desfaz a política e que o `JoaoVBA` cria
  chave do `lotus-infra`;
- a catraca recusa `login da raiz`.

Os três comandos novos foram rodados contra a conta, só leitura, antes do commit:
- `s3:PutBucketPolicy` e `s3:DeleteBucketPolicy` dão `allowed` para o `lotus-infra`;
- `iam:CreateAccessKey` dá `allowed` para o `JoaoVBA`;
- o `lotus-infra` tem 1 chave;
- controle negativo: o `JoaoVBA` recebe `explicitDeny` em `s3:DeleteBucketPolicy`.

A lente 1 conferiu que o Q-1 fechou. A lente Codex segue fora pelo mesmo `model_not_found` da
rodada 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-2 | Menor | A catraca do §3 ancora só `--action-names s3:PutBucketPolicy s3:DeleteBucketPolicy` e a ordem; nenhuma asserção exige `--resource-policy file://deploy/aws/s3-politica.json` no comando do simulador. Uma edição que tire esse argumento esvazia a prova da saída de emergência, porque o simulador passa a avaliar só a política de identidade do `lotus-infra`, e a suíte segue verde. | CONFIRMED | `frontend/tests/runbook-higiene.test.ts:37`, contra `deploy/aws/README.md:89` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

## Rodada 1 — `68790dac..4870316f` — 2026-10-27 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como alto risco: lifecycle e política do bucket que guarda certificados e
documentos com peso legal, e backup do banco. A lente Codex não rodou. O `codex-companion` recusou
`gpt-5.5`, o modelo do `~/.codex/config.toml`, e depois `gpt-5.4`, ambos com
`model_not_found` ("not supported when using Codex with a ChatGPT account").

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | O runbook e a emenda do ADR-11 dão a raiz da conta `760144413534` como saída de emergência da política e mandam conferir o login dela antes do `put-bucket-policy`. O ruling 6 e o registro de execução dizem o contrário: o João não tem as credenciais da raiz, e a saída é o IAM (o `lotus-infra` desfaz a política, o `JoaoVBA` cria chave nova do `lotus-infra`, e recriar o usuário com o mesmo nome devolve o acesso). A catraca exige `login da raiz` e `Permissions → Bucket policy → Delete`, então a correção muda o teste junto. | CONFIRMED | `deploy/aws/README.md:80`, `deploy/aws/README.md:88-91`, `docs/adrs.md:118`, `frontend/tests/runbook-higiene.test.ts:37-43`, contra `rulings.md:29-30` e `execucao-producao.md:147-163` | aguarda aprovação do João |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 0 confirmados, 0 plausíveis, 0 refutados

A lente 1 rodou os 7 arquivos de teste do bloco (110 testes, verdes) e não reportou o que já é
decisão registrada: M4, M5 e M6 deferidos no ruling 3, o `sudo` duplo do §16.1 (ruling 4) e os
7 dias para versões antigas de documento, decididos na spec.
