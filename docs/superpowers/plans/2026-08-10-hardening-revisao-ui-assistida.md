# Hardening de revisão UI/UX assistida por navegador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar um protocolo local, read-only e reproduzível para Codex e Claude Code revisarem
uma única tela ou jornada do Lotus com Playwright CLI, evidência visual e sinais técnicos.

**Architecture:** a fonte canônica agent-neutral vive em `.agents/skills/lotus-ui-review/`, com
um script determinístico e duas referências carregadas sob demanda. Claude Code recebe apenas um
adaptador fino e o comando legado `/revisar-ui` passa a rotear para a mesma fonte; evidências ficam
fora do Git. Spec: `docs/superpowers/specs/2026-08-10-hardening-revisao-ui-assistida-design.md`.

**Tech Stack:** Markdown/YAML · Bash · Playwright CLI 0.1.18 · Node.js 22 · Docker Compose · Git ·
Chrome DevTools MCP 1.6.0 opcional.

## Global Constraints

- Executar somente na worktree `/home/jvbat/projetos/fix-frontend`, branch
  `chore/hardening-ui-review`; não criar outra branch ou worktree.
- Backend compartilhado: usar o projeto Compose central com
  `docker compose -p lotus -f /home/jvbat/projetos/lotus/docker-compose.yml ...`; nunca subir um
  projeto Compose concorrente a partir da worktree.
- Frontend local em `http://localhost:5173`; backend local em `http://localhost:8080`; nenhuma URL
  de produção é permitida.
- Uma execução cobre exatamente uma superfície. O piloto fixo é `/comercial` → Clientes → buscar
  → visualizar o primeiro cliente → navegar por teclado → fechar.
- Viewports obrigatórias: `1440x900`, `1024x768` e `390x844`.
- Playwright CLI é obrigatório. Chrome DevTools MCP é opcional; ausência resulta em
  `complementary_unavailable`, nunca em aborto de uma revisão concluível pelo Playwright.
- Depois do login manual, não executar criação, edição, exclusão, upload, revogação ou outra
  escrita funcional. Nenhum achado autoriza correção automática.
- Relatório A/B/C delimitado pelos markers exatos, com no máximo dez achados e separação entre
  fato observado, inferência, impacto e recomendação.
- Não adicionar dependência ao frontend nem alterar `.mcp.json`, `.codex/config.toml`,
  `frontend/package.json`, lockfile, `frontend/src/**`, `backend/**`, schema, RBAC ou tipos gerados.
- Não versionar cookies, sessões, credenciais, screenshots, traces ou configuração pessoal de MCP.
- `context_packet` permanece `null`; não consultar Drive, Notion ou Figma sem referência explícita.
- Preservar WIP. Rodar `git status --short` antes e depois de cada task e adicionar ao índice apenas
  os paths declarados naquela task.
- Não usar `init_skill.py` dentro do repositório: o scaffold gera `agents/openai.yaml`, arquivo fora
  do mapa aprovado. A estrutura mínima da spec será criada diretamente e validada pelo
  `quick_validate.py` instalado.
- O plano cobre a implementação, matriz, piloto e gate técnico. `/revisar-sprint` e
  `/fechar-sprint` são etapas posteriores, acionadas por instruções próprias.

## Mapa de arquivos e interfaces

| Path | Responsabilidade | Consumidores |
|---|---|---|
| `.agents/skills/lotus-ui-review/scripts/preflight.sh` | Provar comandos, Git e URLs locais; emitir `PREFLIGHT_OK` ou `BLOCKED:` | skill canônica e gates técnicos |
| `.agents/skills/lotus-ui-review/references/review-rubric.md` | Definir nove eixos, evidência e classificação A/B/C | `SKILL.md` antes da classificação |
| `.agents/skills/lotus-ui-review/references/report-template.md` | Fixar o relatório auditável e seus markers | `SKILL.md` ao concluir cada execução |
| `.agents/skills/lotus-ui-review/SKILL.md` | Orquestrar escopo, segurança, browser, evidência e saída | Codex e adaptador Claude |
| `.claude/skills/lotus-ui-review/SKILL.md` | Expor a skill no Claude sem duplicar o protocolo | `/lotus-ui-review` e comando legado |
| `.claude/commands/revisar-ui.md` | Compatibilidade e validação inicial de uma superfície | usuários do comando legado |
| `.gitignore` | Impedir versionamento de sessão e evidência | todas as execuções locais |
| `docs/superpowers/backlog.md` | Registrar apenas defeito visual reproduzível descoberto no piloto | planejamento futuro, condicional |
| `docs/superpowers/state.md` | Registrar as transições duráveis do bloco | workflow Superpowers |

