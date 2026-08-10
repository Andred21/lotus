# Spec — `certificacao-lote-e-snapshot` (2026-08-10)

> Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10 (`/planejar-bloco` com
> o item nomeado literalmente no argumento e o estado em `idle`).
> Origem: revisão de arquitetura de 2026-08-09, com as decisões já tomadas na entrevista. **Esta
> spec não reabre nenhuma delas** — refina só o que ficou aberto e mede o repositório contra o texto.
> Sem Context Packet, por ausência medida de fonte externa (zero referência a Drive/Notion/Figma no
> item; as fontes são o repositório e as decisões escritas). Dispensa confirmada pelo João.

## 1. Objetivo

Duas dívidas do domínio Certification, uma frase cada:

1. **O lote.** As quatro regras de ordenação/transação da emissão em lote existem hoje como
   comentário no `CertificateController::batch` — texto ao lado do código, não estrutura. Elas viram
   um Action próprio, onde a ausência de transação externa é a forma da classe.
2. **O snapshot.** "Este snapshot é apresentável?" está copiado em dois lugares com a mesma política
   e ausente de outros dois. Vira um gate único no tipo que congela o documento, e cada rota declara
   se degrada ou falha alto.

## 2. Escopo

**Dentro:** `CertificateController::batch`, `BatchIssueCertificatesAction` (novo),
`App\Shared\Validation\ValidationMessages` (novo), `ImportStudentsAction:63`,
`CertificateSnapshotData`, `CertificateData`, `CertificatePdfService`, `PublicCertificateData`,
`CorruptedSnapshotException`, `generated.ts`, `HistorialTable` e as 3 locales.

**Fora, por decisão do item:** o lado Operação (item 5 do backlog, `turma-habilitacao-listagem`);
qualquer mudança na política de vigência ou nas 6 portas do `CertificateEligibility`.

**Fora, por medição desta spec:** o `EmissionPanelQuery` e os DTOs do painel (não leem o snapshot);
o Blade do certificado (quem barra o documento corrompido é o `CertificatePdfService`, antes de
renderizar — o template não muda); schema (zero migration — ADR e DER não abrem).

## 3. Decisões

### Herdadas da entrevista de 2026-08-09 (D1–D6, não reabertas)

- **D1** — `BatchIssueCertificatesAction::execute(BatchIssueData): array<BatchIssueItemResultData>`;
  o controller vira 4 linhas e o Action resolve o redator uma vez, dentro dele.
- **D2** — Sem transação externa; id de matrícula arquivada continua virando `ValidationException`
  **dentro** do `try` (`exists` fica como está).
- **D3** — `App\Shared\Validation\ValidationMessages::squash()` com `implode(' ')`, e o
  `ImportStudentsAction:63` migra **no mesmo commit** — o seam nasce com dois adapters.
- **D4** — `CertificateSnapshotData::assertPresentable(string $codigo)`; `CertificatePdfService` e
  `PublicCertificateData` perdem a cópia da política.
- **D5** — `CertificateData` ganha `snapshot_ok: bool`, `snapshot` continua não-nulo. `index` degrada
  marcando a linha; `show`, `pdf` e rota pública do QR falham alto. Regenera `generated.ts`, marca a
  linha no `HistorialTable` e cria a chave i18n nos 3 locales — mesmo commit.
- **D6** — Docblock do `CorruptedSnapshotException` reescrito: a listagem passa a ser exceção
  deliberada ao "falhar alto".

### Fechadas no brainstorming de 2026-08-10 (D7–D9)

- **D7** — `missingRequiredFields()` vira **privado**. Nascem `isPresentable(): bool` e
  `assertPresentable(string $codigo): void` **adjacentes**, no molde `assert*`/`constrain*` do
  `CertificateEligibility` (B1). `snapshot_ok` lê `isPresentable()`; a lista de campos faltantes
  deixa de ser API pública para um consumidor que só quer sim/não, e continua viva na mensagem da
  exceção.
- **D8** — A linha corrompida **mantém o botão Ver**. Clicar abre o `CertificateViewDialog` no estado
  de erro, que já tem mensagem e Reintentar. Zero lógica nova, e é onde o suporte lê o código do
  certificado e **quais** campos faltam — exatamente o que desabilitar o botão esconderia.
- **D9** — A marcação é **tag de estado**: na coluna Estado, no lugar do Vigente/Vencido/Revocado,
  um `AppTag severity="danger"` com a chave nova. Quando o documento está corrompido, o estado da
  linha é justamente o que não dá para afirmar.

## 4. Desenho

### 4.1 `BatchIssueCertificatesAction` (D1, D2)

Nasce em `backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php`, com
`IssueCertificateAction` injetado no construtor:

```php
public function execute(BatchIssueData $data): array
```

