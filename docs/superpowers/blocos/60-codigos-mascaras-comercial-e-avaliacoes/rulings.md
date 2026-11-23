# Bloco 60 — rulings

A sessão de execução tomou estas decisões em nome do João. Cada linha traz o que custa se a
decisão estiver errada.

1. **A Task 1 (medição em produção) não bloqueou as Tasks 2 a 8.** A medição só alimenta a 9 e a 15.
   A sessão executou da 2 à 8 e parou antes da 9, até existir o `medicao-producao.md`. Se errado:
   nenhum custo, só a ordem.
2. **Desvio declarado do harness: pipeline de profundidade 1 (Passo 5.1) no grupo G1 (Tasks 4 a
   7).** O revisor de cada task trabalhou numa worktree destacada no commit dela. As correções
   continuaram sequenciais. Se errado: nenhum custo no código, porque cada revisão viu o commit
   exato da sua task.
3. **`CourseData.code` mantém `?? new Optional`.** Isso preserva o tipo `string|Optional`, e o nulo
   só existe fora da Action. Se errado: a UI trata o `code` ausente, e o `courseLabel` já cobre esse
   caso.
4. **As chaves de locale do curso ficam em `course.*`, não em `catalog.course.*`.** Seguem o
   namespace que já existia. Se errado: nenhum custo funcional, só um rename de chave.
5. **A Task 3 tocou o `useQuoteCourseSearch.ts` e o teste dele, fora da lista de Files.** A busca por
   código mora lá. Se errado: reverter uma linha de filtro.
6. **O código do curso aparece só onde a spec §4.1 enumera.** As telas de turma e de redator não
   mudam. Se errado: a Lotus pede `C-n` em outra tela, e isso é uma task pequena.
7. **Três chaves extras de locale foram aceitas:** `client.budgets.{emptyFiltered,searchPlaceholder,date}`.
   Se errado: remover três chaves.
8. **A Task 14 rodou antes da 9, enquanto a medição não chegava.** As Tasks 9 a 13 e a 15 esperaram
   a saída do João. Se errado: nenhum custo, só a ordem.
9. **O cabeçalho de `medir-formatos-producao.php` foi corrigido.** O comando do plano falhou três
   vezes nas mãos do João, porque o usuário `ubuntu` precisa de `sudo docker` e o tinker lido pela
   entrada padrão recusa a linha `<?php` (daí o `tail -n +2`). O mesmo ajuste foi para o
   `conferir-pos-deploy.php`. Se errado: nenhum custo, porque é comentário.
10. **Em inglês, o `EVALUACION_REDATOR` se chama "Instructor evaluation".** Para isso, a catraca
    UI-05 (`copy.test.ts`) ganhou uma exceção estreita só para
    `operation.documents.type.EVALUACION_REDATOR`, porque a spec fixa "Instructor" como nome do
    documento da Lotus, não do papel. Se errado: trocar uma string em `en` e remover a exceção.
11. **Três fixtures de front, fora dos Files, ganharam `missing_optional_document_types: []`.** O
    tipo gerado exige o campo. Se errado: nenhum custo.
12. **Remover documento de turma concluída sem poder sobre o tipo dá 403 antes do 422
    (`concluded_locked`).** É a mesma ordem do anexar, e preserva o teste existente. Se errado:
    trocar a ordem no `TurmaDocumentGate`.
13. **A turma concluída do redator sai com `missing_types=[]`.** Ela não vira pendência nem conta
    no KPI. Se errado: uma linha no `pendenciaRow`.
14. **O progresso da aba de documentos conta só os tipos que bloqueiam ("2 de 2" na turma
    habilitada).** Cliente e Alumnos aparecem só no aviso do `EvaluacionesCard`, porque a spec os
    trata como aviso. Se errado: voltar o total a 4 no `useTurmaDocsSection`.
15. **O contador do cabeçalho da `PendenciasList` conta só turmas com tipo bloqueante.** A turma
    que só tem aviso aparece listada, sem contar. É consequência da decisão 13. Se errado: trocar o
    filtro de contagem, uma linha.