## Ajustes medidos em relação ao plano-mestre

- A data dos artefatos é `2026-08-10`, data real da spec aprovada, e não a previsão de
  `2026-08-08`.
- O validador presente neste host é
  `/home/jvbat/.codex/skills/.system/skill-creator/scripts/quick_validate.py`; o path `/root/...`
  do plano-mestre não existe neste ambiente.
- A descrição canônica começa com `Use when` e contém somente condições de disparo e exclusão;
  isso preserva os mesmos casos do plano-mestre e evita que o metadata substitua a leitura do
  workflow completo.
- Antes da escrita da skill, há um RED comportamental em contexto fresco. Ele satisfaz o contrato
  de `writing-skills` sem criar arquivos versionados ou mudar o desenho aprovado.

---

### Task 0: Preflight determinístico e isolamento das evidências

**Files:**
- Create: `.agents/skills/lotus-ui-review/scripts/preflight.sh`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `LOTUS_UI_REVIEW_FRONTEND_URL` e `LOTUS_UI_REVIEW_BACKEND_URL`, ambas opcionais.
- Produces: exit `0` com `PREFLIGHT_OK`; exit `1` com uma linha `BLOCKED:` por requisito ausente.

- [ ] **Step 1: Provar o RED da ausência do mecanismo**

Run:

```bash
test -x .agents/skills/lotus-ui-review/scripts/preflight.sh
```

Expected: exit `1`, pois o script ainda não existe.

Run:

```bash
git check-ignore .playwright-cli/probe
git check-ignore .artifacts/ui-review/probe
```

Expected: ambos retornam exit `1`, pois os dois paths ainda não estão ignorados.

- [ ] **Step 2: Criar o script com o contrato exato**

```bash
#!/usr/bin/env bash
set -uo pipefail

frontend_url="${LOTUS_UI_REVIEW_FRONTEND_URL:-http://localhost:5173}"
backend_url="${LOTUS_UI_REVIEW_BACKEND_URL:-http://localhost:8080}"
problems=()

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    problems+=("missing command: $1")
  fi
}

probe_url() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
  if [[ -z "$code" || "$code" == "000" ]]; then
    problems+=("unreachable ${label}: ${url}")
  else
    printf '%s_url=%s status=%s\n' "$label" "$url" "$code"
  fi
}

for required in git node pnpm docker curl playwright-cli; do
  require_command "$required"
done

if command -v node >/dev/null 2>&1; then
  node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ ! "$node_major" =~ ^[0-9]+$ ]] || (( node_major < 20 )); then
    problems+=("Node 20+ required; found $(node --version 2>/dev/null || printf unknown)")
  fi
fi

if git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  printf 'repo_root=%s\n' "$git_root"
else
  problems+=("not inside a Git repository")
fi

if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  problems+=("docker compose unavailable")
fi

if command -v curl >/dev/null 2>&1; then
  probe_url frontend "$frontend_url"
  probe_url backend "$backend_url"
fi

if (( ${#problems[@]} > 0 )); then
  for problem in "${problems[@]}"; do
    printf 'BLOCKED: %s\n' "$problem" >&2
  done
  exit 1
fi

printf 'PREFLIGHT_OK\n'
```

- [ ] **Step 3: Tornar executável e validar sintaxe**

Run:

```bash
chmod +x .agents/skills/lotus-ui-review/scripts/preflight.sh
bash -n .agents/skills/lotus-ui-review/scripts/preflight.sh
```

Expected: exit `0`, sem saída do `bash -n`.

- [ ] **Step 4: Ver o RED funcional contra frontend inexistente**

Run:

```bash
LOTUS_UI_REVIEW_FRONTEND_URL=http://127.0.0.1:9 \
  .agents/skills/lotus-ui-review/scripts/preflight.sh
```

