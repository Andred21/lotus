---
description: Revisa o bloco da lane em duas lentes — gabarito do Lotus e verificação adversarial de cada achado.
argument-hint: "[NN]"
disable-model-invocation: true
model: opus
effort: high
---

# /revisar-bloco

Fase 3 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.5, com as emendas da
spec do bloco 35.

Argumento: `$ARGUMENTS`

## Regra de invocação de skill — leia antes de tudo

Toda skill citada abaixo é invocada pela ferramenta `Skill`, e a invocação é confirmada antes
do passo seguinte. **Nunca execute o processo de uma skill de cabeça.**

Se você pensar *"eu já conheço essa skill"* ou *"o conteúdo dela já está no meu contexto"*,
esse é o sinal de que o erro está prestes a acontecer — não uma dispensa. Este modo de falha
já se repetiu neste projeto: o agente lê "use a skill Y", reconhece o processo, e executa uma
versão de cabeça, pulando exatamente os gates que justificam a skill.

Se a `Skill` responder `Unknown skill` para um nome `superpowers:<skill>`, pare e peça ao João
que instale ou ative o plugin `superpowers@claude-plugins-official`. Nunca troque pelo nome
sem prefixo: ele carrega a cópia legada de `~/.claude/skills/`, que não tem o que estes commands
esperam.

## Passo 1 — Caveman

Invoque `Skill(caveman, "ultra")`. Confirme em uma linha que carregou.

## Passo 2 — Validar o estado

