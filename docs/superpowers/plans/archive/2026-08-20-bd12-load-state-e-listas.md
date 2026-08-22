# BD-12 (reduzido) — a célula que não repinta e o catálogo que não esvaziava

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** desligar a memoização de célula do `AppDataTable` para que o VALOR das células acompanhe a
troca de idioma ao vivo (D-55), e remedir contra HEAD o ramo "catálogo genuinamente vazio" do passo 1
do wizard de cotação (P-40).

**Architecture:** um único arquivo de código muda — `AppDataTable.tsx` ganha `cellMemo={false}`, knob
público do `DataTable` do PrimeReact que faz o comparador do `BodyCell` devolver `false` na primeira
linha. Uma catraca de render **condicional** guarda a decisão: ela só entra na suíte se for vista
reprovar contra o wrapper sem o knob. A P-40 não escreve código nenhum: esvazia o catálogo de dev
pela API de arquivamento, mede a tela, restaura e confere a contagem.

**Tech Stack:** React 19 · TypeScript · Vite · `primereact@10.9.8` · `react-i18next@17` ·
Vitest 4 (jsdom) + `@testing-library/react@16` · `playwright-cli` (prova de navegador) · curl com
sessão Sanctum cookie/CSRF (prova de API).

**Spec:** [`docs/superpowers/specs/archive/2026-08-20-bd12-load-state-e-listas-design.md`](../../specs/archive/2026-08-20-bd12-load-state-e-listas-design.md)

## Global Constraints

- **Frontend puro.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` tem de
  devolver **zero arquivo** no fechamento. Pint e `typescript:transform` são **N/A por escopo medido**.
- **A P-03 não dispara** — o gatilho dela é mais de um `active_work_item` de backend, e este bloco não
  toca backend. A execução roda na **árvore principal** (`/home/jvbat/projetos/lotus`), branch
  `feat/bd12-datatable-idioma-e-catalogo-vazio`, a partir de `main@716cf0b9`.
- **`docs/superpowers/backlog.md` NÃO é editado neste bloco.** Três dos cinco débitos que o backlog da
  `main` atribui ao BD-12 já foram pagos na segunda frente viva (BD-18, worktree `fix-frontend`); a
  reconciliação é do fechamento, não da execução. Ver §2 da spec.
- **A linha nova da rule `frontend-fsliced.md` sobre `ListSource<T>` NÃO entra aqui** — ela pertence ao
  bloco que pagou o D-56 e já saiu lá (`ac60d876`).
- **Nenhuma chave i18n nova.** Todo texto usado nas provas já existe nos três locales.
- **Baseline de suíte, medida em `10cd83b1` (2026-08-20):** `pnpm test` = **81 arquivos / 453 testes**,
  `pnpm lint` exit 0, `pnpm build` verde.
- **Comandos do frontend rodam de `/home/jvbat/projetos/lotus/frontend`** (Node 22/pnpm nativo no WSL,
  sem container).
- **`docker compose up -d` precisa estar de pé** para as Tasks 2 e 3 (nginx `:8080`, MySQL de dev).
- Credenciais de dev: `admin@lotus.cl` / `senha123` (`backend/database/seeders/DatabaseSeeder.php:26-30`).

## File Structure

| Arquivo | Papel | Task |
|---|---|---|
| `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` | **Modify.** Uma prop (`cellMemo={false}`) + docblock citando a medição no fonte do vendor. Único arquivo de código do bloco. | 1 |
| `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx` | **Create — CONDICIONAL.** Catraca de render do repinte por idioma. Só permanece se for vista reprovar sem o knob (spec D3). | 1 |

Nenhum outro arquivo de código muda. As Tasks 2 e 3 são medição: não produzem commit.

---

### Task 1: `cellMemo={false}` no `AppDataTable`, com catraca condicional

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` (o JSX do `<DataTable>`, hoje nas
  linhas 100-120 — a região que já lista `loading` e `emptyMessage` antes do spread)
- Create (condicional): `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`

**Interfaces:**
- Consumes: `AppDataTable` e `AppColumn` de `./AppDataTable`; `formatDate` de `@shared/lib`
  (`src/shared/lib/datetime.ts:21`, resolve o locale por `i18n.language` a cada chamada); a instância
  default de `@shared/config/i18n`.
