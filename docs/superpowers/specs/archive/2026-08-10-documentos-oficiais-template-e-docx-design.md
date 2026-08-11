# Design — `documentos-oficiais-template-e-docx`

> Item 1 do `backlog.md`, escrito a partir da descrição do João e selecionado por ele na mesma
> instrução (2026-08-10). Backend + frontend. Zero schema, zero mudança de contrato HTTP no
> certificado, uma rota nova no manual.
>
> Desenho aprovado pelo João em 2026-08-10 com as quatro decisões de abertura (D1–D4) respondidas
> por ele antes de qualquer linha desta spec ser escrita.

## 1. O ponto de partida, medido

Os dois documentos **já existem e já são Blade**. Este bloco é refatoração, não construção.

| | Certificado | Manual |
|---|---|---|
| Blade | `certification/certificate.blade.php` | `operation/manual-turma.blade.php` |
| Serviço | `CertificatePdfService` | `ManualPdfService` |
| Transporte | `Shared\Pdf\GotenbergHtmlToPdf` (`/forms/chromium/convert/html`) | o mesmo |
| Papel | A4 retrato, `preferCssPageSize` | A4 retrato, `preferCssPageSize` |
| Páginas | 2 (certificado + temário) | 1 fluida, 3 tabelas |
| Saída | PDF | PDF |
| Consumo | `GET /api/certificates/{id}/pdf` + rota pública do QR | `GET /api/turmas/{turma}/manual` |
| UI | módulo `/certificados` | `ManualButton` em `TurmaDocuments.tsx:41` |

**DOCX não existe em lugar nenhum do repositório** — nenhuma ocorrência, nenhuma biblioteca de
escritório no `composer.json`.

### 1.1 Os três templates, lidos como arquivo e não como impressão

**`certificado.pdf`** — 2 páginas A4 retrato (595,44 × 841,68 pt), produzido no Word. O fundo da
página 1 é um **JPEG de 98.258 bytes em 1414 × 1995**, com o logo LOTUS, a assinatura de Marcia de
Batalha, o rótulo `Instructor` e os dois carimbos (`Res. SENCE N°0879 08/03/2022` e `NCH 2728-2015`)
**rasterizados dentro dele**.

**`fundo-certificado.png`** — o asset que o João entregou. **1414 × 2000, RGBA 8-bit, 1.245.172
bytes.** É um fundo **limpo**: textura low-poly cinza-clara mais uma barra azul/preta no topo e outra
no rodapé. **Não** tem logo, assinatura nem carimbos. Mesmas dimensões do fundo do template aprovado,
**12,7× o peso dele**.

**`manual.pdf`** — 5 páginas em **1009,13 × 612,283 pt** (Legal 14″ × 8,5″, paisagem), remontado por
`pypdf`. O texto é **Liberation Sans**, que o conversor já tem. Os **títulos de página não são
texto**: `pdftotext` da página 1 devolve `Cliente / Nombre Actividad de Capacitación (Curso) / …` e
**nunca** `Libro de Control de Clases` — o título vive dentro da faixa de cabeçalho, um JPEG de
4205 × 378 (35,8 KB), ao lado do fundo de página de 4205 × 2173 (82 KB).

### 1.2 As fontes do certificado, identificadas pelo `name` table

`pdffonts` devolve nomes ofuscados pelo Word (`___WRD_EMBED_SUB_1235`). Descomprimindo os oito
programas de fonte embutidos e lendo o `name` table de cada um (`nameID 6`, PostScript name):

| Subset | Fonte real | Licença |
|---|---|---|
| `___WRD_EMBED_SUB_1224` | **Lexend-ExtraBold** | OFL |
| `___WRD_EMBED_SUB_1232` | **Lexend-Regular** e **Lexend-Bold** | OFL |
| `___WRD_EMBED_SUB_1226` | Lexend-Regular | OFL |
| `___WRD_EMBED_SUB_1229` | **Montserrat-ExtraBold** | OFL |
| `___WRD_EMBED_SUB_1235` | Comfortaa-Regular | OFL |
| `___WRD_EMBED_SUB_1219` | Roboto-Regular | Apache 2.0 |
| `BCDEEE` | ArialMT | proprietária (não será versionada) |

