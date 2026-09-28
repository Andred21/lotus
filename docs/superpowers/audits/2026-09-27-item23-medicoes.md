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
