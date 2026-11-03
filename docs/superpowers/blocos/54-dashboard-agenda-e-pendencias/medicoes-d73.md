# Medições do D-73 — painéis de tabela do Dashboard

Stack da lane 54 (offset +3), `migrate --seed` com o `OperationDemoSeeder`, Vite em 5176, admin de
demo (`superadmin`), Chromium do Playwright. Medido em 2026-11-03, sobre `da786b7d` (Tasks 1–6
aplicadas, coluna "Faltan" já com os requisitos da Task 5).

Invólucro de rolagem de cada painel = `.p-datatable-wrapper` (`overflow-x: auto`). A tabela tem
`table-layout: fixed` e o piso `min-w-[42rem]` (672 px) do `appDataTablePt`.

## 1. Antes da correção

### 1024x768, es-CL

| Painel | `scrollWidth` | `clientWidth` | Largura da tabela |
|---|---|---|---|
| Cumplimiento documental de clases | 747 | 718 | 718 |
| Carga de relatores | 746 | 718 | 718 |

O que passa da borda direita do invólucro, nos dois painéis, é o ícone de ordenação (`svg` de
24 px) do **último cabeçalho ordenável**: "Habilitada" (passa 29 px) e "Documentos por vencer"
(passa 28 px). Nenhuma célula do corpo passa da borda do invólucro.

Dentro da tabela há mais transbordo, que não mexe no `scrollWidth` porque cai sobre a coluna
vizinha:

- **Célula "Período" (Cumplimiento).** O intervalo `whitespace-nowrap` mede 182 px numa coluna de
  103 px (passa 79 px) e cobre o contador de "Documentos presentes". É a candidata que o plano
  previa (R1).
- **Cabeçalhos.** O título de cabeçalho é item de flex com `min-width: auto`. Por isso não encolhe
  abaixo da palavra mais longa e empurra o ícone de ordenação para fora da coluna. A conta de cada
  um é `palavra + ícone (24, se ordenável) + padding (32)`:

| Cabeçalho (es-CL) | Coluna | Precisa | |
|---|---|---|---|
| Documentos presentes | 60 | 123 | estoura |
| Habilitada (ordenável) | 85 | 131 | estoura |
| Clases en curso (ordenável) | 103 | 105 | estoura |
| Próximas clases (ordenável) | 103 | 123 | estoura |
| Documentos vencidos (ordenável) | 103 | 147 | estoura |
| Documentos por vencer (ordenável) | 102 | 147 | estoura |

Curso, Relatores, Período e Documentos faltantes cabem. Em pt-BR os números são os mesmos, e em
en estouram também "Instructors" (122 > 111) e os quatro contadores da carga (123–138 > 103).

### 390x844, es-CL

| Painel | `scrollWidth` | `clientWidth` | Largura da tabela |
|---|---|---|---|
| Cumplimiento documental de clases | 707 | 276 | 672 |
| Carga de relatores | 707 | 276 | 672 |

A tabela fica no piso de 42rem (672 px) e rola dentro do invólucro, que é o comportamento de
projeto para telefone. O documento não transborda (`scrollWidth` 390 = `clientWidth` 390). Os
35 px além da tabela (707 − 672) são o mesmo ícone do último cabeçalho ordenável.

### Leitura

O diagnóstico da spec (D11: "o piso das colunas não é o culpado", a culpada é uma célula) só vale
para a célula "Período". O que empurra o invólucro nos dois painéis é o cabeçalho: com os rótulos
de hoje, as frações do `panelColumns.ts` (`COL.count`, `COL.tag`) são mais estreitas que a palavra
mais longa mais o ícone, nas três línguas. Na "Carga de relatores", a soma do mínimo dos cinco
cabeçalhos (113 + 105 + 123 + 147 + 147 = 635 em es-CL; 663 em en) mal cabe em 718 px e não cabe
no piso de 672 px com folga para o nome.

## 2. Decisão e correção

Decisões do João em 2026-11-03, com a medição acima na mão:

- **Cabeçalhos.** O ícone de ordenação quebra para baixo do título quando não cabe
  (`wrappingHeaderTablePt`, opt-in em `shared/ui`; o default das outras tabelas não muda). Os
  pesos do `panelColumns.ts` saem do mínimo medido por coluna. "Documentos presentes/faltantes"
  viram "Presentes"/"Faltan" (pt-BR "Presentes"/"Faltam", en "On file"/"Missing"), e "Faltan"
  fica exato desde a Task 5, que pôs requisitos na mesma coluna.