- Produces: nada de API nova. `AppDataTableProps<T>` já herda `cellMemo?: boolean` de
  `DataTableProps<T>` (`primereact/datatable/datatable.d.ts:1140`), então a prop segue **sobrescrevível
  pelo chamador** — o `cellMemo={false}` entra **antes** do `{...props}` de propósito.

**Por que este é o remédio, e não o rekey da ficha:** `defaultKeysToCompare` do `BodyCell` lista
`rowData` e `field` e **não** lista `body` (`datatable.cjs.js:1795-1808`), então a closure nova que
`archivedColumns(t)` produz a cada render não conta como mudança e a célula bloqueia. `BodyRow` é
`React.memo` **sem** comparador (`:2485`), logo mexer acima do `BodyCell` não alcança o defeito. A
alternativa da ficha (`key={i18n.language}` no wrapper) remonta a tabela e zera ordenação, página e
filtro **client-side** — que é o que este wrapper faz por decisão registrada no próprio docblock dele.

- [ ] **Step 1: Escrever a catraca de render**

Criar `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`:

```tsx
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import { AppColumn, AppDataTable } from './AppDataTable'

const ISO = '2026-08-19T13:00:00Z'
const LINHAS = [{ id: 1, archived_at: ISO }]

/**
 * O consumidor real: quem chama `useTranslation()` e monta as colunas é a TABELA
 * da feature (`ClientsTable`, `CoursesTable`, ...), nao o wrapper. O `body` aqui
 * repete o mecanismo de `archivedColumns` (`shared/ui/archivedColumns.tsx:41`) sem
 * depender do irmao: `formatDate` resolve o locale por `i18n.language` A CADA
 * CHAMADA, entao o texto so congela se a celula nao for reinvocada.
 */
function TabelaDeArquivados() {
  const { t } = useTranslation()

  return (
    <AppDataTable value={LINHAS}>
      <AppColumn field="id" header="id" />
      <AppColumn
        field="archived_at"
        header={t('archive.archivedAt')}
        body={(linha: { archived_at: string }) => formatDate(new Date(linha.archived_at))}
      />
    </AppDataTable>
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})
afterEach(cleanup)
afterAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppDataTable — repinte de celula na troca de idioma (D-55)', () => {
  it('CATRACA: o VALOR da celula acompanha a troca de idioma, sem recarga', async () => {
    // O defeito medido no BD-17: com `cellMemo` no default `true`, o comparador do
    // BodyCell ignora `body` (`primereact/datatable/datatable.cjs.js:1795-1808`) e a
    // celula devolve o texto do idioma ANTERIOR ate a proxima recarga.
    render(<TabelaDeArquivados />)

    expect(screen.getByText(new Date(ISO).toLocaleDateString('es-CL'))).toBeTruthy()

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(screen.getByText(new Date(ISO).toLocaleDateString('en'))).toBeTruthy()
    expect(screen.queryByText(new Date(ISO).toLocaleDateString('es-CL'))).toBeNull()
  })

  it('o CABECALHO ja acompanhava — e o contraste que nomeia o defeito', async () => {
    // Sem este par, "a tabela nao troca de idioma" e uma frase vaga. O cabecalho
    // sempre repintou; e a divergencia entre os dois que o D-55 relata.
    render(<TabelaDeArquivados />)

    expect(screen.getByText('Archivado el')).toBeTruthy()

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(screen.getByText('Archived on')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar a catraca CONTRA o código antigo — este passo é a decisão, não formalidade**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm exec vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado no ramo normal: **1 failed, 1 passed**. O primeiro teste falha na segunda asserção, com a
data em `es-CL` (`19-08-2026`) ainda na tela depois de `changeLanguage('en')`; o segundo passa,
porque o cabeçalho nunca teve o defeito.

**Bifurcação obrigatória (spec D3) — leia a saída antes de seguir:**

- **Os DOIS testes passam** ⇒ o jsdom não reproduz o congelamento. A catraca não é catraca, é
  decoração: **apague o arquivo** (`rm src/shared/ui/AppDataTable/AppDataTable.test.tsx`), registre no
  ledger a saída literal que provou o `PASS`, e siga para o Step 3 **sem teste**. O D-55 fica provado
  só na Task 2, com a ausência declarada no fechamento. Lei §5.8: ferramenta verde não é DoD.
- **O primeiro teste falha** ⇒ a catraca é real. Siga para o Step 3 com o arquivo no lugar.
- **O segundo teste falha** ⇒ PARE. O cabeçalho não estar repintando contradiz a medição do BD-17 e
  significa que o harness não re-renderiza — o defeito estaria em outro lugar. Reporte ao João em vez
  de ajustar o teste até ficar verde.

- [ ] **Step 3: Aplicar o `cellMemo={false}`**

Em `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`, no JSX do `<DataTable>`, inserir a prop
**imediatamente antes** de `loading={loading && !errored}`:

```tsx
      // O comparador do `BodyCell` compara DADO, não função: `defaultKeysToCompare`
      // lista `rowData` e `field` e não lista `body`
      // (`primereact/datatable/datatable.cjs.js:1795-1808`). A closure nova que a
      // troca de idioma produz nunca chega à célula — o cabeçalho repinta e o
      // valor congela até a recarga (D-55, medido no BD-17). Com `cellMemo`
      // `false` o comparador devolve `false` na primeira linha (`:1799`) e a
      // célula repinta a cada render da tabela.
      //
      // O rekey da tabela em `i18n.language` foi recusado com o custo medido:
      // remontar zera ordenação, página e filtro, que aqui são client-side (ver o
      // docblock acima). Trocar o idioma perderia estado escolhido pelo usuário.
      //
      // ANTES do spread de propósito: a memoização fica desligada em toda tabela
      // — custo aceito na escala do produto —, e uma tabela que um dia cresça a
      // ponto de senti-lo religa o memo passando `cellMemo` como qualquer outra
      // prop do DataTable.
      cellMemo={false}
      loading={loading && !errored}
      emptyMessage={body}
      {...props}
