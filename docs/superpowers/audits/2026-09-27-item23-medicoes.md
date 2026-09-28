# Medições do item 23 — `frontend-tabelas-reserva-e-rolagem`

**Spec:** `docs/superpowers/specs/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md`
**Plano:** `docs/superpowers/plans/2026-09-27-frontend-tabelas-reserva-e-rolagem.md`
**Ambiente:** offset +2 (SPA `:5175`, API `:8082`), es-CL, tema claro, `admin@lotus.cl`,
Playwright-core read-only (Apêndice A). Turma medida: 1.

## 1. Régua (spec §3)

- **1024x768:** `scrollWidth == clientWidth`; sobreposição da presa 0; nenhum cabeçalho truncado.
  Dashboard: tabela ≤ moldura (o transbordo de 25px está fora do bloco).
- **390x844:** `box` = 0 (caixa de conteúdo da 1ª célula ≤ borda esquerda da presa, pior linha);
  um controle por linha com 2+ ações; em arquivados, `col1` ≥ o `col1` da visão ativa.
- **1440x900:** sem regressão contra a seção 3.

## 2. Fixture de arquivados

| Entidade | id | Arquivado em | Restaurado em |
|---|---|---|---|
| cliente | 1 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |
| presupuesto | 1 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |
| turma | 4 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |
| curso | 1 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |
| redactor | 3 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |
| usuario | 59 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`; `deleted_at` NULL conferido no MySQL) |
| matricula | 1 | 27/09 ~21:16 | 27/09 ~21:20 (`restore 200`) |

(uma linha por chave do `fixture-ids.json`; o usuário `fixture.item23@lotus.cl` foi criado para
a visão de Usuarios e continua no banco de dev, ativo — id 59, role `admin`, `is_active: true`,
verificado por `GET /api/users` após o restore)

Todas as 6 tentativas de `presupuesto` e as 2 primeiras de `redactor` geraram rejeição de negócio
antes de a fixture achar um candidato aceito (ver "Desvios do script" abaixo). Após o `restore`, as
5 visões de arquivados via API (`clients/archived`, `budgets/archived`, `turmas/archived`,
`courses/archived`, `redatores/archived`) voltaram a `count: 0`, e `fixture-ids.json` foi apagado —
o banco de dev não ficou com nenhum registro arquivado pela fixture.

### Desvios do script (fixture.cjs)

1. **`POST /api/users` exigiu `password`** (422 `"La contraseña es obligatoria."`) — antecipado
   pelo próprio brief. Acrescentado `password: 'senhaFixtureItem23!'` ao objeto `USUARIO`.
2. **Os 6 `presupuesto` do seed têm cotización aprovada**, e a API recusa o `DELETE` direto:
   `422 "Un presupuesto con cotización aprobada no puede eliminarse. Rechácela antes."` — os 6
   candidatos rejeitaram igual, o que o laço original (que só tenta o próximo candidato) não
   resolveria. Acrescentei hooks `pre`/`pos` na entrada `presupuesto` de `ENTIDADES`: `pre` busca a
   cotação aprovada do orçamento (`GET /api/budgets/{id}/quotes`) e a rejeita
   (`POST /api/quotes/{id}/reject`) antes do `DELETE` — o mesmo Fluxo 2 (rejeitar/reaprovar
   cotação) que o próprio produto expõe a um superadmin — guardando o id da cotação em
   `ids.presupuesto_quote`; `pos` reaprova essa cotação (`POST /api/quotes/{id}/approve`) depois do
   `restore` do orçamento. Ciclo reversível e verificado: `GET /api/budgets/1/quotes` após o
   restore mostra a cotação 1 de volta a `"status":"approved"` (o `approved_at` fica com timestamp
   novo — efeito colateral aceito, da mesma categoria do carimbo de auditoria que qualquer
   archive/restore já deixa).
3. **`redactor` 1 e 2 rejeitaram** com `422 "El relator tiene clases en curso: concluye o reasigna
   antes de archivarlo."` — o `redactor` 3 foi aceito. Isso já é o comportamento **projetado** do
   laço original ("o primeiro candidato que a API aceitar arquivar vira a fixture") — não é desvio,
   só registro de que 2 dos 3 primeiros redatores do seed estão bloqueados por essa regra.

Nenhum desvio foi necessário em `medir.cjs` — todos os seletores do brief (botão "Archivados" por
`getByRole('button', {name: /Archivad/})`, botão "Ver" por `aria-label="Ver"` via
`getByRole('button', {name: /^Ver$/})`, dropdown de Emisión por `.p-dropdown`) casaram com o DOM
real assim que combinados com a espera de assentamento de 1800ms que `snap()` já embute — uma
sondagem manual sem essa espera (fora do script) chegou a mostrar 0 botões "Ver" por uma corrida
entre o clique na aba e o preenchimento assíncrono da tabela, mas o script como está no brief já
absorve isso.

## 3. Antes — `4d172d3f`

Medição read-only com o script do Apêndice A, offset +2 (SPA `:5175`, API `:8082`), es-CL, tema
claro, `admin@lotus.cl`. Turma medida: 1. As 7 visões de arquivados foram medidas com a fixture da
seção 2 ativa (1 linha em cada). Saída bruta completa em `antes.txt` no fim desta seção.

### 1024x768 — piso de 768px vs. moldura

| Tabela | Moldura | Tabela | Presa | Sobreposição | TRUNC |
|---|---|---|---|---|---|
| Dashboard painel 1 (Curso) | 718 | 793 (`scrollWidth`) — tabela 768 | — | — | não |
| Dashboard painel 2 (Relator) | 718 | 789 (`scrollWidth`) — tabela 768 | — | — | não |
| Clientes | 718 | 768 | 144 | 50 em "Contactos" | não |
| Clientes (arquivados) | 718 | 768 | 160 | 50 em "Archivado por" | não |
| Presupuestos | 718 | 768 | 96 | 50 em "Estado" | não |
| Presupuestos (arquivados) | 718 | 768 | 160 | 50 em "Archivado por" | não |
| Turmas | 718 | 768 | 144 | 50 em "Estado" | não |
| Turmas (arquivados) | 718 | 768 | 160 | 50 em "Archivado por" | não |
| Matrícula (turma 1) | 718 | 768 | 144 | 50 em "Estado matrícula" | não |
| Matrícula (arquivados) | 718 | 768 | 160 | 50 em "Archivado por" | não |
| Cursos | 718 | 768 | 144 | 50 em "Redactores" | não |
| Cursos (arquivados) | 718 | 768 | 160 | 50 em "Archivado por" | não |
| **Emisión** | 684 | 768 | 128 | **84** em "Certificado" | não |
| Historial | 718 | 768 | 256 | 50 em "Estado" | não |
| Redactores | 718 | 718 (min 672) | 192 | 0 | não |
| Redactores (arquivados) | 718 | 718 (min 672) | 160 | 0 | não |
| Alumnos | 718 | 768 | 96 | 50 em "Turmas" | não |
| Alumnos → diálogo do alumno | 669 | 669 (min 0) | — | 0 | não |
| Usuarios | 718 | 718 (min 672) | 144 | 0 | não |
| Usuarios (arquivados) | 718 | 718 (min 672) | 160 | 0 | não |
| Roles y permisos | 718 | 718 (min 672) | 96 | 0 | não |

**Confere com o baseline do spec §2:** sobreposição 50 nas 7 tabelas de piso default listadas ali
(Clientes, Presupuestos, Turmas, Matrícula, Cursos, Historial, Alumnos) e **84** na Emisión — juntas,
as 8 tabelas de piso default que o spec soma. As 3 de 42rem (Redactores, Usuarios, Roles) seguem em
0. As 7 linhas `ARCH` têm `rows 1` (não 0) e sobreposição igual à visão ativa correspondente (50, ou
0 nas de 42rem). Nenhum `TRUNC` em nenhuma tabela. Dashboard: `scrollWidth` (793/789) > `table`
768, mas o invólucro (`frame` 718) não estica — o transbordo fica fora do bloco, como a régua prevê.

### 390x844 — presa vs. caixa/texto da 1ª coluna

| Tabela | Presa | 1ª coluna (`col1`) | `free` | `box` coberto | `text` coberto |
|---|---|---|---|---|---|
| Clientes | 144 | 197 | 132 | **49** | 49 |
| Clientes (arquivados) | 160 | 141 | 116 | **9** | 9 |
| Presupuestos | 96 | Código 101 | 180 | 0 | 0 |
| Presupuestos (arquivados) | 160 | Código 67 | 116 | 0 | 0 |
| Turmas | 144 | Código 54 | 132 | 0 | 0 |
| Turmas (arquivados) | 160 | Código 39 | 116 | 0 | 0 |
| Matrícula | 144 | 304 | 132 | **156** | 156 |
| Matrícula (arquivados) | 160 | 297 | 116 | **165** | 165 |
| Cursos | 144 | 243 | 132 | **95** | 95 |
| Cursos (arquivados) | 160 | 173 | 116 | **41** | 41 |
| Emisión | 128 | 209 | 114 | **79** | 79 |
| Historial | 256 | Código 53 | 20 | **17** | 17 |
| Redactores (colapso) | 72 | 180 | 204 | 0 | 0 |
| Redactores (arquivados, colapso) | 72 | 132 | 204 | 0 | 0 |
| Alumnos (colapso) | 77 | 265 | 199 | **50** | 50 |
| Alumnos → diálogo do alumno | — | — | — | 0 | 0 |
| Usuarios (colapso) | 72 | 204 | 204 | 0 | 0 |
| Usuarios (arquivados, colapso) | 72 | 149 | 204 | 0 | 0 |
| Roles y permisos (colapso) | 72 | 332 | 204 | 0 | 0 |

