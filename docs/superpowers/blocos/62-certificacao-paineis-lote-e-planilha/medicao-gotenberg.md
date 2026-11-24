# Bloco 62 — medição do Gotenberg

Stack local da lane 62, Gotenberg `8.36.0` com `mem_limit: 768m` (o mesmo de
`docker-compose.prod.yml`, agora também no `docker-compose.yml`). Medido em 2026-11-24.

Certificado de medida: o snapshot do `CertificadoMatrizGotenbergTest` com **16 módulos** de 3
marcadores (o caso `temario_grande`), pelo `CertificatePdfService` de produção e o
`GotenbergHtmlToPdf` de produção. Sai com **3 páginas** e 459.179 bytes. O script lê o
`html()` por reflexão para separar o custo do PHP do custo do conversor; ele vive no scratchpad
da sessão, não no repositório.

## Unitário

### Baseline (10 renderizações do mesmo certificado, depois de 2 de aquecimento)

| Medida | Mediana | Máximo |
|---|---|---|
| HTML montado no PHP (`CertificatePdfService::html`) | 13,5 ms | 28,6 ms |
| Conversão no Gotenberg (`HtmlToPdf::render`) | 786,1 ms | 925,1 ms |
| Tamanho do HTML enviado | 275.646 bytes | — |

O tempo é do Chromium: o PHP é ~1,7% do total. O primeiro render depois de subir o container
custa ~1,8 s (Chromium frio); os seguintes, ~0,8 s.

Páginas do baseline: `pdftoppm -png -r 72` em `/tmp/62-antes/` no container `app` (3 páginas).

### Hipóteses

**(a) Opções do formulário.** No 8.36 o `skipNetworkIdleEvent` já é `true` por default: forçá-lo a
`false` dobra o tempo (mediana 1.693 ms contra 810 ms), o que confirma que o default já é o
caminho rápido e não há ganho a buscar nele. O `skipNetworkAlmostIdleEvent=true` foi medido em
cinco rodadas A/B intercaladas de 5 renders cada:

| Rodada | default | `skipNetworkAlmostIdleEvent=true` |
|---|---|---|
| 1 | 1.333 ms | 1.338 ms |
| 2 | 1.574 ms | 1.458 ms |
| 3 | 1.431 ms | 1.562 ms |
| 4 | 1.252 ms | 1.284 ms |
| 5 | 1.231 ms | 881 ms |

Sem ganho consistente: o sinal troca de lado entre rodadas e a variação entre rodadas é maior que
a diferença A/B. (As medianas dessas rodadas são mais altas que o baseline porque a suíte do
frontend de outra task rodava na mesma máquina; o pareamento intercalado é o que neutraliza isso.)

**(b) Arquivos estáticos lidos e codificados a cada render.** Teto do ganho = o tempo inteiro do
PHP, 13,5 ms de ~800 ms: 1,7%. Abaixo do corte de 5% mesmo no melhor caso, então não foi
implementado.

### Resultado

Nenhum ajuste entrou: nenhuma hipótese passou do corte de 5% da mediana (plano, Task 3 Step 3).
`GotenbergHtmlToPdf` e `CertificatePdfService` ficam como estão, e o documento é o mesmo por
construção. A suíte de PDF segue verde:
`php artisan test --filter='CertificadoMatrizGotenberg|CertificatePdf|PublicCertificatePdf|HtmlToPdf'`
→ 98 passed (2275 assertions).

O que a medição ensina para o lote (Task 4): o custo é do Chromium, então o ganho do ZIP só pode vir
de converter em paralelo. O Gotenberg aceita até `--chromium-max-concurrency` = 6 conversões
simultâneas por default (`gotenberg --help`), e reinicia o Chromium a cada 100 conversões
(`--chromium-restart-after`).
