# Bloco 62 — `certificacao-paineis-lote-e-planilha` — design

Data: 2026-11-24. Ficha: `backlog.md`, item 62. Fonte: pedidos da Lotus de 2026-11-21
(Certificación 1 a 3) e o e-mail modelo que a Lotus manda ao cliente (§1).

## 1. Intenção

Quando uma turma termina, a Lotus emite os certificados e manda ao cliente um e-mail com uma tabela:
Código, Fecha Curso, RUT, Nombre Completo, Curso e um link "ABRIR" por aluno. Hoje essa tabela é
montada à mão. Este bloco faz o Lotus entregá-la pronta (planilha) e entregar os PDFs da turma num
arquivo só (ZIP). Junto, o painel de emissão passa a mostrar o que está pendente sem obrigar a
caçar a turma no combo, e o Historial ganha a cotação, que é como a Lotus fala da turma com o
cliente.

E-mail modelo (recebido em 2026-11-24): cabeçalho verde-azulado, 16 linhas de uma turma, todas com
Fecha Curso `12/10/26`, RUT formatado (`17.275.241-1`, `12.542.984-K`), curso repetido em toda linha,
link com o texto `ABRIR`.

O João pediu também que o bloco **acelere a renderização do Gotenberg**, não só o lote: o PDF unitário
é a rota mais cara do sistema (`routes.php`, comentário do `certificates/{certificate}/pdf`).

## 2. Decisões do João (2026-11-24)

1. **A exportação é sobre os filtros do Historial**, e só sobre eles neste bloco. Não há seleção de
   linha por checkbox. O usuário é avisado de que o conjunto exportado é o filtrado (todas as
   páginas, não só a visível).
2. **Dois formatos:** planilha no formato do e-mail modelo, e ZIP com os PDFs.
3. **ZIP só por turma.** Ele exige o filtro de cotação (cotação ↔ turma é 1:1, §4).
4. **Renderização: abordagem 1** (§8) — medir e ajustar o PDF unitário, e renderizar o lote em
   paralelo limitado.
5. **O resto do playback está aprovado:** presets de período, combo com o código da cotação, cards
   de pendência, coluna e filtro de cotação, botões de exportação na barra do Historial.
6. **O card diz "N por emitir · M emitidos".** "Por emitir" é o aluno aprovado sem certificado
   vigente — o mesmo número do botão "Emitir todos los pendientes".
7. **O limitador do PDF público fica em 10/min por IP.** O "ABRIR" da planilha é para o download
   avulso; abrir a turma inteira é o caso do ZIP, que a Lotus anexa ao e-mail. Quem abrir mais de 10
   links num minuto pelo mesmo IP toma 429 — risco aceito para não multiplicar renderizações anônimas
   no Gotenberg que agora também renderiza o ZIP em paralelo.

## 3. Objetivos, não-objetivos, anti-objetivos

**Objetivos**

- A planilha de uma turma, colada no e-mail, reproduz a tabela do modelo sem edição manual, e cada
  "ABRIR" baixa o PDF certo.
- O ZIP de uma turma traz um PDF por certificado não revogado, em menos tempo do que o mesmo número
  de downloads unitários em sequência.
- O PDF unitário (painel e público) fica mais rápido, se a medição mostrar ganho possível sem mudar
  o documento.
- O painel de emissão mostra as turmas pendentes sem escolha prévia no combo.
- O Historial filtra e mostra a cotação.

**Não-objetivos**

- Seleção de linhas por checkbox no Historial.
- Fila e worker em produção. O lote é síncrono, com teto.
- Exportar pelo painel de emissão. A exportação mora no Historial.
- Mudar conteúdo, layout ou dado do PDF do certificado.
- Enviar o e-mail pelo sistema.

**Anti-objetivos** (falharia mesmo funcionando)

- Um PDF do ZIP diferente do que o download unitário do mesmo certificado entrega.
- ZIP incompleto entregue como se fosse a turma inteira.
- Planilha com linha de certificado revogado, ou com dado vivo onde o documento tem snapshot (nome,
  RUT, curso, data).
- Aviso que diz um número e exporta outro.
- Paralelismo que derruba o Gotenberg de produção (`mem_limit: 768m`, `docker-compose.prod.yml`) e
  com ele todo PDF do sistema.

## 4. Como funciona hoje

