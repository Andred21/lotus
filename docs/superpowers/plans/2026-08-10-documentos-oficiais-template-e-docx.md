# Documentos oficiais — fidelidade ao template e saída DOCX do manual — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** aproximar o certificado do `docs/templates/certificado.pdf` (fundo, tipografia, bloco de
QR) e refazer o manual de classe conforme o `docs/templates/manual.pdf`, preenchido com os dados da
turma, com PDF e DOCX saindo do **mesmo** pacote OOXML gerado por Blade.

**Architecture:** o certificado continua HTML→PDF por Chromium (`Shared\Pdf`), ganhando fundo JPEG
embutido e duas famílias WOFF2 versionadas. O manual troca de rota: Blade renderiza
WordprocessingML, `App\Shared\Office\OoxmlPackager` empacota o `.docx` com `ZipArchive`, o download
entrega esse pacote e o PDF sai dele por `/forms/libreoffice/convert`. Uma fonte de verdade, dois
destinos.

**Tech Stack:** Laravel 13 / PHP 8.3 · Blade · `ZipArchive` (presente no container) · Gotenberg
8.34.0 (`/forms/chromium/convert/html`, `/forms/chromium/screenshot/html`,
`/forms/libreoffice/convert`) · React 19 + TS · PrimeReact via `shared/ui`.

**Spec:** `docs/superpowers/specs/2026-08-10-documentos-oficiais-template-e-docx-design.md`
(aprovada pelo João em 2026-08-10).

## Global Constraints

Valem em **toda** task. Não repetidas dentro delas.

- **`min-height`, NUNCA `height`, em `.page`** do certificado. Regra de segurança paga com defeito
  medido em 2026-08-08 (Chromium pinta o excedente por cima da página seguinte). O comentário de 34
  linhas que a documenta em `certificate.blade.php:79-112` **permanece**.
- **`generated.ts` sem diff.** Nenhum DTO muda de forma neste bloco.
- **Snapshot do certificado intocado:** `CertificateSnapshotData`, `assertPresentable()` e o gate de
  `snapshot_ok` não são editados. As respostas de `GET /api/certificates`,
  `GET /api/certificates/{id}` e da rota pública saem idênticas em forma **e** em valor.
- **Nenhum `abort()`** em `Domains/Operation/` — a guarda de zero ocorrências continua valendo. Erro
  de conversor sobe pelo handler global RFC 7807.
- **Backend roda no container:** `docker compose exec -T app php artisan test …`. **Pint roda no
  host, de dentro de `backend/`, sempre com argumentos** — nunca `./vendor/bin/pint` sem path.
- **Baseline medido em `a703a26`:** `503 passed, 1 skipped (1868 assertions)`. Toda contagem
  esperada neste plano parte daí.
- **Branch:** `refactor/documentos-oficiais-template-e-docx`, **main tree, sem worktree (P-03)**.
  Um commit por task, sempre com a suíte verde.
- Cor institucional do template, medida no `manual.docx`: **`25A5E4`** (não `29A3E0`, que é a do
  CSS do certificado). Bordas escuras `202020`, bordas claras `A8A8A8`, zebra `EFEFEF` / `ECECEC`.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `backend/resources/images/fundo-certificado.jpg` | fundo do certificado, JPEG 1414×2000 |
| `backend/resources/fonts/lexend-latin.woff2` | Lexend variável, subset latino (400/700/800) |
| `backend/resources/fonts/montserrat-800-latin.woff2` | Montserrat 800, subset latino |
| `backend/resources/fonts/lexend-OFL.txt` · `montserrat-OFL.txt` | licenças, versionadas ao lado |
| `backend/app/Shared/Office/Xml.php` | escape XML 1.0 + quebra de linha OOXML |
| `backend/app/Shared/Office/OoxmlPackager.php` | mapa de parts → bytes do `.docx` |
| `backend/app/Shared/Office/DocxToPdf.php` | interface do transporte DOCX→PDF |
| `backend/app/Shared/Office/GotenbergDocxToPdf.php` | adaptador de `/forms/libreoffice/convert` |
| `backend/app/Shared/Office/OfficeRenderException.php` | falha do conversor |
| `backend/resources/views/operation/manual/document.blade.php` | `word/document.xml` — o conteúdo |
| `backend/resources/views/operation/manual/content-types.blade.php` | `[Content_Types].xml` |
| `backend/resources/views/operation/manual/rels.blade.php` | `_rels/.rels` |
| `backend/resources/views/operation/manual/document-rels.blade.php` | `word/_rels/document.xml.rels` |
| `backend/resources/views/operation/manual/partials/encabezado.blade.php` | faixa de cabeçalho: título em texto + logo |
| `backend/app/Domains/Operation/Services/ManualDocumentService.php` | monta o `.docx`; o PDF sai dele |
| `backend/tests/Support/Office/FakeDocxToPdf.php` | dobradura: guarda o `.docx` que recebeu |
| `backend/tests/Feature/Shared/OfficeAssetTest.php` | guarda de peso/dimensão dos assets |
| `backend/tests/Feature/Shared/OoxmlPackagerTest.php` | pacote válido, escape hostil |

**Modificados**

| Arquivo | O que muda |
|---|---|
| `backend/resources/views/certification/certificate.blade.php` | fundo, `@font-face`, tipografia, QR, morte do `.accent` |
| `backend/app/Domains/Certification/Services/CertificatePdfService.php` | passa fundo e fontes ao Blade |
| `backend/app/Providers/AppServiceProvider.php` | binding `DocxToPdf`, diretivas `@xml`/`@xmlLines` |
| `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` | `manual` + `manualDocx` |
| `backend/app/Domains/Operation/routes.php` | rota `turmas/{turma}/manual/docx` |
| `backend/tests/Feature/Operation/ManualTurmaTest.php` | asserções passam a ser sobre o OOXML |
| `backend/tests/Feature/Certification/CertificatePdfTest.php` | guardas de fundo, fonte e QR |
| `frontend/src/features/operation/api/useTurmas.ts` | mutation do DOCX |
| `frontend/src/features/operation/hooks/useTurmaManualOpener.ts` | dois formatos, um caminho |
| `frontend/src/features/operation/components/Document/ManualButton.tsx` | dois botões |
| `frontend/src/shared/config/locales/{es-CL,en,pt-BR}.json` | chaves `manualPdf` / `manualDocx` |

**Apagado**

- `backend/resources/views/operation/manual-turma.blade.php` — substituído pela Blade OOXML. Deixar
  os dois vivos recria a cópia dupla que o docblock do `HtmlToPdf` já registra como defeito pago.

---

## Task 0: Baseline

**Files:** nenhum. Só medição.

- [ ] **Step 1: Confirmar a árvore limpa e o commit de partida**

```bash
cd /home/jvbat/projetos/lotus
git status --short
git log --oneline -1
```

Esperado: saída vazia no `status`; `a703a26 chore(state): bola com o João no gate de leitura da spec`.

- [ ] **Step 2: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `Tests:  1 skipped, 503 passed (1868 assertions)`.

- [ ] **Step 3: Confirmar `generated.ts` sem diff**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/api/generated.ts
```

Esperado: `typescript:transform` conclui; `git diff --stat` **vazio**.

- [ ] **Step 4: Confirmar o frontend verde**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build
```

Esperado: ESLint sem erro; `tsc -b && vite build` conclui.

Sem commit — Task 0 é medição.

---

## Task 1: Fundo do certificado em JPEG versionado

**Files:**
- Create: `backend/resources/images/fundo-certificado.jpg`
- Create: `backend/tests/Feature/Shared/OfficeAssetTest.php`

**Interfaces:**
- Consumes: `docs/templates/fundo-certificado.png` (1414×2000 RGBA, 1.245.172 bytes), já versionado.
- Produces: `resource_path('images/fundo-certificado.jpg')` — JPEG 1414×2000, **74.604 bytes**,
  consumido pelo `CertificatePdfService` na Task 3.

O ambiente **não tem codificador JPEG**: a GD do container é compilada só com `libpng-dev`
(`docker/php/Dockerfile:2`), então `imagejpeg()` não existe, e não há PIL, sharp, imagemagick nem
ffmpeg no host. A conversão usa o Chromium que o projeto **já roda**, pela rota
`/forms/chromium/screenshot/html` do Gotenberg — medida e provada em 2026-08-10 (§Desvios, D-P1).
Nenhuma mudança de infra.

- [ ] **Step 1: Escrever a guarda, que falha porque o asset não existe**

Criar `backend/tests/Feature/Shared/OfficeAssetTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * Assets versionados dos documentos oficiais. Peso é requisito do bloco, não
 * detalhe: o "visualizador travado" que o João relatou foi medido como excesso
 * de bytes embutidos, e o teto vem do documento que a Lotus já aprovou.
 *
 * O JPEG é REPRODUZÍVEL, e a receita mora aqui porque é aqui que ela é cobrada.
 * Com o compose de pé (`docker compose up -d`):
 *
 *   docker compose cp docs/templates/fundo-certificado.png app:/tmp/fundo.png
 *   docker compose exec -T app sh -c 'cd /tmp && printf "%s" \
 *     "<!doctype html><html><head><style>html,body{margin:0;padding:0}
 *      img{display:block;width:1414px;height:2000px}</style></head>
 *      <body><img src=\"fundo.png\"></body></html>" > shot.html && \
 *     curl -s -o out.jpg -F "files=@shot.html;filename=index.html" \
 *       -F "files=@fundo.png" -F "format=jpeg" -F "quality=92" \
 *       -F "width=1414" -F "height=2000" \
 *       http://gotenberg:3000/forms/chromium/screenshot/html'
 *   docker compose cp app:/tmp/out.jpg backend/resources/images/fundo-certificado.jpg
 *
 * `quality=92` foi escolhido por varredura: 92 → 74.604 B, 85 → 41.002,
 * 78 → 34.249, 70 → 29.889. O maior valor que ainda passa folgado sob o teto
 * preserva o gradiente low-poly, que é onde JPEG agressivo faz banding.
 */
class OfficeAssetTest extends TestCase
{
    /**
     * O teto NÃO é palpite: 98.258 bytes é o peso do MESMO fundo, nas mesmas
     * dimensões, dentro do `docs/templates/certificado.pdf` aprovado pela
     * Lotus (extraído com `pdfimages -j`). O PNG entregue tem 1.245.172.
     */
    public function test_fundo_do_certificado_e_jpeg_1414x2000_mais_leve_que_o_template(): void
    {
        $path = resource_path('images/fundo-certificado.jpg');

        $this->assertFileExists($path);

        $info = getimagesize($path);
        $this->assertNotFalse($info);
        $this->assertSame([1414, 2000], [$info[0], $info[1]]);
        $this->assertSame(IMAGETYPE_JPEG, $info[2]);

        $this->assertLessThan(
            98258,
            filesize($path),
            'O fundo passou do peso do mesmo fundo dentro do certificado aprovado.',
        );
    }
}
```

- [ ] **Step 2: Ver a guarda vermelha**

```bash
docker compose exec -T app php artisan test --filter=OfficeAssetTest
```

Esperado: FAIL — `Failed asserting that file "…/resources/images/fundo-certificado.jpg" exists.`

- [ ] **Step 3: Gerar o JPEG**

Executar exatamente a receita do docblock do Step 1 (três comandos), terminando com o
`docker compose cp` que grava `backend/resources/images/fundo-certificado.jpg`.

- [ ] **Step 4: Ver a guarda verde e conferir o arquivo**

```bash
docker compose exec -T app php artisan test --filter=OfficeAssetTest
file backend/resources/images/fundo-certificado.jpg
ls -la backend/resources/images/fundo-certificado.jpg
```

Esperado: PASS; `JPEG image data, … 1414x2000, components 3`; **74604** bytes.

