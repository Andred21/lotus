---
description: Verifica se /docs ainda reflete o código real e sinaliza divergências
---

## O que fazer

Compare os `/docs` com o estado real do repo e **reporte** divergências.
**Não corrija nada sem me perguntar** — o canônico é o Google Drive e alinhá-lo exige
minha autorização (write externo).

1. **`docs/der-fisico.md`** vs `backend/database/migrations/` — tabela/coluna no código e não no
   DER (ou vice-versa).
2. **`docs/estrutura-monolito.md`** vs a árvore real de `backend/app/Domains/` e `frontend/src/` —
   domínio/feature novo, pasta que sumiu.
3. **`docs/adrs.md`** — decisão que virou padrão de fato na sprint mas não tem ADR escrito.
4. **`docs/superpowers/progress.md`** — feature entregue ainda marcada `Ativo`, ou plano/spec
   fora de `archive/`.
5. **`INSTRUÇÕES-DO-PROJETO.md`** — regra que contradiz o código real.

## Divergências já conhecidas (NÃO reportar como novas)

- `docs/der-fisico.md` em PT/ES vs schema implementado em inglês — follow-up pendente de autorização.
- ADR-15 (i18n = i18next + react-i18next) decidido; falta formalizar o texto em `docs/adrs.md`.
- ADR-08 (pruning da auditoria) segue aberto.

Reporte em tabela: `Doc | Divergência | Evidência (arquivo/linha) | Sugestão`.