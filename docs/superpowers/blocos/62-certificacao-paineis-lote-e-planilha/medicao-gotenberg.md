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

## Lote

Medido em 2026-11-24, no mesmo stack (Gotenberg `8.36.0`, `mem_limit` e `memswap_limit` de 768m,
`RestartCount=0` no início). **Default de `services.gotenberg.concurrency` = 2** e **teto do ZIP = 70
certificados**; as duas contas estão abaixo.

**Método.** Dois scripts nesta pasta: [`medir-lote.php`](./medir-lote.php) (monta N certificados
sintéticos, sem tocar o banco, e os renderiza pelo `CertificatePdfService` de produção — `render()`
um a um na "série", `renderMany()` com `CONC` conversões em voo no "lote") e
[`medir-lote.sh`](./medir-lote.sh) (orquestra rodadas e amostra a memória). Da raiz da lane:

```bash
RODADAS=4 bash docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medir-lote.sh
MIX=grande NS="2" RODADAS=3 bash .../medir-lote.sh   # 30 certificados de 3 páginas
CERTS=60 NS="2" RODADAS=2 bash .../medir-lote.sh     # 60 certificados
```

- Turma de **30 certificados**, `misto` = 10 sem temário (1 página), 10 com 5 módulos (2 páginas) e 10
  com 16 módulos (3 páginas); `grande` = os 30 com 16 módulos, o limite superior do documento.
- **Intercalado:** cada rodada percorre a série e N = 1, 2, 3, 4, 6, porque o ruído desta máquina
  (8 núcleos, WSL) é maior que a diferença entre braços. **7 rodadas** do `misto` (3 + 4, em duas
  execuções do script) por braço, depois de 2 renders de aquecimento.
- **Memória:** `docker stats` a cada ~1 s durante a execução (é o número do Docker, líquido de cache de
  página, o que o `mem_limit` compara) e a leitura de antes da execução, porque o Chromium acumula
  memória até reiniciar a cada 100 conversões e o ponto do ciclo muda de uma execução para outra.
  `RestartCount`, `OOMKilled` e `oom_kill` do `memory.events` do cgroup ao fim de cada execução.
- O `renderMany` real chama o Gotenberg por `Http::pool` com o teto de concorrência do próprio client
  (o `$concurrency` do `pool()`, que o Laravel 13 tem), e o `HtmlToPdfTest` prova o teto.

### Varredura de N (30 certificados `misto`, 7 rodadas por braço)

| Braço | Tempo total (mediana) | Menor – maior | Pico de memória (mediana) | Pior pico | Folga na mediana / no pior |
|---|---|---|---|---|---|
| série (`render()` × 30) | 19,6 s | 18,4 – 20,6 s | 598 MiB | 642 MiB | 22% / 16% |
| N = 1 (`renderMany`) | 19,8 s | 18,3 – 24,7 s | 620 MiB | 633 MiB | 19% / 18% |
| **N = 2** | **12,3 s** | 10,9 – 22,2 s | 612 MiB | 638 MiB | **20% / 17%** |
| N = 3 | 14,8 s | 8,9 – 21,4 s | 656 MiB | 688 MiB | 15% / 10% |
| N = 4 | 18,2 s | 10,0 – 24,9 s | 736 MiB | 764 MiB | 4% / 0% |
| N = 6 | 15,6 s | 14,8 – 18,0 s | 766 MiB | 767 MiB | 0% / 0% |

Em nenhuma das 74 execuções medidas houve reinício, `OOMKilled` ou `oom_kill` do cgroup — nem a N = 6,
que fica colada no teto (767 de 768 MiB: o kernel recupera página, o container não morre, mas não resta
folga nenhuma). O tempo de N = 1 é o da série: o `renderMany` serial não perde para o loop de `render()`.

**Por que N = 2.**

- **Tempo.** É o único braço consistentemente rápido: 6 das 7 rodadas ficam entre 10,9 e 13,6 s (uma
  rodada foi a 22,2 s). N = 3 e N = 4 têm as duas modas (9–13 s e 18–25 s) na mesma bateria, e N = 6,
  com 6 conversões brigando por 768 MiB, é estável mas mais lento que N = 2. O ganho não cresce com mais
  conversões em voo: o Chromium do Gotenberg passa a competir por CPU e memória.
- **Memória.** N = 2 pica no mesmo lugar que a série e que N = 1 (mediana 612 contra 598 e 620 MiB; a
  diferença é menor que a dispersão do próprio N = 1). N = 3 sobe a mediana em ~40 MiB e leva o pior
  caso a 10% de folga; N = 4 e N = 6 passam de 95% do teto.
