# BD-15 · Docs: guardrails e sincronização — design

**Work item:** `BD-15-docs-guardrails-e-sincronizacao` · **Data:** 2026-08-22
**Packet:** `docs/superpowers/context-packets/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md`
**Base:** `docs/bd15-guardrails-e-sincronizacao` @ `8f826ffb` (zero commit de código à frente da `main`)

## 1. Abertura — as duas exceções declaradas aqui, não descobertas no gate

**Exceção 1 — worktree com toque em `backend/`.** A regra do `/planejar-bloco` manda main tree
quando o bloco toca backend, por causa da **P-03**. Este bloco toca **um** arquivo:
`backend/tests/Feature/Shared/DomainDependencyTest.php`. Decisão do João (D5), com o custo medido na
abertura: o gatilho literal da P-03 é *dois blocos de backend em paralelo*, e `state.md` tem um único
`active_work_item`; nenhum container estava de pé na medição; e `DomainDependencyTest` é arch test
que varre código-fonte em sqlite `:memory:` — não precisa de MySQL, nginx, Gotenberg nem navegador.
O precedente é `identity-ativacao-acesso-redator` (2026-08-19), que rodou backend inteiro em worktree
linkada; aqui o custo é uma fração dele.

**Exceção 2 — escrita externa.** Este é o primeiro bloco autorizado a **escrever no Notion** (D1).
As fichas da P-18 e da P-22 foram redigidas quando o agente não tinha a ferramenta, e dizem "fecha
quando o João corrigir manualmente". A medição de 2026-08-22 mudou o fato para o Notion e **não** para
o Drive:

| Ferramenta | Alcance medido | Consequência |
|---|---|---|
| `mcp__claude_ai_Google_Drive__update_file` | aceita **só** `title` e `parentId` — "currently only title and parent_id are supported" | **P-31 continua não-fechável pelo agente.** A ficha estava certa. |
| `mcp__claude_ai_Notion__notion-update-page` | `update_properties` e conteúdo | P-18 e o sync obrigatório de status **fecham dentro do bloco**. |

## 2. Decisões

| # | Decisão | Base |
|---|---|---|
| **D1** | Escrita no Notion **não-destrutiva**: status e propriedade sim; apagar ou mesclar página, não. | João, 2026-08-22 |
| **D2** | **P-20 vira ADR-20 novo** ("Importação de planilha: OpenSpout em streaming"), não nota em ADR existente. | João, sobre medição do §3 |
| **D3** | **P-23 fecha declarando** o formato de 5 colunas no cabeçalho do `progress.md`, sem restaurar a coluna `Contexto`. | João |
| **D4** | **D-17 cobre só arestas de domínio.** Permissão órfã fica fora — é do item 1 do backlog. | João |
| **D5** | Bloco roda **nesta worktree**, exceção declarada (§1). | João |
| **D6** | **P-32 não ganha guarda**; a ficha recebe a medição que reprova a forma óbvia. | João, sobre medição do §6 |
| **D7** | **P-39 encerra** com nota no `progress.md` do BD-6 **e** lição nova em `docs/README.md`. | João |

## 3. D2 — por que ADR-20 e não nota

O precedente de 2026-08-10 (bloco `documentos-oficiais-template-e-docx`) diz que biblioteca nova
entra como nota em ADR existente **do mesmo eixo**. A condição é o eixo, e a medição diz que não há:

- **ADR-11** decide onde o arquivo mora e como é servido (S3, Flysystem, URL pré-assinada) — não como
  um upload é lido;
- **ADR-12** é **saída** (Gotenberg/Chromium, e a segunda porta LibreOffice) — o OpenSpout é entrada.

Uso real medido: consumidor único em
`backend/app/Domains/Operation/Services/SpreadsheetRowReader.php`, chamado por
`ImportStudentsAction`. O ADR-20 registra a decisão que o código **já tomou**, não uma nova:

1. leitura em **streaming** por `\Generator`, linha a linha, em vez de carregar a planilha na memória
   (importação de alunos em massa);
2. `SHOULD_PRESERVE_EMPTY_ROWS: true` nos dois readers — sem ele, XLSX e CSV descartam linha em branco
   **antes** de chegar ao consumidor e recontam do zero, quebrando a numeração real de linha do
   contrato D1 (o erro que o operador lê na tela);
3. `xlsx`/`csv`/`txt` suportados; qualquer outra extensão é `ValidationException`;
4. rejeitado: PhpSpreadsheet (carrega o documento inteiro em memória — o oposto do requisito).

## 4. Alcance de cada frente local

