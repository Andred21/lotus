# Bloco 39 — rulings da execução

> Decisões tomadas em nome do João durante o `/executar-bloco 39`, uma por linha, cada uma com o custo se estiver errada.

- **Pipeline de profundidade 1 na execução** (desvio declarado da SDD estritamente sequencial, conforme `/executar-bloco` §5.1). As Tasks 3 e 5 (G1) e as Tasks 4 e 6 (G2) se sobrepuseram: o revisor de cada uma rodou numa worktree destacada no commit da task. Custo se errado: o revisor lê um commit já superado, e um achado vira correção sequencial sobre a task seguinte.
- **Task 4: `CadastroAuthorizationTest.php` editado fora do `Files:`.** Saiu a linha que fazia POST em `/api/courses/{id}/templates` esperando 403. A rota não existe mais e a suíte quebrava. O 404 está coberto em `CourseCrudTest`. Custo se errado: perde-se um caso de autorização de uma rota que já não existe.
- **Task 6: " (RN-09)" removido de `operation.redator.helpNote` e `confirmIneligibleMessage` nos 3 locales.** A catraca UI-04 (`frontend/src/shared/config/locales/copy.test.ts`) reprova `(RN-\d+)` em texto de tela, e o resto da tabela do plano ficou literal. Custo se errado: o usuário não vê a sigla da regra no aviso. Reverter exige mudar a catraca.
- **Task 6: `RedatorDesignation.aviso.test.tsx` criado fora do `Files:`.** O `max-lines: 150` do eslint vale também para os testes de `features/*/components`. Custo se errado: mocks duplicados em dois arquivos de teste.
- **Tasks 2, 4 e 5: `frontend/src/shared/types/typescript-transformer-manifest.json` entrou nos commits.** É o hash que o `typescript:transform` regenera junto com o `generated.ts`. Custo se errado: nenhum funcional.
- **Task 2: os três testes de data do `IssueCertificateTest` perderam o template** (virada do ano, 23h em Santiago, ano local) e passaram a esperar `valido_ate` nulo. O que eles provam, o fuso e o ano do código, segue igual. Custo se errado: nenhum, porque a vigência deixou de existir na emissão (D-spec).
- **Task 3: o teste do "curso sem módulos" verifica `<table class="temario-head">` e `Temario del Curso` ausentes,** em vez de `temario-head`. A classe existe sempre no CSS do Blade. Custo se errado: nenhum, porque a asserção é equivalente à intenção do plano.
- **Task 3: o QR fixa o encoding nos dois ramos** (`UTF-8` na amostra, `ISO-8859-1` no real). O `—` de `MUESTRA — SIN VALIDEZ` estourava o ISO-8859-1, e a fachada do QR é compartilhada no processo. O ramo real usa o mesmo default de antes, e o hash do `CertificadoEmitidoIntactoTest` prova isso. Custo se errado: o QR real mudaria. A guarda pegaria.
- **Revisão final, I-1: a constante `HTML_ANTES_DO_BLOCO_39` foi recapturada** (`7b7edbbc…` → `1323f813…`) depois que todo campo congelado do fixture passou a diferir do vivo. A medição rodou contra o código de `0740843a` (`git restore --source=0740843a` em `backend/app`, `resources`, `config` e `lang`), e o HEAD dá o mesmo hash. Custo se errado: a guarda do emitido estaria medindo o HTML errado. A medição dupla, no código antigo e no novo, mitiga isso.
- **Revisão final, M-4: fica como está o preview com a cidade do emissor vazia,** que imprime "En  a <data>" sem recusar. A produção usa o default `Santiago`. Custo se errado: a amostra sai feia se alguém zerar a `CERTIFICATE_ISSUER_CITY`.
- **Revisão final, M-5: fica como está o comentário de `OperationDemoSeeder.php:367`,** que ainda cita o "gate RN-09". A fronteira com a lane 38 proíbe tocar seeders. Custo se errado: um comentário falso no seeder de demo até uma ficha posterior.
- **Minors adiados que ficam** (triados pela revisão final como "pode ficar"):
  - `backend/.env.example` sem `CERTIFICATE_ISSUER_CITY`;
  - `emissionCityFor` aceita `local_aplicacao` em branco (comportamento herdado; o HTTP barra);
  - sem controle positivo de `temario-head` no `CertificatePreviewTest`;
  - literal `'ISO-8859-1'` no ternário;
  - `isEligible()` sem chamador (a spec manda manter);
  - comentários antigos em `SeqInBudgetNotMassAssignableTest`, `CreateCourseAction` e `CourseModuleDataTest`;
  - piscar de motivos vazios ao fechar o `ConfirmDialog`;
  - `motivosDe` O(n·m);
  - wrapper flex-col e opener por linha em `CourseRowActions`;
  - reflow do docblock de `CourseCertificateTemplate`.

  Custo se errado: limpeza cosmética pendente.
- **Smoke, item 2: a turma 3 virou presencial por instantes no banco local da lane** (via `DB::table`, sem audit, e revertida), porque o seed não tem turma presencial concluída. Custo se errado: nenhum fora da lane.
- **Smoke: achado fora do escopo, sem correção neste bloco.** O certificado real com nota e asistencia transborda a página 1 (3 páginas). A causa é o layout do Blade, anterior ao bloco. Está registrado em `smoke.md` para o João decidir se abre ficha. Custo se errado: certificados com nota e asistencia continuam saindo com uma página quase vazia até a ficha.