```

- [ ] **Step 4: Rodar a catraca contra o código novo**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm exec vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado: **2 passed**. (No ramo em que a catraca foi apagada no Step 2, pule este passo e vá ao
Step 5.)

- [ ] **Step 5: Suíte inteira, lint e build**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test
pnpm lint
pnpm build
```

Esperado: `pnpm test` = **82 arquivos / 455 testes** com a catraca, ou **81 / 453** (a baseline) sem
ela; **zero falha** nos dois casos. `pnpm lint` exit 0. `pnpm build` verde.

Qualquer teste que vire vermelho aqui é regressão do knob — **leia a asserção** antes de mexer nela:
uma tabela que dependia de a célula NÃO repintar é achado, não ajuste.

- [ ] **Step 6: Commit**

Com a catraca:

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/ui/AppDataTable/AppDataTable.tsx \
        frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx
git commit -m "$(cat <<'MSG'
fix(shared): a célula do DataTable repinta na troca de idioma

D-55. O comparador do BodyCell compara dado, não função: defaultKeysToCompare
lista rowData e field e não lista body (primereact/datatable/datatable.cjs.js
:1795-1808), então a closure nova que archivedColumns(t) produz a cada render
nunca chega à célula — o cabeçalho trocava de idioma e o valor congelava até a
recarga.

cellMemo={false} faz o comparador devolver false na primeira linha (:1799) e a
célula repintar a cada render da tabela. É prop pública do DataTable
(datatable.d.ts:1140), default true (datatable.cjs.js:492).

O rekey em i18n.language da ficha foi recusado com o custo medido: remontar
zera ordenação, página e filtro client-side, que é o que este wrapper faz por
decisão registrada. A prop entra antes do spread, então uma tabela que um dia
sinta o custo religa o memo por prop.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

Sem a catraca (ramo do Step 2 em que o jsdom não reproduziu), o `git add` leva só o
`AppDataTable.tsx` e o corpo ganha um parágrafo final:

```
Sem catraca de render: o teste montado (dois casos, o valor e o cabeçalho)
passou VERDE contra o wrapper sem o knob, então não guarda a decisão. A
ausência é declarada, e o D-55 fica provado no navegador.
```

---

### Task 2: prova de navegador do D-55 — sujeito, dois controles positivos, um negativo

**Files:** nenhum. Esta task **não produz commit**; a evidência entra no ledger da execução e no
fechamento.

**Interfaces:**
- Consumes: o commit da Task 1 servido pelo Vite desta árvore.
- Produces: as medições que satisfazem os itens **1** e **2** da DoD da spec.

**Por que os controles existem:** um sujeito sozinho não distingue "a célula destravou" de "a página
recarregou". `ÚLTIMO ACCESO` e o `AppTag` de estado congelavam pelo **mesmo** motivo e têm de destravar
**junto**; `ArchivedQuotesList` usa a mesma `formatDate` **fora** de DataTable, já trocava ao vivo antes
do bloco e tem de continuar trocando (não regrediu).