| Frente | Arquivo | Alcance medido |
|---|---|---|
| P-20 | `docs/adrs.md` | ADR-20 novo, depois do ADR-19 |
| P-21 | `docs/adrs.md` | nota no ADR-12; consumidor único `CertificatePdfService.php:8,28` (`QrCode::format('svg')`) |
| P-43 | `docs/der-fisico.md` | **4 sítios de status**: linhas 87, 91, 99, 110. A linha 74 descreve colunas, já está correta e **não se toca** |
| P-23 | `docs/superpowers/historico/progress.md` | cabeçalho; espelha o que `progress-archive.md:6-10` já declara |
| P-39 | `progress-archive.md:74` + `docs/README.md` | lição **18** (há 17) |
| P-32 | `pendencias/abertas.md` | ficha ganha a medição |

## 5. D-17 — a Regra C

`DomainDependencyTest` hoje tem três asserções: **forma** (importe a classe, não o namespace),
**Regra A** (só `Models`/`Enums`/`Services` de outro domínio) e **Regra B** (aresta usada e não
declarada). Falta a direção contrária: **declaração em `ALLOWED` sem consumidor**.

Medição de 2026-08-22: **47 arestas declaradas, 0 órfãs.** A catraca liga verde.

Duas consequências de projeto, e nenhuma é opcional:

- **A varredura tem de ser a mesma da Regra B** — `token_get_all()` sobre o **código**, comentários
  removidos, FQN inline contando como uso. Uma Regra C escrita sobre linhas `use` acusaria de órfã
  toda aresta consumida só por `\App\Domains\X\Models\Y::find(1)`, que é exatamente o escape que o
  docblock do teste diz ter fechado de propósito.
- **Catraca que nasce verde não provou nada.** O DoD é a sonda: inserir uma aresta falsa em `ALLOWED`,
  **ver a suíte reprovar** com a mensagem da Regra C, e remover.

Fora de escopo por D4: as permissões `feedback.*` (`PermissionCatalog.php:87-89`, semeadas em
`RolePermissionSeeder.php:73-74`, zero consumidor, `Domains/Feedback` inexistente). São instância viva
da mesma classe e ficam registradas como tal — removê-las decidiria o descope de Feedback por efeito
colateral, e essa decisão é do item 1 do backlog.

## 6. D6 — a medição que reprova a forma óbvia da P-32

A ficha previa "falso-positivo caro". Medido em 2026-08-22 sobre `docs/`, `.claude/rules/` e
`CLAUDE.md`: **167** identificadores PascalCase entre crases, **28** sem declaração nem arquivo
homônimo no repositório, **0** achado real da lição 13. Os 28 se dividem em três famílias:

- **vendor** — `DataTable`, `BodyCell`, `SoftDeletes`, `RefreshDatabase`, `HasMiddleware`,
  `ValidationException`, `DefaultValuesDataPipe`, `QueryObserverResult`, `UseQueryResult`,
  `RouteServiceProvider`, `QueryClientProvider`, `RadioButton`, `TypeError`, `FormData`,
  `ButtonProps`, `TableBody`;
- **placeholder de molde** — `CreateX`, `UpdateX`, `AppXProps`;
- **palavra de SQL, enum ou prosa** — `DELETE`, `EXPLAIN`, `UNIQUE`, `IDENTICO`, `MANUAL`, `PRUEBAS`,
  `EmAndamento`; e nome de conceito — `QueryBuilders`, `UnmappedErrors`.

A ficha passa a carregar esses números. O gatilho continua sendo reincidência real da lição 13 por
classe; o que muda é que quem reabrir a P-32 não vai regastar o desenho já reprovado.

## 7. Notion — o que escreve, e as duas travas

**Escreve** (18 páginas de status + 1 propriedade), tudo por ID vindo do packet. O valor alvo de
status é **`Concluída`** — a mesma opção que as páginas de fechamento das sprints 1 a 3 já carregam na
base canônica, medida no packet; nenhum valor novo é inventado, e o conjunto exato de opções da
propriedade é conferido no `fetch` do schema antes do primeiro write:

- Dashboard `8.4.0`–`8.4.7` — 8 páginas, hoje `Backlog`, feature entregue em 2026-08-17;
- Meu Perfil `8.5.1`–`8.5.9` — 9 páginas, hoje `Backlog`, feature entregue em 2026-08-18;
- `9.1.4` (`388bc9603dfa8119a5ecc157b2cc18d3`), hoje `A fazer` — a `main` já tem as três coberturas
  dedicadas; **não** se abre bloco de código para repeti-las;
- **P-18**: propriedade `Sprint` da página canônica `3a2bc9603dfa8067902cf3c62bffdb0d`, cuja descrição
  diz Sprint 3 e cuja propriedade diz Sprint 2.

**Duas travas**, contra o erro que já produziu 12 falsos positivos num doc-sync:

1. **nenhuma busca por título** — só `fetch` por ID, na base canônica
   `collection://e64b7d57-d000-4433-b652-a410e75193cc`. A base homônima obsoleta
   (`collection://6adbc960-…`) ainda responde busca; o ID que a ficha da P-18 cita
   (`f88bc9603dfa8253b40981686f8ae023`) mora **nela** e está `deleted`;
2. **releitura depois do write** — o valor final é lido de volta por ID. Valor antes e depois entram
   no plano.

