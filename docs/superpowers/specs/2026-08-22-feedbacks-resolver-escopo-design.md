# Spec — `feedbacks-resolver-escopo`

> Bloco 1 da fila consolidada (`backlog.md@ba59dbd9`), lane-a, main tree.
> Packet: `docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md`.
> Fontes canônicas medidas: Drive `requisitos-negocio.md` (lido em `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J`),
> `entidade-feedback.md` (lido em `11wSCY7J7yUEptJgjtSdRkiUuX6UttuGZ`),
> `modulo-pos-curso.md` (`1Nt0O--hHDQhHn-65ZXJf3fj9NrhW2ZwN`);
> Notion 7.4.1 (`39dbc960-3dfa-81ef-ad6f-d908331d5059`).
>
> **IDs vigentes após a escrita de 2026-08-22.** O MCP do Drive não edita conteúdo no lugar
> (`update_file` só troca título e pasta), então os dois documentos foram recriados com o texto
> atualizado e os originais foram para a lixeira — o `fileId` mudou:
> `requisitos-negocio.md` = `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` (14897 bytes),
> `entidade-feedback.md` = `16YxxQ52VnEeoah_SCja6TubnvtOtMDql` (2257 bytes).
> Packets anteriores citam os IDs antigos; são snapshots do que foi lido, não ponteiros vivos.

## 1. O problema, medido

O backlog registra a lacuna como "requisito canônico de feedbacks × ausência de `Domains/Feedback`".
A medição contra o código e contra o texto literal do Drive mostra que a lacuna **não é de
comportamento**: é de nomenclatura e de registro.

`RF-RED-07` diz, literal: *"Cadastra, em PDF, os livros de classe, as avaliações dos alunos e a
própria avaliação de cada turma."* Os três tipos de `TurmaDocumentType` são, um a um, esses três
documentos:

| Requisito | Estado no código |
|---|---|
| RF-FBK-01 — três origens (alunos, redator, cliente) | duas implementadas, uma diferida |
| RF-FBK-02 — avaliações de alunos e do redator, em PDF, pelo redator | **implementado**: `PRUEBAS` e `EVALUACION_REDATOR` em `backend/app/Domains/Operation/Enums/TurmaDocumentType.php`, upload por `operation.turma.submit_docs` (`StoreTurmaDocumentAction`) sobre a `files` polimórfica |
| RF-FBK-03 — avaliação do cliente, em PDF, pelo admin ao final da OS | **não implementado**, diferido pela D2 da spec de 2026-07-21 (`specs/archive/2026-07-21-bloco6d-conclusao-manual-design.md:44`) |
| RF-FBK-04 — necessários para finalizar turma e, por consequência, a cotação | **implementado**: RN-16 em `ConcludeTurmaAction.php:31-37`, sobre `TurmaHabilitacaoService` |

O que sobra de divergência real:

1. `docs/der-fisico.md:77-78` declara a tabela `feedbacks` (`turma_id`, `origem`) e `:89` a relação
   "(planejada) `feedbacks`" — schema que não vai existir.
2. `PermissionCatalog.php:87-89` declara `feedback.feedback.view` e `feedback.feedback.manage`, sem
   um consumidor sequer; `RolePermissionSeeder.php:73-74` as concede à role `redator`. Aresta
   declarada sem código — a mesma classe que o D-17 (BD-15, lane-c) quer detectar.
3. RF-FBK-03 está diferido sem rastro escrito na fonte canônica: quem ler o Drive hoje conclui que o
   requisito está em aberto e que falta domínio.

## 2. Decisões (João Victor, 2026-08-22)

- **D1 — Feedback é absorvido pelo documento de turma; não nasce domínio nem tabela.** A `files`
  polimórfica com `TurmaDocumentType` já é o mecanismo que o Drive descreve (PDF vinculado à turma,
  completude gateando a conclusão). Criar `Domains/Feedback` duplicaria infraestrutura existente e
  um segundo gate para a mesma pergunta.
- **D2 — Nenhum tipo de documento novo entra.** `PRUEBAS` é a avaliação dos alunos e
  `EVALUACION_REDATOR` a do redator, por RF-RED-07. O bloco **não altera** `TurmaDocumentType`, não
  altera a RN-16 e não muda o comportamento de conclusão de turma alguma.
- **D3 — As duas permissões órfãs saem do catálogo, do seeder e do banco.** A limpeza dos bancos já
  provisionados é feita por **migration**, não por re-seed: seeder só corrige quem o roda, e
  ambiente provisionado não roda.
- **D4 — O registro externo é parte do bloco.** O DoD do item é "requisito, planejamento e código
  deixam de divergir"; requisito mora no Drive e no Notion. Claude redige e mostra o texto; cada
  escrita externa exige OK explícito do João, documento a documento. Notion 7.4.1 vai para `Done`.
- **D5 — RF-FBK-03 fica diferido, nomeado.** Feedback do cliente pertence ao encerramento da ordem
  de serviço (RF-TUR-07: feedback do cliente, fatura final, comprovante, certificados), não à
  turma. Fica declarado como escopo futuro na spec, no DER e no Drive — não vira pendência silenciosa
  nem ficha de débito.

## 3. Escopo

### Entra

**Backend**

- `PermissionCatalog::descriptions()` perde `feedback.feedback.view` e `feedback.feedback.manage`,
  e com elas o bloco de comentário `// ---- Feedback ----`.
- `RolePermissionSeeder::redatorPermissions()` fica com `operation.turma.view` e
  `operation.turma.submit_docs`.
