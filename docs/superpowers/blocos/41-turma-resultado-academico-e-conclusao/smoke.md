# Bloco 41 — smoke no navegador

Data: 2026-10-24. Lane `feat/41-turma-resultado-academico-e-conclusao`, offset +1 (API :8081,
Vite :5174), HEAD `84a6d409`. Navegador: `playwright-cli` (Chromium 1237, headless), idioma es-CL,
login `admin@lotus.cl`.

## Gate fresco (Step 1)

- `php artisan test`: 1398 passed, 5 skipped (9863 assertions).
- `pnpm -C frontend lint`: limpo.
- `pnpm -C frontend test`: 176 arquivos, 1224 testes verdes.
- `pnpm -C frontend build`: verde (só o aviso de chunk size, anterior ao bloco).

## Cenário

`migrate:fresh --seed`. Turmas do seed: 1 e 2 em andamento com redator; 3 concluída (online, 15
alunos aprovados/reprovados sem nota nem presença, nenhum certificado); 4 em andamento sem redator
(CGE).

## O que foi visto

1. **Aba Alumnos da turma concluída (3).** Colunas `NOMBRE · RUT · NOTA · ASISTENCIA · ESTADO
   MATRÍCULA · ações`. O seed não traz nota/presença, então as células mostravam `—` até a correção
   do item 3; depois dela, a linha mostra `6,4` e `87,5 %`. Só o botão "Registrar resultado" na
   coluna de ações (sem remover). O aviso da página diz "La turma está concluida: solo se pueden
   corregir la nota, la asistencia y el estado de alumnos aún sin certificado."
   Captura: `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item1-tabela-concluida-1440.png`
2. **Diálogo de resultado na turma em andamento (2).** Nota `5` + asistencia `80` → o status passou
   sozinho de Pendiente para Aprobado. Trocado à mão para Reprobado → aviso amarelo acima dos botões:
   "Nota 5 y asistencia 80 % alcanzan el mínimo (4,0 y 70 %): la regla indica Aprobado. Puedes
   guardar de todas formas." Guardar habilitado; salvou, e a linha ficou `5,0 · 80 % · Reprobado`.
   Captura: `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item2-aviso-divergencia.png`
3. **Correção na turma concluída e trava por certificado (3).** Admin corrigiu o Diego Inostroza
   (nota `6,4`, asistencia `87.5`, Aprobado) → 200, linha atualizada. Emitido o certificado dele em
   Certificados → Emisión (status `emitido` no banco). De volta à aba Alumnos: a linha do Diego ficou
   sem ação; as outras 9 da página seguem com "Registrar resultado".
   Capturas: `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item3-dialogo-concluida.png`,
   `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item3-acao-some-apos-emissao.png`
4. **Turma sem redator (4, CGE).** Aba Conclusión: "En curso (bloqueado)", lista "Falta para
   concluir la turma:" com "Redactor designado" e "Evaluación del redactor" (documento), aviso novo
   da conclusão, botão "Confirmar conclusión" desabilitado.
   Captura: `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item4-sem-redator.png`
5. **Turma pronta com alunos sem nota (2).** O diálogo de confirmação listou "Alumnos sin nota o
   asistencia:" com os 7 alunos sem resultado ("— sin nota ni asistencia"), sem o aluno do item 2,
   e a linha "No bloquean la conclusión…". Confirmar habilitado; a turma foi concluída ("Concluida
   el 24-10-2026").
   Captura: `/tmp/claude-1000/-home-jvbat-projetos-lotus-41-turma-resultado-academico-e-conclusao/9398f93a-c0dd-4df2-9dac-f513944ec413/scratchpad/item5-confirmacao-incompletos.png`

## Medida da tabela de alunos

- **1440 px:** tabela de 1134 px, colunas 330/165/128/183/183/143. Nenhuma célula quebra linha, e a
  página não rola na horizontal.
- **390 px:** a tabela fica no piso de `40rem` (640 px) e rola dentro do próprio wrapper (276 px
  visíveis); a página não rola (`scrollWidth` 390). NOTA, ASISTENCIA e ESTADO cabem numa linha.
  **O RUT quebra no hífen** ("16.200.021-" / "7") nas 10 linhas.
- **O piso fica em `40rem`.** O RUT quebrado não vem do piso. A coluna é `field="rut"` sem
  `identifierClass`, desde antes do bloco. Pelo peso das colunas (`COL.rut` 9 de 37 antes, 9 de 54
  agora, menos a coluna de ações de 71 px), ela tinha cerca de 105 px no piso antigo de `31.5rem` e
  tem 95 px agora. O RUT em mono precisa de cerca de 133 px, então já quebrava antes. Medido no
  navegador, nem `48rem` evita a quebra (coluna de 115 px). A correção é dar `identifierClass` à
  coluna RUT, nesta tabela e na de arquivados. Ela fica fora do plano e vai para o João como
  pendência.

## Observação para a revisão

- **Presença com vírgula.** A sugestão do diálogo lê `87,5` (o `parseAttendance` aceita vírgula),
  mas a API recusa com `El campo attendance pct debe ser numérico.`. A validação `numeric` do
  `EnrollmentResultData` é anterior ao bloco, e a spec só define a presença como "numérico 0–100".
  Na prática, o usuário digita `87,5`, vê o status sugerido e o salvar falha com o nome técnico do
  campo. Com ponto (`87.5`), salva.

## Estado deixado no banco da lane

A turma 2 ficou concluída, com o aluno do item 2 reprovado. A matrícula 21 (turma 3) tem nota 6,4,
presença 87.5 e certificado emitido. É dado local do offset +1; `migrate:fresh --seed` restaura.
