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

### Rodadas da fixture — conferência da Task 10

As quatro rodadas arquivaram os mesmos ids: `cliente 1`, `presupuesto 1` (com a cotação 1
rejeitada e reaprovada), `turma 4`, `curso 1`, `redactor 3`, `usuario 59` e `matricula 1`. Os logs
de `archive` da 3ª e da 4ª rodadas repetem o mesmo `arquivados:` da 1ª.

| Rodada | Passo | Arquivou | Restaurou | Evidência do `restore` |
|---|---|---|---|---|
| 1ª | Task 1, `antes` (§3) | 27/09 ~21:16 | 27/09 ~21:20 | 7 × `restore 200` + `approve 200` (tabela acima); 5 visões de arquivados em `count: 0` |
| 2ª | Task 8, `meio` (§4) | 27/09, antes de `meio.txt` (22:53) | logo depois | 7 × `restore 200` + `approve 200`; `fixture-ids.json` ausente; `verify_clean.cjs` com as 5 visões em `count: 0` e a cotação 1 `approved` |
| 3ª | Task 9, piso estreito (§5 Step 4) | 27/09 ~23:42 (`piso.txt`) e 28/09 00:17 (`archive3.log`) | ao fim da 2ª rodada interna da Task 9 (~23:55) e da 3ª (~00:18) | 8 linhas `200` ao fim da 2ª rodada interna, pelo relatório da Task 9. O `archive` de 00:17 recomeçou do zero: tentou `redactor 1` e `2`, e achou `fixture.item23@lotus.cl` ativo. Isso só acontece com o ciclo anterior já restaurado. `fixture-ids.json` ausente ao fim da 3ª rodada interna |
| 4ª | Task 10, `depois` (§6) | 28/09 00:22 | 28/09 00:26 | a saída abaixo |

```
$ node fixture.cjs restore        # 4ª rodada, 28/09 00:26
cliente 1: restore 200
presupuesto 1: restore 200
presupuesto_quote 1: approve 200
turma 4: restore 200
curso 1: restore 200
redactor 3: restore 200
usuario 59: restore 200
matricula 1: restore 200
restore exit 0
$ ls fixture-ids.json
ls: cannot access 'fixture-ids.json': No such file or directory
```

A prova final é o estado do banco depois da 4ª rodada. Ela vale pelas quatro, porque os ids são os
mesmos. Rodei o `verify_clean.cjs` da Task 1 com as duas visões que ele não lia (`users/archived` e
`turmas/1/alunos/archived`):

```
/api/clients/archived 200 count= 0
/api/budgets/archived 200 count= 0
/api/turmas/archived 200 count= 0
/api/courses/archived 200 count= 0
/api/redatores/archived 200 count= 0
/api/users/archived 200 count= 0
/api/turmas/1/alunos/archived 200 count= 0
fixture user: {"id":59,...,"email":"fixture.item23@lotus.cl",...,"role":"admin","is_active":true,...,"last_login":null}
budget1 quotes: [{"id":1,"status":"approved"},{"id":2,"status":"rejected"},{"id":3,"status":"pending"}]
```

Nenhum registro ficou arquivado. A cotação 1 voltou a `approved`, e `admin@lotus.cl` nunca foi
arquivado.

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

### Step 4 — remedição real no Chromium

A 1ª rodada (`piso.txt`, fixture ativa, `VPS=390x844,1024x768`) reprovou DUAS linhas que a fórmula
tinha dado como corretas:

| Visão | `X` calculado | `table` | `sticky` | `col1` | `free` | `box` |
|---|---|---|---|---|---|---|
| Cursos (arquivada) | 54.0rem | 864px | 86px | 222 | 190 | **16** |
| Usuarios (arquivada) | 57.75rem | 924px | 92px | 207 | 184 | **8** |

Causa: a fórmula da seção acima assume `free` constante em 204px (172px na Emisión) — a mesma
`stickyW` de 72px (o `4.5rem` colapsado) em qualquer piso. Isso vale enquanto o piso não passa do
"ponto de equilíbrio" em que a soma das larguras das colunas (as % de dado mais o par fixo de
`ARCHIVED_COLUMN` mais os 72px da presa) já fecha exatamente com os 42rem default (672px) — é onde
TODAS as sete visões de arquivados nasceram, porque o piso antigo era uniforme. Acima disso, o
`table-layout: fixed` do Chromium não mantém a presa fixa em 72px: com min-width forçando a tabela
a crescer além da soma natural das colunas, o espaço extra se distribui PROPORCIONALMENTE a todas as
colunas que já declaram largura — inclusive a presa (`style.width`, um valor absoluto). Medido:
`sticky` foi de 72px em 672px de tabela para 86–93px em 816–928px — e como `free = frame − sticky`
(276 − sticky em 390×844), o `free` ENCOLHE conforme o piso cresce, ao contrário do que a fórmula
original supôs. Nas cinco visões cujo `X` calculado ficava mais perto do equilíbrio (Clientes,
Presupuestos, Turmas, Redactores, e a Matrícula arquivada com piso pequeno) a margem sobreviveu; nas
duas com a MAIOR razão entre `X` calculado e a fração `share_a` (Cursos e Usuarios — as duas com o
`col1` ativo mais alto exigindo o maior salto), o encolhimento do `free` superou o ganho de `col1` e
a caixa reabriu.

Correção, em duas voltas. A 1ª bisseccionou no navegador real (`VPS=390x844 PAGES=/cursos` e
`PAGES=/administracion`, mesma sessão arquivada), medindo `box = max(0, col1 − 16 − free)` (os 16px
são o `padding-right` de `px-4` da célula), e parou no primeiro `X` aprovado: 47rem em Cursos e 51rem
em Usuarios, com margem de 24px e 27px. Esses valores fecham a régua, mas não são o teto. A revisão
da task interpolou os próprios pontos acima e achou o zero perto de 51rem e 56rem. As visões ativas do
bloco já ficam no teto (Cursos ativa e Alumnos com margem 2px, Emisión com 1px), então a arquivada
tem que seguir a mesma convenção.

A 2ª volta varreu cada visão em passos de 0.25rem, injetando `--table-narrow-floor` direto na
`<table>` pelo navegador. É o mesmo lugar onde o `narrowFloorTablePt` grava a variável. Fixture
arquivada, `390x844`, uma linha por visão. Critério: o maior `X` com `box 0` e margem (`free+16−col1`)
de pelo menos 1px.

