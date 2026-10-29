# Bloco 40 — Certificado: assinaturas, layout e validade

> Spec aprovada pelo João (2026-10-29). Ficha: `docs/superpowers/backlog.md` §40, ampliada pelo
> João nesta sessão (assinatura do redator e da gerente). Context Packet: `context.md` nesta pasta
> (`status: partial`: Drive e Notion indisponíveis na sessão). As decisões abaixo são do João,
> salvo as marcadas **(Claude)**, que ele pode vetar ao ler. O layout foi decidido em cima de PDFs
> renderizados pelo Gotenberg da lane (protótipo descartável). A versão aprovada é a v5, e as
> páginas dela estão em `referencia-layout-p1.png` e `referencia-layout-p2.png` nesta pasta. Um
> revisor independente leu a spec como quem vai planejar, e as perguntas dele viraram as D15–D19.

## 1. Intenção

O certificado do Lotus é o documento final entregue ao cliente. A Lotus manda o PDF direto, sem
imprimir nem assinar à mão. Hoje esse PDF tem quatro problemas:

1. **Não tem assinatura.** Sai só o nome do instrutor sob um traço, e a gerente não aparece.
2. **Pagina mal.** Com nota e asistencia preenchidas, o certificado real sai com 3 páginas, e as
   assinaturas caem sozinhas numa página quase vazia (`P-78`, reproduzido em produção no
   `LOT-2026-1000`).
3. **Não tem cara de certificado.** O logo muda de lugar entre as páginas. O conteúdo começa baixo,
   porque o QR e o logo estão empilhados. Nota, asistencia e vigência saem como linhas de formulário,
   e o texto de verificação do QR tem 7px.
4. **Corta texto em silêncio.** A descrição longa do curso é elidida com reticências.

O bloco resolve os quatro problemas e registra, com fonte, o que torna o certificado de uma OTEC
válido.

**Sucesso:**

- todo certificado, novo ou já emitido, sai com as assinaturas atuais da gerente e do instrutor, no
  layout aprovado;
- o certificado sai em 2 páginas quando o temário cabe numa página, para todo texto realista dentro
  dos tetos (D15);
- o documento nunca perde texto, nem com texto adversário (que pode levar as assinaturas para a
  página 2).

## 2. Estado de partida (medido no código, `main@0c09fa4f`)

- `certificate.blade.php` só imprime `snapshot->redator->name` sobre "Instructor", e o traço é a
  borda do cargo (`:360-366`). Não há asset de assinatura, gerente nem selo em backend ou frontend.
- O PDF é regerado do snapshot a cada requisição e nunca é persistido (`CertificatePdfService`).
  `CertificateSnapshotData` v2 congela redator (`name`, `rut`), emissor (config), curso, turma,
  cliente, resultado e `ciudad_emision`.
- O QR e o logo ficam empilhados no fluxo (`.identificacion` e depois `.brand`). Na página 1 o logo
  começa ~45 mm abaixo do topo; na do temário, ~14 mm.
- O fundo usa `repeat-y`, e as barras da página 1 se repetem na página 2 (`P-28`).
- A descrição do curso tem clamp de 7 linhas a 11px e de 10 linhas a 9px, com reticências.
- Nenhum DTO tem `max:` nos campos impressos. As colunas são `string(255)` ou `text`.
- O documento do redator vive em `files` (morph `redator`), com o tipo em `RedatorDocumentType`
  (`CV|REUF|TITULO|POSTGRADO`). O upload tem rota de admin e de self-service, e o replace é por
  tipo. `ContentClass::Imagem` aceita jpg/png/webp até 5 MB.
- `CertificadoEmitidoIntactoTest` crava o sha256 do HTML de um certificado emitido. O próprio
  docblock diz que mudar o valor "é decidir que todo certificado já emitido reimprime diferente —
  decisão do João, registrada".
- **Medição do protótipo (layout v5, Gotenberg real, 16 casos).** Cada campo isolado em 255
  caracteres cabe na página 1. Descrição acima de ~900 caracteres é elidida. Todos os campos em 255
  ao mesmo tempo empurram as assinaturas para a página 2. O temário longo passa de uma página.
- A capacidade depende do perfil do texto: o docblock do Blade em `HEAD` mediu a mesma área de 7
  linhas com 871 caracteres de prosa espanhola e 493 de palavras uniformes de 32 letras.