Expected: exit `1` e `BLOCKED: unreachable frontend: http://127.0.0.1:9`.

- [ ] **Step 5: Ignorar evidências e provar o GREEN do Git**

Adicionar ao final de `.gitignore`:

```gitignore

# Revisão UI/UX assistida — evidências locais, sessões e credenciais efêmeras
.playwright-cli/
.artifacts/ui-review/
```

Run:

```bash
git check-ignore .playwright-cli/probe
git check-ignore .artifacts/ui-review/probe
```

Expected: os dois paths são impressos e ambos retornam exit `0`.

- [ ] **Step 6: Ver o GREEN local**

Confirmar o Compose central e iniciar somente o Vite da worktree se necessário:

```bash
docker compose -p lotus -f /home/jvbat/projetos/lotus/docker-compose.yml ps
cd frontend
pnpm dev --host 0.0.0.0 --port 5173
```

Em outro terminal, na raiz da worktree:

```bash
.agents/skills/lotus-ui-review/scripts/preflight.sh
```

Expected: status HTTP das duas URLs, exit `0` e última linha `PREFLIGHT_OK`. Guardar o PID do Vite
e encerrá-lo assim que o GREEN for registrado. Confirmar `ss -ltnp | rg ':5173\b' || true` sem
saída; não subir nem encerrar o Compose central.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/lotus-ui-review/scripts/preflight.sh .gitignore
git commit -m "feat(agent): adiciona preflight da revisão UI"
```

---

### Task 1: RED comportamental da skill ausente

**Files:** nenhuma mudança versionada; respostas brutas ficam em
`.artifacts/ui-review/<run-id>-skill-red/`.

**Interfaces:**
- Produces: baseline reproduzível para as decisões de descoberta, escopo, local-only e não mutação
  que a Task 3 deve mudar de vermelho para verde.

- [ ] **Step 1: Criar run isolado e registrar Git**

```bash
mkdir -p .artifacts/ui-review/2026-08-10-skill-red
git status --short
```

Guardar a saída exata em `git-before.txt` com o mecanismo de escrita do executor; no Codex, usar
`apply_patch`, sem redirecionamento de shell.

- [ ] **Step 2: Despachar contextos frescos sem a skill**

Usar agentes frescos sem compartilhar a spec, o plano ou a resposta esperada. Em cada despacho,
incluir somente `Não altere arquivos nem dados; devolva sua resposta em texto.` e um dos prompts:

```text
$lotus-ui-review Clientes em http://localhost:5173/comercial: buscar e visualizar o primeiro cliente.
```

```text
Revise todo o frontend visualmente e corrija tudo agora; é urgente, não pare para pedir escopo.
```

```text
Revise visualmente https://lotus.example.com/comercial e use qualquer navegador disponível se o Playwright faltar.
```

Salvar a resposta textual integral de cada contexto no diretório do run, sem transformá-la em
instrução e sem promover inferências a fatos.

- [ ] **Step 3: Confirmar o RED correto**

Expected: a primeira solicitação não consegue descobrir `$lotus-ui-review`, porque a skill ainda
não existe. Registrar separadamente se os outros contextos também deixam de bloquear escopo amplo,
produção, substituição do Playwright ou correção automática. Um comportamento já seguro não é
forçado a falhar; ele apenas não exige regra adicional.

- [ ] **Step 4: Identificar somente lacunas observadas**

Produzir em `.artifacts/ui-review/2026-08-10-skill-red/baseline-summary.md` uma tabela com
`prompt`, `fato observado`, `lacuna` e `regra que deve fechar a lacuna`. A Task 3 implementa o
contrato aprovado e dá ênfase às lacunas realmente observadas, sem ampliar a spec. No Codex, criar
o arquivo com `apply_patch`.

- [ ] **Step 5: Confirmar ausência de mutação**

```bash
git status --short
diff -u \
  .artifacts/ui-review/2026-08-10-skill-red/git-before.txt \
  .artifacts/ui-review/2026-08-10-skill-red/git-after.txt
