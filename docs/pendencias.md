# Pendências conhecidas

> Divergências e dívidas **já registradas**. A skill `auditar-docs` lê este arquivo e **não reporta
> nada daqui como achado novo**. Toda linha tem gatilho — pendência sem prazo vira mentira permanente
> (lição 13). Revisado a cada `/fechar-sprint`.
>
> Isto NÃO é backlog de produto — item de código/feature vai para o backlog do
> `docs/superpowers/progress.md`. Aqui mora só o que faz um doc ou um mecanismo divergir da realidade.


| ID | Pendência | Por que está aberta | Gatilho de expiração |
|---|---|---|---|
| P-01 | `docs/der-fisico.md` em PT/ES vs. schema implementado em inglês | Alinhar o canônico exige write no Drive — pendente de autorização do João | Quando o João autorizar o write externo |
| P-02 | ADR-08 (pruning/retenção da auditoria) segue **aberto** | Política de retenção nunca decidida; `audits` cresce sem poda | Antes de subir para produção |
| P-03 | Compose por worktree não existe | Bloco de backend não pode usar `using-git-worktrees` — o stack monta o main tree e o teste rodaria contra o código errado. **6a (Sprint 3) rodou em main-tree sem atrito — abordagem confirmada** | Reavaliar só se a concorrência de blocos backend passar a doer |
| P-04 | Leis invioláveis (§5) são instrução, não guardrail | Prompt não garante regra sob pressão; Pest Arch tests + eslint-boundaries adiados por decisão | Reavaliar quando a Sprint 3 fechar |
| P-05 | Migrations "adicionais" não consolidadas nas originais | Decisão do João no Bloco 2 — evitar inchaço do folder | Antes de subir para produção |
| P-06 | `der-fisico.md`: `turmas.redator_id` (FK 1:N) vs. pivot `turma_redator` (N:N) implementado | Bloco 6b (2026-07-21, decisão do João): a premissa "ocasionalmente >1 redator por turma" pediu N:N. O der-fisico ainda modela `turmas.redator_id` FK simples e lista `turmas` em "PLANEJADAS" — precisa migrar para implementadas (nomes finais em inglês, colunas reais) e trocar a relação `redatores 1:N → turmas` por N:N via `turma_redator` | Doc-sync da Sprint 3 (`/auditar-docs` no `/fechar-sprint`) |
| P-08 | RF-CUR-04 promete template de Manual POR CURSO; implementado Blade única padronizada | Bloco 6d (2026-07-21, spec D6, respaldo em `modulo-operacao.md`): o manual de classe é uma Blade única (`operation/manual-turma`) renderizada com os dados atuais → Gotenberg, não materializado. Schema não tem `course_manual_templates`. YAGNI: ~10 usuários, um formato padrão basta | Se o contratante pedir manual personalizado por curso |
| P-09 | Protótipo Figma mostra **4 tipos** de documento de turma (Manual, Pruebas/evaluaciones, Lista de asistencia, Acta de cierre); implementado são **3** (`MANUAL`/`PRUEBAS`/`EVALUACION_REDATOR`) | Bloco 6-frontend (2026-07-21, brainstorming, decisão D6 da spec `2026-07-21-bloco6-frontend-operacao-design.md`): a taxonomia de RN-16 tem peso legal (define quando a turma habilita) e não se muda no escuro — o front renderiza os 3 do backend; os rótulos extras do Figma eram exploratórios. Mudar para 4 = alterar enum `TurmaDocumentType` + `TurmaHabilitacaoService` + testes do 6d (bloco entregue) | Se a Lotus confirmar que quer os 4 tipos |
| P-10 | Coluna **CLIENTE** da tabela de alunos (aba Alumnos, Exec 2) foi **omitida** | Bloco 6-frontend (2026-07-22, Exec 2): `EnrollmentData` não expõe campo cliente e o cliente da turma é único (já aparece no cabeçalho da página de detalhe). Implementação consciente seguindo spec §3 Operação. YAGNI para ~10 usuários com alunos de 1 cliente por turma | Se a Lotus pedir alunos de múltiplos clientes na mesma turma, expor `client_name` em `EnrollmentData` |
| P-11 | Confirmação de remoção de matrícula usa `window.confirm` nativo | Bloco 6-frontend (2026-07-22, Exec 2): a feature `operation` não tem um `ConfirmDialog` reutilizável em `shared/ui` hoje. `RemoveEnrollmentAction` dispara dialog genérico; remoção usa `window.confirm` para evitar overhead de componente dedicado | Quando `shared/ui` padronizar um componente `ConfirmDialog` |
| P-12 | `ManualButton` chama `window.open` fora do stack síncrono do clique | Bloco 6-frontend (2026-07-23, Exec 3, decisão do João): o PDF do manual é buscado como blob (a rota exige o cookie de sessão) e a aba só abre no `onSuccess`, depois do round-trip. Bloqueadores de pop-up de Chrome/Firefox só liberam `window.open` disparado sincronamente por gesto do usuário — barrado, não há aba nem exceção nem mensagem. Corrigir muda UX (abrir aba em branco antes do fetch, ou trocar por download), então ficou fora do escopo da Exec 3 | Se o manual falhar em abrir num navegador real, ou na próxima revisão de UX da aba Documentación |

## Encerradas (mantidas 1 sprint para rastro, depois saem)

| ID | Pendência | Como fechou |
|---|---|---|
| P-07 | Chaves i18n de `operation.enrollment.manage`, `operation.turma.submit_docs` e `operation.turma.complete` ausentes nos 3 locales | Bloco 6-frontend Exec 3 (2026-07-23): as 8 chaves `perm.operation_*` já haviam sido criadas em `c48496c` (Bloco 5.4) nos 3 locales — `grep -c '"operation_'` devolve 8 em `es-CL.json`, `pt-BR.json` e `en.json`, incluindo `operation_enrollment_manage`, `operation_turma_submit_docs` e `operation_turma_complete`; a Exec 3 confirmou a origem por `git log -S`. Click-through do picker de Roles nos 3 idiomas fica com o João (sessão sem browser tool). Decisão D11 da spec |