# Design — `hardening-api-arquivos-e-abuso`

> Item 4 da fila (`docs/superpowers/backlog.md`), `lane-a`, main tree, branch
> `feat/hardening-api-arquivos-e-abuso`. Context Packet:
> [`context-packets/2026-08-24-hardening-api-arquivos-e-abuso.md`](../context-packets/2026-08-24-hardening-api-arquivos-e-abuso.md)
> (`status: ready`, quatro fontes recuperadas, nenhuma `unavailable`).
> Base de medição: `main@7fa1cb0a`.

## 1. Problema

A aplicação vai ser exposta publicamente e não tem contenção de abuso. A medição contra
`main@7fa1cb0a` — não a leitura do backlog — mostra o tamanho real do buraco:

**Taxa.** Existe **um único** throttle no repositório inteiro: `throttle:6,1` em
`backend/app/Domains/Identity/routes.php:28`, cobrindo convite e recuperação de senha.
`grep -rn "RateLimiter\|throttle" app/ bootstrap/ config/ routes/` não devolve outro. Ficam sem
limite: `POST /api/login` (`Identity/routes.php:23`, três linhas acima do grupo que tem throttle),
`GET /api/publico/certificados/{uuid}` (`Certification/routes.php:7`, sem middleware nenhum) e as
**61** rotas de escrita autenticadas (Identity 21, Commercial 18, Operation 14, Catalog 5,
Certification 3).

**Envelope do `429`.** `ThrottleRequestsException` estende `TooManyRequestsHttpException`, que
implementa `HttpExceptionInterface`, então já cai no braço genérico de
`ProblemDetails::fromException` (`app/Shared/Exceptions/ProblemDetails.php:32`) e sai como
`application/problem+json` — o ADR-03 está formalmente atendido. Mas o título é
`Erro na requisição`, e `ProblemDetails` **não chama `getHeaders()`** em lugar nenhum: o
`response()->json($payload, $status, ['Content-Type' => …])` monta os headers do zero, e o
`Retry-After`, o `X-RateLimit-Limit` e o `X-RateLimit-Remaining` que a exceção carrega são
descartados. O cliente recebe `429` sem saber quando pode voltar.

**Arquivo.** Dez endpoints recebem `UploadedFile`, com três políticas literais diferentes e quatro
sem tipo nenhum:

| Endpoint | Regra hoje |
|---|---|
| `POST profile/photo`, `POST users/{user}/photo`, `POST redatores/{redator}/photo`, `POST students/{student}/photo`, `POST clients/{client}/photo` | `file`, `mimes:jpg,jpeg,png,webp`, `max:5120` (`Identity/Services/UserPhotoService.php:29`) |
| `POST turmas/{turma}/documents` | `file`, `mimes:pdf`, `max:10240` |
| `POST turmas/{turma}/alunos/importar` | `file`, `mimes:xlsx,csv,txt`, `max:10240` |
| `POST profile/documents` | `file`, `max:10240` — **sem tipo** |
| `POST redatores/{redator}/documents` | `file`, `max:10240` — **sem tipo** |
| `POST quotes/{quote}/files` | `file`, `max:10240` — **sem tipo** |
| `POST budgets/{budget}/files` | `file`, `max:10240` — **sem tipo** |

E `UploadFileAction::metadataOf()` grava `'mime' => $file->getClientMimeType()` — o MIME que o
**cliente declara**, não o que o binário é. É esse valor que vai para `files.mime` e que o resto do
sistema lê depois, num repositório onde o arquivo tem peso legal.

**Custo.** `BatchIssueData::rules()` pede `enrollment_ids => ['required', 'array', 'min:1']`, **sem
teto**, e cada id vira um PDF pelo Gotenberg. `ImportStudentsAction` não limita linhas.
`CertificateController::pdf()` chama `CertificatePdfService::render()` a cada requisição — nada é
cacheado nem lido do S3, então a rota mais cara do sistema é repetível à vontade por quem tem
`certification.certificate.view`.

