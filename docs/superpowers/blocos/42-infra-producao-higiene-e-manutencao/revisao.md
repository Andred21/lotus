# 42 — Revisão

## Em aberto

- **Q-1 · Importante** — o runbook e a emenda do ADR-11 ainda dão a raiz da conta como saída de
  emergência da política, contra o ruling 6, e a catraca prende o texto antigo. Falta a aprovação
  do João para corrigir.

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