**Régua ainda não vale em 390** (§3 exige `box == 0`, e a maioria das tabelas de piso default
mostra `box > 0` — é exatamente a `D-65` que o item 23 corrige; esta seção é a foto "antes", não a
prova de aceite). **`col1` de arquivados ≥ `col1` da visão ativa** em 6 das 7 comparações
(Presupuestos 67<101, Turmas 39<54, Matrícula 297<304, Cursos 173<243, Redactores 132<180, Usuarios
149<204) — a única exceção é Clientes, que também inverte (141<197). Isso é esperado hoje: a régua
de "arquivados ≥ ativa" é requisito do **depois** (§3), não do antes — as colunas extras
("Archivado el"/"Archivado por") disputam espaço com a 1ª coluna sob o mesmo piso de 768px, e a
tabela de arquivados tem 2 colunas a mais que a ativa, então a 1ª coluna encolhe mais ainda hoje.
Fica registrado para a comparação com o "depois" nas Tasks 8/10.

### 1440x900 — sem regressão

| Tabela | Moldura | Tabela | Sobreposição |
|---|---|---|---|
| Dashboard painel 1 | 1134 | 1134 (`scrollWidth` igual) | 0 |
| Dashboard painel 2 | 1134 | 1134 | 0 |
| Clientes / Clientes (arq.) | 1134 | 1134 | 0 |
| Presupuestos / (arq.) | 1134 | 1134 | 0 |
| Turmas / (arq.) | 1134 | 1134 | 0 |
| Matrícula / (arq.) | 1134 | 1134 | 0 |
| Cursos / (arq.) | 1134 | 1134 | 0 |
| Emisión | 1100 | 1100 | 0 |
| Historial | 1134 | 1134 | 0 |
| Redactores / (arq.) | 1134 | 1134 | 0 |
| Alumnos / diálogo do alumno | 1134 / 960 | 1134 / 960 | 0 |
| Usuarios / (arq.) | 1134 | 1134 | 0 |
| Roles y permisos | 1134 | 1134 | 0 |

Sem regressão: toda tabela mede `frame == scroll == table`, sobreposição 0 em todas as 21 linhas —
igual ao baseline do spec §2.

<details>
<summary>Saída bruta de <code>antes.txt</code> (127 linhas, <code>OUT=antes.json node medir.cjs</code>)</summary>

