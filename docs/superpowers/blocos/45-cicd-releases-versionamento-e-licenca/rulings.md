# Bloco 45 — rulings da execução

Decisões tomadas durante o `/executar-bloco 45` (SDD, Tasks 1 a 7). Cada uma diz quem decidiu e
quanto custa se a decisão estiver errada.

## Do João

- **Task 4, `exclude-paths` só casa diretório: opções A + B (emenda E3 da spec).** O
  release-please casa cada entrada como prefixo de diretório (`file.indexOf(path + '/') === 0`),
  então os arquivos soltos da raiz listados no `exclude-paths` não tinham efeito. **A:** o
  `CONTRIBUINDO.md` (`## Releases`) traz a regra: commit que toque só arquivo solto da raiz usa
  `docs`, `chore` ou `cicd`. **B:** o `exclude-paths` lista só diretórios, e a catraca
  `frontend/tests/release-please.test.ts` classifica cada arquivo solto em
  `INERTES_POR_CONVENCAO` e reprova arquivo no `exclude-paths`. **Se estiver errado:** um
  `feat`/`fix` que toque só `CLAUDE.md`, `README.md` ou `docker-compose*.yml` gera uma versão
  vazia, que se corrige fechando o PR de release sem mergear.

## Do controlador (em nome do João)

- **Passo 1 (caveman) pulado: a skill não existe neste ambiente.** **Se estiver errado:** nada;
  ela só comprime a narração.
- **Pipeline de profundidade 1 (Passo 5.1) não usado: a revisão foi sequencial.** O grupo G1
  (Tasks 3–6) ganhava pouco em paralelo. **Se estiver errado:** custou só tempo de relógio.
- **Backend provado no host, não no container `app`.** O Docker não estava disponível na sessão
  em nuvem, e a suíte da Task 3 rodou com o PHP 8.3 do host (mbstring e pdo_sqlite, sqlite
  `:memory:`). **Se estiver errado:** uma diferença de extensão ou versão entre o host e a imagem
  mascara uma falha, que o CI do PR pega.
- **13 falhas de ambiente do backend aceitas como não-regressão.** São 12 de `bcadd` (sem
  ext-bcmath no host) e 1 do `UserPhotoTest` (rodando como root). Já falhavam antes do bloco:
  conferido com `git stash`. **Se estiver errado:** uma regressão real nesses 13 testes passa
  despercebida até o CI do PR.
- **Task 3 tocou `backend/tests/Feature/Shared/ListQueryBudgetTest.php`, fora da lista de
  Files.** A catraca de rotas GET existente exige isso, e `api/versao` entrou como isenção com
  motivo. **Se estiver errado:** a rota deveria ter um cenário de budget; o custo é uma linha.
- **Task 4 Step 5: os branches descartáveis `tmp/45-rp-fix` e `tmp/45-rp-docs` não foram
  criados.** São escrita remota e não houve autorização. O dry-run com token placeholder deu
  401, então o DoD 4 fica parcial: a catraca e a config estão provadas, mas o MINOR, o PATCH e o
  "só docs não versiona" não foram provados contra o release-please real. **Se estiver errado:**
  o primeiro PR de release real é a prova; um bump errado se corrige editando o PR de release
  antes do merge.
- **Rodada 1 da Task 4 feita por um implementador novo, não pelo original.** O identificador do
  original se perdeu na compactação. **Se estiver errado:** só o custo de contexto, que o brief
  e o arquivo de correção cobriram.
- **Task 5, repromoção com a tag já no mesmo SHA responde "já publicada" sem conferir a
  Release.** É o "sucesso sem ação" da spec §4.2.4. **Se estiver errado:** se um `release
  create` anterior tiver falhado, a Release fica faltando até o João criá-la à mão
  (`CONTRIBUINDO.md`, `## Releases`).
- **Task 5, `contents: write` vale para o job inteiro do `deploy.yml`.** O GitHub não dá
  permissão a um passo só, e o passo de release é o último do job. **Se estiver errado:** um
  passo anterior comprometido teria escrita em `contents` no Gatika-CL; a alternativa é um job
  separado, com `needs:`.
- **Task 6, emenda ao plano: o teste e a fixture do backfill também vão para o
  `.espelho-exclusoes`.** O plano listava só o script e a tabela; o teste iria para o espelho
  sem eles e reprovaria o CI do Gatika-CL (spec §7). O precedente é o `repo-docs-refs.test.ts`.
  **Se estiver errado:** o teste roda só no `Andred21/lotus`, que é o desejado.
- **Task 6, as tags do backfill levam a data da tabela com `T12:00:00Z`.** A tabela só tem o dia.
  **Se estiver errado:** a hora da tag anotada não bate com a da promoção real; o custo é
  cosmético.
- **Revisão final, M3: o `contents: write` continua no job inteiro do `deploy.yml`, e não
  separei um job `release`.** Esse job já assume a role AWS de deploy via OIDC, e separar
  reescreveria o caminho de produção e a catraca `workflow-deploy.test.ts` na rodada final.
  **Se estiver errado:** um passo anterior comprometido escreve em `contents` no Gatika-CL. A
  correção é um job `release` com `needs: promover`, `permissions: contents: write` e
  `continue-on-error` no nível do job.
- **Revisão final, M6: a diferença entre as tags leves do release-please no `Andred21/lotus` e
  as anotadas do backfill e do Gatika-CL só fica documentada.** Não quebra nenhum contrato.
  **Se estiver errado:** uma ferramenta que exija tag anotada falha no Andred21.
- **Revisão final: uma única rodada de correção, com o C1, o I1 e os minors que a revisão
  marcou "corrigir".** Os outros minors adiados ficam registrados no ledger e vão para o
  `/revisar-bloco`. **Se estiver errado:** um minor registrado volta como achado na revisão de
  duas lentes.