- Migration nova que apaga de `permissions` as duas linhas **por nome**, com `down()` recriando-as.
  Escrita destrutiva limitada a essas duas linhas nomeadas; o FK em cascata de
  `role_has_permissions` leva o vínculo junto.

**Frontend**

- `frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json` perdem
  `perm.feedback_feedback_view`, `perm.feedback_feedback_manage` e também
  `permGroup.feedback` — o rótulo do grupo, que o picker lê e que fica órfão quando a última
  permissão do grupo sai.
- `PermissionI18nParityTest` passa a cobrir `permGroup.*` além de `perm.*`. Hoje ele compara só as
  permissões, e o rótulo de grupo órfão não reprovaria nada: mesmo defeito de classe, um nível
  acima. A catraca entra **antes** da remoção, para que a remoção seja vista reprovando.

**Documentação (repo)**

- `docs/der-fisico.md`: a seção `### Feedback` e a menção "(planejada) `feedbacks`" saem; entra nota
  curta mapeando RF-FBK-01/02/04 para `files` + `TurmaDocumentType` + RN-16, e declarando RF-FBK-03
  futuro. A contagem de tabelas de `:111` acompanha.

**Documentação (externa, com OK por documento)**

- Drive `requisitos-negocio.md`: nota de estado sob RF-FBK.
- Drive `entidade-feedback.md`: nota de que a entidade não vira tabela na v2 e de que o
  `[A CONFIRMAR]` do autor individual se resolve por inexistência — o documento pertence à turma.
- Notion 7.4.1: status `Done`, com resumo e ponteiro para esta spec.

### Não entra

- `Domains/Feedback`, tabela `feedbacks`, endpoint ou tela de feedback.
- Qualquer tipo novo em `TurmaDocumentType`; qualquer mudança na RN-16 ou no gate de conclusão.
- RF-FBK-03 / RF-TUR-07 — feedback do cliente, fatura final, comprovante de pagamento.
- Renomear os tipos existentes para vocabulário de feedback. `MANUAL`/`PRUEBAS`/
  `EVALUACION_REDATOR` são valores persistidos em `files.type`; renomear exigiria migration de dados
  sem ganho de comportamento.
- Qualquer varredura genérica de arestas declaradas sem código — isso é o D-17, na lane-c (BD-15).

## 4. Riscos e o que os contém

| Risco | Contenção |
|---|---|
| Remover permissão tira capacidade real do redator | Medido: zero consumidor em `backend/app` e em `frontend/src`. O DoD prova o upload de documento de turma **funcionando depois** da remoção. |
| Locale órfã deixando chave crua na tela | `PermissionI18nParityTest` compara chave a chave e reprova por "Sobrando". A catraca é vista falhar antes da limpeza. |
| Migration destrutiva alcançar mais do que as duas linhas | `where('name', ...)` sobre os dois nomes literais; `down()` recria. Prova por contagem de `permissions` antes/depois e por `migrate:rollback`. |
| Banco de dev ficar com resíduo de sonda (P-44) | O bloco não cria sonda: a prova usa a sessão de redator e os dados existentes. Estado do banco medido antes e depois. |
| Divergência voltar na próxima leitura do Drive | D4: a nota externa entra no mesmo bloco, com OK do João. |

## 5. DoD — comportamento provado

1. `docker compose exec -T app php artisan test` verde, e a paridade de i18n **vista reprovando**
   com o catálogo já limpo e as locales ainda não (a catraca prova que segura).
2. `GET /api/permissions` na API real (`:8080`, sessão de admin) não devolve nenhuma `feedback.*`;
   contagem de itens medida antes e depois.
3. Banco de dev: `permissions` com `name like 'feedback%'` devolve 0 linhas depois da migration;
   as permissões da role `redator` caem de 4 para 2; `migrate:rollback` recria as duas e
   `migrate` remove de novo.
4. Sessão de redator real: o payload de permissões traz 2, e o **upload de documento de turma
   continua funcionando** — é a prova de que a remoção não tirou capacidade.
5. Picker de permissões no navegador, nos 3 idiomas: nenhum item de feedback, nenhuma chave crua.
6. `pnpm lint` 0, `pnpm build` verde, `pnpm test` verde; Pint nos PHP tocados;
   `typescript:transform` sem drift em `generated.ts`.
7. Drive e Notion atualizados, cada escrita com OK explícito do João, e os IDs registrados no
   fechamento.

## 6. Leis do `CLAUDE.md` §5

- §5.1 (DDD-lite, sem Repository) — não se aplica: nenhum agregado novo.
- §5.3 (tipos gerados) — `generated.ts` só muda se algum DTO mudar; a expectativa medida é que não
  mude, e o `typescript:transform` prova.
- §5.4 (Sanctum/RFC 7807) — intocado.
- §5.5 (só admin e redator autenticam) — o bloco reduz permissão de role, não altera quem autentica.
- §5.8 (DoD = critério provado) — §5 desta spec.

Nenhuma lei é contrariada. O ponto sensível é RBAC: a mudança **reduz** superfície, e a prova 4
existe justamente para mostrar que a redução não alcançou capacidade em uso.

## 7. Limitações declaradas

- RF-FBK-03 e RF-TUR-07 seguem sem implementação; a spec os nomeia como futuros, não como pendência.
- A prova 4 depende de uma sessão de redator ativo. A RN-01 mantém redator ativo apenas por ação do
  admin; se não houver redator ativo no banco de dev no momento da execução, a ativação é decisão do
  João e fica registrada como tal — o bloco não ativa conta por conta própria.
- O texto exato das notas externas é redigido na execução e mostrado antes de escrever; esta spec
  fixa o conteúdo, não a redação final.