- **Painel de emissão.** `GET /api/certificates/emission-panel?concluidas_desde=Y-m-d`
  (`EmissionPanelQuery::get`). Default: hoje em `America/Santiago` menos `JANELA_MESES = 12`, só do
  servidor (`EmissionPanelQueryData::desde`; o front só anuncia, `emissionWindow.ts`). Devolve toda
  turma concluída na janela, com alunos, motivo de bloqueio (`EmissionBlockReason`) e certificado
  vigente por matrícula (`EmissionPanelTurmaData`). O front deriva as contagens
  (`useEmissionPanelState`, `rowCertKind`). O combo mostra `curso · cliente`. Sem turma escolhida, a
  tela mostra o vazio "Selecciona una turma…" (`EmissionPanel.tsx`).
- **Historial.** `GET /api/certificates` paginado (ADR-22), busca `q`, filtro `display_status`, rodapé
  com as contagens por estado (`summaryByDisplayStatus`). Colunas em `historialColumns.ts` e
  `HistorialTable.tsx`. `CertificateData` não traz cotação.
- **Cotação da turma.** `Turma::quote()` (`BelongsTo`). O código `Scap {budget_id} - R{seq_in_budget}`
  vem de `Quote::code()` (bloco 60, §4.3) e é exibido com o `RecordCode` de `shared/ui`. Uma cotação
  tem no máximo uma turma ativa (`turmas.active_quote_id`, `der-fisico.md`).
- **Snapshot.** `CertificateSnapshotBuilder::build` congela aluno (nome, RUT — gravado formatado,
  bloco 60 §4.7), curso, `turma.start_date`/`end_date`, cliente, relator e `emitido_em`.
- **PDF.** `CertificatePdfService::render` monta um HTML com QR, logo, dois fundos JPEG e duas fontes
  em base64, e o manda a `GotenbergHtmlToPdf` (`/forms/chromium/convert/html`, só
  `preferCssPageSize`). Um certificado por requisição, sem cache (ADR-12). Rotas:
  `certificates/{certificate}/pdf` (`throttle:certificate-pdf`, 30/min) e
  `publico/certificados/{uuid}/pdf` (`throttle:public-certificate-pdf`, 10/min por IP; 410 para
  revogado; bloco 61).
- **Produção.** Sem worker de fila (`docker-compose.prod.yml:9`). `fastcgi_read_timeout 120s`
  (`docker/nginx/prod.conf`, `deploy/nginx/tls.conf`). Gotenberg 8.36 com `mem_limit: 768m`. `ext-zip`
  na imagem (`docker/Dockerfile.prod`). `openspout/openspout` já é dependência e já escreve xlsx
  (`Operation/Services/SpreadsheetTemplate.php`).

## 5. Design

### 5.1 Emisión

- **Período.** O `PeriodFilter` de `shared/ui` substitui o "Concluidas desde". Presets, nesta ordem:
  **Últimos 12 meses** (default), Semana, Mes, Año, Personalizado. Semana/Mes/Año são o calendário
  corrente até hoje, como no diálogo do cliente (`currentCalendarPeriod`). Personalizado revela as duas
  datas.
- **Backend do período.** `EmissionPanelQueryData` troca `concluidas_desde` por `period_start` e
  `period_end` (`Y-m-d`, ambos opcionais), filtrando `turmas.end_date` entre eles. Ausentes, vale a
  janela de hoje: `JANELA_MESES` no fuso de Santiago, decidida só no servidor (D7 segue valendo). O
  preset "Últimos 12 meses" não manda parâmetro nenhum. Janela invertida → 422 com
  `errors.period_end`, mostrado pelo `PeriodFilter` como no Dashboard (D6 dele). A borda continua com
  `DataSql::literal`, pelo índice `turmas(status, end_date)` (comentário em `EmissionPanelQuery`).
- **Combo.** Rótulo `Scap 190 - R1 · <curso> · 12/10/26`. `EmissionPanelTurmaData` ganha
  `quote_code` (string), de `Quote::code()`, com a cotação no eager-load que já existe
  (`quote.budget.client.user`).
