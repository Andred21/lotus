# Bloco 30 — revisão de sprint

Revisão de 2026-09-26, pela skill `revisar-sprint`, do intervalo `e5ac01a9..3e07a451` (o diff
próprio do bloco, depois do merge da `main` em `3196fd45`). Risco **baixo**: harness em bash,
python e docs, nenhum domínio das leis §5, `executor: claude`. Só a revisão Claude; o MCP do Codex
estava fora do ar.

Suíte do harness pelo `run-all.sh`: 13 arquivos, nenhuma falha. Órfãos: nenhum. Toda função nova
de `lane.sh`, `_lane.sh` e `estados.sh` tem chamador, e o `ler-estado.py` saiu sem deixar
referência. Conformidade: o código segue o plano quase linha por linha. As três divergências contra
a spec vieram do próprio plano e não são achados: `--rmi local` no `fechar`, NN sem zero à esquerda
no guarda e o slug na mensagem do commit da semente. O guarda da main nega todas as variantes de
injeção por ambiente que foram sondadas: `VAR=` na frente, `env`, `export`, `PATH=` e `cd`.

## Achados

### [Q-1] Arquivo de teste rodado avulso roda git contra o repo real — `.claude/tests/*.tests.sh`
**Encontrado:** os `*.tests.sh` só funcionam sourceados pelo `run-all.sh`. Rodado com
`bash arquivo.tests.sh`, `DIR_TESTES` vem vazio, `_assert.sh` e `_lane.sh` não carregam,
`criar_main_lane`/`criar_repo` não existem e `_xm` fica vazio. O `git -C "$_xm" ...` cru do topo do
arquivo (ex.: `lane-fechar.tests.sh:66`) cai no diretório atual. **Aconteceu nesta revisão:** o
repo real ganhou 7 branches (`chore/33-harness-sinal-de-contexto-cheio`, `chore/bloco`,
`chore/outra`, `fix/42-livre-b`, `docs/43-livre-c`, `outra`, `rascunho`), a worktree
`lotus-destacada/` dentro da árvore, o diretório vazio `lotus-33-harness-sinal-de-contexto-cheio/`
e um HEAD trocado. Nada se perdeu: todas as branches apontam para `3a1e96e0` e as duas pastas estão
vazias ou limpas.
**Sênior faria:** uma linha no topo de cada `*.tests.sh`:
`[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh\n' >&2; exit 1; }`.
**Por quê:** a trava do `run-all.sh` e a do `criar_repo` só protegem quem entra pela porta certa.
Rodar um arquivo só é o gesto natural para iterar, de agente ou de humano.
**Fere:** mesma classe do `50b82a5e` do item 28, "a suíte nunca roda git contra o repo real". É
reincidência, então vira regra: proposta de lição ou de nota no cabeçalho do `_assert.sh`, com
catraca, tipo um teste do `run-all` que roda cada arquivo avulso num diretório descartável e exige
exit 1.
**Severidade:** 🟡 em breve · **Esforço:** P

### [Q-2] `conferir` pula em silêncio a lane sem `plano.md` na pasta do bloco — `.claude/scripts/lane.sh:352-362`
**Encontrado:** `[[ -f $p ]] || continue`, e a saída é `SEM CONFLITO: lane N contra 0 plano(s)`.
Até o item 31 mesclar, os planos nascem em `docs/superpowers/plans/`, então nenhuma lane viva tem
`blocos/<slug>/plano.md` e o `conferir` sai verde sem ter comparado nada.
**Sênior faria:** nomear cada lane não conferida (`lane 32 sem plano.md: não conferida`), para o
verde não esconder o vazio.
**Por quê:** `state.md`, invariante 1, promete que o `conferir` acusa dois planos vivos que tocam
os mesmos arquivos. Hoje ele não vê nenhum plano, e diz que está tudo bem.
**Fere:** lição 13, doc que descreve o que não roda, e lição 14.
**Severidade:** 🟡 em breve · **Esforço:** P

### [Q-3] Ramo "`active_review` aponta para arquivo inexistente" sem asserção — `.claude/hooks/lib/estados.sh:84-85`
**Encontrado:** o ramo equivalente do `active_plan` tem teste (`estados.tests.sh:49`); o do
`active_review` não tem. Apagar as linhas 84-85 deixa a suíte verde.
**Sênior faria:** um caso gêmeo do da linha 49, em `ready_for_closure` e com o review apontando
para um caminho que não existe.
**Fere:** lição 19, emenda de 2026-09-26: a catraca ancora o mecanismo.
**Severidade:** 🟢 melhoria · **Esforço:** P

### [Q-4] Invariante 1 promete "nada de porta repetida", e o portão só vê o offset — `docs/superpowers/state.md:87`
**Encontrado:** `offset_da_arvore` (`lane.sh:116-124`) só lê `LOTUS_DEV_HTTP_PORT`. As outras 5
portas nunca são conferidas.
**Sênior faria:** escrever "nada de offset repetido" e deixar a colisão de porta avulsa com o
`docker compose up`, que já falha alto, como o `.env.example` descreve.
**Fere:** lição 13.
**Severidade:** 🟢 melhoria · **Esforço:** P

### [Q-5] Aviso de transição parte a lista de leitura no meio — `CLAUDE.md:44-46`
**Encontrado:** o blockquote "Transição até o item 31 mesclar" fica entre "SÓ QUANDO O ESTADO
EXIGIR" e "SE a task toca schema", e parte a lista em duas.
**Sênior faria:** mover o blockquote para depois do último bullet ("OPCIONAL").
**Fere:** catálogo universal.
**Severidade:** 🟢 melhoria · **Esforço:** P

## Fora do escopo desta revisão

Registrado para o João e não corrigido aqui. A limpeza dos restos do Q-1 no repo real foi negada
pelo classificador do auto mode e fica para o terminal do João:

```bash
git worktree remove lotus-destacada
rmdir lotus-33-harness-sinal-de-contexto-cheio
git branch -d chore/33-harness-sinal-de-contexto-cheio chore/bloco chore/outra fix/42-livre-b docs/43-livre-c outra rascunho
```