**Lexend é a família dominante** — três dos oito subsets. Montserrat ExtraBold é o título.
Nenhuma trava de licença: OFL e Apache 2.0 permitem versionar e embutir.

O conversor tem **DejaVu, Liberation, Carlito, Caladea e Noto**, e nenhuma geométrica arredondada.
Sem trazer a fonte, a fidelidade tipográfica é inalcançável.

### 1.3 A rota LibreOffice do Gotenberg, provada antes de virar decisão

`gotenberg/gotenberg:8` responde `415` (e não `404`) em `/forms/libreoffice/convert`: a rota existe.
Prova de ponta a ponta feita em 2026-08-10, **antes** de a decisão D1 entrar nesta spec — um pacote
OOXML mínimo montado à mão (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`; **1.207
bytes**) foi enviado à rota:

- `http=200`, PDF de **18.671 bytes**;
- **`Page size: 1008 × 612 pts`**, contra os 1009 × 612 do template — o `w:pgSz` de
  `w:w="20160" w:h="12240" w:orient="landscape"` reproduz o papel do template;
- `LiberationSans-Bold` **embutida** no PDF de saída;
- a célula com `w:shd w:fill="29A3E0"` saiu no azul da Lotus, com as bordas da `w:tblBorders`.

Não é premissa. É medição.

## 2. As quatro decisões de abertura (D1–D4)

Respondidas pelo João em 2026-08-10, antes do desenho. Registradas aqui com a alternativa recusada,
para que uma leitura futura saiba que foram escolha e não inércia.

**D1 — o manual passa a ter uma fonte de verdade só: Blade WordprocessingML.** A Blade renderiza
`word/document.xml`, o PHP empacota o OOXML com `ZipArchive` (extensão presente no container) e o
`.docx` resultante alimenta os dois destinos: download direto, e `/forms/libreoffice/convert` para
o PDF. **Recusada:** manter a Blade HTML para o PDF e acrescentar uma Blade OOXML para o DOCX —
seriam duas fontes de verdade para o mesmo documento, que é exatamente a classe de defeito que o
projeto já pagou com o transporte de PDF duplicado (`HtmlToPdf`, ADR-12: *"a cópia dupla do
transporte já divergiu"*). **Também recusada:** `phpoffice/phpword`, por ser dependência nova em
documento oficial e sair da lei "via Blade" que o João fixou.

**D2 — o manual passa a ofício paisagem (Legal 14″ × 8,5″), igual ao template.** **Isto reabre a
D4/D6 do bloco 6d**, que fixou A4 retrato com a justificativa escrita na própria Blade — *"o Libro
de Control de Clases é arquivado pelo cliente em A4, como todo documento oficial da Lotus"*. A
decisão anterior **não** foi esquecida nem sobrescrita em silêncio: foi apresentada ao João com as
três saídas (A4 paisagem, ofício paisagem, A4 retrato adaptado) e ele escolheu fidelidade literal ao
arquivo aprovado pela Lotus. **Consequência declarada:** o manual passa a ser o único documento
oficial da Lotus fora do A4, e o comentário da D4 na Blade morre junto com o `@page` que ele
explicava.

**D3 — o fundo vira JPEG de ~100 KB e vale só para o certificado.** É o que o documento aprovado já
faz: o mesmo fundo, nas mesmas dimensões, pesa 98.258 bytes dentro do `certificado.pdf`.
**Consequência declarada, aceita pelo João no texto da opção:** o manual fica **sem fundo raster**
nesta rodada — o fundo dele é outro (paisagem, 4205 × 2173) e não foi entregue como asset. Os
títulos de página do manual, que no template são raster, passam a ser **texto**.

**D4 — a tipografia do certificado vem de fonte versionada, embutida por `@font-face`.** WOFF2 em
`backend/resources/fonts/`, base64 no CSS da Blade. Autocontido: funciona igual em dev, no EC2 e em
qualquer conversor, sem depender do que está instalado no container. **Recusada:** montar TTF no
`/usr/share/fonts` do Gotenberg pelo compose — vira mudança de infra que precisa valer também em
produção, e um conversor sem a fonte **degrada em silêncio** para um fallback, que é falha muda em
documento com peso legal.

### 2.1 A interação entre D1 e D4, resolvida por medição

D4 é `@font-face` em **CSS**. O manual, por D1, deixa de passar por CSS: quem renderiza o PDF dele é
o LibreOffice, que resolve fonte **por nome instalado no container**, não por `@font-face`. As duas
decisões se contradiriam se o manual precisasse de fonte nova.

Ele não precisa: **o texto do `manual.pdf` é Liberation Sans**, medido por `pdffonts`, e Liberation
Sans **já está no Gotenberg** — o probe da §1.3 a embutiu no PDF de saída sem nenhuma instalação.

**Portanto D4 vale só para o certificado.** O manual usa Liberation Sans, que é literalmente a fonte
do template. Zero infra, zero licença, zero degradação silenciosa.

## 3. Certificado — o que muda e o que não pode mudar

### 3.1 O que não muda, e é o mais importante

O certificado é montado do **snapshot congelado** (D12, §4.7), tem peso legal e sustenta a rota
pública de validação por QR. Este bloco muda **apresentação**:

- `CertificateSnapshotData` e o schema do snapshot: intocados;
- `assertPresentable()` e o gate de `snapshot_ok`: intocados;
- resposta de `GET /api/certificates`, `GET /api/certificates/{id}` e da rota pública: **idênticas**,
  em forma e em valor;
- `generated.ts`: **sem diff** — nenhum DTO muda de forma.

### 3.2 Fundo

`fundo-certificado.jpg`, convertido do PNG entregue, nas mesmas dimensões (1414 × 2000), na faixa de
~100 KB que o documento aprovado pratica. Entra como `background-image` de `.page`, com o base64
declarado **uma vez** no `<style>` e reaproveitado pelas duas páginas.

As barras `.accent` **morrem**: o fundo já traz a barra azul/preta no topo e no rodapé. Isso fecha,
de graça, a **falha de enquadramento que está declarada em aberto** em `certificate.blade.php:130-138`
— a `.accent-bottom` é absoluta dentro do `.page`, ancora no pé do **bloco** e não da folha, e quando
o bloco pagina ela reaparece no meio de uma página em branco. Sem barra absoluta, sem defeito.

**Por que `background-image` e não `<img>` posicionado:** a Blade carrega uma regra de segurança
paga com defeito medido em 2026-08-08 — `min-height`, nunca `height`, porque com altura definida o
Chromium pinta o excedente **por cima** da página seguinte e o documento sai corrompido sem aviso.
`background-image` acompanha a caixa que cresce; um `<img>` absoluto reintroduziria exatamente a
ancoragem que a `.accent-bottom` já provou ser frágil.

### 3.3 Tipografia

| Elemento | Hoje | Passa a ser |
|---|---|---|
| `body`, `.lead`, `.narrative` | DejaVu Sans 11px | **Lexend Regular** |
| `h1` | DejaVu Sans bold 24px | **Montserrat ExtraBold** |
| `.name`, `.company`, `.course` | DejaVu Sans bold | **Lexend Bold / ExtraBold** |

Quatro faces WOFF2 com subset latino em `backend/resources/fonts/`, base64 no CSS. A licença de cada
uma (`OFL.txt`) entra versionada ao lado do arquivo.

**A tipografia mexe na largura da linha, e a largura da linha é entrada de um número calibrado.** O
limiar `80 × 7` do `@php` do topo veio de varredura no PDF real com DejaVu Sans; trocar a família
muda a capacidade por linha e o número deixa de valer. O plano tem de **remedir**, não herdar — e o
comentário que documenta a medição é atualizado no mesmo commit, sob pena de virar lição 13 (texto
afirmando o que o repositório não faz).

### 3.4 QR e bloco de identificação

Hoje: `.meta` (`N° <código>` + `Emisión: <data>`) abre a página 1 no canto superior **esquerdo**
(`:244-247`); o QR vive no rodapé dentro de `.footer-main`, a **32mm** (`:214-216`, `:313-316`).

Passa a ser: QR a **~22mm** no canto superior **direito** da página 1, com `N°` e `Emisión:`
imediatamente **abaixo** dele, como na referência que o João anexou. O `.meta` do canto esquerdo
desaparece porque seu conteúdo mudou de lugar — **nenhum dos dois campos é excluído**. O rodapé fica
com a assinatura sozinha, e a frase `Verifique la autenticidad…` acompanha o QR no topo.

O conteúdo do QR (URL de validação) e a resposta da rota pública **não mudam**.

## 4. Manual — cinco seções, ofício paisagem, preenchido

### 4.1 Seções, e o que é preenchido contra o que sai em branco

Uma seção por página, separadas por quebra explícita.

| # | Seção | Preenchido pelo sistema | Em branco, para a sala |
|---|---|---|---|
| 1 | Datos de la clase | cliente, curso, modalidade, local, data de início e término, relatores | — |
| 2 | Antecedentes Participantes | Nº, nome, RUT, empresa — uma linha por matrícula | Firma |
| 3 | Control de Asistencia | Nº e nome — uma linha por matrícula | grade dos 31 dias, firmas |
| 4 | Temas de La Capacitación | módulos ordenados, objetivos, conteúdos, horas T e P, total | — |
| 5 | Evaluaciones | Nº e nome — uma linha por matrícula | datas, nota final, firma |

O total de horas da seção 4 é **soma dos módulos**, calculada na projeção — não um campo digitado.

### 4.2 Forma

`w:pgSz w:w="20160" w:h="12240" w:orient="landscape"` (Legal paisagem), medido no probe da §1.3 como
1008 × 612 pt contra os 1009 × 612 do template. Fonte Liberation Sans (§2.1). Cabeçalho de cada
página: título em **texto**, Liberation Sans Bold centralizado, mais o logo LOTUS — o mesmo
`resources/images/lotus-logo.png` que o certificado já embute — no canto superior direito.

Sem fundo raster (D3). O que se perde em relação ao template são os ornamentos azuis e pretos das
quinas; o conteúdo, a estrutura e o papel são fiéis.

### 4.3 Onde o código mora

Nasce `App\Shared\Office\`, espelhando `App\Shared\Pdf\` — porque o motivo é o mesmo que o docblock
do `HtmlToPdf` já registra: **o transporte mora num lugar só, ou diverge.**

| Classe | Papel |
|---|---|
| `OoxmlPackager` | recebe as parts renderizadas e devolve os bytes do `.docx` (`ZipArchive`) |
| `DocxToPdf` (interface) | converte bytes de `.docx` em bytes de PDF |
| `GotenbergDocxToPdf` | adaptador de `/forms/libreoffice/convert` |
| `OfficeRenderException` | falha do conversor, no molde de `PdfRenderException` |

`ManualPdfService` deixa de montar HTML e passa a montar o `.docx`; o PDF vira uma segunda saída
sobre o mesmo pacote. O nome da classe é revisto no plano — ela não renderiza mais só PDF.

**A Blade OOXML precisa escapar como XML, não como HTML.** `{{ }}` do Blade escapa para HTML
(`htmlspecialchars`), o que cobre `& < >` e aspas, mas não protege contra caractere de controle
ilegal em XML 1.0, que corrompe o pacote inteiro em silêncio. O plano define um helper de escape
único e o teste que prova a corrupção contra dado hostil.

### 4.4 Rotas e UI

- `GET /api/turmas/{turma}/manual` — mantida, PDF, mesma permissão `operation.turma.view`;
- `GET /api/turmas/{turma}/manual/docx` — nova, DOCX, mesma permissão.

Rota explícita em vez de `?format=`: a permissão, o `Content-Type` e o `Content-Disposition` são
diferentes, e um parâmetro de query que troca o tipo do corpo esconde isso de quem lê a rota.

Na UI, `ManualButton` passa a oferecer os dois formatos, pela fronteira `shared/ui` — feature não
importa PrimeReact direto (§5.6). O hook `useTurmaManualOpener` já trata popup bloqueado e erro de
blob (`problemFromBlob`); o segundo formato reaproveita esse caminho em vez de abrir um paralelo.

## 5. Erro

Falha do conversor sobe pelo handler global RFC 7807, como hoje. **Nenhum `abort()`** —
`Domains/Operation/` tem guarda de zero ocorrências e ela continua valendo. `OfficeRenderException`
carrega o status do conversor, no molde de `PdfRenderException::converterFailed()`.

## 6. O que prova (DoD)

Cada item é comportamento medido, não pacote instalado.

1. **Peso, contra a linha de base real.** O PDF do certificado são mede **40.119 bytes** hoje
   (medido no gate de `certificacao-lote-e-snapshot`). Depois do bloco, o número novo é **medido e
   registrado**; o teto aceitável é a ordem do documento aprovado pela Lotus (`certificado.pdf`,
   251.450 bytes). Um PDF na casa dos megabytes reprova o DoD.
2. **O base64 do fundo aparece UMA vez no HTML do certificado.** Guarda automatizada — duas
   ocorrências dobram o HTML e são a causa provável do "travado" que o João relatou.
3. **O `.docx` é um pacote OOXML válido.** O teste abre o zip e assere as parts obrigatórias
   (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`) e o `w:pgSz` de ofício paisagem.