```
1024x768 / [] | frame 718 scroll 793 table 768 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:192 | RELATORES:119 | PERÍODO:110 | DOCUMENTOS PRESENTES:64 | DOCUMENTOS FALTANTES:192 | HABILITADA:91
1024x768 / [] | frame 718 scroll 789 table 768 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:329 | CLASES EN CURSO:110 | PRÓXIMAS CLASES:110 | DOCUMENTOS VENCIDOS:110 | DOCUMENTOS POR VENCER:110
1024x768 /comercial [Clientes] | frame 718 scroll 768 table 768 (768px) sticky 144 overlap 50 on "CONTACTOS" col1 197 free 574 box 0 text 0 rows 3
    RAZÓN SOCIAL:197 | RUT:99 | TIPO:109 | COMUNA:142 | CONTACTOS:77 | ·:144
1024x768 /comercial [Clientes] ARCH | frame 718 scroll 768 table 768 (768px) sticky 160 overlap 50 on "ARCHIVADO POR" col1 141 free 558 box 0 text 0 rows 1
    RAZÓN SOCIAL:141 | RUT:70 | TIPO:78 | COMUNA:102 | CONTACTOS:55 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
1024x768 /comercial [Presupuestos] | frame 718 scroll 768 table 768 (768px) sticky 96 overlap 50 on "ESTADO" col1 101 free 622 box 0 text 0 rows 5
    CÓDIGO:101 | CLIENTE:228 | COTIZACIONES:89 | VALOR TOTAL:127 | ESTADO:127 | ·:96
1024x768 /comercial [Presupuestos] ARCH | frame 718 scroll 768 table 768 (768px) sticky 160 overlap 50 on "ARCHIVADO POR" col1 67 free 558 box 0 text 0 rows 1
    CÓDIGO:67 | CLIENTE:151 | COTIZACIONES:59 | VALOR TOTAL:84 | ESTADO:84 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
1024x768 /operacion [] | frame 718 scroll 768 table 768 (768px) sticky 144 overlap 50 on "ESTADO" col1 54 free 574 box 0 text 0 rows 3
    CÓDIGO:54 | CURSO:142 | CLIENTE:122 | MODALIDAD:68 | REDACTOR:122 | ALUMNOS:47 | ESTADO:68 | ·:144
1024x768 /operacion [] ARCH | frame 718 scroll 768 table 768 (768px) sticky 160 overlap 50 on "ARCHIVADO POR" col1 39 free 558 box 0 text 0 rows 1
    CÓDIGO:39 | CURSO:102 | CLIENTE:87 | MODALIDAD:48 | REDACTOR:87 | ALUMNOS:34 | ESTADO:49 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
1024x768 /operacion/turmas/1 [Alumnos] | frame 718 scroll 768 table 768 (768px) sticky 144 overlap 50 on "ESTADO MATRÍCULA" col1 304 free 574 box 0 text 0 rows 10
    NOMBRE:304 | RUT:152 | ESTADO MATRÍCULA:169 | ·:144
1024x768 /operacion/turmas/1 [Alumnos] ARCH | frame 718 scroll 768 table 768 (768px) sticky 160 overlap 50 on "ARCHIVADO POR" col1 297 free 558 box 0 text 0 rows 1
    NOMBRE:297 | RUT:149 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
1024x768 /cursos [] | frame 718 scroll 768 table 768 (768px) sticky 144 overlap 50 on "REDACTORES" col1 243 free 574 box 0 text 0 rows 2
    NOMBRE:243 | NOMBRE TÉCNICO:150 | CARGA HORARIA (H):81 | REDACTORES:150 | ·:144
1024x768 /cursos [] ARCH | frame 718 scroll 768 table 768 (768px) sticky 160 overlap 50 on "ARCHIVADO POR" col1 173 free 558 box 0 text 0 rows 1
    NOMBRE:173 | NOMBRE TÉCNICO:107 | CARGA HORARIA (H):58 | REDACTORES:107 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
1024x768 /certificados [Emisión] | frame 684 scroll 768 table 768 (768px) sticky 128 overlap 84 on "CERTIFICADO" col1 209 free 556 box 0 text 0 rows 10
    NOMBRE:209 | NOTA FINAL:81 | ASISTENCIA:81 | ESTADO ACAD.:116 | CERTIFICADO:151 | ·:128
1024x768 /certificados [Historial] | frame 718 scroll 768 table 768 (768px) sticky 256 overlap 50 on "ESTADO" col1 53 free 462 box 0 text 0 rows 1
    CÓDIGO:53 | ALUMNO:120 | CURSO:140 | FECHA EMISIÓN:67 | VIGENCIA HASTA:67 | ESTADO:66 | ·:256
1024x768 /personas [Redactores] | frame 718 scroll 718 table 718 (672px) sticky 192 overlap 0 col1 158 free 526 box 0 text 0 rows 6
    NOMBRE COMPLETO:158 | RUT:114 | CURSOS HABILITADOS:61 | IDONEIDAD:88 | ÚLTIMO ACCESO:105 | ·:192
1024x768 /personas [Redactores] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 123 free 558 box 0 text 0 rows 1
    NOMBRE COMPLETO:123 | RUT:89 | CURSOS HABILITADOS:48 | IDONEIDAD:68 | ÚLTIMO ACCESO:82 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /personas [Alumnos] | frame 718 scroll 768 table 768 (768px) sticky 96 overlap 50 on "TURMAS" col1 257 free 622 box 0 text 0 rows 10
    NOMBRE COMPLETO:257 | RUT:129 | CLIENTE ACTUAL:186 | TURMAS:100 | ·:96
1024x768 /personas [Alumnos] DIALOGO (dialogo) | frame 669 scroll 669 table 669 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
1024x768 /administracion [Usuarios] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 195 free 574 box 0 text 0 rows 1
    NOMBRE:195 | ROL:141 | ESTADO:108 | ÚLTIMO ACCESO:130 | ·:144
1024x768 /administracion [Usuarios] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 139 free 558 box 0 text 0 rows 1
    NOMBRE:139 | ROL:100 | ESTADO:77 | ÚLTIMO ACCESO:93 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /administracion [Roles y permisos] | frame 718 scroll 718 table 718 (672px) sticky 96 overlap 0 col1 344 free 622 box 0 text 0 rows 3
    NOMBRE:344 | TIPO:164 | PERMISOS:115 | ·:96
390x844 / [] | frame 276 scroll 793 table 768 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:192 | RELATORES:119 | PERÍODO:110 | DOCUMENTOS PRESENTES:64 | DOCUMENTOS FALTANTES:192 | HABILITADA:91
390x844 / [] | frame 276 scroll 789 table 768 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:329 | CLASES EN CURSO:110 | PRÓXIMAS CLASES:110 | DOCUMENTOS VENCIDOS:110 | DOCUMENTOS POR VENCER:110
390x844 /comercial [Clientes] | frame 276 scroll 768 table 768 (768px) sticky 144 overlap 79 on "RUT" col1 197 free 132 box 49 text 49 rows 3
    RAZÓN SOCIAL:197 | RUT:99 | TIPO:109 | COMUNA:142 | CONTACTOS:77 | ·:144
390x844 /comercial [Clientes] ARCH | frame 276 scroll 768 table 768 (768px) sticky 160 overlap 70 on "RUT" col1 141 free 116 box 9 text 9 rows 1
    RAZÓN SOCIAL:141 | RUT:70 | TIPO:78 | COMUNA:102 | CONTACTOS:55 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
390x844 /comercial [Presupuestos] | frame 276 scroll 768 table 768 (768px) sticky 96 overlap 96 on "CLIENTE" col1 101 free 180 box 0 text 0 rows 5
    CÓDIGO:101 | CLIENTE:228 | COTIZACIONES:89 | VALOR TOTAL:127 | ESTADO:127 | ·:96
390x844 /comercial [Presupuestos] ARCH | frame 276 scroll 768 table 768 (768px) sticky 160 overlap 103 on "CLIENTE" col1 67 free 116 box 0 text 0 rows 1
    CÓDIGO:67 | CLIENTE:151 | COTIZACIONES:59 | VALOR TOTAL:84 | ESTADO:84 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
390x844 /operacion [] | frame 276 scroll 768 table 768 (768px) sticky 144 overlap 79 on "CLIENTE" col1 54 free 132 box 0 text 0 rows 3
    CÓDIGO:54 | CURSO:142 | CLIENTE:122 | MODALIDAD:68 | REDACTOR:122 | ALUMNOS:47 | ESTADO:68 | ·:144
390x844 /operacion [] ARCH | frame 276 scroll 768 table 768 (768px) sticky 160 overlap 87 on "CLIENTE" col1 39 free 116 box 0 text 0 rows 1
    CÓDIGO:39 | CURSO:102 | CLIENTE:87 | MODALIDAD:48 | REDACTOR:87 | ALUMNOS:34 | ESTADO:49 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
390x844 /operacion/turmas/1 [Alumnos] | frame 276 scroll 768 table 768 (768px) sticky 144 overlap 144 on "NOMBRE" col1 304 free 132 box 156 text 156 rows 10
    NOMBRE:304 | RUT:152 | ESTADO MATRÍCULA:169 | ·:144
390x844 /operacion/turmas/1 [Alumnos] ARCH | frame 276 scroll 768 table 768 (768px) sticky 160 overlap 160 on "NOMBRE" col1 297 free 116 box 165 text 165 rows 1
    NOMBRE:297 | RUT:149 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
390x844 /cursos [] | frame 276 scroll 768 table 768 (768px) sticky 144 overlap 111 on "NOMBRE" col1 243 free 132 box 95 text 95 rows 2
    NOMBRE:243 | NOMBRE TÉCNICO:150 | CARGA HORARIA (H):81 | REDACTORES:150 | ·:144
390x844 /cursos [] ARCH | frame 276 scroll 768 table 768 (768px) sticky 160 overlap 103 on "NOMBRE TÉCNICO" col1 173 free 116 box 41 text 41 rows 1
    NOMBRE:173 | NOMBRE TÉCNICO:107 | CARGA HORARIA (H):58 | REDACTORES:107 | ARCHIVADO EL:68 | ARCHIVADO POR:95 | ·:160
390x844 /certificados [Emisión] | frame 242 scroll 768 table 768 (768px) sticky 128 overlap 95 on "NOMBRE" col1 209 free 114 box 79 text 79 rows 10
    NOMBRE:209 | NOTA FINAL:81 | ASISTENCIA:81 | ESTADO ACAD.:116 | CERTIFICADO:151 | ·:128
390x844 /certificados [Historial] | frame 276 scroll 768 table 768 (768px) sticky 256 overlap 120 on "ALUMNO" col1 53 free 20 box 17 text 17 rows 1
    CÓDIGO:53 | ALUMNO:120 | CURSO:140 | FECHA EMISIÓN:67 | VIGENCIA HASTA:67 | ESTADO:66 | ·:256
390x844 /personas [Redactores] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "RUT" col1 180 free 204 box 0 text 0 rows 6
    NOMBRE COMPLETO:180 | RUT:130 | CURSOS HABILITADOS:70 | IDONEIDAD:100 | ÚLTIMO ACCESO:120 | ·:72
390x844 /personas [Redactores] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 49 on "CURSOS HABILITADOS" col1 132 free 204 box 0 text 0 rows 1
    NOMBRE COMPLETO:132 | RUT:95 | CURSOS HABILITADOS:51 | IDONEIDAD:73 | ÚLTIMO ACCESO:88 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /personas [Alumnos] | frame 276 scroll 768 table 768 (768px) sticky 77 overlap 66 on "NOMBRE COMPLETO" col1 265 free 199 box 50 text 50 rows 10
    NOMBRE COMPLETO:265 | RUT:132 | CLIENTE ACTUAL:191 | TURMAS:103 | ·:77
390x844 /personas [Alumnos] DIALOGO (dialogo) | frame 323 scroll 323 table 323 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
390x844 /administracion [Usuarios] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "ROL" col1 204 free 204 box 0 text 0 rows 1
    NOMBRE:204 | ROL:147 | ESTADO:113 | ÚLTIMO ACCESO:136 | ·:72
390x844 /administracion [Usuarios] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 53 on "ROL" col1 149 free 204 box 0 text 0 rows 1
    NOMBRE:149 | ROL:108 | ESTADO:83 | ÚLTIMO ACCESO:100 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /administracion [Roles y permisos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "NOMBRE" col1 332 free 204 box 112 text 0 rows 3
    NOMBRE:332 | TIPO:158 | PERMISOS:111 | ·:72
1440x900 / [] | frame 1134 scroll 1134 table 1134 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:284 | RELATORES:176 | PERÍODO:162 | DOCUMENTOS PRESENTES:94 | DOCUMENTOS FALTANTES:284 | HABILITADA:135
1440x900 / [] | frame 1134 scroll 1134 table 1134 (768px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:486 | CLASES EN CURSO:162 | PRÓXIMAS CLASES:162 | DOCUMENTOS VENCIDOS:162 | DOCUMENTOS POR VENCER:162
1440x900 /comercial [Clientes] | frame 1134 scroll 1134 table 1134 (768px) sticky 144 overlap 0 col1 313 free 990 box 0 text 0 rows 3
    RAZÓN SOCIAL:313 | RUT:156 | TIPO:174 | COMUNA:226 | CONTACTOS:122 | ·:144
1440x900 /comercial [Clientes] ARCH | frame 1134 scroll 1134 table 1134 (768px) sticky 160 overlap 0 col1 226 free 974 box 0 text 0 rows 1
    RAZÓN SOCIAL:226 | RUT:113 | TIPO:125 | COMUNA:163 | CONTACTOS:88 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /comercial [Presupuestos] | frame 1134 scroll 1134 table 1134 (768px) sticky 113 overlap 0 col1 154 free 1021 box 0 text 0 rows 5
    CÓDIGO:154 | CLIENTE:347 | COTIZACIONES:135 | VALOR TOTAL:193 | ESTADO:193 | ·:113
1440x900 /comercial [Presupuestos] ARCH | frame 1134 scroll 1134 table 1134 (768px) sticky 160 overlap 0 col1 108 free 974 box 0 text 0 rows 1
    CÓDIGO:108 | CLIENTE:243 | COTIZACIONES:94 | VALOR TOTAL:135 | ESTADO:135 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /operacion [] | frame 1134 scroll 1134 table 1134 (768px) sticky 144 overlap 0 col1 86 free 990 box 0 text 0 rows 3
    CÓDIGO:86 | CURSO:226 | CLIENTE:194 | MODALIDAD:108 | REDACTOR:194 | ALUMNOS:75 | ESTADO:108 | ·:144
1440x900 /operacion [] ARCH | frame 1134 scroll 1134 table 1134 (768px) sticky 160 overlap 0 col1 62 free 974 box 0 text 0 rows 1
    CÓDIGO:62 | CURSO:163 | CLIENTE:140 | MODALIDAD:78 | REDACTOR:140 | ALUMNOS:54 | ESTADO:78 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /operacion/turmas/1 [Alumnos] | frame 1134 scroll 1134 table 1134 (768px) sticky 144 overlap 0 col1 482 free 990 box 0 text 0 rows 10
    NOMBRE:482 | RUT:241 | ESTADO MATRÍCULA:268 | ·:144
1440x900 /operacion/turmas/1 [Alumnos] ARCH | frame 1134 scroll 1134 table 1134 (768px) sticky 160 overlap 0 col1 476 free 974 box 0 text 0 rows 1
    NOMBRE:476 | RUT:238 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /cursos [] | frame 1134 scroll 1134 table 1134 (768px) sticky 144 overlap 0 col1 385 free 990 box 0 text 0 rows 2
    NOMBRE:385 | NOMBRE TÉCNICO:238 | CARGA HORARIA (H):128 | REDACTORES:238 | ·:144
1440x900 /cursos [] ARCH | frame 1134 scroll 1134 table 1134 (768px) sticky 160 overlap 0 col1 278 free 974 box 0 text 0 rows 1
    NOMBRE:278 | NOMBRE TÉCNICO:172 | CARGA HORARIA (H):93 | REDACTORES:172 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /certificados [Emisión] | frame 1100 scroll 1100 table 1100 (768px) sticky 128 overlap 0 col1 318 free 972 box 0 text 0 rows 10
    NOMBRE:318 | NOTA FINAL:124 | ASISTENCIA:124 | ESTADO ACAD.:177 | CERTIFICADO:230 | ·:128
1440x900 /certificados [Historial] | frame 1134 scroll 1134 table 1134 (768px) sticky 256 overlap 0 col1 91 free 878 box 0 text 0 rows 1
    CÓDIGO:91 | ALUMNO:205 | CURSO:240 | FECHA EMISIÓN:114 | VIGENCIA HASTA:114 | ESTADO:114 | ·:256
1440x900 /personas [Redactores] | frame 1134 scroll 1134 table 1134 (672px) sticky 192 overlap 0 col1 283 free 942 box 0 text 0 rows 6
    NOMBRE COMPLETO:283 | RUT:204 | CURSOS HABILITADOS:110 | IDONEIDAD:157 | ÚLTIMO ACCESO:188 | ·:192
1440x900 /personas [Redactores] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 214 free 974 box 0 text 0 rows 1
    NOMBRE COMPLETO:214 | RUT:155 | CURSOS HABILITADOS:83 | IDONEIDAD:119 | ÚLTIMO ACCESO:143 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /personas [Alumnos] | frame 1134 scroll 1134 table 1134 (768px) sticky 113 overlap 0 col1 391 free 1021 box 0 text 0 rows 10
    NOMBRE COMPLETO:391 | RUT:195 | CLIENTE ACTUAL:282 | TURMAS:152 | ·:113
1440x900 /personas [Alumnos] DIALOGO (dialogo) | frame 960 scroll 960 table 960 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
1440x900 /administracion [Usuarios] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 336 free 990 box 0 text 0 rows 1
    NOMBRE:336 | ROL:243 | ESTADO:187 | ÚLTIMO ACCESO:224 | ·:144
1440x900 /administracion [Usuarios] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 243 free 974 box 0 text 0 rows 1
    NOMBRE:243 | ROL:175 | ESTADO:135 | ÚLTIMO ACCESO:162 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /administracion [Roles y permisos] | frame 1134 scroll 1134 table 1134 (672px) sticky 113 overlap 0 col1 564 free 1021 box 0 text 0 rows 3
    NOMBRE:564 | TIPO:269 | PERMISOS:188 | ·:113
```