Descubra a branch atual (`git rev-parse --abbrev-ref HEAD`) e confira contra o regex de lane:
`^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. Fora desse padrão, pare: a revisão
acontece dentro da worktree do bloco, nunca no main tree. `bash .claude/scripts/lane.sh descobrir`
dá o inventário, se precisar confirmar qual lane é esta.

A pasta do bloco sai da branch — é a branch sem o `<tipo>/`: `docs/superpowers/blocos/<NN>-<slug>/`.
Se o argumento trouxer `NN` e ele divergir do `<NN>` da branch, pare: é a invariante 7, e revisar o
bloco errado é revisar o bloco do vizinho.

Leia o `estado.md` dessa pasta e confira, nesta ordem. Divergência em qualquer item para a sessão —
**não conserte o arquivo**, relate:

0. `workflow_state` não é `blocked`. Se for, pare: relate `blocker` e `resume_state`. Sair de
   `blocked` é decisão do João, não deste command.
1. `workflow_state` é `ready_for_review` ou `reviewing`. Se não for, pare e diga qual é o command
   certo para o estado atual.
2. `branch` do estado é igual à branch atual: as duas descrevem a mesma lane por caminhos
   diferentes (Git e arquivo), e divergirem é sinal de `estado.md` desatualizado ou de sessão na
   worktree errada.

Vindo de `ready_for_review`, **não escreva `reviewing` agora**: sem achado nenhum ainda, não há
artefato que prove a transição (invariante 6). Ela entra no commit do `revisao.md`, no Passo 8.

## Passo 3 — Montar o diff

```bash
branch=$(git rev-parse --abbrev-ref HEAD)
[[ $branch =~ ^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$ ]] || { echo "esta arvore nao e lane: $branch"; exit 1; }
nn=${BASH_REMATCH[2]}
git fetch origin
base=$(git merge-base origin/main HEAD); head=$(git rev-parse HEAD)
saida=$(mktemp "${TMPDIR:-/tmp}/lotus-revisao-$nn-XXXXXX.txt")
{ git log --oneline "$base..$head"; git diff --stat "$base..$head"; git diff -U10 "$base..$head"; } > "$saida"
echo "$saida"
echo "$(git rev-parse --short "$base")..$(git rev-parse --short "$head")"
```

A última linha imprime, em SHA curto, o intervalo revisado — é o que abre a Rodada no Passo 7.
**Cada chamada da ferramenta Bash é um shell novo**: `$saida`, `$base` e `$head` não sobrevivem
para o passo seguinte. Anote os dois valores que este bloco imprime — o caminho do arquivo e o
intervalo — e use-os **literalmente** dali para frente; o `rm` do Passo 7 apaga o caminho impresso
aqui, nunca `rm "$saida"`, que não existe mais numa chamada nova.

**Nunca cole o diff no seu contexto** e nunca o grave em `docs/`: ele vai como caminho de arquivo
para os subagentes.

## Passo 4 — Lente 1: revisão

Classifique o bloco em uma linha, antes de despachar qualquer revisor:

- **Alto risco** — tocou qualquer domínio das leis §5 (migration/schema, `generated.ts`, auth/
  Sanctum, auditoria, RBAC), dinheiro, certificados/documentos legais, ou foi executado via
  `executor: codex`.
- **Baixo risco** — todo o resto (ex.: frontend visual sem regra de negócio).

Invoque `Skill(superpowers:requesting-code-review)`. Confirme que carregou. Esta skill despacha por
padrão um revisor genérico; aqui o revisor **é** o agente `revisor-bloco` — siga o processo da
skill, mas o despacho usa `subagent_type: revisor-bloco`, com três caminhos: o arquivo de diff do
Passo 3, `.claude/prompts/gabarito-lotus.md` e a pasta do bloco,
`docs/superpowers/blocos/<NN>-<slug>/` (spec e plano). `--max` não se aplica a este despacho: o
`revisor-bloco` já é `opus` no próprio agente.

Registre os achados brutos que ele devolver, no formato Q-N do gabarito, com severidade Crítico,
Importante ou Menor e `arquivo:linha`. Ainda não julgue nenhum — julgar é o Passo 6.

**Alto risco** → em paralelo ao `revisor-bloco`, uma lente Codex somente-leitura: carregue
`mcp__codex__codex` via `ToolSearch` (`select:mcp__codex__codex`); ausente, use o plugin
`codex-companion` por Bash, em segundo plano e **sem `--write`**:

```bash
node "$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --fresh "<prompt>"
```

Peça revisão do intervalo `<base>..<head>` do Passo 3 contra plano, spec e as leis §5, retornando
achados como `arquivo:linha — problema — impacto`. Depois:

1. deduplique e funda os achados das duas revisões num só placar;
2. o que só o Codex viu passa pela lente 2 como qualquer outro achado — a verificação dele é o
   Passo 5, não uma aceitação direta;
3. divergência entre os dois revisores se mostra ao João, não se resolve em silêncio.

**Zero achados** na lente 1 (e no Codex, quando rodou) → pule o Passo 5, não há o que verificar; vá
direto ao Passo 6, que fecha com relatório limpo.

## Passo 5 — Lente 2: verificação adversarial

Sem achado nenhum ao fim do Passo 4, pule este passo.

Invoque `Skill(superpowers:dispatching-parallel-agents)`. Confirme que carregou e deixe que ela
conduza o despacho.

Para **cada** achado, um `subagent_type: verificador-achado` próprio, em paralelo — nunca a lista
inteira para um só: quem verifica cinco achados de uma vez carrega o enquadramento dos quatro
primeiros para o quinto, e é exatamente essa contaminação que a lente 2 existe para eliminar.
Verificar é ler; é por isso que esta é a única fase em que o paralelismo é irrestrito.

Cada subagente recebe o template `.claude/prompts/verificador-achado.md` com `{ACHADO}` e
`{CAMINHO_DIFF}` preenchidos. **Não** passe o raciocínio da lente 1, o texto dos outros achados nem
o seu resumo da revisão.

Vereditos válidos, exatamente estes três: `CONFIRMED`, `PLAUSIBLE`, `REFUTED`. Sem `arquivo:linha`
verificável, o veredito é `REFUTED` — regra do próprio template, que este command não afrouxa.

## Passo 6 — Tratar os achados

Invoque `Skill(superpowers:receiving-code-review)`. Confirme que carregou e siga a postura dela ao
julgar cada achado `CONFIRMED`; as regras abaixo são as do Lotus por cima dela.

- `CONFIRMED` de severidade Crítico ou Importante **espera a aprovação do João antes de qualquer
  correção** — regra do Lotus, não da skill genérica. Só o que ele aprovar se corrige; corrigir
  reabre a revisão, com `/revisar-bloco` de novo a partir do Passo 3.
- `CONFIRMED` de severidade Menor não bloqueia e não exige aprovação prévia — registre e siga.
- `PLAUSIBLE` fica como observação no relatório, em qualquer severidade: não bloqueia.
- `REFUTED` não gera trabalho nenhum.
- `CONFIRMED` Crítico ou Importante que o João decide **adiar** (não corrigir agora) vira **ficha
  proposta** dentro do `revisao.md`, no mesmo formato que ficha nova de bloco usa — título, linha
  `Prioridade/Frente/Contexto/Depende`, `Fonte`, `Objetivo`, `Escopo`, `Fora`, `DoD` —, com o
  próximo número livre — o maior `NN` visto entre as fichas `## NN.` de
  `docs/superpowers/backlog.md`, as branches de `git branch -a` e as pastas de
  `docs/superpowers/blocos/`, mais 1, a mesma conta do Passo 3 do `/planejar-bloco`. A ficha fica
  **proposta**: só entra no `backlog.md` por PR de docs (E8, invariante 10) — este command nunca
  escreve nele.
- Achado que é **divergência de documentação** (o doc afirma o que o código não faz, ou o
  contrário) vira ficha nova em `docs/superpowers/pendencias/abertas.md`, no molde das fichas
  existentes — `## P-NN — <resumo>`, com o diagnóstico medido e um gatilho com prazo (pendência sem
  prazo é mentira permanente) —, com a linha correspondente em
  `docs/superpowers/pendencias/README.md`.
