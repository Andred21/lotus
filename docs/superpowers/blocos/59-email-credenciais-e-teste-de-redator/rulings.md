# Bloco 59 — decisões tomadas em nome do João

Uma decisão por linha, com o que ela custa se estiver errada. Fonte: ledger da SDD
(`.superpowers/sdd/plano/progress.md`) e as conversas de execução de 2026-11-07 a 2026-11-13.

- **Pipeline de profundidade 1 (desvio declarado da SDD, `/executar-bloco` Passo 5.1).** A Task 2
  começou com a revisão da Task 1 em segundo plano, numa worktree destacada no commit dela (grupo
  G1, arquivos disjuntos). Custo se errado: uma correção da Task 1 cairia por cima do commit da
  Task 2. Não aconteceu, porque a Task 1 passou limpa.
- **Worktree de revisão sem o link de `frontend/node_modules`.** As Tasks 1 e 2 não tocam o
  frontend. Custo se errado: nenhum, porque o revisor não roda `pnpm`.
- **Os 4 minors da Task 2 corrigidos na hora (rodada 1), contra a regra de que minor não entra no
  loop.** Os scripts rodariam em produção na Task 4, antes da revisão final, e uma guarda que
  falhava aberta numa conta real não podia esperar. Custo se errado: uma rodada de minutos.
- **Tasks 3 e 4 feitas inline, sem revisor por task.** É o handoff do plano. A revisão final da
  branch as cobre. Custo se errado: um defeito no `audit.md` ou nos tickets só aparece no
  `/revisar-bloco`.
- **Tickets com os rótulos em inglês, como apareceram na tela.** O navegador do ensaio local estava
  em EN. Custo se errado: quem ler o ticket precisa procurar a chave es-CL correspondente.
- **Recusa da AWS (`DENIED` em 2026-11-07) tratada como pedido de mais informação, não como a
  recusa do D1.** A resposta automática pedia seis itens, então o João respondeu no caso em vez de
  parar o bloco. Os Steps 4–7 seguiram, pelo D15, porque não dependem da AWS. Custo se errado:
  nenhum, porque nada foi escrito na conta por causa disso.
- **`ConflictException` (409) no `put-account-details` de 2026-11-13 tratado pelo console, não pela
  CLI.** A revisão `DENIED` presa à conta só sai pelo suporte (aws-cli#6652). A Support API exige
  um plano pago e a conta é Basic, então o caso foi reaberto no console. Custo se errado: a
  primeira resposta da AWS pode levar até 96 h.
- **Trava D14 no navegador (Playwright `context.route`), no lugar da disciplina manual.** Antes do
  login, toda requisição que não fosse `GET`/`HEAD`/`OPTIONS` era abortada, salvo `POST /api/login`
  e `POST /api/logout`. A trava foi provada na própria página. Custo se errado: nenhum em
  produção. O que ela não cobre, a escrita sem permissão, já tinha sido provado no ensaio local.
- **O João digitou o login e a sessão conduziu o checklist.** O João pediu ("faça vc o teste"), e
  a senha nunca passou pela sessão. Custo se errado: as duas entradas do 252 em `login_logs`
  (16:04:56 e 16:06:05) ficaram atribuídas ao João, sem outra prova além da janela de horário.
- **Decisão do João (2026-11-13), registrada aqui por não estar na spec:** `DENIED` com o caso
  reaberto conta como "a AWS ainda não respondeu", não como a recusa que a spec §5 manda parar
  (D1, plano B Resend). O bloco mescla em `blocked` aguardando aceitação, sem a Task 5. A spec §5
  reserva esse caminho para quando a AWS não responde, e o João o estendeu a este caso. Os itens
  1, 2 e 5 do `aceitacao.md` e a Task 5 inteira (sonda real, aviso ao `lotus-site`, ADR-23,
  runbook §13.1/§13.6, P-98, FUT-4) vão para a lane de aceitação. Se a AWS recusar de novo depois
  da reabertura, vale o D1: a lane de aceitação para e volta ao João. Custo se errado: P-98 e FUT-4
  ficam abertos na `main` até a AWS decidir.
- **Texto do pedido à AWS versionado em `ses-pedido-2026-11-13.md`.** O arquivo era só local, e a
  Task 5 precisa dele numa lane futura. O texto vai com dois pontos a corrigir antes do runbook: a
  credencial é a role `lotus-ec2`, não um usuário IAM, e a afirmação de que os administradores leem
  a caixa `lotus@` depende da P-98. Custo se errado: nenhum, porque o arquivo só traz o remetente
  da própria Lotus.
- **Achados da revisão final da branch (0 Crítico, 2 Importantes, 6 Menores) corrigidos inline,
  sem implementador despachado.** São todos de documentação ou comentário. Os dois Importantes
  estão nas duas linhas acima. Menores: comentário de "fecha em erro" nos scripts, README dos
  scripts, itens 3 e 4 da aceitação, o 404 em `budgets/1` (no `audit.md` e no ticket 01), a
  ressalva do H0 de 6 dias antes e os itens 3 e 5 do checklist com o que faltou medir. Custo se
  errado: o `/revisar-bloco` acha o que esta passada deixou passar.
- **Itens 3 e 4 do `aceitacao.md` preenchidos pela sessão, com ponteiro para a Fase C do
  `audit.md`.** O João executou as ações junto com a sessão. Custo se errado: o João reescreve as
  duas células.
- **Atribuição do commit `3c891771` mantida como "Claude Haiku 5.5".** Foi o modelo que escreveu o
  commit, e reescrever o histórico só para isso não compensa. Custo se errado: cosmético.
