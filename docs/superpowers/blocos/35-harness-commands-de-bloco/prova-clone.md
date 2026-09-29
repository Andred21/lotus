# Prova no clone — bloco 35: `/planejar-bloco` e `/executar-bloco` de verdade (E4.2)

Task 12 do plano do bloco 35. O João rodou o preparo e as sessões num clone descartável. O
controlador leu a evidência nos transcripts das sessões, porque o clone já tinha sido apagado
quando a leitura começou. As seções 2 e 3 foram montadas a partir desses transcripts, com as
chamadas `Skill`, os resultados delas, os `Edit` do `estado.md` e as saídas de `git log`. Não são
a saída literal dos comandos do Step 4, que precisavam do clone vivo.

- **Data da prova:** 2026-09-29, das 22:24Z às 23:10Z. Registro gravado em 2026-09-29T20:14:57-03:00.
- **Ponta do 35 usada:** `d1454ade`, mesclada na `main` do clone como `2e55b055`.
- **Clone:** `/tmp/lotus-prova-35.g9wqAy`, já apagado. Os transcripts ficam em
  `~/.claude/projects/-tmp-lotus-prova-35-g9wqAy-lotus` e em `…-lotus-99-demo-harness`.

## 1. Preparo

Os comandos seguiram o Step 1 do plano. O transcript comprova só o merge (`2e55b055`) e o commit
da ficha 99 (`6c424b08`). O resto é o texto do plano, resumido aqui:

```bash
S=$(mktemp -d /tmp/lotus-prova-35.XXXXXX)
git clone -q /home/jvbat/projetos/lotus "$S/lotus"
cd "$S/lotus"
git config core.hooksPath .githooks
git merge -q --no-ff origin/chore/35-harness-commands-de-bloco -m "prova: ponta do 35 na main do clone"
cp /home/jvbat/projetos/lotus/.env .env 2>/dev/null
cp /home/jvbat/projetos/lotus/backend/.env backend/.env
cp /home/jvbat/projetos/lotus/frontend/.env frontend/.env
# cat >> docs/superpowers/backlog.md <<'EOF' … EOF   (ficha 99, texto do Step 1 do plano)
git add docs/superpowers/backlog.md && git commit -qm "prova: ficha 99 no clone"
```

## 2. Invocações de `Skill`

| Hora (Z) | Sessão | Skill | Resultado |
|---|---|---|---|
| 22:24:55 | `/executar-bloco 99` no main tree (recusado) | `caveman` | carregou |
| 22:25:34 | planejamento, main tree | `caveman` | já carregado |
| 22:25:47 | planejamento, main tree | `superpowers:brainstorming` | `Unknown skill: superpowers:brainstorming` |
| 22:25:52 | planejamento, main tree | `brainstorming` | carregou pelo symlink `~/.claude/skills/brainstorming`, que aponta para o clone manual v6.1.1 |
| 22:26:50 | — | plugin `superpowers@claude-plugins-official` 6.4.1 instalado, escopo `user` | `installed_plugins.json` |
| 22:27:15 | planejamento, lane 99 | `superpowers:writing-plans` | carregou do plugin 6.4.1 |
| 22:37:48 | execução, lane 99 | `caveman` | já carregado |
| 22:39:04 | execução, lane 99 | `superpowers:executing-plans` | carregou |
| 22:39:09 | execução, lane 99 | `superpowers:test-driven-development` | carregou, na sessão principal |

O João rodou também o `/revisar-bloco` e o `/finalizar-bloco`, além do que a Task 12 pedia. Nessas
sessões, `superpowers:requesting-code-review`, `superpowers:receiving-code-review`,
`superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`
carregaram com o nome qualificado. O `installed_plugins.json` registra ainda duas instalações de
escopo `project`, às 22:59:40Z (no clone) e às 23:03:57Z (na lane 99), no começo das sessões de
revisão.

## 3. Cadeia do `estado.md`

Os commits vêm do `git log` da lane `docs/99-demo-harness` (`lane_base` `6c424b08`). Os tokens vêm
do `lane.sh abrir` e das edições do `estado.md`:

```
56255a7e chore(99): abre a lane demo-harness                           planning             continue_active_planning
42ddf08e docs(99): spec do demo-harness                                (estado não muda)
9be2de40 docs(99): plano do demo-harness, estado ready_for_execution   ready_for_execution  execute_active_plan     efeito_externo: nao  executor: claude
575e10bc docs(99): cria demo-harness.md                                executing            continue_active_plan    (estado.md no commit da primeira task)
d38e2f25 docs(99): rulings e estado ready_for_review                   ready_for_review     request_code_review
41d3a993 docs(99): revisão rodada 1 limpa, estado ready_for_closure    ready_for_closure    close_active_work_item
c0bce6ca chore(close): item 99 fecha demo-harness                      closed               none
```

Cada transição de estado entrou no mesmo commit do artefato que a prova (invariante 6). O DoD da
ficha 99 saiu `1` no `grep -c`.

## 4. Diferenças em relação ao esperado

1. **`superpowers:brainstorming` nunca resolveu com o nome qualificado.** Na hora da chamada o
   plugin ainda não estava instalado. O command forçou a `Skill` com o nome certo, e ela falhou
   com `Unknown skill`. Por conta própria, o agente seguiu com `brainstorming` sem prefixo, que
   carregou o symlink legado v6.1.1. Os commands não mandam fazer esse contorno. Quando o João
   remover os symlinks (E6), o mesmo cenário para no brainstorming.

   O plugin instalado durante a sessão passou a valer no turno seguinte: a listagem de skills das
   22:27:12Z já mostra `superpowers:brainstorming`. Então a dependência real é o plugin estar
   instalado quando o command invoca a `Skill`, e não na abertura da sessão. A catraca não pega
   isso, porque lê o texto dos commands, não o ambiente. A sessão da lane 35 teve o mesmo erro em
   2026-09-28, com `superpowers:subagent-driven-development`.
2. **O `/executar-bloco 99` rodou na mesma sessão do planejamento**, depois do `EnterWorktree`.
   O plano previa uma sessão nova aberta na lane. As skills chamadas e a cadeia de estados foram
   as mesmas de uma sessão nova.
3. **As paradas no main tree estavam certas.** Todas foram no regex de lane (branch `main`) e
   nenhuma escreveu nada:
   - o `/executar-bloco 99` rodado antes do planejamento parou uma vez;
   - o `/revisar-bloco` parou três vezes, na sessão `9cafe999`: a primeira com `99` e as outras
     duas sem argumento.
4. **O `/revisar-bloco` desviou da base declarada.** No clone, a `origin/main` é a `main` real,
   que ainda não tem a ponta do 35. Por isso a receita trazia 27 commits. O agente revisou a
   partir do `lane_base` (`6c424b08`) e registrou o desvio no `revisao.md`. A causa é o arranjo
   da prova, não o command.
5. **O `/finalizar-bloco` parou antes do push.** O `origin` do clone é
   `/home/jvbat/projetos/lotus`, e o push criaria no repositório real uma branch com os commits
   da prova. O agente deixou a decisão com o João, que não empurrou. Nenhuma branch `*99*` existe
   no repositório real nem no remoto (conferido pelo controlador com `git branch` e
   `git ls-remote`). O commit de fechamento usou `git add -A docs`, dentro do que manda o
   `finalizar-bloco.md`: commitar junto tudo que os itens b–e tocaram.
6. **Nenhum contêiner subiu**, conforme `docker ps` rodado pelo controlador às 20:14 (-03:00). O
   `lane.sh abrir` rodou o `pnpm install` no clone, com `Packages: +323`.
7. **Sobra em `/tmp`.** O `/tmp/lotus-prova-35.P4OT1U/lotus` é um clone preparado sem sessão e
   sem lane. O Step 6 não o limpou.

## Veredito

A E4.2 está provada com uma exceção. `/planejar-bloco` e `/executar-bloco` levaram a ficha 99 de
`planning` a `ready_for_review` com os tokens certos. Todas as skills foram invocadas pela
ferramenta `Skill`, e as qualificadas resolveram pelo plugin, menos uma. A exceção é o
`superpowers:brainstorming`: o command o invocou com o nome certo, mas a chamada falhou por
ambiente, e o agente seguiu pela cópia legada (item 1). O texto dos commands força a `Skill`; o que
esta prova não cobre é o `superpowers:brainstorming` carregado do plugin.
