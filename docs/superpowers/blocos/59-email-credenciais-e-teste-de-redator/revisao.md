# 59 — Revisão

## Em aberto

## Rodada 2 — `ee8820e0` — 2026-11-20 · não rodada

O `ee8820e0` (`fix(deps)`: laravel/framework 13.42 e symfony/* 7.4.23, só o `composer.lock`) voltou
o `estado.md` a `reviewing` para a rodada 2, mas o PR #170 mesclou na `main` em 2026-11-13 antes
dela rodar. Sem diff a revisar depois do merge (merge-base = HEAD). A prova do bump é a do próprio
commit: `composer audit --locked` limpo, suíte 1815 passed, `generated.ts` sem drift. Decisão do João
(2026-11-20): o bump fica registrado como mesclado sem a rodada 2, e o estado volta ao `blocked`
aguardando aceitação do `49cec778`.

## Rodada 1 — `cd2a8a57..0ed825f4` — 2026-11-13 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4)

Classificação: alto risco (scripts que trocam e limpam senha de usuário em produção; texto do e-mail
de credenciais). A lente Codex somente-leitura não rodou: o `codex-companion` recusou `gpt-5.5`
(pin de `~/.codex/config.toml`) e `gpt-5.4` com `model_not_found` na conta ChatGPT. A rodada ficou
só com o `revisor-bloco`.

Lente 2: não despachada — nenhum achado nesta rodada.

Pontos que a lente 1 conferiu e deu como corretos: escrita no `User` por `save()`, sem `password` no
`$auditInclude` (ADR-08); a guarda dos scripts recusa a escrita inteira se um id falhar e fecha em
erro no modo não interativo do PsySH; o hash não é reprocessado pelo cast `hashed`; a chave do
rodapé em `backend/lang/es_CL.json` é a do template do framework, com paridade de chave mantida em
`en.json` e `pt_BR.json`; as alegações do `ses-pedido-2026-11-13.md` batem com `config/auth.php` e
com a conta SES (leitura com `--profile lotus`). A suíte PHP não rodou nesta revisão (stack da lane
parado). A prova fresca fica para o `/finalizar-bloco`.
