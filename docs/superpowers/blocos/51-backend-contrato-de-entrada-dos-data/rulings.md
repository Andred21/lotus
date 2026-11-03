# Bloco 51 — rulings da execução

Decisões tomadas em nome do João durante o `/executar-bloco` (SDD, 2026-11-03), na ordem em que foram tomadas, cada uma com o custo se estiver errada.

1. **Pipeline de profundidade 1 (desvio declarado do Passo 5.1).** Só as Tasks 3 e 4 (grupo G1) rodaram sobrepostas: o implementador da 4 começou enquanto o revisor da 3 lia uma worktree destacada em `4f9eaacb`. As demais rodaram em série. *Custo se errado:* nenhum. As duas tasks tinham arquivos disjuntos e a revisão não leu a árvore viva.
2. **A Task 3 regenerou o `generated.ts`, embora o brief proibisse.** `payment_terms` sem default não pode vir depois de parâmetro com default (deprecation do PHP 8.3), então subiu no construtor de `BudgetData`. Isso mudou a ordem do campo no TS. A lei §5.3 vence o brief, e o resultado está no commit `4f9eaacb`. *Custo se errado:* nenhum, porque é saída mecânica do transformer.
3. **A Task 4 foi instruída a regenerar e commitar se o tipo mudasse** (lição da Task 3). O transformer não gerou diff e nada foi commitado. *Custo se errado:* nenhum.
4. **O `= 0` de `CourseData::$workload_hours` não era código morto, e não parei por isso.** Medido em `main@1845d096`: PUT e POST de curso sem a chave davam 200 e gravavam 0. Não tratei como "defeito real novo" da D5 porque:
   - o campo já está na §2.1 e na P-51 (campo 3);
   - o conserto é exatamente o do plano (tirar o default);
   - o DoD 3 não muda.

   O teste do PUT passou a ser regressão vista vermelha. *Custo se errado:* você queria ser consultado antes. A mudança se desfaz numa linha. Efeito colateral: `POST /api/courses` sem `workload_hours` agora dá 422, mas o SPA sempre manda o campo.
5. **Interação com a lane 53 (I-1 da revisão final) fica fora desta branch.** A lane 53 cria `EnrollStudentData` com `?string $email = null` e `?string $phone = null`, injetado em `EnrollmentController::store`, e deixa `EnrollmentData` só de saída. O `InputDataDefaultsTest` então reprova no merge de quem chegar por último, e o manifest do TS conflita.

   Não toquei a lane alheia. Quem mesclar por último faz três ajustes:
   - tira `EnrollmentData` do piso `PRE_CLASSIFICADAS_2_1`;
   - trata os defaults de `EnrollStudentData` pela D5: `string|Optional|null` sem default, ou isenção com motivo, que é decisão sua;
   - regenera `generated.ts` e o manifest.

   *Custo se errado:* a `main` fica vermelha no segundo merge até o ajuste, o que o CI mostra.
6. **Premissa falsa da spec (I-2) corrigida por errata datada, sem reescrever o corpo** (commit `43b09a7c`). O fechamento da P-51 deve registrar o campo 3 como defeito real pago (fail-open), não "provado fail-closed". Deixo como sugestão uma leitura em prod: `SELECT id, name FROM courses WHERE workload_hours = 0`. *Custo se errado:* nenhum.
7. **O vermelho do `test_put_de_orcamento_sem_payment_terms_preserva` não está na mensagem do `498e3308`.** Está no `task-3-report` ("null is identical to '30 días'") e precisa entrar no registro de fechamento (DoD 2). *Custo se errado:* nenhum.
8. **Deixado de lado: `CourseModuleData::$theory_hours`/`$practice_hours = 0` sem `#[Required]`.** Um PUT de curso com módulo sem a chave recria o módulo com 0 horas, que é a mesma família do `workload_hours`. A spec isenta a classe e proíbe mexer na semântica (§4). Sugiro um débito no backlog no fechamento. *Custo se errado:* carga horária de módulo zerada em silêncio, caso algum chamador omita a chave. O SPA manda o campo hoje.

Minors que a revisão final triou como "pode ficar":
- `ClientFormFields.type` aceita `string|undefined`;
- `update([])` vazio no PUT sem `payment_terms`;
- o caminho (b) do alcance só reconhece `X::from($request` e `validateAndCreate(`;
- rastro histórico de `PageRequest` em docs arquivadas.

Corrigidos antes de fechar (`43b09a7c`):
- comentário do `useCourseForm.ts:51`;
- "relator" trocado por "redator" na `ISENTAS`;
- teste novo de POST de curso sem `workload_hours`, que dá 422.