4. **Preenchimento provado por contagem.** Turma com N matrículas produz **N linhas** em cada uma das
   três grades de participantes, e o total de horas bate com a soma dos módulos.
5. **Os dois formatos saem da mesma turma e concordam.** E2E contra a API real: `GET …/manual` →
   `application/pdf`, `GET …/manual/docx` → `…wordprocessingml.document`; `pdfinfo` do PDF confirma o
   papel em ~1008 × 612 pt.
6. **Escape hostil não corrompe o pacote.** Turma com `&`, `<`, `>` e aspas em nome de cliente ou
   curso gera `.docx` que ainda abre e converte.
7. **O contrato do certificado saiu idêntico.** `generated.ts` sem diff; `GET /api/certificates`,
   `GET /api/certificates/{id}` e a rota pública do QR com a mesma forma e os mesmos valores de
   antes; `snapshot_ok` continuando a discriminar certificado são de corrompido.
8. **Visto renderizado.** Certificado e manual convertidos em PNG (`pdftoppm`) e comparados aos
   templates página a página. Fidelidade é o objetivo do bloco: um DoD que não olha o documento não
   prova nada aqui.
9. **Fonte de verdade única do manual, provada.** O PDF do manual é gerado **a partir do mesmo
   `.docx`** que o download entrega — não de um segundo caminho.