- [ ] **Step 5: Olhar o fundo renderizado**

Abrir `backend/resources/images/fundo-certificado.jpg` com `Read`. Esperado: textura low-poly
cinza-clara, barra azul (esquerda) + preta (direita) no topo, barra preta (esquerda) + azul
(direita) no rodapé. **Sem** logo, assinatura ou carimbo — o fundo é limpo, e é por isso que a
assinatura e o QR continuam sendo conteúdo do Blade.

- [ ] **Step 6: Commit**

```bash
git add backend/resources/images/fundo-certificado.jpg backend/tests/Feature/Shared/OfficeAssetTest.php
git commit -m "feat(certification): fundo do certificado em JPEG 1414x2000 (74 KB)"
```

---

## Task 2: Fontes do template versionadas

**Files:**
- Create: `backend/resources/fonts/lexend-latin.woff2`, `montserrat-800-latin.woff2`,
  `lexend-OFL.txt`, `montserrat-OFL.txt`
- Modify: `backend/tests/Feature/Shared/OfficeAssetTest.php`

**Interfaces:**
- Produces: `resource_path('fonts/lexend-latin.woff2')` (39.680 B) e
  `resource_path('fonts/montserrat-800-latin.woff2')` (19.012 B), consumidos pelo
  `CertificatePdfService` na Task 4.

Os dois arquivos são **fontes variáveis**: o Google Fonts serve a **mesma** URL para os pesos 400,
700 e 800 do Lexend. São dois arquivos, não quatro (§Desvios, D-P2).

- [ ] **Step 1: Escrever a guarda, que falha porque os arquivos não existem**

Acrescentar ao `OfficeAssetTest`:

```php
    /**
     * As fontes do `docs/templates/certificado.pdf`, identificadas pelo `name`
     * table dos programas embutidos (o Word ofusca os nomes como
     * `___WRD_EMBED_SUB_1235`): Lexend é a família dominante — três dos oito
     * subsets — e Montserrat ExtraBold é o título. Ambas OFL.
     *
     * São VARIÁVEIS: o Google Fonts serve a mesma URL para 400, 700 e 800 do
     * Lexend, então dois arquivos cobrem os quatro pesos que o documento usa.
     * Reproduzir (no host, de `backend/`):
     *
     *   curl -sA "Mozilla/5.0 … Chrome/120 …" -o resources/fonts/lexend-latin.woff2 \
     *     https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU.woff2
     *   curl -sA "Mozilla/5.0 … Chrome/120 …" -o resources/fonts/montserrat-800-latin.woff2 \
     *     https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr73w5aXo.woff2
     *
     * As URLs saem do bloco `/* latin *\/` de
     * `https://fonts.googleapis.com/css2?family=Lexend:wght@400;700;800&family=Montserrat:wght@800`
     * — já subsetadas em `U+0000-00FF` mais pontuação, que cobre o espanhol.
     */
    public function test_fontes_do_certificado_estao_versionadas_com_licenca(): void
    {
        foreach ([
            'fonts/lexend-latin.woff2' => 60_000,
            'fonts/montserrat-800-latin.woff2' => 40_000,
        ] as $relative => $ceiling) {
            $path = resource_path($relative);
            $this->assertFileExists($path);
            $this->assertSame('wOF2', file_get_contents($path, length: 4), "{$relative} não é WOFF2.");
            $this->assertLessThan($ceiling, filesize($path), "{$relative} passou do subset latino.");
        }

        // Fonte OFL sem o texto da licença ao lado é distribuição irregular.
        $this->assertFileExists(resource_path('fonts/lexend-OFL.txt'));
        $this->assertFileExists(resource_path('fonts/montserrat-OFL.txt'));
    }
```

- [ ] **Step 2: Ver a guarda vermelha**

```bash
docker compose exec -T app php artisan test --filter=test_fontes_do_certificado
```

Esperado: FAIL — `Failed asserting that file "…/resources/fonts/lexend-latin.woff2" exists.`

- [ ] **Step 3: Baixar as fontes e as licenças**

```bash
cd /home/jvbat/projetos/lotus/backend
mkdir -p resources/fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
curl -s -A "$UA" -o resources/fonts/lexend-latin.woff2 \
  https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU.woff2
curl -s -A "$UA" -o resources/fonts/montserrat-800-latin.woff2 \
  https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr73w5aXo.woff2
curl -s -o resources/fonts/lexend-OFL.txt \
  https://raw.githubusercontent.com/googlefonts/lexend/main/OFL.txt
curl -s -o resources/fonts/montserrat-OFL.txt \
  https://raw.githubusercontent.com/JulietaUla/Montserrat/master/OFL.txt
ls -la resources/fonts/
```

Esperado: `lexend-latin.woff2` **39680**, `montserrat-800-latin.woff2` **19012**, e as duas licenças
começando por `Copyright … Lexend Project Authors` e `Copyright … Montserrat.Git Project Authors`.

- [ ] **Step 4: Ver a guarda verde**

```bash
docker compose exec -T app php artisan test --filter=OfficeAssetTest
```

Esperado: `Tests: 2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/resources/fonts backend/tests/Feature/Shared/OfficeAssetTest.php
git commit -m "feat(certification): versiona Lexend e Montserrat com licenca OFL"
```

---

## Task 3: Certificado — fundo aplicado e morte do `.accent`

**Files:**
- Modify: `backend/resources/views/certification/certificate.blade.php`
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php`
- Modify: `backend/tests/Feature/Certification/CertificatePdfTest.php`

**Interfaces:**
- Consumes: `resource_path('images/fundo-certificado.jpg')` (Task 1).
- Produces: variável Blade `$fundo` (base64 do JPEG), declarada **uma vez** no `<style>`.

O fundo entregue traz a barra azul/preta no topo e no rodapé, então as quatro `<div class="accent">`
morrem. Isso fecha de graça a **falha de enquadramento declarada em aberto** em
`certificate.blade.php:130-138` — a `.accent-bottom` ancora no pé do bloco, não da folha, e reaparece
no meio da página 2 quando o bloco pagina.

`background-repeat: repeat-y` com `background-size: 100% 297mm` **e não** `100% 100%`: com
`min-height` a folha pode crescer além de 297mm, e um fundo esticado deformaria as barras em vez de
dar à página excedente o seu próprio fundo.

- [ ] **Step 1: Escrever as guardas, que falham contra o código de hoje**

Acrescentar ao `CertificatePdfTest`, no idioma que o arquivo já usa — `fakeGotenberg()` troca o
conversor pelo `FakeHtmlToPdf`, `pdfUrl()` monta a URL e `assertHtml()` recebe o HTML que o documento
mandou:

```php
    /**
     * O base64 do fundo aparece UMA vez. Duas ocorrências dobram o HTML, e é
     * exatamente essa classe de excesso que produziu o "visualizador travado".
     * `background-image` num `.page` compartilhado é o que garante a unicidade;
     * um `<img>` por página a quebraria — e reintroduziria a ancoragem absoluta
     * que a `.accent-bottom` já provou frágil.
     */
    public function test_fundo_embutido_uma_unica_vez(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $jpeg = base64_encode((string) file_get_contents(resource_path('images/fundo-certificado.jpg')));

        $this->assertSame(
            1,
            substr_count($this->pdf->lastHtml(), $jpeg),
            'O fundo foi embutido mais de uma vez.',
        );
        $this->assertHtml(fn (string $html): bool => str_contains($html, 'background-repeat: repeat-y')
            && str_contains($html, 'background-size: 100% 297mm'));
    }

    /**
     * A barra `.accent` era desenhada em CSS porque o fundo antigo não a tinha.
     * O fundo novo traz as duas. Manter a barra a duplicaria sobre si mesma —
     * e manteria viva a falha de enquadramento de `:130-138`.
     */
    public function test_barras_accent_morreram_com_o_fundo_novo(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => ! str_contains($html, 'accent')
            && ! str_contains($html, 'linear-gradient'));
    }

    /** A regra de segurança de 2026-08-08 continua de pé. */
    public function test_folha_continua_com_min_height_e_nunca_height(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => preg_match(
            '/\.page\s*\{[^}]*min-height:\s*297mm;/s', $html,
        ) === 1 && preg_match(
            '/\.page\s*\{[^}]*[^-]height:\s*297mm;/s', $html,
        ) === 0);
    }
```

- [ ] **Step 2: Ver as três guardas vermelhas**

```bash
docker compose exec -T app php artisan test --filter=CertificatePdfTest
```

Esperado: `test_fundo_embutido_uma_unica_vez` FAIL (`file_get_contents` acha o arquivo, mas
`substr_count` devolve 0 — `Failed asserting that 0 is identical to 1`) e
`test_barras_accent_morreram_com_o_fundo_novo` FAIL (`accent` está no HTML).
`test_folha_continua_com_min_height_e_nunca_height` **passa já** — é guarda de regressão, não de
mudança.

- [ ] **Step 3: Passar o fundo ao Blade**

Em `CertificatePdfService::html()`, junto do `logo`:

```php
            // Embutida como o QR e o logo, e pelo mesmo motivo: o conversor
            // recebe só o HTML. JPEG e não PNG — o mesmo fundo, nas mesmas
            // dimensões, pesa 98.258 bytes dentro do certificado aprovado pela
            // Lotus contra 1.245.172 do PNG entregue.
            'fundo' => base64_encode((string) file_get_contents(
                resource_path('images/fundo-certificado.jpg'),
            )),
```

- [ ] **Step 4: Aplicar o fundo e remover o `.accent` do Blade**

Em `certificate.blade.php`, dentro de `.page` (mantendo o comentário de `min-height` intacto):

```css
        .page {
            background-image: url("data:image/jpeg;base64,{{ $fundo }}");
            background-origin: border-box;
            background-position: top center;
            /* `repeat-y` com slab de 297mm, NUNCA `100% 100%`: a folha usa
               `min-height` e pode crescer: esticar deformaria as barras, e
               repetir dá à página excedente o fundo dela. */
            background-repeat: repeat-y;
            background-size: 100% 297mm;
            display: flex;
            flex-direction: column;
            min-height: 297mm;
            padding: 14mm 16mm 8mm;
            page-break-after: always;
            position: relative;
        }
```

Apagar as regras `.accent`, `.accent-top` e `.accent-bottom` (`:122-138`), **incluindo** o comentário
de falha em aberto — ele descreve um defeito que deixou de existir; mantê-lo vira lição 13. Apagar as
quatro `<div class="accent …"></div>` (`:242`, `:330`, `:335`, `:366`).

- [ ] **Step 5: Ver as guardas verdes e a suíte inteira**

```bash
docker compose exec -T app php artisan test --filter=CertificatePdfTest
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `CertificatePdfTest` todo verde; suíte `1 skipped, 508 passed` — 503 do baseline, +1 da
Task 1, +1 da Task 2, +3 desta.

- [ ] **Step 6: Olhar as duas páginas renderizadas**

```bash
docker compose exec -T app php artisan tinker --execute="\
file_put_contents('/tmp/cert.pdf', app(\App\Domains\Certification\Services\CertificatePdfService::class)\
  ->render(\App\Domains\Certification\Models\Certificate::first()));"
docker compose cp app:/tmp/cert.pdf /tmp/cert.pdf
pdfinfo /tmp/cert.pdf
pdftoppm -png -r 100 -f 1 -l 2 /tmp/cert.pdf /tmp/cert-novo
```

Abrir `/tmp/cert-novo-1.png` e `/tmp/cert-novo-2.png` com `Read`. Esperado: fundo low-poly com as
barras azul/preta nas **duas** páginas, sem barra em gradiente duplicada, `Page size: 595.28 x
841.89 pts (A4)`, e nenhum elemento sobreposto.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint \
  app/Domains/Certification/Services/CertificatePdfService.php \
  tests/Feature/Certification/CertificatePdfTest.php
cd /home/jvbat/projetos/lotus
git add backend/resources/views/certification/certificate.blade.php \
        backend/app/Domains/Certification/Services/CertificatePdfService.php \
        backend/tests/Feature/Certification/CertificatePdfTest.php
git commit -m "feat(certification): fundo do template no certificado e morte das barras accent"
```