**Antivírus.** Nenhum scanner, nenhuma fila, nenhuma coluna de estado de scan.
`grep clam backend/composer.json` volta vazio.

**Proxy.** `grep -rn "trustProxies\|TrustProxies" bootstrap/app.php app/` volta **vazio**. Em
produção o Nginx está na frente do PHP-FPM, então `$request->ip()` devolve o endereço do container
do proxy para toda requisição.

## 2. O que a fonte canônica exige

O packet recuperou o texto do Drive e **corrigiu uma atribuição errada que o `backlog.md`
carrega**. A nota de proporção do item 4 fala da "sonda antimalware do `RNF-SEC-06`"; o Drive diz:

- **`RNF-SEC-06`** — *"Rate limit para login, troca de senha e ações sensíveis."* Só isso. Não
  menciona antimalware.
- **`RNF-SEC-08`** — *"Upload de arquivos com validação de tipo/tamanho e escaneamento antivírus
  (redatores operam de redes não auditadas)."*

O `RNF-SEC-08` exige o **resultado** — escaneamento — e **não nomeia** sonda, serviço, fornecedor,
protocolo nem topologia. Logo a renegociação que a nota do backlog imagina não é sobre *forma*:
forma nunca foi exigida. Dispensar o *resultado* seria renegociação formal, e o João decidiu **não**
renegociar (D1). A correção da linha do `backlog.md` fica para o `/fechar-sprint` deste bloco —
planejamento não edita a fila.

Notion `9.1.1` ("Rate limit em login/troca de senha", aceite "Tentativas excessivas bloqueadas") é
organizacional e mais estreito que o escopo; não restringe o bloco.

## 3. Decisões

| # | Decisão | Razão |
|---|---|---|
| **D1** | Antivírus é **ClamAV no compose, scan síncrono**, e o `RNF-SEC-08` não é renegociado. | O requisito pede resultado, e só o scan de fato sustenta a afirmação de cumprimento. Síncrono porque o projeto **não tem worker**: o bloco de runtime mediu `grep ShouldQueue` devolvendo uma única linha, que é comentário. Assíncrono exigiria subir fila e worker junto, e isso é outro bloco. |
| **D2** | **Teto global no grupo `api` + limitadores nomeados** nos alvos. | Rota nova nasce coberta. É o mesmo mecanismo que o `Turma::resolveRouteBinding()` usou para alcançar 20 rotas de uma vez. Só-nomeados deixaria o próximo endpoint descoberto — foi exatamente esse buraco que manteve `/login` de fora. |
| **D3** | Chave do login é **`email\|ip`**. | Padrão do Fortify. Só-IP trancaria os ~10 usuários da Lotus juntos atrás do mesmo NAT; só-email deixa varredura distribuída sair de graça e permite trancar de fora uma conta conhecida. |
| **D4** | Política de tipo/tamanho vira **peça única em `Shared/Files`**, com catraca. | Três políticas literais em sete controllers já produziram quatro endpoints sem tipo. Peça única com arch test faz upload novo nascer coberto. `FormRequest` foi recusado: o repositório **não tem nenhum** (`find app -path '*Http/Requests*'` volta vazio) e a regra continuaria copiada dez vezes. |
| **D5** | `files.mime` histórico é corrigido por **migration de backfill** relendo o objeto. | Precedente do projeto: a P-47 se pagou por migration sobre o dado velho, não por seeder. Sem backfill a coluna passaria a significar duas coisas conforme a data, e quem lê não teria como saber qual. |
| **D6** | PDF é contido por **limitador nomeado + teto no lote**; persistir o PDF no S3 **fica fora**. | Contenção não muda o que o documento significa. Persistir mudaria — revogação, reemissão e snapshot corrigido passariam a ter um artefato velho no bucket —, e isso é desenho de certificação, não de hardening. Sai como ficha `D-*` com gatilho. |
| **D7** | Os quatro endpoints abertos passam a aceitar **PDF + imagem** (`pdf`, `jpg`, `jpeg`, `png`, `webp`). | Cobre documento digitalizado e foto de documento, que é o que redator de rede não auditada manda, e fecha macro de Office e executável de uma vez. Office ficaria dependendo só do ClamAV como linha de defesa. |
| **D8** | Scanner fora do ar **recusa o upload** (fail closed). | É o único modo que sustenta o cumprimento do `RNF-SEC-08`. Fail open exigiria coluna de estado, tela do pendente e rotina de reconciliação — sem os três é uma flag que ninguém lê. Consequência aceita e declarada: daemon fora do ar derruba todo upload até voltar. |