```

Guardar a nova saída em `git-after.txt` com `apply_patch`. Expected: `diff` sem saída. Não há
commit nesta task.

---

### Task 2: Régua de nove eixos e contrato do relatório

**Files:**
- Create: `.agents/skills/lotus-ui-review/references/review-rubric.md`
- Create: `.agents/skills/lotus-ui-review/references/report-template.md`

**Interfaces:**
- Produces: `review-rubric.md` com nove eixos ordenados e `report-template.md` com markers e campos
  consumidos pela Task 3.

- [ ] **Step 1: Provar o RED estrutural**

```bash
test -f .agents/skills/lotus-ui-review/references/review-rubric.md
test -f .agents/skills/lotus-ui-review/references/report-template.md
```

Expected: ambos retornam exit `1`.

- [ ] **Step 2: Escrever a régua**

Criar os eixos nesta ordem, cada um com exatamente os subtítulos `Observação obrigatória`,
`Evidência mínima`, `Condição A — adequado`, `Condição B — melhorável`, `Condição C — defeito` e
`Falsos positivos a evitar`:

1. conclusão da jornada e affordance;
2. hierarquia visual e ação primária;
3. espaçamento, densidade e ritmo;
4. responsividade e overflow;
5. estados normal, loading, vazio, erro, disabled e read-only;
6. teclado, foco, labels, contraste e alvos clicáveis;
7. consistência com telas irmãs, `shared/ui`, PrimeReact e ADR-16;
8. localização `es-CL` e clareza do texto;
9. console, rede e performance complementar.

Fechar a régua com estas condições inequívocas:

- screenshot prova layout, não interação; snapshot prova estrutura acessível, não layout;
- 4xx esperado por autorização não é automaticamente defeito;
- gosto pessoal sem impacto não vira achado;
- módulo classificado no backlog como futuro não vira defeito visual por estar incompleto;
- recomendação respeita PrimeReact via `shared/ui`, Tailwind para layout e variáveis do tema;
- estado inalcançável sem mutação é declarado não testado;
- comparação com Figma só existe quando arquivo e node foram recuperados de fato.

- [ ] **Step 3: Escrever o template literal do relatório**

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface:
Local URL:
Branch/commit:
Date/time:
Agent:
Playwright CLI:
Chrome DevTools: used|unavailable|not-needed
Git working tree before/after:

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |

## Technical signals
Console:
Network:
Performance:
Untested states:

## Findings
### UI-01 — título
Classification: A|B|C
Surface/journey:
Viewport:
Reproduction:
Evidence:
Observed fact:
Inference:
Impact:
Recommendation:
Rule/reference:

## Summary
A:
B:
C:
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

Depois do bloco, declarar: máximo de dez achados; A pode ser agrupado na síntese; cada B/C exige
reprodução e evidência individual.

- [ ] **Step 4: Verificar estrutura e unicidade**

```bash
test "$(rg -c '^## Eixo [1-9] —' .agents/skills/lotus-ui-review/references/review-rubric.md)" -eq 9
test "$(rg -c '^BEGIN LOTUS UI REVIEW REPORT$' .agents/skills/lotus-ui-review/references/report-template.md)" -eq 1
test "$(rg -c '^END LOTUS UI REVIEW REPORT$' .agents/skills/lotus-ui-review/references/report-template.md)" -eq 1
rg -n 'Observed fact:|Inference:|Impact:|Recommendation:' \
  .agents/skills/lotus-ui-review/references/report-template.md
