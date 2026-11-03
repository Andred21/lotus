# 53 — Revisão

## Em aberto

## Rodada 1 — `1845d096..3c98fb27` — 2026-11-03 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Bloco de alto risco (toca `generated.ts` e identidade/provisionamento do aluno). A lente Codex não
rodou: `codex-companion task` devolveu `The 'gpt-5.5' model is not supported when using Codex with
a ChatGPT account.`, e o mesmo com `--model gpt-5.4`. A rodada ficou só com a lente 1.

Na lente 1, o `revisor-bloco` rodou 181 testes de backend (filtro Import, StudentResolver,
UserProvisioner, Enroll, PersistenceLaws, DomainDependency e ComputedKeyInBody) e 199 testes
vitest em `src/features/operation`. Todos passaram.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | `assertCanCreate` não valida mais a forma da `StudentIdentity` (teto do nome impresso, formato do e-mail, tetos de coluna). A pré-condição "forma já validada" só existe em docblock, e o construtor público aceita dado cru. O classificador monta uma identidade a partir do cadastro, sem validar. Hoje não causa dano, porque `resolveByRut` não lê os campos do aluno existente. O risco é uma porta futura que monte `StudentIdentity` cru: gravaria nome acima do teto do certificado, ou daria 500 em vez de 422 | PLAUSIBLE | `backend/app/Domains/Identity/Services/StudentResolver.php:49-55,150-153`, `backend/app/Domains/Operation/Actions/EnrollStudentAction.php:22-25`, `backend/app/Domains/Operation/Services/ImportRowClassifier.php:106` | observação. O defeito depende de um caminho de escrita que ainda não existe. Sugestão, sem bloquear: `assertCanCreate` reaproveitar `StudentIdentityData::validateAndCreate`, ou construtores nomeados `fromValidated`/`fromRegistry` |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 0 confirmados, 1 plausível, 0 refutados