## 4. Arquitetura

### 4.1 Limites de taxa

Uma peça em `backend/app/Shared/RateLimiting/` publica os limitadores nomeados e é registrada no
boot. Nenhuma política literal permanece em `routes.php` — quem lê a política lê **um** arquivo.

| Limitador | Onde | Chave |
|---|---|---|
| `api` | grupo `api` inteiro, teto largo | usuário autenticado; IP quando anônimo |
| `login` | `POST /api/login` | `email\|ip` (**D3**) |
| `public-certificate` | `GET /api/publico/certificados/{uuid}` | IP |
| `password` | grupo que hoje tem `throttle:6,1` | IP |
| `upload` | os 10 endpoints de arquivo | usuário |
| `import` | `POST turmas/{turma}/alunos/importar` | usuário |
| `certificate-batch` | `POST certificates/batch` | usuário |
| `certificate-pdf` | `GET certificates/{certificate}/pdf` | usuário |

Os contadores vão para a tabela `cache` do MySQL (`CACHE_STORE=database`, `.env.example:57`).
Redis fica fora — o `backlog.md` já registra no item 6 que ele não é requisito, e ~10 usuários não
o justificam.

**Números não entram nesta spec.** Limiar e janela de cada balde saem de medição e risco no plano,
que é o que o `backlog.md` determina.

**`trustProxies` é pré-requisito, não acessório.** Sem ele todo limitador por IP colapsa num balde
único e o primeiro a estourar tranca a aplicação inteira. Entra em `bootstrap/app.php` restrito à
topologia real (o Nginx do compose é o único salto), com teste provando que uma requisição com
`X-Forwarded-For` chega ao limitador com o IP do cliente e não com o do proxy.

### 4.2 `429` em Problem Details

`ProblemDetails::fromException` ganha duas mudanças:

1. **Braço próprio para `ThrottleRequestsException`** — `title` e `type` dedicados
   (`https://lotus.cl/errors/too-many-requests`) em vez do genérico `Erro na requisição`.
2. **Repasse de `getHeaders()`** para todo `HttpExceptionInterface`, devolvendo `Retry-After` e
   `X-RateLimit-*`.

O `Content-Type: application/problem+json` **vence** o merge — os headers da exceção não podem
sobrescrevê-lo. A ordem é o comportamento, então é teste, não comentário.

### 4.3 Política de arquivo

`backend/app/Shared/Files/` ganha um enum de **classe de conteúdo** que publica, por classe:
allowlist de extensão, allowlist de **MIME real** e teto de tamanho. Os dez endpoints pedem a
classe em vez de escrever a regra.

| Classe | Extensões | Teto | Endpoints |
|---|---|---|---|
| Imagem | `jpg`, `jpeg`, `png`, `webp` | o `5120` de hoje | os 5 `*/photo` |
| Documento | `pdf`, `jpg`, `jpeg`, `png`, `webp` (**D7**) | o `10240` de hoje | `profile/documents`, `redatores/{id}/documents`, `quotes/{id}/files`, `budgets/{id}/files` |
| Documento de turma | `pdf` | o `10240` de hoje | `turmas/{turma}/documents` |
| Planilha | `xlsx`, `csv`, `txt` | o `10240` de hoje | `turmas/{turma}/alunos/importar` |

