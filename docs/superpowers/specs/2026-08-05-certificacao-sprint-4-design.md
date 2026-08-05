# Spec — Bloco 7 · Sprint 4 · Certificação (fatia vertical fina)

> Bloco `certificacao-sprint-4`. Item 1 do `backlog.md`, selecionado pelo João em 2026-08-05.
> Context Packet: `docs/superpowers/context-packets/certificacao-sprint-4.md` (`status: partial` —
> o Figma segue `unavailable`, com a evidência no packet; a composição visual das telas não tem
> referência recuperada, e o checkpoint visual do João cobre a lacuna).
> Três regras de negócio foram fechadas pelo João antes do desenho (RN-CER-01/02/03) e estão no
> `state.md`; o packet as carrega como fonte `J-DEC`.

## §1 · O que este bloco é

A vertical de certificação do MVP tem **16 tasks no Notion** (8.0.x mapeamento, 8.1.x backend,
8.2.x validação pública, 8.3.x telas). Isso é sprint, não bloco. O corte é **uma fatia vertical
fina**: emitir um certificado, baixar o PDF com QR, validar publicamente pelo QR e revogar.

O critério de aceite não é suíte verde nem endpoint respondendo — é **o QR do papel abrindo a
validação real**. Certificado é documento de peso legal (§1 do `CLAUDE.md`), e um módulo que emite
sem validar não entrega o valor que justifica o módulo.

### Medições que mudaram o desenho antes de ele existir

Sétima ocorrência da lição 13 no projeto. Quatro fatos do repositório contrariam o que doc, ADR ou
task descrevem:

1. **O gate acadêmico não tem escritor em produção.** `enrollments.approval_status` nasce
   `pendiente` e **nada em `backend/app/` o escreve**: o `EnrollmentController` tem
   `index`/`preview`/`store`/`import`/`destroy`, e o `EnrollmentData` declara em docblock
   "resultado acadêmico é read-only aqui; escrita é 6d". O 6d fechou sem entregar isso. O único
   escritor é o `OperationDemoSeeder`, que declara a exceção no próprio docblock: *"o endpoint de
   resultado acadêmico é da sprint do redator e ainda não existe"*. Emissão gateada por `aprobado`
   funcionaria no seed e **nunca dispararia em produção** — e o DoD do projeto não aceita prova
   contra dado de seed.
2. **Dois pacotes instalados com zero uso.** `spatie/laravel-pdf` ^2.12 e
   `simplesoftwareio/simple-qrcode` ^4.2 não têm uma ocorrência em `app/`, `config/`, `tests/` ou
   `resources/`. O ADR-12 manda "Spatie Laravel PDF com driver Gotenberg", e o único PDF de
   produção (`ManualPdfService`) chama o Gotenberg por `Http::attach` cru. O ADR descreve mecanismo
   não construído (lição 1: pacote instalado não é DoD).
3. **A entrega do PDF diverge em três fontes.** ADR-12 diz "stream direto para S3"; a task 8.1.5 diz
   "PDF → S3 → URL temporária sem intermediário"; o precedente real devolve o binário **pela app**
   (`TurmaController::manual`).
4. **`course_certificate_templates` já existe e o `layout_config` não tem um único consumidor.** A
   tabela tem `version`, `layout_config` (json) e `validity_months` desde `2026_07_08_172639`, com
   model auditável, DTO e 3 rotas — mas nada renderiza aquele JSON. O mapeamento do documento
   oficial cai exatamente nele.

Some-se o que o packet trouxe e o repositório não sabia: a emissão é **manual** e o gate é **só
acadêmico** (financeiro não entra — lei §5.7 no caminho mais sensível do produto); a numeração é
`LOT-ANO-SEQ` com um único exemplar oficial medido (`LOT-2026-016`); e nenhum dos três certificados
oficiais exibe vigência, o que confirma a RN-CER-01 pelo documento e não só pela instrução.

## §2 · Decisões