O `Redator::query()->findOrFail($data->redator_id)` resolve **uma vez**, dentro do Action, antes do
laço. O laço, o `try`, o `ValidationException` do id soft-deletado e o `catch` que monta o
`BatchIssueItemResultData` migram inteiros do controller, sem mudança de forma.

**A ausência de `DB::transaction` é a decisão, e é declarada.** A regra de Action da
`backend-ddd.md` diz "dentro de `DB::transaction`"; este Action é a exceção nomeada, porque cada
`IssueCertificateAction::execute()` já é a própria transação (portas + D9 + auditoria) e uma
transação por fora faria um item falho reverter os já commitados — e consumir um número de sequência
que nunca vira certificado. Os quatro parágrafos que hoje moram no docblock do controller vão para
o Action, onde passam a descrever a estrutura em vez de compensá-la.

O controller fica:

```php
public function batch(BatchIssueData $data, BatchIssueCertificatesAction $action): array
{
    return $action->execute($data);
}
```

`Redator` continua importado no controller — o `store()` ainda o resolve (D11, seletor de redator).

### 4.2 `ValidationMessages::squash()` (D3)

Namespace novo: `backend/app/Shared/Validation/ValidationMessages.php`.

```php
public static function squash(ValidationException $e): string
```

Corpo: `collect($e->errors())->flatten()->implode(' ')`. A assinatura recebe a **exceção**, não o
array — é o seam mais apertado que serve os dois adapters sem que nenhum dos dois precise saber a
forma de `errors()`.

Dois adapters no nascimento:

- `ImportStudentsAction:63` — hoje já é `->implode(' ')`. Comportamento **byte-idêntico**.
- O item do relatório do lote — hoje é `->first()`. **Muda de comportamento por decisão**: passa a
  concatenar todas as mensagens com espaço. Com uma mensagem só (todo caso da suíte hoje, e o
  `Ya existe un certificado vigente para esta matrícula.` provado no e2e de 2026-08-08) a saída é
  idêntica; as seis portas lançam uma mensagem cada. A mudança é correção por construção — se um dia
  uma recusa trouxer duas razões, o relatório deixa de esconder a segunda.

### 4.3 O gate do snapshot (D4, D7)

Em `CertificateSnapshotData`, três métodos adjacentes:

```php
public function isPresentable(): bool          // missingRequiredFields() === []
public function assertPresentable(string $codigo): void   // estoura CorruptedSnapshotException
private function missingRequiredFields(): array           // hoje public
```

Os campos exigidos não mudam: `aluno.name`, `curso.name`, `emissor.name` — quem, o quê, e quem
atesta. `CertificatePdfService::html()` e `PublicCertificateData::fromModel()` perdem as quatro
linhas de política (`$missing = …; if ($missing !== []) throw …`) e passam a chamar
`assertPresentable($certificate->codigo)`. A mensagem da exceção segue nomeando os campos.

### 4.4 `snapshot_ok` e as rotas (D5, D8, D9)

`CertificateData` ganha `public bool $snapshot_ok`, preenchido em `fromModel()` por
`$certificate->snapshot->isPresentable()`. `snapshot` continua não-nulo e continua sendo o snapshot
lido tolerantemente — o campo novo diz se ele é **apresentável**, não se ele existe.

Quem degrada e quem falha alto, rota a rota:

| Rota | Hoje | Depois |
|---|---|---|
| `GET /api/certificates` (`index`) | 200, sem checar | 200, `snapshot_ok` por linha — **degrada** |
| `GET /api/certificates/{id}` (`show`) | 200, **sem checar** | `assertPresentable` no controller — **falha alto** |
| `GET /api/certificates/{id}/pdf` | falha alto (política copiada) | falha alto (pelo gate) |
| `GET /api/publico/certificados/{uuid}` | falha alto (política copiada) | falha alto (pelo gate) |
| `POST /api/enrollments/{id}/certificate` (`store`) | 201, sem checar | **inalterado** |
| `POST /api/certificates/{id}/revoke` | 200, sem checar | **inalterado** |

**`show` é comportamento novo, não refactor** — hoje ele devolve 200 com snapshot corrompido.

**`store` e `revoke` seguem sem falhar alto, e é deliberado.** O `store` acabou de construir o
snapshot e o certificado já está commitado quando o DTO é montado: um 500 ali esconderia um 201 que
aconteceu. O `revoke` é mudança de estado que não lê o documento — revogar um certificado corrompido
é exatamente o que se quer poder fazer. Os dois carregam `snapshot_ok` como qualquer outra projeção.

**Frontend.** `HistorialTable` passa a ramificar na coluna Estado: `snapshot_ok === false` renderiza
`AppTag severity="danger"` com a chave nova; caso contrário, o `AppTag` de hoje. Chave nova no nível
`certificate.*` das 3 locales (73 → 74 chaves cada, paridade preservada).