- [ ] **Step 1: Subir os serviços e o Vite desta árvore, na porta que o CORS conhece**

```bash
docker compose up -d
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/user
cd /home/jvbat/projetos/lotus/frontend && pnpm dev --port 5174 --strictPort
```

Esperado: `401` do backend (sem sessão, com `Accept` padrão o handler responde 401 — qualquer coisa
diferente de recusa de conexão serve para provar que o nginx está de pé) e o Vite anunciando
`http://localhost:5174/`.

**A porta 5174 não é detalhe:** `backend/.env:37-38` lista `localhost:5173,localhost:5174` em
`SANCTUM_STATEFUL_DOMAINS` e `FRONTEND_URL`; qualquer outra porta quebra CORS e sessão. A 5173 pode
estar ocupada pelo `pnpm dev` da worktree `fix-frontend` — servir a tela nela provaria o código de
**outro branch** (precedente registrado no fechamento do `arquivados-roots-restantes`).

- [ ] **Step 2: Abrir o navegador e autenticar**

```bash
cd /home/jvbat/projetos/lotus
playwright-cli -s=bd12 open http://localhost:5174/login
playwright-cli -s=bd12 snapshot
playwright-cli -s=bd12 fill "campo de email" admin@lotus.cl
playwright-cli -s=bd12 fill "campo de contraseña" senha123
playwright-cli -s=bd12 click "botón de ingresar"
playwright-cli -s=bd12 snapshot
```

Esperado: o snapshot final mostra o dashboard autenticado. Os alvos dos `fill`/`click` saem do
snapshot anterior — use os refs que ele imprimir, não estes rótulos ao pé da letra.

Confirmar que a interface está em **es-CL** (menu de idioma no topo); se não estiver, trocá-la agora,
antes de qualquer medição.

- [ ] **Step 3: Pass A — o sujeito: `Archivado el` em `/cursos`**

O catálogo de dev não tem curso arquivado, então a prova cria um e o devolve.

```bash
playwright-cli -s=bd12 goto http://localhost:5174/cursos
playwright-cli -s=bd12 snapshot
# arquivar UM curso pela ação da linha (`Archivar`) e confirmar no diálogo
playwright-cli -s=bd12 click "<ref da ação Archivar da primeira linha>"
playwright-cli -s=bd12 click "<ref do botón de confirmación>"
# alternar a fonte para Archivados
playwright-cli -s=bd12 click "<ref del switch Archivados>"
playwright-cli -s=bd12 find "Archivado el"
playwright-cli -s=bd12 screenshot
```

Anotar o texto da célula `Archivado el` (formato es-CL: `dd-mm-aaaa`).

Trocar o idioma **pelo menu, sem recarregar**:

```bash
playwright-cli -s=bd12 click "<ref del menú de idioma>"
playwright-cli -s=bd12 click "<ref de English>"
playwright-cli -s=bd12 find "Archived on"
playwright-cli -s=bd12 screenshot
```

**Esperado (DoD 1):** o cabeçalho passa a `Archived on` **e** o valor da célula passa ao formato `en`
(`m/d/aaaa`). Repetir para `pt-BR` (cabeçalho `Arquivado em`, valor `dd/mm/aaaa`) e voltar a `es-CL`.
**Sem F5 em nenhum momento** — recarregar é justamente o que mascarava o defeito.

- [ ] **Step 4: Pass B — os controles positivos: `Último acceso` e o `AppTag` de estado**

```bash
playwright-cli -s=bd12 goto http://localhost:5174/administracion
playwright-cli -s=bd12 find "Último acceso"
playwright-cli -s=bd12 screenshot
playwright-cli -s=bd12 click "<ref del menú de idioma>"
playwright-cli -s=bd12 click "<ref de English>"
playwright-cli -s=bd12 screenshot
```

**Esperado (DoD 2):** a coluna `common.lastLogin` (`UsersTable.tsx:77-79`, `formatDateTime`, que este
bloco **não** toca) troca de formato ao vivo, e o `AppTag` de estado (`admin.state`, `:67`) troca de
texto. Os dois congelavam pelo mesmo motivo do sujeito e destravam pelo mesmo knob — é isto que prova
que o alcance é o wrapper, e não a coluna de arquivamento.

Voltar a `es-CL`.

