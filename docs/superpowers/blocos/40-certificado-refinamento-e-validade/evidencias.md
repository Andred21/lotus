# Bloco 40 — Evidências

> Registro da Task 14, 2026-10-29, sobre `dcf04675`, atualizado na onda de correção da revisão final
> (achado A refeito com o código final, gates no HEAD final). Stack da lane
> no offset +1 (front `http://localhost:5174`, backend via nginx `http://localhost:8081`), Gotenberg
> `8.36.0` (Chromium 151). O que é prova de teste aponta o teste; o que é inspeção visual diz o
> comando e o que se viu. Os PNGs e as capturas do smoke ficam em `/tmp/task14/`, fora do repositório.

## 1. Divergências e pendências que este registro assume

- **Fato 7 do `context.md` contradito pela pesquisa.** O packet diz "Retenção ≥ 3 anos (cláusula
  4.2.4) só por snippet". A `validade.md` (Task 13) não confirma: o texto que se conseguiu ler da
  NCh 2728 (o projeto de 2002, não a edição 2015, que é paga) só exige que a OTEC tenha um
  procedimento de retenção de registros, sem fixar prazo. Os "3 anos" podem ser a vigência da
  certificação NCh 2728 e não a retenção, mas isso é hipótese. O `context.md` **não foi editado**
  (é o retrato datado do planejamento); a divergência fica aqui e a pendência de prazo de guarda
  fica na lista da Lotus da `validade.md`. O resto dos fatos 6 e 7 se sustentou, com uma ressalva
  de redação no art. 5 da Ley 19.799 (original vs vigente) descrita na `validade.md` §3.
- **Medição de produção da Task 6: pendente.** Leitura de produção recusada pelo auto mode;
  aguardando o João. **É portão de merge:** antes do merge, o João roda `medir-prod.php`; o
  controlador confere as folgas (nomes >= 1,5x o maior de produção; descrição >= maior de produção);
  se algum dado passar do teto, o bloco para e volta ao João. Enquanto não vier, a coluna
  "maior de produção" da `matriz.md` segue "pendente", e a conferência das folgas não foi feita (spec §4.5).
- **Calibração da limpeza da assinatura com foto de celular real: item 4 da Verificação externa
  (`aceitacao.md`), do João.** Não havia foto real; o smoke usou imagens sintéticas (§4), e a foto
  sintética de gradiente forte, que falhava na Task 14, passa limpa com o código final (achado A,
  resolvido nas rodadas 3 e 4 da Task 8, `7dadbe4b` e `ce7257f2`). Os limiares estão em
  `CleanSignatureOptions` (`shared/lib/signature/cleanSignature.ts`) e se ajustam sem mexer no resto.

## 2. Inspeção visual do layout v5 (Task 5)

Detalhe completo em `.superpowers/sdd/plano/task-5-report.md` (ledger local). Resumo do que vale
como evidência:

**Comando** (script descartável em `/tmp`, fora do repo; usa o `HtmlToPdf` real da aplicação contra o
Gotenberg real e injeta assinaturas sintéticas geradas por GD):

```bash
docker compose cp <scratchpad>/vis/render.php app:/tmp/render.php
docker compose exec -T app sh -c 'php /tmp/render.php ref && \
  pdfinfo /tmp/cert-ref.pdf && pdftoppm -png -r 100 /tmp/cert-ref.pdf /tmp/cert-ref'
# posição de cada linha de texto (px a 100 dpi), para comparar com a referência
docker compose exec -T app sh -c 'pdftotext -f 1 -l 1 -bbox-layout /tmp/cert-ref.pdf /tmp/b.html && php /tmp/pos.php'
```

A 100 dpi o PNG tem 827x1170, a mesma grade de `referencia-layout-p1.png` e `referencia-layout-p2.png`.
Dados da referência: Sebastián Gallardo, RUT 16.200.019-5, "Mantenimiento de subestaciones",
Transelec, 5 módulos.

**Conclusão.** Página 1 e página 2 conferem com as referências, iteradas até a diferença ficar em
poucos pixels: faixas de barras no topo e no rodapé; bloco de verificação à esquerda (QR 22 mm,
larguras de "N° LOT-…", "Emitido el" e da instrução a menos de 2 px); logo no mesmo tamanho e lugar
nas duas páginas; título a y=288 (referência 287); abertura, nome do aluno, RUT, curso e parágrafo nas
mesmas linhas; assinaturas em colunas iguais (traços 110..370 e 458..717), gerente à esquerda,
instrutor à direita; rodapé "LOT-2026-1001 · Página 1 de 2". Na página 2, quadro do temário em
x=71..756 a partir de y=224 e aviso legal no pé. Nas rodadas de correção (fontes, cabeçalho do quadro
do temário) as larguras de texto passaram a bater na referência a menos de 1%, medidas por pixel.

