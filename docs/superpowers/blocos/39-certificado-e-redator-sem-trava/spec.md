# Bloco 39 — Certificado e designação de redator sem trava em produção

> Spec aprovada pelo João em 2026-10-17. Ficha: `docs/superpowers/backlog.md` §39. Context Packet:
> `context.md` nesta pasta (`status: partial` — Drive e Notion indisponíveis na sessão). Todas as
> decisões abaixo são do João nesta sessão, salvo as marcadas **(Claude)**, que ele pode vetar ao ler.

## 1. Intenção

Produção não pode travar em duas portas que hoje recusam trabalho legítimo:

1. **Emissão de certificado.** Nenhum curso em produção tem linha em `course_certificate_templates`
   (o CRUD existe só na API, sem tela), e a porta 4 recusa toda turma com `sin_plantilla`. A
   aceitação do bloco 13 parou nisso, no smoke do runbook `deploy/aws/README.md` §15, passo 3.
   Todo curso passa a emitir pelo Blade padrão, sem cadastro prévio, e o curso ganha um preview do
   seu certificado.
2. **Designação de redator (RN-09).** A idoneidade deixa de travar a designação redator→turma e vira
   aviso: a tela mostra o motivo, pede confirmação e deixa seguir; a auditoria registra o motivo.

Certificado tem peso legal: **nada nesta mudança altera um certificado já emitido**, e isso é provado
por teste (§5, D5).

O bloco 13 não é tocado. Ele segue `blocked` aguardando aceitação (itens 2, 5 e 6) e volta depois do
merge deste.

## 2. Estado de partida (medido no código, `main@0740843a`)

- A emissão recusa em três portas, na ordem: sem template → `sin_plantilla`; sem cidade →
  `plantilla_sin_ciudad`; sem redator → `sin_redactor`. O painel (`EmissionPanelQuery`) e a emissão
  (`CertificateEligibility`, 422) usam as mesmas portas.
- O template entrega só três coisas à emissão: `layout_config['city']` (a única chave lida), usada
  só pela turma online, porque a presencial usa `turmas.local_aplicacao`; `validity_months`, que
  vira `valido_ate`; e `version`, congelada no snapshot. O Blade (`certification/certificate.blade.php`)
  não lê nada do template.
- O snapshot congela tudo o que o documento mostra. Nenhum leitor de certificado emitido (PDF,
  `show`, validação pública) relê `course_certificate_templates`. O Blade é relido a cada PDF, e
  isso já é assim hoje.
- A RN-09 (`RedatorIdoneidadeService::assertEligible`: habilitação ao curso em `course_redator` E
  REUF não vencido; spec 6b D3, decisão do João em 2026-07-21) tem **um único chamador**:
  `DesignateRedatorAction`. A habilitação redator↔curso (`CourseRedatorController`) **nunca travou**.
- O front espelha a RN-09 em `features/operation/lib/eligibility.ts` e **filtra o picker**
  (`useRedatorPicker`), então o redator inidôneo nem aparece para ser escolhido.

## 3. Decisões

