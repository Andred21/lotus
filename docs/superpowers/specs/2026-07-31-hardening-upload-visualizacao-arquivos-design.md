# Design — Hardening · Upload e visualização de arquivos

- **Work item:** `hardening-upload-visualizacao-arquivos`
- **Feature:** `hardening`
- **Data:** 2026-07-31
- **Context packet:** `docs/superpowers/context-packets/hardening-upload-visualizacao-arquivos.md`
  (`status: partial`)
- **Fontes:** os 4 prints anexados pelo João em 2026-07-31 (`PRINTS` do packet —
  `erro-document-pressuposta-console`, `erro-document-pressuposta-ui`,
  `pressuposto-no-visualization-docs`, `teste-image-document-pressuposto`); código em `baa100e`;
  `backlog.md` item 1 de "Próximos blocos". Drive e Figma não têm os artefatos (`GDRIVE` `results: []`,
  `FIGMA` unavailable) e o Notion não tem task 1:1 — nenhum dos três é bloqueante, porque a fonte de
  prioridade máxima (instrução direta do João) supriu os fatos.

## 1. Problema

Dois problemas independentes, ligados pela mesma tabela `files`.

**(a) O upload falha e mente sobre o motivo.** O console do print registra, verbatim:

```
Access to XMLHttpRequest at 'http://localhost:8000/api/quotes/1/files' from origin
'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is
present on the requested resource.
Failed to load resource: net::ERR_FAILED
```

Não é CORS em nenhum ponto. `docker/nginx/default.conf` não declara `client_max_body_size`, então
vale o default do nginx: **1 MB**. Arquivo maior é cortado pelo nginx com **413**, e a página de erro
do nginx **não passa pelo Laravel** — logo não carrega `Access-Control-Allow-Origin`, que
`config/cors.php` só aplica ao que a app responde. O navegador vê resposta sem o header e reporta
CORS; o axios cai no ramo `!error.response` (`frontend/src/shared/api/axios.ts:47`) e a tela mostra
`common.networkErrorHint` — "Revisa tu conexión e inténtalo de nuevo.", exatamente o print da UI. O
`.docx` de 17 KB do mesmo card subiu; a imagem de teste, não.

As quatro camadas discordam entre si:

| Camada | Limite hoje | Onde |
|---|---|---|
| nginx | 1 MB (default implícito) | `docker/nginx/default.conf` |
| PHP | `upload_max_filesize=2M`, `post_max_size=8M` | container `app`, sem `.ini` próprio |
| Laravel | `max:10240` (10 MB) | 5 controllers de upload |
| Frontend | nenhum | `shared/ui/AppFileUpload/AppFileUpload.tsx` |

O teto real é o menor deles — 1 MB —, e nenhuma das outras três camadas sabe disso.

**(b) Documento não se visualiza, e cada tela o mostra de um jeito.** No print do orçamento, a linha
do documento tem só baixar e excluir. Não existe ação de ver em nenhum dos quatro consumidores de
`files`, e os contratos divergem:

| Consumidor | DTO | `download_url` | `mime` | `size` | `created_at` | Renderização |
|---|---|---|---|---|---|---|
| Orçamento / Cotação | `FileData` | sim | sim | sim | sim | `commercial/components/Budget/FileList.tsx` |
| Turma | `TurmaDocumentData` | **não** | **não** | sim | sim | `operation/components/Document/DocumentTypeCard.tsx` |
| Redator | `RedatorDocumentData` | sim | **não** | **não** | **não** | inline em `identity/components/Redator/RedatorDialog.tsx` |

A turma não consegue nem baixar o próprio documento. A lógica de ícone por tipo e a formatação de
tamanho existem em três cópias divergentes.

## 2. Escopo

**Dentro:** alinhamento dos limites de upload nas quatro camadas; núcleo comum nos três DTOs de
arquivo; linha de arquivo e diálogo de pré-visualização compartilhados em `shared/ui`, adotados pelas
três telas; falha por tamanho visível e específica; o import de planilha de matrículas herda o mesmo
alinhamento e ganha o mesmo gate de cliente.

**Fora:** autorização e RBAC dos endpoints de arquivo; política de retenção documental (P-02); o
débito do arquivo órfão no MinIO em rollback de transação (backlog, pré-existente); código próprio de
turma (P-13); qualquer mudança no modelo de armazenamento ou no uso de URL pré-assinada (ADR-11).

Nenhuma lei do `CLAUDE.md` §5 é tocada.

## 3. Decisões