**Cenários medidos no mesmo script:**

| Cenário | Páginas | Observação |
|---|---|---|
| referência (5 módulos) | 2 | confere com a referência |
| curso de 90 caracteres, cabeçalho do temário em 2 linhas | 2 | confere |
| nota 6,5 + asistencia 92,5 % + válido hasta | 2 | assinaturas na página 1 |
| sem nenhuma assinatura | 2 | caixa vazia, traço, nome e cargo |
| sem temário | 1 | aviso legal no pé da página 1; "Página 1 de 1" |
| realista longo (nome e curso em 2 linhas, descrição de ~600 caracteres, empresa de 70) | 2 | assinaturas na página 1 |
| adversário (W×120, M×120, X×200, descrição sem espaço, empresa Z×150, instrutor Q×120) | 3 | nada cortado; assinaturas na página 2 |
| temário de 18 módulos | 4 | quebra só entre módulos; cabeçalho e fundo em todas |
| MUESTRA | 2 | marca d'água em toda página física |

**Assinaturas inteiras na quebra (rodada 1).** Antes da correção, com a descrição entre 29 e 34
repetições de uma frase de 45 caracteres, cargo ou imagem ficavam na página 1 e o resto na 2. Com
`break-inside: avoid` em `.firmas` e `.firma`, imagem, nome e cargo sempre ficam juntos (página 1 até
28 repetições, página 2 daí em diante). Teste: `CertificatePdfTest::test_assinaturas_nao_se_partem_na_quebra_de_pagina`.

### 2.1 Como o `fundo-certificado-continuacao.jpg` foi gerado

O procedimento **não está commitado em nenhum script** (a spec pede o asset "gerado uma vez"), então
fica registrado aqui. O brief mandava extrair o JPEG da página 2 do aprovado:

```bash
pdfimages -j -f 2 -l 2 docs/templates/certificado.pdf /tmp/fundo-p2
```

Esse JPEG trazia o logo da Lotus **embutido** (pintado a ~16-50 mm do topo, posição diferente da do
logo da página 1 do aprovado, 11-34 mm), o que dobrava o logo em toda página de continuação. O asset
commitado foi gerado assim:

1. Base: `docs/templates/fundo-certificado.png`, o mesmo padrão geométrico, sem logo e **com** as
   faixas preto/azul nas bordas.
2. As faixas das barras (34 px no topo e 34 px embaixo, em 1414x2000) foram cobertas com as mesmas
   linhas de pixels do JPEG da página 2 do aprovado, que é cinza limpo nessas bordas. A composição
   foi feita no Chromium (uma página descartável, fora do repositório, sobrepondo essas linhas às
   barras do PNG de base); o script não foi guardado, e esta é a descrição do que o relatório da
   Task 5 registrou.
3. Captura em JPEG pelo Gotenberg, rota `/forms/chromium/screenshot/html`, tela de 1414x2000,
   qualidade 88. Resultado: `backend/resources/images/fundo-certificado-continuacao.jpg`, JPEG
   1414x2000, ~45 KB, sem barras, sem logo e sem emenda visível.
4. Conferência: `file` (JPEG, 1414x2000), `pdfimages -list` do PDF final (o fundo de continuação e o
   da primeira página aparecem uma vez cada) e leitura dos PNGs de página 2 (§5).

Para refazer o asset (por exemplo, se a Lotus trocar o padrão), repita o passo 2 e 3 e rode a matriz
de novo: o fundo da primeira página (`fundo-certificado.jpg`) e o de continuação precisam continuar
casando na emenda da faixa inferior (`@page` de 12 mm, `background-position: 0 100%`).

## 3. Matriz do certificado no Gotenberg real (Task 6)

Saída e tetos em [`matriz.md`](./matriz.md) (25 casos, tabela de páginas, onde ficam as assinaturas, o
temário e o aviso legal, reticências de cada caso). Teste:
`backend/tests/Feature/Certification/CertificadoMatrizGotenbergTest.php`, que roda no container e é
pulado fora dele. Rodada de hoje (container `app`, Gotenberg `8.36.0`):

```
docker compose exec -T app php artisan test --filter=CertificadoMatrizGotenbergTest
Tests:    47 passed (2078 assertions)
```

Tetos fixados em `backend/app/Shared/Support/TetosImpressos.php`: aluno 70, curso 110, técnico 160,
razão social 150, assinante 60, cargo 70, descrição 620.