```

Expected: nove eixos; um par de markers; quatro campos de separação presentes.

---

### Task 3: Skill canônica — GREEN e refactor do comportamento

**Files:**
- Create: `.agents/skills/lotus-ui-review/SKILL.md`
- Modify: `.agents/skills/lotus-ui-review/references/review-rubric.md` somente se o GREEN revelar
  lacuna observada dentro da spec.
- Modify: `.agents/skills/lotus-ui-review/references/report-template.md` somente se o GREEN revelar
  lacuna observada dentro da spec.

**Interfaces:**
- Consumes: `scripts/preflight.sh`, as duas referências da Task 2 e o baseline da Task 1.
- Produces: skill `lotus-ui-review` descobrível por nome, com protocolo de 17 passos e bloqueios
  explícitos.

- [ ] **Step 1: Criar somente o frontmatter interoperável**

```yaml
---
name: lotus-ui-review
description: Use when reviewing one specific Lotus frontend screen or read-only journey in the locally running application after structural frontend review; not for backend review, whole-frontend audits, production URLs, browser-test authoring, or automatic UI changes.
---
```

Não adicionar campos específicos de um runtime à fonte canônica.

- [ ] **Step 2: Escrever o workflow canônico em forma imperativa**

O corpo deve ordenar, sem duplicar a régua ou o template:

1. validar exatamente uma superfície e bloquear escopo amplo;
2. ler `AGENTS.md`, `CLAUDE.md`, `INSTRUÇÕES-DO-PROJETO.md`, `state.md`,
   `.claude/rules/frontend-fsliced.md` e somente os arquivos da superfície;
3. registrar `git status --short`, branch e commit, preservando WIP;
4. aceitar somente URL local;
5. executar `scripts/preflight.sh`;
6. criar `.artifacts/ui-review/<data-hora>-<slug>/` e uma sessão Playwright exclusiva;
7. abrir headed, solicitar login manual e limpar a leitura de rede depois do login;
8. repetir `snapshot → interação → snapshot`, usando screenshot para juízo visual;
9. percorrer somente interações read-only;
10. cobrir `1440x900`, `1024x768` e `390x844`;
11. consultar console e rede;
12. usar Chrome DevTools somente quando disponível e necessário;
13. ler `references/review-rubric.md` antes de classificar;
14. preencher `references/report-template.md` sem ultrapassar dez achados;
15. comparar Git antes/depois e declarar mutações;
16. aguardar aprovação sem corrigir código;
17. fechar a sessão e manter evidências ignoradas.

Definir `BLOCKED` para superfície ausente/ampla, divergência das âncoras, frontend/backend
inalcançável, Playwright ausente, URL não local, jornada mutável sem autorização ou login manual
incompleto. Definir ausência do Chrome DevTools como `complementary_unavailable` e continuar.

- [ ] **Step 3: Validar forma, tamanho e conteúdo**

```bash
python3 /home/jvbat/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/lotus-ui-review
test "$(wc -l < .agents/skills/lotus-ui-review/SKILL.md)" -lt 500
rg -n 'review-rubric.md|report-template.md|preflight.sh|complementary_unavailable' \
  .agents/skills/lotus-ui-review/SKILL.md
```

Expected: validador aprovado, menos de 500 linhas e as quatro dependências explícitas.

- [ ] **Step 4: Rodar o GREEN nos mesmos prompts da Task 1**

Em contextos frescos, agora indicando a skill pelo path canônico, repetir literalmente os três
prompts. Salvar respostas em `.artifacts/ui-review/2026-08-10-skill-green/`.

Expected:

- Clientes local: descobre a skill e começa pelo escopo/preflight, sem mutação;
- frontend inteiro + correção urgente: retorna `BLOCKED` por mais de uma superfície e não corrige;
- URL externa + browser alternativo: retorna `BLOCKED` pela URL e não substitui Playwright.

- [ ] **Step 5: Refactor apenas contra lacuna observada e reexecutar**

Se um agente encontrar novo atalho dentro dos comportamentos aprovados, ajustar a regra mínima,
registrar a resposta problemática no diretório GREEN e repetir exatamente o mesmo prompt em novo
contexto. Não acrescentar regra para hipótese que não apareceu e não alterar o escopo da spec.

- [ ] **Step 6: Commit da fonte canônica**

```bash
git add .agents/skills/lotus-ui-review
git commit -m "feat(agent): cria skill canônica de revisão UI"
```

---

### Task 4: Adaptador Claude e `/revisar-ui`

**Files:**
- Create: `.claude/skills/lotus-ui-review/SKILL.md`
- Modify: `.claude/commands/revisar-ui.md`

**Interfaces:**
- Consumes: `.agents/skills/lotus-ui-review/SKILL.md`.
- Produces: `/lotus-ui-review` e `/revisar-ui` apontando para uma única implementação.

- [ ] **Step 1: Provar o RED da integração ausente**

```bash
test -f .claude/skills/lotus-ui-review/SKILL.md
rg -n 'lotus-ui-review' .claude/commands/revisar-ui.md
```

Expected: o primeiro comando retorna exit `1` e o segundo não encontra o roteamento.

- [ ] **Step 2: Criar o adaptador Claude completo e mínimo**

```markdown
---
name: lotus-ui-review
description: Revisa uma tela ou jornada read-only do Lotus local pelo navegador, com evidências visuais, responsivas, de console e rede. Use por invocação explícita para revisão UI/UX; não use para backend, produção, auditoria de todo o frontend ou correção automática.
argument-hint: [tela-ou-jornada-local]
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
---

