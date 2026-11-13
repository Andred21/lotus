# 59 — Revisão

## Em aberto

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
