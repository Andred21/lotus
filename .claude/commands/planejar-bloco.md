---
description: Abre um bloco do Lotus — ficha, lane, brainstorming, spec e plano. Não implementa nada.
argument-hint: "[NN | texto livre] [--max]"
disable-model-invocation: true
model: opus
effort: high
---

# /planejar-bloco

Fase 1 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.3, com as emendas da
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

Invoque `Skill(caveman, "ultra")`. Confirme em uma linha que carregou antes de seguir.

## Passo 2 — Main tree na `main`

Rode:

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git worktree list --porcelain
```

A árvore tem de ser a primeira entrada do `worktree list` (o main tree nunca é lane), na branch
`main`. Dentro de uma lane → pare e diga qual, lendo `bash .claude/scripts/lane.sh descobrir`: uma
sessão conduz uma lane só, e planejar abre outra. O teto de três lanes e a independência entre
blocos não se conferem aqui — quem confere é o portão do `lane.sh abrir`, no Passo 6.

## Passo 3 — Resolver a ficha

- `NN` → leia a seção `## <NN>. \`<slug>\`` de `docs/superpowers/backlog.md`. Ausente → pare.
  Ficha cuja pasta `docs/superpowers/blocos/<NN>-<slug>/` já tem `estado.md` na `main` → pare: o
  bloco já passou por uma lane, e abrir outra sobrescreveria o estado dele (o `lane.sh abrir`
  também recusa). Em `blocked` aguardando aceitação (o 6a do `/finalizar-bloco` deixa a ficha no
  backlog até o `closed`), o que falta é prova, e o command certo é `/finalizar-bloco <NN>`. Ficha
  listada na tabela `## Aguardando aceitação` do `backlog.md` também para.
- Leia da ficha: o slug, `**Contexto:**` e `**Depende:**`.
- **Texto livre** → proponha a ficha no formato das existentes (título, linha
  Prioridade/Frente/Contexto/Depende, Fonte, Objetivo, Escopo, Fora, DoD), com o próximo número
  livre — o maior `NN` visto entre as fichas `## NN.` do backlog, as branches de `git branch -a` e
  as pastas de `docs/superpowers/blocos/`, mais 1; ficha fechada sai do backlog mas deixa a pasta,
  e número fechado não se reusa — e **pare**: a ficha só entra na `main` por PR de docs (E8,
  invariante 10), e o command volta a ser invocado com o `NN` depois de publicada. Promover é
  decisão do João (invariante 8).
- Sem argumento → liste as fichas e pergunte. Nunca escolha sozinho.

## Passo 4 — Context Packet, se `Contexto: sim`

Ainda não há lane: grave o packet com a ferramenta `Write`, num caminho fora de qualquer árvore
git sob `${TMPDIR:-/tmp}` — ex. `<tmp>/lotus-packet-<NN>-<AAAAMMDD-HHMMSS>.md` — e só o traga para
o repositório no Passo 6. Nada de `mktemp` aqui: o `guard-main-shell` nega `mktemp` na `main`, e a
ferramenta `Write` para fora de qualquer árvore git passa. Resolva `<tmp>` e o timestamp com
`echo "${TMPDIR:-/tmp}"` e `date +%Y%m%d-%H%M%S`, os dois liberados na `main`.

**Rota Codex** — porta os itens 1, 2, 3 e 6 da rota Codex do command anterior (renumerados 1–4
aqui):

1. Carregue o Codex pelo MCP: `ToolSearch "select:mcp__codex__codex"`. O fallback `codex-companion`
   por Bash (`node ...`) não roda aqui: o `guard-main-shell` nega `node` na `main`, e este passo
   sempre roda no main tree. Sem `mcp__codex__codex` na sessão, vá direto para a rota **Codex
   indisponível**, abaixo. **Não** use o agente `codex:codex-rescue` como fallback: em background
   ele pede permissão de Bash que ninguém responde.