10. **Ferramentas.** Suíte backend verde a partir da linha de base do commit de abertura; Pint nos
    `.php` do bloco; `pnpm lint` e `pnpm build` verdes; `typescript:transform` sem diff.

## 7. Fora de escopo

- assinatura da gerente, carimbos SENCE/NCH e selo de resolução — o fundo entregue é limpo e o
  bloco não inventa peça de valor legal;
- fundo raster do manual (D3);
- manual personalizado por curso — **P-08 não dispara**: o bloco mantém Blade única padronizada;
- preenchimento de assistência e nota pelo sistema — as grades saem em branco, como no template;
- alterar o schema do snapshot, o conteúdo do certificado ou qualquer resposta de API existente;
- `PRUEBAS` e `EVALUACION_REDATOR` gerados por código — é a parte do FUT-1 que continua futura.

## 8. Risco de review

**ALTO RISCO.** O bloco toca **documento com peso legal** (o certificado sustenta a validação
pública por QR) e acrescenta **dependência de infra nova em caminho de produção** (a rota LibreOffice
do Gotenberg). Os dois gatilhos do gabarito estão presentes.

→ **duas frentes: lente Claude com o gabarito do projeto e segunda frente do Codex read-only.**

Superfícies que o review tem de cobrir por nome: o snapshot e o `assertPresentable` intocados; a
ausência de diff em `generated.ts`; o limiar `80 × 7` **remedido** e não herdado; a `min-height`
preservada; o escape XML da Blade OOXML; e o peso dos dois documentos medido, não estimado.

## 9. Isolamento

Toca `backend/` → **main tree, sem worktree (P-03)**. Branch
`refactor/documentos-oficiais-template-e-docx`, criada de `72505f5`, com o commit de seleção
(`9cbcb2b`) dentro dela. Nenhum outro `active_work_item` de backend está aberto, então o gatilho de
fechamento da P-03 continua não vencido.

Zero schema → `docs/adrs.md` e `docs/der-fisico.md` não abrem. **`docs/adrs.md` abre por outro
motivo:** `App\Shared\Office\` e a rota LibreOffice são decisão de arquitetura de transporte, irmã
do ADR-12 — o plano decide se vira ADR novo ou nota no ADR-12, e o João aprova.
