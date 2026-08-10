# Spec — Hardening de revisão UI/UX assistida por navegador

- **Work item:** `hardening-revisao-ui-assistida`
- **Context packet:** `null` — não há regra de negócio externa a recuperar
- **Branch:** `chore/hardening-ui-review`
- **Base da seleção:** `a81c41c`
- **Fontes Lotus:** `AGENTS.md`, `CLAUDE.md`, `INSTRUÇÕES-DO-PROJETO.md`,
  `docs/superpowers/state.md`, `docs/superpowers/progress.md`,
  `docs/superpowers/backlog.md`, `docs/estrutura-monolito.md`,
  `.claude/commands/planejar-bloco.md`, `.claude/commands/revisar-ui.md` e o
  plano-mestre aprovado pelo João

---

## §1 — Problema e posição real na fila

O Lotus já possui revisão estrutural de frontend, mas não possui um protocolo versionado e
reutilizável para um agente inspecionar uma tela real no navegador, separar evidência visual de
sinais técnicos e devolver achados sem alterar a interface silenciosamente. A ausência desse
mecanismo deixou checkpoints visuais dependentes da disponibilidade pontual de browser e de um
roteiro mantido em conversa.

Este é um bloco independente. O plano-mestre de 2026-08-08 o posicionava antes de “Certificação ·
frontend”, mas esse item já estava entregue e fechado quando o Gate 4 começou. O João reconciliou
a divergência em 2026-08-09: o hardening é executado agora, depois da certificação e antes de
“Arquivados e restauração de soft-delete”. A ordem histórica obsoleta não governa esta spec.

O bloco entrega infraestrutura e instruções de revisão. Ele não corrige achados do piloto e não
transforma a revisão manual em suíte E2E.

## §2 — Objetivo, escopo e não objetivos

**Objetivo:** tornar reproduzível, segura e compartilhada entre Codex e Claude Code a revisão
local de uma única tela ou jornada read-only do Lotus, usando Playwright CLI como mecanismo
obrigatório e Chrome DevTools MCP como diagnóstico complementar.

**Entra:**

1. preflight determinístico do ambiente local;
2. skill canônica e agent-neutral em `.agents/skills/lotus-ui-review/`;
3. régua de revisão e contrato de relatório A/B/C;
4. adaptador mínimo para Claude Code;
5. compatibilidade do comando existente `/revisar-ui`;
6. evidências locais ignoradas pelo Git;
7. matriz de descoberta, bloqueios e degradação;
8. piloto read-only na aba Clientes de `/comercial`, nos dois agentes, após o Gate 5.

**Fica fora:**

- corrigir ou refatorar UI como consequência da revisão;
- revisar todo o frontend numa única execução;
- escrever ou versionar testes E2E;
- integrar axe, CI ou um test runner de navegador ao frontend;
- adicionar dependência a `frontend/package.json`;
- versionar sessão, credencial, screenshot ou configuração MCP da máquina;
- acessar ambiente de produção;
- recuperar Figma, Drive ou Notion quando a execução não tiver uma referência explícita.

## §3 — Arquitetura da solução

### D1 — Fonte canônica agent-neutral

O protocolo vive em `.agents/skills/lotus-ui-review/`. O frontmatter canônico contém apenas
`name` e `description`, sem campos exclusivos de um agente. A pasta é dividida por responsabilidade:

| Unidade | Responsabilidade |
|---|---|
| `SKILL.md` | ordem da execução, gates, bloqueios e contrato de não mutação |
| `scripts/preflight.sh` | provar pré-requisitos obrigatórios e disponibilidade local |
| `references/review-rubric.md` | critérios observáveis e prevenção de falsos positivos |
| `references/report-template.md` | formato auditável do resultado |

O adaptador `.claude/skills/lotus-ui-review/SKILL.md` apenas declara controles de invocação do
Claude Code e manda ler a fonte canônica integralmente. Ele não duplica régua nem workflow.

O comando `.claude/commands/revisar-ui.md` permanece como entrada legada: valida que há uma única
superfície, distingue revisão visual de `/revisar-frontend` e encaminha para a skill canônica.

### D2 — Ferramentas e dependências

Playwright CLI é obrigatório para navegação, snapshot, interação, screenshots e inspeção de
console/rede. Chrome DevTools MCP é opcional: pode complementar investigação de performance,
console ou rede, mas sua ausência nunca invalida uma execução que o Playwright conclua.

A v0.1 usa ferramentas instaladas na máquina. Não instala `@playwright/test`,
`@axe-core/playwright` ou outra dependência no frontend. Perfis e servidores MCP permanecem em
configuração pessoal, fora do repositório.