</details>

### Observação — diálogo do Alumno em 0 linhas

Nos três viewports, a linha `DIALOGO` existe (confirma que o "Ver" abriu o diálogo e o script
mediu a tabela de certificados dentro dele), mas mede `rows 0` e todos os cabeçalhos com largura
`0`, com `table (0px)` de `min-width`. O primeiro alumno da listagem (ordenação padrão) não tem
nenhum certificado emitido no seed do banco de dev — a tabela vazia é esperado dado esse dado, não
um bug do script. Fica como nota para as Tasks 8/10: se quiserem medir a régua de 390/1024 dentro
desse diálogo com linhas reais, precisam escolher (ou fabricar via fixture) um alumno com
certificado emitido antes de clicar "Ver".

## 4. Depois do piso, das ações e do colapso — `44fce239`

Medição read-only com o script do Apêndice A, offset +2 (SPA `:5175`, API `:8082`), es-CL, tema
claro, `admin@lotus.cl`. Turma medida: 1. As 7 visões de arquivados foram medidas com a fixture da
seção 2 (rearquivada para este passo — mesmos 7 ids, `fixture.cjs archive` → `medir.cjs` →
`fixture.cjs restore`). Saída bruta completa em `meio.txt` no fim desta seção.

### 1024x768 — piso de 42rem uniforme, sem sobreposição

| Tabela | Moldura | Tabela | Presa | Sobreposição | TRUNC |
|---|---|---|---|---|---|
| Dashboard painel 1 (Curso) | 718 | 718 (`scrollWidth` 749) | — | — | não |
| Dashboard painel 2 (Relator) | 718 | 718 (`scrollWidth` 747) | — | — | não |
| Clientes | 718 | 718 | 144 | 0 | não |
| Clientes (arquivados) | 718 | 718 | 160 | 0 | não |
| Presupuestos | 718 | 718 | 96 | 0 | não |
| Presupuestos (arquivados) | 718 | 718 | 160 | 0 | não |
| Turmas | 718 | 718 | 144 | 0 | não |
| Turmas (arquivados) | 718 | 718 | 160 | 0 | não |
| Matrícula (turma 1) | 718 | 718 | 144 | 0 | não |
| Matrícula (arquivados) | 718 | 718 | 160 | 0 | não |
| Cursos | 718 | 718 | 144 | 0 | não |
| Cursos (arquivados) | 718 | 718 | 160 | 0 | não |
| Emisión | 684 | 684 | 96 | 0 | não |
| Historial | 718 | 718 | 144 | 0 | não |
| Redactores | 718 | 718 | 192 | 0 | não |
| Redactores (arquivados) | 718 | 718 | 160 | 0 | não |
| Alumnos | 718 | 718 | 96 | 0 | não |
| Alumnos → diálogo do alumno | 669 | 669 | — | 0 | não |
| Usuarios | 718 | 718 | 144 | 0 | não |
| Usuarios (arquivados) | 718 | 718 | 160 | 0 | não |
| Roles y permisos | 718 | 718 | 96 | 0 | não |

**A régua de 1024 fecha (Step 2 do brief, sem STOP):** as 18 linhas com presa medem
`table == frame == scroll` (718, ou 684 na Emisión — o mesmo frame menor do baseline) — `min-width`
uniforme de 672px (42rem) em todas as 12 tabelas, não só nas 3 que já tinham piso reduzido antes do
item 23. Sobreposição 0 nas 18. Nenhum `TRUNC`. Dashboard: `scrollWidth` (749/747) > `table` 718,
mas o invólucro (`frame` 718) não estica — mesmo comportamento do "antes" (§3), `table` (718) ≤
`frame` (718).

### 390x844 — presa vs. caixa/texto da 1ª coluna

| Tabela | Presa | 1ª coluna (`col1`) | `free` | `box` coberto | `text` coberto |
|---|---|---|---|---|---|
| Clientes | 72 | 189 | 204 | 0 | 0 |
| Clientes (arquivados) | 72 | 139 | 204 | 0 | 0 |
| Presupuestos | 72 | 91 | 204 | 0 | 0 |
| Presupuestos (arquivados) | 72 | 66 | 204 | 0 | 0 |
| Turmas | 72 | 52 | 204 | 0 | 0 |
| Turmas (arquivados) | 72 | 38 | 204 | 0 | 0 |
| Matrícula | 72 | 292 | 204 | **72** | 72 |
| Matrícula (arquivados) | 72 | 293 | 204 | **73** | 73 |
| Cursos | 72 | 233 | 204 | **13** | 13 |
| Cursos (arquivados) | 72 | 171 | 204 | 0 | 0 |
| Emisión | 72 | 196 | 170 | **10** | 10 |
| Historial | 72 | 62 | 204 | 0 | 0 |
| Redactores | 72 | 180 | 204 | 0 | 0 |
| Redactores (arquivados) | 72 | 132 | 204 | 0 | 0 |
| Alumnos | 72 | 230 | 204 | **10** | 10 |
| Alumnos → diálogo do alumno | — | — | — | 0 | 0 |
| Usuarios | 72 | 204 | 204 | 0 | 0 |
| Usuarios (arquivados) | 72 | 149 | 204 | 0 | 0 |
| Roles y permisos | 72 | 332 | 204 | **112** | 0 |

O colapso de ações uniformizou a presa em 72px em quase todas as 18 linhas (era 96–256 no
"antes"). 6 das 18 visões já fecham `box == 0` hoje (Clientes, Presupuestos, Turmas — ativa e
arquivada das três; Historial; Redactores e Usuarios ativas): o piso de 42rem já basta pra elas.
As outras 12 ainda reprovam — 5 ativas por `box > 0` (Matrícula 72, Cursos 13, Emisión 10, Alumnos
10, Roles 112) e 7 arquivadas (Clientes, Presupuestos, Turmas, Matrícula, Cursos, Redactores,
Usuarios), a maioria com `box == 0` mas reprovando pela outra perna da régua: `col1` já fica abaixo
do `col1` da ativa correspondente **mesmo no piso uniforme atual** (Clientes 139<189, Presupuestos
66<91, Turmas 38<52, Cursos 171<233, Redactores 132<180, Usuarios 149<204) — só Matrícula já vem
com arquivada ≥ ativa hoje (293>292), embora as duas tenham `box > 0`. Isso é o que a seção 5
resolve.

### 1440x900 — sem regressão

| Tabela | Moldura | Tabela | Sobreposição |
|---|---|---|---|
| Dashboard painel 1 | 1134 | 1134 | 0 |
| Dashboard painel 2 | 1134 | 1134 | 0 |
| Clientes / Clientes (arq.) | 1134 | 1134 | 0 |
| Presupuestos / (arq.) | 1134 | 1134 | 0 |
| Turmas / (arq.) | 1134 | 1134 | 0 |
| Matrícula / (arq.) | 1134 | 1134 | 0 |
| Cursos / (arq.) | 1134 | 1134 | 0 |
| Emisión | 1100 | 1100 | 0 |
| Historial | 1134 | 1134 | 0 |
| Redactores / (arq.) | 1134 | 1134 | 0 |
| Alumnos / diálogo do alumno | 1134 / 960 | 1134 / 960 | 0 |
| Usuarios / (arq.) | 1134 | 1134 | 0 |
| Roles y permisos | 1134 | 1134 | 0 |

Sem regressão: `frame == scroll == table`, sobreposição 0 nas 21 linhas — igual ao "antes" (§3) e ao
baseline do spec §2. A régua de 1440 fecha (Step 2 do brief, sem STOP).

<details>
<summary>Saída bruta de <code>meio.txt</code> (126 linhas, <code>OUT=meio.json node medir.cjs</code>, fixture da seção 2 ativa nas 7 linhas <code>ARCH</code>)</summary>