- **Cards.** Sem turma escolhida, no lugar do vazio atual, um card por turma da resposta que tenha ao
  menos um aluno "por emitir" (aprovado sem certificado vigente, `rowCertKind === 'sin_emitir'`).
  Turma bloqueada também entra, com a tag do motivo: `rowCertKind` não olha o bloqueio, então o
  aprovado sem certificado de uma turma bloqueada é `sin_emitir` como qualquer outro. Ordem: a da resposta (`end_date` desc, `id` desc).
  O card mostra o `RecordCode` da cotação, o curso, o cliente, a data de fim e
  **"N por emitir · M emitidos"**. Clicar seleciona a turma, exatamente como o combo, e abre a tabela
  de hoje (`EmissionStudentsTable`). Nenhuma turma com pendência no período → vazio "Sin turmas con
  emisión pendiente" com dica para ampliar o período. As contagens saem de uma função só, a que hoje
  alimenta `counts` em `useEmissionPanelState`.

### 5.2 Historial

- **Coluna Cotización.** `CertificateData` ganha `quote_id` (int, nullable) e `quote_code` (string,
  nullable), lidos de certificado → matrícula → turma → cotação, no eager-load de `withListingData`
  (sem N+1). Não é dado de snapshot: o snapshot não guarda cotação, e o código de uma cotação não muda
  depois de emitido. Célula com `RecordCode`; nula → `—`. Largura em `historialColumns.ts` (`COL.code`).
- **Filtro Cotización.** `CertificatePageQueryData` ganha `quote_id` (opcional, `exists`). Na tela, um
  dropdown com busca ao lado do filtro de estado. As opções vêm de um endpoint novo que lista só as
  cotações com ao menos um certificado (`id`, `code`), ordenadas da mais recente para a mais antiga. O
  "limpar filtro" do `SearchableTableFrame` limpa os dois.

### 5.3 Exportação — o conjunto

- **O conjunto** é o da listagem com os mesmos parâmetros (`q`, `display_status`, `quote_id`), **todas as
  páginas**, **menos os revogados**. Revogado não entra em nenhum formato: o link público dele dá 410 e
  o documento não vale. Vencido e por vencer entram (bloco 61, decisão 9). Como a reemissão revoga o
  anterior e o índice `certificates_active_enrollment_unique` admite um só `emitido` por matrícula
  (`der-fisico.md`), "não revogado" dá no máximo uma linha por aluno da turma.
- **A query é uma só.** O endpoint de exportação usa o mesmo `CertificateQueryBuilder` e os mesmos
  filtros da listagem. O número do aviso vem do servidor, da mesma query que exporta — o cliente não
  re-deriva.
- **Barra do Historial.** Dois botões, **Planilla** e **ZIP**. Clicar abre uma confirmação:
  "Se exportarán N certificados según los filtros aplicados" (sem filtro: "…todos los certificados") e,
  quando houver, "M revocados no se incluyen". N = 0 → botão desabilitado com a razão.
- **ZIP sem filtro de cotação** → botão desabilitado, com a dica "Filtra por cotización para descargar
  los PDF". O backend recusa o mesmo pedido com 422 (`errors.quote_id`): o botão é conveniência, a regra
  é do servidor.

### 5.4 Planilha

- **xlsx**, gerado com `openspout`. CSV não carrega link com rótulo, e o modelo tem "ABRIR" clicável;
  copiar do Excel para o Gmail preserva o link.
- **Colunas, nesta ordem e com estes títulos:** Código · Fecha Curso · RUT · Nombre Completo · Curso ·
  Link Descarga.
  - Código: `codigo` (`LOT-2026-144`).
  - Fecha Curso: `snapshot.turma.end_date`, exibido `dd/mm/yy` (`12/10/26`).
  - RUT: `snapshot.aluno.rut`, como gravado. Vazio (aluno estrangeiro) → célula vazia.
  - Nombre Completo: `snapshot.aluno.name`.
  - Curso: `snapshot.curso.name`.
  - Link Descarga: texto `ABRIR`, apontando para a URL absoluta do PDF público do bloco 61
    (`<APP_URL>/api/publico/certificados/{uuid}/pdf`). A base é `config('app.url')`, o domínio da
    API (`https://app.lotusotec.cl` em `deploy/aws/env.prod.example`), e não a
    `CERTIFICATE_VALIDATION_URL`: esta é a base da página de validação e vai para o site no bloco 63,
    enquanto o PDF público continua na API.
