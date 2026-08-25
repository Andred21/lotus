# Spec — Certificação · histórico do aluno

> Bloco `certificacao-historico-do-aluno` (item 2 da fila) · lane-a · main tree · executor `claude`
> Context Packet: `docs/superpowers/context-packets/2026-08-24-certificacao-historico-do-aluno.md`
> (`status: partial` — Figma indisponível, ver §9)

## 1. O problema

O aluno tem certificados desde o Bloco 7, e desde 2026-08-08 existe o módulo próprio
`/certificados` (Emisión + Historial). O módulo de alunos nunca foi tocado: quem abre o detalhe de
um aluno vê vínculos e turmas, e não descobre se aquele aluno tem certificado, nem consegue abrir o
documento sem sair da tela e procurá-lo por outro caminho.

`StudentDetailData` ainda carrega, no próprio docblock, a frase que justificava a ausência:

> Certificados não entram: o domínio Certification não existe (Bloco 7).

A frase é falsa desde o Bloco 7. **Este bloco absorve a P-15**, cuja decisão pendente — expor ou não
certificados no módulo de alunos — o João tomou no brainstorming de 2026-08-24: expor, no detalhe,
como coluna da tabela de turmas.

## 2. O que decide o desenho

Cinco medições feitas antes de desenhar, todas contra `main@cad0d1fb`:

1. **`Enrollment` não conhece `Certificate`.** A travessia sem N+1 já tem dono parcial:
   `CertificateVigenciaResolver::byEnrollment()` resolve uma página inteira numa query — mas só
   devolve `emitido`, e o histórico do aluno precisa mostrar revogação.
2. **`Identity → Certification` não existe na matriz de arestas** (`DomainDependencyTest::ALLOWED`).
   Certification aponta para Identity e Operation; só `Dashboard` aponta para Certification.
3. **Redator não alcança o detalhe do aluno.** `redatorPermissions()` dá três permissões
   (`operation.turma.view`, `operation.turma.submit_docs`, `operation.enrollment.record_result`),
   nenhuma delas `identity.user.view`. Quem abre a tela é admin ou superadmin, e ambos já têm
   `certification.certificate.view`.
4. **Revogar libera a matrícula e reemitir cria certificado novo** (porta 3 do
   `CertificateEligibility` não conta revogado como vigente). Logo uma matrícula pode ter N
   certificados: vários revogados e, no máximo, um emitido.
5. **Vigência indeterminada é o padrão, não a exceção.** `validity_months` vive no template do curso
   (`CourseCertificateTemplate`), é `nullable`, e `null` produz `valido_ate = null` na emissão
   (`IssueCertificateAction:36`). Confirmado pelo João em 2026-08-24: certificados não vencem, salvo
   um curso isolado. O desenho trata prazo como exceção.

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| **D1** | O certificado aparece como **coluna da tabela de turmas** do detalhe, não em seção própria | a tabela já lista uma linha por matrícula e certificado é 1:1 com matrícula; seção própria repetiria curso, turma e data numa segunda lista quase igual |
| **D2** | O contrato vem **embutido no `show` do aluno**, não em endpoint separado | uma request; endpoint próprio obrigaria o React a casar duas listas por `enrollment_id`, que é composição no cliente — vizinha do que o DoD proíbe |
| **D3** | `Identity` **não conhece `Certificate`**: a aresta nova são um service e um DTO de Certification | interface estreita; model, enum de status e snapshot continuam sem sair de Certification |
| **D4** | O status derivado (`vigente\|por_vencer\|vencido\|revocado`) **passa para o backend**, e o módulo `/certificados` migra junto | o DoD proíbe regra de domínio reconstruída no React; e duas implementações de "vigente" num documento de peso legal é exatamente o que o docblock do `CertificateVigenciaResolver` chama de "respostas esperando para divergir" |
| **D5** | O enum fica com **4 valores**; vigência indeterminada **não** ganha um quinto | `HistorialTable:90` já mediu que valor novo contamina o filtro e os quatro contadores do `useHistorial`. O sinal de "tem prazo" já existe e é `valido_ate !== null` |
| **D6** | Certificado sem prazo é rotulado **"Vigente"**, igual ao com prazo; a **data ao lado** é o que distingue | nenhuma chave i18n nova **de status** (as duas chaves novas da célula são as de ausência, §6.1), e o `/certificados` já rotula assim hoje |
| **D7** | A célula distingue **três ausências**: `Pendiente de emisión` (aprovado sem certificado), `No corresponde` (reprovado/pendente) e o certificado presente | um traço só para os dois primeiros faria significados opostos parecerem iguais; a derivação lê apenas `certificate === null` e o `approval_status` que a linha já traz |
| **D8** | A linha mostra o **certificado atual** mais `superseded_count` | rastro de reemissão não some, e a linha não vira lista de altura variável numa tabela que já disputa largura |
| **D9** | O mecanismo de abrir blob em aba **sobe para `shared/hooks`** | seria a terceira cópia do mesmo código; o docblock do segundo clone já declara que é clone |
| **D10** | A derivação de vencimento usa **`America/Santiago` explícito** | `config/app.php:75` fixa `'timezone' => 'UTC'` literal, sem `env()`, e o `APP_TIMEZONE=America/Santiago` do `.env.example` é ignorado. Corrigir o config muda comportamento global e não cabe aqui — vira pendência |
| **D11** | Gate = **`identity.user.view`**, herdado do `show`, sem gate próprio de certificado | nenhuma role atual vê aluno sem ver certificado; o gate explícito (`certificates_visible: false`) foi desenhado e **recusado por não ter consumidor** |
| **D12** | Executor **`claude`** | toca a lei §5.3 (tipos gerados), a lei §5.6 (peça nova em `shared/`, fronteira entre features), decide fronteira de domínio na matriz de arestas e tem DoD de navegador |