- **Célula "Período".** Quebra só entre as duas datas: cada data num `nowrap` próprio, separador
  e ordem vindos do locale.
- **Critério em 390x844.** "Nada passa da tabela": a rolagem do piso da tabela fica, como em
  toda tabela do produto. Em 390, o critério é `scrollWidth` do invólucro = largura da tabela,
  sem transbordo de cabeçalho nem de célula, e o documento sem transbordo.

Mínimos medidos por coluna (tabela em `table-layout: auto` e largura mínima, com o ícone
quebrando, os rótulos novos e o intervalo partido). Vale o maior das três línguas:

| Cumplimiento | Curso | Relatores | Período | Presentes | Faltan | Habilitada | Soma |
|---|---|---|---|---|---|---|---|
| es-CL | 130 | 104 | 105 | 105 | 123 | 107 | 674 |
| pt-BR | 130 | 104 | 105 | 105 | 106 | 107 | 657 |
| en | 130 | 122 | 97 | 58 | 122 | 90 | 619 |
| **maior** | **130** | **122** | **105** | **105** | **123** | **107** | **692** |

| Carga de relatores | Relator | En curso | Próximas | Vencidos | Por vencer | Soma |
|---|---|---|---|---|---|---|
| maior das três | 114 (en) | 99 (en) | 102 (en) | 123 (es/pt) | 123 (es/pt) | 561 |

Pesos resultantes:

- **Cumplimiento:** 19/17/15/15/18/16, que dão a cada coluna o seu mínimo a 718 px. Piso de
  45rem (720 px) abaixo de `sm`, para 390 repetir a geometria de 1024.
- **Carga de relatores:** cinco frações iguais, de 134 px no piso de 672 px.
- **Rede de segurança:** curso, relatores e "Faltan" levam `wrap-break-word`. Palavra mais longa
  que a coluna quebra em vez de transbordar. Com os dados medidos, não dispara em 1024 nem em 390.

## 3. Depois da correção

Mesmo stack, sobre a árvore da Task 7. "Pior cabeçalho" e "pior célula" são o maior
`scrollWidth − clientWidth` entre os `th` e os `td` do painel.

| Viewport | Língua | Painel | `scrollWidth` | `clientWidth` | Tabela | Pior cabeçalho | Pior célula |
|---|---|---|---|---|---|---|---|
| 1024x768 | es-CL | Cumplimiento | 718 | 718 | 718 | 0 | 0 |
| 1024x768 | es-CL | Carga | 718 | 718 | 718 | 0 | 0 |
| 1024x768 | pt-BR | Cumplimiento | 718 | 718 | 718 | 0 | 0 |
| 1024x768 | pt-BR | Carga | 718 | 718 | 718 | 0 | 0 |
| 1024x768 | en | Cumplimiento | 718 | 718 | 718 | 0 | 0 |
| 1024x768 | en | Carga | 718 | 718 | 718 | 0 | 0 |
| 390x844 | es-CL | Cumplimiento | 720 | 276 | 720 | 0 | 0 |
| 390x844 | es-CL | Carga | 672 | 276 | 672 | 0 | 0 |
| 390x844 | pt-BR | Cumplimiento | 720 | 276 | 720 | 0 | 0 |
| 390x844 | pt-BR | Carga | 672 | 276 | 672 | 0 | 0 |
| 390x844 | en | Cumplimiento | 720 | 276 | 720 | 0 | 0 |
| 390x844 | en | Carga | 672 | 276 | 672 | 0 | 0 |

O documento não transborda em nenhum caso (1024/1024 e 390/390).

Fora dos viewports do DoD, em 800x900 (es-CL), as duas tabelas ficam no piso de 42rem (672 px)
dentro de um invólucro de 670 px. Sobram 2 px de rolagem, que vêm do piso e não de conteúdo
(pior cabeçalho e pior célula = 0). É o comportamento de projeto da faixa entre `sm` e a largura
em que o invólucro alcança 672 px, e vale para toda tabela do produto.