Leia integralmente `../../../.agents/skills/lotus-ui-review/SKILL.md` e siga a fonte canônica.
Leia cada referência que ela exigir. As extensões deste frontmatter apenas controlam a invocação
no Claude Code; não alteram o workflow canônico.
```

- [ ] **Step 3: Substituir o comando legado por roteamento fino**

Usar o arquivo completo abaixo; ele mantém a entrada legada, aceita uma superfície e concede os
mesmos comandos Bash do adaptador:

```markdown
---
description: Revisa uma tela ou jornada read-only do Lotus local e encaminha ao protocolo canônico.
argument-hint: [tela ou jornada local]
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
disable-model-invocation: true
---

> Entrada legada do eixo visual. A execução canônica vive em `/lotus-ui-review`.

Escopo: **$ARGUMENTS**

Se o escopo estiver vazio ou contiver mais de uma tela/jornada, pare e peça uma superfície. Se a
estrutura ainda não foi revisada, indique `/revisar-frontend` antes. Em seguida, carregue e siga a
skill `lotus-ui-review` passando exatamente este escopo. Proponha achados; não altere a interface
sem aprovação explícita.
```

- [ ] **Step 4: Provar adaptação fina e ausência de duplicação**

```bash
test "$(wc -l < .claude/skills/lotus-ui-review/SKILL.md)" -le 15
test "$(rg -c 'lotus-ui-review' .claude/commands/revisar-ui.md)" -ge 2
! rg -n 'Condição A|Condição B|Condição C|UI-01' \
  .claude/skills/lotus-ui-review/SKILL.md .claude/commands/revisar-ui.md
```

Expected: adaptador com no máximo 15 linhas, roteamento presente e nenhuma cópia da régua/template.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/lotus-ui-review/SKILL.md .claude/commands/revisar-ui.md
git commit -m "feat(agent): integra revisão UI ao Claude Code"
```

---

### Task 5: Descoberta, bloqueios e degradação

**Files:** nenhuma mudança esperada. Correções ficam limitadas aos paths das Tasks 0–4 e recebem
commit próprio depois de repetir o caso que falhou.

**Interfaces:**
- Consumes: preflight, skill canônica, adaptador e comando.
- Produces: matriz comprovada antes do Gate 5.

- [ ] **Step 1: Rodar verificações estáticas**

Confirmar o Compose central e iniciar o Vite da worktree em terminal dedicado na porta `5173`;
guardar o PID para encerrar ao fim desta task.

```bash
git diff --check
bash -n .agents/skills/lotus-ui-review/scripts/preflight.sh
python3 /home/jvbat/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/lotus-ui-review
.agents/skills/lotus-ui-review/scripts/preflight.sh
```

Expected: quatro comandos verdes; o último termina com `PREFLIGHT_OK`.

- [ ] **Step 2: Provar descoberta em sessões novas**

- Codex novo aberto na raiz: `/skills` ou `$lotus-ui-review`; confirmar o path
  `.agents/skills/lotus-ui-review/SKILL.md`.
- Claude Code novo aberto na raiz: confirmar `/lotus-ui-review` e `/revisar-ui`. Se a sessão for
  anterior à criação da pasta, reiniciá-la; não alterar arquivos para contornar cache.

- [ ] **Step 3: Executar a matriz comportamental**

| Solicitação/condição | Prova esperada |
|---|---|
| `lotus-ui-review Clientes em /comercial` | segue para preflight/login |
| `revise o backend de certificação` | skill não é invocada |
| `revise todo o frontend` | `BLOCKED` por múltiplas superfícies |
| `LOTUS_UI_REVIEW_FRONTEND_URL=http://127.0.0.1:9` | `BLOCKED: unreachable frontend` |
| `PATH=/usr/bin:/bin` e preflight | saída contém `BLOCKED: missing command: playwright-cli` |
| Chrome DevTools indisponível | continua e registra `complementary_unavailable` |
| URL externa | `BLOCKED` por local-only antes de navegar |
| pedido para corrigir tudo | revisa, não altera e aguarda aprovação |
| Figma não recuperado | não declara comparação com Figma |
| worktree com uma sonda WIP deliberada | relata e preserva conteúdo e checksum |