**Medição de produção da Task 6: pendente: leitura de produção recusada pelo auto mode; aguardando o
João.**

Os dois composes estão na tag exata (`gotenberg/gotenberg:8.36.0` em `docker-compose.yml` e em
`docker-compose.prod.yml`). Atualizar a cópia do servidor (`/opt/lotus/docker-compose.prod.yml`) é o
item 1 da Verificação externa (`aceitacao.md`), do João.

## 4. Smoke no navegador (Step 2)

Navegador: Chromium (Playwright), 1440x900, idioma EN. Banco: o MySQL de dev da lane, migrado com
`php artisan migrate` (as duas migrations do bloco: `certificate_settings` e a permissão
`certification.settings.manage`). Dados de dev já existentes (`DatabaseSeeder` + demo): superadmin
`admin@lotus.cl`, sete redatores, duas turmas concluídas, dois certificados emitidos. Acrescentei no
banco de dev da lane (nunca produção) um usuário `admin2@lotus.cl` com o papel `admin` (para provar a
aba oculta) e defini a senha de dev do redator `pedro.soto@lotus.cl` (para entrar no Meu Perfil).

**Assinaturas de teste (decisão do controlador: não havia foto real).** Geradas com PHP GD no
container (PNG, o GD de lá não grava JPEG), em `/tmp/task14/`:

| arquivo | o que é |
|---|---|
| `assinatura-foto.png` | 3000x1100, traço escuro sobre papel cinza com gradiente forte (205 a ~120), ruído ±7, manchas pequenas e uma sombra escura no canto inferior esquerdo |
| `assinatura-foto-suave.png` | 3000x1100, mesmo traço, gradiente suave (228 a ~200), ruído ±6, manchas pequenas, sem sombra |
| `assinatura-scan.png` | 2000x700, o mesmo traço sobre branco limpo |

Roteiro e resultado:

| # | Passo | Resultado | Captura |
|---|---|---|---|
| 1 | Superadmin em Administración | aba **Settings** visível (rótulo EN de Configuración) | `/tmp/task14/02-admin.png`, `03-config.png` |
| 2 | Gerente: `assinatura-foto.png` (foto, gradiente forte) | **antes de `7dadbe4b`:** prévia transparente, mas sobrava o retângulo cinza do gradiente à direita e a sombra do canto (achado A). Não repetido na tela da gerente; o código é o mesmo e o passo 11 refaz o caminho com a mesma foto | `04-gerente-previa-foto.png` |
| 3 | Gerente: `assinatura-foto-suave.png`, "Use this signature" | prévia limpa, fundo transparente, recorte rente à tinta (as manchas de 4 a 16 px ficam e alargam o recorte à direita); aceita pelo servidor, 64 KB, "Settings saved" e "Signature saved" | `05-gerente-previa-foto-suave.png`, `06-gerente-salva.png` |
| 4 | Dialog do redator (People › Instructors › Juan Morales › Edit): foto forte | **antes de `7dadbe4b`:** mesma prévia do passo 2 (cinza e sombra); refeito no passo 11 | `10-dialog-previa-foto-forte.png` |
| 5 | Dialog do redator: `assinatura-scan.png`, "Use this signature" | prévia limpa e rente, fundo transparente; aceita, 24 KB; slot "Signature" sem tag de status | `11-dialog-previa-scan.png`, `12-dialog-firma-salva.png` |
| 6 | Meu Perfil (Pedro Soto, papel redator): foto forte, "Use this signature" | o slot "Signature" existe no perfil; a imagem é aceita pelo servidor (737 KB, abaixo do teto de 1 MB), "Document uploaded", **com o cinza e a sombra do achado A** (código anterior a `7dadbe4b`; o passo 11 substituiu essa assinatura) | `14-perfil-previa-foto-forte.png`, `15-perfil-firma-salva.png` |
| 7 | Admin comum (`admin2@lotus.cl`) em Administración | só a aba **Users**; sem **Settings** (a aba Roles também some, só do superadmin); `GET /api/certificate-settings` devolve **403** | `16-admin-sem-aba.png` |
| 8 | Painel de emissão (Certificates › Issuance), turma "Seguridad en alta tensión · Enel Distribución", aluna Camila Gallardo, redator Ana Reyes (sem `FIRMA`) | aviso amarelo: "Ana Reyes has no signature uploaded. The certificate will come out with a blank space above the line and the name below it, to be signed by hand." A emissão segue (botão "Confirm issuance") | `21-emision-dialog.png` |
| 9 | Emissão | `LOT-2026-1002` emitido, "Download PDF" | `22-emitido.png` |
| 10 | Assinatura viva (D5): sobe a `FIRMA` (scan) de Ana Reyes pelo dialog e baixa de novo o PDF de `LOT-2026-1002` | o mesmo certificado, já emitido, agora sai com a assinatura dela | `23-ana-firma.png`, `/tmp/task14/cert3b-1.png` |