- [ ] **Step 5: Pass C — o controle negativo: `ArchivedQuotesList`**

```bash
playwright-cli -s=bd12 goto http://localhost:5174/comercial
playwright-cli -s=bd12 snapshot   # escolher um presupuesto com cotización pendiente
playwright-cli -s=bd12 click "<ref del presupuesto>"
# arquivar UMA cotización pela ação da linha, e abrir a lista de Archivados
playwright-cli -s=bd12 click "<ref da ação Archivar>"
playwright-cli -s=bd12 click "<ref do botón de confirmación>"
playwright-cli -s=bd12 click "<ref del switch Archivados>"
playwright-cli -s=bd12 screenshot
playwright-cli -s=bd12 click "<ref del menú de idioma>"
playwright-cli -s=bd12 click "<ref de English>"
playwright-cli -s=bd12 screenshot
```

**Esperado (DoD 2):** a data continua trocando ao vivo. `ArchivedQuotesList` é layout flex, **não**
DataTable (`ArchivedQuotesList.tsx`, corrigido em `1d61b287` no BD-17), então nunca teve o defeito —
se ele passasse a congelar, o knob teria regredido algo.

Voltar a `es-CL`.

- [ ] **Step 6: Devolver o banco de dev ao estado anterior**

Restaurar, **pela interface**, o curso do Step 3 e a cotação do Step 5 (ação `Restaurar` na visão
Archivados de cada um). Conferir depois:

```bash
playwright-cli -s=bd12 goto http://localhost:5174/cursos
playwright-cli -s=bd12 find "Archivados"      # a lista de arquivados fica vazia
playwright-cli -s=bd12 close
```

**Esperado:** `/cursos` volta à contagem de ativos de antes do Step 3 e a visão Archivados mostra
`No hay registros archivados`; o presupuesto do Step 5 volta com a cotación ativa. A P-44 existe por
gates que esqueceram o próprio rastro — zero resíduo é exigível.

---

### Task 3: P-40 — o ramo "catálogo genuinamente vazio", remedido contra HEAD

**Files:** nenhum. Esta task **não produz commit**.

**Interfaces:**
- Consumes: `DELETE /api/courses/{course}`, `POST /api/courses/{course}/restore` e `GET /api/courses`
  (`backend/app/Domains/Catalog/routes.php:12,16,18`). `ArchiveCourseAction` é transacional e **não tem
  gate** (`ArchiveCourseAction.php:26-31`).
- Produces: o item **4** da DoD da spec, e o fechamento da P-40.

**O que destravou a ficha:** ela congelou em 2026-08-14 porque `php artisan tinker --execute` foi
recusado pelo classificador e **não havia substituto pela API**. Os endpoints de arquivar/restaurar
curso nasceram depois, em 2026-08-18. A sonda é o **passo 1 do wizard de cotação** (`CourseStep`), que
é o sítio original medido em `d20bebc`: é o único consumidor cuja mensagem de vazio (`course.empty`,
`CourseStep.tsx:63`) tem de aparecer **sem** a de falha (`common.loadError`, `:52`).

- [ ] **Step 1: Sessão Sanctum por cookie + CSRF, e a contagem de antes**

Lição 12: `Origin` e `Accept` obrigatórios, e o `XSRF-TOKEN` é reextraído do jar **depois** do login,
que o rotaciona.

```bash
J=/tmp/lotus-p40.jar; rm -f $J
curl -s -c $J -H "Origin: http://localhost:5174" http://localhost:8080/sanctum/csrf-cookie -o /dev/null
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
curl -s -b $J -c $J -H "Origin: http://localhost:5174" -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $X" -H "Content-Type: application/json" \
  -d '{"email":"admin@lotus.cl","password":"senha123"}' \
  -o /dev/null -w 'login %{http_code}\n' http://localhost:8080/api/login
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')

curl -s -b $J -H "Origin: http://localhost:5174" -H "Accept: application/json" \
  http://localhost:8080/api/courses > /tmp/p40-antes.json
python3 -c "import json;d=json.load(open('/tmp/p40-antes.json'));print('ativos:',len(d));print('ids:',sorted(c['id'] for c in d))"
```

Esperado: `login 200`, e uma contagem de ativos maior que zero com a lista de ids. **Anote os dois
números** — eles são o gabarito do Step 5.

- [ ] **Step 2: Controle POSITIVO antes de esvaziar — o wizard mostra a lista**

