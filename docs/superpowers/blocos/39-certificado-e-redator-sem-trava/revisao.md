# 39 — Revisão

## Em aberto

## Rodada 1 — `0740843a..fa668ba7` — 2026-10-19 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como **alto risco**: certificado com peso legal, `generated.ts` e auditoria de
pivot. A lente Codex do Passo 4 **não rodou**: o `codex-companion` recusou o `gpt-5.5` e o
`gpt-5.4` com "model is not supported when using Codex with a ChatGPT account". Por isso a rodada
fecha só com a lente 1 do `revisor-bloco`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O texto do legado de `course_certificate_templates` ainda diz que o `version` é "derivado por `MAX+1` sob `lockForUpdate` na Action", mas a Action foi apagada no bloco. O texto também diz "nenhuma leitura nem escrita da aplicação", embora a cascata de `Course::booted()` ainda escreva e leia a tabela. | PLAUSIBLE | `docs/der-fisico.md:34`; `backend/app/Domains/Catalog/Models/Course.php:17-19,47,55`; `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php:43-46` | Observação. A divergência é de redação: as duas fontes já dizem que a cascata fica "por rastro". Não bloqueia. |
| Q-2 | Menor | A prova de que o preview "não consome número" compara só o `count()` de `certificate_sequences`. O `next()` faz `insertOrIgnore` da linha do ano e depois `update` do `last_seq`. Com a linha do ano já existente, como em produção, um consumo não muda a contagem. O teste só pega o defeito porque o banco do teste começa vazio. | CONFIRMED | `backend/tests/Feature/Certification/CertificatePreviewTest.php:74,78,170`; `backend/app/Domains/Certification/Services/CertificateNumberService.php:12-28` | Registrado e não bloqueia. O smoke conferiu o `last_seq` à mão (1002 antes e depois). O reforço é semear a linha do ano e comparar `pluck('last_seq', 'year')`. |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 1 confirmado, 1 plausível, 0 refutados

**Fora do escopo, registrado por decisão do João:** o smoke achou que um certificado real com nota e
asistencia preenchidas sai em 3 páginas, e não em 2, com a assinatura do redator numa página quase
vazia. A causa é o layout do Blade, que é anterior ao bloco: o hash provou que o 39 não mudou o HTML
real. O seed não mostra o defeito porque tem nota e asistencia vazias. O João mandou para o backlog
como bloco de refinamento do certificado inteiro, junto com a pesquisa do que torna válido o
certificado de uma OTEC credenciada. Esse bloco é a ficha **40** (`certificado-refinamento-e-validade`),
que entra pela PR de docs #136 (branch `docs/backlog-ficha-40-certificado-refinamento-e-validade`) e
não por esta lane.

Também fora do diff ficaram comentários que ainda falam em "gate da RN-09" ou tratam o template
como fonte. Eles são do mesmo tipo do M-5 já triado:

- `frontend/src/features/identity/api/useProfile.ts:81-82`
- `frontend/src/features/identity/hooks/useProfileDocuments.ts:16`
- `backend/app/Domains/Certification/Data/Snapshot/SnapshotTemplateData.php:9`