- **D1 — O teto lógico é 10 MB, e as outras camadas sobem até ele.** Os 5 controllers já declaram
  `max:10240` e concordam entre si; mudá-los seria alterar regra sem pedido. As camadas de transporte
  é que estão abaixo.
- **D2 — Toda camada de transporte ganha folga sobre o teto lógico: nginx `12m`, PHP
  `upload_max_filesize=12M` e `post_max_size=12M`.** O envelope multipart soma boundary, nome de campo
  e headers ao byte count do arquivo. Teto de transporte igual ao teto lógico rejeitaria um arquivo de
  exatos 10 MB no nginx — de novo com 413 sem CORS, de novo opaco. A folga vale também para o
  `upload_max_filesize`: em 10M, um arquivo de 11 MB estouraria o limite do PHP, e o Laravel devolveria
  422 com "o arquivo falhou ao subir" em vez da mensagem de tamanho — status certo, motivo errado.
  Com 12M nas duas diretivas, **quem rejeita é sempre a regra `max:10240`**, que responde RFC 7807 com
  header CORS, mensagem localizada e o limite correto.
- **D3 — Os limites de PHP entram em arquivo versionado (`docker/php/uploads.ini`), copiado no
  `Dockerfile`.** Limite com peso operacional não vive em variável de ambiente de máquina nem em
  ajuste manual dentro do container. Consequência: o bloco exige `docker compose build app`, não só
  `up -d`.
- **D4 — O gate de cliente é uma checagem explícita no wrapper, não o `maxFileSize` do PrimeReact
  sozinho.** `AppFileUpload` fixa `mode="basic"`, e no modo básico a área de mensagens do Prime não é
  renderizada: a validação dele rejeitaria o arquivo em silêncio. O wrapper compara `file.size` antes
  de chamar o `uploadHandler` do consumidor e reporta a rejeição pelo canal de erro do app, com o
  limite e o tamanho real no texto.
- **D5 — `FileData` é o molde do núcleo comum; os outros dois DTOs sobem até ele.** `TurmaDocumentData`
  ganha `mime` e `download_url`; `RedatorDocumentData` ganha `mime`, `size` e `created_at`. Campos de
  domínio ficam onde estão — `valid_until` continua só no redator, porque é dado de idoneidade, e o
  `type` de cada consumidor continua com o vocabulário do seu domínio.
- **D6 — Os três DTOs continuam existindo.** Colapsar tudo em `FileData` obrigaria `valid_until` a
  virar campo nulo em três dos quatro consumidores — mudança com peso legal feita por conveniência de
  forma.
- **D7 — Renderizável se decide por `mime`, não por extensão do nome.** `files.mime` é `nullable`, então
  extensão é fallback apenas quando `mime` vier `null`. Nome de arquivo é dado do usuário; `mime` é o
  que o upload declarou e o que ficou gravado.
- **D8 — Compartilhar a linha e o viewer, não a lista inteira.** As três telas não são a mesma lista:
  a turma é checklist por tipo de documento, o redator é slot por tipo com upload em stage, o
  comercial é lista plana. Um `AppFileList` que absorvesse as três viraria configurável demais, que é
  o oposto de compartilhado. Vão para `shared/ui` a **linha** (`AppFileRow`) e o **diálogo de
  pré-visualização** (`AppFilePreviewDialog`); a estrutura de cada tela permanece.
- **D9 — Tipo sem pré-visualização mostra fallback explícito, não esconde a ação.** `.docx` e `.xlsx`
  abrem o diálogo com ícone, nome, tamanho e o botão de baixar, mais o texto de que o formato não tem
  pré-visualização. Ação que some conforme o tipo do arquivo é falha escondida — o mesmo erro que a
  Parte 4 do bloco visual corrigiu no `useCrudPage`.
- **D10 — O ramo `!error.response` do interceptor não muda.** Ele significa "não houve resposta", e
  depois de D1–D3 isso volta a ser verdade. Fazê-lo sugerir tamanho de arquivo faria o app afirmar uma
  causa que não observou: se a rede cair de verdade, a mensagem mente.
- **D11 — O import de planilha de matrículas entra no bloco.** `EnrollmentController:61` já declara
  `max:10240`, e o upload atravessa o mesmo nginx e o mesmo PHP — herda o teto de 1 MB e falha com a
  mesma mensagem enganosa. Incluir custa conferir o endpoint e ligar o gate de cliente no
  `ImportDialog`.

## 4. Fatos verificados durante o design

Registrados para que não sejam reinvestigados nem tratados como escopo:

- **O nome técnico na tela não é bug.** Linha 22 de `files`: `original_name` =
  `ebdadecc-152f-407d-a8bf-082804d47a55.docx`, `path` = `quote/1/ptPXsh4telb6prdBdZkmngyvxES60aYC6jHdPpXx.docx`.
  São valores diferentes — a UI exibe o `original_name` correto; o arquivo de teste é que tinha esse
  nome. Fecha a segunda open question do packet.
- **A divergência de porta do packet está resolvida.** `frontend/.env` tem
  `VITE_API_URL=http://localhost:8080` e a linha do recurso falho no print também é `:8080`. O `8000`
  citado na mensagem do console é de tentativa anterior, não do fluxo atual.
- **Os 5 endpoints de upload já concordam em `max:10240`:** `QuoteFileController:23`,
  `BudgetFileController:23`, `TurmaDocumentController:44` (com `mimes:pdf`),
  `RedatorDocumentController:22`, `EnrollmentController:61` (com `mimes:xlsx,csv,txt`).

## 5. Mudanças por camada

**Infra**
- `docker/nginx/default.conf`: `client_max_body_size 12m` no bloco `server`.
- `docker/php/uploads.ini` (novo): `upload_max_filesize=12M`, `post_max_size=12M`.
- `docker/php/Dockerfile`: `COPY` do `.ini` para `/usr/local/etc/php/conf.d/`, antes do `USER appuser`.

**Backend**
- `TurmaDocumentData`: `+mime`, `+download_url` (a URL sai do `UploadFileAction::temporaryUrl`, como
  nos outros dois).
- `RedatorDocumentData`: `+mime`, `+size`, `+created_at`.
- `php artisan typescript:transform` regenera `generated.ts` (ADR-04 — não se edita à mão).
- Nenhum controller muda de limite.

**Frontend**
- `shared/ui/AppFileRow/` (novo): ícone por `mime` com fallback por extensão, nome, tamanho, data e
  slot `actions`.
- `shared/ui/AppFilePreviewDialog/` (novo): `image/*` em `<img>`, `application/pdf` em `<iframe>`,
  demais tipos no fallback de D9.
- `shared/ui/AppFileUpload`: gate de tamanho de D4, com o limite como constante compartilhada.
- `commercial/.../FileList.tsx`, `operation/.../DocumentTypeCard.tsx`,
  `identity/.../RedatorDialog.tsx`: passam a usar `AppFileRow` e ganham a ação de visualizar. A turma
  ganha download, que hoje não tem.
- `operation/.../ImportDialog.tsx`: gate de tamanho (D11).
- Chaves de i18n novas nos 3 locales, com `es-CL` como referência de rótulo.

## 6. Definition of done

Comportamento provado, não pacote instalado:

1. `curl -F` atravessando o nginx em `:8080`, autenticado: arquivo de 5 MB retorna **201**; arquivo de
   11 MB retorna **422 `application/problem+json`** cujo `detail` cita o limite de tamanho — não 413
   HTML, não resposta sem `Access-Control-Allow-Origin` e não o 422 genérico de falha de upload (D2).
2. Teste de feature afirmando 422 acima de 10 MB nos endpoints de upload.
3. `GET` de turma e de redator devolvem `mime` e `download_url` (turma) e `mime`/`size`/`created_at`
   (redator) contra a API real.
4. Prova visual do João na tela: pré-visualização de imagem, pré-visualização de PDF, fallback de
   `.docx`, e o upload de 3 MB — que hoje falha — passando nos quatro consumidores.
5. Rejeição no cliente de arquivo acima de 10 MB, com o limite e o tamanho real na mensagem, sem
   requisição disparada.
6. `docker compose exec -T app php artisan test` verde · `pnpm build` · `pnpm lint`.

Os itens 1 e 4 exigem `docker compose build app` antes (D3).

## 7. Riscos

- **`temporaryUrl` do MinIO em `<iframe>`/`<img>`.** As tags não fazem requisição CORS, então a URL
  pré-assinada deve renderizar direto; se o MinIO devolver `Content-Disposition: attachment` para
  algum objeto, o PDF baixa em vez de renderizar. A checagem é o item 4 do DoD — se acontecer, é
  decisão nova e volta ao João, não se resolve inventando header no bucket.
- **`mime` vem do cliente.** `UploadFileAction` grava `getClientMimeType()`, que o navegador declara.
  Não é fonte confiável para segurança; aqui serve só para escolher a renderização, e o fallback de
  D9 cobre o valor errado ou ausente.