- Nenhum dos dois destinos — ficha proposta ou pendência — promove ou autoriza trabalho sozinho: só
  registra.
- Padrão que se repete em 2 ou mais blocos não vira só correção pontual: vira regra. Proponha o
  texto para a rule da camada tocada, ou um ADR se for decisão de arquitetura — é a seção
  `## Padrão reincidente` do próprio gabarito.

Não execute o fechamento automaticamente: o Passo 8 só escreve `ready_for_closure` quando não sobra
Crítico ou Importante `CONFIRMED` em aberto.

## Passo 7 — Escrever `revisao.md`

Grave `docs/superpowers/blocos/<NN>-<slug>/revisao.md`. **O arquivo acumula rodadas; nunca é
sobrescrito.**

Primeira rodada do bloco: crie o arquivo com o título `# <NN> — Revisão`.

A seção `## Em aberto` é **única**, fica logo abaixo do título e é **reescrita a cada rodada** — é
o que o `/finalizar-bloco` lê, e duas seções com esse nome fariam o portão ler a errada:

- Sem Crítico ou Importante `CONFIRMED` em aberto ao fim do Passo 6: a seção fica **sem conteúdo**
  entre o título e a rodada mais recente — é essa ausência que o `/finalizar-bloco` lê como sinal
  verde.
- Com algum em aberto: liste cada um por `Q-N`, severidade e o que falta — aprovação do João, ou
  correção já aprovada ainda por aplicar.

Abaixo de `## Em aberto`, o histórico cresce por rodada, mais nova em cima:

```markdown
# <NN> — Revisão

## Em aberto

(vazia, ou a lista dos CONFIRMED Crítico/Importante ainda em aberto)

## Rodada 2 — `e4f5g6h..i7j8k9l` — 2026-09-18 · Lente 1: opus · Lente 2: sonnet

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| 1 | Crítico | ... | CONFIRMED | `src/x.ts:42` | corrigido em `a1b2c3d` |

Placar: Crítico: N confirmados, N plausíveis, N refutados · Importante: idem · Menor: idem

## Rodada 1 — `a1b2c3d..e4f5g6h` — 2026-09-17 · Lente 1: opus · Lente 2: sonnet

(a rodada anterior, intacta)
```

O rótulo de cada lente vem do `model` do agente que rodou: `Lente 1: opus`, do `revisor-bloco`;
quando a lente Codex do Passo 4 também rodou, `Lente 1: opus + codex`. `Lente 2: sonnet`, do
`verificador-achado`. Quando a lente 1 devolveu zero achados (Passo 4) e a lente 2 não foi
despachada, a rodada substitui a tabela e o placar por uma linha só — `Lente 2: não despachada —
nenhum achado nesta rodada.` O intervalo do cabeçalho é o par de SHA curtos que o Passo 3 imprimiu,
e a data é a de hoje.

Rodada nova entra **acima** das anteriores e abaixo de `## Em aberto`; nenhuma rodada antiga é
editada. Os achados `REFUTED` de rodadas anteriores ficam onde estão — são eles que medem se a
lente 2 está fazendo trabalho de verdade em vez de carimbar a lente 1.

Grave junto do `revisao.md`, no mesmo commit, a transição do Passo 8 e — quando esta rodada abriu
ou emendou uma — os arquivos de `docs/superpowers/pendencias/`. Depois, apague com `rm` o arquivo
de diff no caminho que o Passo 3 imprimiu — **não** `rm "$saida"`, que não existe nesta chamada de
Bash.

## Passo 8 — Transição

A transição entra no **mesmo commit** do `revisao.md` — nunca um commit que só mude o `estado.md`
(invariante 6).

**Sem Crítico ou Importante `CONFIRMED` em aberto:**

```yaml
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
active_review: docs/superpowers/blocos/<NN>-<slug>/revisao.md
blocker: null
resume_state: null
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

**Com algum em aberto:**

```yaml
workflow_state: reviewing
next_owner: joao   # ou claude, com as correcoes ja aprovadas e so a aplicacao pendente
next_action: approve_review_findings <Q-N…>
active_review: docs/superpowers/blocos/<NN>-<slug>/revisao.md
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

`next_owner: joao` enquanto a sessão espera a decisão dele sobre os `CONFIRMED` abertos; `claude`
quando ele já aprovou a correção e falta só aplicá-la — nesse caso, corrija e rode
`/revisar-bloco` de novo, o que abre a rodada seguinte a partir do Passo 3.

Commit: `docs/superpowers/blocos/<NN>-<slug>/revisao.md`, o `estado.md` e, quando esta rodada abriu
ou emendou ficha, `docs/superpowers/pendencias/abertas.md` e `docs/superpowers/pendencias/README.md`
— tudo junto, porque é o `revisao.md` que prova a transição.

Reporte o placar por severidade e a decisão tomada.