**D1 — o corte é fatia vertical fina, não backend inteiro.** Emitir + PDF + QR + validar + revogar,
com as telas mínimas. O alternativo (8.0.x + 8.1.x num bloco, telas depois) entrega 12 tasks sem
nada na tela e sem checkpoint visual; num módulo cujo valor é o papel escaneado, isso adia a única
prova que importa.

**D2 — o escritor mínimo do resultado acadêmico entra no bloco.** `PUT
api/turmas/{turma}/alunos/{enrollment}/resultado` grava `approval_status` e, opcionalmente,
`attendance_pct`/`grades`. Sem ele o módulo inteiro é inalcançável em produção. Mora em
`Operation`, não em `Certification` — é resultado de turma, não de certificado —, e por isso **não
cria aresta nova** na matriz de domínios.

**D3 — o identificador público é o `uuid`; `qr_code_hash` não nasce.** O DER prevê as duas colunas,
a task 8.1.9 diz hash e a 8.2.1 diz `/validar/{uuid}`. Dois identificadores para o mesmo documento
legal são dois caminhos até ele, e um fica sem consumidor. O argumento clássico do hash — rotacionar
a URL — **não existe aqui**: o QR está impresso no papel; rotacionar quebraria certificado já
entregue. UUIDv4 é imprevisível (122 bits) e serve às duas pontas. O `der-fisico.md` é atualizado
com a decisão e o motivo.

**D4 — `codigo` é `LOT-ANO-SEQ` puro; a turma vive na relação.** O número é impresso e imutável para
sempre; a turma é derivável por `enrollment_id → turma` e aparece no histórico e na busca. O único
exemplar oficial medido usa a forma curta. (O João levantou a referência de turma no código como
opcional; fica fora com este motivo.)

**D5 — a sequência cresce sem teto.** Depois de `LOT-2026-999` vem `LOT-2026-1000` (RN-CER-02). Não
há padding fixo a impor além do zero-padding de 3 do exemplar oficial, nem rollover a desenhar.

**D6 — vigência: `valido_ate` é `nullable` e nasce `null`.** O padrão é **não ter validade**
(RN-CER-01); a data é exceção. Quando o template do curso tiver `validity_months`, a emissão deriva
`valido_ate = data de emissão + N meses`; sem ele, fica nulo. "Expirado" só existe para quem tem
data — o que reconcilia as três leituras contraditórias das fontes e explica os oficiais sem
vigência.

**D7 — `certificates` não tem soft delete.** Anulação de documento legal é **revogação**, não
arquivamento. Duas formas de o certificado sumir é pior que uma, e o histórico tem de ser imutável.

**D8 — `enrollment_id` entra sem `UK`; a unicidade é do certificado VIGENTE.** O DER pede
`enrollment_id FK,UK`, e com UK estrito um certificado revogado por erro **nunca** poderia ser
reemitido — soft delete não resolveria, porque coluna `unique` de registro soft-deletado continua
ocupando o índice (lição 8). A regra vira "no máximo um certificado `emitido` por matrícula",
implementada como **índice único sobre coluna gerada** (`emitido` → `enrollment_id`, senão `NULL`;
`NULL` não colide). Provado contra **MySQL real**, não contra o sqlite da suíte (lição 15). Se o
engine não sustentar a coluna gerada, a saída declarada é `lockForUpdate` + checagem na Action, e a
troca é registrada — não silenciosa.

**D9 — a numeração é atômica dentro da transação de emissão.** `certificate_sequences` tem uma linha
por ano; a emissão faz `lockForUpdate` na linha do ano corrente, incrementa e grava o certificado na
mesma transação. Serialização provada **à mão, com duas sessões MySQL**, como no `lockForUpdate` do
`DeleteClientContactAction` (2026-08-01). Placar verde não prova concorrência.