| 11 | Refeito com o código final (`ce7257f2`), na onda de correção da revisão final: dialog do redator (People › Instructors › Pedro Soto › Edit › Replace signature), `assinatura-foto.png` (3000x1100, gradiente forte), "Use this signature"; depois `GET /api/certificates/2/pdf` de `LOT-2026-1001` (instrutor Pedro Soto) e `pdftoppm -r 110` | prévia sem fundo cinza, sem sombra e com o traço inteiro (1600x560 de saída; 737 KB viraram 63 KB no servidor, que substituiu a `FIRMA` antiga, soft-deleted); o PDF sai com a assinatura limpa (achado A, resolvido) | `/tmp/task14/i1-previa-foto.png`, `i1-dialog-subiu.png`, `i1-cert-1.png`, `i1-cert-2.png`, `i1-zoom2-1.png` |

A foto de celular **real** não foi testada (decisão do controlador); ela é o item 4 da Verificação
externa (`aceitacao.md`), do João.

**Achado A (limpeza de foto com iluminação desigual): resolvido.** Na Task 14, com
`assinatura-foto.png` (o papel cai ~85 níveis de cinza de um canto ao outro, mais uma sombra no canto
inferior esquerdo) a limpeza deixava um retângulo cinza à direita do traço e a sombra, porque o papel
era estimado como um valor único (percentil 90) e o gradiente passava da rampa (`inkFloor = 28`); o
defeito chegava ao PDF de `LOT-2026-1001`. Os commits `7dadbe4b` (papel estimado por região, manchas
pequenas apagadas) e `ce7257f2` (limiar de mancha relativo à espessura do traço) trocaram a limpeza.
Refeito no passo 11 com o código final: a prévia sai transparente, sem cinza e sem sombra, com o traço
inteiro e o recorte rente à tinta; e o PDF de `LOT-2026-1001` mostra a assinatura de Pedro Soto limpa
sobre o traço, sem retângulo nem sombra (§5). Sobram ~7 pontos soltos de 1 a 2 px perto do traço
(visíveis só a 220 dpi); são a poeira do papel sintético que ficou acima do limiar relativo. O caso
sintético é mais severo que uma foto razoável de celular, mas só uma foto real prova a calibração:
item 4 da Verificação externa, do João. Os parâmetros estão em `CleanSignatureOptions`.

**Achado B (visual, menor).** Em Administración › Settings, o conteúdo do submódulo (a frase "This
setting applies to all certificates…") encosta na linha da barra de abas, sem respiro no topo
(`03-config.png`). Não afeta função.

## 5. PDF real (Step 2, emissão e reimpressão)

PDFs baixados da API com a sessão do navegador (`GET /api/certificates/{id}/pdf`) e convertidos com
`pdftoppm -png -r 100` (827x1170). Todos A4, 2 páginas (`pdfinfo`).

| Certificado | Instrutor (snapshot) | FIRMA do instrutor | PNGs |
|---|---|---|---|
| `LOT-2026-1000` (Antonia Jaramillo, emitido em 28-10) | Ana Reyes | nenhuma na hora do download | `/tmp/task14/cert1-1.png`, `cert1-2.png` |
| `LOT-2026-1001` (Sebastián Gallardo, emitido em 28-10) | Pedro Soto | foto forte (achado A) | `/tmp/task14/cert2-1.png`, `cert2-2.png` |
| `LOT-2026-1002` (Camila Gallardo, emitido hoje no smoke) | Ana Reyes | nenhuma (primeiro download) | `/tmp/task14/cert3-1.png`, `cert3-2.png` |
| `LOT-2026-1002` (de novo, depois de Ana subir a `FIRMA`) | Ana Reyes | scan | `/tmp/task14/cert3b-1.png` |

O que se viu, lendo os PNGs:

- **Layout v5 na página 1:** QR à esquerda com "N° LOT-2026-100x" em negrito, "Emitido el
  dd-mm-aaaa" e "Verifique la autenticidad escaneando el código." em itálico numa linha só; logo
  centralizado; título "CERTIFICADO DE CAPACITACIÓN" no mesmo lugar nos três (y≈288); abertura "En
  Santiago, a 28 de octubre de 2026, OTEC LOTUS SpA [77.510.327-2] certifica que:" (cidade do emissor,
  data por extenso, em `LOT-2026-1002` "a 29 de octubre"); nome do aluno em destaque e RUT mais leve;
  curso em azul entre traços, com a linha "nome técnico · N horas cronológicas" e sem traço embaixo; o
  parágrafo centralizado com período e conteúdo; empresa em negrito com RUT; "N° de registro
  LOT-… " em negrito; barras preto/azul no topo e no rodapé; rodapé "LOT-… · Página 1 de 2".
  Sem nota, asistencia e `valido_ate` nesses certificados de dev, então essas linhas não aparecem.