---

## Task 4: Certificado — tipografia do template e remedição do limiar

**Files:**
- Modify: `backend/resources/views/certification/certificate.blade.php`
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php`
- Modify: `backend/tests/Feature/Certification/CertificatePdfTest.php`

**Interfaces:**
- Consumes: `resource_path('fonts/*.woff2')` (Task 2).
- Produces: variáveis Blade `$lexend` e `$montserrat` (base64 WOFF2).

**Esta task muda a largura da linha, e a largura da linha é entrada de um número calibrado.** O
`$narrativeCharsPerLine = 80` veio de varredura no PDF real com DejaVu Sans. Lexend tem métrica
diferente. O plano **remede**; herdar o número o transformaria numa afirmação que o repositório não
sustenta.

- [ ] **Step 1: Escrever a guarda de tipografia, que falha contra o código de hoje**

```php
    /**
     * A tipografia do documento aprovado, embutida e não instalada: um conversor
     * sem a fonte degrada em SILÊNCIO para um fallback, e falha muda em
     * documento com peso legal é o que a decisão D4 recusou.
     */
    public function test_fontes_do_template_embutidas_por_font_face(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        foreach (['fonts/lexend-latin.woff2', 'fonts/montserrat-800-latin.woff2'] as $font) {
            $b64 = base64_encode((string) file_get_contents(resource_path($font)));
            $this->assertSame(1, substr_count($html, $b64), "{$font} não foi embutida uma única vez.");
        }

        $this->assertHtml(fn (string $h): bool => str_contains($h, "font-family: 'Lexend'")
            && str_contains($h, "font-family: 'Montserrat'")
            && ! str_contains($h, 'DejaVu Sans'));
    }
```

- [ ] **Step 2: Ver a guarda vermelha**

```bash
docker compose exec -T app php artisan test --filter=test_fontes_do_template_embutidas
```

Esperado: FAIL — `lexend-latin.woff2 não foi embutida uma única vez. Failed asserting that 0 is
identical to 1.`

- [ ] **Step 3: Passar as fontes ao Blade**

Em `CertificatePdfService::html()`:

```php
            // Fontes VARIÁVEIS: um arquivo cobre 400/700/800 do Lexend, então
            // são duas faces e não quatro. Subset latino (~39 KB + ~19 KB).
            'lexend' => base64_encode((string) file_get_contents(
                resource_path('fonts/lexend-latin.woff2'),
            )),
            'montserrat' => base64_encode((string) file_get_contents(
                resource_path('fonts/montserrat-800-latin.woff2'),
            )),
```

- [ ] **Step 4: Declarar as faces e trocar a escala tipográfica**

No topo do `<style>` de `certificate.blade.php`, antes do `@page`:

```css
        /* Lexend é a família dominante do `docs/templates/certificado.pdf` —
           três dos oito subsets embutidos — e Montserrat ExtraBold é o título.
           `font-weight: 100 900` porque as duas são variáveis: o navegador
           interpola o peso do MESMO arquivo. */
        @font-face {
            font-family: 'Lexend';
            font-style: normal;
            font-weight: 100 900;
            src: url("data:font/woff2;base64,{{ $lexend }}") format('woff2');
        }
        @font-face {
            font-family: 'Montserrat';
            font-style: normal;
            font-weight: 800;
            src: url("data:font/woff2;base64,{{ $montserrat }}") format('woff2');
        }
```

E a escala, medida no render do template (`pdftoppm -r 100` de `docs/templates/certificado.pdf`):

| Seletor | Hoje | Passa a ser |
|---|---|---|
| `body` | `DejaVu Sans, Arial, sans-serif` | `'Lexend', Arial, sans-serif` |
| `h1` | `24px`, sem família própria | `font-family: 'Montserrat'; font-weight: 800; font-size: 27px; letter-spacing: 0;` |
| `.name` | `20px bold` | `font-size: 20px; font-weight: 700;` |
| `.rut` | `15px` | `font-size: 15px; font-weight: 700;` |
| `.company` | `13px bold` | `font-size: 14px; font-weight: 700; color: #29a3e0;` |
| `.course` | `17px bold`, azul | `font-size: 17px; font-weight: 700; color: #3f3f3f;` |
| `.signature-name` | `bold` | `font-weight: 700` |

`h1` perde o `letter-spacing: 1px`: Montserrat ExtraBold já é largo, e o espaçamento extra estoura a
linha única do título no A4. `.company` e `.course` **trocam de cor entre si** — no template a
empresa é azul e o nome do curso é escuro; hoje é o inverso.

Acrescentar as duas réguas horizontais do template, que hoje não existem:

```css
        .company { border-bottom: 1px solid #c9c9c9; border-top: 1px solid #c9c9c9; padding: 3mm 0; }
        .registro { border-bottom: 1px solid #c9c9c9; padding-bottom: 3mm; }
```

- [ ] **Step 5: Ver a guarda verde**

```bash
docker compose exec -T app php artisan test --filter=CertificatePdfTest
```

Esperado: tudo verde. A suíte inteira, ao fim desta task, fica em `1 skipped, 509 passed`.

- [ ] **Step 6: REMEDIR o limiar da elisão**

O limiar `$narrativeLines * $narrativeCharsPerLine` tem de ficar logo **abaixo** da menor capacidade
das 7 linhas de 11px na fonte nova. Varrer no PDF real, com o perfil que produziu o piso antigo
(palavras uniformes de 25 caracteres — a ordem das mais longas do espanhol):

```bash
docker compose exec -T app php artisan tinker --execute="\
\$svc = app(\App\Domains\Certification\Services\CertificatePdfService::class);
\$c = \App\Domains\Certification\Models\Certificate::first();
foreach ([480,500,520,540,560,580,600,620,640] as \$n) {
  \$s = \$c->snapshot->toArray();
  \$s['curso']['description'] = trim(str_repeat(str_repeat('a',25).' ', (int) ceil(\$n/26)));
  \$s['curso']['description'] = mb_substr(\$s['curso']['description'], 0, \$n);
  \$c->snapshot = \$s;
  file_put_contents(\"/tmp/sweep-\$n.pdf\", \$svc->render(\$c));
}"
for n in 480 500 520 540 560 580 600 620 640; do
  docker compose cp app:/tmp/sweep-$n.pdf /tmp/sweep-$n.pdf >/dev/null
  printf "%s: " "$n"
  pdftotext -f 1 -l 1 /tmp/sweep-$n.pdf - | grep -c '…' || true
done
```

O piso é o **menor** `n` cuja página 1 já contém `…`. Repetir com prosa espanhola real (palavra
média ~5,5) para confirmar que o perfil de 25 caracteres continua sendo o pior caso.

- [ ] **Step 7: Reescrever o número e o comentário no mesmo commit**

Atualizar `$narrativeCharsPerLine` para `floor(piso_medido / 7)` e **reescrever a tabela de varredura
do `@php`** (`:26-55`) com os números novos, mantendo a estrutura do texto: a data da medição passa a
ser 2026-08-10, a fonte medida passa a ser Lexend, e a faixa de validade do modelo é remedida. O
comentário que afirma "medido no PDF real, varrendo o comprimento da descrição" tem de descrever
**esta** varredura — texto afirmando o que o repositório não faz é lição 13.

Ajustar também a asserção do `CertificatePdfTest` que cita o `508` da faixa de validade, para o valor
remedido.

- [ ] **Step 8: Ver a suíte e olhar as páginas**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Regerar `/tmp/cert-novo-1.png` e `/tmp/cert-novo-2.png` (Task 3, Step 6) e abrir com `Read`.
Esperado: título em Montserrat ExtraBold, corpo em Lexend, empresa azul entre duas réguas, nome do
curso escuro, e a página 1 fechando **sem** empurrar o rodapé para uma página nova.

- [ ] **Step 9: Commit**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint \
  app/Domains/Certification/Services/CertificatePdfService.php \
  tests/Feature/Certification/CertificatePdfTest.php
cd /home/jvbat/projetos/lotus
git add backend/resources/views/certification/certificate.blade.php \
        backend/app/Domains/Certification/Services/CertificatePdfService.php \
        backend/tests/Feature/Certification/CertificatePdfTest.php
git commit -m "feat(certification): tipografia Lexend/Montserrat e limiar de elisao remedido"
```

---

## Task 5: Certificado — QR e bloco de identificação no topo direito

**Files:**
- Modify: `backend/resources/views/certification/certificate.blade.php`
- Modify: `backend/tests/Feature/Certification/CertificatePdfTest.php`

**Interfaces:**
- Consumes: `$qr` e `$certificate->codigo` / `$snapshot->emitido_em`, já passados pelo serviço.
- Produces: nenhuma variável nova. O conteúdo do QR (URL de validação) **não muda**.

Hoje `.meta` (`N°` + `Emisión:`) abre a página 1 no canto superior **esquerdo** (`:244-247`) e o QR
vive no rodapé, a 32mm (`:214-216`, `:313-316`). Passa a ser um bloco único no canto superior
**direito**: QR a 22mm com os dois campos logo abaixo. **Nenhum dos dois campos é excluído.**

- [ ] **Step 1: Escrever a guarda, que falha contra o código de hoje**

```php
    /**
     * O QR sobe para o topo direito e leva o par código/emissão junto — mudança
     * de LUGAR, não de conteúdo. O que a rota pública valida é o UUID dentro do
     * QR, e ele não muda; esta guarda existe para que a realocação não apague
     * silenciosamente um dos dois campos de identificação.
     */
    public function test_qr_e_identificacao_formam_um_bloco_no_topo(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        $this->assertStringContainsString('class="identificacion"', $html);
        $this->assertStringContainsString('N° LOT-2026-1000', $html);
        $this->assertStringContainsString('Emisión:', $html);

        // O QR encolheu: 32mm no rodapé viram 22mm no topo.
        $this->assertMatchesRegularExpression('/\.identificacion img\s*\{[^}]*width:\s*22mm;/s', $html);

        // O bloco abre a folha, antes do logo; o rodapé fica só com a assinatura.
        $this->assertLessThan(
            strpos($html, 'class="brand"'),
            strpos($html, 'class="identificacion"'),
        );
        $this->assertStringNotContainsString('class="qr"', $html);
    }
```

- [ ] **Step 2: Ver a guarda vermelha**

```bash
docker compose exec -T app php artisan test --filter=test_qr_e_identificacao_formam_um_bloco
```

Esperado: FAIL — `Failed asserting that '…' contains "class="identificacion"".`

- [ ] **Step 3: Trocar o CSS**

Substituir as regras `.meta` (`:140`) e `.qr` (`:214-216`) por:

```css
        /* QR e identificação viajam JUNTOS para o topo direito, como no
           `docs/templates/certificado.pdf` e na referência que o João anexou.
           O bloco é estático no fluxo, não absoluto: absoluto foi o que fez a
           `.accent-bottom` ancorar no pé do bloco em vez do da folha. */
        .identificacion {
            align-self: flex-end;
            font-size: 9px;
            line-height: 1.5;
            text-align: center;
            width: 30mm;
        }
        .identificacion img { display: block; height: 22mm; width: 22mm; }
        .identificacion .codigo { font-weight: 700; margin-top: 1mm; }
        .identificacion .aviso { font-size: 7px; line-height: 1.3; margin-top: 1mm; }