**D10 — o gate da emissão tem quatro portas, e todas devolvem 422 pelo handler RFC 7807.** Turma
`concluida`; matrícula `aprobado`; **o curso tem template**; nenhum certificado vigente para a
matrícula. A terceira é decisão nova: certificado sem template aprovado é documento legal com
narrativa inventada, e a 8.0.1 pede "mapa oficial sem campos inventados". Nunca `abort(422)` (lei
§5.4).

**O template usado é o de maior `version` não soft-deletado**, resolvido no ato da emissão. Um curso
pode ter várias versões; escolher a mais nova é o que "versionado" significa, e o snapshot (D12)
congela qual foi — reimpressão não migra de versão.

**D11 — um relator por certificado, escolhido pelo admin (RN-CER-03).** Turma com um redator preenche
sozinha; com dois ou mais, a escolha é do admin no ato e vai para `redator_id` **e** para o snapshot.
O `RELATOR` singular do documento oficial é o comportamento correto, não defasagem: o N:N do Bloco 6b
existe para a **troca durante o curso**, e a auditoria guarda o histórico da troca.

**D12 — o snapshot congela dado e template, e o Blade lê só dele.** Vão para `snapshot` (json): aluno
(nome, RUT), empresa (razão social, RUT), curso (nome, nome técnico, carga horária), turma (datas,
modalidade, local), relator (nome, RUT), nota/presença, cidade e data de emissão, `template_version`
**e a cópia do `layout_config` daquela versão**. Reimpressão em 2028 sai idêntica mesmo se o aluno
trocar de empresa ou o template for editado ou soft-deletado. `codigo` e `uuid` são colunas, não
snapshot.

Dois campos precisam de regra explícita, senão a execução inventa:

- **cidade de emissão** — vem de `turma.local_aplicacao`; turma `online` não tem local, e aí cai
  para a cidade fixa que o `layout_config` do template declara. Não se deriva de endereço do cliente.
- **nota e presença** — `grades`/`attendance_pct` são opcionais (D2). Nulo entra nulo no snapshot, e
  o Blade **omite a linha** em vez de imprimir vazio ou zero. Certificado não afirma nota que
  ninguém registrou.