```
Cursos (arquivada)                                Usuarios (arquivada)
X        table sticky col1 free box margem        X        table sticky col1 free box margem
47.00rem  752    75   193  201   0    24          51.00rem  816    82   183  194   0    27
47.25rem  756    76   194  200   0    22          51.25rem  820    82   184  194   0    26
47.50rem  760    76   195  200   0    21          51.50rem  824    82   185  194   0    25
47.75rem  764    76   196  200   0    20          51.75rem  828    83   186  193   0    23
48.00rem  768    77   197  199   0    18          52.00rem  832    83   187  193   0    22
48.25rem  772    77   198  199   0    17          52.25rem  836    84   187  192   0    21
48.50rem  776    78   199  198   0    15          52.50rem  840    84   188  192   0    20
48.75rem  780    78   200  198   0    14          52.75rem  844    84   189  192   0    19
49.00rem  784    78   201  198   0    13          53.00rem  848    85   190  191   0    17
49.25rem  788    79   202  197   0    11          53.25rem  852    85   191  191   0    16
49.50rem  792    79   203  197   0    10          53.50rem  856    86   192  190   0    14
49.75rem  796    80   204  196   0     8          53.75rem  860    86   193  190   0    13
50.00rem  800    80   205  196   0     7          54.00rem  864    86   194  190   0    12
50.25rem  804    80   206  196   0     6          54.25rem  868    87   195  189   0    10
50.50rem  808    81   207  195   0     4          54.50rem  872    87   196  189   0     9
50.75rem  812    81   208  195   0     3          54.75rem  876    88   196  188   0     8
51.00rem  816    82   209  194   0     1  <-      55.00rem  880    88   197  188   0     7
51.25rem  820    82   210  194   1     0          55.25rem  884    88   198  188   0     6
51.50rem  824    82   212  194   2    -2          55.50rem  888    89   199  187   0     4
51.75rem  828    83   213  193   3    -4          55.75rem  892    89   200  187   0     3
52.00rem  832    83   214  193   5    -5          56.00rem  896    90   201  186   0     1  <-
52.25rem  836    84   215  192   6    -7          56.25rem  900    90   202  186   0     0
52.50rem  840    84   216  192   8    -8          56.50rem  904    90   203  186   1    -1
52.75rem  844    84   217  192   9    -9          56.75rem  908    91   204  185   2    -3
53.00rem  848    85   218  191  11   -11          57.00rem  912    91   204  185   4    -3
53.25rem  852    85   219  191  12   -12          57.25rem  916    92   205  184   5    -5
53.50rem  856    86   220  190  13   -14          57.50rem  920    92   206  184   6    -6
53.75rem  860    86   221  190  15   -15          57.75rem  924    92   207  184   8    -7
54.00rem  864    86   222  190  16   -16
```

| Visão | `X` final | `table` | `sticky` | `col1` | `free` | `box` | margem |
|---|---|---|---|---|---|---|---|
| Cursos (arquivada) | **51.0rem** (1ª volta 47.0, fórmula 54.0) | 816px | 82px | 209 | 194 | 0 | 1px |
| Usuarios (arquivada) | **56.0rem** (1ª volta 51.0, fórmula 57.75) | 896px | 90px | 201 | 186 | 0 | 1px |

Mesmo no teto, nenhum dos dois alcança o `col1` da ativa: Cursos fica em 209 contra 218 e Usuarios em
201 contra 204. A varredura prova que não existe `X` que feche as duas pernas da régua nessas duas
tabelas. Todo passo com `col1` ≥ ao da ativa já tem `box > 0`, porque o `free` encolhe junto com a
presa. É o trade-off que a Preocupação #2 já previa como aceitável: arquivada menor que a ativa é só
cosmético, e o `free` nunca é invadido.

A 2ª rodada (`piso2.txt`, com 47/51rem, mesma fixture) já tinha fechado as 15 linhas `390x844` com
presa em `box 0`, e a 1024 idêntica a `meio.txt`. Na época, o `archive` repetido falhou ao recriar
`fixture.item23@lotus.cl`, que já estava arquivado. O erro foi inofensivo e não tocou
`fixture-ids.json`. A 3ª rodada confirma os valores finais com o código real
(`VPS=390x844,1024x768 PAGES=/cursos,/administracion`, fixture arquivada de novo):

- **As cinco linhas `390x844` fecham em `box 0`.** Cursos arquivada: 816px, `col1` 209, `free` 194.
  Usuarios arquivada: 896px, `col1` 201, `free` 186. As ativas de Cursos, Usuarios e Roles ficam como
  na 2ª rodada.
- **O `col1` arquivado fica ≥ ao ativo em 5 das 7 visões** (Clientes 191≥189, Presupuestos 92≥91,
  Turmas 53≥52, Matrícula 211≥210, Redactores 182≥180). Cursos (209<218) e Usuarios (201<204) ficam do
  lado cosmético, como mostrado acima.
- **As linhas `1024x768` são IDÊNTICAS a `meio.txt`** em `table`, `scroll` e `overlap`. O piso abaixo
  de `sm` não vaza para 1024 por construção: `sm:min-w-[42rem]` é uma classe literal, e o `X` não a
  parametriza.
- A fixture foi restaurada ao fim de cada rodada (`fixture-ids.json` ausente), e nenhum registro
  ficou arquivado.

## 6. Depois — `dcda46e3`

Medição read-only com o script do Apêndice A (conferido idêntico ao que rodou), offset +2 (SPA
`:5175`, API `:8082`), es-CL, tema claro, `admin@lotus.cl`. Turma medida: 1. As 7 visões de
arquivados foram medidas com a fixture da seção 2, na 4ª rodada: `fixture.cjs archive` às 00:22,
`OUT=depois.json node medir.cjs` com `medir exit 0`, e `fixture.cjs restore` às 00:26, com
`fixture-ids.json` ausente no fim. A saída bruta completa de `depois.txt` fica no fim desta seção.

Conferi a coluna "Régua" duas vezes. A primeira foi à mão, linha a linha. A segunda usou o
`regua.cjs` (Apêndice E), que lê `depois.json` e compara a 1440 com `antes.json`, coluna a coluna.
Ele só aceita `col1` arquivado menor que o ativo nas duas linhas da exceção do §5 Step 4, e só com
os números exatos dela: `col1` 209 com `free` 194, e `col1` 201 com `free` 186. Resultado:
`linhas 63, reprovações 0`.

### 1024x768 — piso de 42rem, sem rolagem nem sobreposição

