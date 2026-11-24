# Bloco 62 — medição do Gotenberg

Stack local da lane 62, Gotenberg `8.36.0` com `mem_limit: 768m` (o mesmo de
`docker-compose.prod.yml`, agora também no `docker-compose.yml`). Medido em 2026-11-24.

Certificado de medida: o snapshot do `CertificadoMatrizGotenbergTest` com **16 módulos** de 3
marcadores (o caso `temario_grande`), pelo `CertificatePdfService` de produção e o
`GotenbergHtmlToPdf` de produção. Sai com **3 páginas** e 459.179 bytes — é o limite superior;
o certificado típico é menor (ver "Por tamanho do temário").

**Método.** O script é [`medir-gotenberg.php`](./medir-gotenberg.php), nesta pasta. Ele sobe o
Laravel dentro do container `app`, monta o `html()` do `CertificatePdfService` por reflexão (para
separar o custo do PHP do custo do conversor) e posta no Gotenberg o mesmo formulário do
`GotenbergHtmlToPdf` (`preferCssPageSize=true`), com campos extras opcionais. Da raiz da lane:

```bash
docker compose exec -T -e N=10 -e MODULOS=16 -e OUT=/tmp/62-antes -e EXTRA='{}' \
  app php < docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medir-gotenberg.php
```

O container do Gotenberg roda com `mem_limit: 768m` **e** `memswap_limit: 768m`: sem o segundo,
o Docker dava `MemorySwap = 1,5 GiB` e o WSL tem swap, então o container passaria de 768m sem ser
morto. Confirmado com `docker inspect` depois de recriado: `Memory=805306368
MemorySwap=805306368`.

## Unitário

### Baseline (10 renderizações do mesmo certificado, depois de 2 de aquecimento)

| Medida | Mediana | Máximo |
|---|---|---|
| HTML montado no PHP (`CertificatePdfService::html`) | 13,5 ms | 28,6 ms |
| Conversão no Gotenberg (`HtmlToPdf::render`) | 786,1 ms | 925,1 ms |
| Tamanho do HTML enviado | 275.646 bytes | — |

O tempo é do Chromium: o PHP é ~1,7% do total. No aquecimento (N=2, logo depois de subir o
container) o primeiro render levou 1.825 ms e o segundo 782 ms: o Chromium frio custa ~1 s a mais
uma vez.

Páginas do baseline: `pdftoppm -png -r 72` em `/tmp/62-antes/` no container `app` (3 páginas),
geradas e descartadas — sem ajuste, não há "depois" a comparar.

### Por tamanho do temário (N=8 cada)

| Módulos | Páginas | HTML | Gotenberg (mediana) |
|---|---|---|---|
| 0 | 1 | 264.056 bytes | 562 ms |
| 5 | 2 | 267.900 bytes | 657 ms |
| 16 | 3 | 275.646 bytes | 865 ms |

O HTML quase não muda (são as imagens e fontes em base64, ~260 KB fixos); o tempo cresce com as
páginas.

### Hipóteses

**(a) Opções do formulário.** As duas esperas de rede do Chromium já vêm desligadas no 8.36, e
forçar cada uma a `false` prova isso:

- `skipNetworkIdleEvent=false` (N=10): mediana 1.693 ms contra 810 ms do default — o default é
  `true`.
- `skipNetworkAlmostIdleEvent=false`: a conversão não termina; o client do Laravel corta em 30 s
  (`cURL error 28`). O default é `true`.

Então mandar `skipNetworkAlmostIdleEvent=true` é mandar o default, e as rodadas A/B intercaladas
(N=5 cada) são na prática A/A — o que explica o sinal trocar de lado:

| Rodada | default | `=true` | default (máquina quieta) | `=true` (máquina quieta) |
|---|---|---|---|---|
| 1 | 1.333 ms | 1.338 ms | 1.036 ms | 1.080 ms |
| 2 | 1.574 ms | 1.458 ms | 1.545 ms | 1.298 ms |
| 3 | 1.431 ms | 1.562 ms | 988 ms | 846 ms |
| 4 | 1.252 ms | 1.284 ms | 807 ms | 823 ms |
| 5 | 1.231 ms | 881 ms | 1.012 ms | 996 ms |

As duas primeiras colunas foram medidas com a suíte do frontend de outra task rodando na mesma
máquina; as duas últimas, sem ela. A dispersão entre rodadas do mesmo braço (807 a 1.545 ms) é a
medida do ruído desta máquina, e é maior que qualquer diferença entre braços. Não há outra opção do
formulário que mude o trabalho do Chromium sem mudar o documento.

**(b) Arquivos estáticos lidos e codificados a cada render.** Teto do ganho = o tempo inteiro do
PHP, 13,5 ms de ~800 ms: 1,7%. Abaixo do corte de 5% mesmo no melhor caso, então não foi
implementado.

### Resultado

Nenhum ajuste entrou: nenhuma hipótese passou do corte de 5% da mediana (plano, Task 3 Step 3).
`GotenbergHtmlToPdf` e `CertificatePdfService` ficam como estão, e o documento é o mesmo por
construção. A suíte de PDF segue verde:
`php artisan test --filter='CertificadoMatrizGotenberg|CertificatePdf|PublicCertificatePdf|HtmlToPdf'`
→ 98 passed (2275 assertions).

### Insumos para o lote (Task 4)

- **Onde está o ganho.** O custo é do Chromium, então o ganho do ZIP só pode vir de converter em
  paralelo.
- **Limites do Gotenberg** (`gotenberg --help` no 8.36): `--chromium-max-concurrency` = 6
  conversões simultâneas por default; acima disso o Gotenberg enfileira. O Chromium reinicia a cada
  100 conversões (`--chromium-restart-after`), e o restart custa o aquecimento de ~1 s.
- **Memória em série** (`docker stats` a cada ~1 s durante 10 renders do caso de 3 páginas): ~410 MiB
  ociosa, pico de 498 MiB de 768. Sobram ~270 MiB para conversões simultâneas. `RestartCount=0` e
  `OOMKilled=false` depois de todas as medições desta seção.
- **Projeção serial.** A quente, 0,56 s (1 página) a 0,86 s (3 páginas) por certificado, mais o
  PHP. Com a dispersão desta máquina (até ~1,5 s), 30 certificados em série ficam entre ~20 s e
  ~45 s. Pela regra do teto (tempo medido × 2 ≤ 120 s), a renderização serial sozinha já comporta ~40
  certificados no pior caso de página; a Task 4 mede o real.
- **Timeout do client.** `GotenbergHtmlToPdf` usa o timeout default do `Http` do Laravel, 30 s por
  requisição. Numa conversão em paralelo cada requisição espera a sua vaga no Chromium; com fila,
  30 s pode não bastar, e a Task 4 precisa conferir isso.