- **Gotenberg:** os dois composes usam a tag móvel `gotenberg/gotenberg:8`, e a de dev está em
  8.36.0 (Chromium 151). O `deploy/bin/deploy.sh` roda `compose pull` em toda subida, com o compose
  do servidor, que é uma cópia manual em `/opt/lotus/docker-compose.prod.yml` (pré-requisito do
  script). Nenhum teste chama o Gotenberg real, todos usam fake, e o CI não tem esse serviço.
- **Imagem no servidor:** o GD do container `app` não lê JPEG nem WebP, e não há Imagick. O
  `getimagesize()` lê a largura sem GD.
- **Arquivamento do redator:**
  - `Redator::booted` faz soft-delete em cascata dos documentos dele, com `archived_with_parent`;
  - a emissão aceita redator arquivado (`withTrashed` no `CertificateController` e no
    `BatchIssueCertificatesAction`);
  - upload para redator arquivado é recusado (`lockForWrite`);
  - o replace por tipo faz soft-delete do documento anterior.
- **Sequência:** a lane 43 (pronta para executar) lista `generated.ts`, as três locales e os
  formulários de aluno, empresa, curso e redator, que este bloco também toca. O `lane.sh conferir`
  recusa o plano do 40 enquanto ela estiver viva.

## 3. Decisões

| # | Decisão | De quem |
|---|---|---|
| D1 | A assinatura do instrutor é um documento a mais do redator, o tipo `FIRMA`, indexado no dialog do redator como o CV. | João |
| D2 | O próprio redator também sobe a assinatura pelo Meu Perfil. | João |
| D3 | A assinatura da gerente é configurada numa tela própria: Administración › aba **Configuración** › submódulo **Certificados**. Só o superadmin acessa. A aba é feita para receber outros submódulos depois. | João |
| D4 | Rodapé com duas assinaturas lado a lado: gerente à esquerda, instrutor à direita. | João |
| D5 | **Assinaturas vivas, não congeladas.** Todo certificado, inclusive os já emitidos, sai com a assinatura atual do instrutor e com a gerente atual (assinatura, nome e cargo). Se a gerente mudar, os certificados antigos passam a sair com a nova. | João |
| D6 | Sem assinatura cadastrada, a emissão não trava: o painel avisa, e o certificado sai com o espaço em branco sobre o traço e o nome embaixo, para assinatura à mão. | João |
| D7 | Os selos SENCE e NCh **não** entram no certificado. | João |
| D8 | Layout = v5 aprovada (§4.3), que se aplica a todo certificado, inclusive os já emitidos. A `P-28` fecha aqui. | João |
| D9 | A frase de abertura usa o texto fixo da Lotus, a data de emissão, "OTEC LOTUS SpA" e o RUT. Sai o local da turma, o que reverte, só para a impressão, a D2 do bloco 39. | João |
| D10 | Conteúdo que não cabe na página 1 é recusado na **entrada**, com teto de caracteres medido. O PDF nunca corta texto, e o clamp da descrição sai. | João |
| D11 | Toda possibilidade de dado que pode quebrar o layout é medida no Gotenberg real. | João |
| D12 | Snapshot e `valido_ate` de certificado emitido continuam imutáveis. Só o PDF muda, pelas D5, D8 e D9. | Claude |
| D13 | O texto fixo da Lotus na frase é `config('app.certificate_issuer.city')` ("Santiago"), lido na hora de renderizar. Endereço completo fica para quando a Lotus pedir. | Claude |
| D14 | O nome impresso sob a assinatura do instrutor continua vindo do snapshot (a pessoa designada na emissão). Só a imagem é viva. | Claude |
| D15 | **Calibração dos tetos:** texto realista em espanhol, com MAIÚSCULAS nos nomes e prosa normal na descrição. **Nomes primeiro:** cada nome ganha teto com folga sobre o maior valor de produção, e a descrição fica com a altura que sobra quando todos os nomes estão no teto. Texto adversário (sem espaço, glifo largo) fica fora do cálculo: pode levar as assinaturas para a página 2, mas nunca perde texto. | João |
| D16 | **A imagem de assinatura é limpa no navegador antes do envio:** recorte rente à tinta, fundo transparente, no máximo 1600 px de largura e PNG, com prévia do resultado antes de salvar. O servidor só valida. Vale para a `FIRMA` e para a assinatura da gerente. | João |
| D17 | **Gotenberg com tag exata** em `docker-compose.yml` e `docker-compose.prod.yml`, na versão em que a matriz foi medida. A matriz roda no container, contra o Gotenberg real, e é pulada fora dele. O CI não muda. Atualizar o Gotenberg passa a ser trocar a tag e rodar a matriz de novo. | João |
| D18 | **A lane 43 vai primeiro.** A spec aprovada é commitada agora na lane 40, e o plano é escrito quando a 43 fechar, em cima do código dela. | João |
| D19 | **A `FIRMA` de redator arquivado continua valendo.** A assinatura do instrutor é a `FIRMA` não apagada do redator. Se ele estiver arquivado, vale a que a cascata arquivou (`archived_with_parent = true`). A cascata não muda. O aviso do painel (§4.4) segue a mesma regra. Arquivar instrutor que terminou é o caso normal, e "todas adotam" (D5) não combina com caixa vazia em todo certificado antigo. | Claude |