No navegador (reaproveite a sessão da Task 2 ou abra uma nova com o Step 2 dela), abrir um
presupuesto e o passo 1 do wizard:

```bash
playwright-cli -s=bd12 goto http://localhost:5174/comercial
playwright-cli -s=bd12 snapshot
playwright-cli -s=bd12 click "<ref del presupuesto>"
playwright-cli -s=bd12 click "<ref de Agregar cotización>"
playwright-cli -s=bd12 snapshot
playwright-cli -s=bd12 screenshot
```

**Esperado:** o passo `Curso` lista os cursos com o campo de busca `Buscar curso...`. Sem este
controle, um "No hay cursos." no Step 4 não distinguiria a tela certa de uma tela quebrada.

Como na Task 2: os `<ref ...>` saem do `snapshot` imediatamente anterior — use o que ele imprimir,
não estes rótulos ao pé da letra.

Fechar o diálogo do wizard antes do Step 3.

- [ ] **Step 3: Esvaziar o catálogo pela API**

```bash
for id in $(python3 -c "import json;print(' '.join(str(c['id']) for c in json.load(open('/tmp/p40-antes.json'))))"); do
  X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
  curl -s -b $J -c $J -X DELETE -H "Origin: http://localhost:5174" -H "Accept: application/json" \
    -H "X-XSRF-TOKEN: $X" -o /dev/null -w "DELETE course/$id -> %{http_code}\n" \
    http://localhost:8080/api/courses/$id
done

curl -s -b $J -H "Origin: http://localhost:5174" -H "Accept: application/json" \
  http://localhost:8080/api/courses | python3 -c "import json,sys;d=json.load(sys.stdin);print('ativos agora:',len(d))"
```

Esperado: **`204`** em cada `DELETE` e `ativos agora: 0`.

Um `DELETE` que responda diferente de 204 **interrompe a task**: anote o código e o corpo, restaure o
que já foi arquivado com o Step 5 e reporte. Não siga medindo a tela com o catálogo pela metade.

- [ ] **Step 4: A medição — `course.empty` e NÃO `common.loadError`**

```bash
playwright-cli -s=bd12 click "<ref de Agregar cotización>"
playwright-cli -s=bd12 snapshot
playwright-cli -s=bd12 find "No hay cursos."
playwright-cli -s=bd12 find "No se pudieron cargar los datos"
playwright-cli -s=bd12 screenshot
```

**Esperado (DoD 4):** o passo 1 mostra o título `Curso` e o texto **`No hay cursos.`**; o `find` da
mensagem de falha **não acha nada**, e o botão `Reintentar` não está na tela. O campo de busca também
não aparece — filtrar lista que não veio é controle morto (`CourseStep.tsx:71`, o ramo `isEmpty` sai
antes).

Ver `No se pudieron cargar los datos` aqui seria a P-40 reprovando: significaria que o gate
`failedWithoutData` dispara sobre uma resposta 200 vazia.

- [ ] **Step 5: Restaurar, e conferir que a contagem voltou**

A restauração **faz parte da prova**, não é limpeza opcional.

```bash
for id in $(python3 -c "import json;print(' '.join(str(c['id']) for c in json.load(open('/tmp/p40-antes.json'))))"); do
  X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
  curl -s -b $J -c $J -X POST -H "Origin: http://localhost:5174" -H "Accept: application/json" \
    -H "X-XSRF-TOKEN: $X" -o /dev/null -w "RESTORE course/$id -> %{http_code}\n" \
    http://localhost:8080/api/courses/$id/restore
done

curl -s -b $J -H "Origin: http://localhost:5174" -H "Accept: application/json" \
  http://localhost:8080/api/courses > /tmp/p40-depois.json
curl -s -b $J -H "Origin: http://localhost:5174" -H "Accept: application/json" \
  http://localhost:8080/api/courses/archived > /tmp/p40-arquivados.json
python3 - <<'PY'
import json
a = sorted(c['id'] for c in json.load(open('/tmp/p40-antes.json')))
d = sorted(c['id'] for c in json.load(open('/tmp/p40-depois.json')))
arq = json.load(open('/tmp/p40-arquivados.json'))
print('antes :', len(a), a)
print('depois:', len(d), d)
print('arquivados restantes:', len(arq))
print('IDENTICO' if a == d else 'DIVERGIU')
PY
```

