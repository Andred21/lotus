# Prova no clone — bloco 35: `/planejar-bloco` e `/executar-bloco` de verdade (E4.2)

Task 12 do plano do bloco 35. O João rodou o preparo e as sessões num clone descartável. O
controlador leu a evidência nos transcripts das sessões, porque o clone já tinha sido apagado
quando a leitura começou.

- **Data da prova:** 2026-09-29, das 22:24Z às 23:10Z. Registro gravado em 2026-09-29T20:14:57-03:00.
- **Ponta do 35 usada:** `d1454ade`, mesclada na `main` do clone como `2e55b055`.
- **Clone:** `/tmp/lotus-prova-35.g9wqAy`, já apagado. Os transcripts ficam em
  `~/.claude/projects/-tmp-lotus-prova-35-g9wqAy-lotus` e em `…-lotus-99-demo-harness`.

## 1. Preparo

Os comandos são os do Step 1 do plano, sem mudança:

```bash
S=$(mktemp -d /tmp/lotus-prova-35.XXXXXX)
git clone -q /home/jvbat/projetos/lotus "$S/lotus"
cd "$S/lotus"
git config core.hooksPath .githooks
git merge -q --no-ff origin/chore/35-harness-commands-de-bloco -m "prova: ponta do 35 na main do clone"
cp /home/jvbat/projetos/lotus/.env .env
cp /home/jvbat/projetos/lotus/backend/.env backend/.env
cp /home/jvbat/projetos/lotus/frontend/.env frontend/.env
# ficha 99 acrescentada ao backlog, com o texto do Step 1
git add docs/superpowers/backlog.md && git commit -qm "prova: ficha 99 no clone"
```

## 2. Invocações de `Skill`

Saída de `grep -rhoE '"skill":"[^"]+"'` nas duas pastas de transcript, com o resultado de cada
chamada:

| Hora (Z) | Sessão | Skill | Resultado |
|---|---|---|---|
| 22:25:34 | planejamento, main tree | `caveman` | ok |
| 22:25:47 | planejamento, main tree | `superpowers:brainstorming` | `Unknown skill: superpowers:brainstorming` |
| 22:25:52 | planejamento, main tree | `brainstorming` | ok, pela cópia de usuário em `~/.claude/skills/` |
| 22:26:50 | — | plugin `superpowers@claude-plugins-official` 6.4.1 instalado | `installed_plugins.json` |
| 22:27:15 | planejamento, lane 99 | `superpowers:writing-plans` | ok |
| 22:37:48 | execução, lane 99 | `caveman` | ok |
| 22:39:04 | execução, lane 99 | `superpowers:executing-plans` | ok |
| 22:39:09 | execução, lane 99 | `superpowers:test-driven-development` | ok |

As skills de `/revisar-bloco` e `/finalizar-bloco`, que o João rodou além do pedido na Task 12,
também carregaram com o nome qualificado. São elas `superpowers:requesting-code-review`,
`superpowers:receiving-code-review`, `superpowers:verification-before-completion` e
`superpowers:finishing-a-development-branch`.

## 3. Cadeia do `estado.md`

Do `lane.sh abrir` e dos commits da lane `docs/99-demo-harness` (`lane_base` `6c424b08`):

```
56255a7e chore(99): abre a lane demo-harness                       planning             continue_active_planning
42ddf08e docs(99): spec do demo-harness                            (estado não muda)
9be2de40 docs(99): plano do demo-harness, estado ready_for_execution  ready_for_execution  execute_active_plan   efeito_externo: nao  executor: claude
575e10bc docs(99): cria demo-harness.md                             executing            continue_active_plan  (estado.md no commit da primeira task)
d38e2f25 docs(99): rulings e estado ready_for_review                ready_for_review     request_code_review
(?)      docs(99): revisão rodada 1 limpa, estado ready_for_closure  ready_for_closure    close_active_work_item
c0bce6ca chore(close): item 99 fecha demo-harness                   closed               none
```

O SHA do commit da revisão (`?`) não aparece nos transcripts. Cada transição de estado entrou junto com o artefato que a prova, como pede a invariante 6. O DoD
da ficha 99 saiu `1` no `grep -c`.

## 4. Diferenças em relação ao esperado

1. **O plugin não estava instalado quando a sessão abriu.** A primeira `Skill` com prefixo
   falhou com `Unknown skill`. O agente continuou pela cópia sem prefixo que existe em
   `~/.claude/skills/`, e ela só existe nesta máquina. Depois da instalação (22:26:50Z), todos
   os nomes qualificados resolveram. O efeito é que os commands dependem do plugin instalado no
   momento em que a sessão abre, e a catraca não enxerga isso, porque ela lê o texto dos
   commands, não o ambiente. A sessão da lane 35 teve o mesmo erro em 2026-09-28 com
   `superpowers:subagent-driven-development`.
2. **O `/executar-bloco 99` rodou na mesma sessão do planejamento**, depois do `EnterWorktree`,
   e não numa sessão nova aberta na lane. A cadeia e as skills saíram iguais.
3. **Paradas corretas no main tree.** O `/executar-bloco 99` antes do planejamento parou uma vez
   e o `/revisar-bloco 99` parou três vezes. Todas as paradas foram no regex de lane (branch
   `main`), sem escrever nada.
4. **O `/revisar-bloco` desviou da base declarada.** No clone, a `origin/main` é a `main` real,
   que ainda não tem a ponta do 35, e por isso a receita trazia 27 commits. O agente revisou a
   partir do `lane_base` (`6c424b08`) e registrou o desvio no `revisao.md`. A causa é o próprio
   arranjo da prova, não o command.
5. **O `/finalizar-bloco` parou antes do push.** O `origin` do clone é
   `/home/jvbat/projetos/lotus`, e o push criaria no repositório real uma branch com os commits
   da prova. O agente deixou a decisão para o João, que não fez o push. Nenhuma branch `*99*`
   existe no repositório real nem no remoto. O commit de fechamento usou `git add -A docs` em vez
   dos paths exatos. O `git status` ficou vazio depois dele, mas a lista de arquivos do commit
   não aparece nos transcripts.
6. **Nenhum contêiner subiu.** O `docker ps` não mostra nada do clone.

## Veredito

A E4.2 está provada. `/planejar-bloco` e `/executar-bloco` levaram a ficha 99 de `planning` a
`ready_for_review` com as skills invocadas pela ferramenta `Skill` e com os tokens certos. A
única falha de invocação foi a do item 1, e ela vem do ambiente, não do texto dos commands.