## 4. Desenho

### 4.1 Assinatura do instrutor (Identity)

- `RedatorDocumentType::FIRMA`. A coluna `files.type` é string, então não há migration de enum.
- **Limpeza no navegador (D16):**
  - o slot aceita o que o navegador decodifica (jpg, png, webp), e outro formato recebe mensagem
    nomeada;
  - o recorte vai rente à tinta, com margem pequena;
  - o fundo claro vira transparente com rampa suave, para preservar a borda do traço e não apagar
    caneta fraca;
  - a imagem é reduzida para no máximo 1600 px de largura e nunca ampliada (1600 px numa caixa de
    60 mm passam de 600 DPI);
  - o resultado sai em PNG, e a prévia mostra o resultado antes de salvar, com opção de cancelar;
  - o arquivo guardado é o PNG limpo, e o original não sobe;
  - a lógica de pixel vive em `shared/lib` como função pura, testável no vitest sem canvas, e o
    canvas só faz a ponte. A FIRMA (`features/identity`) e a gerente (`features/certification`)
    usam a mesma função.
- **Validação no servidor:**
  - classe de conteúdo própria para assinatura: só PNG, até 1 MB **(Claude)**, coberta pelo
    `UploadPolicyRatchetTest`;
  - no mínimo 600 px de largura depois do recorte **(Claude)**, lida por `getimagesize()`, com a
    mensagem vinda de `lang/`;
  - sem `valid_until`;
  - o replace por tipo é o mesmo dos outros documentos.
- **Não é documento de compliance:** fica fora da idoneidade, dos alertas de vencimento e das
  listas e métricas que filtram por `RedatorDocumentType::values()` (`IdentityMetricsQuery`,
  `RedatorScopeQuery`, `idoneidade()` do front).
- **Admin:**
  - o slot "Firma" aparece no `RedatorDocumentsSection`, depois dos quatro tipos atuais (o
    protótipo foi aprovado assim);
  - sem tag de status, porque assinatura não vence;
  - o `DOC_TYPES` do front e as três locales são atualizados.
- **Self-service:**
  - o Meu Perfil ganha o mesmo slot, pelo `ProfileDocumentSlot` e pelo contrato do perfil;
  - `isSelfService()` já inclui todo tipo que não é REUF.
- `generated.ts` é regenerado (lei 3).

### 4.2 Configuración › Certificados (assinatura da gerente)

- **Backend (Certification):**
  - tabela singleton `certificate_settings` com `manager_name` e `manager_title`, Auditable;
  - a migration cria a linha única com "Marcia de Batalha" / "Gerente OTEC", tirados do certificado
    aprovado **(Claude)**;
  - a imagem fica em `files`, com morph próprio registrado no morph map (ADR-10) e o mesmo replace
    por tipo, e passa pela mesma validação da `FIRMA` (§4.1);
  - rotas: `GET`/`PUT` das configurações e `POST`/`DELETE` da assinatura;
  - permissão nova `certification.settings.manage`, na lista das exclusivas do superadmin
    (`RolePermissionSeeder`), com o admin recebendo 403.
- **Frontend:**
  - Administración ganha a aba **Configuración**, visível com
    `can('certification.settings.manage')`;
  - a descrição da página passa a citar a configuração;
  - dentro da aba, à esquerda, uma navegação vertical de submódulos, hoje só "Certificados", e à
    direita o conteúdo. O protótipo usou o visual do `AppSelectableCard`; a versão real é uma peça
    de navegação em `shared/ui` com marca de item atual (`aria-current`) **(Claude)**;
  - o submódulo Certificados fica em `features/certification`, e a composição com a página de
    Administración (`features/identity`) acontece na camada `app/`, porque feature não importa
    feature (lei 6);
  - campos: Nombre, Cargo e Firma, com caixa de preview, trocar e remover, mais o botão "Guardar".
    A Firma passa pela mesma limpeza no navegador (D16);
  - o texto de ajuda diz que a configuração vale para **todos** os certificados, inclusive os já
    emitidos (D5). O texto do protótipo dizia o contrário e está errado.