| # | Tema | Decisão |
|---|---|---|
| D1 | Templates por curso | **Saem da emissão.** A porta 4 sai; a emissão não lê mais `course_certificate_templates`. A tabela, os dados, o model `CourseCertificateTemplate`, a relação `Course::certificateTemplates`, a cascata de arquivar/restaurar (`archived_with_parent`) e o alias `course_certificate_template` do morph map **ficam** (dado e trilha de auditoria). O CRUD da API sai (§4.2). Nenhuma migration. |
| D2 | Cidade de emissão | Presencial: `turmas.local_aplicacao`, como hoje. Online: `config('app.certificate_issuer.city')`, chave nova ao lado de `name`/`rut`, env `CERTIFICATE_ISSUER_CITY`, default `Santiago`. Produção herda o default, sem mudar o `.env`. A porta 5 fica como defesa (online com a config vazia) e o motivo é renomeado: `plantilla_sin_ciudad` vira `sin_ciudad`. |
| D3 | Vigência | **Sempre nula** (`valido_ate = null`, vigência indeterminada, RN-CER-01). Divergência registrada: nos certificados da v1 a vigência é sempre `Fecha Curso + 23 meses` (ficha 38). O João decidiu manter nula. Vigência por curso ou global, se a Lotus pedir, é bloco próprio. |
| D4 | Snapshot dos novos | Os certificados emitidos depois do bloco gravam `template: {version: null, city: null}`. `SnapshotTemplateData` (os dois campos já são nuláveis) e o `schema_version` do snapshot **não mudam**. A cidade impressa vem de `ciudad_emision`, congelada no ato, como hoje. |
| D5 | Certificado já emitido | Intocado no dado e na leitura. Prova: §5, critérios 2 e 3. |
| D6 | Preview | PDF pelo mesmo pipeline Blade→Gotenberg, aberto inline em nova aba pelo menu da linha do curso. Os dados do curso são reais (nome, nome técnico, horas, descrição, módulos). Aluno, turma, cliente e redator são fictícios; a cidade é a do emissor; o código é `MUESTRA`; o QR codifica o texto "MUESTRA — SIN VALIDEZ", não uma URL; e o PDF leva a marca d'água "MUESTRA — SIN VALIDEZ". Nada é gravado, nada é auditado, nenhum número da sequência é consumido. |
| D7 | Alcance da RN-09 | Vale só para a designação redator→turma, porque é o único lugar que trava. As duas causas viram aviso: `not_qualified` (não habilitado ao curso) e `reuf_invalid` (REUF ausente ou vencido). Os critérios não mudam. O que continua travando é estrutural e não é RN-09: turma concluída (`assertAcademicallyWritable`) e redator arquivado (`Redator::lockForWrite`). |
| D8 | Aviso na tela | O picker lista todos os redatores não designados. O inidôneo vem com uma `AppTag` de aviso por motivo. Designar um inidôneo abre o `ConfirmDialog` ("¿Designar de todos modos?") com os motivos; cancelar não designa. O idôneo designa direto. |
| D9 | Rastro | O backend aceita sempre e grava, **na mesma linha de audit da designação** (`PivotAudit`, `auditable_type` turma), os motivos daquele instante, em `new_values.inidoneidade = {<redator_id>: [<motivos>]}`. Designação idônea: a linha de audit sai idêntica à de hoje. Designação repetida (no-op) não grava, como hoje. |
| D10 | Registro da regra | `ruling-rn09.md` nesta pasta, com a regra anterior, a decisão do João (2026-10-17), o rastro e a pendência no Drive. O Drive vence sobre os `/docs`: até o João refletir a mudança lá, o Drive descreve uma trava que o código não aplica (Verificação externa, item 1). |
| D11 | `efeito_externo` | `sim`, com dois itens sem prova HTTP declarável (§7). |
| D12 | Permissão do preview | `certification.certificate.view`, que já existe. Nenhuma permissão nova, então a contagem do RBAC (41) e o `conferir-golive.sh` não mudam. **(Claude)** |

## 4. Desenho

### 4.1 Certification (backend)

- **Portas.** `CertificateEligibility` e `EmissionPanelQuery` perdem a porta 4 (`assertTemplateDisponivel`
  e o ramo `SinPlantilla`). `EmissionBlockReason` fica com dois casos: `SinCiudad = 'sin_ciudad'` e
  `SinRedactor = 'sin_redactor'`. A mensagem 422 da porta 5 continua saindo de `lang/`.
- **Cidade.** `CertificateTemplateResolver` é renomeado para `EmissionCityResolver`, sem
  `latestByCourse`: `local_aplicacao` quando não é nula, senão a cidade do emissor na config. Os
  consumidores atuais (`IssuanceContext`,
  `CertificateSnapshotBuilder`, `EmissionPanelQuery`, `CertificateEligibility`) passam a não
  carregar template nenhum.
- **Vigência.** `IssueCertificateAction` grava `valido_ate = null`. `EmissionPanelTurmaData` perde
  `template_validity_months`.
- **Snapshot.** `CertificateSnapshotBuilder` grava `template: {version: null, city: null}` (D4).
- **Preview.**
  - A rota é `GET /api/courses/{course}/certificate-preview`, em `Certification/routes.php`, dentro
    de `auth.active`, com `permission:certification.certificate.view` e `throttle:certificate-pdf`.
  - Um `Certificate` é montado em memória, nunca salvo, com snapshot sintético (D6), e passa por
    `assertPresentable`.
  - O `CertificatePdfService` ganha a entrada de amostra. O Blade recebe `$muestra` (bool, default
    `false`) e só desenha a marca d'água quando ele é `true`. Nenhum outro elemento do Blade muda.
  - O curso arquivado não tem preview: o binding padrão já não o enxerga.

### 4.2 Catalog (backend)

- **Sai:**
  - as rotas `POST courses/{course}/templates`, `PUT templates/{template}` e `DELETE templates/{template}`;
  - o `CourseTemplateController`, a `CreateCertificateTemplateAction` e o `CertificateTemplateData`;
  - o `CourseData::$templates` (entrada e saída), o sync de templates no `UpdateCourseAction` e o
    `certificateTemplates` do eager-load `CourseQueryBuilder::LISTING`.