```

- [ ] **Step 4: Trocar o markup**

Substituir o bloco `.meta` de `:244-247` por:

```blade
    <div class="identificacion">
        <img src="data:image/svg+xml;base64,{{ $qr }}" alt="QR">
        <div class="codigo">N° {{ $certificate->codigo }}</div>
        <div>Emisión: {{ $fecha($snapshot->emitido_em) }}</div>
        <div class="aviso">Verifique la autenticidad de este certificado escaneando el código.</div>
    </div>
```

E, em `.footer-main` (`:312-322`), apagar a `<div class="qr">` inteira, deixando só a assinatura.
Trocar `justify-content: space-between` por `justify-content: flex-end` na regra `.footer-main`, para
a assinatura não ficar colada na margem esquerda com o QR fora.

- [ ] **Step 5: Ver a guarda verde e a suíte**

```bash
docker compose exec -T app php artisan test --filter=CertificatePdfTest
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `1 skipped, 510 passed`.

- [ ] **Step 6: Olhar a página 1 e conferir que o QR ainda lê**

Regerar `/tmp/cert-novo-1.png` (Task 3, Step 6) e abrir com `Read`. Esperado: QR no canto superior
direito com `N° …`, `Emisión: …` e o aviso abaixo dele; rodapé só com a assinatura do relator; nada
sobreposto ao logo.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint tests/Feature/Certification/CertificatePdfTest.php
cd /home/jvbat/projetos/lotus
git add backend/resources/views/certification/certificate.blade.php \
        backend/tests/Feature/Certification/CertificatePdfTest.php
git commit -m "feat(certification): QR menor no topo direito com codigo e emissao abaixo"
```

---

## Task 6: `App\Shared\Office\` — escape, empacotamento e transporte

**Files:**
- Create: `backend/app/Shared/Office/Xml.php`, `OoxmlPackager.php`, `DocxToPdf.php`,
  `GotenbergDocxToPdf.php`, `OfficeRenderException.php`
- Create: `backend/tests/Support/Office/FakeDocxToPdf.php`
- Create: `backend/tests/Feature/Shared/OoxmlPackagerTest.php`
- Modify: `backend/app/Providers/AppServiceProvider.php`

**Interfaces:**
- Produces, consumido pelas Tasks 7 e 8:
  - `Xml::text(?string $value): string`
  - `Xml::lines(?string $value): string`
  - diretivas Blade `@xml($v)` e `@xmlLines($v)`
  - `OoxmlPackager::package(array<string,string> $parts): string` — chave = caminho dentro do
    pacote, valor = bytes
  - `DocxToPdf::render(string $docx): string`
  - `OfficeRenderException::converterFailed(int $status): self`

`App\Shared\Office\` nasce espelhando `App\Shared\Pdf\` pelo motivo que o docblock do `HtmlToPdf` já
registra: *"a cópia dupla do transporte já divergiu"*.

- [ ] **Step 1: Escrever o teste do escape e do pacote**

Criar `backend/tests/Feature/Shared/OoxmlPackagerTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Office\OoxmlPackager;
use App\Shared\Office\Xml;
use Tests\TestCase;
use ZipArchive;

class OoxmlPackagerTest extends TestCase
{
    /**
     * O `{{ }}` do Blade escapa para HTML e cobre `& < > " '`, mas NÃO remove
     * caractere de controle, que é ilegal em XML 1.0 (§2.2). Um deles corrompe
     * o pacote inteiro em silêncio: o leitor recusa o ZIP, não a célula.
     */
    public function test_escape_cobre_metacaractere_e_caractere_de_controle(): void
    {
        $this->assertSame('A &amp; B &lt;c&gt; &quot;d&quot;', Xml::text('A & B <c> "d"'));
        $this->assertSame('ABC', Xml::text("A\x00B\x08C"));
        $this->assertSame('Ação', Xml::text('Ação'));
        $this->assertSame('', Xml::text(null));
    }

    /** Quebra de linha em OOXML é `<w:br/>`; um `\n` cru dentro de `<w:t>` some. */
    public function test_quebra_de_linha_vira_br_do_ooxml(): void
    {
        $this->assertSame('a<w:br/>b<w:br/>c', Xml::lines("a\nb\r\nc"));
        $this->assertSame('a &amp; b<w:br/>c', Xml::lines("a & b\nc"));
    }

    public function test_pacote_abre_como_zip_com_as_parts_entregues(): void
    {
        $bytes = (new OoxmlPackager)->package([
            '[Content_Types].xml' => '<Types/>',
            '_rels/.rels' => '<Relationships/>',
            'word/document.xml' => '<w:document/>',
        ]);

        $file = tempnam(sys_get_temp_dir(), 'ooxml-test');
        file_put_contents($file, $bytes);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($file) === true);
        $this->assertSame(3, $zip->numFiles);
        // OPC: `[Content_Types].xml` primeiro — há leitor que só olha o início.
        $this->assertSame('[Content_Types].xml', $zip->getNameIndex(0));
        $this->assertSame('<w:document/>', $zip->getFromName('word/document.xml'));
        $zip->close();
        unlink($file);
    }
}
```

- [ ] **Step 2: Ver o teste vermelho**

```bash
docker compose exec -T app php artisan test --filter=OoxmlPackagerTest
```

Esperado: FAIL — `Class "App\Shared\Office\Xml" not found`.

- [ ] **Step 3: Escrever as cinco classes**

`backend/app/Shared/Office/Xml.php`:

```php
<?php

namespace App\Shared\Office;

/**
 * Escape para dentro de um pacote OOXML.
 *
 * Existe porque o `{{ }}` do Blade escapa para HTML: cobre `& < > " '` e para
 * aí. Caractere de controle é ILEGAL em XML 1.0 (§2.2) e não vem de ataque —
 * vem de colar texto de planilha num nome de cliente. O estrago não é uma
 * célula errada: é o pacote inteiro recusado pelo leitor, sem aviso.
 */
final class Xml
{
    public static function text(?string $value): string
    {
        // Sequência UTF-8 inválida faz `preg_replace` com `/u` devolver null;
        // a normalização vem antes por isso, não por elegância.
        $utf8 = mb_convert_encoding((string) $value, 'UTF-8', 'UTF-8');

        $clean = preg_replace(
            '/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u',
            '',
            $utf8,
        );

        return htmlspecialchars((string) $clean, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /** Quebra de linha só existe em OOXML como `<w:br/>`. */
    public static function lines(?string $value): string
    {
        $lines = preg_split('/\R/u', (string) $value) ?: [];

        return implode('<w:br/>', array_map(self::text(...), $lines));
    }
}
```

`backend/app/Shared/Office/OoxmlPackager.php`:

```php
<?php

namespace App\Shared\Office;

use ZipArchive;

/**
 * Empacota parts renderizadas num `.docx`. Só zipa o que recebe — quem sabe
 * QUAIS parts o documento tem é o documento, não o transporte.
 *
 * `[Content_Types].xml` entra primeiro de propósito: a OPC pede que ele abra o
 * pacote, e há leitor que só olha o início do arquivo.
 */
final class OoxmlPackager
{
    /** @param array<string, string> $parts caminho dentro do pacote => bytes */
    public function package(array $parts): string
    {
        // ZipArchive não escreve em memória; o temporário é do mecanismo, não
        // do documento, e morre nesta função.
        $file = tempnam(sys_get_temp_dir(), 'ooxml');

        $zip = new ZipArchive;
        $zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $first = '[Content_Types].xml';
        if (isset($parts[$first])) {
            $zip->addFromString($first, $parts[$first]);
            unset($parts[$first]);
        }

        foreach ($parts as $path => $bytes) {
            $zip->addFromString($path, $bytes);
        }

        $zip->close();

        $bytes = (string) file_get_contents($file);
        unlink($file);

        return $bytes;
    }
}
```

`backend/app/Shared/Office/DocxToPdf.php`:

```php
<?php

namespace App\Shared\Office;

/**
 * Converte um `.docx` em PDF. Irmã do `HtmlToPdf` e pelo mesmo motivo: o
 * documento monta o pacote, o transporte é daqui.
 */
interface DocxToPdf
{
    /**
     * @return string bytes do PDF
     *
     * @throws OfficeRenderException quando o conversor recusa ou está fora do ar
     */
    public function render(string $docx): string;
}
```

`backend/app/Shared/Office/GotenbergDocxToPdf.php`:

```php
<?php

namespace App\Shared\Office;

use Illuminate\Support\Facades\Http;

/**
 * Adapter da rota LibreOffice do Gotenberg (serviço `gotenberg` do compose).
 * Diferente do Chromium, o LibreOffice resolve fonte pelo NOME instalado — o
 * manual declara Arial e o conversor substitui por Liberation Sans, que é
 * exatamente o que o `docs/templates/manual.pdf` embute.
 */
final class GotenbergDocxToPdf implements DocxToPdf
{
    public function render(string $docx): string
    {
        $response = Http::attach('files', $docx, 'document.docx')
            ->post($this->endpoint());

        if ($response->failed()) {
            throw OfficeRenderException::converterFailed($response->status());
        }

        return $response->body();
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.gotenberg.url'), '/')
            .'/forms/libreoffice/convert';
    }
}
```

`backend/app/Shared/Office/OfficeRenderException.php`:

```php
<?php

namespace App\Shared\Office;

use RuntimeException;

/**
 * Falha do conversor de escritório. Sobe ao handler global RFC 7807 como 500 —
 * nenhum caller inventa um documento vazio no lugar. Molde do
 * `PdfRenderException`.
 */
class OfficeRenderException extends RuntimeException
{
    public static function converterFailed(int $status): self
    {
        return new self("O conversor de documentos falhou ao converter o manual (HTTP {$status}).");
    }
}
```

`backend/tests/Support/Office/FakeDocxToPdf.php`:

```php
<?php

namespace Tests\Support\Office;

use App\Shared\Office\DocxToPdf;
use LogicException;

/**
 * Dobradura de teste: guarda o `.docx` que o documento mandou converter. Com
 * ela a asserção volta a ser sobre o PACOTE, e não sobre um corpo multipart.
 */
class FakeDocxToPdf implements DocxToPdf
{
    /** @var list<string> */
    private array $calls = [];

    public function __construct(private readonly string $bytes = '%PDF-fake') {}

    public function render(string $docx): string
    {
        $this->calls[] = $docx;

        return $this->bytes;
    }

    public function lastDocx(): string
    {
        if ($this->calls === []) {
            throw new LogicException('Nenhum documento foi convertido em PDF.');
        }

        return $this->calls[array_key_last($this->calls)];
    }

    public function timesCalled(): int
    {
        return count($this->calls);
    }
}
```

- [ ] **Step 4: Registrar o binding e as diretivas**

Em `AppServiceProvider::register()`, ao lado do binding do `HtmlToPdf`:

```php
        // Conversor DOCX→PDF (rota LibreOffice do mesmo Gotenberg). Nos testes
        // o binding troca pelo `FakeDocxToPdf`, que guarda o pacote.
        $this->app->bind(DocxToPdf::class, GotenbergDocxToPdf::class);
```

Em `AppServiceProvider::boot()`, depois do `enforceMorphMap`:

```php
        // Diretivas de escape do OOXML. Existem para que a Blade do manual não
        // tenha NENHUM `{{ }}` nem `{!! !!}`: o primeiro escapa para HTML e
        // deixa passar caractere de controle; o segundo não escapa nada e lê
        // como "conteúdo cru" para quem revisa. Guarda em ManualTurmaTest.
        Blade::directive('xml', fn (string $expression) => "<?php echo \App\Shared\Office\Xml::text({$expression}); ?>");
        Blade::directive('xmlLines', fn (string $expression) => "<?php echo \App\Shared\Office\Xml::lines({$expression}); ?>");

        // `short_open_tag` está **On** neste PHP (medido no container em
        // 2026-08-10), então uma Blade que comece com o `<?xml …?>` literal é
        // compilada num arquivo que o PHP tenta abrir como tag curta:
        // `Parse error: syntax error, unexpected identifier "version"`. A
        // declaração sai daqui, de dentro de uma string.
        Blade::directive(
            'xmlDecl',
            fn () => '<?php echo \'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\'."\n"; ?>',
        );
```

Com os `use` correspondentes (`App\Shared\Office\DocxToPdf`, `GotenbergDocxToPdf`,
`Illuminate\Support\Facades\Blade`).

- [ ] **Step 5: Ver o teste verde**

```bash
docker compose exec -T app php artisan test --filter=OoxmlPackagerTest
```

Esperado: `Tests: 3 passed`.

- [ ] **Step 6: Provar a rota LibreOffice de ponta a ponta, contra o Gotenberg real**

```bash
docker compose exec -T app php artisan tinker --execute="\
\$docx = app(\App\Shared\Office\OoxmlPackager::class)->package([
  '[Content_Types].xml' => '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>',
  '_rels/.rels' => '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>',
  'word/document.xml' => '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>probe</w:t></w:r></w:p><w:sectPr><w:pgSz w:w=\"20183\" w:h=\"12246\" w:orient=\"landscape\"/></w:sectPr></w:body></w:document>',
]);
file_put_contents('/tmp/probe.pdf', app(\App\Shared\Office\DocxToPdf::class)->render(\$docx));"
docker compose cp app:/tmp/probe.pdf /tmp/probe.pdf && pdfinfo /tmp/probe.pdf | grep -E 'Pages|Page size'
```

Esperado: `Pages: 1` e `Page size: 1009.15 x 612.3 pts` (o papel do template é 1009,13 × 612,283).

- [ ] **Step 7: Suíte e commit**

Esperado: suíte `1 skipped, 513 passed` — 510 depois da Task 5, +3 do `OoxmlPackagerTest`.

```bash
docker compose exec -T app php artisan test 2>&1 | tail -3
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint app/Shared/Office app/Providers/AppServiceProvider.php \
  tests/Support/Office/FakeDocxToPdf.php tests/Feature/Shared/OoxmlPackagerTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Office backend/app/Providers/AppServiceProvider.php \
        backend/tests/Support/Office backend/tests/Feature/Shared/OoxmlPackagerTest.php