```
1024x768 / [] | frame 718 scroll 749 table 718 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:180 | RELATORES:111 | PERÍODO:103 | DOCUMENTOS PRESENTES:60 | DOCUMENTOS FALTANTES:180 | HABILITADA:85
1024x768 / [] | frame 718 scroll 747 table 718 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:308 | CLASES EN CURSO:103 | PRÓXIMAS CLASES:103 | DOCUMENTOS VENCIDOS:103 | DOCUMENTOS POR VENCER:102
1024x768 /comercial [Clientes] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 181 free 574 box 0 text 0 rows 3
    RAZÓN SOCIAL:181 | RUT:91 | TIPO:101 | COMUNA:131 | CONTACTOS:71 | ·:144
1024x768 /comercial [Clientes] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 129 free 558 box 0 text 0 rows 1
    RAZÓN SOCIAL:129 | RUT:65 | TIPO:72 | COMUNA:93 | CONTACTOS:50 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /comercial [Presupuestos] | frame 718 scroll 718 table 718 (672px) sticky 96 overlap 0 col1 94 free 622 box 0 text 0 rows 5
    CÓDIGO:94 | CLIENTE:211 | COTIZACIONES:82 | VALOR TOTAL:117 | ESTADO:117 | ·:96
1024x768 /comercial [Presupuestos] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 62 free 558 box 0 text 0 rows 1
    CÓDIGO:62 | CLIENTE:139 | COTIZACIONES:54 | VALOR TOTAL:77 | ESTADO:77 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /operacion [] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 50 free 574 box 0 text 0 rows 3
    CÓDIGO:50 | CURSO:131 | CLIENTE:112 | MODALIDAD:62 | REDACTOR:112 | ALUMNOS:44 | ESTADO:62 | ·:144
1024x768 /operacion [] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 36 free 558 box 0 text 0 rows 1
    CÓDIGO:36 | CURSO:93 | CLIENTE:80 | MODALIDAD:44 | REDACTOR:80 | ALUMNOS:31 | ESTADO:45 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /operacion/turmas/1 [Alumnos] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 279 free 574 box 0 text 0 rows 10
    NOMBRE:279 | RUT:140 | ESTADO MATRÍCULA:155 | ·:144
1024x768 /operacion/turmas/1 [Alumnos] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 273 free 558 box 0 text 0 rows 1
    NOMBRE:273 | RUT:136 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /cursos [] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 223 free 574 box 0 text 0 rows 2
    NOMBRE:223 | NOMBRE TÉCNICO:138 | CARGA HORARIA (H):74 | REDACTORES:138 | ·:144
1024x768 /cursos [] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 159 free 558 box 0 text 0 rows 1
    NOMBRE:159 | NOMBRE TÉCNICO:99 | CARGA HORARIA (H):53 | REDACTORES:98 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /certificados [Emisión] | frame 684 scroll 684 table 684 (672px) sticky 96 overlap 0 col1 192 free 588 box 0 text 0 rows 10
    NOMBRE:192 | NOTA FINAL:75 | ASISTENCIA:75 | ESTADO ACAD.:107 | CERTIFICADO:139 | ·:96
1024x768 /certificados [Historial] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 60 free 574 box 0 text 0 rows 1
    CÓDIGO:60 | ALUMNO:134 | CURSO:157 | FECHA EMISIÓN:75 | VIGENCIA HASTA:75 | ESTADO:75 | ·:144
1024x768 /personas [Redactores] | frame 718 scroll 718 table 718 (672px) sticky 192 overlap 0 col1 158 free 526 box 0 text 0 rows 6
    NOMBRE COMPLETO:158 | RUT:114 | CURSOS HABILITADOS:61 | IDONEIDAD:88 | ÚLTIMO ACCESO:105 | ·:192
1024x768 /personas [Redactores] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 123 free 558 box 0 text 0 rows 1
    NOMBRE COMPLETO:123 | RUT:89 | CURSOS HABILITADOS:48 | IDONEIDAD:68 | ÚLTIMO ACCESO:82 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /personas [Alumnos] | frame 718 scroll 718 table 718 (672px) sticky 96 overlap 0 col1 238 free 622 box 0 text 0 rows 10
    NOMBRE COMPLETO:238 | RUT:119 | CLIENTE ACTUAL:172 | TURMAS:93 | ·:96
1024x768 /personas [Alumnos] DIALOGO (dialogo) | frame 669 scroll 669 table 669 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
1024x768 /administracion [Usuarios] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 195 free 574 box 0 text 0 rows 1
    NOMBRE:195 | ROL:141 | ESTADO:108 | ÚLTIMO ACCESO:130 | ·:144
1024x768 /administracion [Usuarios] ARCH | frame 718 scroll 718 table 718 (672px) sticky 160 overlap 0 col1 139 free 558 box 0 text 0 rows 1
    NOMBRE:139 | ROL:100 | ESTADO:77 | ÚLTIMO ACCESO:93 | ARCHIVADO EL:62 | ARCHIVADO POR:87 | ·:160
1024x768 /administracion [Roles y permisos] | frame 718 scroll 718 table 718 (672px) sticky 96 overlap 0 col1 344 free 622 box 0 text 0 rows 3
    NOMBRE:344 | TIPO:164 | PERMISOS:115 | ·:96
390x844 / [] | frame 276 scroll 708 table 672 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:168 | RELATORES:104 | PERÍODO:96 | DOCUMENTOS PRESENTES:56 | DOCUMENTOS FALTANTES:168 | HABILITADA:80
390x844 / [] | frame 276 scroll 707 table 672 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:288 | CLASES EN CURSO:96 | PRÓXIMAS CLASES:96 | DOCUMENTOS VENCIDOS:96 | DOCUMENTOS POR VENCER:96
390x844 /comercial [Clientes] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "RUT" col1 189 free 204 box 0 text 0 rows 3
    RAZÓN SOCIAL:189 | RUT:95 | TIPO:105 | COMUNA:137 | CONTACTOS:74 | ·:72
390x844 /comercial [Clientes] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 68 on "TIPO" col1 139 free 204 box 0 text 0 rows 1
    RAZÓN SOCIAL:139 | RUT:69 | TIPO:77 | COMUNA:100 | CONTACTOS:54 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /comercial [Presupuestos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CLIENTE" col1 91 free 204 box 0 text 0 rows 5
    CÓDIGO:91 | CLIENTE:204 | COTIZACIONES:79 | VALOR TOTAL:113 | ESTADO:113 | ·:72
390x844 /comercial [Presupuestos] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 58 on "COTIZACIONES" col1 66 free 204 box 0 text 0 rows 1
    CÓDIGO:66 | CLIENTE:149 | COTIZACIONES:58 | VALOR TOTAL:83 | ESTADO:83 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /operacion [] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CLIENTE" col1 52 free 204 box 0 text 0 rows 3
    CÓDIGO:52 | CURSO:137 | CLIENTE:117 | MODALIDAD:65 | REDACTOR:117 | ALUMNOS:46 | ESTADO:65 | ·:72
390x844 /operacion [] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 48 on "MODALIDAD" col1 38 free 204 box 0 text 0 rows 1
    CÓDIGO:38 | CURSO:100 | CLIENTE:86 | MODALIDAD:48 | REDACTOR:86 | ALUMNOS:33 | ESTADO:48 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /operacion/turmas/1 [Alumnos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "NOMBRE" col1 292 free 204 box 72 text 72 rows 10
    NOMBRE:292 | RUT:146 | ESTADO MATRÍCULA:162 | ·:72
390x844 /operacion/turmas/1 [Alumnos] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "NOMBRE" col1 293 free 204 box 73 text 73 rows 1
    NOMBRE:293 | RUT:147 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /cursos [] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 43 on "NOMBRE TÉCNICO" col1 233 free 204 box 13 text 13 rows 2
    NOMBRE:233 | NOMBRE TÉCNICO:144 | CARGA HORARIA (H):78 | REDACTORES:144 | ·:72
390x844 /cursos [] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "NOMBRE TÉCNICO" col1 171 free 204 box 0 text 0 rows 1
    NOMBRE:171 | NOMBRE TÉCNICO:106 | CARGA HORARIA (H):57 | REDACTORES:106 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /certificados [Emisión] | frame 242 scroll 672 table 672 (672px) sticky 72 overlap 46 on "NOTA FINAL" col1 196 free 170 box 10 text 10 rows 10
    NOMBRE:196 | NOTA FINAL:76 | ASISTENCIA:76 | ESTADO ACAD.:109 | CERTIFICADO:142 | ·:72
390x844 /certificados [Historial] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CURSO" col1 62 free 204 box 0 text 0 rows 1
    CÓDIGO:62 | ALUMNO:140 | CURSO:164 | FECHA EMISIÓN:78 | VIGENCIA HASTA:78 | ESTADO:78 | ·:72
390x844 /personas [Redactores] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "RUT" col1 180 free 204 box 0 text 0 rows 6
    NOMBRE COMPLETO:180 | RUT:130 | CURSOS HABILITADOS:70 | IDONEIDAD:100 | ÚLTIMO ACCESO:120 | ·:72
390x844 /personas [Redactores] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 49 on "CURSOS HABILITADOS" col1 132 free 204 box 0 text 0 rows 1
    NOMBRE COMPLETO:132 | RUT:95 | CURSOS HABILITADOS:51 | IDONEIDAD:73 | ÚLTIMO ACCESO:88 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /personas [Alumnos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 46 on "RUT" col1 230 free 204 box 10 text 10 rows 10
    NOMBRE COMPLETO:230 | RUT:115 | CLIENTE ACTUAL:166 | TURMAS:89 | ·:72
390x844 /personas [Alumnos] DIALOGO (dialogo) | frame 323 scroll 323 table 323 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
390x844 /administracion [Usuarios] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "ROL" col1 204 free 204 box 0 text 0 rows 1
    NOMBRE:204 | ROL:147 | ESTADO:113 | ÚLTIMO ACCESO:136 | ·:72
390x844 /administracion [Usuarios] ARCH | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 53 on "ROL" col1 149 free 204 box 0 text 0 rows 1
    NOMBRE:149 | ROL:108 | ESTADO:83 | ÚLTIMO ACCESO:100 | ARCHIVADO EL:67 | ARCHIVADO POR:93 | ·:72
390x844 /administracion [Roles y permisos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "NOMBRE" col1 332 free 204 box 112 text 0 rows 3
    NOMBRE:332 | TIPO:158 | PERMISOS:111 | ·:72
1440x900 / [] | frame 1134 scroll 1134 table 1134 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 2
    CURSO:284 | RELATORES:176 | PERÍODO:162 | DOCUMENTOS PRESENTES:94 | DOCUMENTOS FALTANTES:284 | HABILITADA:135
1440x900 / [] | frame 1134 scroll 1134 table 1134 (672px) sticky null overlap 0 col1 null free null box 0 text 0 rows 6
    RELATOR:486 | CLASES EN CURSO:162 | PRÓXIMAS CLASES:162 | DOCUMENTOS VENCIDOS:162 | DOCUMENTOS POR VENCER:162
1440x900 /comercial [Clientes] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 313 free 990 box 0 text 0 rows 3
    RAZÓN SOCIAL:313 | RUT:156 | TIPO:174 | COMUNA:226 | CONTACTOS:122 | ·:144
1440x900 /comercial [Clientes] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 226 free 974 box 0 text 0 rows 1
    RAZÓN SOCIAL:226 | RUT:113 | TIPO:125 | COMUNA:163 | CONTACTOS:88 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /comercial [Presupuestos] | frame 1134 scroll 1134 table 1134 (672px) sticky 113 overlap 0 col1 154 free 1021 box 0 text 0 rows 5
    CÓDIGO:154 | CLIENTE:347 | COTIZACIONES:135 | VALOR TOTAL:193 | ESTADO:193 | ·:113
1440x900 /comercial [Presupuestos] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 108 free 974 box 0 text 0 rows 1
    CÓDIGO:108 | CLIENTE:243 | COTIZACIONES:94 | VALOR TOTAL:135 | ESTADO:135 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /operacion [] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 86 free 990 box 0 text 0 rows 3
    CÓDIGO:86 | CURSO:226 | CLIENTE:194 | MODALIDAD:108 | REDACTOR:194 | ALUMNOS:75 | ESTADO:108 | ·:144
1440x900 /operacion [] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 62 free 974 box 0 text 0 rows 1
    CÓDIGO:62 | CURSO:163 | CLIENTE:140 | MODALIDAD:78 | REDACTOR:140 | ALUMNOS:54 | ESTADO:78 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /operacion/turmas/1 [Alumnos] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 482 free 990 box 0 text 0 rows 10
    NOMBRE:482 | RUT:241 | ESTADO MATRÍCULA:268 | ·:144
1440x900 /operacion/turmas/1 [Alumnos] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 476 free 974 box 0 text 0 rows 1
    NOMBRE:476 | RUT:238 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /cursos [] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 385 free 990 box 0 text 0 rows 2
    NOMBRE:385 | NOMBRE TÉCNICO:238 | CARGA HORARIA (H):128 | REDACTORES:238 | ·:144
1440x900 /cursos [] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 278 free 974 box 0 text 0 rows 1
    NOMBRE:278 | NOMBRE TÉCNICO:172 | CARGA HORARIA (H):93 | REDACTORES:172 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /certificados [Emisión] | frame 1100 scroll 1100 table 1100 (672px) sticky 110 overlap 0 col1 324 free 990 box 0 text 0 rows 10
    NOMBRE:324 | NOTA FINAL:126 | ASISTENCIA:126 | ESTADO ACAD.:180 | CERTIFICADO:234 | ·:110
1440x900 /certificados [Historial] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 103 free 990 box 0 text 0 rows 1
    CÓDIGO:103 | ALUMNO:231 | CURSO:270 | FECHA EMISIÓN:129 | VIGENCIA HASTA:129 | ESTADO:129 | ·:144
1440x900 /personas [Redactores] | frame 1134 scroll 1134 table 1134 (672px) sticky 192 overlap 0 col1 283 free 942 box 0 text 0 rows 6
    NOMBRE COMPLETO:283 | RUT:204 | CURSOS HABILITADOS:110 | IDONEIDAD:157 | ÚLTIMO ACCESO:188 | ·:192
1440x900 /personas [Redactores] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 214 free 974 box 0 text 0 rows 1
    NOMBRE COMPLETO:214 | RUT:155 | CURSOS HABILITADOS:83 | IDONEIDAD:119 | ÚLTIMO ACCESO:143 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /personas [Alumnos] | frame 1134 scroll 1134 table 1134 (672px) sticky 113 overlap 0 col1 391 free 1021 box 0 text 0 rows 10
    NOMBRE COMPLETO:391 | RUT:195 | CLIENTE ACTUAL:282 | TURMAS:152 | ·:113
1440x900 /personas [Alumnos] DIALOGO (dialogo) | frame 960 scroll 960 table 960 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
1440x900 /administracion [Usuarios] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 336 free 990 box 0 text 0 rows 1
    NOMBRE:336 | ROL:243 | ESTADO:187 | ÚLTIMO ACCESO:224 | ·:144
1440x900 /administracion [Usuarios] ARCH | frame 1134 scroll 1134 table 1134 (672px) sticky 160 overlap 0 col1 243 free 974 box 0 text 0 rows 1
    NOMBRE:243 | ROL:175 | ESTADO:135 | ÚLTIMO ACCESO:162 | ARCHIVADO EL:108 | ARCHIVADO POR:152 | ·:160
1440x900 /administracion [Roles y permisos] | frame 1134 scroll 1134 table 1134 (672px) sticky 113 overlap 0 col1 564 free 1021 box 0 text 0 rows 3
    NOMBRE:564 | TIPO:269 | PERMISOS:188 | ·:113
```