- **Fica:** tudo o que D1 lista. `CourseQueryBuilder::CASCADED` continua com `certificateTemplates`
  (arquivar e restaurar o curso continuam cascateando).

### 4.3 Operation (backend)

- `RedatorIdoneidadeService`: `assertEligible` sai; entra `motivos(Redator, Course): list<MotivoInidoneidade>`.
  `isEligible` passa a ser `motivos() === []`. O enum novo `Operation\Enums\MotivoInidoneidade` é
  backed, com `#[TypeScript]` e os casos `not_qualified` e `reuf_invalid`. O docblock do serviço
  cita o `ruling-rn09.md`.
- `DesignateRedatorAction`: mantém a ordem estado → lock → (motivos) → escrita, sem lançar exceção
  por idoneidade, e passa os motivos ao `PivotAudit` quando houver.
- `PivotAudit::syncWithoutDetaching` ganha um parâmetro opcional `array $contexto = []`, mesclado no
  `new_values` da mesma linha, dentro da mesma transação. Com `[]` o comportamento é byte a byte o
  de hoje. `sync` e `detach` não mudam.
- **Saem:** a `RedatorNaoElegivelException` e as chaves `operation.redator.not_qualified` e
  `operation.redator.reuf_invalid` dos três locales.
- O comentário de `RedatorDocumentType.php:19`, que cita o `temReufValido` privado, é corrigido.

### 4.4 Frontend

- **Emissão.** `EmissionPanel` e `ReissueDialog` consomem a união nova do `generated.ts`. A chave
  `certificate.blocked.sin_plantilla` sai dos três locales e `plantilla_sin_ciudad` vira `sin_ciudad`.
- **Preview.** `CourseRowActions` (Catalog) ganha a ação "Ver certificado de muestra", visível com
  `can('certification.certificate.view')`. O hook novo em `features/catalog/api/` chama a rota
  pelo `useBlobTabOpener` de `shared/hooks`. Nenhum import de `features/certification` (lei 6).
- **Picker.**
  - `eligibility.ts` ganha `motivosInidoneidade(redator, courseId): MotivoInidoneidade[]`, com o
    tipo do `generated.ts`; `isEligible` deriva dele.
  - `useRedatorPicker` lista todos os não designados com seus motivos e guarda o estado da
    confirmação.
  - `RedatorDesignation` renderiza as tags e o `ConfirmDialog` de `shared/ui`.
  - Os componentes seguem declarativos e abaixo de 150 linhas. Se passarem, o bloco de opções vira
    um componente irmão.
- **Textos** novos nos três locales, com chaves idênticas e o `es-CL` como referência.
- `generated.ts` regenerado no container, nunca editado à mão (lei 3).

### 4.5 Docs

- `docs/der-fisico.md`: `course_certificate_templates` marcada como legado, sem leitura nem escrita
  desde o bloco 39 e mantida por rastro.
- `docs/adrs.md`: emenda datada nos dois trechos que tratam o template como config versionada do
  curso e como consumidor do MAX+1 (hoje `:333` e `:580`).
- `ruling-rn09.md` nesta pasta (D10).

## 5. Critérios de aceite (provados por teste)

1. Um curso **sem template** emite certificado. Online: `ciudad_emision = Santiago`. Presencial:
   `ciudad_emision = local_aplicacao`. Nos dois, `valido_ate` nulo e `template = {version: null, city: null}`.
   O painel não mostra `sin_plantilla` para turma nenhuma.
2. **Emitido não muda.** Um certificado emitido com template (cidade e vigência do template, versão
   N) é relido depois da mudança, e o snapshot, o `valido_ate`, o `codigo` e o HTML do PDF saem
   idênticos ao capturado antes. A cadeia viva difere do valor congelado em todo campo asserido
   (rule `backend-ddd.md`, guarda de snapshot).
3. Nenhum leitor de certificado emitido toca `course_certificate_templates`: com a tabela esvaziada
   (incluindo os arquivados), o PDF, o `show` e a rota pública do QR respondem igual.
4. O preview devolve PDF com a marca MUESTRA, e as contagens de `certificates`, `audits` e
   `certificate_sequences` não mudam. Sem a permissão, a rota responde 403. O PDF de um certificado
   real nunca carrega a marca.
5. Designar um redator inidôneo responde 2xx e grava o vínculo. A linha de audit traz
   `inidoneidade` com **o motivo nomeado**: um caso por motivo e um com os dois. Para o redator
   idôneo, a linha de audit não tem a chave `inidoneidade`. Turma concluída e redator arquivado
   continuam recusando, e a turma concluída recusa antes de avaliar a idoneidade.