git commit -m "feat(shared): App\\Shared\\Office com escape XML, empacotador OOXML e rota LibreOffice"
```

---

## Task 7: Manual em OOXML — Blade, serviço, e o PDF saindo do pacote

**Files:**
- Create: `backend/resources/views/operation/manual/{document,content-types,rels,document-rels}.blade.php`
  e `partials/encabezado.blade.php`
- Create: `backend/app/Domains/Operation/Services/ManualDocumentService.php`
- Delete: `backend/app/Domains/Operation/Services/ManualPdfService.php`,
  `backend/resources/views/operation/manual-turma.blade.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:101-107`
- Modify: `backend/tests/Feature/Operation/ManualTurmaTest.php`

**Interfaces:**
- Consumes: `OoxmlPackager`, `DocxToPdf`, `Xml` (Task 6).
- Produces: `ManualDocumentService::docx(Turma): string` e `::pdf(Turma): string`.

A troca do controller entra **nesta** task, não na seguinte: apagar `ManualPdfService` sem trocar
quem o injeta deixaria `GET /api/turmas/{id}/manual` quebrada entre dois commits. Cada commit deste
plano é uma árvore que roda.

**Cinco seções, uma por página**, medidas dentro do `docs/templates/manual.docx`:

| # | Título (texto, centralizado) | Tabela | Colunas (twips) | Linhas fixas | Preenchido |
|---|---|---|---|---|---|
| 1 | Libro de Control de Clases | 7×2 | `5839, 12302` | 7 | cliente, curso, modalidade, local, início, término, relatores |
| 2 | Antecedentes Participantes | 23×5 | `1361, 5216, 2948, 4819, 3798` | 22 | N°, nome, RUT, empresa |
| 3 | Control de Asistencia de Participantes | 21×38 | `454, 2891,` 7×`255`, `1020` (×4 blocos), `2806` | 20 | N° e nome |
| 4 | Temas de La Capacitación | 7×6 | `1020, 7143, 3118, 3402, 1729, 1729` | 5 + total | módulos, objetivos, conteúdos, horas T/P, total |
| 5 | Evaluaciones | 21×8 | `567, 4252, 2154, 2154, 2154, 2154, 2154, 2551` | 20 | N° e nome |

Quando a turma tem **mais** matrículas que as linhas fixas do formulário, a grade cresce
(`max($n, $fixas)`); quando tem menos, as linhas em branco do formulário impresso permanecem. Truncar
esconderia aluno num documento de sala; encolher descaracterizaria o formulário.

- [ ] **Step 1: Reescrever o `ManualTurmaTest`**

Manter o `setUp` existente, que já monta `$this->turma` com `ACME Chile`, `Alta Tensión`,
`Módulo Seguridad` (4 h teóricas + 4 práticas) e `Santiago`. **Apagar**
`test_manual_declara_a4_no_css_e_pede_o_papel_do_css`: ele descreve o `@page` de um Blade HTML que
deixa de existir, e o papel passa a ser provado no `w:pgSz`. **Reescrever** os outros três. Depois
acrescentar os seis novos — o arquivo termina com **9** testes contra os 4 de hoje. Imports:
`App\Domains\Identity\Models\Student`,
`App\Domains\Operation\Models\Enrollment`, `App\Domains\Operation\Services\ManualDocumentService`,
`App\Shared\Office\DocxToPdf`, `Tests\Support\Office\FakeDocxToPdf`, `ZipArchive`.

Helpers:

```php
    /** Idioma do `EnrollmentModelTest`: aluno é User inativo + Student (RN-01). */
    private function enroll(int $n): void
    {
        for ($i = 1; $i <= $n; $i++) {
            $student = Student::create([
                'user_id' => User::factory()->create([
                    'type' => 'aluno', 'is_active' => false, 'name' => "Alumno {$i}",
                ])->id,
            ]);

            Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $student->id]);
        }
    }

    private function documentXml(): string
    {
        $docx = app(ManualDocumentService::class)->docx($this->turma->fresh());
        $file = tempnam(sys_get_temp_dir(), 'manual');
        file_put_contents($file, $docx);

        $zip = new ZipArchive;
        $zip->open($file);
        $xml = (string) $zip->getFromName('word/document.xml');
        $zip->close();
        unlink($file);

        return $xml;
    }
```

Testes adaptados (os dois que sobrevivem, com o alvo do `Http::fake` movido para a rota LibreOffice):

```php
    public function test_manual_devolve_pdf_convertido_do_docx(): void
    {
        $this->actingAsAdmin();
        $fake = new FakeDocxToPdf;
        $this->app->instance(DocxToPdf::class, $fake);

        $response = $this->get("/api/turmas/{$this->turma->id}/manual");

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());

        // DoD 9: o PDF veio do MESMO pacote que o download entrega — o que o
        // conversor recebeu começa com a assinatura de ZIP, não com `<!doctype`.
        $this->assertStringStartsWith('PK', $fake->lastDocx());
        $this->assertSame(1, $fake->timesCalled());
    }

    public function test_conversor_fora_do_ar_500_rfc7807(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/libreoffice/convert' => Http::response('boom', 503)]);

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertStatus(500);
    }

    public function test_manual_exige_turma_view(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertForbidden();
    }
```

Testes novos:

```php
    /** DoD 3: o `.docx` é um pacote OOXML válido, no papel do template. */
    public function test_docx_e_pacote_ooxml_valido_em_oficio_paisagem(): void
    {
        $docx = app(ManualDocumentService::class)->docx($this->turma);
        $file = tempnam(sys_get_temp_dir(), 'manual');
        file_put_contents($file, $docx);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($file) === true);
        foreach (['[Content_Types].xml', '_rels/.rels', 'word/document.xml',
                  'word/_rels/document.xml.rels', 'word/media/lotus-logo.png'] as $part) {
            $this->assertNotFalse($zip->locateName($part), "part ausente: {$part}");
        }
        $zip->close();
        unlink($file);

        $xml = $this->documentXml();

        // A declaração vem do `@xmlDecl`: escrita literal na Blade, ela vira
        // tag curta na compilação (`short_open_tag` está On) e o arquivo nem
        // chega a renderizar.
        $this->assertStringStartsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', $xml);
        $this->assertStringContainsString('<w:pgSz w:w="20183" w:h="12246" w:orient="landscape"/>', $xml);
    }

    /**
     * DoD 4: preenchimento provado por CONTAGEM.
     *
     * Cada aluno aparece três vezes — Antecedentes, Asistencia e Evaluaciones —
     * e o formulário impresso não encolhe: 85 linhas com 10 alunos, que são
     * 5 cabeçalhos de página + 7 (Datos) + 1+22 (Antecedentes) + 1+20
     * (Asistencia) + 1 (notas) + 1+5+1 (Temas) + 1+20 (Evaluaciones).
     *
     * A contagem só fecha porque a Blade escreve TODA linha como `<w:tr>` sem
     * atributo, com as propriedades em `<w:trPr>`. É convenção do arquivo, e
     * esta asserção é quem a cobra.
     */
    public function test_cada_matricula_vira_uma_linha_nas_tres_grades(): void
    {
        $this->enroll(10);
        $xml = $this->documentXml();

        for ($i = 1; $i <= 10; $i++) {
            $this->assertSame(3, substr_count($xml, ">Alumno {$i}</w:t>"), "Alumno {$i}");
        }

        $this->assertSame(85, substr_count($xml, '<w:tr>'));
    }

    /** Turma maior que o formulário ESTENDE a grade em vez de esconder aluno. */
    public function test_turma_maior_que_o_formulario_estende_as_grades(): void
    {
        $this->enroll(25);
        $xml = $this->documentXml();

        $this->assertSame(3, substr_count($xml, '>Alumno 25</w:t>'));
        // 5 + 7 + (1+25) + (1+25) + 1 + 7 + (1+25) = 94.
        $this->assertSame(94, substr_count($xml, '<w:tr>'));
    }

    /** DoD 4: o total de horas é SOMA dos módulos, não campo digitado. */
    public function test_total_de_horas_soma_os_modulos(): void
    {
        $this->turma->course->modules()->create([
            'sort_order' => 1, 'name' => 'Módulo Práctico', 'learnings' => 'L2',
            'contents' => 'C2', 'theory_hours' => 2, 'practice_hours' => 6,
        ]);

        $xml = $this->documentXml();

        // 4+2 teóricas e 4+6 práticas. Ancorado no rótulo do total: "6" e "10"
        // soltos também são número de linha e coluna de dia na Asistencia.
        $total = substr($xml, (int) strpos($xml, 'Total de Horas Capacitadas'));
        $this->assertMatchesRegularExpression('/>6<\/w:t>.*?>10<\/w:t>/s', substr($total, 0, 4000));
    }

    /** DoD 6: dado hostil não corrompe o pacote. */
    public function test_escape_hostil_nao_corrompe_o_pacote(): void
    {
        $this->turma->course->update(['name' => "A & B <c> \"d\" \x00\x08"]);

        $xml = $this->documentXml();

        $this->assertStringContainsString('A &amp; B &lt;c&gt; &quot;d&quot;', $xml);
        $this->assertNotFalse(simplexml_load_string($xml), 'O document.xml deixou de ser XML válido.');
    }

    /**
     * A Blade OOXML não pode INTERPOLAR com `{{ }}` (escapa para HTML e deixa
     * passar caractere de controle) nem com `{!! !!}` (não escapa nada). Só
     * `@xml` e `@xmlLines`. Comentário Blade some na compilação e não chega ao
     * pacote, então sai da conta: o que a guarda persegue é interpolação.
     *
     * Os testes acima provam o COMPORTAMENTO; este impede o próximo campo de
     * nascer desprotegido.
     */
    public function test_blades_do_manual_so_interpolam_pelas_diretivas_de_xml(): void
    {
        $blades = glob(resource_path('views/operation/manual/*.blade.php'))
            + glob(resource_path('views/operation/manual/partials/*.blade.php'));

        $this->assertNotEmpty($blades);

        foreach ($blades as $blade) {
            $semComentario = preg_replace('/\{\{--.*?--\}\}/s', '', (string) file_get_contents($blade));

            $this->assertStringNotContainsString('{{', (string) $semComentario, $blade);
            $this->assertStringNotContainsString('{!!', (string) $semComentario, $blade);
        }
    }
