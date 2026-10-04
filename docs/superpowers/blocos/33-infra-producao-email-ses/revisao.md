# 33 — Revisão

## Em aberto

## Rodada 1 — `20aa04ef..3254185f` — 2026-10-04 · Lente 1: opus + codex · Lente 2: sonnet

Risco **alto**: o bloco mexe no handler global de exceções (`bootstrap/app.php`, lei 4), em dado
pessoal que chega ao log e tem efeito externo em produção (SES/IAM). O `revisor-bloco` não achou
nada. Ele confirmou no vendor que o `->stop()` corta o `$logger->error(...)` padrão e rodou 155
testes (542 asserções) no contêiner da lane. Também deixou fora da lista M2, M3, M4 e M6, que já
estão estacionados no `rulings.md`. A lente Codex rodou em `gpt-5.5` porque o modelo do
`~/.codex/config.toml` (`gpt-5.6-sol`) é recusado na conta ChatGPT, e devolveu um achado só.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| 1 | Importante | Nenhum caso do teste simula uma recusa `AccessDenied` com ARN, `assumed-role` ou `identity/...` na mensagem. A asserção comum só proíbe o endereço do destinatário e o `Throwable` no contexto, então o teste não prova que a recusa IAM deixou de vazar o ARN. (só codex) | PLAUSIBLE | `backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php:168-177` | observação, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 1
plausível, 0 refutados · Menor: 0 confirmados, 0 plausíveis, 0 refutados

**Observação sobre o Q-1.** A lacuna existe: os códigos simulados são `MessageRejected`,
`Throttling` e nenhum (`:64`, `:143`, `:156`). O verificador marcou PLAUSIBLE e não CONFIRMED por
dois motivos:

- O critério escrito da D15 (`spec.md:330-331`) cobre o endereço, a mensagem fixa, a classe e o
  `MessageRejected`. O vazamento do ARN aparece como achado de aprovação (`spec.md:136-138`), não
  como caso do DoD.
- O mecanismo não depende do conteúdo da mensagem. O callback grava só a classe, o código, a
  origem e o `aws_erro`, nunca a mensagem nem a exceção como objeto, e as asserções `:173-177`
  provam isso para qualquer texto.

Um caso `AccessDenied` com ARN reforçaria a prova, mas fica a critério do João e não bloqueia.