6. As rotas antigas de template respondem 404. Arquivar e restaurar um curso com template continua
   cascateando o template.
7. Frontend: `motivosInidoneidade` cobre sem REUF, REUF vencido, não habilitado, os dois e idôneo.
   `RedatorDesignation`: o inidôneo aparece com a tag; designá-lo abre a confirmação; cancelar não
   chama a mutação; confirmar chama; o idôneo não passa pelo `ConfirmDialog`. `CourseRowActions`:
   a ação de preview aparece só com a permissão.
8. Gate: a suíte backend inteira verde no container; `pnpm build`, `pnpm lint` e `pnpm test` verdes.

**Smoke manual no stack da lane (offset +1), antes do `/revisar-bloco`:** emitir pela UI um
certificado de curso novo, sem template, em turma online e em presencial; abrir o preview pelo
menu do curso; designar um redator sem REUF, passando pela confirmação.

## 6. Fronteira com a lane 38 (`seeder-carga-inicial-producao`)

A 38 está viva em paralelo e carrega o histórico 2026 em produção depois da aceitação do 13, que
espera este bloco. A ordem esperada é 39 → aceitação do 13 → 38, então **a 38 rebaseia sobre a 39**.
Para isso não virar conflito:

- O 39 **não toca** `backend/database/seeders/**`, nenhum comando de carga nem a pasta
  `docs/superpowers/blocos/38-*`.
- **Contratos que a 38 consome e que o 39 mantém estáveis:**
  - `SnapshotTemplateData`: mesma forma, mesma nulabilidade;
  - o `schema_version` do snapshot;
  - `PivotAudit::sync`, `syncWithoutDetaching` e `detach`: as chamadas de hoje continuam válidas,
    e o parâmetro novo é opcional;
  - a numeração do `IssueCertificateAction` e o `certificate_sequences`;
  - `config('app.certificate_issuer')`: `name` e `rut` intactos, só ganha `city`;
  - a saída do Blade para certificado real.
- O 39 não grava template em lugar nenhum, e a 38 já declara curso "sem template".
- **Arquivos que as duas podem tocar:** `docs/der-fisico.md`, `docs/adrs.md`, `backend/config/app.php`,
  `backend/lang/*/operation.php` e `docs/superpowers/historico/progress.md`. As edições do 39 nesses
  arquivos são pontuais e localizadas. Quando os dois planos existirem, `lane.sh conferir` mede a
  interseção das listas `Files:`. Se ela não sair vazia, a sequência é decisão do João.
- O helper de teste `tests/Support/CreatesCertificateTemplates.php` sai com o 39, porque todos os
  consumidores dele são arquivos que o 39 toca. A 38 não o usa (curso sem template).

## 7. Verificação externa

1. O Drive (requisitos, `Viagem Chile/Projetos/Lotus.cl/V2`) descreve a RN-09 como aviso que não
   trava a designação, conforme `ruling-rn09.md`. Ação do João.
   - prova: nenhuma
2. O merge do 39 chega a produção pelo espelho corporativo e pela promoção pelo botão (ações do
   João). Em produção, um curso sem template emite certificado, e o QR desse certificado valida. É o
   mesmo smoke do runbook `deploy/aws/README.md` §15, passo 3, que a aceitação do 13 refaz (o
   `uuid` só existe depois da emissão).
   - prova: nenhuma

## 8. Não-objetivos

- Editor visual de template; UI de CRUD de template; vigência por curso.
- Mudar o layout do certificado (`P-28` segue com a Lotus); assinatura PNG.
- Unificar `shared/lib/redatorStatus.ts` (a idoneidade provisória do `RedatorCard`) com
  `eligibility.ts`: fica em Deferred.
- Reintroduzir checagem de idoneidade na emissão. A porta 6 exige só um redator designado.
- Bloco 13, carga histórica (bloco 38), escrita em produção.

**Anti-objetivos (falha mesmo que "funcione"):** qualquer migration que apague ou altere linha de
`course_certificate_templates` ou de `certificates`; um certificado emitido cujo snapshot,
`valido_ate` ou PDF mude; um preview sem a marca MUESTRA, ou que grave ou consuma número;
`generated.ts` editado à mão; PrimeReact importado fora de `shared/ui`.

## 9. Deferred

- Unificar as duas definições de idoneidade no front (`redatorStatus.ts` × `eligibility.ts`).
- Vigência configurável (global ou por curso), se a Lotus pedir.
- Remover a tabela `course_certificate_templates` por migration, se um dia o rastro deixar de importar.