</details>

## 5. Piso estreito (spec §4.2)

12 das 18 visões (excluído Dashboard e o diálogo, que não têm presa) ainda reprovam a régua de 390
com o piso uniforme de 42rem: 5 ativas por `box > 0` e 7 arquivadas — a maioria por `col1` abaixo do
`col1` final da ativa, e Matrícula (arquivada) também por `box > 0`. O `narrowFloorTablePt` nasce; a
Task 9 aplica os `X` abaixo por visão.

| Visão | box | col1 | free | table | share | X |
|---|---|---|---|---|---|---|
| Matrícula (ativa) | 72 | 292 | 204 | 672 | 292/672 ≈ 0.4345 | **31.5rem** |
| Cursos (ativa) | 13 | 233 | 204 | 672 | 233/672 ≈ 0.3467 | **39.5rem** |
| Emisión (ativa) | 10 | 196 | 170 | 672 | 196/672 ≈ 0.2917 | **39.75rem** |
| Alumnos (ativa, `/personas`) | 10 | 230 | 204 | 672 | 230/672 ≈ 0.3423 | **40.0rem** |
| Roles y permisos (ativa) | 112 | 332 | 204 | 672 | 332/672 ≈ 0.4940 | **27.75rem** |
| Clientes (arquivada) | 0 | 139 | 204 | 672 | 139/672 ≈ 0.2068 | **57.25rem** |
| Presupuestos (arquivada) | 0 | 66 | 204 | 672 | 66/672 ≈ 0.0982 | **58.0rem** |
| Turmas (arquivada) | 0 | 38 | 204 | 672 | 38/672 ≈ 0.0565 | **57.5rem** |
| Matrícula (arquivada) | 73 | 293 | 204 | 672 | 293/672 ≈ 0.4360 | **31.5rem** † |
| Cursos (arquivada) | 0 | 171 | 204 | 672 | 171/672 ≈ 0.2545 | **54.0rem** ‡ |
| Redactores (arquivada) | 0 | 132 | 204 | 672 | 132/672 ≈ 0.1964 | **57.5rem** |
| Usuarios (arquivada) | 0 | 149 | 204 | 672 | 149/672 ≈ 0.2217 | **57.75rem** |

### Conta de cada `X`

**Ativas** (`share = w1/T`; `Xpx = (L + 16)/share`; `X = Xpx/16` arredondado para BAIXO em 0.25rem):

- **Matrícula:** `share = 292/672 = 0.43452`; `Xpx = 220×672/292 = 506.301px`;
  `X = 506.301/16 = 31.6438rem` → **31.5rem**. Referência da spec ~32rem — diferença 0.5rem (~1,6%),
  dentro do esperado.
- **Cursos:** `share = 233/672 = 0.34673`; `Xpx = 220/0.34673 = 634.506px`;
  `X = 634.506/16 = 39.6567rem` → **39.5rem**. Referência ~40rem — diferença 0.5rem (~1,25%).
- **Emisión:** `share = 196/672 = 0.29167`; `Xpx = (170+16)/0.29167 = 186/0.29167 = 637.714px`;
  `X = 637.714/16 = 39.8571rem` → **39.75rem**. Referência ~39rem — diferença 0.75rem (~1,9%).
- **Alumnos (`/personas`):** `share = 230/672 = 0.34226`; `Xpx = 220/0.34226 = 642.783px`;
  `X = 642.783/16 = 40.1739rem` → **40.0rem**. Referência ~36rem — diferença 4rem (~11%), a maior do
  lote. Remedido isoladamente (`VPS=390x844 PAGES=/personas node medir.cjs`, sem fixture): `col1
  230`, `free 204`, `box 10` — idênticos ao `meio.txt`. Valor mantido, registrado como **preocupação**
  abaixo.
- **Roles y permisos:** `share = 332/672 = 0.49405`; `Xpx = 220/0.49405 = 445.301px`;
  `X = 445.301/16 = 27.8313rem` → **27.75rem**. Referência ~25rem — diferença 2.75rem (~11%).
  Remedido isoladamente (`VPS=390x844 PAGES=/administracion node medir.cjs`): `col1 332`, `free
  204`, `box 112` — idênticos ao `meio.txt`. Valor mantido, registrado como **preocupação** abaixo.

**Arquivadas** (`share_a = col1_a/table_a`; `X = col1_ativa/share_a/16` arredondado para CIMA em
0.25rem; teste `share_a × X × 16 − 16 ≤ free_a`; `col1_ativa` = o `col1` final da ativa —
`share_ativa × X_ativa × 16` se a ativa reprovou, ou o medido se passou):

