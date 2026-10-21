# Bloco 39 — smoke na lane

Data: 2026-10-17. Commit medido: `15986e6f`. Stack da lane (offset +1: HTTP 8081, Vite 5174),
banco local da lane depois de `migrate` e `db:seed`. API por sessão Sanctum (cookie e CSRF) como
`admin@lotus.cl`; a UI foi exercida pelo Chromium (playwright-cli) no Vite da lane.

## Verificação fresca (Steps 1–4)

| Item | Resultado |
|---|---|
| Suíte backend | OK: 1241 passed, 5 skipped (9327 assertions) |
| Drift de tipos | OK: `typescript:transform` + `git diff --exit-code` em `frontend/src/shared/types/` sem diferença |
| Frontend | OK: `pnpm build` e `pnpm lint` limpos; vitest com 170 arquivos e 1176 testes passando |
| `backend/lang/` | OK: `git diff -w --stat` igual ao diff cru (6 arquivos, +3 −18) |
| Pint | OK: `pint --test` passou nos PHP alterados desde `0740843a` |

## Smoke (Step 5)

1. **OK. Emissão online sem template.** A turma 3 é online e concluída, e o curso 2 não tem
   template (`course_certificate_templates` = 0). `POST /api/enrollments/22/certificate` devolveu
   201 e o certificado `LOT-2026-1000`, com `ciudad_emision` `Santiago`, `valido_ate` nulo e
   `snapshot.template` `{version: null, city: null}`. O PDF real gerado pelo Gotenberg imprime
   "En Santiago a 17-10-2026" e tem 2 páginas.
2. **OK. Emissão presencial.** O seed não tem turma presencial concluída. Por isso, no banco local
   da lane, a turma 3 virou presencial com `local_aplicacao` `Rancagua` por `DB::table` (sem audit)
   e voltou ao estado original logo depois. O `POST /api/enrollments/31/certificate` devolveu 201
   e `LOT-2026-1001`, com `ciudad_emision` `Rancagua`. O PDF imprime "En Rancagua a 17-10-2026".
3. **OK. Amostra do certificado.**
   - Pela UI: em Courses, o botão "View sample certificate" aparece em cada linha. A coluna de
     12rem comporta os três botões em 1440px. O clique abre uma aba blob com o PDF.
   - Pela API: `GET /api/courses/2/certificate-preview` responde 200 com `application/pdf` e
     `Content-Disposition: inline; filename="certificado-muestra-2.pdf"`.
   - Conteúdo: o PDF traz `N° MUESTRA`, "En Santiago", o temário com os dois módulos e a marca
     `MUESTRA — SIN VALIDEZ`. A marca aparece rotacionada, vermelha translúcida e dentro da página,
     repetida em todas as páginas, temário incluído (conferido por imagem com `pdftoppm`).
   - Nada é gravado: antes e depois da chamada, `audits` = 303, `certificates` = 3 e
     `certificate_sequences.last_seq` = 1002.
4. **OK. Designação com aviso.**
   - O seed não tem redator sem REUF, então o smoke usou o motivo `not_qualified`. O
     `reuf_invalid` e os dois motivos juntos estão cobertos nos testes automatizados.
   - Turma 1 (em andamento), aba Redator: o designado inidôneo mostra a tag "Not enabled for the
     course", e os idôneos mostram "Eligible".
   - No picker, os inidôneos aparecem com a tag. "Assign" num deles abre "Assign with suitability
     warning" empilhado sobre o picker, com a mensagem "Does not meet suitability: Not enabled for
     the course. Assign anyway?".
   - Depois de "Assign anyway", Marcela Rojas aparece designada com a tag de aviso.
   - O audit no MySQL fica na mesma linha do `sync`: `{"redatores":[1,2,3,5],"inidoneidade":{"5":["not_qualified"]}}`.
   - A designação idônea pela API (redator 3) gravou só `{"redatores":[1,2,3]}`.

## Achado fora do escopo do bloco

O **certificado real com nota e asistencia transborda a página 1.** Um certificado emitido no
banco local, com `grades.final` 6.5 e `attendance_pct` 95, sai com 3 páginas: a assinatura do
redator e o rodapé caem numa página 2 quase vazia, e o temário vai para a página 3. A amostra
mostra o mesmo, porque leva nota 7.0 e 100% de asistencia. Os certificados do seed têm nota e
asistencia nulas e saem com 2 páginas, sem o problema.

A causa é o layout do `certificate.blade.php`, anterior a este bloco. O bloco 39 só acrescentou o
`@if ($muestra !== null)`, e o hash do `CertificadoEmitidoIntactoTest` prova que o HTML real não
mudou. Fica para decisão do João: cabe uma ficha no backlog, porque o certificado tem peso legal.
