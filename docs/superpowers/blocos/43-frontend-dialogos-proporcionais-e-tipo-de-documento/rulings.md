# Bloco 43 — rulings da execução

Decisões tomadas na execução (`/executar-bloco 43`, subagent-driven-development), na ordem em que
foram tomadas. Cada linha diz o que custa se estiver errada.

## Decisões

1. **Par `danger` + escuro fora do caso novo do `tone-ink.test.ts`** (decisão do João,
   2026-10-29, Task 2). O plano mandava parar se o fundo de 15% do `severityTone` reprovasse. Só
   esse par reprovou, a 4,36:1, e o defeito é do `AppTag`, anterior ao bloco. Ficou registrado
   como P-105 (`7abb6822`). *Se estiver errada:* o ícone da `ConfirmDialog` danger e a tag danger
   no escuro seguem abaixo de AA até a P-105 ser paga.
2. **Ponteiro da P-105 corrigido na Task 3, não na Task 2.** A Task 3 já tocava o
   `tone-ink.test.ts`. *Se estiver errada:* nada, porque é comentário (`36c0cb90`).
3. **Pipeline de profundidade 1 entre as Tasks 4 e 5** (desvio declarado do Passo 5.1). O
   revisor da Task 4 rodou na worktree destacada `../lotus-rev-cc8c22fb` enquanto o implementador
   da Task 5 trabalhava na lane. As duas são do grupo G2, com arquivos disjuntos. *Se estiver
   errada:* um achado da Task 4 que exigisse mexer nos arquivos da Task 5 viraria correção
   empilhada. Não houve nenhum: a Task 4 saiu aprovada.
4. **Steps 2 a 6 da Task 6 delegados a um subagente opus**, não feitos na própria sessão como o
   plano previa. O motivo foi preservar o contexto do controlador diante das capturas de tela. O
   Step 1 (gate) rodou na sessão. *Se estiver errada:* o julgamento visual foi do subagente, e as
   capturas citadas no `smoke.md` estão no scratchpad desta sessão, que é efêmero.
5. **Fix `8198181a` aceito fora do Files da Task 6.** O `grid!` no ícone da `ConfirmDialog` foi
   necessário porque o `.pi` do primeicons não tem camada e vencia o `grid` do Tailwind, jogando
   o glifo para o canto. Na revisão final ganhou teste (`9df99f76`). *Se estiver errada:* o `!`
   escapa da camada `utilities`, e se o primeicons mudar a ordem de camadas, o `!` sobra.
6. **Cartões de tipo do upload empilhados** (decisão do João, 2026-10-29, I-1 da revisão final).
   Ficam em uma coluna, e o diálogo segue `sm` (`d31869dc`). *Se estiver errada:* o diálogo fica
   mais alto que o desenho lado a lado da spec.
7. **Rodada única de correção da revisão final** cobrindo I-1, M-1, M-3 (`sm:w-44`), M-5 e M-6.
   I-2 e M-2 foram docs, feitos pelo controlador (`a2ecda36`, `3e96ed5a`): P-106 a P-109 e a ficha
   da P-105 sem J10. *Se estiver errada:* `sm:w-44` (176px) é escolha minha para o "Seleccionar
   foto" caber numa linha, e a coluna da foto ficou 16px mais larga nos quatro diálogos com
   `FormPhotoRow`.

## Achados da revisão final deixados como estão

8. **M-4.** O teste do primário sobre o navy mede só `--brand`. Branco sobre navy passa com folga,
   e o nome do teste promete mais do que mede. *Se estiver errada:* o primário do claro (fundo
   `--surface-card`, borda `--brand-ink`) não tem régua sobre o navy.
9. **M-7.** "Subir documento" aparece em três chaves: gatilho, título e footer. As três são
   definidas pelo plano e pela spec, e nenhuma é chave órfã. *Se estiver errada:* fica texto
   redundante no i18n.
10. **M-8.** A grade do Alumno vira uma coluna abaixo de `sm`, enquanto a spec §4.4 e a J7 dizem
    "abaixo de `md`". O plano fixou `sm`, e o smoke mediu 640 e 700 px sem estouro. *Se estiver
    errada:* entre 640 e 768 px os campos ficam em duas colunas estreitas. A divergência de texto
    da spec fica para o `/revisar-bloco`.
11. **M-9.** `ConfirmIssueDialog` e `RevokeDialog` foram para 28rem sem serem vistos no navegador,
    embora o DoD 9 esteja cumprido. *Se estiver errada:* um corpo grande (o motivo do Revoke, a
    lista do Issue) fica apertado. Ficam apontados para o `lotus-ui-review` do `/revisar-bloco`.

## Decisão durante o `/revisar-bloco`

12. **`ClientDialog`, `StudentDialog`, `RedatorDialog` e o picker do `RedatorDesignation` em `lg`**
    (decisão do João, 2026-10-29, pedida durante a rodada 1 da revisão). Antes eram `md`, e o picker
    era `sm`; a tabela §4.3 da spec foi corrigida junto. O `lg` liga o maximizar nos quatro, porque
    o `AppDialog` decide o maximizar pelo tamanho. *Se estiver errada:* os cadastros abrem a
    64rem, com campos mais largos que o conteúdo pede.

## Minors adiados pelas revisões de task

A revisão final fez a triagem e concluiu que todos podem ficar.

- T2: o teste da `ConfirmDialog` não afirma o `borderTop` da faixa no DOM (o smoke mediu os 4px).
- T2: com `pending`, o `pr-6` do header da `ConfirmDialog` sobra, porque o X some. É cosmético.
- T3: o hover e o active do footer navy não têm teste (o smoke mediu nos dois temas).
- T4: no `RegisterResultDialog`, o `mb-4` do `FormErrorBanner` dentro do `gap-4` dobra o espaço, só
  no caminho de erro.
- T4: não há teste do Cerrar no footer do `ImportDialog` nem do `disabled` em `submitting` do
  `RegisterResultDialog`.
- T5: a cadeia `upload.error` → `useMutationErrors` → `error` do hook não tem teste (o smoke provou
  o 422 dentro do diálogo).
- T5: o teste do `pending` não cobre ESC nem `onHide` (o smoke provou o ESC travado).
- T5: os dois condicionais `tag &&` e `tag === null` do `FileList` são sutis.
- Final: o `chooseType` reseta a mutação mesmo quando o tipo clicado já está escolhido. Inofensivo.

## Incidente

- O script de sondagem do smoke clicou a lixeira de um documento no banco da lane e removeu
  `comprobante.pdf` (id 20, soft delete). O arquivo foi reposto (id 21). Foi assim que apareceu a
  P-106 (lixeira sem confirmação).