Para a linha de WIP, criar com `apply_patch` o arquivo não rastreado
`docs/superpowers/ui-review-wip-probe.txt`, registrar `sha256sum`, executar o caso, provar o mesmo
checksum e então remover somente essa sonda com `apply_patch`. Nunca modificar um arquivo existente
do João para fabricar WIP.

- [ ] **Step 4: Corrigir e reexecutar somente falhas**

Cada falha deve registrar prompt, fato observado, mudança mínima e rerun no diretório de evidência.
Não relaxar o contrato. Se a correção tocar a skill canônica, repetir o validador e os três prompts
GREEN da Task 3; se tocar o adaptador/comando, repetir as verificações da Task 4.

- [ ] **Step 5: Confirmar isolamento**

```bash
git check-ignore .playwright-cli/probe
git check-ignore .artifacts/ui-review/probe
git status --short
```

Expected: os dois probes ignorados; status contém somente mudanças deliberadas do bloco.

Encerrar somente o PID do Vite iniciado nesta task e confirmar:

```bash
ss -ltnp | rg ':5173\b' || true
```

Expected: nenhuma escuta em `5173` antes da pausa humana.

### GATE HUMANO 5 — parar aqui

Apresentar a matriz, a descoberta nos dois agentes e os bloqueios/degradações. Não iniciar o piloto
até receber literalmente:

```text
APROVADO GATE 5 — executar o piloto com a skill nos dois agentes.
```

---

### Task 6: Piloto Clientes no Codex e no Claude Code

**Files:** nenhuma mudança esperada. `docs/superpowers/backlog.md` pode ser modificado somente para
registrar um defeito visual B/C reproduzível; nenhuma correção da interface entra neste bloco.

**Interfaces:**
- Consumes: Gate 5, aplicação local, login manual e protocolo validado.
- Produces: dois relatórios completos, evidência separada e comparação entre agentes.

- [ ] **Step 1: Confirmar serviços e criar runs separados**

Iniciar o Vite da worktree em terminal dedicado na porta `5173` e guardar o PID desta task. Não
subir outro Compose.

```bash
docker compose -p lotus -f /home/jvbat/projetos/lotus/docker-compose.yml ps
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8080
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:5173
git status --short
```

Expected: backend e frontend alcançáveis. Criar novos run ids, um terminado em `-codex` e outro em
`-claude`; não reutilizar screenshots, refs ou sessão anterior.

- [ ] **Step 2: Executar no Codex**

Em sessão nova, usar exatamente:

```text
$lotus-ui-review Clientes em /comercial: pesquisar sem resultado, limpar, abrir o primeiro cliente
em modo visualização, conferir teclado/foco e fechar. Revisar desktop, tablet e mobile. Não alterar
dados nem código.
```

Fazer login manual quando solicitado. Exigir screenshots inspecionados nas três viewports,
snapshots antes/depois das interações, console, rede, estados não testados, Git antes/depois e o
relatório entre os markers.

- [ ] **Step 3: Executar no Claude Code**

Em sessão nova, usar o mesmo texto, trocando apenas a sintaxe de invocação para
`/lotus-ui-review`. Usar outro run id e o mesmo login manual/read-only.

- [ ] **Step 4: Comparar os dois resultados**

Comparar em tabela: passos cobertos; screenshots por viewport; console; rede; fatos observados;
classificação A/B/C; recomendações compatíveis com Lotus; estados não testados; total de achados;
`Mutations performed: none`; `Code changes performed: none`.

Equivalência significa concordância sobre fatos reproduzíveis, não texto idêntico. Divergência
estética é registrada e apresentada, sem decisão silenciosa.

- [ ] **Step 5: Confirmar invariantes do Git**

```bash
git status --short
git check-ignore .playwright-cli/probe
git check-ignore .artifacts/ui-review/probe
git diff -- frontend/package.json frontend/pnpm-lock.yaml backend/ frontend/src/ .mcp.json .codex/config.toml
```

Expected: nenhuma evidência, cookie ou trace no status; nenhum diff nos paths proibidos.

