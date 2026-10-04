# Papéis — modelo e esforço por despacho

A ferramenta `Agent` aceita `model` por chamada, mas **não aceita esforço**: esforço só vem do
frontmatter de um agente em `.claude/agents/`. Por isso cada papel que os commands de bloco
despacham é um agente, chamado por `subagent_type`. Esta tabela é a única lista deles, e
`.claude/tests/commands.tests.sh` reprova quando ela e `.claude/agents/` divergem em qualquer
sentido — nome, modelo ou esforço.

| Agente | Papel | model | effort |
|---|---|---|---|
| `implementador-mecanico` | task com código pronto no plano, 1–2 arquivos | sonnet | medium |
| `implementador-integracao` | task multi-arquivo ou com decisão de padrão | sonnet | high |
| `revisor-task` | revisão de task na SDD | sonnet | high |
| `re-revisor` | re-revisão escopada de rodada de correção | sonnet | medium |
| `corretor-tardio` | implementador nas rodadas de correção 4–5 | sonnet | max |
| `revisor-branch` | revisão final da branch na SDD | opus | high |
| `revisor-bloco` | lente 1 do `/revisar-bloco` | opus | high |
| `verificador-achado` | lente 2, um por achado | sonnet | medium |
| `contexto-leitor` | levantamento de contexto somente-leitura | sonnet | medium |
| `auditor-docs` | auditoria de docs contra o código (skill `auditar-docs`) | sonnet | medium |

## Regras

- **Alias sempre, nunca ID.** `opus`, `sonnet`, `haiku`, `fable`.
- **`--max` tem uma definição só:** sobe `sonnet` para `opus` em todo despacho do command, pelo
  parâmetro `model` do `Agent`. O esforço de cada papel continua o do frontmatter dele, e o da
  sessão continua o do frontmatter do command.
- **Papel novo** nasce aqui e em `.claude/agents/` no mesmo commit; a catraca cobra os dois lados.