**A marcação não vira um quinto `CertDerivedStatus`.** `certStatus()` lê `status` e `valido_ate`, que
são colunas e continuam válidas mesmo com o snapshot furado; promover "corrompido" a status
contaminaria o dropdown de filtro (`STATUSES`), os quatro contadores do rodapé e o
`CertificateViewDialog`. Consequência aceita e declarada: filtrar por "Vigente" continua trazendo a
linha corrompida cujas datas dizem vigente, e o rodapé continua contando-a ali. Corrupção é defeito
do documento, não estado dele.

O `CertificateViewDialog` não muda: `show` falha alto, então ele nunca recebe um certificado
corrompido — recebe o erro, que já sabe apresentar (D8).

### 4.5 Docblock do `CorruptedSnapshotException` (D6)

Reescrito para dizer as duas metades: falhar alto continua a regra em `show`, `pdf` e rota pública
do QR (documento de peso legal não atesta o que não sabe); e `index` é a **exceção deliberada** — um
registro corrompido não pode derrubar a listagem inteira, então a lista marca a linha e segue. O
texto atual afirma só a primeira metade.

## 5. O que muda de comportamento

Lista fechada, para o review e o gate conferirem sem inferir:

1. `GET /api/certificates/{id}` com snapshot corrompido: **200 → 500 RFC 7807**.
2. Item de lote cuja recusa traz 2+ mensagens: **primeira mensagem → todas, unidas por espaço**.
3. `CertificateData` ganha campo obrigatório `snapshot_ok` no contrato TS.
4. Linha do Historial com `snapshot_ok: false` troca a tag de estado pela tag de corrompido.

Nada mais. Em particular: números de sequência, portas, vigência, revogação, painel de emissão e o
Blade seguem idênticos.

## 6. Testes e DoD

**Uma fixture serve quatro provas.** Um certificado emitido cujo snapshot é corrompido depois
(`aluno.name` para string vazia, gravado direto na coluna — o caminho que a `CertificateSnapshotTest`
já usa para provar não-reescrita) prova, na mesma cadeia: `index` **200** com `snapshot_ok: false`
naquela linha e `true` nas demais; `show` **500** RFC 7807 nomeando o código; `pdf` **500**; rota
pública **500**.

**O guard do lote tem de sobreviver à mudança de casa.** `test_falha_inesperada_no_meio_do_lote_
preserva_o_que_ja_saiu` (`be58466`) continua no nível HTTP e continua sendo a prova de que não há
transação externa. O mutante muda de endereço junto com o código: envolver o laço **do Action** num
`DB::transaction` tem de deixá-lo vermelho. Provado nos dois sentidos antes de a task fechar
(lição 10).

**Testes novos:** `squash()` com duas mensagens (união por espaço, não a primeira); e os quatro
comportamentos da fixture acima. Os 11 testes do `BatchIssueTest` passam sem edição — se algum
precisar mudar, o refactor não foi refactor.

**Ferramentas:** suíte backend a partir de **493 passed, 1 skipped (1833 assertions)**; `pnpm test`,
`pnpm lint` e `pnpm build` verdes; Pint nos `.php` tocados; `typescript:transform` com o diff
**esperado** em `generated.ts` (`snapshot_ok`) e nenhum outro; paridade das 3 locales.

**Regenerar não quebra literal TS:** medido — nenhum teste do frontend constrói `CertificateData`
(o único literal de fixture é `PublicCertificateData`, em `useValidationPage.test.tsx`, que não
muda). A task que regenera ainda assim ajusta consumidores no mesmo commit (`generated-types.md`).

**Gate de fechamento contra a API real** (lição 12), não pela suíte: sessão Sanctum por cookie +
CSRF; lote com falha provocada devolvendo relatório por item com números contíguos; `show`/`pdf`/
pública sobre o certificado corrompido; e o `index` listando com a linha marcada.

## 7. Riscos e limitações declaradas

**Review de ALTO RISCO** — documento de peso legal, rota pública do QR e `generated.ts` no diff.
Duas frentes quando o bloco chegar em `ready_for_review`: lente Claude com o gabarito do projeto +
Codex read-only.

**Prova visual.** A marcação da linha é JSX; o repositório não tem browser utilizável no WSL
(Playwright sem as libs de sistema, limitação herdada de 2026-08-08). A prova da tag fica sendo o
`snapshot_ok` na API real + `pnpm build`/`pnpm lint` + a paridade de locales, com o checkpoint visual
dependendo do João. Declarado aqui para não ser lido depois como item silenciosamente cumprido.

**Backend + um arquivo de frontend → main tree, sem worktree (P-03).**

**`executor: claude`** — o bloco toca lei do §5 (`generated.ts`, §5.3) e documento de peso legal.