```

- [ ] **Step 2: Ver os testes vermelhos**

```bash
docker compose exec -T app php artisan test --filter=ManualTurmaTest
```

Esperado: FAIL — `Class "App\Domains\Operation\Services\ManualDocumentService" not found`.

- [ ] **Step 3: Escrever as três Blades de embalagem**

`resources/views/operation/manual/content-types.blade.php`:

```blade
@xmlDecl
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
```

`resources/views/operation/manual/rels.blade.php`:

```blade
@xmlDecl
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
```

`resources/views/operation/manual/document-rels.blade.php`:

```blade
@xmlDecl
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/lotus-logo.png"/>
</Relationships>
```

Sem `docProps/`: é opcional na OPC, e o João pediu metadados leves. O probe do Step 6 da Task 6
converteu com três parts.

- [ ] **Step 4: Escrever a Blade do documento**

`resources/views/operation/manual/document.blade.php`. Cabeçalho do arquivo:

```blade
{{-- Libro de Control de Clases (RF-TUR-04), fiel ao `docs/templates/manual.docx`.

     FONTE DE VERDADE ÚNICA: esta Blade produz `word/document.xml`, o
     `OoxmlPackager` fecha o `.docx`, e o PDF sai DESSE pacote pela rota
     LibreOffice. Não existe caminho HTML paralelo — foi a cópia dupla do
     transporte que o ADR-12 registrou como defeito já pago.

     PAPEL: ofício paisagem (`w:w="20183" w:h="12246"`), medido dentro do
     template. Isto REABRE a D4/D6 do bloco 6d, que fixara A4 retrato porque o
     cliente arquiva em A4; o João escolheu fidelidade literal ao arquivo
     aprovado pela Lotus (D2 da spec). O manual passa a ser o único documento
     oficial fora do A4.

     FONTE: `Arial` é o que o template declara. O LibreOffice do conversor a
     substitui por Liberation Sans com métrica idêntica — que é exatamente a
     fonte que `pdffonts docs/templates/manual.pdf` mostra embutida. Declarar
     Liberation Sans deixaria o Word do cliente sem a fonte; declarar Arial
     acerta os dois lados.

     ESCAPE: nada de `{{ }}` nem `{!! !!}` aqui. `@xml` e `@xmlLines`, sempre —
     ver `App\Shared\Office\Xml` e a guarda estrutural no `ManualTurmaTest`.

     SEM FUNDO RASTER (D3): o template traz ornamentos low-poly nas quinas e os
     títulos de página DENTRO de uma faixa rasterizada de 4205×378 — por isso
     `pdftotext` do template nunca devolve "Libro de Control de Clases". Aqui os
     títulos são texto; os ornamentos ficam para outro bloco. --}}
```

Estrutura, com os valores medidos:

```blade
@xmlDecl
@php
    $modulos = $turma->course->modules->sortBy('sort_order')->values();
    $alunos = $turma->enrollments->values();
    $horasT = $modulos->sum('theory_hours');
    $horasP = $modulos->sum('practice_hours');
    $filas = fn (int $minimo) => max($alunos->count(), $minimo);
    $logo = 'rId1';
@endphp
<w:document
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
    @include('operation.manual.partials.encabezado', ['titulo' => 'Libro de Control de Clases'])
    {{-- tabela 1: 7×2, colunas 5839/12302, uma linha por campo de `Datos` --}}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    @include('operation.manual.partials.encabezado', ['titulo' => 'Antecedentes Participantes'])
    {{-- tabela 2: cabeçalho + `$filas(22)` linhas, colunas 1361/5216/2948/4819/3798 --}}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    @include('operation.manual.partials.encabezado', ['titulo' => 'Control de Asistencia de Participantes'])
    {{-- tabela 3: cabeçalho + `$filas(20)` linhas, 38 colunas; depois a tabela
         1×1 com as três NOTA --}}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    @include('operation.manual.partials.encabezado', ['titulo' => 'Temas de La Capacitación'])
    {{-- tabela 4: cabeçalho + `max($modulos->count(), 5)` linhas + linha de
         total, colunas 1020/7143/3118/3402/1729/1729 --}}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>

    @include('operation.manual.partials.encabezado', ['titulo' => 'Evaluaciones'])
    {{-- tabela 5: cabeçalho + `$filas(20)` linhas, colunas
         567/4252/2154×5/2551 --}}

    <w:sectPr>
        <w:pgSz w:w="20183" w:h="12246" w:orient="landscape"/>
        <w:pgMar w:top="340" w:right="454" w:bottom="454" w:left="454" w:header="85" w:footer="113" w:gutter="0"/>
    </w:sectPr>
</w:body>
</w:document>
```

**O cabeçalho de página** (`resources/views/operation/manual/partials/encabezado.blade.php`) é uma
tabela de 1 linha e 3 colunas, sem bordas exceto a inferior — reproduz a faixa do template com o
título centralizado e o logo à direita:

```blade
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="19275"/><w:tblLayout w:type="fixed"/>
<w:tblBorders><w:bottom w:val="single" w:sz="8" w:space="0" w:color="202020"/></w:tblBorders>
<w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="15275"/><w:gridCol w:w="2000"/></w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="680" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2000"/></w:tcPr><w:p/></w:tc>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="15275"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="111111"/><w:sz w:val="32"/></w:rPr>
        <w:t xml:space="preserve">@xml($titulo)</w:t></w:r></w:p>
    </w:tc>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2000"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
            {{-- 335×466 px do `lotus-logo.png`, a 12mm de altura: 432000 EMU
                 de altura e 310558 de largura preservam a proporção. --}}
            <wp:extent cx="310558" cy="432000"/>
            <wp:docPr id="1" name="LOTUS OTEC"/>
            <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="LOTUS OTEC"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="310558" cy="432000"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>
            </a:graphicData></a:graphic>
        </wp:inline>
        </w:drawing></w:r></w:p>
    </w:tc>
</w:tr>
</w:tbl>
<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
```

**Quebra de página** entre seções (quatro ocorrências):

```blade
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

**Célula de cabeçalho de tabela** (fundo `25A5E4`, texto branco-sobre-azul do template é na verdade
`111111` em negrito):

```blade
<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="@xml($ancho)"/><w:vAlign w:val="center"/>
<w:tcMar><w:top w:w="20" w:type="dxa"/><w:start w:w="35" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:end w:w="35" w:type="dxa"/></w:tcMar>
<w:shd w:fill="25A5E4" w:val="clear"/>
<w:tcBorders><w:top w:val="single" w:sz="7" w:space="0" w:color="202020"/><w:start w:val="single" w:sz="7" w:space="0" w:color="202020"/><w:bottom w:val="single" w:sz="7" w:space="0" w:color="202020"/><w:end w:val="single" w:sz="7" w:space="0" w:color="202020"/></w:tcBorders></w:tcPr>
<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="111111"/><w:sz w:val="17"/></w:rPr>
<w:t xml:space="preserve">@xml($rotulo)</w:t></w:r></w:p></w:tc>
```

Corpo: mesma forma com `<w:sz w:val="13"/>` (6,5 pt), sem `<w:b/>`, borda `sz="6"` cor `202020` nas
tabelas 1/2/4 e `A8A8A8` nas 3/5, e `<w:shd w:fill="EFEFEF"/>` nas colunas zebradas (RUT na tabela 2,
Módulo na 4) e `ECECEC` nas colunas de dia da tabela 3. Usar `@xmlLines` em `learnings` e `contents`,
que são texto multilinha; `@xml` no resto.

O rodapé de notas da página 3 é uma tabela 1×1 com as três `NOTA` do template, em `<w:sz w:val="11"/>`
com o prefixo `NOTA n:` em negrito.

A última linha da tabela 4 é o total, com `<w:gridSpan w:val="4"/>` na primeira célula:
`Total de Horas Capacitadas` | `@xml($horasT)` | `@xml($horasP)`.

- [ ] **Step 5: Escrever o serviço**

`backend/app/Domains/Operation/Services/ManualDocumentService.php`:

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;
use App\Shared\Office\DocxToPdf;
use App\Shared\Office\OoxmlPackager;

/**
 * Libro de Control de Clases (RF-TUR-04). Blade única padronizada (D6)
 * renderizada com os dados ATUAIS — nada materializado (D7, mesmo racional do
 * certificado RF-CER-03).
 *
 * O nome deixou de ser `ManualPdfService` porque o documento deixou de ser só
 * PDF: `docx()` é a fonte de verdade e `pdf()` é uma SAÍDA dela. Quem quiser
 * mudar o manual muda um lugar, e os dois formatos acompanham.
 */
class ManualDocumentService
{
    public function __construct(
        private readonly OoxmlPackager $packager,
        private readonly DocxToPdf $converter,
    ) {}

    public function docx(Turma $turma): string
    {
        $turma->load([
            'course.modules', 'quote.budget.client.user',
            'redatores.user', 'enrollments.student.user',
        ]);

        return $this->packager->package([
            '[Content_Types].xml' => view('operation.manual.content-types')->render(),
            '_rels/.rels' => view('operation.manual.rels')->render(),
            'word/document.xml' => view('operation.manual.document', ['turma' => $turma])->render(),
            'word/_rels/document.xml.rels' => view('operation.manual.document-rels')->render(),
            'word/media/lotus-logo.png' => (string) file_get_contents(
                resource_path('images/lotus-logo.png'),
            ),
        ]);
    }

    /**
     * O PDF sai do MESMO pacote que o download entrega. Não há segundo caminho
     * de montagem — é o que o DoD 9 do bloco cobra.
     */
    public function pdf(Turma $turma): string
    {
        return $this->converter->render($this->docx($turma));
    }
}
```

Apagar `ManualPdfService.php` e `resources/views/operation/manual-turma.blade.php`.

- [ ] **Step 6: Trocar o controller**

Em `TurmaController`, trocar o `use App\Domains\Operation\Services\ManualPdfService;` por
`ManualDocumentService` e o método `manual()` (`:101-107`):

```php
    public function manual(Turma $turma, ManualDocumentService $manual): Response
    {
        return response($manual->pdf($turma), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"manual-turma-{$turma->id}.pdf\"",
        ]);
    }
```

- [ ] **Step 7: Ver os testes verdes e a suíte**

```bash
docker compose exec -T app php artisan test --filter=ManualTurmaTest
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `ManualTurmaTest` com **9** testes verdes (3 reescritos + 6 novos, contra os 4 de antes);
suíte `1 skipped, 518 passed` — 513 depois da Task 6, −1 apagado, +6 novos.

- [ ] **Step 8: Olhar o documento renderizado**