## 4. Arquitetura

```
Identity\Http\Controllers\StudentController::show
      │ injeta
      ▼
Certification\Services\StudentCertificateHistory
      forEnrollments(int[] $ids): Collection<int, StudentCertificateData>
      │ devolve
      ▼
Certification\Data\StudentCertificateData      ← a única superfície que Identity enxerga
```

`DomainDependencyTest::ALLOWED['Identity']` cresce em **duas** linhas: o service e o DTO.
`Certificate`, `CertificateStatus`, `CertificateSnapshotData` e o resolver de vigência continuam
sem cruzar a fronteira. A Regra C do arch test (aresta declarada sem consumidor reprova) mantém as
duas honestas.

O ciclo `Identity ↔ Certification` que isso cria não é inédito: `Identity ↔ Operation` já está na
matriz com justificativa escrita (`Student::enrollments()` de um lado, `StudentResolver` do outro).

## 5. Contratos

### 5.1 Enum novo — dono único da regra

```php
// app/Domains/Certification/Enums/CertificateDisplayStatus.php
enum CertificateDisplayStatus: string
{
    case Vigente   = 'vigente';
    case PorVencer = 'por_vencer';
    case Vencido   = 'vencido';
    case Revocado  = 'revocado';

    public const POR_VENCER_DIAS = 30;

    public static function for(
        CertificateStatus $status,
        ?CarbonInterface $validoAte,
        CarbonInterface $hoje,
    ): self;
}
```

Regras, na ordem em que decidem:

1. `status === Revocado` ⇒ `Revocado`, **antes de olhar data alguma**. Certificado revogado nunca
   volta a parecer vigente por conta de `valido_ate`.
2. `valido_ate === null` ⇒ `Vigente`. **É o caso comum.**
3. `valido_ate` anterior a hoje ⇒ `Vencido`. Vencer **hoje** ainda é `Vigente`.
4. faltando 30 dias ou menos ⇒ `PorVencer`; 31 ou mais ⇒ `Vigente`.

Comparação por data pura. `hoje` resolvido em `America/Santiago` (D10).

### 5.2 Consulta sem N+1

```php
// app/Domains/Certification/Services/StudentCertificateHistory
forEnrollments(array $enrollmentIds): Collection   // keyBy enrollment_id
```

Uma query: `whereIn('enrollment_id', $ids)->orderByDesc('created_at')->orderByDesc('id')`. Por
matrícula, o **atual** é o primeiro `emitido`; não havendo emitido, o revogado mais recente.
`superseded_count` é o resto.

Irmão do `CertificateVigenciaResolver`, que continua sendo a fonte de "vigente" para as portas de
emissão e para o painel — este service responde outra pergunta (o histórico, revogados inclusive) e
não substitui aquele.

