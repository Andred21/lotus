# Bloco 35 — rulings da execução

Decisões tomadas durante a execução. Cada linha diz quem decidiu e quanto custa se a decisão
estiver errada.

## Do João

- **Task 4, sem `mktemp` nem `node` no main tree.** O Passo 4 do `/planejar-bloco` cria o
  temporário com a ferramenta Write em `${TMPDIR:-/tmp}`. O fallback `codex-companion` fica
  declarado indisponível no main tree, e sem MCP a rota cai no `contexto-leitor`. A allowlist do
  `guard-main-shell` não muda. **Se estiver errado:** o packet delegado ao Codex no main tree
  deixa de ter a rota do plugin, e liberar isso exige mexer na allowlist.
- **Task 9, o gate `context_required` depois da lane e a invariante 5 ficam como estão.** Viram
  pendência no fechamento, para o item 36. **Se estiver errado:** o `lotus-context-packet` e a
  invariante 5 continuam descrevendo um ramo que o fluxo novo não produz sozinho.

## Do controlador, em nome do João

- **Task 4, fix 2: a guarda do bounded do ElaDecora foi restaurada** no `/planejar-bloco`. Era
  um achado de fidelidade ao port, não do revisor. **Se estiver errado:** remover a guarda é uma
  edição de um parágrafo.
- **Task 6: o portão do `/finalizar-bloco` lê `## Em aberto` pelo conteúdo.** Nenhum `Q-N`
  listado conta como vazio, e o placeholder não bloqueia. **Se estiver errado:** um texto livre
  sob `## Em aberto`, sem `Q-N`, passa o portão.
- **Task 10: a nota "A mecânica de execução" do `CLAUDE.md` foi reescrita** para bater com o
  `/executar-bloco` novo. Isso estava fora da lista do brief, mas dentro do §4. **Se estiver
  errado:** reverter é trocar um parágrafo do `CLAUDE.md`.
- **Task 11: a prova da catraca foi feita pelo controlador**, não por um implementador, e depois
  revisada por um `revisor-task` independente. O trailer do commit `d1454ade` saiu como "Claude
  Sonnet 5". O histórico não foi reescrito. **Se estiver errado:** corrigir o trailer exige
  reescrever um commit que ainda não foi publicado.
- **Task 12: a E4.2 foi dada como provada, com uma exceção.** O `superpowers:brainstorming` não
  resolveu pelo plugin no clone, porque a chamada veio antes de o plugin ser instalado. A prova
  não foi refeita. **Se estiver errado:** falta a evidência de que o `/planejar-bloco` carrega o
  brainstorming do plugin, e refazer só esse trecho num clone novo custa uma sessão curta.
- **Revisão final, I-2: o `/finalizar-bloco` ganhou o ramo "Retomada"** no modo Normal. Com
  `closed` na lane, o `state` da PR decide primeiro: `MERGED` aponta o Pós-PR e para; `CLOSED`
  para; `OPEN` com HEAD publicado para. Faltando push ou PR, o command retoma no Passo 7. **Se
  estiver errado:** um `closed` sem PR deixa de cair em "Nada casa" e passa a empurrar a branch.
- **Revisão final, I-1: na segunda passagem do Passo 6, a linha do `progress.md` é atualizada
  com a correção que voltou do PR.** É ela que viaja com o `closed` (invariante 6). **Se estiver
  errado:** o histórico passa a registrar correções de PR, que antes não entravam.
- **Revisão final, I-3: os quatro commands param em `Unknown skill`** e pedem a instalação do
  plugin, em vez de trocar pelo nome sem prefixo. A nota fica depois do preâmbulo, que segue
  verbatim, e a catraca não a cobra. **Se estiver errado:** uma máquina sem o plugin deixa de
  rodar os commands pela cópia legada e passa a parar.
- **Esta sessão usou `subagent-driven-development` sem prefixo.** O plugin só entrou na máquina
  em 2026-09-29, depois que a sessão abriu, e `superpowers:subagent-driven-development` deu
  `Unknown skill`. É exatamente o contorno que o I-3 passou a proibir. **Se estiver errado:** a
  execução das Tasks 11 e 12 e da revisão final seguiu a versão legada da SDD, e não a v6.4.1.

## Para o fechamento

Pendências para o 6b do `/finalizar-bloco`. Nenhuma foi corrigida na lane:

- O `context_required` e a invariante 5 (ruling da Task 9), junto com o `closing` órfão: nenhum
  dos quatro commands grava esse estado.
- `.agents/skills/lotus-ui-review/SKILL.md:36` ainda lê o `state.md` como fonte de estado.
- `docs/superpowers/backlog.md:34,43-44` ainda descreve `/revisar-sprint → /fechar-sprint` e o
  `context_required` antes do planejar. Corrigir na lane ou abrir pendência é decisão do João.
- O commit da semente no `lane.sh abrir` (`.claude/scripts/lane.sh:313-316`) é só de `estado.md`
  e não está declarado como exceção na invariante 6.
- A catraca não cobra a existência de `prompts/gabarito-lotus.md` e
  `prompts/verificador-achado.md`, nem que os `subagent_type` citados tenham agente.
- A ida a `blocked` na rota codex do `/executar-bloco` não diz qual artefato prova a transição.
- A P-84 passa para `encerradas.md`, porque o gatilho foi pago pela seção HARNESS da Task 10.