```bash
docker compose exec -T app php artisan tinker --execute="\
\$t = \App\Domains\Operation\Models\Turma::first();
file_put_contents('/tmp/manual.docx', app(\App\Domains\Operation\Services\ManualDocumentService::class)->docx(\$t));
file_put_contents('/tmp/manual.pdf', app(\App\Domains\Operation\Services\ManualDocumentService::class)->pdf(\$t));"
docker compose cp app:/tmp/manual.pdf /tmp/manual-novo.pdf
docker compose cp app:/tmp/manual.docx /tmp/manual-novo.docx
pdfinfo /tmp/manual-novo.pdf
ls -la /tmp/manual-novo.docx /tmp/manual-novo.pdf
pdftoppm -png -r 72 -f 1 -l 5 /tmp/manual-novo.pdf /tmp/manual-novo
```

Abrir os cinco PNGs com `Read` e comparar página a página com `/tmp/manual-page-{1..5}.png`
(regeráveis por `pdftoppm -png -r 72 -f 1 -l 5 docs/templates/manual.pdf /tmp/manual-page`).
Esperado: `Pages: 5`, `Page size: 1009.15 x 612.3 pts`, mesmas tabelas, mesmos cabeçalhos azuis,
títulos em texto no lugar do raster, sem os ornamentos das quinas (D3).

- [ ] **Step 9: Commit**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint \
  app/Domains/Operation/Services/ManualDocumentService.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  tests/Feature/Operation/ManualTurmaTest.php
cd /home/jvbat/projetos/lotus
git rm backend/resources/views/operation/manual-turma.blade.php \
       backend/app/Domains/Operation/Services/ManualPdfService.php
git add backend/resources/views/operation/manual \
        backend/app/Domains/Operation/Services/ManualDocumentService.php \
        backend/app/Domains/Operation/Http/Controllers/TurmaController.php \
        backend/tests/Feature/Operation/ManualTurmaTest.php
git commit -m "feat(operation): manual de classe em Blade OOXML fiel ao template"
```

---

## Task 8: Rota do DOCX

**Files:**
- Modify: `backend/app/Domains/Operation/routes.php:25`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:30`
- Modify: `backend/tests/Feature/Operation/ManualTurmaTest.php`

**Interfaces:**
- Consumes: `ManualDocumentService::docx()` (Task 7).
- Produces: `GET /api/turmas/{turma}/manual/docx`, mesma permissão `operation.turma.view` da rota
  de PDF.

Rota explícita em vez de `?format=`: `Content-Type` e `Content-Disposition` são diferentes, e um
parâmetro de query que troca o tipo do corpo esconde isso de quem lê a rota.

- [ ] **Step 1: Escrever os testes, que falham com 404**

Acrescentar ao `ManualTurmaTest`:

```php
    public function test_manual_docx_devolve_o_pacote_para_download(): void
    {
        $this->actingAsAdmin();

        $response = $this->get("/api/turmas/{$this->turma->id}/manual/docx");

        $response->assertOk()->assertHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        $this->assertSame(
            "attachment; filename=\"manual-turma-{$this->turma->id}.docx\"",
            $response->headers->get('Content-Disposition'),
        );
        $this->assertStringStartsWith('PK', $response->getContent());
    }

    /**
     * O DOCX é o pacote, não uma conversão dele: conversor fora do ar não pode
     * derrubar o download. `preventStrayRequests` sem nenhum `fake` prova isso
     * — qualquer chamada HTTP faria o teste estourar.
     */
    public function test_docx_nao_depende_do_conversor(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();

        $this->get("/api/turmas/{$this->turma->id}/manual/docx")->assertOk();
    }
```

E estender a guarda de permissão que a Task 7 manteve, para cobrir os dois formatos:

```php
    public function test_manual_exige_turma_view(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertForbidden();
        $this->getJson("/api/turmas/{$this->turma->id}/manual/docx")->assertForbidden();
    }
```

- [ ] **Step 2: Ver os testes vermelhos**

```bash
docker compose exec -T app php artisan test --filter=ManualTurmaTest
```

Esperado: `test_manual_docx_devolve_o_pacote_para_download` e `test_docx_nao_depende_do_conversor`
FAIL com **404**; `test_manual_exige_turma_view` FAIL porque a rota nova devolve 404 em vez de 403.

- [ ] **Step 3: Acrescentar a rota**

Em `backend/app/Domains/Operation/routes.php`, logo abaixo da linha 25:

```php
    Route::get('turmas/{turma}/manual', [TurmaController::class, 'manual']);
    Route::get('turmas/{turma}/manual/docx', [TurmaController::class, 'manualDocx']);
```

- [ ] **Step 4: Acrescentar o método e a permissão**

Em `TurmaController`, na lista de middleware (`:30`):

```php
            new Middleware('permission:operation.turma.view', only: ['index', 'show', 'manual', 'manualDocx']),
```

E o método, ao lado do `manual()`:

```php
    /**
     * `attachment` e não `inline`: navegador não renderiza WordprocessingML, e
     * `inline` viraria um download com o nome do arquivo perdido.
     */
    public function manualDocx(Turma $turma, ManualDocumentService $manual): Response
    {
        return response($manual->docx($turma), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename=\"manual-turma-{$turma->id}.docx\"",
        ]);
    }
```

- [ ] **Step 5: Ver os testes verdes e a suíte**

```bash
docker compose exec -T app php artisan test --filter=ManualTurmaTest
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `ManualTurmaTest` com **11** testes verdes; suíte `1 skipped, 520 passed` — 518 depois da
Task 7, +2.

- [ ] **Step 6: Conferir que o caminho antigo morreu inteiro**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn "ManualPdfService\|manual-turma.blade" app/ tests/ resources/ || echo "sem sobra"
grep -rn "abort(" app/Domains/Operation/ || echo "zero abort"
```

Esperado: `sem sobra` e `zero abort`.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint \
  app/Domains/Operation/routes.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  tests/Feature/Operation/ManualTurmaTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Operation backend/tests/Feature/Operation/ManualTurmaTest.php
git commit -m "feat(operation): rota de download do manual em DOCX"
```

---

## Task 9: Frontend — dois formatos no botão de documentos

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmas.ts:99-109`
- Modify: `frontend/src/features/operation/hooks/useTurmaManualOpener.ts`
- Modify: `frontend/src/features/operation/components/Document/ManualButton.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,en,pt-BR}.json:505`

**Interfaces:**
- Consumes: `GET /api/turmas/{id}/manual` e `GET /api/turmas/{id}/manual/docx` (Task 8).
- Produces: `useTurmaManualOpener(turmaId)` devolvendo
  `{ openPdf, downloadDocx, pending, popupBlocked, message }`.

PDF **abre em aba**; DOCX **baixa** — o navegador não renderiza DOCX. Um hook só, porque o
tratamento de erro (`problemFromBlob`), o ciclo do `objectURL` e o `pending` são os mesmos; abrir um
caminho paralelo duplicaria os três.

- [ ] **Step 1: Acrescentar a mutation do DOCX**

Em `useTurmas.ts`, abaixo de `useTurmaManual`:

```ts
export function useTurmaManualDocx() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api
        .get<Blob>(`/api/turmas/${turmaId}/manual/docx`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
```

- [ ] **Step 2: Estender o hook**

Em `useTurmaManualOpener.ts`, manter o docblock existente e acrescentar ao final dele:

```
 * O DOCX baixa em vez de abrir: navegador não renderiza WordprocessingML, e
 * uma aba com `about:blank` esperando um blob que ele não sabe exibir é pior
 * que nenhum feedback. Os dois formatos dividem o mesmo `problemFromBlob`, o
 * mesmo `pending` e a mesma revogação de objectURL — daí um hook só.
```

E o corpo:

```ts
export function useTurmaManualOpener(turmaId: number) {
  const manual = useTurmaManual()
  const docx = useTurmaManualDocx()
  const { message } = useMutationErrors([manual.error, docx.error])
  const urlRef = useRef<string | null>(null)
  const tabRef = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      tabRef.current?.close()
    },
    [],
  )

  const openPdf = () => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
        tabRef.current = null
      },
      onError: () => {
        tab.close()
        tabRef.current = null
      },
    })
  }

  const downloadDocx = () => {
    setPopupBlocked(false)
    docx.mutate(turmaId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `manual-turma-${turmaId}.docx`
        anchor.click()
        URL.revokeObjectURL(url)
      },
    })
  }

  return {
    openPdf,
    downloadDocx,
    pending: manual.isPending || docx.isPending,
    popupBlocked,
    message,
  }
}
```

Com o import de `useTurmaManualDocx` junto de `useTurmaManual`.

- [ ] **Step 3: Trocar o botão**

`ManualButton.tsx`:

```tsx
export function ManualButton({ turmaId }: { turmaId: number }) {
  const { t } = useTranslation()
  const manual = useTurmaManualOpener(turmaId)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <AppButton
          label={t('operation.documents.manualPdf')}
          icon="pi pi-file-pdf"
          outlined
          loading={manual.pending}
          onClick={manual.openPdf}
        />
        <AppButton
          label={t('operation.documents.manualDocx')}
          icon="pi pi-file-word"
          outlined
          loading={manual.pending}
          onClick={manual.downloadDocx}
        />
      </div>
      {(manual.popupBlocked || manual.message) && (
        <p className="text-sm text-red-600">
          {manual.popupBlocked ? t('operation.documents.popupBlocked') : manual.message}
        </p>
      )}
    </div>
  )
}
```

Dois `AppButton` e não um `SplitButton`: o `shared/ui` não exporta `SplitButton` hoje, e feature não
importa PrimeReact direto (ADR-05, lei §5.6). Ampliar a fronteira por um menu de dois itens não se
paga.

- [ ] **Step 4: Trocar as chaves de locale**

Nos três arquivos, na linha 505, substituir `"manual"` por:

```json
      "manualPdf": "Abrir manual (PDF)",
      "manualDocx": "Descargar manual (DOCX)",
```

`en.json`: `"Open manual (PDF)"` / `"Download manual (DOCX)"`.
`pt-BR.json`: `"Abrir manual (PDF)"` / `"Baixar manual (DOCX)"`.

- [ ] **Step 5: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -rn "documents.manual\b" src || echo "nenhuma chave orfa"
pnpm lint && pnpm build && pnpm test
```

Esperado: `nenhuma chave orfa`; lint, build e vitest verdes (`13 arquivos / 47 testes`, inalterado —
este bloco não acrescenta teste de frontend).

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src
git commit -m "feat(operation): botoes de manual em PDF e DOCX na configuracao de turma"
```

---

## Task 10: Gate do bloco

**Files:** nenhum de produção. Prova, mais a decisão de ADR.

- [ ] **Step 1: Ferramentas (DoD 10)**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -3
docker compose exec -T app php artisan typescript:transform && git diff --stat -- frontend/src/shared/api/generated.ts
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint --test $(cd /home/jvbat/projetos/lotus && git diff --name-only main...HEAD -- 'backend/*.php' | sed 's|^backend/||')
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus && git diff --stat main...HEAD -- backend/database/
```

Esperado: suíte `1 skipped, 520 passed` (baseline 503 + 17 do bloco); `generated.ts` **sem diff**
(DoD 7); Pint `passed`; frontend verde (`13 arquivos / 47 testes`, inalterado);
`backend/database/` **vazio** (zero schema).

- [ ] **Step 2: E2E contra a API real (DoD 5), sessão Sanctum por cookie + CSRF**

Lição 12: `Origin` e `Accept` obrigatórios, e o `XSRF-TOKEN` é reextraído do jar **depois** do login,
que o rotaciona.

```bash
J=/tmp/lotus.jar; rm -f $J
curl -s -c $J -H "Origin: http://localhost:5173" http://localhost:8080/sanctum/csrf-cookie -o /dev/null
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
curl -s -b $J -c $J -H "Origin: http://localhost:5173" -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $X" -H "Content-Type: application/json" \
  -d '{"email":"admin@lotus.cl","password":"password"}' http://localhost:8080/api/login -o /dev/null
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')