### 5.3 DTOs

```php
// Certification\Data\StudentCertificateData  (novo)
id, codigo, display_status, valido_ate, snapshot_ok

// Identity\Data\StudentTurmaData             (+2 campos)
certificate: ?StudentCertificateData
superseded_count: int

// Certification\Data\CertificateData         (+1)
// Certification\Data\PublicCertificateData   (+1)
#[Computed] display_status: CertificateDisplayStatus
```

`StudentDetailData::fromModel` recebe a coleção já resolvida; o controller injeta o service. O DTO
não resolve container.

`snapshot_ok` viaja porque a tela precisa dele: documento corrompido não tem estado a afirmar (§6).

## 6. Frontend

Três peças sobem para `shared/`, cada uma com precedente no repositório:

| Peça | Destino | Precedente |
|---|---|---|
| `useCertificatePdf` (mutation do blob) | `shared/api/certificatesApi.ts` | `shared/api/studentsApi.ts`, `redatoresApi.ts` |
| mecanismo de abrir blob em aba | `shared/hooks/useBlobTabOpener.ts` | os dois clones existentes |
| severidade + chave i18n do estado | `shared/lib/certificateStatus.ts` | `shared/lib/redatorStatus.ts` e seu `DOC_STATUS_SEVERITY` |

A **derivação não sobe — ela morre.** `certStatus()` e `STATUS_SEVERITY` saem de
`features/certification/lib/certStatus.ts`; o que fica em `shared/lib` é o mapa
`display_status → severidade` e a chave de tradução. `rowCertKind()` **permanece** onde está: é a
classificação do painel de emissão, outra pergunta e outro DTO.

Seis consumidores trocam `certStatus(c)` por `c.display_status`: `HistorialTable` (2 usos),
`CertificateViewDialog`, `useHistorial` (filtro mais os 4 contadores) e `useValidationPage`.

Na tela, quinta coluna em `StudentDetailSections.tsx`, com a célula num componente próprio:

```
StudentCertificateCell({ turma })
  snapshot_ok === false      → tag de defeito, sem afirmar estado
  certificate !== null       → código · tag(display_status) · [abrir PDF]
                               + data SÓ quando valido_ate !== null
                               + "+N ant." quando superseded_count > 0
  aprobado, sem certificado  → "Pendiente de emisión"
  demais                     → "— No corresponde"
```

A regra do snapshot corrompido é **herdada, não inventada**: `HistorialTable:88-98` mediu que as
datas continuam válidas sobre um snapshot que não sustenta nem o nome do aluno, e que o defeito
**não** vira um quinto valor do enum.

### 6.1 i18n

Os quatro valores de `display_status` já têm chave (`certificate.status.*`), e o defeito de snapshot
também (`certificate.snapshotCorrupted`). Nascem **três** chaves, nas **três** locales
(`src/shared/config/locales/`: `es-CL.json`, `en.json`, `pt-BR.json`), sob o namespace `student.*`
que já existe:

- `student.certificatePending` — "Pendiente de emisión"
- `student.certificateNotApplicable` — "No corresponde"
- `student.certificateSuperseded` — "+{{count}} ant.", com a contagem interpolada

Chave crua na tela reprova o DoD; o `PermissionI18nParityTest` não cobre este namespace, então a
prova é a percorrida nos três idiomas sem F5 (§8, item 8).

**Largura:** a tabela vive dentro do `StudentDialog`, não numa página cheia. Política em
porcentagem, no molde que a lane-c fixou na `TurmasTable` em 2026-08-24, medida no navegador nos
três viewports.

## 7. Autorização

- **Gate:** `identity.user.view`, herdado do `show` (D11).
- **PDF:** `GET /api/certificates/{id}/pdf` não muda e segue exigindo
  `certification.certificate.view`. Consequência aceita: numa role futura que veja aluno sem ver
  certificado, a coluna listaria e o botão daria 403. O remédio desenhado (`certificates_visible`)
  fica registrado aqui e não é implementado por não ter consumidor.
- **Revogado nunca some** da tela. Esconder revogação num histórico de peso legal é o mesmo defeito
  que a P-15 recusou em 2026-07-27.
- **Ownership:** nenhum escopo por redator entra aqui, porque redator não alcança a rota. Se um dia
  alcançar, o eixo é o `TurmaQueryBuilder::visibleTo()` que o bloco 3 construiu — não uma regra nova.

