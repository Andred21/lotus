# Progresso — Lotus v2

> Histórico curto do que foi entregue e da feature em andamento. Este arquivo **não define a etapa
> operacional**. Para saber o que fazer agora, leia `docs/superpowers/state.md`.
> Fila futura: `docs/superpowers/backlog.md`. Histórico antigo: `progress-archive.md`.

| Data | Entrega | Status | Resultado | Referências |
|---|---|---|---|---|
| 2026-07-17 | Bloco 5.2a · Usuarios | Entregue | CRUD de staff, roles e proteção do último superadmin. | `plans/archive/2026-07-17-bloco5.2a-usuarios.md` · `specs/archive/2026-07-17-bloco5.2a-usuarios-design.md` |
| 2026-07-18 | Bloco 5.2b · Roles y Permisos | Entregue | Roles customizadas e segregação de permissões implementadas. | `plans/archive/2026-07-18-bloco5.2b-roles-permisos.md` · `specs/archive/2026-07-18-bloco5.2b-roles-permisos-design.md` |
| 2026-07-19 | Bloco 5.3 · Refino Comercial | Entregue | Forms compartilhados, detalhe declarativo e date picker ISO. | `plans/archive/2026-07-19-refino-comercial-frontend.md` · `specs/archive/2026-07-19-refino-comercial-frontend-design.md` |
| 2026-07-20 | Bloco 5.4 · Refino Administração | Entregue | Erros 422, toolbar e descrições i18n de permissões corrigidos. | `plans/archive/2026-07-20-refino-administracao-frontend.md` · `specs/archive/2026-07-20-refino-administracao-frontend-design.md` |
| 2026-07-20 | Bloco 6a · Aluno + vínculo | Entregue | Resolução por RUT e vínculo histórico único validados em MySQL. | `plans/archive/2026-07-20-bloco6a-aluno-vinculo.md` · `specs/archive/2026-07-20-bloco6a-aluno-vinculo-design.md` |
| 2026-07-21 | Bloco 6c · Matrícula + importação | Entregue | Matrícula idempotente e import tolerante a erros por linha. | `plans/archive/2026-07-21-bloco6c-matricula-import.md` · `specs/archive/2026-07-21-bloco6c-matricula-import-design.md` |
| 2026-07-21 | Bloco 6d · Conclusão + manual | Entregue | Habilitação derivada, conclusão terminal e manual via Gotenberg. | `plans/archive/2026-07-21-bloco6d-conclusao-manual.md` · `specs/archive/2026-07-21-bloco6d-conclusao-manual-design.md` |
| 2026-07-21 | Bloco 6b · Turma + redator | Entregue | Turma por cotação, designação N:N e gate RN-09 validados. | `plans/archive/2026-07-21-bloco6b-turma-designacao.md` · `specs/archive/2026-07-21-bloco6b-turma-designacao-design.md` |
| 2026-07-23 | Sprint 3 · Operação frontend | Entregue | Execuções 1–3: Turmas, Alumnos, Documentación e Conclusión na UI; manual PDF abre no gesto do clique; P-07 e P-12 encerradas. Gate e2e contra API real: `GET /api/turmas/1/documents` 200, `GET /api/turmas/1/manual` 200 `application/pdf`, `POST /api/turmas/1/conclude` 422 terminal. | `plans/archive/2026-07-21-bloco6-frontend-exec1-turmas.md` · `plans/archive/2026-07-22-bloco6-frontend-exec2-alumnos.md` · `plans/archive/2026-07-23-bloco6-frontend-exec3.md` · `specs/2026-07-21-bloco6-frontend-operacao-design.md` (ativa) |
| 2026-07-23 | Integração Codex · Fases 3–8 | Entregue | Roteamento por estado, handoff de execução, revisão por risco e piloto de packet (`partial`). | `plans/2026-07-23-integracao-codex-fases-3-8.md` |