curl -s -b $J -H "Origin: http://localhost:5173" -D /tmp/h-pdf.txt \
  http://localhost:8080/api/turmas/1/manual -o /tmp/e2e-manual.pdf
curl -s -b $J -H "Origin: http://localhost:5173" -D /tmp/h-docx.txt \
  http://localhost:8080/api/turmas/1/manual/docx -o /tmp/e2e-manual.docx
grep -i "content-type\|content-disposition" /tmp/h-pdf.txt /tmp/h-docx.txt
pdfinfo /tmp/e2e-manual.pdf | grep -E "Pages|Page size"
```

Esperado: `application/pdf` + `inline; filename="manual-turma-1.pdf"`;
`…wordprocessingml.document` + `attachment; filename="manual-turma-1.docx"`; `Pages: 5` e
`Page size: 1009.15 x 612.3 pts`.

- [ ] **Step 3: Peso medido, não estimado (DoD 1)**

```bash
ls -la /tmp/e2e-manual.pdf /tmp/e2e-manual.docx
curl -s -b $J -H "Origin: http://localhost:5173" \
  http://localhost:8080/api/certificates/1/pdf -o /tmp/e2e-cert.pdf
ls -la /tmp/e2e-cert.pdf docs/templates/certificado.pdf
```

Registrar os três números no relatório. A linha de base do certificado são é **40.119 bytes**
(medida no gate de `certificacao-lote-e-snapshot`); o teto é a ordem do documento aprovado pela
Lotus, **251.450 bytes**. Um PDF na casa dos megabytes **reprova** o DoD.

- [ ] **Step 4: Visto renderizado (DoD 8)**

```bash
pdftoppm -png -r 100 -f 1 -l 2 /tmp/e2e-cert.pdf /tmp/gate-cert
pdftoppm -png -r 100 -f 1 -l 2 docs/templates/certificado.pdf /tmp/gate-cert-tpl
pdftoppm -png -r 72 -f 1 -l 5 /tmp/e2e-manual.pdf /tmp/gate-manual
pdftoppm -png -r 72 -f 1 -l 5 docs/templates/manual.pdf /tmp/gate-manual-tpl
```

Abrir os 14 PNGs com `Read` e comparar página a página. Registrar as divergências **conhecidas e
aceitas** (fora de escopo, §7 da spec): assinatura da gerente, carimbos SENCE/NCH, ornamentos das
quinas do manual. Qualquer divergência **não** prevista vira achado, não nota de rodapé.

- [ ] **Step 5: Contrato do certificado idêntico (DoD 7)**

```bash
curl -s -b $J -H "Origin: http://localhost:5173" -H "Accept: application/json" \
  http://localhost:8080/api/certificates | head -c 600
UUID=$(curl -s -b $J -H "Accept: application/json" -H "Origin: http://localhost:5173" \
  http://localhost:8080/api/certificates/1 | python3 -c "import sys,json;print(json.load(sys.stdin)['uuid'])")
curl -s http://localhost:8080/api/publico/certificados/$UUID | head -c 400
```

Esperado: mesma forma e mesmos valores de antes do bloco, incluindo `snapshot_ok` discriminando
certificado são de corrompido — o banco de dev carrega o `LOT-2026-1001` **corrompido de propósito**,
que é a evidência viva dessa discriminação. **Não rodar `migrate:fresh --seed`**: o certificado
corrompido está lá para o checkpoint visual do João, ainda pendente.

- [ ] **Step 6: Órfãos e leis §5**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn "OoxmlPackager\|DocxToPdf\|Xml::text\|Xml::lines\|@xml" app/ resources/ tests/ | wc -l
grep -rn "ManualPdfService\|manual-turma.blade\|class=\"accent\"\|class=\"qr\"\|class=\"meta\"" app/ resources/ tests/ || echo "zero sobra"
grep -rn "Repository" app/Domains/ | grep -v "não Repository" || echo "zero Repository"
```

Esperado: cada classe nova com consumidor real; `zero sobra`; `zero Repository`.

- [ ] **Step 7: Decidir o destino de ADR — pergunta ao João**

`App\Shared\Office\` e a rota LibreOffice são decisão de **arquitetura de transporte**, irmã do
ADR-12. A spec (§9) deixou a forma em aberto e prevê aprovação humana. **Recomendação do plano: nota
no ADR-12**, não ADR novo — o ADR-12 já é "conversão de documento por serviço externo do compose", e
a rota LibreOffice é uma segunda porta do **mesmo** serviço, com o mesmo racional de "o transporte
mora num lugar só". Um ADR-13 separado dividiria a decisão em duas metades que não se leem sozinhas.
Apresentar ao João e gravar o que ele decidir.

- [ ] **Step 8: Pendências e estado**

Revisar `docs/pendencias.md`: a **P-08** (RF-CUR-04 promete manual por curso) **não** dispara — o
bloco mantém Blade única padronizada. A **P-03** não fecha: um bloco de backend só. Registrar
qualquer pendência nova que o gate produzir.

Atualizar `docs/superpowers/state.md` para `workflow_state: ready_for_review`,
`next_action: request_code_review`, com o `state_basis_commit` do último commit durável, e a seção do
item ativo contando o que o gate mediu — inclusive o que **não** provou.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/state.md docs/pendencias.md docs/adrs.md
git commit -m "chore(state): gate de documentos-oficiais-template-e-docx, bloco em ready_for_review"
```

O bloco **para** em `ready_for_review`. Não inicia review, fechamento, push nem PR automaticamente.

---

## Desvios — o que o plano fixou e a spec deixara em aberto

Escritos aqui em vez de silenciados (lição 13).

**D-P1 — a conversão PNG→JPEG usa a rota `screenshot` do Gotenberg, não uma mudança de infra.** A
spec registrou o problema (GD sem `imagejpeg()`, nenhum codificador no ambiente) como preocupação de
execução, sem escolher a saída. A alternativa óbvia era acrescentar `libjpeg-turbo-dev` e
`--with-jpeg` ao `docker/php/Dockerfile`; foi **recusada** por trocar imagem de produção para
converter um asset uma única vez. `/forms/chromium/screenshot/html` foi provada em 2026-08-10:
`http=200`, JPEG **1414×2000 de 74.604 bytes** com `quality=92`, contra os 98.258 do mesmo fundo
dentro do certificado aprovado. Zero dependência nova.

**D-P2 — são duas faces WOFF2, não quatro.** A spec §3.3 escreve "quatro faces WOFF2 com subset
latino". Medido: Lexend e Montserrat são **fontes variáveis**, e o Google Fonts serve a **mesma** URL
para os pesos 400, 700 e 800 do Lexend. Dois arquivos (39.680 + 19.012 bytes) cobrem os quatro pesos
com `font-weight: 100 900` no `@font-face`. Menos bytes e menos arquivo para divergir.

**D-P3 — o manual declara `Arial`, não `Liberation Sans`.** A spec §2.1 concluiu, corretamente, que
a fonte do template é Liberation Sans (`pdffonts`) e que o Gotenberg já a tem. Mas o
`docs/templates/manual.docx` declara **`w:rFonts w:ascii="Arial"`**: Liberation Sans é a
**substituição métrica** que o LibreOffice aplica na conversão. Declarar Liberation Sans acertaria o
conversor e erraria o Word do cliente, que não a tem. Declarar Arial acerta os dois.

**D-P4 — o papel é `20183 × 12246` twips, não `20160 × 12240`.** O probe da spec §1.3 usou números
redondos e saiu em 1008 × 612 pt contra os 1009 × 612 do template. O `w:sectPr` do
`manual.docx` traz os valores exatos, junto do `w:pgMar` (`340/454/454/454`, header 85, footer 113).
O plano copia os medidos.

**D-P5 — as grades do manual têm linha fixa, e o plano diz o que fazer quando N estoura.** O DoD 4 da
spec fala em "N linhas". O template é um **formulário impresso** com 22 linhas numeradas em
Antecedentes e 20 em Asistencia e Evaluaciones. A regra é `max(N, fixas)`: turma pequena mantém as
linhas em branco do formulário; turma grande estende a grade. Truncar esconderia aluno; encolher
descaracterizaria o formulário.

**D-P6 — os títulos de página do manual não têm ornamento, e o `<w:drawing>` do logo é inline.** O
template rasteriza a faixa inteira (4205×378) com o título dentro. Sem raster (D3), o título vira
texto Arial Bold 16pt centralizado numa tabela de 3 colunas com o logo à direita e borda inferior
única — a reconstrução mais próxima que o formato dá sem trazer o raster de volta.

**D-P7 — `printBackground` não é necessário.** Antes de aplicar o fundo, foi medido se o Chromium do
Gotenberg omite backgrounds na impressão: os PDFs com e sem o campo saíram **byte a byte do mesmo
tamanho** (5.502), e o pixel do topo do PDF sem o campo é o azul declarado. `PageOptions` e
`GotenbergHtmlToPdf` **não mudam** — a spec não previa a pergunta, e a resposta poupou uma alteração
no transporte compartilhado do certificado.

**D-P9 — a declaração XML não pode ser escrita literalmente na Blade, e por isso existe `@xmlDecl`.**
Medido no container em 2026-08-10: `short_open_tag => On`. Uma Blade que abra com
`<?xml version="1.0"…?>` compila num arquivo PHP onde essa linha é lida como **tag curta** —
`Parse error: syntax error, unexpected identifier "version"`, confirmado executando os dois casos
lado a lado. As quatro Blades do pacote abrem com `@xmlDecl`. A saída alternativa seria
`{!! '<?xml …?>' !!}`, recusada por reintroduzir na Blade exatamente a interpolação crua que a guarda
de escape proíbe.

**D-P8 — o `.meta` de hoje está no canto ESQUERDO, não no direito.** A instrução do João diz
"realocar [o QR] no canto superior direito, onde hoje está o cód e data". Hoje `.meta` abre a página
1 à **esquerda** (`certificate.blade.php:244-247`), e o template aprovado também. A spec §3.4 já
tinha registrado o fato e decidido pelo **canto direito**, seguindo a imagem que ele anexou; o plano
segue a spec. Fica anotado para o checkpoint visual do Step 4 da Task 10, porque inverter o lado é
uma linha de CSS se ele quiser o contrário.

---

## Handoff de execução

**`executor: claude`.**

O bloco é ALTO RISCO por documento com peso legal mais infra nova em caminho de produção, mas o que
decide o executor é outra coisa: **metade das tasks fecha por comparação visual**. Tasks 3, 4, 5, 7 e
10 exigem renderizar PDF, abrir PNG e comparar página a página com o template — um laço de
render → olhar → ajustar que precisa de leitura de imagem a cada iteração, não de um relatório sobre
ela. É o mesmo motivo pelo qual a Task 4 remede o limiar em vez de herdá-lo.

Paths autorizados: `backend/resources/`, `backend/app/Shared/Office/`,
`backend/app/Domains/{Operation,Certification}/`, `backend/app/Providers/AppServiceProvider.php`,
`backend/tests/`, `frontend/src/features/operation/`, `frontend/src/shared/config/locales/`,
`docs/superpowers/state.md`, `docs/pendencias.md`, `docs/adrs.md`.

**Fora dos paths, nada.** Em especial: `backend/database/` não abre (zero schema),
`frontend/src/shared/api/generated.ts` não se edita à mão (ADR-04), e
`docs/templates/` é fonte de referência — somente leitura.

O review do bloco é declarado **ALTO RISCO** pela §8 da spec → **duas frentes: lente Claude com o
gabarito do projeto e segunda frente do Codex read-only.** O review não roda automaticamente ao fim
da Task 10.