| Tabela | Moldura | `scroll` | Tabela | Presa | Sobreposição | TRUNC | Régua |
|---|---|---|---|---|---|---|---|
| Dashboard painel 1 (Curso) | 718 | 749 | 718 | — | — | não | passa (`table` ≤ `frame`) |
| Dashboard painel 2 (Relator) | 718 | 747 | 718 | — | — | não | passa (`table` ≤ `frame`) |
| Clientes | 718 | 718 | 718 | 144 | 0 | não | passa |
| Clientes (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Presupuestos | 718 | 718 | 718 | 96 | 0 | não | passa |
| Presupuestos (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Turmas | 718 | 718 | 718 | 144 | 0 | não | passa |
| Turmas (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Matrícula (turma 1) | 718 | 718 | 718 | 144 | 0 | não | passa |
| Matrícula (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Cursos | 718 | 718 | 718 | 144 | 0 | não | passa |
| Cursos (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Emisión | 684 | 684 | 684 | 96 | 0 | não | passa |
| Historial | 718 | 718 | 718 | 144 | 0 | não | passa |
| Redactores | 718 | 718 | 718 | 192 | 0 | não | passa |
| Redactores (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Alumnos | 718 | 718 | 718 | 96 | 0 | não | passa |
| Alumnos → diálogo do alumno | 669 | 669 | 669 | — | 0 | não | passa |
| Usuarios | 718 | 718 | 718 | 144 | 0 | não | passa |
| Usuarios (arquivados) | 718 | 718 | 718 | 160 | 0 | não | passa |
| Roles y permisos | 718 | 718 | 718 | 96 | 0 | não | passa |

As 18 linhas com presa e o diálogo medem `scroll` = `frame`. Os dois painéis do Dashboard medem
`table` = `frame`, e o `scrollWidth` a mais deles é conteúdo (Observação 1). Sobreposição 0 e
nenhum `TRUNC` em todas. As 21 linhas são idênticas às de `meio.txt`, exceto Historial, que passou
de `rows 1` para `rows 2` (Observação 2). O piso estreito da Task 9 não vazou para 1024.

### 390x844 — caixa da 1ª coluna fora da presa

| Tabela | Piso (`table`) | Presa | `col1` | `free` | `box` | `text` | `col1` da ativa | Régua |
|---|---|---|---|---|---|---|---|---|
| Clientes | 672 (42rem) | 72 | 189 | 204 | 0 | 0 | — | passa |
| Clientes (arquivados) | 916 (57.25rem) | 92 | 191 | 184 | 0 | 0 | 189 | passa |
| Presupuestos | 672 (42rem) | 72 | 91 | 204 | 0 | 0 | — | passa |
| Presupuestos (arquivados) | 928 (58rem) | 93 | 92 | 183 | 0 | 0 | 91 | passa |
| Turmas | 672 (42rem) | 72 | 52 | 204 | 0 | 0 | — | passa |
| Turmas (arquivados) | 920 (57.5rem) | 92 | 53 | 184 | 0 | 0 | 52 | passa |
| Matrícula | 504 (31.5rem) | 72 | 210 | 204 | 0 | 0 | — | passa |
| Matrícula (arquivados) | 504 (31.5rem) | 72 | 211 | 204 | 0 | 0 | 210 | passa |
| Cursos | 632 (39.5rem) | 72 | 218 | 204 | 0 | 0 | — | passa |
| Cursos (arquivados) | 816 (51rem) | 82 | 209 | 194 | 0 | 0 | 218 | `box` 0: passa. `col1` 209 < 218: passa (exceção comprovada, §5 Step 4) |
| Emisión | 636 (39.75rem) | 72 | 185 | 170 | 0 | 0 | — | passa |
| Historial | 672 (42rem) | 72 | 62 | 204 | 0 | 0 | — | passa |
| Redactores | 672 (42rem) | 72 | 180 | 204 | 0 | 0 | — | passa |
| Redactores (arquivados) | 920 (57.5rem) | 92 | 182 | 184 | 0 | 0 | 180 | passa |
| Alumnos | 640 (40rem) | 72 | 218 | 204 | 0 | 0 | — | passa |
| Alumnos → diálogo do alumno | 323 (sem piso) | — | — | — | 0 | 0 | — | passa (sem presa) |
| Usuarios | 672 (42rem) | 72 | 204 | 204 | 0 | 0 | — | passa |
| Usuarios (arquivados) | 896 (56rem) | 90 | 201 | 186 | 0 | 0 | 204 | `box` 0: passa. `col1` 201 < 204: passa (exceção comprovada, §5 Step 4) |
| Roles y permisos | 444 (27.75rem) | 72 | 206 | 204 | 0 | 0 | — | passa |

Os dois painéis do Dashboard não têm presa: tabela de 672, com `scroll` 708 e 707 numa moldura de
276. A régua de 390 não se aplica a eles, porque não há presa para cobrir a 1ª coluna.

**As 18 linhas com presa fecham em `box 0`.** No "antes" (§3) eram 10 com `box > 0`, e no §4, 12
reprovando. O texto coberto também é 0 em todas, inclusive Roles, que no §4 tinha `text 0` com
`box 112`. Cada `table` medido bate com o piso que o código grava: os 11 `narrowFloorTablePt` da
Task 9 aparecem aqui em px, um a um. O `col1` arquivado fica ≥ ao da ativa em 5 das 7 visões:
Clientes 191≥189, Presupuestos 92≥91, Turmas 53≥52, Matrícula 211≥210 e Redactores 182≥180. As
outras duas são a exceção aceita, com os números exatos da varredura do §5 Step 4: Cursos 209/`free`
194 e Usuarios 201/`free` 186. Lá está provado que nenhum piso fecha as duas pernas nessas duas
tabelas.

#### Um controle por linha (390x844)

O `medir.cjs` não mede isto. A conferência usou o `umcontrole.cjs` (Apêndice D), read-only, em
390x844 e es-CL, na visão ativa de cada tabela com 2 ou mais ações. Para cada linha de dado, o
script:

- acha a célula presa (`position: sticky`);
- conta os controles visíveis nela (`button`, `a[href]`, `[role=button]`, `input` e `select` com
  `offsetParent`), e a linha passa com exatamente 1;
- registra o ícone, o `aria-label` e o `aria-haspopup` desse controle.

Depois, abre o menu da 1ª linha, sem clicar em nenhum item, e lista o que colapsou nele. O `Escape`
fecha o menu. O script rodou depois do `restore` da 4ª rodada. Por isso as visões ativas têm 1 linha
a mais que no `depois.txt`: o registro da fixture voltou para a visão ativa.

| Tabela | Linhas | Controle na presa, em cada linha | Menu da 1ª linha | Régua |
|---|---|---|---|---|
| Clientes | 4 | 1: `pi-ellipsis-v` "Más acciones", `aria-haspopup` | Archivar, Ver | passa |
| Turmas | 4 | idem | Archivar, Ver | passa |
| Matrícula (turma 1) | 10 | idem | Registrar resultado, Quitar | passa |
| Cursos | 3 | idem | Archivar, Ver | passa |
| Historial | 2 (`LOT-2026-1000` e `LOT-2026-1001`, as duas Vigente) | idem | Ver, Revocar | passa |
| Redactores | 7 | idem | Reenviar invitación, Archivar, Ver | passa |
| Usuarios | 2 | idem | Archivar, Ver | passa |

São 32 linhas, todas com um `⋮` só, e o script terminou em `tudo OK`. O Historial foi conferido com
dado real: o banco de dev tem 2 certificados vigentes, e os dois mostram o `⋮` com "Ver" e "Revocar"
dentro. O banco de dev não tem certificado revocado, que teria Ver + Reemitir. Esse ramo fica coberto
pelo `HistorialTableRowActions.test.tsx` ("revocado com permissão: reemitir aparece, revogar não"),
e o colapso de 2 ações passa pelo mesmo `RowActions` que as linhas vigentes provaram aqui.

<details>
<summary>Saída bruta de <code>umcontrole.txt</code> (<code>node umcontrole.cjs</code>)</summary>

```
OK     Clientes | SS | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Clientes | TR | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Clientes | ED | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Clientes | CG | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Clientes: 4 linha(s) | menu da 1ª linha: [Archivar, Ver]
OK     Turmas | Scap 6 - Cot 1 [En curso] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Turmas | Scap 5 - Cot 1 [Concluida] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Turmas | Scap 4 - Cot 1 [Habilitada] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Turmas | Scap 3 - Cot 1 [En curso] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Turmas: 4 linha(s) | menu da 1ª linha: [Archivar, Ver]
OK     Matrícula | CA | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | MB | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | VC | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | SD | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | JE | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | DF | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | AG | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | CH | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | FI | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Matrícula | NJ | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Matrícula: 10 linha(s) | menu da 1ª linha: [Registrar resultado, Quitar]
OK     Cursos | Trabajos en líneas energizad | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Cursos | Seguridad en alta tensión | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Cursos | Mantenimiento de subestacion | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Cursos: 3 linha(s) | menu da 1ª linha: [Archivar, Ver]
OK     Historial | LOT-2026-1001 [Vigente] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Historial | LOT-2026-1000 [Vigente] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Historial: 2 linha(s) | menu da 1ª linha: [Ver, Revocar]
OK     Redactores | JM | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | PS | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | AR | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | CF | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | MR | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | RV | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Redactores | IP | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Redactores: 7 linha(s) | menu da 1ª linha: [Reenviar invitación, Archivar, Ver]
OK     Usuarios | AL [Activo] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
OK     Usuarios | F2 [Activo] | presa 72 | 1 controle(s): pi-ellipsis-v "Más acciones" haspopup
       Usuarios: 2 linha(s) | menu da 1ª linha: [Archivar, Ver]
tudo OK
```

</details>

### 1440x900 — sem regressão

| Tabela | Moldura | `scroll` | Sobreposição | Colunas de dado contra `antes.txt` | Régua |
|---|---|---|---|---|---|
| Dashboard painel 1 / 2 | 1134 | 1134 | 0 | iguais | passa |
| Clientes / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Presupuestos / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Turmas / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Matrícula / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Cursos / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Emisión | 1100 | 1100 | 0 | mais largas: presa 128 → 110, NOMBRE 318 → 324, NOTA FINAL e ASISTENCIA 124 → 126, ESTADO ACAD. 177 → 180, CERTIFICADO 230 → 234 | passa |
| Historial | 1134 | 1134 | 0 | mais largas: presa 256 → 144, CÓDIGO 91 → 103, ALUMNO 205 → 231, CURSO 240 → 270, FECHA EMISIÓN, VIGENCIA HASTA e ESTADO 114 → 129 | passa |
| Redactores / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Alumnos / diálogo do alumno | 1134 / 960 | 1134 / 960 | 0 | iguais | passa |
| Usuarios / (arq.) | 1134 | 1134 | 0 | iguais | passa |
| Roles y permisos | 1134 | 1134 | 0 | iguais | passa |

Nenhuma coluna de dado ficou mais estreita que no "antes". Só mudaram as colunas da Emisión e do
Historial, e as duas para mais: ganharam a largura que a presa menor devolveu. No resto, a única
diferença de texto contra `antes.txt` é o `min-width` (768px → 672px), um piso que em 1440 não age.
As 21 linhas são idênticas às de `meio.txt`, exceto Historial (`rows 2`).

### Diálogo do alumno

O `scroll` mede 669, 323 e 960 em 1024, 390 e 1440. É igual ao "antes" nos três (régua: ≤), então
passa. A tabela do diálogo não tem presa e não tem piso (`min-width` 0px), e a régua dela se reduz
a isso. Ela segue com `rows 0`, como no §3 e no §4, porque o 1º alumno da lista não tem certificado.

### Observações

1. **O transbordo de conteúdo do Dashboard persiste.** Em 1024, o `scrollWidth` dos dois painéis é
   749 e 747 sobre moldura e tabela de 718: sobram 31 e 29px. No "antes" eram 25 e 21px sobre 768.
   Em 390, 708 e 707 sobre 672. A régua do Dashboard é `table` ≤ `frame`, e passa. Mas o spec §1
   diz deste transbordo: "Se ele persistir depois do piso novo, vira ficha nova e não se corrige
   aqui". Ele persistiu. A ficha fica para o fechamento do bloco, porque este passo só escreve o
   audit.
2. **O Historial tem agora 2 linhas.** O "antes" e o "meio" mediram `rows 1`. O banco de dev ganhou o
   `LOT-2026-1001`, vigente, criado em 27/09 às 23:58 (-03), durante a Task 9. Não veio da fixture,
   que não emite certificado, nem deste passo. A régua passa com as duas linhas (`box` 0, `col1` 62
   em 390), e elas deram ao `⋮` do Historial um caso real de 2 ações.

### Gates (Step 5)

Rodados sobre `dcda46e3`, antes do commit deste audit, que só toca este arquivo.

```
$ cd frontend && pnpm lint
$ eslint .
(exit 0 — 0 problemas)

$ pnpm build
✓ 1091 modules transformed.
(!) Some chunks are larger than 500 kB after minification.   ← aviso pré-existente
✓ built in 1.72s
(exit 0)

$ pnpm test
 Test Files  158 passed (158)
      Tests  987 passed (987)
(exit 0)

$ git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts; echo "diff exit $?"
diff exit 0
(sem linhas: `pint` e `typescript:transform` ficam N/A por escopo provado)

$ git diff main...HEAD --name-only | grep -v '^frontend/\|^docs/superpowers/' ; echo "fora do escopo exit $?"
fora do escopo exit 1
(sem linhas)
```

<details>
<summary>Saída bruta de <code>depois.txt</code> (126 linhas, <code>OUT=depois.json node medir.cjs</code>, fixture da seção 2 ativa nas 7 linhas <code>ARCH</code>)</summary>

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
1024x768 /certificados [Historial] | frame 718 scroll 718 table 718 (672px) sticky 144 overlap 0 col1 60 free 574 box 0 text 0 rows 2
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
390x844 /comercial [Clientes] ARCH | frame 276 scroll 916 table 916 (916px) sticky 92 overlap 85 on "RUT" col1 191 free 184 box 0 text 0 rows 1
    RAZÓN SOCIAL:191 | RUT:95 | TIPO:106 | COMUNA:138 | CONTACTOS:74 | ARCHIVADO EL:92 | ARCHIVADO POR:128 | ·:92
390x844 /comercial [Presupuestos] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CLIENTE" col1 91 free 204 box 0 text 0 rows 5
    CÓDIGO:91 | CLIENTE:204 | COTIZACIONES:79 | VALOR TOTAL:113 | ESTADO:113 | ·:72
390x844 /comercial [Presupuestos] ARCH | frame 276 scroll 928 table 928 (928px) sticky 93 overlap 93 on "CLIENTE" col1 92 free 183 box 0 text 0 rows 1
    CÓDIGO:92 | CLIENTE:208 | COTIZACIONES:81 | VALOR TOTAL:116 | ESTADO:116 | ARCHIVADO EL:93 | ARCHIVADO POR:130 | ·:93
390x844 /operacion [] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CLIENTE" col1 52 free 204 box 0 text 0 rows 3
    CÓDIGO:52 | CURSO:137 | CLIENTE:117 | MODALIDAD:65 | REDACTOR:117 | ALUMNOS:46 | ESTADO:65 | ·:72
390x844 /operacion [] ARCH | frame 276 scroll 920 table 920 (920px) sticky 92 overlap 85 on "CLIENTE" col1 53 free 184 box 0 text 0 rows 1
    CÓDIGO:53 | CURSO:139 | CLIENTE:119 | MODALIDAD:66 | REDACTOR:119 | ALUMNOS:46 | ESTADO:66 | ARCHIVADO EL:92 | ARCHIVADO POR:129 | ·:92
390x844 /operacion/turmas/1 [Alumnos] | frame 276 scroll 504 table 504 (504px) sticky 72 overlap 66 on "RUT" col1 210 free 204 box 0 text 0 rows 10
    NOMBRE:210 | RUT:105 | ESTADO MATRÍCULA:117 | ·:72
390x844 /operacion/turmas/1 [Alumnos] ARCH | frame 276 scroll 504 table 504 (504px) sticky 72 overlap 65 on "RUT" col1 211 free 204 box 0 text 0 rows 1
    NOMBRE:211 | RUT:106 | ARCHIVADO EL:48 | ARCHIVADO POR:67 | ·:72
390x844 /cursos [] | frame 276 scroll 632 table 632 (632px) sticky 72 overlap 58 on "NOMBRE TÉCNICO" col1 218 free 204 box 0 text 0 rows 2
    NOMBRE:218 | NOMBRE TÉCNICO:135 | CARGA HORARIA (H):73 | REDACTORES:135 | ·:72
390x844 /cursos [] ARCH | frame 276 scroll 816 table 816 (816px) sticky 82 overlap 67 on "NOMBRE TÉCNICO" col1 209 free 194 box 0 text 0 rows 1
    NOMBRE:209 | NOMBRE TÉCNICO:130 | CARGA HORARIA (H):70 | REDACTORES:130 | ARCHIVADO EL:82 | ARCHIVADO POR:114 | ·:82
390x844 /certificados [Emisión] | frame 242 scroll 636 table 636 (636px) sticky 72 overlap 57 on "NOTA FINAL" col1 185 free 170 box 0 text 0 rows 10
    NOMBRE:185 | NOTA FINAL:72 | ASISTENCIA:72 | ESTADO ACAD.:103 | CERTIFICADO:133 | ·:72
390x844 /certificados [Historial] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "CURSO" col1 62 free 204 box 0 text 0 rows 2
    CÓDIGO:62 | ALUMNO:140 | CURSO:164 | FECHA EMISIÓN:78 | VIGENCIA HASTA:78 | ESTADO:78 | ·:72
390x844 /personas [Redactores] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "RUT" col1 180 free 204 box 0 text 0 rows 6
    NOMBRE COMPLETO:180 | RUT:130 | CURSOS HABILITADOS:70 | IDONEIDAD:100 | ÚLTIMO ACCESO:120 | ·:72
390x844 /personas [Redactores] ARCH | frame 276 scroll 920 table 920 (920px) sticky 92 overlap 92 on "RUT" col1 182 free 184 box 0 text 0 rows 1
    NOMBRE COMPLETO:182 | RUT:132 | CURSOS HABILITADOS:71 | IDONEIDAD:101 | ÚLTIMO ACCESO:121 | ARCHIVADO EL:92 | ARCHIVADO POR:129 | ·:92
390x844 /personas [Alumnos] | frame 276 scroll 640 table 640 (640px) sticky 72 overlap 58 on "RUT" col1 218 free 204 box 0 text 0 rows 10
    NOMBRE COMPLETO:218 | RUT:109 | CLIENTE ACTUAL:157 | TURMAS:85 | ·:72
390x844 /personas [Alumnos] DIALOGO (dialogo) | frame 323 scroll 323 table 323 (0px) sticky null overlap 0 col1 null free null box 0 text 0 rows 0
    Código:0 | Curso:0 | Fecha:0 | Estado:0 | Certificado:0
390x844 /administracion [Usuarios] | frame 276 scroll 672 table 672 (672px) sticky 72 overlap 72 on "ROL" col1 204 free 204 box 0 text 0 rows 1
    NOMBRE:204 | ROL:147 | ESTADO:113 | ÚLTIMO ACCESO:136 | ·:72
390x844 /administracion [Usuarios] ARCH | frame 276 scroll 896 table 896 (896px) sticky 90 overlap 75 on "ROL" col1 201 free 186 box 0 text 0 rows 1
    NOMBRE:201 | ROL:145 | ESTADO:112 | ÚLTIMO ACCESO:134 | ARCHIVADO EL:90 | ARCHIVADO POR:125 | ·:90
390x844 /administracion [Roles y permisos] | frame 276 scroll 444 table 444 (444px) sticky 72 overlap 70 on "TIPO" col1 206 free 204 box 0 text 0 rows 3
    NOMBRE:206 | TIPO:98 | PERMISOS:69 | ·:72
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
1440x900 /certificados [Historial] | frame 1134 scroll 1134 table 1134 (672px) sticky 144 overlap 0 col1 103 free 990 box 0 text 0 rows 2
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

## 7. Timestamp no navegador

O `timestamp.cjs` (Apêndice C) roda em 1440x900, nos 3 idiomas × 2 temas. Em `/administracion` e
`/personas`, lê cada `<time>` da página: a hora, a data, a cor computada dos dois ícones e o
`aria-hidden` deles. Cada leitura passa se a hora e a data casam com a máscara do idioma, os dois
ícones medem `rgb(37, 165, 228)` (a `--primary-color`, `#25a5e4`) e os dois têm `aria-hidden`. O
script também conta os `<time>` em célula e as células com travessão. Em es-CL, recorta as capturas
do cabeçalho e da 1ª célula com `<time>`.

**Desvio do script.** O texto do brief faz um login por contexto: 6 logins em menos de um minuto. O
login é limitado a 5 por minuto por `email|ip` (`RateLimits::LOGIN`, `backend/app/Shared/RateLimiting/RateLimits.php`).
Na 1ª rodada, os 5 primeiros pares passaram, e o 6º (en/dark) tomou 429 e ficou em `/login`
(`page.waitForURL: Timeout 15000ms exceeded`). O script que valeu entra uma vez e passa só os
cookies da sessão aos outros 5 contextos. Idioma e tema continuam vindo do `addInitScript`, que roda
antes do SPA em toda carga.

Acrescentei também uma prova de que o tema pedido entrou. A cor dos ícones é a mesma nos dois temas
por desenho, então sozinha não distingue claro de escuro. Por isso cada página registra `html.dark`
(ligado pelo `useApplyTheme`) e o `lang` do `<html>`, e conta falha se o tema divergir. Nos 12
registros, o tema e o idioma bateram com o par pedido.

**Resultado: `tudo OK`.** Hora e data casaram com a máscara nos 6 pares, e os dois ícones
mediram a primária com `aria hidden` em todas as leituras. O relógio do cabeçalho aparece nas duas
páginas, e a célula do admin em Usuarios também.

| Idioma | Hora | Data | Exemplo (cabeçalho · célula de Redactores) |
|---|---|---|---|
| es-CL | 24h | `dd-mm-aaaa` | `00:30 · 28-09-2026` · `15:15 · 19-08-2026` |
| pt-BR | 24h | `dd/mm/aaaa` | `00:31 · 28/09/2026` · `15:15 · 19/08/2026` |
| en | 12h com AM/PM | `m/d/aaaa` | `12:31 AM · 9/28/2026` · `03:15 PM · 8/19/2026` |

Esses são os ciclos que o João decidiu em 2026-09-27 (`h23` em es-CL e pt-BR, `h12` em en).

**Células.** Usuarios tem 1 `<time>` em célula, o admin, e 1 travessão: o
`fixture.item23@lotus.cl` nunca entrou (`last_login: null`). Redactores tem 2 `<time>`, os dois
redatores com `last_login`, e 5 travessões. A coluna fica provada no navegador nas duas tabelas,
não só pelo teste de unidade da Task 3.

**Capturas.** Os 6 PNG estão no scratchpad da sessão
(`/tmp/claude-1000/-home-jvbat-projetos-fix-frontend/9b6388eb-a992-40cb-8b76-e86315f4d9ce/scratchpad/`):
`timestamp-cabecalho-light.png`, `timestamp-cabecalho-dark.png`,
`timestamp-administracion-light.png`, `timestamp-administracion-dark.png`,
`timestamp-personas-light.png` e `timestamp-personas-dark.png`. Cada um tem cerca de 109x36px, e
foram lidos também ampliados 5x (`zoom-timestamp.png`). O que se vê neles:

- **Cabeçalho, claro e escuro:** fundo navy nos dois temas. O relógio e o calendário ficam azuis e
  empilhados numa coluna própria, à esquerda. A hora (`00:30` / `00:31`) fica em cima, em branco e
  negrito. A data (`28-09-2026`) fica embaixo, em branco mais apagado (`opacity-75`). As duas linhas
  de texto começam na mesma borda esquerda.
- **Célula de Usuarios, claro:** fundo branco, ícones azuis, hora `00:30` em slate escuro negrito e
  data `28-09-2026` em slate apagado, na mesma grade.
- **Célula de Usuarios, escuro:** fundo slate escuro, ícones no mesmo azul, hora em branco negrito e
  data em branco apagado.
- **Célula de Redactores, claro e escuro:** `15:15` sobre `19-08-2026`, com o mesmo arranjo e as
  mesmas cores de cada tema.

Nas 6 capturas, os dois ícones ficam alinhados em coluna, com a hora em cima e a data embaixo. O
texto é branco no cabeçalho e herda a cor da célula na tabela.

<details>
<summary>Saída bruta de <code>timestamp.txt</code> (<code>node timestamp.cjs | tee timestamp.txt</code>, a rodada que valeu)</summary>

```
       es-CL light /administracion: html.dark false, html lang es-CL
OK     es-CL light /administracion cabecalho: 00:30 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL light /administracion tabela: 00:30 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       es-CL light /administracion: 1 <time> em célula, 1 célula(s) com travessão
       es-CL light /personas: html.dark false, html lang es-CL
OK     es-CL light /personas cabecalho: 00:30 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL light /personas tabela: 15:15 | 19-08-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL light /personas tabela: 10:55 | 19-08-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       es-CL light /personas: 2 <time> em célula, 5 célula(s) com travessão
       es-CL dark /administracion: html.dark true, html lang es-CL
OK     es-CL dark /administracion cabecalho: 00:31 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL dark /administracion tabela: 00:30 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       es-CL dark /administracion: 1 <time> em célula, 1 célula(s) com travessão
       es-CL dark /personas: html.dark true, html lang es-CL
OK     es-CL dark /personas cabecalho: 00:31 | 28-09-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL dark /personas tabela: 15:15 | 19-08-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     es-CL dark /personas tabela: 10:55 | 19-08-2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       es-CL dark /personas: 2 <time> em célula, 5 célula(s) com travessão
       pt-BR light /administracion: html.dark false, html lang pt-BR
OK     pt-BR light /administracion cabecalho: 00:31 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR light /administracion tabela: 00:30 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       pt-BR light /administracion: 1 <time> em célula, 1 célula(s) com travessão
       pt-BR light /personas: html.dark false, html lang pt-BR
OK     pt-BR light /personas cabecalho: 00:31 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR light /personas tabela: 15:15 | 19/08/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR light /personas tabela: 10:55 | 19/08/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       pt-BR light /personas: 2 <time> em célula, 5 célula(s) com travessão
       pt-BR dark /administracion: html.dark true, html lang pt-BR
OK     pt-BR dark /administracion cabecalho: 00:31 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR dark /administracion tabela: 00:30 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       pt-BR dark /administracion: 1 <time> em célula, 1 célula(s) com travessão
       pt-BR dark /personas: html.dark true, html lang pt-BR
OK     pt-BR dark /personas cabecalho: 00:31 | 28/09/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR dark /personas tabela: 15:15 | 19/08/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     pt-BR dark /personas tabela: 10:55 | 19/08/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       pt-BR dark /personas: 2 <time> em célula, 5 célula(s) com travessão
       en light /administracion: html.dark false, html lang en
OK     en light /administracion cabecalho: 12:31 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en light /administracion tabela: 12:30 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       en light /administracion: 1 <time> em célula, 1 célula(s) com travessão
       en light /personas: html.dark false, html lang en
OK     en light /personas cabecalho: 12:31 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en light /personas tabela: 03:15 PM | 8/19/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en light /personas tabela: 10:55 AM | 8/19/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       en light /personas: 2 <time> em célula, 5 célula(s) com travessão
       en dark /administracion: html.dark true, html lang en
OK     en dark /administracion cabecalho: 12:31 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en dark /administracion tabela: 12:30 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       en dark /administracion: 1 <time> em célula, 1 célula(s) com travessão
       en dark /personas: html.dark true, html lang en
OK     en dark /personas cabecalho: 12:31 AM | 9/28/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en dark /personas tabela: 03:15 PM | 8/19/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
OK     en dark /personas tabela: 10:55 AM | 8/19/2026 | rgb(37, 165, 228) rgb(37, 165, 228) | aria true,true
       en dark /personas: 2 <time> em célula, 5 célula(s) com travessão
tudo OK
```

</details>

## 8. Veredito da direção (a)

A `D-65` pedia medir um sinal de rolagem no invólucro. **Não se implementa.** Em 1024x768, o piso
de 42rem zera a rolagem que vinha do piso em toda tabela. Na seção 6, `scroll` = `frame` nas 12
consumidoras com presa (as 18 linhas, com as visões de arquivados) e no diálogo do alumno. Nos dois
painéis do Dashboard, `table` = `frame`, e o transbordo de 29–31px deles é conteúdo e fica fora do
bloco (Observação 1). Então não sobra rolagem a anunciar. Em 390x844, o invólucro já se anuncia pelas
sombras da UI-10 (`background-attachment: local/scroll`, `AppDataTable/style.ts`), e a coluna presa
tem sombra própria permanente. A 1ª coluna, agora fora da presa (seção 6, `box 0`), deixa à vista
que a linha continua. Fecha a direção (a) da `D-65` no `/fechar-sprint`.

## Apêndice A — `medir.cjs`

Texto idêntico ao do brief (Step 2), sem alteração. Conferido de novo na Task 10: idêntico ao
`medir.cjs` do scratchpad que produziu o `depois.txt` da seção 6.

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
Conferido de novo na Task 10: idêntico ao `fixture.cjs` do scratchpad que rodou as quatro rodadas.

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

## Apêndice C — `timestamp.cjs`

Texto do brief (Step 2) **com** os dois desvios da seção 7: um login só, com os cookies
repassados aos outros contextos, e a leitura de `html.dark` e do `lang` do `<html>`. É o texto que
produziu o `timestamp.txt` da seção 7.

```js
// timestamp.cjs — o Timestamp no navegador: máscara por idioma e cor dos ícones
// nos dois temas (item 23, spec §6.2).
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const BASE = process.env.BASE || 'http://localhost:5175'
const OUT = process.env.OUTDIR || __dirname
const PRIMARIA = 'rgb(37, 165, 228)'
const DATA = { 'es-CL': /^\d{2}-\d{2}-\d{4}$/, 'pt-BR': /^\d{2}\/\d{2}\/\d{4}$/, en: /^\d{1,2}\/\d{1,2}\/\d{4}$/ }
const HORA = { 'es-CL': /^\d{2}:\d{2}$/, 'pt-BR': /^\d{2}:\d{2}$/, en: /^\d{2}:\d{2}\s[AP]M$/ }

;(async () => {
  const browser = await chromium.launch()
  let falhas = 0
  // DESVIO do brief: o login é limitado a 5 por minuto por `email|ip`
  // (`RateLimits::LOGIN`), e 3 idiomas × 2 temas pediam 6 logins em menos de um
  // minuto — o 6º (en/dark) tomou 429 e ficou em /login. Entra-se UMA vez; os
  // outros contextos herdam só os cookies da sessão. Idioma e tema continuam
  // vindo do addInitScript, que roda antes do SPA em toda carga.
  let cookies = null
  for (const lang of Object.keys(DATA)) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ...(cookies ? { storageState: { cookies, origins: [] } } : {}),
      })
      await ctx.addInitScript(
        ({ lang, theme }) => {
          localStorage.setItem('lotus-lang', lang)
          localStorage.setItem('lotus-ui', JSON.stringify({ state: { theme }, version: 0 }))
        },
        { lang, theme },
      )
      const page = await ctx.newPage()
      if (!cookies) {
        await page.goto(`${BASE}/login`)
        await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
        await page.fill('input[type=password]', 'senha123')
        await page.keyboard.press('Enter')
        await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
        cookies = (await ctx.storageState()).cookies
      }
      for (const path of ['/administracion', '/personas']) {
        await page.goto(`${BASE}${path}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1200)
        if (new URL(page.url()).pathname !== path) throw new Error(`${lang} ${theme}: esperava ${path}, ficou em ${page.url()}`)
        // Acréscimo: a cor dos ícones é a mesma nos dois temas por desenho, então
        // ela sozinha não prova que o tema escuro entrou. `useApplyTheme` liga
        // `html.dark`; o idioma ativo sai do `lang` do <html>.
        const html = await page.evaluate(() => ({
          dark: document.documentElement.classList.contains('dark'),
          lang: document.documentElement.lang,
        }))
        if (html.dark !== (theme === 'dark')) falhas++
        console.log(`       ${lang} ${theme} ${path}: html.dark ${html.dark}, html lang ${html.lang}`)
        const achados = await page.evaluate(() =>
          [...document.querySelectorAll('time')].map((t) => ({
            onde: t.closest('header') ? 'cabecalho' : t.closest('td') ? 'tabela' : 'outro',
            hora: t.children[1]?.textContent,
            data: t.children[3]?.textContent,
            icone1: getComputedStyle(t.children[0]).color,
            icone2: getComputedStyle(t.children[2]).color,
            aria: [t.children[0].getAttribute('aria-hidden'), t.children[2].getAttribute('aria-hidden')].join(','),
          })),
        )
        const tracos = await page.evaluate(
          () => [...document.querySelectorAll('td')].filter((td) => td.textContent.trim() === '—').length,
        )
        for (const a of achados) {
          const ok =
            HORA[lang].test(a.hora) &&
            DATA[lang].test(a.data) &&
            a.icone1 === PRIMARIA &&
            a.icone2 === PRIMARIA &&
            a.aria === 'true,true'
          if (!ok) falhas++
          console.log(`${ok ? 'OK    ' : 'FALHA '} ${lang} ${theme} ${path} ${a.onde}: ${a.hora} | ${a.data} | ${a.icone1} ${a.icone2} | aria ${a.aria}`)
        }
        console.log(`       ${lang} ${theme} ${path}: ${achados.filter((a) => a.onde === 'tabela').length} <time> em célula, ${tracos} célula(s) com travessão`)
        if (lang === 'es-CL') {
          await page.locator('header time').first().screenshot({ path: `${OUT}/timestamp-cabecalho-${theme}.png` })
          const celula = page.locator('td time').first()
          if (await celula.count()) await celula.screenshot({ path: `${OUT}/timestamp-${path.slice(1)}-${theme}.png` })
        }
      }
      await ctx.close()
    }
  }
  await browser.close()
  console.log(falhas ? `${falhas} FALHA(S)` : 'tudo OK')
  process.exit(falhas ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

## Apêndice D — `umcontrole.cjs`

Script próprio da Task 10 para a conferência "um controle por linha" em 390x844 (seção 6). É
read-only: abre o menu da 1ª linha para listar os itens, mas não clica em nenhum.

```js
// umcontrole.cjs — "um controle por linha" em 390x844 (régua do item 23, spec §3).
// Read-only: conta os controles visíveis na célula presa de CADA linha de dado e
// abre (sem clicar item nenhum) o menu da 1ª linha para listar o que colapsou nele.
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const BASE = process.env.BASE || 'http://localhost:5175'
const VISOES = [
  { nome: 'Clientes', path: '/comercial', tab: /^Clientes$/ },
  { nome: 'Turmas', path: '/operacion' },
  { nome: 'Matrícula', path: '/operacion/turmas/1', tab: /^Alumnos/ },
  { nome: 'Cursos', path: '/cursos' },
  { nome: 'Historial', path: '/certificados', tab: /^Historial/ },
  { nome: 'Redactores', path: '/personas', tab: /^Redactores/ },
  { nome: 'Usuarios', path: '/administracion', tab: /^Usuarios/ },
]

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL' })
  await ctx.addInitScript(() => localStorage.setItem('lotus-lang', 'es-CL'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
  await page.fill('input[type=password]', 'senha123')
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  let falhas = 0
  for (const v of VISOES) {
    await page.goto(`${BASE}${v.path}`)
    await page.waitForLoadState('networkidle')
    if (v.tab) {
      await page.getByRole('tab', { name: v.tab }).first().click()
      await page.waitForLoadState('networkidle')
    }
    await page.waitForTimeout(1800)
    const linhas = await page.evaluate(() => {
      const w = [...document.querySelectorAll('.p-datatable-wrapper')].find((x) => x.offsetParent)
      const table = w.querySelector('table')
      const ths = [...table.querySelectorAll('thead th')]
      const estadoIdx = ths.findIndex((th) => /^ESTADO$/i.test(th.innerText.trim()))
      return [...table.querySelectorAll('tbody tr')]
        .filter((tr) => tr.children.length === ths.length)
        .map((tr) => {
          const presa = [...tr.children].find((c) => getComputedStyle(c).position === 'sticky')
          const controles = presa
            ? [...presa.querySelectorAll('button, a[href], [role=button], input, select')].filter(
                (b) => b.offsetParent !== null && getComputedStyle(b).visibility !== 'hidden',
              )
            : []
          return {
            linha: tr.children[0].innerText.trim().split('\n')[0].slice(0, 28),
            estado: estadoIdx >= 0 ? tr.children[estadoIdx].innerText.trim() : null,
            presa: presa ? Math.round(presa.getBoundingClientRect().width) : null,
            controles: controles.map((b) => ({
              aria: b.getAttribute('aria-label'),
              popup: b.getAttribute('aria-haspopup'),
              icone: b.querySelector('.p-button-icon')?.className.match(/pi-[\w-]+/g)?.pop() ?? null,
            })),
          }
        })
    })
    let resumoMenu = ''
    const gatilho = page.locator('tbody').getByRole('button', { name: 'Más acciones' }).first()
    if (await gatilho.count()) {
      await gatilho.click()
      await page.waitForTimeout(400)
      const itens = await page.evaluate(() =>
        [...document.querySelectorAll('.p-menu .p-menuitem')]
          .filter((i) => i.offsetParent)
          .map((i) => i.innerText.trim()),
      )
      resumoMenu = ` | menu da 1ª linha: [${itens.join(', ')}]`
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    for (const l of linhas) {
      const umSo = l.controles.length === 1
      const eMenu = umSo && l.controles[0].icone === 'pi-ellipsis-v' && l.controles[0].popup === 'true'
      // Uma ação só (Historial fora de vigente/por vencer/revocado) não abre menu:
      // um botão solto também é "um controle".
      const ok = umSo
      if (!ok) falhas++
      const c = l.controles.map((x) => `${x.icone}${x.aria ? ` "${x.aria}"` : ''}${x.popup ? ' haspopup' : ''}`)
      console.log(
        `${ok ? 'OK    ' : 'FALHA '} ${v.nome} | ${l.linha}${l.estado ? ` [${l.estado}]` : ''} | presa ${l.presa} | ` +
          `${l.controles.length} controle(s): ${c.join(', ')}${eMenu ? '' : umSo ? ' (ação única, sem menu)' : ''}`,
      )
    }
    console.log(`       ${v.nome}: ${linhas.length} linha(s)${resumoMenu}`)
  }
  await browser.close()
  console.log(falhas ? `${falhas} FALHA(S)` : 'tudo OK')
  process.exit(falhas ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

## Apêndice E — `regua.cjs`

Script próprio da Task 10, que confere `depois.json` contra a régua (spec §3) e compara a 1440 com
`antes.json` (seção 6). A exceção do §5 Step 4 entra com os números exatos, e qualquer outro
`col1` arquivado menor que o ativo reprova.

```js
// regua.cjs — confere depois.json contra a régua do item 23 e contra antes.json (1440).
const fs = require('fs')
const d = JSON.parse(fs.readFileSync('depois.json', 'utf8'))
const a = JSON.parse(fs.readFileSync('antes.json', 'utf8'))
const key = (r, i) => `${r.label}${r.inDialog ? ' D' : ''}#${i}`
const idx = (arr) => { const m = {}; const c = {}; arr.forEach((r) => { const k = r.label + (r.inDialog ? ' D' : ''); c[k] = (c[k] || 0) + 1; m[`${k}#${c[k]}`] = r }); return m }
const A = idx(a), D = idx(d)
const EXC = { '/cursos []': [209, 194], '/administracion [Usuarios]': [201, 186] }
let falhas = 0
const out = []
for (const [k, r] of Object.entries(D)) {
  const vp = r.label.split(' ')[0]
  const view = r.label.slice(vp.length + 1).replace(/ ARCH$/, '').replace(/ DIALOGO$/, '')
  const isArch = / ARCH$/.test(r.label)
  const isDash = / \/ \[\]/.test(' ' + r.label.slice(vp.length))
  const msgs = []
  if (vp === '1024x768') {
    if (isDash) { if (r.table > r.frame) msgs.push(`dash table ${r.table} > frame ${r.frame}`) }
    else if (r.scrollW !== r.frame) msgs.push(`scroll ${r.scrollW} != frame ${r.frame}`)
    if (r.overlap !== 0) msgs.push(`overlap ${r.overlap}`)
    if (r.truncHeaders.length) msgs.push(`TRUNC ${r.truncHeaders}`)
  }
  if (vp === '390x844' && r.stickyW !== null) {
    if (r.firstBoxCovered !== 0) msgs.push(`box ${r.firstBoxCovered}`)
    if (isArch) {
      const ativa = d.find((x) => x.label === r.label.replace(/ ARCH$/, '') && !x.inDialog)
      if (r.firstColW < ativa.firstColW) {
        const e = EXC[view]
        if (e && e[0] === r.firstColW && e[1] === r.free) msgs.push(`EXCECAO col1 ${r.firstColW}<${ativa.firstColW} (free ${r.free})`)
        else msgs.push(`col1 ${r.firstColW} < ativa ${ativa.firstColW}`)
      }
    }
  }
  if (vp === '1440x900') {
    if (r.scrollW !== r.frame) msgs.push(`scroll ${r.scrollW} != frame ${r.frame}`)
    if (r.overlap !== 0) msgs.push(`overlap ${r.overlap}`)
    const b = A[k]
    if (!b) msgs.push('sem par em antes')
    else {
      const hd = r.headers.split(' | ').map((h) => h.split(':')), hb = b.headers.split(' | ').map((h) => h.split(':'))
      hd.forEach(([n, w], i) => { if (n === '·') return; const wb = hb[i] && hb[i][0] === n ? +hb[i][1] : null; if (wb === null) msgs.push(`col ${n} sem par`); else if (+w < wb) msgs.push(`col ${n} ${w} < antes ${wb}`) })
    }
  }
  if (r.inDialog) { const b = A[k]; if (r.scrollW > b.scrollW) msgs.push(`dialogo scroll ${r.scrollW} > antes ${b.scrollW}`) }
  const real = msgs.filter((m) => !m.startsWith('EXCECAO'))
  if (real.length) falhas++
  out.push(`${real.length ? 'REPROVA' : 'passa  '} ${r.label}${r.inDialog ? ' (dialogo)' : ''}${msgs.length ? ' — ' + msgs.join('; ') : ''}`)
}
console.log(out.join('\n'))
console.log(`linhas ${out.length}, reprovações ${falhas}`)
process.exit(falhas ? 1 : 0)
```