A validação é de **duas camadas**: `mimes:` casa a extensão declarada e `mimetypes:` casa o que o
`finfo` lê do binário. Sozinho, nenhum dos dois fecha — `mimes:` aceita `.exe` renomeado se o
servidor adivinhar pela extensão, e `mimetypes:` sozinho deixa passar extensão mentirosa que o
sistema de arquivos vai honrar depois.

`UploadFileAction::metadataOf()` troca `getClientMimeType()` por `getMimeType()`. Os tetos de
tamanho **preservam os números de hoje**: mudá-los sem medição seria supor.

### 4.4 Escaneamento

Serviço `clamav` no `docker-compose.yml` e no `docker-compose.prod.yml`, no molde do `gotenberg`
— imagem externa, sem porta publicada, alcançável só pela rede do compose.

`backend/app/Shared/Files/` ganha um cliente fino falando **INSTREAM na 3310**. Cliente próprio, e
não pacote: não há nenhum no `composer.json`, e o protocolo cabe em um arquivo — mesma escolha de
proporção que o resto do projeto faz.

O scan roda em `UploadFileAction` **antes** do `putFile()`, então binário infectado nunca chega ao
bucket. Infectado recusa em `422` pelo handler global. Scanner indisponível **também recusa**
(D8), e a mensagem distingue os dois casos — quem recebe a recusa precisa saber se o arquivo está
infectado ou se o serviço caiu.

**Dois custos declarados na abertura, não descobertos no gate:**

- O daemon quer ~1 GB de RAM e **pressiona a decisão de tamanho da EC2 que o item 10 tem em
  aberto** (`t4g.small` × `t4g.medium`). Este bloco vira insumo daquela decisão; não a toma.
- A primeira subida baixa a base de assinaturas pelo `freshclam`, então a stack demora mais no
  primeiro `up`. Vale para dev e para produção.

### 4.5 Backfill de `files.mime`

Migration que relê cada objeto pelo path, mede o MIME real, corrige a linha divergente e registra
quantas mudaram. `down()` não desfaz — restaurar um valor que sabidamente mentia não é reversão
útil, e a migration declara isso por escrito.

### 4.6 Tetos de lote e import

`BatchIssueData::rules()` ganha `max:N` em `enrollment_ids`. `ImportStudentsAction` (ou o
`SpreadsheetRowReader`, onde a medição do plano mostrar que o teto morde antes de o trabalho
acontecer) ganha teto de linhas. Os dois `N` saem de medição no plano; recusa acima do teto é
`422`, com a mensagem dizendo o teto.

## 5. Catracas

Duas, no molde do `AuthenticatedRouteMiddlewareTest` que já existe e onde **silêncio reprova**:

1. Rota do grupo `api` que não esteja sob throttle reprova. A superfície isenta é **declarada por
   escrito** no teste — acrescentar rota sem limite exige escrever que ela é isenta.
2. Endpoint que recebe `UploadedFile` sem usar a peça de política reprova.

Cada catraca é **vista reprovar** antes de passar, com a sonda revertida — é o procedimento que o
projeto já aplicou no `ParentLockOnChildWriteTest` e na Regra C do `DomainDependencyTest`.

## 6. Fora de escopo

- **Persistir o PDF renderizado no S3** (D6) — sai como ficha `D-*` com gatilho, para o item 6 ou
  um bloco de certificação decidir com medição de custo real na mão.
- **Provisionamento AWS** — item 10. Este bloco só declara a pressão de memória do ClamAV.
- **Worker e fila** — o scan é síncrono justamente para não abrir essa frente (D1).
- **Retenção documental, PII e logs centralizados** — item 5.
- **N+1, índices e cache** — item 6.
- **Correção da linha do `backlog.md`** que atribui o antimalware ao `RNF-SEC-06` — vai no
  `/fechar-sprint`, porque planejamento não edita a fila.

## 7. Definition of Done

Provado contra a API real em `:8080` e o banco de dev, **não pela suíte**:

1. Login errado repetido devolve `429` `application/problem+json` com `Retry-After` legível; o
   mesmo email de outro IP continua entrando, e o mesmo IP com outro email também (D3).