16. **O `Phone` valida com `isValidNumber`, não com `isPossibleNumber`.** A spec diz "validar", e o
    `isPossibleNumber` aceita lixo de comprimento certo. Se errado: o telefone legado numa faixa que
    a metadata da lib não conhece vira NULL na conversão, e o formulário recusa o número. O valor
    antigo fica no audit e o id no log `telefones.e164`, então é reversível pelo audit. A troca é uma
    linha em `Phone::tentar()`. **A ratificar pelo João, junto com a decisão 18.**
17. **`CorteDeEvaluaciones::DESDE = '2026-11-24'`, a data prevista do merge.** O `/finalizar-bloco`
    reconfere a data antes do PR. Se o merge cair em outro dia, a troca é de uma linha:
    - merge antes do dia 24: a turma concluída entre o deploy e o dia 24 escapa do aviso;
    - merge depois do dia 24: a turma concluída antes do deploy ganha aviso.
18. **A lacuna da medição (I2 da revisão final) não virou código.** Antes do merge, o João roda em
    produção, só leitura:
    `select char_length(phone) n, left(phone,1) d, count(*) from users where phone regexp '^[0-9]+$' group by 1,2`.
    Se aparecer número de 8 dígitos começando por 9 (celular anterior a 2012, sem o 9 extra), há
    duas saídas: acrescentar a variante "prefixar 9" ao `Phone::variantes()`, com uma linha e um
    teste, ou aceitar a perda. Sem a medição, a regra seria especulativa. Se errado: o celular
    antigo vira NULL no deploy, com o valor no audit e o id no log.
19. **A rodada única de correção da revisão final foi F1 a F8:**
    - o NBSP e o travessão Unicode no telefone;
    - a turma concluída no Cumplimiento;
    - os textos de turma concluída;
    - a ordem dos orçamentos no diálogo do cliente;
    - "D-60", que virou "bloco 60";
    - "Cot", que virou "R";
    - `lazyById` na migration 000002;
    - os documentos da Task 17.

    Foram para o backlog:
    - centralizar no front "o que bloqueia";
    - a carga inicial gravando telefone sem validar;
    - um trait para os mutators;
    - a API sem consumidor;
    - os Minors das tasks que a revisão final triou como backlog (lista no fim deste arquivo).

    Se errado: dívida pequena e visível no backlog, sem nenhuma no dado.
20. **Os 10 itens que a revisão final marcou como "Declined to judge" ficaram aceitos como fora do
    bloco.** São pré-existentes, decisão pendente do João (o vocabulário turma, clase e grupo no
    es-CL) ou sem efeito. Se errado: nenhum custo novo.

## Ajustes pedidos pelo João depois da execução (2026-11-23)

O João pediu quatro ajustes antes da revisão. Eles estão fora da spec, mas dentro do escopo do bloco
por decisão dele. Commits `7e5eab64`, `50145e07` e `b25ed6e3`.

1. **O código de registro ganhou a grafia do Scap da tabela de presupuestos** (pedidos 1 e 2):
   negrito, cor primária, sem mono. Vale para o `C-n` do curso e para o código da fila de
   cotizações da Operação. Decisões da sessão dentro do pedido:
   - A grafia virou a peça `RecordCode` em `shared/ui`, e as quatro cópias literais que já existiam
     passaram a usá-la. A rule de estilização registra a peça. Se errado: voltar a quatro literais.
   - O título do diálogo de curso e o link "Presupuesto … · Cotización …" do cabeçalho da turma não
     mudaram, porque um é título e o outro é botão sublinhado. Se errado: dois sítios a trocar.
2. **O telefone ganhou linha inteira** (pedido 3). O ajuste foi medido no navegador antes e depois.
   - **Admin:** o email e o telefone passaram para linha inteira em qualquer largura. Antes o campo
     do número tinha 116px; agora tem 384px a 1440px.
   - **Aluno e redator:** linha inteira abaixo de `xl`. Antes o número tinha 26px a 640px; agora
     tem 160px.
   - **Contato do cliente:** linha inteira abaixo de `lg`. Antes 89px a 640px; agora 326px.
   - Decisão da sessão: o email acompanha o telefone, para não sobrar buraco ao lado dele na grade.
     O de inscrição de aluno e o de Meu Perfil não foram pedidos e não mudaram. Se errado: as
     larguras de corte são uma classe por sítio.