**Esperado (DoD 4):** **`200`** em cada `restore`, `IDENTICO`, e `arquivados restantes: 0`.

`DIVERGIU` ou arquivados restantes > 0 = resíduo no banco de dev: **não maquie**. Registre o que
sobrou e reporte ao João — a spec §6 declara essa possibilidade de propósito.

- [ ] **Step 6: Controle POSITIVO depois — o wizard volta a listar**

```bash
playwright-cli -s=bd12 click "<ref de Agregar cotización>"
playwright-cli -s=bd12 snapshot
playwright-cli -s=bd12 close
```

**Esperado:** os cursos voltam ao passo 1, com o campo de busca. Fecha o ciclo: o vazio foi produzido
e desfeito, e a tela respondeu aos dois estados.

**Conferência secundária, só se estiver de graça:** `RedatorCourseSelector` tem o mesmo `if (isEmpty)`.
Não é requisito — medir noutro lugar mediria outro ramo.

---

### Task 4: gate de fechamento da branch

**Files:** nenhum. Não produz commit.

- [ ] **Step 1: A fronteira do bloco**

```bash
cd /home/jvbat/projetos/lotus
git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts
git diff main...HEAD --name-only
```

**Esperado:** o primeiro comando devolve **zero linha** (DoD 5). O segundo lista apenas
`docs/superpowers/specs/2026-08-20-bd12-load-state-e-listas-design.md`,
`docs/superpowers/plans/2026-08-20-bd12-load-state-e-listas.md`, `docs/superpowers/state.md`,
`frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` e — se a catraca entrou —
`frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`. **`docs/superpowers/backlog.md` não pode
aparecer.**

Com o fence vazio, Pint e `typescript:transform` ficam **N/A por escopo medido**, e não por suposição.

- [ ] **Step 2: O gate do frontend**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm lint
pnpm build
pnpm test
```

**Esperado (DoD 6):** `lint` exit 0; `build` verde; `test` **82 arquivos / 455 testes** com a catraca ou
**81 / 453** sem ela — em nenhum caso abaixo da baseline de `10cd83b1`.

- [ ] **Step 3: Conferir a DoD item a item antes de declarar o bloco pronto**

| # | Prova | Onde |
|---|---|---|
| 1 | célula de data repinta ao vivo, nos três idiomas | Task 2, Step 3 |
| 2 | `ÚLTIMO ACCESO` e `AppTag` destravam junto; `ArchivedQuotesList` não regride | Task 2, Steps 4-5 |
| 3 | catraca vista reprovar e depois passar — **ou** a ausência declarada com o motivo medido | Task 1, Steps 2 e 4 |
| 4 | `course.empty` sem `common.loadError`, catálogo devolvido com contagem idêntica | Task 3, Steps 4 e 5 |
| 5 | fence de backend/`generated.ts` vazio | Task 4, Step 1 |
| 6 | `lint` 0, `build` verde, `test` sem regressão | Task 4, Step 2 |

Um item sem prova **não** vira "provavelmente ok": vira limitação declarada, com o motivo medido.

---

## Handoff de execução

**executor: claude**

Não é task mecânica de paths fechados. Três pontos exigem julgamento fora do plano:

1. **A bifurcação do Step 2 da Task 1 é uma decisão, não um passo.** Ler a saída e escolher entre
   "a catraca entra" e "a catraca é apagada e a ausência é declarada" é exatamente o tipo de leitura
   que um executor mecânico resolve deixando o teste verde — que é o modo de falha que a spec D3
   existe para impedir (lei §5.8).
2. **As Tasks 2 e 3 mutam o banco de dev e têm de devolvê-lo.** Arquivar todo o catálogo e restaurá-lo,
   arquivar curso e cotação pela interface e desfazer — uma interrupção no meio deixa resíduo, e a
   resposta certa é reportar, não maquiar (P-44).
3. **O knob desliga a memoização de célula em TODA tabela.** Qualquer teste que vire vermelho no Step 5
   da Task 1 é achado a ler, não asserção a ajustar.

Risco projetado: **BAIXO** — frontend puro, um arquivo de código, sem schema, sem `generated.ts`, sem
Sanctum, RBAC, dinheiro ou emissão de certificado. A classificação final é do `/revisar-sprint`.

**Ordem obrigatória:** Task 1 antes da Task 2 (a prova de navegador mede o código corrigido). Tasks 2 e
3 podem compartilhar a mesma sessão de navegador. Task 4 por último.