## 8. Verificação

**Catracas — cada uma vista reprovar antes de passar:**

| Teste | O que morde |
|---|---|
| `CertificateDisplayStatusTest` | `revocado` precede data futura · `valido_ate` null ⇒ `vigente` · vencer **hoje** ⇒ `vigente` · 30 dias ⇒ `por_vencer`, 31 ⇒ `vigente` · derivação em `America/Santiago` |
| `StudentCertificateHistoryTest` | atual = o emitido; sem emitido, o revogado mais recente · `superseded_count` conta o resto · **uma query** para N matrículas, contada por `DB::listen` |
| `StudentDetailCertificatesTest` | os quatro ramos da célula no `GET /api/students/{id}` — certificado presente, pendente, não corresponde, snapshot corrompido — mais os quatro valores de `display_status` · 403 sem `identity.user.view` |
| `DomainDependencyTest` | as 2 arestas novas de `Identity`, e a Regra C reprovando se o import sair |
| `StudentCertificateCell.test.tsx` | os quatro ramos da célula, os quatro valores de `display_status`, a data presente só com `valido_ate`, e `+N ant.` |

Migram junto, porque a troca os quebra: `HistorialTable.test.tsx`, `CertificateViewDialog.test.tsx`,
`useValidationPage.test.tsx`.

Baselines a bater: backend **906 passed / 5 skipped**; frontend **100 arquivos / 555 testes**.

**DoD provado no navegador contra a API real.** Build verde não conta:

1. Certificado de curso **sem prazo** → código + `Vigente`, **sem data**
2. Certificado de curso **com `validity_months`** → data presente, `por_vencer`/`vencido` conforme o
   dado real do banco
3. Revogar e reemitir de verdade pelo `/certificados` → a linha do aluno passa a mostrar o novo com
   `+1 ant.`
4. Matrícula aprovada sem certificado → `Pendiente de emisión`; reprovada → `No corresponde`
5. Abrir o PDF pela coluna → aba nova com o PDF certo, conferido por `pdfinfo`
6. **N+1 medido:** contagem de queries do `show` igual para aluno com 1 e com 10 matrículas
7. `/certificados` intacto após a migração: filtro por estado, os 4 contadores do rodapé e a
   validação pública do QR
8. Largura da tabela no `StudentDialog` medida nos 3 viewports, zero truncamento, e a coluna
   percorrida nos **três idiomas sem F5** — nenhuma chave crua, incluindo a marca de reemissão

**Tipos:** `php artisan typescript:transform` regenera `generated.ts` (enum novo e 3 DTOs alterados).
`generated.ts` não se edita à mão — lei §5.3.

## 9. Fora de escopo e limitações declaradas

- **Coluna `CERTIFICADOS` na listagem de alunos.** O protótipo citado pela P-15 a mostra; Drive e
  Notion não a exigem, e a task 8.3.1 nomeia o perfil. Fica fora, declaradamente, para a P-15 não
  reabrir por omissão.
- **Fidelidade ao protótipo do Figma.** O packet registra a fonte como `unavailable`: o Figma não
  devolveu `fileKey`/`nodeId` consultáveis (`get_metadata` falhou com
  `fileKey [pattern]: String does not match pattern`). Nada neste desenho afirma fidelidade visual
  ao protótipo — a composição vem do escopo do backlog, do Drive e do Notion.
- **Emissão, elegibilidade, vigência e autenticação de aluno.** Este bloco encontra e abre
  certificados já emitidos; não muda quem pode emitir nem quando.
- **`rowCertKind()` e o painel de emissão.** Não migram: outro DTO, outra pergunta.
- **Correção do `config/app.php:75`.** Vira pendência nova (D10), não entrega deste bloco.

## 10. Pendências

- **P-15 — encerra neste bloco.** A decisão que ela esperava foi tomada: expor no detalhe, como
  coluna; a listagem fica fora por escrito.
- **Nasce:** `config/app.php:75` fixa `'timezone' => 'UTC'` literal e ignora o
  `APP_TIMEZONE=America/Santiago` do `.env.example`. Toda data derivada no servidor roda em UTC. Aqui
  o alcance é pequeno (só certificado com prazo, que é exceção), mas o defeito é global.