**Não escreve** — vira relatório para o João decidir:

- **P-22**: as duas H.1.3.1 (`3a2bc9603dfa8021b69ee399cd8fd915` Sprint 3, critério vazio;
  `3a2bc9603dfa803b94bbf27c075b27d6` Sprint 4, critério preenchido). Apagar é destrutivo e a escolha
  da canônica é do João (D1);
- **`8.4.0` × `8.4.7` com os conteúdos trocados** entre estrutura arquitetural e UI review — fato do
  packet, medido em terceira mão desde 2026-08-17. Trocar o status de uma página cujo corpo está no
  lugar errado propaga o erro; o status entra, a troca de corpo vira relatório;
- **duplicações genéricas de sync/fechamento/UI review** (H.1.1, H.1.2, H.2.1, as cinco H.1.3, as
  quatro H.1.3.1 e as quatro H.1.3.2): tabela com ID e status atual, sem write.

## 8. P-31 — o que o bloco pode fazer, e o que não

Não pode fechar: o `update_file` do Drive não escreve conteúdo (§1), e `create_file` produziria um
segundo arquivo — fragmentar o espelho é o oposto de sincronizá-lo, como a própria ficha já diz.

O que o bloco entrega: a ficha da P-31 passa a carregar **o texto literal do ponto 5** copiado de
`docs/adrs.md` (a fonte, não uma reescrita) e o **file ID** do espelho
(`14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`), para que colar seja um passo e não uma garimpagem. A pendência
permanece aberta, com o motivo agora provado por schema de ferramenta em vez de suposição.

## 9. DoD

O DoD do item 14 é "código, `/docs`, Drive e Notion concordam sobre entregue × pendente × descopado".
Prova, por natureza:

1. **Doc local** — cada frente provada por **alcance**, não pelo primeiro sítio: os 4 sítios da P-43
   medidos por varredura de `planejada` em `der-fisico.md` (e a linha 74 conferida intacta); ADR-20 e a
   nota do ADR-12 lidos de volta no arquivo; a lição 18 numerada em sequência.
2. **Externo** — cada uma das 19 escritas relida por ID, com valor antes e depois. Contagem final:
   zero página `Backlog` entre as 17 de Dashboard e Meu Perfil.
3. **Mecanismo** — a Regra C **vista reprovar** com sonda antes de passar; suíte de backend verde
   depois, com o número comparado à baseline.
4. **Fichas** — P-18, P-20, P-21, P-23, P-39 e P-43 movidas para `encerradas.md`; P-22, P-31 e P-32
   permanecem em `abertas.md` com texto atualizado; `pendencias/README.md` reflete as duas listas.

## 10. Limitações declaradas

1. **P-31 não fecha** — ferramenta de Drive não escreve conteúdo (medido, §1).
2. **P-22 não fecha** — decisão de qual cópia é canônica é do João, e apagar é destrutivo (D1).
3. **P-32 não fecha** — por decisão (D6): a forma óbvia foi medida e reprovada; a ficha guarda o
   número e o gatilho continua sendo reincidência real.
4. **`8.4.0` × `8.4.7`** — o status é corrigido, o conteúdo trocado **não**; sai como relatório.
5. **Permissões `feedback.*`** seguem órfãs, por D4 — são do item 1 do backlog.
6. O bloco **não** abre código novo para `9.1.4`; o backlog proíbe repetir cobertura existente.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Escrever na base Notion errada | endereçamento por ID apenas; zero busca por título; a base obsoleta é nomeada na §7 para ser reconhecida |
| Regra C acusar aresta consumida por FQN inline | reusar a varredura `token_get_all()` da Regra B, nunca linhas `use` (§5) |
| Catraca nascer verde e não provar nada | sonda obrigatória no DoD (§5, §9) |
| P-43 corrigir demais e tocar a linha 74 | a linha 74 está nomeada como intocável (§4) e é conferida no DoD |
| Toque em backend disputar stack | um arquivo, arch test sem MySQL/HTTP; `git diff main...HEAD -- backend/` conferido no gate (§1) |

## 11-bis. Emenda medida durante a escrita do plano — 2026-08-22

A ficha da P-39 e a §4 diziam "nota no `progress.md` da entrega". Medido ao escrever o plano: a linha
do BD-6 **não está** no `progress.md` — ela migrou para `docs/superpowers/historico/progress-archive.md:74`
no fechamento que arquivou as entregas antigas. A nota vai para o archive, no mesmo lugar onde a
entrega vive. O remédio é o mesmo que a P-27 fixou (nota na linha da entrega, nunca emenda no plano
aprovado); só o arquivo é outro.

## 12. Fora de escopo

Reimplementar Dashboard, Meu Perfil ou cobertura de `9.1.4`; decidir o descope de Feedback; apagar ou
mesclar página do Notion; escrever no Drive; retro-editar plano ou spec arquivados (regra da P-27);
promover ou remover item do backlog.