### D3 — Evidência local e isolada

Cada execução cria diretório próprio sob `.artifacts/ui-review/<data-hora>-<slug>/` e sessão
Playwright exclusiva. `.playwright-cli/` e `.artifacts/ui-review/` ficam no `.gitignore`.
Screenshots, snapshots e logs são evidência efêmera, não artefatos de produto.

A skill registra branch/commit e `git status --short` antes e depois. A revisão não altera código,
estado operacional, dados funcionais da aplicação nem WIP preexistente; o login manual cria apenas
a sessão autenticada necessária para a observação.

## §4 — Protocolo de execução

Uma rodada segue esta ordem:

1. receber exatamente uma tela ou jornada local;
2. carregar regras Lotus, estado operacional, regra frontend e somente os arquivos da superfície;
3. registrar Git e preservar WIP;
4. rejeitar URL que não seja local;
5. executar o preflight;
6. criar evidência e sessão exclusivas;
7. abrir browser headed, aguardar login manual e limpar a leitura de rede após o login;
8. operar em ciclos `snapshot → interação → novo snapshot`;
9. usar screenshot, e não snapshot, para julgamento de layout;
10. percorrer somente interações read-only;
11. repetir a jornada em `1440×900`, `1024×768` e `390×844`;
12. consultar console e rede;
13. usar Chrome DevTools somente quando disponível e necessário;
14. classificar pela régua e produzir o relatório obrigatório;
15. confirmar Git antes/depois e declarar as mutações realizadas;
16. encerrar a sessão, manter evidências ignoradas e aguardar aprovação antes de qualquer correção.

Login manual cria apenas a sessão autenticada necessária para observação. Depois do login, o
piloto não executa criação, edição, exclusão, upload, revogação ou outra escrita funcional.

## §5 — Régua e contrato de achados

A régua avalia, nesta ordem:

1. conclusão da jornada e affordance;
2. hierarquia visual e ação primária;
3. espaçamento, densidade e ritmo;
4. responsividade e overflow;
5. estados normal, loading, vazio, erro, disabled e read-only;
6. teclado, foco, labels, contraste e alvos clicáveis;
7. consistência com telas irmãs, `shared/ui`, PrimeReact e ADR-16;
8. localização `es-CL` e clareza do texto;
9. console, rede e performance complementar.

Cada eixo define observação obrigatória, evidência mínima, condições A/B/C e falsos positivos a
evitar. A classificação significa:

- **A — adequado:** comportamento ou apresentação confirmados;
- **B — melhorável:** impacto real, mas sem defeito funcional comprovado;
- **C — defeito:** jornada, acessibilidade, estado ou apresentação quebrados com reprodução.

O relatório admite no máximo dez achados. Itens A podem ser agrupados na síntese; cada B ou C
exige reprodução e evidência própria. Todo achado separa fato observado, inferência, impacto e
recomendação. Gosto pessoal sem impacto não vira achado.

O contrato é delimitado pelos markers `BEGIN LOTUS UI REVIEW REPORT` e
`END LOTUS UI REVIEW REPORT`. Ele registra superfície, URL local, branch/commit, data/hora, agente,
Playwright, uso ou indisponibilidade do Chrome DevTools, Git antes/depois, matriz de cobertura por
viewport, console, rede, performance, estados não testados, achados e síntese A/B/C. Ao final,
declara explicitamente as mutações e mudanças de código realizadas.

Screenshot não prova interação; snapshot de acessibilidade não prova layout. Resposta 4xx esperada
por autorização não é automaticamente defeito. Estado inalcançável sem mutação é declarado como
não testado. Figma só é comparação quando arquivo e node tiverem sido recuperados de fato.

Recomendações devem respeitar as regras Lotus: PrimeReact somente via `shared/ui`, Tailwind para
layout e variáveis do tema para cor. A revisão propõe; nunca aplica correção silenciosa.

## §6 — Bloqueios e degradação

A execução retorna `BLOCKED` quando:

- o escopo está ausente ou contém mais de uma tela/jornada;
- estado, branch ou âncoras Lotus divergem;
- frontend ou backend local estão inalcançáveis;
- Playwright CLI está ausente;
- a URL não é local;
- a jornada exige escrita não autorizada;
- o login manual não foi concluído.

Chrome DevTools ausente produz `complementary_unavailable` e a revisão continua. Estados que não
podem ser alcançados sem mutação entram em `Untested states`; não autorizam a skill a fabricar
dados ou alterar a aplicação.

## §7 — Piloto read-only

A mesma superfície será executada no Codex e no Claude Code:

`/comercial` → aba Clientes → buscar → visualizar o primeiro cliente → navegar por teclado → fechar.

As três viewports são obrigatórias nas duas execuções. O piloto mede a skill, a consistência entre
agentes e o contrato de evidência; os achados não serão corrigidos neste bloco.

O piloto depende do Gate 5 explícito:

`APROVADO GATE 5 — executar o piloto com a skill nos dois agentes.`

## §8 — Mapa autorizado da futura implementação

| Path | Mudança permitida |
|---|---|
| `.agents/skills/lotus-ui-review/**` | skill canônica, script e referências |
| `.claude/skills/lotus-ui-review/**` | adaptador Claude mínimo |
| `.claude/commands/revisar-ui.md` | roteamento de compatibilidade |
| `.gitignore` | ignorar sessões e evidências locais |
| `docs/superpowers/**` | spec, plano e transições do workflow |

Não entram `.mcp.json`, `.codex/config.toml`, `frontend/package.json`, `frontend/src/**` ou
`backend/**`.

## §9 — Invariantes

1. Uma execução cobre uma única superfície.
2. Playwright CLI permanece o mecanismo obrigatório.
3. Chrome DevTools permanece opcional e degradável.
4. Nenhuma interação funcional mutável ocorre depois do login.
5. Nenhum achado produz alteração automática de código.
6. Evidências e sessões não entram no Git.
7. O protocolo canônico existe uma vez; adaptadores apenas o encaminham.
8. Frontend, backend, schema, RBAC, tipos gerados e dependências permanecem intocados.
9. `context_packet` permanece `null` durante o bloco.
10. O piloto só começa após o Gate 5.

## §10 — Definition of done

Cada item precisa de prova executada:

| # | Prova |
|---|---|
| 1 | `preflight.sh` passa em `bash -n`, falha com exit `1` e `BLOCKED:` contra URL inexistente e termina com `PREFLIGHT_OK` contra o Lotus local |
| 2 | A skill canônica passa no validador de skills e não contém placeholders |
| 3 | O adaptador Claude tem no máximo 15 linhas e não duplica a régua |
| 4 | Codex descobre `lotus-ui-review` pela fonte `.agents/skills`; Claude descobre `/lotus-ui-review` e `/revisar-ui` |
| 5 | A matriz prova: escopo amplo bloqueia, frontend desligado bloqueia, Playwright ausente bloqueia, URL de produção bloqueia, pedido de correção não muta e MCP ausente degrada sem abortar |
| 6 | Solicitação de backend não invoca a skill; Figma não recuperado não produz comparação inventada; WIP existente é preservado |
| 7 | Após o Gate 5, Codex e Claude executam o mesmo piloto nas três viewports e produzem relatórios no contrato A/B/C |
| 8 | Cada piloto registra screenshots inspecionados, cobertura, console, rede, estados não testados e no máximo dez achados |
| 9 | Em cada piloto, `git status --short` antes/depois confirma nenhuma mutação de código ou estado; o relatório declara `Mutations performed: none` e `Code changes performed: none` |
| 10 | `git diff --check` passa; evidências permanecem ignoradas; `frontend/package.json`, `.mcp.json`, configuração Codex do repo, frontend e backend ficam sem diff |

## §11 — Decisões fechadas

1. bloco independente, executado na ordem real reconciliada da §1;
2. Playwright CLI obrigatório e Chrome DevTools opcional;
3. fonte agent-neutral em `.agents/skills` e adaptador Claude;
4. execução manual e local na v0.1;
5. uma superfície por execução;
6. piloto read-only em `/comercial`, aba Clientes;
7. viewports `1440×900`, `1024×768` e `390×844`;
8. relatório A/B/C com evidência e máximo de dez achados;
9. nenhuma correção silenciosa;
10. nenhuma dependência nova em `frontend/package.json`;
11. evidências ignoradas pelo Git;
12. MCP e configuração de máquina fora do repositório;
13. E2E, axe e CI fora de escopo;
14. `context_packet: null`.

## §12 — Referências técnicas

- OpenAI — Build skills: <https://developers.openai.com/codex/build-skills>
- Microsoft — Playwright CLI: <https://playwright.dev/docs/getting-started-cli>
- Microsoft — skills do Playwright CLI: <https://playwright.dev/agent-cli/skills>
- Google — Chrome DevTools MCP: <https://github.com/ChromeDevTools/chrome-devtools-mcp>
- Anthropic — skills do Claude Code: <https://code.claude.com/docs/en/skills>

Essas fontes orientam interoperabilidade e uso das ferramentas. Regras Lotus, esta spec e as
decisões explícitas do João governam escopo, segurança e critérios de aceite.