**D13 — o PDF sai pela app, como o `manual`.** `GET api/certificates/{certificate}/pdf` devolve o
binário regenerado do snapshot a cada chamada. Mantém o invariante do DER ("metadata armazenada, PDF
não") e evita um segundo lugar onde o documento legal existe e pode divergir do snapshot;
proporcional a ~10 usuários internos. **A divergência com o ADR-12 e com a 8.1.5 é declarada, não
escondida:** os dois pedem S3 + URL temporária. O ADR-12 recebe nota de realidade no fechamento —
ele também descreve `spatie/laravel-pdf`, que nenhum PDF do repositório usa.

**D14 — QR em SVG inline via `simplesoftwareio/simple-qrcode`.** SVG não depende de imagick/GD e o
Chromium do Gotenberg renderiza inline sem request externo. O conteúdo é
`<FRONTEND_URL>/validar/{uuid}` — a URL que o visitante abre, não a da API.

**D15 — revogação entra, é terminal e exige motivo.** `POST api/certificates/{certificate}/revoke`
sob a permissão `certification.certificate.revoke`, que já existe. Sem ela o valor `revocado` do enum
nasceria sem produtor e a tela pública prometeria um estado inalcançável. `revoked_at` e
`revocation_reason` são colunas — motivo que só existisse em prosa não seria auditado.

**D16 — zero permissão nova.** `certification.certificate.view|issue|revoke` já estão no
`PermissionCatalog`, e o escritor acadêmico reusa `operation.enrollment.manage`. O
`PermissionI18nParityTest` não se move.

**D17 — a matriz de domínios abre pela primeira vez, com uma justificativa por aresta.** O
`DomainDependencyTest` declara `'Certification' => []` de propósito, com docblock dizendo que o
domínio nasceria sob a regra e que cada import exigiria decisão explícita. Entram seis:
`Operation\Models\Enrollment` (o certificado é 1:0..1 da matrícula), `Operation\Models\Turma` (gate
de conclusão e origem do relator), `Operation\Enums\EnrollmentApprovalStatus` (gate acadêmico),
`Catalog\Models\Course` (FK e dados do snapshot), `Catalog\Models\CourseCertificateTemplate` (versão
e `layout_config` congelados), `Identity\Models\Redator` (relator escolhido). Mais o alias
`certificate` no `enforceMorphMap` — sem ele a auditoria grava o namespace da classe (ADR-10).

**D18 — a emissão mora em `/certificados`, não na tela da turma.** `TurmaDetailPage` é `operation`;
chamar a API de certificação de lá quebra a lei §5.6 (feature não importa feature). A página de
certificados lista o histórico com a `SearchableTableFrame` que já existe e abre o diálogo de
emissão pela toolbar — que é o que o Drive descreve de qualquer forma. O escritor acadêmico (D2) é de
`operation` e aparece na turma.

**D19 — o `SessionBootstrap` desce para dentro do router.** Hoje ele envolve o `AppRouter` inteiro em
`App.tsx`, então **todo** visitante espera um `GET /api/me` que vai dar 401 antes de ver qualquer
coisa. Numa página aberta pelo celular com o papel na mão, isso é spinner e request inútil. O boot
passa a envolver só o ramo protegido; `/validar/:uuid` renderiza sem sessão e sem redirect.

**D20 — assinatura de redator fica preparada, não construída.** Restrição explícita do João: as
assinaturas não serão indexadas ainda. O certificado imprime o **nome e o RUT** do relator no lugar
onde a assinatura entrará; nada de armazenamento, upload ou coluna de imagem (lição 3 — o que se
preserva é o ponto de extensão, não a feature).

**D21 — `spatie/laravel-pdf` não é removido neste bloco.** Ele é órfão medido, mas arrancar
dependência é decisão de infra fora deste corte. Vai para §Débitos técnicos do `backlog.md` com a
medição junto.

## §3 · Detalhe por camada

### Schema

```
certificates
  id, uuid (UK), enrollment_id (FK restrict, sem UK), course_id (FK),
  redator_id (FK restrict), codigo (UK), snapshot (json),
  valido_ate (date, nullable, default null), status enum('emitido','revocado') default 'emitido',
  revoked_at (timestamp, nullable), revocation_reason (string, nullable),
  timestamps
  UNIQUE (coluna gerada: status='emitido' ? enrollment_id : NULL)      -- D8

certificate_sequences
  id, year (UK, smallint), last_seq (unsignedInteger), timestamps       -- D9
```

Sem `deleted_at` (D7). FKs com `restrictOnDelete` — matrícula, curso e redator com certificado não
somem (padrão 6a/6b, peso legal).

### Backend — domínio `Certification` (pastas existem, vazias)

`Models/Certificate` (Auditable, `$auditInclude` explícito) · `Enums/CertificateStatus` ·
`Services/CertificateNumberService` (D9) · `Services/CertificateSnapshotBuilder` (D12) ·
`Services/CertificatePdfService` (D13/D14, espelha `ManualPdfService`) ·
`Actions/IssueCertificateAction` (D10/D11) · `Actions/RevokeCertificateAction` (D15) ·
`Data/CertificateData` e `Data/PublicCertificateData` (projeção mínima da rota pública) ·
`Http/Controllers/CertificateController` e `PublicCertificateController` · `routes.php`.

`resources/views/certification/certificate.blade.php` — lê **só** `$snapshot` e o `layout_config`
congelado, nunca models vivos.

### Frontend — `features/certification` (pastas existem, vazias)

`api/certificatesApi.ts` · `components/CertificatesPage.tsx` (`SearchableTableFrame`) ·
`components/CertificatesTable.tsx` · `components/IssueCertificateDialog.tsx` ·
`components/Validation/ValidationPage.tsx` (pública).

**Certificado não é recurso CRUD e não usa `createCrudResource` nem `useCrudForm`.** Não há `PUT`
nem `DELETE`: a superfície é listar, ver, emitir, baixar e revogar. Os hooks são explícitos, e o
diálogo de emissão é **seleção**, não formulário de entidade — escolhe turma, matrícula e (quando há
mais de um) relator, e dispara o `POST`. Forçá-lo no `MutableResource` traria create/update/remove
sem consumidor, que é o órfão parcial que a D3 do bloco de 2026-08-03 recusou.

Em `operation`, o ponto do resultado acadêmico na turma (D2). Em `app/router`, a rota pública e a
descida do `SessionBootstrap` (D19).

i18n: chaves novas nas **3** locales, em paridade (o `PermissionI18nParityTest` cobre permissão; a
paridade de chave comum é conferida no gate).

## §4 · Invariantes de comportamento

1. **Nenhuma rota existente muda de resposta.** O bloco só acrescenta; o único endpoint tocado fora
   de `Certification` é o `resultado` novo em `Operation`.
2. **`generated.ts` muda** (DTOs novos) e os consumidores entram no **mesmo commit** (lição 11).
3. **`PermissionI18nParityTest` continua verde** — zero permissão nova (D16).
4. **A rota pública responde sem cookie e sem CSRF**, e não vaza dado sensível: só o mínimo que a
   validação exige.
5. **Emissão e revogação gravam em `audits` com `user_id`** — o alias do morph map é pré-requisito,
   não detalhe (D17).
6. **Certificado revogado nunca volta a `emitido`** — revogação é terminal, como a conclusão de turma.
7. **O PDF não é materializado em lugar nenhum** — nem `/tmp`, nem bucket (D13).
8. **Matrícula sem certificado vigente continua podendo receber um**, inclusive depois de uma
   revogação (D8).

## §5 · Gate

**Item 0 — o critério de aceite do bloco, não higiene genérica.** O bloco jura que um papel
escaneado abre a validação certa. A prova é **e2e com sessão Sanctum** (lição 12 — `Origin` +
`Accept` + `X-XSRF-TOKEN`) e, na ponta pública, **sem cookie nenhum**:

marca `aprobado` numa matrícula real → emite → `codigo` bate a sequência do ano → `GET .../pdf`
devolve **200 `application/pdf`** com o QR legível → abrir `/api/publico/certificados/{uuid}` **sem
cookie** responde válido → revoga com motivo → a **mesma** URL passa a responder revogado → `uuid`
inexistente responde **404**.

Mecanismos vistos reprovando antes de valerem como prova (lição 10): as 4 portas do gate (D10), a
unicidade do certificado vigente contra **MySQL real** (D8/lição 15), a sequência sob duas sessões
concorrentes (D9), a terminalidade da revogação (D15).

**Automático:** suíte backend com o placar declarado e o caminho de cada delta; `pnpm test`;
`pnpm build` e `pnpm lint` verdes; Pint (`--test`) nos `.php` tocados, com guarda de lista vazia
(lição 9); `typescript:transform` rodado com os consumidores ajustados no mesmo commit; `locales/`
em paridade nas 3.

**Greps de lei:** zero `primereact` em `features/`, zero `@features/` em `shared/`, zero import
cross-feature, nenhum `abort(422)` novo, nenhum Repository. `DomainDependencyTest` verde **com as 6
arestas declaradas** — nenhuma a mais.

**Checkpoint visual do João** (não delegável): histórico, diálogo de emissão e página pública de
validação, nos dois temas.

## §6 · Fora de escopo

Emissão em **lote** · mapeamento do **Manual de Classe** (8.0.2) · filtros avançados no histórico ·
armazenamento de **assinatura** de redator (D20) · remoção do `spatie/laravel-pdf` órfão (D21) ·
Dashboard (8.4.x) e Meu Perfil (8.5.x) · reemissão automática após revogação (o admin emite de novo
pelo mesmo caminho, D8) · política de retenção de `audits`.