- **Cidade:** "Santiago" vem de `config('app.certificate_issuer.city')`; não há local da turma na
  frase (D9, D13).
- **Gerente:** em todos, "Marcia de Batalha / Gerente OTEC" à esquerda, com a assinatura da foto suave
  sobre o traço, fundo transparente (sem retângulo). Esses PDFs são da Task 14, com a gerente subida
  antes de `7dadbe4b`: o recorte incluía as manchas pequenas, e aparecem alguns pontinhos soltos perto
  do traço. No `LOT-2026-1001` refeito (passo 11) a gerente ainda é essa assinatura antiga.
- **Instrutor, à direita, "Instructor" sob o nome:**
  - `LOT-2026-1000` e `LOT-2026-1002` (primeiro download): caixa vazia sobre o traço, nome e cargo
    embaixo, para assinar à mão (D6). O resto da página não se move.
  - `LOT-2026-1001`: na Task 14, a assinatura de Pedro Soto (foto forte) saía com o retângulo cinza e
    a sombra do canto atrás do traço (achado A). **Refeito com o código final (passo 11):** reimpresso
    depois de subir a mesma foto, o PDF (2 páginas) mostra a assinatura de Pedro Soto limpa sobre o
    traço, sem cinza, sem sombra e sem perder traço, com uns 7 pontos soltos de 1 a 2 px ao redor
    (`/tmp/task14/i1-cert-1.png`, ampliada em `i1-zoom2-1.png`). A tabela acima segue com a linha
    original; a `FIRMA` de Pedro Soto agora é a do passo 11.
  - `LOT-2026-1002` depois de a `FIRMA` (scan) ser subida: a assinatura aparece, limpa, sem fundo,
    apoiada no traço. O mesmo certificado, emitido sem ela, sai com ela sem nenhuma mudança no
    snapshot (D5).
- **Página 2:** logo no mesmo lugar da página 1; fundo sem as barras (padrão cinza limpo, P-28);
  quadro "Temario del curso | nome do curso" com os módulos; aviso legal uma vez só, no pé, e o
  rodapé "LOT-… · Página 2 de 2".
- Nenhuma assinatura partida e nenhum texto cortado.

## 6. Gates

Medidos no HEAD final da branch, depois da onda de correção da revisão final: o código está em
`6c6864f5` (`fix(40): sonda do Gotenberg falha em vez de pular...`) e os commits seguintes só tocam
docs, então os números valem para o HEAD. Antes da onda (Task 14, `dcf04675`): suíte `1567 passed`,
frontend `1388 passed`.

| Gate | Comando | Resultado |
|---|---|---|
| Suíte backend inteira | `docker compose exec -T app php artisan test` | `Tests: 5 skipped, 1568 passed (12336 assertions)`, 124,95 s |
| Matriz no Gotenberg real | `... --filter=CertificadoMatrizGotenbergTest` | `47 passed (2078 assertions)`. A sonda agora falha (não pula) com o host resolvendo e o serviço fora do ar: provado com `GOTENBERG_URL=http://nginx:9` (falha com a mensagem) e `http://nao-existe-xyz:3000` (host não resolve: pulado) |
| Auditoria da firma da gerente | `... --filter=CertificateSettingsTest` | `10 passed (47 assertions)`; o teste novo passou de primeira, porque o código já audita (`created`, `deleted` na troca e na remoção) |
| Pint nos PHP tocados pela onda | de dentro de `backend/`, `./vendor/bin/pint tests/Support/ProbesGotenberg.php tests/Feature/Certification/CertificateSettingsTest.php config/app.php` | `{"result":"passed"}`. Os 3 `lang/{en,es_CL,pt_BR}/validation.php` seguem reprovando o `--test`, igual no `0c09fa4f` (preexistente, fora do escopo) |
| `pnpm build` | de `frontend/` | `✓ built in 1.22s`, exit 0 |
| `pnpm lint` | de `frontend/` | `eslint .`, saída vazia, exit 0 |
| `pnpm test` | de `frontend/` | `Test Files 195 passed (195)`, `Tests 1397 passed (1397)`, exit 0 |

Docs: `lane.sh` e a auditoria de docs não foram rodados nesta onda (fora do brief).