- **Clientes:** ativa passou, `col1_ativa = 189`. `share_a = 139/672 = 0.20685`;
  `X = 189×672/139/16 = 127008/139/16 = 913.727/16 = 57.1079rem` → **57.25rem**. Teste:
  `139/672×57.25×16 − 16 = 189.470 − 16 = 173.470 ≤ 204` ✓.
- **Presupuestos:** ativa passou, `col1_ativa = 91`. `share_a = 66/672 = 0.09821`;
  `X = 91×672/66/16 = 61152/66/16 = 926.545/16 = 57.9091rem` → **58.0rem**. Teste:
  `66/672×58×16 − 16 = 91.143 − 16 = 75.143 ≤ 204` ✓.
- **Turmas:** ativa passou, `col1_ativa = 52`. `share_a = 38/672 = 0.05655`;
  `X = 52×672/38/16 = 34944/38/16 = 919.579/16 = 57.4737rem` → **57.5rem**. Teste:
  `38/672×57.5×16 − 16 = 52.024 − 16 = 36.024 ≤ 204` ✓.
- **Matrícula †:** aqui a arquivada reprova só por `box = 73 > 0` — `col1` dela (293) já é ≥ o
  `col1` final da ativa (219 = `292/672×31.5×16`), então a perna "`col1` < ativa" da régua **não**
  é a que falha, e a fórmula do brief (pensada pro caso em que falha por `col1` menor) devolveria um
  `X` menor que o piso atual (`219×672/293/16 = 31.39 → 31.5rem`, abaixo dos 672px de hoje — não
  faz sentido reduzir a tabela que já está larga o bastante). Tratei este caso pela mesma fórmula que
  as ativas usam (limpar a própria caixa): `share_a = 293/672 = 0.43601`;
  `Xpx = 220×672/293 = 504.573px`; `X = 504.573/16 = 31.5358rem` arredondado para
  BAIXO → **31.5rem** — coincide com o `X` da ativa. Confirmação: em 31.5rem, `col1` da arquivada
  sobe pra `293/672×31.5×16 = 219.75px`, ainda ≥ `219` da ativa, e a caixa fecha
  (`219.75 − 16 = 203.75 ≤ 204`, margem de 0.25px). **Divergência de método registrada — a fórmula do
  brief não cobre esse ramo (reprova por caixa própria com `col1` já ≥ ativa); usei a fórmula das
  ativas por analogia.** Levar ao João.
- **Cursos ‡:** ativa reprovou, `X_ativa = 39.5rem`, `col1_ativa = 233/672×39.5×16 = 219.131`.
  `share_a = 171/672 = 0.25446`; `X = 219.131×672/171/16 = 147256/171/16 = 861.146/16 = 53.8216rem`
  → **54.0rem**. Teste: `171/672×54×16 − 16 = 219.857 − 16 = 203.857 ≤ 204` ✓ — **margem de só
  0.14px**. Conferi o teto da própria caixa (`floor((204+16)/0.25446/16 em 0.25rem)`) e ele também
  cai em **54.0rem** — ou seja, o `X` que faz `col1` alcançar a ativa e o `X` máximo que ainda deixa
  a caixa da própria arquivada livre **coincidem**; não há folga entre as duas condições. **Registrado
  como preocupação:** esta é a linha mais frágil do lote — 1px de diferença no `col1` medido (ruído
  normal de `Math.round` em fonte/renderização) e o teto passaria a ser o valor final em vez do alvo
  de paridade com a ativa, ou a caixa reabriria.
- **Redactores:** ativa passou, `col1_ativa = 180`. `share_a = 132/672 = 0.19643`;
  `X = 180×672/132/16 = 120960/132/16 = 916.364/16 = 57.2727rem` → **57.5rem**. Teste:
  `132/672×57.5×16 − 16 = 180.714 − 16 = 164.714 ≤ 204` ✓.
- **Usuarios:** ativa passou, `col1_ativa = 204`. `share_a = 149/672 = 0.22173`;
  `X = 204×672/149/16 = 137088/149/16 = 920.054/16 = 57.5034rem` → **57.75rem**. Teste:
  `149/672×57.75×16 − 16 = 204.875 − 16 = 188.875 ≤ 204` ✓.

### Preocupações para o João

1. **Alumnos (`/personas`) e Roles y permisos** divergem ~11% da referência da spec §4.2 (40.0rem
   vs. ~36rem; 27.75rem vs. ~25rem) — remedidos isoladamente e estáveis (mesmos `col1`/`free`/`box`).
   Não é erro de medição; a referência da spec provavelmente somou sobre números de uma fase
   intermediária do mecanismo, não sobre o "depois" final das Tasks 2-7. Uso o valor medido.
2. **As 6 arquivadas que precisam "alcançar" a ativa** (Clientes, Presupuestos, Turmas, Cursos,
   Redactores, Usuarios) pedem pisos de 54–58rem — bem mais largos que os 42rem atuais, porque o
   `col1` delas é uma fração pequena da tabela (2 colunas extras de auditoria disputando espaço), e
   a régua "arquivada ≥ ativa" amplifica isso por proporcionalidade. Vale o João decidir se a Task 9
   aplica esses pisos largos por-visão mesmo, ou se skip via outra saída (ex.: aceitar
   "arquivada < ativa" nessas 6, já que é só cosmético e a informação nunca se perde — o `free` de
   204px nunca é invadido, só o texto da 1ª coluna trunca mais na arquivada).
3. **Cursos (arquivada)** fecha a caixa por só 0.14px de margem no `X` calculado (54.0rem) — o
   teto da própria caixa também cai em 54.0rem, ou seja, o alvo de paridade com a ativa e o limite
   de "não reabrir a caixa" coincidem; é a linha mais frágil do lote a 1px de diferença na medição.
4. **Matrícula (arquivada)** caiu num ramo que a fórmula do brief não cobre (reprova só por caixa
   própria, já com `col1` ≥ ativa) — resolvido por analogia com a fórmula das ativas, mas fica
   como nota de método, não como número incerto (o resultado bateu exatamente com o `X` da ativa).

## Apêndice A — `medir.cjs`

Texto idêntico ao do brief (Step 2), sem alteração.

