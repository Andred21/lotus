# BD-15 · Docs: guardrails e sincronização — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer código, `/docs` e Notion concordarem sobre entregue × pendente × descopado, ligar a catraca que detecta aresta de domínio declarada e não usada, e declarar por medição o que não pode ser fechado aqui.

**Architecture:** três naturezas com provas diferentes — doc local (alcance medido no arquivo), escrita externa no Notion (releitura por ID depois do write) e mecanismo (catraca vista reprovar por sonda antes de passar). Nenhuma delas depende das outras, então as tasks são independentes e cada uma fecha em um commit.

**Tech Stack:** Markdown (`docs/`), PHPUnit arch test (`backend/tests/Feature/Shared/`), MCP Notion (`mcp__claude_ai_Notion__*`).

**Spec:** `docs/superpowers/specs/2026-08-22-bd15-docs-guardrails-e-sincronizacao-design.md`
**Packet:** `docs/superpowers/context-packets/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md`

## Global Constraints

- **Árvore:** este worktree (`/home/jvbat/projetos/lotus-bd15`), branch `docs/bd15-guardrails-e-sincronizacao`. Exceção à regra de main tree declarada na §1 da spec (D5). Não `cd` para o repositório original.
- **Notion — endereçamento por ID apenas.** Base canônica `collection://e64b7d57-d000-4433-b652-a410e75193cc` (database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`). **Zero busca por título:** a base homônima obsoleta `collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` ainda responde busca e já produziu 12 falsos positivos.
- **Notion — não-destrutivo (D1).** Nenhuma página apagada, movida ou mesclada. Só `update_properties`.
- **Notion — releitura obrigatória.** Todo write é seguido de `notion-fetch` por ID; o valor lido de volta entra na mensagem do commit.
- **Status alvo:** `Concluída`. Conferir o conjunto de opções da propriedade no `fetch` do schema antes do primeiro write; se `Concluída` não constar com essa grafia exata, **PARE** e reporte.
- **Não retro-editar** plano ou spec arquivados (regra da P-27). Divergência de bloco fechado vira nota na linha da entrega.
- **Pint:** só se algum `.php` for tocado, e do host de dentro de `backend/`, sempre com o arquivo como argumento.
- **`docs/der-fisico.md:74`** descreve colunas, está correta e **não se toca**.

---

### Task 1: Regra C — aresta declarada sem consumidor

**Files:**
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (acrescenta um método depois de `test_todo_dominio_em_disco_esta_declarado_na_matriz`, que termina na linha 209)

**Interfaces:**
- Consumes: `arquivosDeDominio(): array<string, list<string>>` e `referenciasCrossDomain(string $arquivo, string $origem): list<array{0:string,1:string,2:string}>`, ambos privados e já existentes no mesmo arquivo; `self::ALLOWED`.
- Produces: nada para outras tasks. Esta é a única task que toca `backend/`.

**Por que a varredura tem de ser `referenciasCrossDomain` e não linhas `use`:** o helper roda sobre `codigoSemComentarios()` (`token_get_all`, docblock fora) e casa `use`, `use ... as`, FQN inline `\App\Domains\…` e string de classe. Uma Regra C escrita sobre `use` acusaria de órfã toda aresta consumida só por FQN inline — o escape que o docblock do teste diz ter fechado de propósito.

- [ ] **Step 1: Medir a baseline antes de tocar no arquivo**

```bash
docker compose up -d app
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: 3 testes, todos verdes (`test_dependencia_entre_dominios_respeita_a_matriz`, `test_todo_dominio_em_disco_esta_declarado_na_matriz`, `test_group_use_de_dominio_nao_e_suportado`). Anote o número.

- [ ] **Step 2: Escrever a Regra C**

Acrescente este método logo depois de `test_todo_dominio_em_disco_esta_declarado_na_matriz()` (que fecha na linha 209), antes de `test_group_use_de_dominio_nao_e_suportado()`:

```php
    /**
     * Regra C — a direção contrária da Regra B (D-17).
     *
     * A Regra B pega aresta USADA e não declarada; sem esta, a matriz envelhece
     * com sobra em silêncio: o import sai no refactor e a linha fica, dando
     * permissão a um vínculo que ninguém mais tem.
     *
     * A varredura é a MESMA da Regra B — `referenciasCrossDomain` sobre o código
     * sem comentários. Escrita sobre linhas `use`, esta regra acusaria de órfã
     * toda aresta consumida só por FQN inline (`\App\Domains\X\Models\Y::find(1)`),
     * que é justamente o escape que o docblock desta classe fecha de propósito.
     *
     * Referência ao namespace (camada ou classe vazias) não conta como consumo:
     * é violação de forma e a Regra B já a reprova pelo nome certo.
     */
    public function test_toda_aresta_declarada_tem_consumidor(): void
    {
        $orfas = [];

        foreach ($this->arquivosDeDominio() as $origem => $arquivos) {
            $usadas = [];

            foreach ($arquivos as $arquivo) {
                foreach ($this->referenciasCrossDomain($arquivo, $origem) as [$alvo, $camada, $classe]) {
                    if ($camada === '' || $classe === '') {
                        continue;
                    }

                    $usadas[] = "{$alvo}\\{$camada}\\{$classe}";
                }
            }

            foreach (self::ALLOWED[$origem] as $declarada) {
                if (! in_array($declarada, $usadas, true)) {
                    $orfas[] = "{$origem} -> {$declarada}";
                }
            }
        }

        $this->assertSame([], $orfas, implode("\n", array_merge(
            ['Regra C — aresta declarada em DomainDependencyTest::ALLOWED sem nenhum consumidor no domínio de origem. A matriz só encolhe por refactor consciente: se o import saiu, a linha sai junto.'],
            $orfas,
        )));
    }
```

- [ ] **Step 3: Rodar e verificar que passa (47 declaradas, 0 órfãs)**

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: 4 testes verdes.

- [ ] **Step 4: A sonda — ver a catraca REPROVAR**

Catraca que nasce verde não provou nada. Insira uma aresta falsa na matriz: em `self::ALLOWED`, na entrada `'Catalog'`, acrescente a linha

```php
            'Certification\Models\Certificate',
```

logo abaixo de `'Identity\Models\Redator',`. Rode:

```bash
docker compose exec -T app php artisan test --filter=test_toda_aresta_declarada_tem_consumidor
```

Esperado: **FAIL**, com a mensagem contendo `Regra C — aresta declarada` e a linha `Catalog -> Certification\Models\Certificate`. Copie a linha de falha — ela entra na mensagem do commit.

- [ ] **Step 5: Remover a sonda e confirmar verde**

Apague a linha `'Certification\Models\Certificate',` que você acabou de inserir.

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
git diff --stat backend/
```

Esperado: 4 testes verdes, e o `git diff --stat` mostrando **um** arquivo alterado — se aparecer mais de um, a sonda não foi removida por inteiro.

- [ ] **Step 6: Suíte de backend inteira, para provar que a regra nova não reprova nada existente**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. Anote passed/skipped e compare com a baseline do Step 1.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/DomainDependencyTest.php
cd .. && git add backend/tests/Feature/Shared/DomainDependencyTest.php
git commit -m "test(shared): Regra C — aresta declarada sem consumidor reprova (D-17)

47 arestas declaradas, 0 órfãs: a catraca liga verde. Provada por sonda —
aresta falsa Catalog -> Certification\\Models\\Certificate reprovou antes de
sair. Reusa referenciasCrossDomain (código sem comentários, FQN inline conta)
e não linhas use, senão aresta consumida por FQN inline viria como órfã."
```

---

### Task 2: ADR-20 — OpenSpout (P-20)

**Files:**
- Modify: `docs/adrs.md` (insere o ADR-20 depois do ADR-19, que termina imediatamente antes do `---` da linha 263)

**Interfaces:**
- Consumes: nada.
- Produces: `ADR-20` como referência citável pela Task 12 (ficha da P-20).

- [ ] **Step 1: Confirmar o ponto de inserção**

```bash
grep -n "^## ADR-19\|^---$\|^## Pendências abertas" docs/adrs.md | tail -4
```

Esperado: `## ADR-19` seguido, mais abaixo, de uma linha `---` e depois `## Pendências abertas (não decidir sem o João Victor)`. O ADR-20 entra **entre o fim do ADR-19 e o `---`**.

- [ ] **Step 2: Escrever o ADR-20**

Insira, imediatamente antes da linha `---` que precede `## Pendências abertas`:

```markdown
## ADR-20 — Importação de planilha: OpenSpout em streaming
**Regra:** `openspout/openspout ^5.3` lê planilha enviada pelo usuário, em **streaming** — o
`SpreadsheetRowReader` (`app/Domains/Operation/Services/`) entrega linha a linha por `\Generator`, e
nada além da linha corrente fica em memória. Extensões aceitas: `xlsx`, `csv`, `txt`; qualquer outra
é `ValidationException` no próprio reader. Os dois readers são abertos com
`SHOULD_PRESERVE_EMPTY_ROWS: true`.

**Porquê.** O consumidor é a importação de alunos em massa (`ImportStudentsAction`), onde a planilha
é do cliente e o tamanho não é nosso: carregar o documento inteiro para ler N linhas é o custo que a
biblioteca existe para evitar. O `SHOULD_PRESERVE_EMPTY_ROWS` não é preferência — sem ele, XLSX e CSV
descartam linha em branco **antes** de o consumidor vê-la e recontam do zero, e o número de linha que
o operador lê no erro deixa de ser o número de linha da planilha dele.

**Eixo próprio, não nota.** O precedente de 2026-08-10 manda registrar biblioteca nova como nota no
ADR existente **do mesmo eixo**; aqui não há. ADR-11 decide onde o arquivo mora e como é servido,
ADR-12 é geração de documento — o OpenSpout é ingestão, e ingestão não tinha ADR.

**Descartado:** PhpSpreadsheet — carrega o documento inteiro em memória, o oposto do requisito.
```

- [ ] **Step 3: Conferir que o arquivo continua íntegro**

```bash
grep -n "^## ADR-" docs/adrs.md | tail -3
grep -c "^## ADR-" docs/adrs.md
```

Esperado: `ADR-18`, `ADR-19`, `ADR-20` nas três últimas linhas; contagem **20**.

- [ ] **Step 4: Commit**

```bash
git add docs/adrs.md
git commit -m "docs(adr): ADR-20 registra OpenSpout em streaming (P-20)

Eixo próprio porque não havia: ADR-11 é armazenamento, ADR-12 é geração, e o
OpenSpout é ingestão. Registra a decisão que o código já tomou — Generator
linha a linha e SHOULD_PRESERVE_EMPTY_ROWS, sem o qual a numeração de linha
do erro deixa de ser a da planilha do operador."
```

---

### Task 3: Nota do `simple-qrcode` no ADR-12 (P-21)

**Files:**
- Modify: `docs/adrs.md` (acrescenta uma nota ao ADR-12, depois da nota de 2026-08-10 que termina antes de `## ADR-13`)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Medir o consumidor, para a nota descrever o que existe**

```bash
grep -n "QrCode" backend/app/Domains/Certification/Services/CertificatePdfService.php
grep -n "simple-qrcode" backend/composer.json
```

Esperado: `use SimpleSoftwareIO\QrCode\Facades\QrCode;` na linha 8, `QrCode::format('svg')` na linha 28, e `"simplesoftwareio/simple-qrcode": "^4.2"` no composer.

- [ ] **Step 2: Escrever a nota**

Insira, imediatamente antes de `## ADR-13 — Containerização`:

```markdown
**Nota (2026-08-22) — o QR do certificado é `simple-qrcode`, embutido no próprio HTML.**
`simplesoftwareio/simple-qrcode ^4.2` gera o código de validação dentro de
`App\Domains\Certification\Services\CertificatePdfService`: `QrCode::format('svg')->size(180)`,
codificado em base64 e embutido no HTML que vai para o Gotenberg. **Não é um segundo serviço nem uma
segunda requisição** — por isso a decisão mora aqui e não em ADR próprio: o QR é conteúdo do
documento que esta ADR decide como renderizar, e SVG embutido sobrevive ao Chromium sem depender de
rede nem de arquivo em disco. O QR tem peso legal (é o que valida o certificado), então a
dependência é registrada com o consumidor nomeado, não só declarada no `composer.json`.
```

- [ ] **Step 3: Conferir a colocação**

```bash
awk '/^## ADR-12/,/^## ADR-13/' docs/adrs.md | grep -c "^\*\*Nota"
```

Esperado: `2` — a nota de 2026-08-10 (documento editável) e esta.

- [ ] **Step 4: Commit**

```bash
git add docs/adrs.md
git commit -m "docs(adr): nota do simple-qrcode no ADR-12 (P-21)

O QR nasce dentro do CertificatePdfService e é embutido em base64 no HTML que
vai ao Gotenberg — conteúdo do documento que esta ADR decide, não serviço
novo. Dependência de peso legal passa a ter consumidor nomeado."
```

---

### Task 4: `certificates` deixa de ser "planejada" (P-43)

**Files:**
- Modify: `docs/der-fisico.md` linhas 87, 91, 99 e 110

**Interfaces:**
- Consumes: nada.
- Produces: nada.

**Trava:** a linha 74 descreve as colunas de `certificates`, já está correta e **não se toca**.

- [ ] **Step 1: Medir todos os sítios antes de editar**

```bash
grep -n "planejada\|planejadas" docs/der-fisico.md
```

Esperado: exatamente as linhas 87, 91, 99 e 110. Se aparecer um quinto sítio, ele entra nesta task — o alcance é medido agora, não copiado da ficha.

- [ ] **Step 2: Corrigir os quatro sítios**

Linha 87 — remove a marca e junta `certificates` à lista:

```markdown
- `courses` 1:N → `course_certificate_templates`, `course_modules`, `course_redator`, `quotes`, `turmas`, `certificates`.
```

Linha 91:

```markdown
- `enrollments` 1:1 → `certificates`.
```

Linha 99:

```markdown
- **`certificates`**: sem arquivo por aluno; só metadata. PDF sob demanda via Gotenberg (ADR-12).
```

Linha 110 — `certificates` sai do lado do que não existe e entra na contagem de implementadas:

```markdown
- **Contexto total (alvo):** 26 tabelas — 19 de domínio (17 implementadas,
```

**Antes de escrever a linha 110, leia-a inteira** (ela continua na linha seguinte) e ajuste só a parte que classifica `certificates`; a soma tem de continuar fechando. Se a aritmética não fechar depois da sua edição, **PARE** e reporte o número que não bate em vez de forçar.

- [ ] **Step 3: Provar o alcance e a linha intocada**

```bash
grep -n "planejada\|planejadas" docs/der-fisico.md
sed -n '74p' docs/der-fisico.md
git diff docs/der-fisico.md | grep -c "^[-+]"
```

Esperado: **zero** ocorrência de "planejada"; a linha 74 idêntica ao que era (confira contra `git diff`, que não pode listá-la); e o diff tocando 4 linhas de conteúdo (8 linhas `+`/`-`).

- [ ] **Step 4: Commit**

```bash
git add docs/der-fisico.md
git commit -m "docs(der): certificates deixa de ser planejada nos 4 sítios (P-43)

Tabela entregue na Sprint 4; divergia só o status escrito, nunca o schema. A
linha 74, que descreve as colunas, já estava correta e ficou intocada."
```

---

### Task 5: `progress.md` declara o formato de cinco colunas (P-23)

**Files:**
- Modify: `docs/superpowers/historico/progress.md` linhas 3-5 (bloco de citação do cabeçalho)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Ler os dois cabeçalhos, para a declaração espelhar a que já existe**

```bash
sed -n '1,8p' docs/superpowers/historico/progress.md
sed -n '1,11p' docs/superpowers/historico/progress-archive.md
```

- [ ] **Step 2: Acrescentar a declaração**

Depois da linha `> Fila futura: ... Histórico antigo: \`progress-archive.md\`.`, acrescente ao mesmo bloco de citação:

```markdown
>
> **Cinco colunas, de propósito (P-23, decidido em 2026-08-22).** O formato antigo tinha sete, com
> `Contexto`/`Plano`/`Spec` separadas; aqui plano, spec, context packet e commits vivem juntos na
> coluna `Referências`. A coluna `Contexto` **não volta**: só uma parte das entregas nasce de packet,
> e a coluna separada era célula vazia na maioria das linhas. O `progress-archive.md` registra do
> lado dele a mesma convivência de duas arities — as linhas migram **verbatim**, porque o fechamento
> move histórico e não o reescreve.
```

- [ ] **Step 3: Conferir que a tabela não foi tocada**

```bash
sed -n '7,10p' docs/superpowers/historico/progress.md
git diff docs/superpowers/historico/progress.md | grep "^-" | grep -v "^---"
```

Esperado: o cabeçalho da tabela ainda é `| Data | Entrega | Status | Resultado | Referências |`, e o diff **não remove nenhuma linha** (só acrescenta).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/historico/progress.md
git commit -m "docs(progress): declara o formato de cinco colunas (P-23)

A coluna Contexto não volta: só 4 das 10 entregas têm packet, e a coluna
separada seria célula vazia na maioria. O archive já declarava a convivência
de duas arities do lado dele; agora as duas pontas dizem o mesmo."
```

---

### Task 6: P-39 — nota na entrega do BD-6 e lição 18

**Files:**
- Modify: `docs/superpowers/historico/progress-archive.md:74` (célula `Resultado` da linha do BD-6)
- Modify: `docs/README.md` (acrescenta a lição 18 ao fim da lista de lições institucionalizadas)

**Interfaces:**
- Consumes: nada.
- Produces: `lição 18` como referência citável pela Task 12 (ficha da P-39).

**Emenda medida:** a ficha e a §4 da spec diziam `progress.md`; a linha do BD-6 migrou para o **archive**. O remédio da P-27 é o mesmo (nota na linha da entrega, nunca emenda no plano aprovado); só o arquivo é outro.

- [ ] **Step 1: Confirmar onde a entrega vive**

```bash
grep -c "falha-vs-lista-vazia" docs/superpowers/historico/progress.md
grep -n "falha-vs-lista-vazia" docs/superpowers/historico/progress-archive.md
```

Esperado: `0` no `progress.md` e a linha **74** no archive. Se a contagem no `progress.md` não for zero, **PARE** — a premissa desta task mudou.

- [ ] **Step 2: Medir a premissa errada contra o código de hoje**

```bash
sed -n '19p' backend/app/Domains/Catalog/Http/Controllers/CourseController.php
sed -n '11p' backend/app/Domains/Catalog/routes.php
```

Esperado: o controller declarando `new Middleware('permission:catalog.course.view', only: ['index', 'show'])`, e a rota sem middleware de permissão. Se o controller **não** declarar mais, a P-39 encerra por outro motivo — reporte em vez de escrever a nota.

- [ ] **Step 3: Acrescentar a nota à célula `Resultado` da linha 74**

Localize, dentro da linha 74, o trecho que registra o nascimento da P-39:

```
Nasceram também a **P-39** (o plano afirma que `GET /api/courses` só tem `auth:sanctum`, e o `CourseController` declara `permission:catalog.course.view` — nenhuma prova cai, mas a premissa escrita fica errada; plano e spec não foram retro-editados, precedente da P-27)
```

Substitua por:

```
Nasceram também a **P-39** (o plano afirma que `GET /api/courses` só tem `auth:sanctum`, e o `CourseController` declara `permission:catalog.course.view` — nenhuma prova cai, mas a premissa escrita fica errada; plano e spec não foram retro-editados, precedente da P-27) — **corrigida aqui em 2026-08-22 pelo BD-15, e encerrada:** `catalog.course.view` segue declarado em `CourseController.php:19` via `HasMiddleware`, então a rota **é** gateada por RBAC e o `routes.php:11` sozinho não conta a história; quem reusar a receita de injeção de falha do BD-6 deve ler o controller, não só o arquivo de rotas. A lição transversal virou a **18** de `docs/README.md`
```

**A linha inteira é uma linha só de tabela Markdown** — não quebre em duas, não insira `|` novo.

- [ ] **Step 4: Escrever a lição 18**

Ao fim da lista numerada de `## Lições institucionalizadas`, depois da lição 17, acrescente:

```markdown
18. **RBAC de uma rota não se lê no arquivo de rotas.** O `routes.php` de um domínio pode declarar só `auth:sanctum` e a rota ainda estar gateada: o controller implementa `HasMiddleware` e devolve `new Middleware('permission:x.y.z', only: [...])`. Foi o que o plano do BD-6 errou (P-39) — leu `Catalog/routes.php:11`, concluiu "sem RBAC" e escreveu isso como premissa, enquanto `CourseController.php:19` gateava `index` e `show`. Nenhuma prova daquele bloco caiu, porque 403 e rota inexistente caem no mesmo ramo do front; o que ficou errado foi a frase que o próximo leitor acreditaria. **Para saber se uma rota tem permissão, leia o controller também** — e prefira medir por comportamento (chamar sem a permissão e ver o 403) a inferir de um arquivo só.
```

- [ ] **Step 5: Conferir numeração e integridade da tabela**

```bash
awk '/^## Lições/,/^## Fontes/' docs/README.md | grep -cE "^[0-9]+\. \*\*"
awk '/^## Lições/,/^## Fontes/' docs/README.md | grep -E "^[0-9]+\. \*\*" | tail -1 | cut -c1-60
awk -F'|' 'NR==74 {print NF}' docs/superpowers/historico/progress-archive.md
```

Esperado: **18** lições; a última começando com `18. **RBAC de uma rota`; e a linha 74 do archive com o **mesmo número de campos** que tinha antes — rode o mesmo `awk` contra `git show HEAD:docs/superpowers/historico/progress-archive.md` para comparar.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/historico/progress-archive.md docs/README.md
git commit -m "docs: encerra a P-39 com nota na entrega e lição 18

A linha do BD-6 vive no archive, não no progress.md — medido ao escrever o
plano. O plano arquivado não foi tocado (P-27): a divergência ganha nota na
linha da entrega. A lição 18 generaliza o erro: RBAC de rota não se lê no
arquivo de rotas, o HasMiddleware do controller também gateia."
```

---

### Task 7: Fichas que permanecem abertas — P-31 e P-32

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (ficha da P-31 e ficha da P-32)

**Interfaces:**
- Consumes: nada.
- Produces: fichas atualizadas, lidas pela Task 12 ao mexer no índice.

- [ ] **Step 1: Copiar o texto do ponto 5 da fonte, não reescrever**

```bash
awk '/^5\. \*\*Identidade própria sobre o Lara/,/^$/' docs/adrs.md
```

O texto que sair daqui é o que vai para a ficha, **verbatim**. A ficha diz "copiar de lá, não reescrever".

- [ ] **Step 2: Atualizar a ficha da P-31**

Acrescente ao fim da ficha da P-31, antes da próxima `## P-`:

```markdown
**Medido em 2026-08-22 (BD-15): a impossibilidade agora é de schema, não de suposição.** A
ferramenta de escrita do Drive disponível é `update_file`, e o schema dela diz textualmente
*"currently only title and parent_id are supported"* — ela renomeia e move arquivo, não altera
conteúdo. `create_file` produziria um segundo documento, que fragmenta o espelho em vez de
sincronizá-lo. **Nada a fazer do lado do agente.**

**Para o João fechar em um passo** — arquivo `decisao-stack.md`, file ID
`14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` (cadeia `Viagem Chile/Projetos/Lotus.cl/V2/Planejamento/3-avancado`,
`modifiedTime` 2026-07-31T16:15:51Z na medição). O texto a colar é o ponto 5 do ADR-16 em
`docs/adrs.md`, **copiado de lá e não reescrito**, mais a frase que revoga a exceção de shell — hoje
o ADR-16 do Drive segue com os cinco bullets originais.
```

- [ ] **Step 3: Atualizar a ficha da P-32 com a medição**

Acrescente ao fim da ficha da P-32:

```markdown
**A forma óbvia foi medida e reprovada — 2026-08-22 (BD-15).** Varredura de identificador
PascalCase entre crases em `docs/`, `.claude/rules/` e `CLAUDE.md`: **167** candidatos, **28** sem
declaração nem arquivo homônimo no repositório, **0** achado real da lição 13. Os 28 são falso-positivo
legítimo, em três famílias:

- **vendor** — `DataTable`, `BodyCell`, `SoftDeletes`, `RefreshDatabase`, `HasMiddleware`,
  `ValidationException`, `DefaultValuesDataPipe`, `QueryObserverResult`, `UseQueryResult`,
  `RouteServiceProvider`, `QueryClientProvider`, `RadioButton`, `TypeError`, `FormData`,
  `ButtonProps`, `TableBody`;
- **placeholder de molde** — `CreateX`, `UpdateX`, `AppXProps`;
- **palavra de SQL, enum ou prosa, e nome de conceito** — `DELETE`, `EXPLAIN`, `UNIQUE`, `IDENTICO`,
  `MANUAL`, `PRUEBAS`, `EmAndamento`, `QueryBuilders`, `UnmappedErrors`.

Decisão do João no brainstorming do BD-15: **não desenhar a guarda**; a ficha guarda o número para
que quem reabrir a P-32 não regaste o desenho já reprovado. Allowlist das 28 foi considerada e
recusada — nasceria com 28 isenções, zero achado, e cada classe de vendor nova citada num doc viraria
manutenção. O gatilho continua sendo reincidência real da lição 13 **por classe**.
```

- [ ] **Step 4: Conferir que nenhuma outra ficha foi tocada**

```bash
git diff docs/superpowers/pendencias/abertas.md | grep "^-" | grep -v "^---"
grep -c "^## P-" docs/superpowers/pendencias/abertas.md
```

Esperado: **nenhuma** linha removida (só acréscimos), e a contagem de fichas idêntica ao HEAD (compare com `git show HEAD:docs/superpowers/pendencias/abertas.md | grep -c "^## P-"`).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/pendencias/abertas.md
git commit -m "docs(pendencias): P-31 e P-32 ganham a medição que as mantém abertas

P-31: update_file do Drive aceita só title/parentId — impossibilidade de
schema, não suposição; a ficha passa a carregar o file ID e o texto a colar.
P-32: 167 candidatos, 28 falso-positivos, 0 achado — a forma óbvia foi
tentada e reprovada, e o número fica para quem reabrir."
```

---

### Task 8: Notion — schema da propriedade e as 8 páginas do Dashboard

**Files:**
- Nenhum arquivo do repositório. Escrita externa via `mcp__claude_ai_Notion__notion-update-page`.
- Create: `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` (registro do antes/depois; começa nesta task e é completado pelas Tasks 9-11)

**Interfaces:**
- Consumes: os page IDs da §7 da spec e do packet.
- Produces: o arquivo de auditoria, alimentado pelas Tasks 9, 10 e 11.

- [ ] **Step 1: Ler o schema da propriedade de status — antes de qualquer write**

Chame `notion-fetch` no database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`. Registre o **nome exato** da propriedade de status e o **conjunto de opções**.

Se `Concluída` não constar com essa grafia exata, **PARE e reporte** — não invente valor, não use o mais parecido.

- [ ] **Step 2: Ler as 8 páginas do Dashboard por ID e registrar o valor atual**

`notion-fetch` em cada um, **sem busca por título**:

| EAP | Page ID |
|---|---|
| 8.4.0 | `3bcbc9603dfa81c89df1de7d7805816b` |
| 8.4.1 | `3aabc9603dfa812b9a63d302ef93f44a` |
| 8.4.2 | `3aabc9603dfa815895d9e9377665fe42` |
| 8.4.3 | `3aabc9603dfa819a9aa6f6ec245867a0` |
| 8.4.4 | `3aabc9603dfa81d3a4edcd392b000b56` |
| 8.4.5 | `3aabc9603dfa8136a4c6db9b4219b026` |
| 8.4.6 | `3aabc9603dfa81c3ba69f8fdc5b4c925` |
| 8.4.7 | `3bcbc9603dfa811c8223e910c453f3bc` |

Esperado, pelo packet: todas em `Backlog`. Uma página que **já** esteja `Concluída` não é erro — é write a menos; registre e siga.

- [ ] **Step 3: Escrever o arquivo de auditoria com o estado ANTES**

```bash
mkdir -p docs/superpowers/audits
```

Crie `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` com o cabeçalho e a primeira tabela:

```markdown
# BD-15 · Sincronização do Notion — antes e depois

> Base canônica `collection://e64b7d57-d000-4433-b652-a410e75193cc`
> (database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`). Todo acesso por **ID**; zero busca por título —
> a base homônima obsoleta `collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` ainda responde busca e
> já produziu 12 falsos positivos.
> Escrita **não-destrutiva** (D1): só `update_properties`. Nenhuma página apagada, movida ou mesclada.

**Propriedade de status:** `<nome exato lido no Step 1>` · **opções:** `<lista lida no Step 1>`

## Dashboard — 8.4.0 a 8.4.7 (feature entregue em 2026-08-17)

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 8.4.0 | `3bcbc9603dfa81c89df1de7d7805816b` |  |  |
| 8.4.1 | `3aabc9603dfa812b9a63d302ef93f44a` |  |  |
| 8.4.2 | `3aabc9603dfa815895d9e9377665fe42` |  |  |
| 8.4.3 | `3aabc9603dfa819a9aa6f6ec245867a0` |  |  |
| 8.4.4 | `3aabc9603dfa81d3a4edcd392b000b56` |  |  |
| 8.4.5 | `3aabc9603dfa8136a4c6db9b4219b026` |  |  |
| 8.4.6 | `3aabc9603dfa81c3ba69f8fdc5b4c925` |  |  |
| 8.4.7 | `3bcbc9603dfa811c8223e910c453f3bc` |  |  |
```

Preencha a coluna `Antes` com o que o Step 2 leu.

- [ ] **Step 4: Escrever o status nas 8 páginas**

Para cada ID, `notion-update-page` com `command: "update_properties"` e a propriedade de status em `Concluída`. Uma chamada por página.

- [ ] **Step 5: Reler as 8 por ID e preencher a coluna `Depois`**

`notion-fetch` de novo em cada um dos 8 IDs. A coluna `Depois` recebe o valor **lido de volta**, nunca o valor enviado. Qualquer página que não confirme `Concluída` fica registrada como tal e é reportada — não se tenta de novo em silêncio.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-08-22-bd15-notion-sync.md
git commit -m "docs(audit): sync Notion — Dashboard 8.4.0 a 8.4.7 para Concluída

Oito páginas, endereçadas por ID, relidas depois do write. Feature entregue
em 2026-08-17 e as páginas seguiam em Backlog."
```

---

### Task 9: Notion — as 9 páginas do Meu Perfil e a `9.1.4`

**Files:**
- Modify: `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` (acrescenta duas seções)

**Interfaces:**
- Consumes: o arquivo de auditoria criado na Task 8 e o nome da propriedade lido lá.
- Produces: as seções `Meu Perfil` e `9.1.4` do mesmo arquivo.

- [ ] **Step 1: Ler as 10 páginas por ID e registrar o valor atual**

| EAP | Page ID |
|---|---|
| 8.5.1 | `3b1bc9603dfa8148b646d019ff354623` |
| 8.5.2 | `3b1bc9603dfa81968ff1f2802994cc13` |
| 8.5.3 | `3b1bc9603dfa8181a39df34752c1b98f` |
| 8.5.4 | `3b1bc9603dfa8181a71bf96b85fbc709` |
| 8.5.5 | `3b1bc9603dfa81e6914fed4f228b1632` |
| 8.5.6 | `3bcbc9603dfa8137a7f3df9ab8df33e5` |
| 8.5.7 | `3bcbc9603dfa8123bb33f91532f6b38b` |
| 8.5.8 | `3bcbc9603dfa81c79018d783e2fe73c7` |
| 8.5.9 | `3bcbc9603dfa81958397d1581ce0d854` |
| 9.1.4 | `388bc9603dfa8119a5ecc157b2cc18d3` |

Esperado: as nove do Meu Perfil em `Backlog`, a `9.1.4` em `A fazer`.

- [ ] **Step 2: Acrescentar as duas seções ao arquivo de auditoria**

```markdown
## Meu Perfil — 8.5.1 a 8.5.9 (feature entregue em 2026-08-18)

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 8.5.1 | `3b1bc9603dfa8148b646d019ff354623` |  |  |
| 8.5.2 | `3b1bc9603dfa81968ff1f2802994cc13` |  |  |
| 8.5.3 | `3b1bc9603dfa8181a39df34752c1b98f` |  |  |
| 8.5.4 | `3b1bc9603dfa8181a71bf96b85fbc709` |  |  |
| 8.5.5 | `3b1bc9603dfa81e6914fed4f228b1632` |  |  |
| 8.5.6 | `3bcbc9603dfa8137a7f3df9ab8df33e5` |  |  |
| 8.5.7 | `3bcbc9603dfa8123bb33f91532f6b38b` |  |  |
| 8.5.8 | `3bcbc9603dfa81c79018d783e2fe73c7` |  |  |
| 8.5.9 | `3bcbc9603dfa81958397d1581ce0d854` |  |  |

## 9.1.4 — cobertura de teste que a `main` já tem

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 9.1.4 | `388bc9603dfa8119a5ecc157b2cc18d3` |  |  |

A `main` já possui testes dedicados de conclusão de turma, aprovação de cotação e emissão de
certificado. **Nenhum bloco de código foi aberto para repetir essa cobertura** — o backlog proíbe
explicitamente, e o que estava errado era o status da página.
```

Preencha `Antes` com o que o Step 1 leu.

- [ ] **Step 3: Escrever o status nas 10 páginas**

`notion-update-page` / `update_properties` → `Concluída`, uma chamada por página.

- [ ] **Step 4: Reler por ID e preencher `Depois`**

Mesma regra da Task 8: a coluna recebe o valor lido de volta.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-08-22-bd15-notion-sync.md
git commit -m "docs(audit): sync Notion — Meu Perfil 8.5.1 a 8.5.9 e a 9.1.4

Dez páginas por ID, relidas depois do write. A 9.1.4 muda de status e não
abre código: a cobertura que ela pede já existe na main."
```

---

### Task 10: Notion — a propriedade `Sprint` da P-18

**Files:**
- Modify: `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` (acrescenta a seção da P-18)

**Interfaces:**
- Consumes: o arquivo de auditoria.
- Produces: a seção `P-18`, lida pela Task 12 ao encerrar a ficha.

**A armadilha desta task:** o ID que a ficha da P-18 cita (`f88bc9603dfa8253b40981686f8ae023`) mora na base **obsoleta** e está `deleted`. O alvo é o canônico `3a2bc9603dfa8067902cf3c62bffdb0d`.

- [ ] **Step 1: Ler a página canônica por ID e medir a divergência**

`notion-fetch` em `3a2bc9603dfa8067902cf3c62bffdb0d`. Registre: o texto da descrição (o packet diz "Sprint 3"), o valor da propriedade `Sprint` (o packet diz "Sprint 2 · Comercial") e o nome exato da propriedade.

Se a descrição e a propriedade **já** concordarem, a P-18 encerra sem write — registre e siga.

- [ ] **Step 2: Decidir qual dos dois lados cede, pela evidência da própria página**

A divergência é entre a descrição ("Fechamento — Sprint 3") e a propriedade (`Sprint 2 · Comercial`). O lado que cede é o que **contradiz o resto da base**: confira o valor `Sprint` das páginas irmãs de fechamento já medidas no packet — `3a2bc9603dfa8028a1fbf8a3863690ed` é a H.1.3.2 da Sprint 3.

Se a Sprint 3 já tem a sua própria página de fechamento, então esta é a da Sprint 2 e **a descrição é que está errada**; a propriedade fica. Nesse caso o write é na descrição, não na propriedade.

**Se a evidência não decidir com clareza, PARE e pergunte ao João** — a ficha diz que corrigir é dele, e o bloco só ganhou autorização para o não-destrutivo, não para adivinhar qual lado é verdade.

- [ ] **Step 3: Registrar no arquivo de auditoria**

```markdown
## P-18 — página de fechamento com `Sprint` divergente

O ID que a ficha citava (`f88bc9603dfa8253b40981686f8ae023`) pertence à base **obsoleta**
`collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` e está `deleted`. O alvo canônico é outro.

| Página | Page ID | Campo | Antes | Depois |
|---|---|---|---|---|
| H.1.3.2 fechamento | `3a2bc9603dfa8067902cf3c62bffdb0d` | descrição |  |  |
| H.1.3.2 fechamento | `3a2bc9603dfa8067902cf3c62bffdb0d` | propriedade `Sprint` |  |  |

**Evidência que decidiu qual lado cede:** <o que o Step 2 mediu, com o ID da página irmã>.
```

- [ ] **Step 4: Aplicar o write e reler**

Um `update_page` no lado que o Step 2 decidiu; depois `notion-fetch` por ID e preencha `Depois` com o valor lido de volta.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-08-22-bd15-notion-sync.md
git commit -m "docs(audit): P-18 — descrição e propriedade Sprint deixam de divergir

O ID da ficha era da base obsoleta e está deleted; o alvo canônico é
3a2bc9603dfa8067902cf3c62bffdb0d. O lado que cedeu foi decidido pela
evidência da página irmã, não por preferência."
```

---

### Task 11: Notion — o que NÃO se escreve, e vira relatório

**Files:**
- Modify: `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` (acrescenta a seção de relatório)
- Modify: `docs/superpowers/pendencias/abertas.md` (ficha da P-22 aponta para o relatório)

**Interfaces:**
- Consumes: o arquivo de auditoria.
- Produces: a seção de relatório, citada pela ficha da P-22.

- [ ] **Step 1: Reler por ID as páginas do relatório**

Duplicação da P-22 e as genéricas do workflow:

| Página | Page ID |
|---|---|
| H.1.3.1 sync · Sprint 3 (critério **vazio**) | `3a2bc9603dfa8021b69ee399cd8fd915` |
| H.1.3.1 sync · Sprint 4 (critério preenchido) | `3a2bc9603dfa803b94bbf27c075b27d6` |
| H.1.3.1 sync · Sprint 2 | `3a2bc9603dfa80fc90ebf19526b587c9` |
| H.1.3.1 sync · Sprint 7 | `3a2bc9603dfa804dbb55eb5b20b8040e` |
| H.1.3.2 fechamento · Sprint 3 | `3a2bc9603dfa8028a1fbf8a3863690ed` |
| H.1.3.2 fechamento · Sprint 4 | `3a2bc9603dfa8045abbdec64eb780e2c` |
| H.1.3.2 fechamento · Sprint 7 | `3a2bc9603dfa8025ae21c5bdfe74d6db` |
| H.1.3 UI/UX · Sprint 4 | `3a2bc9603dfa8083bacffcd467cb7127` |
| H.1.3 UI/UX · Sprint 7 | `3a2bc9603dfa803cb84efebc07021a00` |
| Template H.1.1 | `39dbc9603dfa8190b088da6160d84056` |
| Template H.1.2 | `39dbc9603dfa81c8b75ad5207a8b4a2c` |
| Template H.2.1 | `39dbc9603dfa8180937cd9a86a8c6f0c` |

- [ ] **Step 2: Medir a troca de conteúdo entre `8.4.0` e `8.4.7`**

`notion-fetch` nos dois (`3bcbc9603dfa81c89df1de7d7805816b` e `3bcbc9603dfa811c8223e910c453f3bc`) e descreva, em uma linha cada, do que o corpo trata. O packet afirma que estão trocados — estrutura arquitetural onde deveria estar UI review e vice-versa. **Confirme ou desminta**; não repita a afirmação sem medir.

- [ ] **Step 3: Escrever a seção de relatório**

```markdown
## Não escrito — decisões do João

Escrita não-destrutiva (D1): o que segue foi **medido e não alterado**.

### P-22 — H.1.3.1 existe duas vezes na base canônica

| Página | Page ID | Sprint | Critério de aceite | Status |
|---|---|---|---|---|
| H.1.3.1 sync | `3a2bc9603dfa8021b69ee399cd8fd915` | Sprint 3 · Acadêmico | **vazio** |  |
| H.1.3.1 sync | `3a2bc9603dfa803b94bbf27c075b27d6` | Sprint 4 · Certificação | preenchido |  |

Qual cópia é a canônica é decisão do João — a Sprint da task mudou de 3 para 4. Enquanto as duas
existirem, **todo consumo de H.1.3.1 cita o ID `3a2bc9603dfa803b94bbf27c075b27d6`**, que é o que a
ficha já fixa. Apagar é destrutivo e ficou fora da autorização deste bloco.

### `8.4.0` × `8.4.7` — os conteúdos trocados

<o que o Step 2 mediu, uma linha por página>

O **status** foi corrigido nas duas (Task 8); o **corpo** não. Trocar o corpo é reescrever conteúdo
de duas páginas, e propagaria o erro se a leitura estivesse errada — fica para decisão do João.

### Duplicações genéricas do workflow

<tabela com as 12 páginas do Step 1: título, ID, sprint, status>

São operações que o workflow já executa por bloco (sync, fechamento, UI review). Não representam
trabalho de produto pendente. Mesclar ou arquivar é decisão do João.
```

- [ ] **Step 4: Apontar a ficha da P-22 para o relatório**

Acrescente ao fim da ficha da P-22 em `abertas.md`:

```markdown
**Remedida em 2026-08-22 (BD-15), sem write.** As duas cópias foram relidas por ID e a diferença
entre elas está tabelada em `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md`. O bloco tinha
autorização para escrita **não-destrutiva** apenas (D1), e apagar página não cabe nela. O gatilho
segue de pé: fecha quando o João apagar ou mesclar uma das duas.
```

- [ ] **Step 5: Provar que nada foi escrito nesta task**

Releia por ID duas das páginas do Step 1 e confirme que o status é o mesmo registrado no relatório. O DoD desta task é **ausência** de escrita, e ausência se prova relendo.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-08-22-bd15-notion-sync.md docs/superpowers/pendencias/abertas.md
git commit -m "docs(audit): relatório do que o bloco mediu e não escreveu no Notion

P-22, a troca de corpo entre 8.4.0 e 8.4.7 e as 12 duplicações genéricas do
workflow: tudo lido por ID, nada alterado. Escrita não-destrutiva (D1) não
cobre apagar nem reescrever corpo — as três ficam com o João."
```

---

### Task 12: Fichas encerradas e índice das pendências

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (remove 6 fichas)
- Modify: `docs/superpowers/pendencias/encerradas.md` (recebe as 6)
- Modify: `docs/superpowers/pendencias/README.md` (linhas 41-48 e a contagem da linha 24)

**Interfaces:**
- Consumes: as Tasks 2-6 e 10, que produziram o remédio de cada ficha.
- Produces: o estado final das pendências, conferido no gate da Task 13.

**Encerram (6):** P-18 (Task 10), P-20 (Task 2), P-21 (Task 3), P-23 (Task 5), P-39 (Task 6), P-43 (Task 4).
**Permanecem abertas (3):** P-22, P-31, P-32 — as três com o motivo já escrito nas Tasks 7 e 11.

- [ ] **Step 1: Conferir que cada encerramento tem remédio aplicado**

```bash
grep -c "^## ADR-20" docs/adrs.md
awk '/^## ADR-12/,/^## ADR-13/' docs/adrs.md | grep -c "simple-qrcode"
grep -c "planejada" docs/der-fisico.md
grep -c "Cinco colunas, de propósito" docs/superpowers/historico/progress.md
awk '/^## Lições/,/^## Fontes/' docs/README.md | grep -cE "^18\. \*\*"
```

Esperado, em ordem: `1`, `1`, `0`, `1`, `1`. Qualquer zero indica ficha sendo encerrada sem remédio — **PARE**.

Para a P-18, confira a seção correspondente em `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md` com a coluna `Depois` preenchida.

- [ ] **Step 2: Mover as 6 fichas para `encerradas.md`**

Recorte cada ficha inteira de `abertas.md` e cole sob `## Em rastro (saem no próximo /fechar-sprint)` em `encerradas.md`, **preservando o texto** e acrescentando a cada uma, no fim, uma linha:

```markdown
**Encerrada em 2026-08-22 pelo BD-15.** <como fechou, uma frase, com o path do remédio>
```

Exemplo para a P-43: `**Encerrada em 2026-08-22 pelo BD-15.** Os quatro sítios de status de `docs/der-fisico.md` (87, 91, 99, 110) deixaram de chamar `certificates` de planejada; a linha 74, que descreve as colunas e já estava correta, ficou intocada.`

- [ ] **Step 3: Atualizar o índice**

Em `README.md`, remova as seis linhas de tabela das pendências encerradas (41-48 hoje contêm oito linhas; **sobram as de P-22, P-31 e P-32** — confira antes de cortar, os números de linha mudam a cada remoção).

Atualize a contagem da linha 24, hoje `## Abertas (29)`, para `## Abertas (23)`.

**Confira a contagem em vez de confiar na aritmética:**

```bash
grep -c "^## P-" docs/superpowers/pendencias/abertas.md
```

O número que sair daqui é o que vai no cabeçalho. Se não bater com 23, o desencontro é o achado — reporte em vez de escrever 23.

- [ ] **Step 4: Provar que nenhuma ficha se perdeu no caminho**

```bash
git show HEAD:docs/superpowers/pendencias/abertas.md | grep -c "^## P-"
grep -c "^## P-" docs/superpowers/pendencias/abertas.md
grep -c "^## P-" docs/superpowers/pendencias/encerradas.md
git show HEAD:docs/superpowers/pendencias/encerradas.md | grep -c "^## P-"
```

Esperado: `abertas` diminui em exatamente 6, `encerradas` aumenta em exatamente 6.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/pendencias/
git commit -m "docs(pendencias): encerra 6 e atualiza o índice

P-18, P-20, P-21, P-23, P-39 e P-43 saem com o remédio aplicado e o path
dele na ficha. P-22, P-31 e P-32 permanecem abertas, cada uma com a medição
que explica por quê."
```

---

### Task 13: Gate do bloco

**Files:** nenhum novo. Esta task só mede.

**Interfaces:**
- Consumes: tudo.
- Produces: os números do fechamento.

- [ ] **Step 1: Medir o fence de escopo**

```bash
git diff main...HEAD --stat -- backend/
git diff main...HEAD --stat -- frontend/
```

Esperado: em `backend/`, **um** arquivo (`tests/Feature/Shared/DomainDependencyTest.php`); em `frontend/`, **zero**. Frontend zerado torna `pnpm test`/`build`/`lint` e `typescript:transform` **N/A por escopo medido** — registre assim, não como "não rodei".

- [ ] **Step 2: Suíte de backend e Pint**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint --test tests/Feature/Shared/DomainDependencyTest.php && cd ..
```

Esperado: suíte verde com o número anotado, e Pint `PASS`. Se a suíte estourar memória, é a **P-50** — registre e rode com o binário direto (`vendor/bin/phpunit`), sem tratar como falha do bloco.

- [ ] **Step 3: Reprovar a Regra C de novo, no HEAD final**

A sonda da Task 1 rodou no meio do bloco. Repita no HEAD: insira `'Certification\Models\Certificate',` em `ALLOWED['Catalog']`, rode `--filter=test_toda_aresta_declarada_tem_consumidor`, confirme **FAIL**, remova, confirme verde e confirme `git status --short` limpo.

- [ ] **Step 4: Alcance de cada frente de doc**

```bash
grep -c "planejada" docs/der-fisico.md
grep -n "^## ADR-20" docs/adrs.md
awk '/^## ADR-12/,/^## ADR-13/' docs/adrs.md | grep -c "^\*\*Nota"
awk '/^## Lições/,/^## Fontes/' docs/README.md | grep -cE "^[0-9]+\. \*\*"
grep -c "Cinco colunas, de propósito" docs/superpowers/historico/progress.md
grep -c "corrigida aqui em 2026-08-22 pelo BD-15" docs/superpowers/historico/progress-archive.md
```

Esperado: `0`, uma linha com o ADR-20, `2`, `18`, `1`, `1`.

- [ ] **Step 5: Estado final do Notion, relido por ID**

Releia os 18 IDs de status (8 do Dashboard, 9 do Meu Perfil, `9.1.4`) e conte quantos estão `Concluída`. Esperado: **18**. Qualquer página fora disso é reportada com o ID e o valor lido — não se corrige em silêncio no gate.

- [ ] **Step 6: Estado das pendências**

```bash
grep -c "^## P-" docs/superpowers/pendencias/abertas.md
grep -o "P-22\|P-31\|P-32" docs/superpowers/pendencias/abertas.md | sort -u
grep -o "P-18\|P-20\|P-21\|P-23\|P-39\|P-43" docs/superpowers/pendencias/encerradas.md | sort -u
```

Esperado: a contagem do cabeçalho do README; as três abertas presentes; as seis encerradas presentes.

- [ ] **Step 7: Commit do gate**

```bash
git add -A
git commit -m "chore(bd15): gate do bloco medido

Fence: 1 arquivo em backend/, zero em frontend/ — pnpm e typescript:transform
N/A por escopo medido. Regra C reprovada por sonda no HEAD final. 18 páginas
do Notion relidas em Concluída. 6 pendências encerradas com remédio, 3
abertas com a medição que as mantém."
```

---

## Handoff de execução

**executor: claude**

Nenhuma task vai para o Codex, e o critério é o do próprio `/executar-bloco` — `codex` serve a task mecânica com verificação executável e paths fechados. Três coisas aqui não são isso:

1. **A Task 1 toca a lei do §5** por tabela (`DomainDependencyTest` é o mecanismo que faz valer o ADR-02/estrutura de domínios) e exige julgamento sobre a varredura — uma Regra C escrita sobre `use` passaria em todos os passos do plano e ainda assim estaria errada.
2. **As Tasks 8-11 escrevem fora do repositório.** Não há `git revert` para o Notion; a verificação é releitura por ID, não comando com exit code.
3. **As Tasks 2, 3 e 6 são redação de decisão** — ADR novo, nota de ADR e lição institucional. Paths fechados, mas o produto é julgamento.

`paths_autorizados`: não se aplica (executor `claude`).