3. **Em es-CL, o papel passou a se chamar Instructor** (pedido 4): 47 trocas no front e 10
   mensagens da API, no singular e no plural. Decisões da sessão:
   - A API dizia "relator", não "Redactor", e também trocou, para a tela ter um nome só.
   - O PDF do manual ("Relator(es)") e o marcador da prévia do certificado ("NOMBRE DEL RELATOR")
     não mudaram, porque são documento com peso legal, não interface. A decisão sobre eles é do
     João.
   - O pt-BR ("Redator") e o en ficaram como estavam, porque o pedido foi só para o es-CL.
   - Se errado: uma troca de string por locale.

## Pendências para o João antes do merge

- Ratificar a decisão 16 depois de rodar a consulta da decisão 18.
- Preencher o item 1 do `aceitacao.md` (Resultado e Data da medição de 2026-11-22).
- Limpar os dados de teste do banco local da lane (`users.id=58` e `59`). Afeta só o dev.

## Minors deixados para o backlog (decisão 19)

As revisões de task acharam estes Minors, e a revisão final da branch os triou como backlog. Nenhum
deles toca dado.

- **Task 2:** o `PerformanceScenarioSeeder.php:99` cria curso sem `code`. É só dev, e o `CourseData`
  cobre o nulo.
- **Task 3:**
  - a busca casa o separador do rótulo (`·`);
  - o `CourseDialog` não tem teste de render;
  - Redator e CourseCard ficam sem código, pela decisão 6.
- **Task 5:** o comentário de `BudgetStatusCell.tsx:8` tem um espaço sobrando.
- **Task 6:** o teste cobre só a carga inicial, com stubs.
- **Task 7:** o `toLocalIsoDate` ficou público, e há callbacks sem asserção.
- **Task 8:**
  - `load.items` traz a lista inteira;
  - `created_at->` não é null-safe.
- **Task 9:** o `bloqueiaConclusao()` não tem consumidor, embora a spec o peça.
- **Task 10:**
  - o gate base também aceita `manage_concluded_docs` em turma em andamento, o que é equivalente
    hoje;
  - o es_CL `operation.php:8` diz "grupo";
  - não há teste de role só com `submit_client_evaluation`;
  - o ramo `tryFrom ?? null` não tem teste.
- **Task 11:**
  - o docblock do `ListQueryBudgetTest` declara mais do que testa;
  - falta teste de fronteira do `>=` no corte;
  - dois testes passam por construção;
  - o nome `$comBloqueantes` é opaco.
- **Task 12:**
  - o `EvaluacionesCard` não tem `uploadHint`;
  - não há teste de integração do aviso em turma concluída;
  - o `ConcludePanel` concluído não repete o aviso;
  - os estados `removing` e `removeError` são compartilhados entre os slots.
- **Task 13:**
  - o "—" perdeu o `wrap-break-word`;
  - uma lista só com turmas de aviso mostra cabeçalho 0 com linhas (decisão de UX do João, decisão
    15);
  - a asserção `not.toContain('2')` é fraca.
- **Task 14:**
  - import relativo no `RutInput`;
  - RUT inválido sem `aria-describedby`;
  - `setDraft` inline;
  - teste `async` sem `await`;
  - faltam testes de DV K, de `Field` e de `ImportRowEditor`;
  - o cursor vai para o fim ao reformatar.
- **Task 15:**
  - o `StudentResolver::updatedIdentity` revalida o telefone copiado, contra a letra da spec §4.8.
    Fica inerte depois da migration 000004;
  - falta asserção de audit na linha soft-deletada.
- **Task 16:**
  - digitar só `+56` deixa o campo visualmente vazio e envia `+56`, que volta com 422;
  - trocar o país com texto não numérico apaga o texto;
  - o campo não tem `maxLength`;
  - `phone.ts` não tem teste unitário próprio.
- **Task 17:** o `FONE_ZERADOS` conta qualquer zeragem de console sem usuário, não só a da migration.
  Para separar, cruze com os ids do log `telefones.e164`.
- **Revisão final:**
  - centralizar no front "o que bloqueia";
  - a carga inicial grava telefone sem validar (`CarregadorDeCadastros.php:435`);
  - um trait para os mutators de `User` e `ClientContact`;
  - `Phone::parse()` e `e164()` sem consumidor;
  - a coluna Habilitada, ordenável, põe a concluída junto das não habilitadas.