### 4.3 Certificado (Blade e PDF)

A referência visual é a v5, nos PNGs desta pasta. Requisitos:

- **Cabeçalho de altura fixa em toda página física,** inclusive nas de continuação do temário: logo
  centralizado no mesmo tamanho e posição. Na página 1, o bloco de verificação divide a faixa à
  esquerda:
  - QR;
  - "N° LOT-…" em negrito, com dígitos tabulares;
  - "Emitido el dd-mm-aaaa";
  - "Verifique la autenticidad escaneando el código." numa linha só, em itálico, mais leve e menor,
    mas legível.
- **O título começa sempre na mesma linha** (~70 mm do topo), qualquer que seja o dado.
- **Ordem do corpo da página 1:**
  1. título;
  2. "En Santiago, a 28 de octubre de 2026, OTEC LOTUS SpA [77.510.327-2] certifica que:" (D9,
     D13);
  3. nome do aluno, o maior destaque depois do título, e o RUT, mais leve;
  4. "El trabajador participó en el curso:";
  5. traço acima, nome do curso em azul e a linha "nome técnico · N horas cronológicas", com padding
     interno e **sem traço embaixo**;
  6. um parágrafo **centralizado** com período por extenso, descrição e resultado ("…con nota 6,5 y
     una asistencia de 92,5 %"), sem clamp (D10);
  7. traço, nome da empresa em negrito e o RUT dela embaixo;
  8. "N° de registro LOT-… · Válido hasta el 29 de octubre de 2028".
- **Formato chileno:** data por extenso no texto, data numérica só no bloco técnico, vírgula decimal
  e "%" com espaço.
- **Assinaturas:**
  - duas colunas de largura igual, logo abaixo do corpo (não presas ao pé);
  - cada coluna tem uma caixa de altura fixa com a imagem apoiada num traço inteiro, e embaixo o
    nome em negrito e o cargo;
  - a imagem é o PNG limpo no upload (D16), embutido como está, sem reamostrar no PDF. O
    `mix-blend-mode: multiply` continua, para que qualquer resíduo claro some no fundo;
  - sem assinatura, a caixa fica vazia e o resto não muda (D6).
- **Aviso legal uma vez só,** no pé da última página.
- **Rodapé técnico em toda página física:** "LOT-… · Página X de Y", certo para qualquer número de
  páginas.
- **Temário:**
  - quadro com o cabeçalho "Temario del curso | nome do curso";
  - módulos numerados com marcadores;
  - quebra só **entre** módulos, sem separar o título do módulo do primeiro marcador;
  - página de continuação com cabeçalho, fundo e rodapé.
- **Fundo da página do temário e das continuações:** o padrão sem as barras. O asset é gerado uma
  vez, a partir de `docs/templates/fundo-certificado.png` e do fundo da página 2 do aprovado, e
  commitado.
- **Assinaturas vivas (D5):**
  - a da gerente vem de `certificate_settings` + `files`;
  - a do instrutor vem da `FIRMA` do redator do certificado (`certificates.redator_id`), pela regra
    da D19.
  - As duas são lidas na hora de renderizar; o snapshot não muda de schema. A falta de uma delas
    nunca derruba o PDF.
- O preview (MUESTRA) usa o mesmo Blade e as mesmas regras.
- `CertificadoEmitidoIntactoTest` ganha um sha novo, com a decisão registrada (D8). Continua
  provando que o snapshot e o `valido_ate` não mudam.

### 4.4 Emissão

O painel de emissão mostra **avisos, não bloqueios**:

- o redator escolhido não tem `FIRMA`, pela regra da D19 (redator arquivado com a `FIRMA` arquivada
  pela cascata não gera aviso);
- a assinatura da gerente não está configurada.

Os textos ficam nas três locales. Nenhum `EmissionBlockReason` novo. A porta de cidade passa a
depender só da cidade do emissor (D9): se a config estiver vazia, continua recusando.

### 4.5 Tetos de entrada (D10, D11)

- **Campos com teto:**
  - nome do aluno;
  - nome do curso;
  - nome técnico;
  - descrição do curso;
  - nome da empresa;
  - nome do redator (sai na coluna da assinatura).
- **Valores:** saem da matriz de estresse, pela regra da D15, para que a **pior combinação realista
  permitida** caiba na página 1. Nada de número chutado.
- **Antes de fixar os tetos, medir produção (só leitura):**
  - o maior valor de cada campo nas tabelas;
  - o maior valor congelado nos snapshots de certificados emitidos **(Claude)**. O teto não vale
    para trás, e esses certificados reimprimem no layout novo (D8).
  - Se algum dado existente passar do teto, pare e leve ao João.
  - O auto mode já recusou leitura de produção nesta sessão. Se recusar de novo, o script fica
    pronto no scratchpad, o João roda e cola a saída, e a execução confere o resultado.
- **Toda porta de entrada aplica o teto:**
  - na API, `max:` no DTO, com mensagem de `lang/` nas três locales;
  - o import de alunos;
  - a carga histórica do bloco 38 (`CarregadorDeHistorico`), que respeita os mesmos tetos ou declara
    o que fazer com o excedente;
  - no front, `maxLength` e contador de caracteres na descrição.
- **A matriz de estresse vira teste:**
  - casos: cada campo no teto; todos no teto juntos; descrição no teto; temário do tamanho do
    aprovado (8 módulos); temário grande (15+ módulos); sem campos opcionais; sem temário; texto
    adversário no teto;
  - medida no Gotenberg real da tag fixada (D17): páginas por `pdfinfo` e posição das assinaturas e
    do temário por texto da página;
  - roda no container e é pulada fora dele, com uma sonda do Gotenberg no molde do
    `tests/Support/ProbesMysqlConcurrency.php`, e a saída fica registrada no fechamento.

### 4.6 Gotenberg fixado (D17)

- `docker-compose.yml` e `docker-compose.prod.yml` trocam `gotenberg/gotenberg:8` pela tag exata em
  que a matriz foi medida. Um comentário no próprio compose diz que trocar a tag exige rodar a
  matriz de novo.
- Produção só sobe essa versão quando a cópia do servidor (`/opt/lotus/docker-compose.prod.yml`)
  recebe a mudança. Esse passo é do João (Verificação externa, item 1).
- O CI não ganha o serviço.

### 4.7 Pesquisa de validade

- **Onde fica:** `validade.md` nesta pasta, com tabela requisito | fonte primária (URL, norma e
  artigo) | certeza | situação no template (atendido / decisão da Lotus / não se aplica).
- **Ponto de partida:** fatos 6 e 7 do `context.md`. A execução tenta de novo a fonte primária
  (bcn.cl para a Ley 19.799, a Ley 19.518 e o DS 98; sence.cl; inn.cl).
- **Já decidido:**
  - selos fora (D7);
  - firma electrónica avanzada não é exigida para instrumento privado (Ley 19.799, arts. 3 e 5,
    a confirmar na BCN) e vai para Deferred.
- **Pendências da Lotus:** código SENCE no certificado, nota mínima, prazo de guarda e o que o setor
  elétrico exige.

### 4.8 Docs

- `der-fisico.md`: tabela `certificate_settings` e o morph novo.
- `pendencias/`: `P-28` e `P-78` encerradas.
- `estrutura-monolito.md`, se nascer pasta nova.
- Rule ou docblock onde o padrão de submódulo de configuração precisar de explicação.

## 5. Critérios de aceite (provados por teste)

1. **Paginação.** A matriz de estresse (§4.5) roda no Gotenberg real da tag fixada:
   - com texto realista dentro dos tetos e temário de até uma página, todo caso sai em 2 páginas,
     com as assinaturas na página 1;
   - com texto adversário, nenhum texto se perde, e as assinaturas podem ir para a página 2;
   - nenhuma página tem reticências de corte;
   - toda página física tem cabeçalho e "Página X de Y" certo.
2. **Tetos.** Um campo acima do teto recebe 422 com a mensagem nomeada nas três locales, e o campo
   no teto passa.
3. **`FIRMA`:**
   - admin e redator sobem a assinatura;
   - o servidor recusa, com a mensagem nomeada, arquivo que não é PNG, que passa de 1 MB ou que tem
     menos de 600 px de largura;
   - a limpeza (recorte, fundo transparente, redução para 1600 px) é provada por teste das funções
     puras com imagens sintéticas, inclusive caneta fraca e foto com fundo cinza;
   - `FIRMA` não altera idoneidade, alertas nem listas de compliance.
4. **Configuración:**
   - superadmin lê, salva e troca a assinatura;
   - admin recebe 403 nas rotas, e a aba não aparece para ele;
   - a mudança gera auditoria.
5. **Assinatura viva:**
   - trocar a assinatura do redator ou da gerente muda a reimpressão de um certificado já emitido;
   - o snapshot e o `valido_ate` continuam idênticos;
   - o certificado de redator arquivado sai com a `FIRMA` que a cascata arquivou (D19);
   - sem assinatura, o certificado sai com traço e nome e a caixa vazia.
6. **Emissão:** os dois avisos aparecem no painel pela regra da D19, e a emissão segue.
7. **Visual:** o PDF real confere com `referencia-layout-p1.png` e `referencia-layout-p2.png`, em
   inspeção pelo `pdftoppm`, registrada no fechamento.
8. **Gotenberg:** os dois composes têm a tag exata, e a matriz do critério 1 rodou nela.
9. **Gates:** `generated.ts` regenerado. Gate verde no backend (suíte e Pint nos arquivos tocados)
   e no frontend (`pnpm build`, `pnpm lint`, `pnpm test`).

## Verificação externa

1. Antes do deploy do bloco, o João atualiza `/opt/lotus/docker-compose.prod.yml` no servidor com a
   tag exata do Gotenberg (D17). O deploy sobe essa versão, conferida por `docker inspect` via SSH.
   - prova: nenhuma
2. O superadmin carrega em produção, pela tela Administración › Configuración › Certificados, a
   assinatura da Marcia de Batalha (ação do João ou da Lotus, depois do deploy).
   - prova: nenhuma
3. Depois do deploy, um certificado já emitido em produção é reimpresso e sai em 2 páginas, com as
   duas assinaturas, no layout v5 (smoke do João; o PDF exige sessão).
   - prova: nenhuma

## 6. Não-objetivos

- Selos SENCE e NCh no certificado (D7).
- Firma electrónica avanzada ou provedor acreditado.
- Editor visual de template.
- Congelar assinatura no snapshot.
- Endereço completo da Lotus na frase.
- Mudar o manual (`document.blade.php`), a carga v1 (bloco 38) ou o vocabulário relator/instructor
  fora do certificado.
- Tratar imagem no servidor (D16).
- Gotenberg no CI (D17).
- Mudar a cascata de arquivamento do redator (D19).

**Anti-objetivos (falha mesmo que "funcione"):**

- texto cortado no PDF;
- assinaturas fora da página 1 com texto realista dentro dos tetos (D15);
- assinatura com fundo visível (retângulo) no PDF;
- tag móvel do Gotenberg em dev ou em produção;
- mudança em snapshot ou `valido_ate` de certificado emitido;
- assinatura de gerente editável por quem não é superadmin;
- `FIRMA` contando para idoneidade;
- `generated.ts` editado à mão;
- PrimeReact fora de `shared/ui`;
- feature importando outra feature.

## 7. Deferred

- Firma electrónica avanzada ou selo de tempo da gerente (Ley 19.799, art. 5), se a Lotus quiser
  força probatória plena.
- Endereço completo da Lotus, ou outros dados do emissor, editáveis no submódulo Certificados.
- Outros submódulos de Configuración.
- As pendências da Lotus registradas em `validade.md`.
- Ajuste manual do recorte da assinatura, se a limpeza automática não bastar para algum arquivo
  real.

## 8. Deixado ao builder

- O mecanismo de "Página X de Y" e do cabeçalho repetido nas páginas de continuação (margin boxes
  do `@page`, elementos `position: fixed` ou outro), desde que provado no Gotenberg real.
- Os tamanhos finos de fonte e espaçamento, respeitando a v5.
- Nome e forma das rotas e dos DTOs de configuração, seguindo o padrão de entidade do
  `backend-ddd.md`.
- A forma de compor a aba Configuración na camada `app/`.
- Os limiares da limpeza (corte do fundo, largura da rampa, margem do recorte), calibrados com as
  assinaturas de teste do protótipo e com uma foto de celular.
- O nome da classe de conteúdo da assinatura e da sonda do Gotenberg.
- **Quando planejar (D18):** o plano é escrito depois que a lane 43 fechar. Então o
  `lane.sh conferir 40` passa, e os formulários dos tetos já estão no código que a 43 deixou.