```js
// medir.cjs — medição read-only das tabelas do item 23 (D-65).
// Uso: VPS=1024x768,390x844 PAGES=/,/comercial OUT=saida.json node medir.cjs
const fs = require('fs')
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const BASE = process.env.BASE || 'http://localhost:5175'
const VIEWPORTS = (process.env.VPS || '1024x768,390x844,1440x900').split(',').map((v) => v.split('x').map(Number))
const PAGES = (
  process.env.PAGES || '/,/comercial,/operacion,/operacion/turmas/1,/cursos,/certificados,/personas,/administracion'
).split(',')

function measure() {
  const out = []
  document.querySelectorAll('.p-datatable-wrapper').forEach((w) => {
    if (!w.offsetParent) return
    const table = w.querySelector('table')
    const ths = [...table.querySelectorAll('thead th')]
    // Só linhas de dado: a linha de "sem resultados" tem uma célula com colspan.
    const bodyRows = [...table.querySelectorAll('tbody tr')].filter((tr) => tr.children.length === ths.length)
    const cells = bodyRows.length ? [...bodyRows[0].children] : ths
    const sticky = cells.find((c) => getComputedStyle(c).position === 'sticky')
    const stickyLeft = sticky ? sticky.getBoundingClientRect().left : null
    let overlap = 0
    let coveredCol = null
    if (sticky) {
      cells.forEach((c, i) => {
        if (c === sticky) return
        const r = c.getBoundingClientRect()
        const o = Math.min(r.right, sticky.getBoundingClientRect().right) - Math.max(r.left, stickyLeft)
        if (o > overlap) {
          overlap = Math.round(o)
          coveredCol = (ths[i]?.innerText || '').trim()
        }
      })
    }
    // Régua de 390 (spec §3): a CAIXA de conteúdo da 1ª célula contra a presa,
    // pior linha. O texto coberto sai junto só como referência (a leitura da D-65).
    let firstBoxCovered = 0
    let firstTextCovered = 0
    let firstColW = null
    let free = null
    if (sticky && bodyRows.length) {
      bodyRows.forEach((tr) => {
        const td = tr.children[0]
        const r = td.getBoundingClientRect()
        firstColW = Math.round(r.width)
        free = Math.round(stickyLeft - r.left)
        const contentRight = r.right - parseFloat(getComputedStyle(td).paddingRight)
        firstBoxCovered = Math.max(firstBoxCovered, Math.round(contentRight - stickyLeft))
        const range = document.createRange()
        range.selectNodeContents(td)
        const rects = [...range.getClientRects()].filter((x) => x.width > 0)
        if (rects.length) {
          const textRight = Math.min(Math.max(...rects.map((x) => x.right)), contentRight)
          firstTextCovered = Math.max(firstTextCovered, Math.round(textRight - stickyLeft))
        }
      })
    }
    const truncHeaders = ths
      .filter((th) => {
        const t = th.querySelector('.p-column-title') || th
        return t.scrollWidth > t.clientWidth + 1
      })
      .map((th) => th.innerText.trim())
    out.push({
      inDialog: !!w.closest('.p-dialog'),
      headers: ths.map((th) => `${th.innerText.trim() || '·'}:${Math.round(th.getBoundingClientRect().width)}`).join(' | '),
      frame: w.clientWidth,
      scrollW: w.scrollWidth,
      table: Math.round(table.getBoundingClientRect().width),
      tableMinW: getComputedStyle(table).minWidth,
      stickyW: sticky ? Math.round(sticky.getBoundingClientRect().width) : null,
      overlap,
      coveredCol,
      firstColW,
      free,
      firstBoxCovered: Math.max(0, firstBoxCovered),
      firstTextCovered: Math.max(0, firstTextCovered),
      truncHeaders,
      rows: bodyRows.length,
    })
  })
  return out
}

async function snap(page, label, results, onlyDialog = false) {
  await page.waitForTimeout(1800)
  const r = await page.evaluate(measure)
  r.filter((t) => !onlyDialog || t.inDialog).forEach((t) => results.push({ label, ...t }))
}

;(async () => {
  const browser = await chromium.launch()
  const results = []
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-CL' })
    await ctx.addInitScript(() => localStorage.setItem('lotus-lang', 'es-CL'))
    const page = await ctx.newPage()
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
    await page.fill('input[type=password]', 'senha123')
    await page.keyboard.press('Enter')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`)
      await page.waitForLoadState('networkidle')
      const tabs = await page.locator('[role=tab]').all()
      const tabNames = tabs.length ? await Promise.all(tabs.map((t) => t.innerText())) : ['']
      for (let i = 0; i < tabNames.length; i++) {
        if (tabs.length) {
          await tabs[i].click()
          await page.waitForLoadState('networkidle')
        }
        const label = `${w}x${h} ${path} [${tabNames[i].trim()}]`
        if (path === '/certificados' && /Emisi/i.test(tabNames[i])) {
          const dd = page.locator('.p-dropdown').first()
          if (await dd.count()) {
            await dd.click()
            const opt = page.locator('.p-dropdown-item').first()
            if (await opt.count()) await opt.click()
            await page.waitForLoadState('networkidle')
          }
        }
        await snap(page, label, results)
        // Diálogo do Alumno (consumidora 15): só se alcança abrindo a linha.
        if (path === '/personas' && /Alumnos/i.test(tabNames[i])) {
          const ver = page.locator('tbody').getByRole('button', { name: /^Ver$/ }).first()
          if (await ver.count()) {
            await ver.click()
            await page.waitForLoadState('networkidle')
            await snap(page, `${label} DIALOGO`, results, true)
            await page.keyboard.press('Escape')
          }
        }
        const arch = page.getByRole('button', { name: /Archivad/ }).first()
        if ((await arch.count()) && (await arch.isVisible())) {
          await arch.click()
          await page.waitForLoadState('networkidle')
          await snap(page, `${label} ARCH`, results)
          const act = page.getByRole('button', { name: /^Activ/ }).first()
          if (await act.count()) {
            await act.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    }
    await ctx.close()
  }
  await browser.close()
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(results, null, 2))
  for (const r of results) {
    console.log(
      `${r.label}${r.inDialog ? ' (dialogo)' : ''} | frame ${r.frame} scroll ${r.scrollW} table ${r.table} (${r.tableMinW}) ` +
        `sticky ${r.stickyW} overlap ${r.overlap}${r.coveredCol ? ` on "${r.coveredCol}"` : ''} ` +
        `col1 ${r.firstColW} free ${r.free} box ${r.firstBoxCovered} text ${r.firstTextCovered} rows ${r.rows}` +
        `${r.truncHeaders.length ? ` TRUNC ${JSON.stringify(r.truncHeaders)}` : ''}\n    ${r.headers}`,
    )
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

## Apêndice B — `fixture.cjs`

Texto **com** o desvio da seção 2 (hooks `pre`/`pos` na entrada `presupuesto` de `ENTIDADES`, e
`password` no `USUARIO`) — este é o texto que efetivamente rodou e produziu a fixture da seção 2.

```js
// fixture.cjs — cada visão de arquivados com 1 linha, para a régua do item 23.
// O banco de dev do offset +2 não tem nenhum registro arquivado.
// Uso: node fixture.cjs archive   (grava fixture-ids.json ao lado, a cada acerto)
//      node fixture.cjs restore   (lê fixture-ids.json e restaura tudo)
const fs = require('fs')
const path = require('path')
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const SPA = process.env.BASE || 'http://localhost:5175'
const API = process.env.API || 'http://localhost:8082'
const IDS = path.join(__dirname, 'fixture-ids.json')
// O único staff do banco de dev é o admin, e ele nunca se arquiva: a visão de
// arquivados de Usuarios precisa de um usuário próprio, que fica no banco depois.
const USUARIO = {
  name: 'Fixture Item 23',
  email: 'fixture.item23@lotus.cl',
  role: 'admin',
  is_active: true,
  password: 'senhaFixtureItem23!',
}

// O primeiro candidato que a API aceitar arquivar vira a fixture. A turma 1
// hospeda a matrícula arquivada e a 3 está concluída.
//
// DESVIO do brief: os 6 presupuestos do seed têm cotización aprobada, e a API
// recusa DELETE direto ("Un presupuesto con cotización aprobada no puede
// eliminarse. Rechácela antes."). `pre` rejeita a cotação antes do DELETE
// (mesmo Fluxo 2 que o produto já expõe); `pos` reaprova depois do restore —
// ciclo reversível, guarda o id da cotação em `ids.presupuesto_quote`.
const ENTIDADES = [
  { chave: 'cliente', lista: '/api/clients', base: (id) => `/api/clients/${id}` },
  {
    chave: 'presupuesto',
    lista: '/api/budgets',
    base: (id) => `/api/budgets/${id}`,
    pre: async (page, x, ids) => {
      const qs = linhas((await chamar(page, 'GET', `/api/budgets/${x.id}/quotes`)).json)
      const aprovada = qs.find((q) => q.status === 'approved')
      if (!aprovada) return
      const r = await chamar(page, 'POST', `/api/quotes/${aprovada.id}/reject`)
      if (r.status >= 300) throw new Error(`POST /api/quotes/${aprovada.id}/reject ${r.status}`)
      ids.presupuesto_quote = aprovada.id
      fs.writeFileSync(IDS, JSON.stringify(ids, null, 2))
    },
    pos: async (page, ids) => {
      if (ids.presupuesto_quote === undefined) return
      const r = await chamar(page, 'POST', `/api/quotes/${ids.presupuesto_quote}/approve`)
      console.log(`presupuesto_quote ${ids.presupuesto_quote}: approve ${r.status}`)
      if (r.status >= 300) throw new Error(`POST /api/quotes/${ids.presupuesto_quote}/approve ${r.status}`)
      delete ids.presupuesto_quote
    },
  },
  { chave: 'turma', lista: '/api/turmas', base: (id) => `/api/turmas/${id}`, pular: [1, 3] },
  { chave: 'curso', lista: '/api/courses', base: (id) => `/api/courses/${id}` },
  { chave: 'redactor', lista: '/api/redatores', base: (id) => `/api/redatores/${id}` },
  { chave: 'usuario', lista: '/api/users', base: (id) => `/api/users/${id}`, so: (x) => x.email === USUARIO.email },
  { chave: 'matricula', lista: '/api/turmas/1/alunos', base: (id) => `/api/turmas/1/alunos/${id}` },
]

async function chamar(page, metodo, rota, corpo) {
  return page.evaluate(
    async ({ API, metodo, rota, corpo }) => {
      const par = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
      const xsrf = par ? decodeURIComponent(par.slice('XSRF-TOKEN='.length)) : ''
      const r = await fetch(API + rota, {
        method: metodo,
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf },
        body: corpo ? JSON.stringify(corpo) : undefined,
      })
      let json = null
      try {
        json = await r.json()
      } catch {
        // 204 sem corpo
      }
      return { status: r.status, json }
    },
    { API, metodo, rota, corpo },
  )
}

const linhas = (json) => (Array.isArray(json) ? json : (json?.data ?? []))

async function arquivar(page) {
  const usuarios = linhas((await chamar(page, 'GET', '/api/users')).json)
  if (!usuarios.some((u) => u.email === USUARIO.email)) {
    const criado = await chamar(page, 'POST', '/api/users', USUARIO)
    if (criado.status >= 300) throw new Error(`POST /api/users ${criado.status}: ${JSON.stringify(criado.json)}`)
  }
  const ids = fs.existsSync(IDS) ? JSON.parse(fs.readFileSync(IDS, 'utf8')) : {}
  for (const e of ENTIDADES) {
    if (ids[e.chave] !== undefined) continue
    const candidatos = linhas((await chamar(page, 'GET', e.lista)).json)
      .filter((x) => !(e.pular || []).includes(x.id))
      .filter((x) => (e.so ? e.so(x) : true))
    for (const x of candidatos) {
      if (e.pre) await e.pre(page, x, ids)
      const r = await chamar(page, 'DELETE', e.base(x.id))
      if (r.status < 300) {
        ids[e.chave] = x.id
        fs.writeFileSync(IDS, JSON.stringify(ids, null, 2))
        break
      }
      console.log(`${e.chave} ${x.id}: DELETE ${r.status} ${r.json?.detail ?? ''}`)
    }
    if (ids[e.chave] === undefined) throw new Error(`nenhum ${e.chave} arquivável`)
  }
  console.log('arquivados:', JSON.stringify(ids))
}

async function restaurar(page) {
  if (!fs.existsSync(IDS)) return console.log('nada a restaurar')
  const ids = JSON.parse(fs.readFileSync(IDS, 'utf8'))
  for (const e of ENTIDADES) {
    if (ids[e.chave] === undefined) continue
    const r = await chamar(page, 'POST', `${e.base(ids[e.chave])}/restore`)
    console.log(`${e.chave} ${ids[e.chave]}: restore ${r.status}`)
    if (r.status >= 300) {
      process.exitCode = 1
      continue
    }
    delete ids[e.chave]
    if (e.pos) await e.pos(page, ids)
  }
  if (Object.keys(ids).length === 0) fs.unlinkSync(IDS)
  else fs.writeFileSync(IDS, JSON.stringify(ids, null, 2))
}

;(async () => {
  const modo = process.argv[2]
  if (!['archive', 'restore'].includes(modo)) throw new Error('uso: node fixture.cjs archive|restore')
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  try {
    await page.goto(`${SPA}/login`)
    await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
    await page.fill('input[type=password]', 'senha123')
    await page.keyboard.press('Enter')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    if (modo === 'archive') await arquivar(page)
    else await restaurar(page)
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```