- **Linhas** ordenadas por `codigo` crescente, como no modelo.
- **Cabeçalho** com destaque visual próximo do modelo (fundo verde-azulado, texto branco, negrito).
- **Nome do arquivo:** com a cotação quando filtrado por ela (`certificados-scap-190-r1.xlsx`), senão
  com a data (`certificados-2026-11-24.xlsx`).
- **Teto** de linhas por pedido; acima dele, 422 pedindo filtro mais estreito.
- **Snapshot não apresentável** (`assertPresentable` falharia): a linha sai, com a célula vazia onde
  falta, e não derruba a planilha. A planilha é lista, não documento — a mesma fronteira da listagem,
  que marca a linha em vez de recusar.

### 5.5 ZIP

- Exige `quote_id` (§5.3). Um PDF por certificado não revogado da turma, `certificado-<codigo>.pdf`
  (o mesmo nome do download público, bloco 61 §5.2).
- **Mesmo renderizador** do PDF unitário: `CertificatePdfService`, sem caminho paralelo. O que muda é
  só a forma de chamar o Gotenberg (§5.6).
- **Tudo ou nada.** Falha ao renderizar um certificado → uma nova tentativa só dele; falhou de novo →
  a requisição inteira falha com RFC 7807 que nomeia o(s) código(s). Snapshot não apresentável → a
  mesma falha, nomeando o código. Nunca sai ZIP com menos certificados do que a turma tem.
- **Montagem** em arquivo temporário (`ZipArchive`), enviado e apagado depois do envio. Nada fica no
  disco nem no bucket.
- **Nome:** `certificados-scap-190-r1.zip`.
- **Teto** de certificados por ZIP, derivado da medição (§5.6): o lote do teto cabe com folga
  (metade) nos 120 s do `fastcgi_read_timeout`. Acima dele, 422.
- **Limitador próprio** por usuário, no molde do `certificate-batch`.

### 5.6 Renderização

1. **Medir primeiro.** Uma task mede, no stack local, com o Gotenberg sob o mesmo `mem_limit: 768m`
   de produção: o tempo de um PDF (mediana de várias rodadas), o tamanho do HTML enviado e onde o tempo
   vai (montagem do HTML no PHP × conversão no Gotenberg). O registro fica em
   `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medicao-gotenberg.md`.
2. **Ajustar o unitário** só com ganho medido e documento igual: opções do formulário do Gotenberg
   (por exemplo, não esperar rede ociosa num HTML sem recurso externo) e custo do lado do PHP (ler os
   mesmos arquivos estáticos a cada renderização). "Igual" é provado comparando a página renderizada
   (`pdftoppm`) antes e depois, e pela suíte de certificado existente (`MedidorDeCertificado`,
   `CertificadoMatrizGotenbergTest`). Ajuste sem ganho medido não entra.
3. **Lote em paralelo limitado.** `HtmlToPdf` ganha a renderização de vários HTMLs com no máximo N
   conversões simultâneas (`Http::pool` ou equivalente), e `CertificatePdfService` a usa para o ZIP. N é
   o maior valor que a medição mostrar estável sob 768 MB, sem reinício nem OOM do container, e fica em
   configuração com esse valor como default. O registro da medição traz a varredura de N.
4. O ganho entra no registro: tempo do ZIP de uma turma real (≥ 15 certificados) × o mesmo número de
   PDFs unitários em sequência.
5. **Se só N = 1 for estável sob 768 MB** (decisão minha, para o João conferir): o ZIP sai serial, com
   o teto recalculado pela mesma regra, e o registro diz isso. O ZIP continua valendo — um arquivo em
   vez de 15 downloads —, e subir a memória do Gotenberg é decisão de infra fora deste bloco.

### 5.7 Rotas

Novas, autenticadas (`auth.active`), registradas **antes** de `certificates/{certificate}`, que de outro
modo as capturaria:

- `GET certificates/quotes` — opções do filtro de cotação.
- `GET certificates/export/summary` — N e M do aviso, com os parâmetros da listagem.
- `GET certificates/export/planilha` — o xlsx.
- `GET certificates/export/zip` — o ZIP.

Os nomes são proposta; o executor pode juntar o resumo à própria listagem se a meta dela já trouxer N e M
pelo mesmo escopo.

**Autorização** (decisão minha): a mesma da listagem e do PDF unitário de hoje — `auth.active`, sem
permissão nova. Quem vê o Historial e baixa um PDF baixa a turma.