2. Varredura da validação pública do QR é bloqueada, e o certificado válido segue abrindo — a rota
   tem peso legal e não pode ficar inacessível a quem tem o papel na mão.
3. EICAR recusado em `422`, com o bucket **sem objeto novo** — a prova é a ausência no MinIO, não a
   resposta HTTP.
4. `clamav` parado: upload recusa, com mensagem distinta da recusa por infecção (D8).
5. Executável renomeado para `.pdf` recusado pelo MIME real; PDF legítimo aceito nos quatro
   endpoints que hoje não têm tipo (D7).
6. Lote acima do teto recusa **antes** de o Gotenberg gerar qualquer PDF; import acima do teto
   idem.
7. Backfill medido: contagem de linhas de `files` com `mime` divergente antes e depois, e o valor
   novo conferido contra o objeto.
8. Fluxo normal inteiro sem esbarrar em limite: login, upload de documento de turma, import de
   planilha, emissão em lote no tamanho real, download de PDF.
9. As duas catracas vistas reprovando e revertidas, com a árvore limpa.

Gate: suíte backend pelo comando do `CLAUDE.md` §6, Pint nos arquivos tocados, e
`typescript:transform` — se algum DTO mudar, `generated.ts` regenera; se nenhum mudar, é **N/A por
escopo medido**, não por suposição.

## 8. Riscos

- **Falso positivo de throttle no uso normal.** Mitigado pelo DoD 8, que percorre o fluxo inteiro,
  e pelo teto global ser largo por desenho — quem aperta são os nomeados.
- **`trustProxies` mal escopado.** Confiar em qualquer proxy deixaria o cliente forjar o próprio IP
  pelo `X-Forwarded-For` e escapar do limitador. Por isso o escopo é a topologia real e a prova é
  teste.
- **ClamAV pressionando a EC2.** Declarado como insumo do item 10 (§4.4), não resolvido aqui.
- **Backfill sobre dado de peso legal.** A migration lê e corrige metadado, nunca o binário; a
  contagem antes/depois é evidência do DoD.

## 9. Emenda de 2026-08-25 — medição do plano

Três afirmações desta spec não sobreviveram à medição feita ao escrever o plano
(`plans/2026-08-25-hardening-api-arquivos-e-abuso.md`, seção "Correções de medição sobre a spec",
onde as tabelas estão). D1–D8 seguem valendo; o que muda é mecanismo.

- **§1 e §4.1, `trustProxies`: REVERTIDO.** O PHP recebe `REMOTE_ADDR` como o nginx viu o peer, e
  em produção o nginx é a borda — `$request->ip()` já é o cliente. Medido: com `trustProxies`
  ligado, um `X-Forwarded-For` forjado pelo cliente VIRA o `ip()`, e todo limitador por IP passa a
  ser contornável com um header. O bloco faz o oposto: o nginx apaga o `X-Forwarded-*` de entrada e
  a aplicação segue sem proxy confiável. Se um balanceador L7 entrar na frente (item 10), a decisão
  reabre — com o `real_ip_module` do nginx, não com `trustProxies` cru.
- **§4.3, "validação de duas camadas": IMPRECISO.** `mimes:` no Laravel compara
  `guessExtension()`, que deriva do conteúdo. As duas regras deram veredicto idêntico em todos os
  casos medidos. `mimetypes:` fica por prender a string exata do MIME contra alargamento futuro do
  mapa do Symfony, não por ser uma segunda camada.
- **§1 e §7.6, "cada id vira um PDF pelo Gotenberg": FALSO.** `IssueCertificateAction` não toca o
  conversor; `CertificatePdfService` tem um único consumidor, a rota
  `GET certificates/{certificate}/pdf`. O custo do lote é `N` transações de emissão. O teto
  permanece; o DoD 6 passa a medir o que existe.

Achado que a spec não tinha: `POST /api/redatores` e `PUT /api/redatores/{redator}` aceitam
`documents[<TIPO>]` **sem regra `file` nenhuma**. A superfície de upload são 13 rotas, não 10.