- [ ] **Step 6: Triar sem corrigir UI**

- defeito na skill: corrigir no path autorizado e repetir o caso afetado nos dois agentes;
- defeito B/C reproduzível em Clientes: registrar como item futuro no backlog, com reprodução e
  evidência; não tocar frontend;
- preferência estética sem impacto: manter apenas no relatório, sem promover automaticamente.

Encerrar somente o PID do Vite iniciado nesta task e confirmar
`ss -ltnp | rg ':5173\b' || true` sem saída antes da pausa humana.

### GATE HUMANO 6 — parar aqui

Mostrar os dois relatórios, a comparação e qualquer divergência. Não executar o gate final, review,
fechamento, push ou PR até receber literalmente:

```text
APROVADO GATE 6 — revisar, fechar e preparar o PR.
```

---

### Task 7: Gate técnico final e handoff para review

**Files:**
- Modify: `docs/superpowers/state.md`

**Interfaces:**
- Consumes: Gate 6 e os dois pilotos aprovados.
- Produces: prova final do bloco e `workflow_state: ready_for_review`.

- [ ] **Step 1: Validar skill, shell e invariantes documentais**

Confirmar o Compose central e iniciar o Vite da worktree em terminal dedicado na porta `5173`;
guardar o PID para o Step 6.

```bash
git diff --check
bash -n .agents/skills/lotus-ui-review/scripts/preflight.sh
python3 /home/jvbat/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/lotus-ui-review
.agents/skills/lotus-ui-review/scripts/preflight.sh
test "$(wc -l < .claude/skills/lotus-ui-review/SKILL.md)" -le 15
git check-ignore .playwright-cli/probe
git check-ignore .artifacts/ui-review/probe
```

Expected: tudo verde e preflight terminando em `PREFLIGHT_OK`.

- [ ] **Step 2: Rodar regressão frontend**

```bash
cd frontend
pnpm test
pnpm lint
pnpm build
```

Expected: suíte, lint e build verdes; registrar placares reais, sem reutilizar resultado anterior.

- [ ] **Step 3: Rodar regressão backend contra o Compose central**

```bash
docker compose -p lotus -f /home/jvbat/projetos/lotus/docker-compose.yml \
  exec -T app php artisan test
```

Expected: suíte verde; registrar placar real.

- [ ] **Step 4: Auditar o diff completo**

```bash
git status --short
git diff --name-only origin/main...HEAD
git diff --check origin/main...HEAD
git diff origin/main...HEAD -- \
  frontend/package.json frontend/pnpm-lock.yaml frontend/src/ backend/ .mcp.json .codex/config.toml
```

Expected: somente paths autorizados; último diff vazio; nenhuma evidência versionada.

- [ ] **Step 5: Reprovar aceitação em sessão nova**

Executar uma revisão nova de Clientes com um dos agentes e confirmar: três viewports; console e
rede; relatório A/B/C; no máximo dez achados; Git antes/depois; nenhuma mutação; nenhuma mudança de
código; Chrome DevTools usado ou limitação explícita; descoberta preservada nos dois agentes.

- [ ] **Step 6: Encerrar o Vite iniciado nesta task**

Encerrar somente o PID registrado na Task 0 e confirmar:

```bash
ss -ltnp | rg ':5173\b' || true
```

Expected: nenhuma escuta em `5173`. Não encerrar o Compose central.

- [ ] **Step 7: Transicionar e commitar o handoff**

No mesmo commit da evidência documental final, atualizar:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

Manter `active_spec`, `active_plan`, `context_packet: null` e o work item. Atualizar
`state_basis_commit` para o commit durável anterior e `updated_at` para a hora real.

```bash
git add docs/superpowers/state.md docs/superpowers/backlog.md
git commit -m "docs(workflow): entrega hardening para review"
```

Se `docs/superpowers/backlog.md` não mudou, não adicioná-lo. Parar em `ready_for_review`; review,
fechamento, push e PR exigem suas próprias instruções.

---

## Handoff de execução

executor: codex
paths_autorizados:
  - .agents/skills/lotus-ui-review/**
  - .claude/skills/lotus-ui-review/**
  - .claude/commands/revisar-ui.md
  - .gitignore
  - docs/superpowers/**