## 6. Critério de aceite (provado por teste)

1. Emission panel aceita `period_start`/`period_end`, filtra `end_date` entre eles, recusa janela invertida
   com 422 em `period_end`, e sem parâmetro aplica os 12 meses de Santiago.
2. `EmissionPanelTurmaData.quote_code` e `CertificateData.quote_code` trazem `Scap x - Ry` sem consulta a
   mais por linha (guarda de eager-load, no molde de `CertificateEagerLoadTest`).
3. Os cards listam só turmas com aluno por emitir, incluem a bloqueada com a tag, e clicar abre a tabela da
   turma certa.
4. O Historial filtra por `quote_id`, e as opções listam só cotações com certificado.
5. O conjunto exportado é o da listagem com os mesmos filtros, todas as páginas, sem revogados; o N do
   resumo é igual ao número de linhas da planilha e de PDFs do ZIP.
6. A planilha tem as seis colunas na ordem, `Fecha Curso` em `dd/mm/yy`, dado do snapshot, link `ABRIR`
   com a URL pública do `uuid` certo, linhas por `codigo`.
7. O ZIP recusa sem `quote_id` (422) e acima do teto (422); traz um PDF por certificado não revogado; falha
   de renderização persistente derruba a requisição nomeando o código.
8. O PDF dentro do ZIP é o mesmo documento do download unitário do certificado (página renderizada igual).
9. Os limitadores novos foram vistos recusar.
10. Prova no navegador: a planilha de uma turma abre no Excel com as seis colunas, colada no Gmail mantém
    o `ABRIR`, e o link baixa o PDF do aluno da linha; o ZIP de uma turma baixa e abre.

## 7. Restrições

- ADR-12: PDF nunca persistido. ADR-22: listagem paginada; a exportação percorre o escopo sem carregar
  tudo de uma vez se o teto da planilha passar de algumas centenas (cursor/chunk).
- Lei 6: features não importam outra feature nem PrimeReact direto. O `RecordCode` e o `PeriodFilter`
  já estão em `shared/ui`.
- Lei 3: `generated.ts` regenerado, nunca editado.
- Peso legal: nenhum dado do PDF, da planilha ou do aviso sai de fonte viva quando o snapshot o tem.
- Download autenticado de arquivo pelo SPA: cookie Sanctum, como o PDF unitário de hoje
  (`useCertificatePdfOpener`).

## 8. Abordagens consideradas

1. **Paralelo limitado + medição** (escolhida). Ganha no lote e no unitário sem mexer em decisão tomada.
   Custo: a concorrência precisa de teto medido, senão o Gotenberg de produção cai.
2. **Uma chamada para a turma inteira + split do Gotenberg.** Um Chromium só. Descartada: certificado
   tem número variável de páginas (temário), e o split por página erra a fronteira entre certificados.
3. **Guardar o PDF no S3 depois da primeira renderização.** Descartada: contradiz o ADR-12 e a D5 do
   bloco 40 (assinatura e cidade lidas vivas na impressão); o cache teria de invalidar a cada mudança de
   configuração.

Para o conjunto exportado: seleção por checkbox foi descartada pelo João (decisão 1); fila com worker foi
descartada porque o ZIP é por turma (decisão 3), o que cabe síncrono.

## 9. Deixado ao executor

- A forma exata do paralelismo (`Http::pool`, `concurrency` do client) e o nome da configuração de N.
- Os números dos tetos (linhas da planilha, certificados por ZIP) e dos limitadores, a partir da medição,
  com o raciocínio no registro.
- Juntar ou não o resumo do aviso à meta da listagem (§5.7).
- O estilo exato do cabeçalho da planilha e as larguras de coluna.
- Os textos i18n, no vocabulário já usado em `certificate.*`.
- Como o front dispara o download autenticado de xlsx e ZIP, no molde do `useCertificatePdfOpener`.

## Verificação externa

1. Depois do deploy, o João baixa em produção o ZIP de uma turma real e a planilha da mesma turma, anota
   o tempo do ZIP, e confere que o container do Gotenberg não reiniciou nem foi morto por memória
   (`docker inspect` com `RestartCount` e `OOMKilled`), com a saída colada e conferida.
   - prova: nenhuma