- **Folga ≥ 20%.** O critério do plano (pico ≤ 614 MiB) é atendido por N = 2 **na mediana** (20%), não
  em toda execução (pior: 17%) — e **a própria série, sem concorrência nenhuma, também não o atende em
  toda execução** (pior: 16%): o pico é do ciclo de vida do Chromium, não do paralelismo. O critério foi
  lido como "não pior que o serial", e isso fica como decisão para o João conferir. N = 2 é o maior N
  que o satisfaz nesse sentido.

### Série contra lote, e o ZIP

| Lote | Série (`render()` em sequência) | N = 2 | Ganho |
|---|---|---|---|
| 30 `misto`, 7 rodadas | 19,6 s (18,4 – 20,6) | 12,3 s (10,9 – 22,2) | 37% |
| 30 `grande` (3 páginas), 3 rodadas | 22,9 s (22,7 – 24,3) | 13,9 s (12,9 – 15,3) | 39% |
| 60 `misto`, 2 rodadas | 38,3 s (36,8 – 39,9) | 31,1 s (26,8 – 35,3) | 19% |

O ganho existe e é de 20 a 40%, não de 2×: o Chromium é um processo só, e a conversão em duas abas
divide o mesmo CPU. Em 60 certificados o ganho cai (duas rodadas só; o Chromium reinicia a cada 100
conversões). A montagem do arquivo ZIP em si é da Task 6 e fica fora destes tempos.

Pico de memória do PHP no `renderMany`: **82 MiB com 30 certificados e 120 MiB com 60** (a série fica em
40 MiB), porque o lote guarda os HTMLs (~275 KB cada) e os PDFs (~460 KB cada) em memória. O limite do
FPM é 256 MiB (`docker/php/www.conf`): 70 certificados ficam em ~140 MiB, e a Task 6 não pode somar a
isso um ZIP inteiro em memória (monta em arquivo temporário, como a spec §5.5 já manda).

### Teto do ZIP: 70 certificados

A regra: o maior lote cujo **tempo medido × 2 ≤ 120 s** (o `fastcgi_read_timeout` de produção),
arredondado para baixo à dezena. A conta usa o **pior tempo por certificado de qualquer braço medido**,
0,81 s (a série de 3 páginas: 24,3 s para 30), e não o do N = 2 típico (0,41 s): produção tem 2 vCPU, a
máquina de medida tem 8, e não está provado que lá o paralelismo ganhe alguma coisa. Com 0,81 s por
certificado, 60 s (metade do timeout) comportam 74 certificados, ou **70**. Com o ritmo típico do N = 2
(0,41 s) o teto seria 140; o de 70 vale mesmo se o ganho do paralelismo for zero. Duas conferências: 60
certificados a N = 2 levaram no máximo 35,3 s, e 70 em série de 3 páginas levariam ~57 s. O teto se
refaz se o `mem_limit` do Gotenberg ou o tamanho do host mudarem.

### Timeout do client

Fica o default do `Http` (30 s por requisição), sem ajuste. O teto de concorrência é do client: a
requisição só é construída e enviada quando uma vaga abre, então o relógio do timeout só corre depois
que o Gotenberg a recebeu, e com N ≤ 6 (`--chromium-max-concurrency`) o Gotenberg não enfileira nada.
Uma conversão leva 0,5 a 1,5 s sozinha; na execução mais lenta da bateria (32,7 s para 30
certificados, a N = 6) cada requisição levou em média ~6,5 s (6 em voo), longe dos 30 s, e fechou com
zero falhas. Se alguém subir `GOTENBERG_CONCURRENCY` acima de 6, o Gotenberg passa a
enfileirar do lado dele e o timeout volta a contar espera: o valor deve ficar em 6 ou menos.

### Documento igual sob concorrência

PDFs gravados (`DUMP`) de uma série de 30 e de 21 lotes (N = 3: 5, N = 4: 9, N = 6: 7), comparados
certificado a certificado: **tamanho idêntico nos 630 arquivos** e, nos 15 lotes da segunda leva (450
arquivos), **`pdftotext` idêntico**; no par conferido byte a byte (série contra N = 6) o arquivo difere em
4 bytes. Uma única execução da primeira varredura (N = 4, rodada 1) somou 57.007 bytes a mais que as
demais (12.792.158 contra 12.735.161): não se guardaram os arquivos dela, não se reproduziu em nenhuma
das outras 70 execuções, e ela fechou com `falhas=0`. Fica registrada como anomalia não explicada — um
motivo a mais para o default ser 2 e não 4.

Depois da varredura, o multipart do adapter passou de `->attach()` para `asMultipart()` com as partes
montadas num método só, usado pelo unitário e pelo lote (a guarda de pivot do `PersistenceLawsTest`
proíbe `->attach(` em `app/`). Reconferido contra o Gotenberg real: 6 certificados em série e em lote
a N = 2 saem com o mesmo total de bytes de antes (2.541.064), `pdftotext` igual em cada um, 3 páginas A4;
e `CertificadoMatrizGotenbergTest` (47 casos, Gotenberg real) segue verde.