2. Invoque o Codex (sandbox read-only) com prompt que exija a skill `lotus-context-packet` de
   `.agents/skills/`, informando `NN`, slug, branch `main` e o commit atuais — não o item de
   trabalho da lane, que ainda não existe. O Codex não altera arquivos nem estado.
3. Valide a resposta: markers exatos, frontmatter completo, ≤ 8 key facts, fontes indisponíveis
   registradas, `RECOMMENDED_TRANSITION` presente. Contrato violado → uma re-invocação citando a
   violação; persistindo → pare, sem lane.
4. Um packet `status: partial` prossegue; as fontes `unavailable` viram limitação declarada no
   brainstorming. `status: blocked` nunca prossegue.

`RECOMMENDED_TRANSITION: blocked` → pare, sem lane: ainda não existe `estado.md` onde gravar
`blocked`.

**Codex indisponível:** invoque `Skill(superpowers:dispatching-parallel-agents)`, com um agente
`contexto-leitor` (`subagent_type`) por domínio independente, todos somente-leitura, na mesma
resposta. As partes se fundem num packet só, com o mesmo contrato.

**Regra dura: agente que escreve nunca é despachado em paralelo com agente que escreve.**

## Passo 5 — Brainstorming

Invoque `Skill(superpowers:brainstorming)`. Confirme que carregou.

Diga à skill, antes de ela começar, que a spec deste bloco vai para
`docs/superpowers/blocos/<NN>-<slug>/spec.md` — o default dela vence se você não falar. **O gate
de aprovação dela é obrigatório**; este command não avança sem o sim do João sobre o design.

A skill anuncia a classificação antes da primeira pergunta:

- ***spike*** → encerre aqui, sem lane: não crie branch, reporte a recomendação, e a ficha fica
  como está no backlog.
- ***bounded*** → siga curto — o caminho `bounded` da skill termina mandando implementar direto,
  sem documento, e **não faça isso aqui** — mas **produza spec e plano**: neste harness `bounded`
  economiza cerimônia, não artefato (menos perguntas, design curto, plano de poucas tasks). O
  contrato deste harness é que todo bloco sai em `ready_for_execution` com `active_plan`
  preenchido — invariante 3 —, e o Passo 10 diz que este command nunca implementa.
  O contrato dos estados é `docs/superpowers/state.md`.
- ***architectural*** → siga o caminho inteiro da skill.

**Assim que a classificação sair e não for *spike*, pare e execute o Passo 6 antes de a skill
gravar a spec**: o commit dela tem de cair na branch do bloco, não na `main`.

## Passo 6 — Abrir a lane

Você ainda está no main tree. Escolha o `<tipo>` (`feat fix chore refactor infra cicd docs`, D5)
pelo conteúdo da ficha, e declare-o em uma linha.

```bash
bash .claude/scripts/lane.sh abrir <NN> <tipo> <slug> --modelo <alias da sessão>
```

`PORTAO RECUSOU` → pare: mexer na fila é decisão do João.

Deu certo: `EnterWorktree(path: "<caminho absoluto impresso pelo LANE ABERTA>")`. Da sessão no
main tree o caminho da árvore irmã é aceito (E2).

Havendo Context Packet do Passo 4: já na lane, onde o Bash não tem mais a restrição do
`guard-main-shell` da `main`, copie o temporário para
`docs/superpowers/blocos/<NN>-<slug>/context.md` e apague-o; o `context.md` é commitado junto com
a spec.

O stack não sobe aqui — a saída do `abrir` já diz como subir, quando o bloco precisar dele.

Volte ao Passo 5.

## Passo 7 — Spec

Grave a spec aprovada em `docs/superpowers/blocos/<NN>-<slug>/spec.md` e commite.

A spec tem a seção `## Verificação externa` **sempre**: é o que o `/finalizar-bloco` lê, e seção
ausente não é o mesmo que seção que declara não haver nada — a primeira é spec incompleta, a
segunda é decisão registrada.

Quando o bloco depende de ação fora do repositório, liste um item numerado por ação, com a prova
de cada uma:

```markdown
## Verificação externa

1. <ação fora do repositório>.
   - prova: `<alias> <GET|HEAD> <caminho> -> <código>`
```

A prova é declarativa, no formato `<alias> <GET|HEAD> <caminho> -> <código>`, com o caminho
começando em `/` e um alias de `.claude/aceitacao-aliases.conf` (hoje, só `producao`). Não há
alias para o stack local: quem mede a prova depois do merge é a lane de aceitação, que não sobe
stack. Item cuja verificação não tem superfície HTTP declara `prova: nenhuma`. Cada item tem
exatamente uma linha `- prova:`, e o `aceitacao.sh gerar` do Passo 9 recusa a seção que foge disso.

Quando não houver ação externa nenhuma, a seção diz isso em uma linha, **sem item numerado**:

```markdown
## Verificação externa

Nenhuma. <o que o bloco cobre>. `efeito_externo: nao`.
```

## Passo 8 — Plano

Invoque `Skill(superpowers:writing-plans)`. Confirme que carregou. Diga à skill que o plano vai
para `docs/superpowers/blocos/<NN>-<slug>/plano.md` — o default dela é outro caminho, e só este
vence se você falar.

Peça duas seções a mais, depois das tasks, e valide-as você mesmo antes de gravar:

```markdown
## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4, 5 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma.
```

A validação é mecânica, por **par**: a interseção das listas `Files:` das duas tasks precisa ser
vazia, e não pode existir aresta `Consumes`/`Produces` entre elas. Grupo que falha em um par é
desfeito, não negociado.

`## Handoff de execução` declara `executor: claude|codex`, o modelo e o esforço da sessão, os
papéis de `.claude/papeis.md` que a execução vai despachar e, para `codex`, `paths_autorizados`
com globs exatos. Critério: `codex` para task mecânica com verificação executável e paths
fechados; `claude` quando a task toca lei do §5, decisão de arquitetura ou julgamento fora do
plano.

Com o plano gravado, rode a segunda metade do portão:

```bash
bash .claude/scripts/lane.sh conferir <NN>
```

Sai `1` → pare: o plano cruza arquivos com o de outra lane viva, e a saída é replanejar ou
esperar a outra lane fechar.

## Passo 9 — Gravar o estado

Grave, no `estado.md` da lane e **no mesmo commit do plano**:

```yaml
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
active_spec: docs/superpowers/blocos/<NN>-<slug>/spec.md
active_plan: docs/superpowers/blocos/<NN>-<slug>/plano.md
context_packet: docs/superpowers/blocos/<NN>-<slug>/context.md  # null quando Contexto: não
efeito_externo: <sim|nao>
executor: <claude|codex>
active_acceptance: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md  # null com efeito_externo: nao
commit: <git rev-parse --short HEAD antes do commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

- `efeito_externo` vale `sim` quando `## Verificação externa` tem item numerado, e `nao` quando
  declara nenhum.
- Com `sim`, depois de gravar o `estado.md` e antes do commit, gere a tabela de aceitação do bloco:

  ```bash
  bash .claude/scripts/aceitacao.sh gerar <NN>
  ```

  `PORTAO RECUSOU` → corrija a `## Verificação externa` da spec, como o motivo diz, e rode de novo;
  a spec corrigida entra no mesmo commit. O `aceitacao.md` gerado entra no commit do plano. Com
  `nao` não há tabela, e `active_acceptance` fica `null`.
- `id`, `slug`, `branch`, `worktree`, `offset` e `lane_base` são do `lane.sh` e não se reescrevem.

## Passo 10 — Parar

**Este command nunca implementa.** Reporte: o bloco, a branch, os caminhos da spec e do plano,
quantas tasks o plano tem, e que o próximo passo é `/executar-bloco <NN>`, numa sessão aberta na
lane.

## `--max`

`--max` sobe `sonnet` para `opus` em todo despacho deste command, pelo parâmetro `model: "opus"`
da ferramenta `Agent`, conforme `.claude/papeis.md`. O esforço da sessão não muda.
