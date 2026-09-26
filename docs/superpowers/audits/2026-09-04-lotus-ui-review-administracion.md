# Revisão de UI — Administración (`/administracion`)

**Data:** 2026-09-26 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/identity/components/AdministracionPage.tsx` e `Admin/` (abas
Usuarios e Roles y permisos) · **Base:** `refactor/frontend-revisao-ui-f3` @ `879b9c12`
**Evidência bruta:** `.artifacts/ui-review/20260926-150940-administracion/` (15 capturas +
`report.txt`, coberta pelo `.gitignore`)

> Run 3 da fatia 3 do item 16 (`frontend-revisao-ui-por-modulo-f3`), Task 6 do plano
> `2026-09-04-frontend-revisao-ui-por-modulo-f3.md`. Papel **superadmin** — `admin@lotus.cl`.
>
> A §2 é o `report.txt` verbatim. A §3 é o que foi feito com ele na Task 7 e **não** faz parte do
> relatório.

## 1. Escopo e limites da run

- Papel: **superadmin** (`admin@lotus.cl`), sessão real criada pela tela de login (única mutação
  permitida pela skill). É o único papel que vê as duas abas: a aba Roles e os dois botões de
  criação são gated por `identity.access.manage`, que o `adminPermissions()` remove.
- **Estado admin-comum: não testado.** Cobri-lo exigiria criar um usuário sem
  `identity.access.manage`, o que é mutação e sai da janela read-only da skill. O superadmin é o
  pior caso da régua de abas (2 abas contra 1), e o item 9
  (`administracao-roles-permissoes-redesign`) pode redesenhar esta tela.
- Chromium **empacotado** (`--browser=chromium`), headed, sessão `adm-f3` — mesma limitação de
  ambiente das runs de Cursos e Pessoas (canal `chrome` indisponível nesta máquina).
- Alvo medido: SPA em `http://localhost:5175` e API em `http://localhost:8082`, portas do offset +2
  desta árvore. A stack estava parada no início da sessão; `docker compose up -d` e `pnpm dev`
  religados antes do preflight (`PREFLIGHT_OK`).
- Read-only: nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo branch
  e mesmo commit (`879b9c12`) nas duas pontas. Rede: só GETs, todos 200.
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`, tema claro; amostra adicional em
  `1440x900` no **escuro** (Usuarios e Roles) — sem defeito novo, tags e cor de marca seguem o token
  do tema.
- Idioma: **es-CL**, setado via `localStorage` (`lotus-lang`).
- Teclado: na régua, as setas movem a seleção com `tabindex` roving (0 na aba ativa, -1 na outra) e
  `Tab` sai da régua para "Nuevo rol"; no diálogo, `Escape` fecha e devolve o foco ao "Ver" que abriu.
- **Régua de aba** (`.p-tabview-nav-container .p-tabview-nav`, `[scrollWidth, clientWidth,
  transborda]`): `1440x900` → `[1134, 1134, false]`; `1024x768` → `[718, 718, false]`; `390x844` →
  `[280, 276, true]`. **Transborda 4px em telefone** — registrado como UI-03; nada foi ligado aqui,
  a Task 8 decide `scrollable` com estes números.
- Fichas conhecidas verificadas contra esta tela:
  - **`P-44`** (usuários de sonda de gates antigos no banco de dev aparecem nesta lista) — conhecida,
    não vira achado. **Não se manifestou nesta run:** o banco desta árvore (volume do projeto compose
    `fix-frontend`) tem um usuário só, `admin@lotus.cl`.
  - **`D-65`** (coluna de ações presa cobre a coluna de identidade em `390x844`) — reproduz nas duas
    tabelas desta tela (screens/10 e 11). É a mesma ficha que recebeu o UI-01 de Pessoas como
    deferido; não vira achado novo.
  - **`P-74`** (severidade reprova AA no claro) — nenhum botão de severidade na jornada além dos
    primários; não avaliada aqui.
- Estados não testados, por exigirem mock, falha fabricada ou escrita: `loading`, erro de carga,
  lista arquivada com linhas e restaurar, criar/editar usuário ou role, role customizado em view
  (nenhum na base), paginação.
- Chrome DevTools MCP: não necessário — toda a evidência é do Playwright CLI.

## 2. `report.txt` — verbatim

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: /administracion (papel superadmin) — aba Usuarios, busca, alternador Activos/Archivados, abrir um usuário em modo view, aba Roles y permisos, abrir um role em modo view, fechar
Local URL: http://localhost:5175/administracion (API: http://localhost:8082)
Branch/commit: refactor/frontend-revisao-ui-f3 @ 879b9c12
Date/time: 2026-09-26 15:09 — 15:20 (-03:00)
Agent: Claude Opus 5.5 (Claude Code)
Playwright CLI: @playwright/cli 0.1.18, sessão nomeada adm-f3, headed, browser chromium empacotado (canal "chrome" indisponível no ambiente; limitação documentada no plano)
Chrome DevTools: not-needed
Git working tree before/after: limpo / limpo (mesmo branch, mesmo commit 879b9c12 nas duas pontas)

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Lista Usuarios, claro | OK | Defeito (UI-02) | Conhecido (D-65, coluna de ações cobre o nome) | screens/01, 09, 11 |
| Busca sem resultado ("zzz") e com resultado ("lotus") | OK | — | — | screens/02, 03 |
| Alternador Archivados (vazio) e volta a Activos | OK | — | — | screens/04 |
| Abrir usuário em modo view, fechar | Defeito (UI-01) | — | OK (diálogo rola, rodapé fixo) | screens/05, 12 |
| Aba Roles y permisos | Defeito (UI-01) | Defeito (UI-01, UI-02) | Conhecido (D-65) | screens/06, 08, 10 |
| Abrir role em modo view (admin; redator em 390), fechar | Defeito (UI-01, UI-04) | — | Defeito (UI-01, UI-04) | screens/07, 13 |
| Lista Usuarios e Roles, escuro | OK (amostra 1440x900) | — | — | screens/14, 15 |
| Régua de abas | OK [1134,1134,false] | OK [718,718,false] | Transborda (UI-03) [280,276,true] | eval no console |
| Teclado — tablist (setas movem seleção, tabindex roving 0/-1), Tab sai da régua para "Nuevo rol"; Escape fecha diálogo e devolve foco ao "Ver" | OK | — | — | eval(document.activeElement) antes/depois de cada tecla |

## Technical signals
Console: após o login, 1 entrada só — o INFO de "Download the React DevTools" do modo dev (esperado). 0 errors, 0 warnings em toda a jornada (`.playwright-cli/console-2026-09-26T18-10-14-542Z.log`).
Network: só GETs, todos 200 — /api/me, /api/users, /api/roles (3x), /api/users/archived, /api/permissions (2x, uma por abertura de diálogo de role). Nenhum 4xx/5xx.
Performance: não medido.
Untested states: loading (transitório, não capturável sem throttle/mock); erro de carga (exige falha fabricada); lista arquivada COM linhas e restaurar (a base desta árvore tem 0 usuários arquivados; arquivar é mutação); criar/editar usuário ou role (mutação); role customizado em view (não existe nenhum na base, criar é mutação); papel admin-comum sem `identity.access.manage` (exige criar usuário — mutação); paginação (1 usuário e 3 roles não expõem o paginador).

## Findings
### UI-01 — nome de role aparece como slug cru; "redator" em português numa tela es-CL
Classification: C
Surface/journey: /administracion — coluna "Rol" da lista Usuarios, campo "Rol" do diálogo de usuário (valor e opções do dropdown), coluna "Nombre" da aba Roles y permisos, título e campo "Nombre" do diálogo de role
Viewport: todos (é texto, não layout); visto em 1440x900, 1024x768 e 390x844
Reproduction: abrir /administracion em es-CL; ler a coluna "Rol" da linha "Admin Lotus"; abrir "Ver"; ir à aba "Roles y permisos"; abrir "Ver" na linha "redator".
Evidence: screens/01-usuarios-1440.png ("superadmin" na coluna Rol, "SuperAdmin" no cabeçalho do app na mesma captura); screens/05-usuario-view-1440.png (Rol "superadmin"); screens/06-roles-1440.png (admin / redator / superadmin); screens/13-role-redator-view-390.png (título "redator").
Observed fact: a tela imprime `u.role` / `r.name` literais: "superadmin", "admin", "redator". O cabeçalho do app, na mesma captura, mostra "SuperAdmin" — ele traduz pela chave `roleName.*`, que existe nos 3 locales (es-CL: SuperAdmin / Administrador / Redactor). O resto da interface es-CL chama o papel de "Redactor" (menu Personas > Redactores).
Inference: `roleName.*` já é a fonte de rótulo de role (usada por `UserMenu` e `ProfileIdentityCard`); Administración é a única tela que não passa por ela. Role customizado não tem chave — o nome digitado é o rótulo, então a tradução precisa de fallback para o nome cru.
Impact: o operador chileno lê "redator" (português) e "admin"/"superadmin" em minúsculas, que contradizem "Redactor", "Administrador" e "SuperAdmin" usados no resto da aplicação — idioma inesperado na tela onde se atribui papel a uma pessoa.
Recommendation: helper puro em `shared/lib` (ao lado de `displayRole`) que devolve `t('roleName.<name>')` quando a chave existe e o nome cru quando não existe; aplicar na coluna Rol (`UsersTable.tsx:68`), nas opções/valor do dropdown (`useStaffRoleOptions.ts:13`, `StaffUserDialog`), na coluna Nombre (`RolesTable.tsx:42`) e no título do `RoleDialog` (`RoleDialog.tsx:47`). O `value` das opções continua sendo o slug.
Rule/reference: frontend/src/shared/lib/roles.ts:12 (displayRole); frontend/src/app/layouts/Header/UserMenu.tsx:19; frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx:56; frontend/src/shared/config/locales/es-CL.json:137 (roleName); .claude/rules/frontend-fsliced.md (i18n: es-CL é a referência de rótulo)

### UI-02 — Usuarios e Roles rolam em 1024x768 e a coluna de ações presa cobre a última coluna de dado
Classification: C
Surface/journey: /administracion, aba Usuarios e aba Roles y permisos, lista, tema claro
Viewport: 1024x768 (não reproduz em 1440x900; em 390x844 é a ficha conhecida D-65)
Reproduction: abrir /administracion com viewport 1024x768; observar "Último acceso" na aba Usuarios; trocar para Roles y permisos e observar o cabeçalho "PERMISOS".
Evidence: screens/09-usuarios-1024.png (valor cortado em "26-09-202" / "03:10 p. m." sob a coluna de ações); screens/08-roles-1024.png (cabeçalho cortado em "PERMISO"); medição por eval: moldura `.p-datatable-wrapper` clientWidth 718, scrollWidth 768, tabela 768 — nas duas abas; na aba Roles o cabeçalho "Permisos" ocupa x 829–953 e a coluna de ações começa em x 903 (50px de sobreposição).
Observed fact: a tabela tem 768px e a moldura 718px; a barra de rolagem horizontal aparece e a coluna de ações (`position: sticky; right: 0`, fundo opaco) pinta por cima dos últimos 50px da coluna de dado vizinha.
Inference: é a mesma raiz do UI-03 da run de Pessoas — o piso `min-w-[48rem]` que `AppDataTable` aplica por padrão (`style.ts:73`) é maior que os 718px de moldura em 1024x768. A correção de Pessoas foi pontual (`RedatoresTable` passou `min-w-[42rem]` via `pt`), então as duas tabelas desta tela continuam com o piso default. O alcance é do wrapper: toda tabela em card nesta largura herda o mesmo piso.
Impact: data/hora do último acesso e o cabeçalho da contagem de permissões ficam cortados sem pista visual de que há mais conteúdo; a leitura depende de rolar horizontalmente uma tabela de 1 a 3 linhas.
Recommendation: decidir onde o piso mora — repetir o `pt` de `RedatoresTable` em `UsersTable`/`RolesTable`, ou baixar o default em `AppDataTable/style.ts` para caber nos 718px (medindo as demais tabelas em 1024x768 antes). A regra do plano manda corrigir no wrapper quando o achado mora no wrapper e medir o alcance nas outras telas.
Rule/reference: frontend/src/shared/ui/AppDataTable/style.ts:73 (`min-w-[48rem] table-fixed`); frontend/src/features/identity/components/Redator/RedatoresTable.tsx:54-60 (precedente); frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:89 (passthrough `pt`); docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md (UI-03)

### UI-03 — régua de abas transborda 4px em 390x844
Classification: B
Surface/journey: /administracion, régua Usuarios / Roles y permisos
Viewport: 390x844 (1440x900 e 1024x768 sem transbordo)
Reproduction: abrir /administracion com viewport 390x844 e medir `.p-tabview-nav-container .p-tabview-nav`.
Evidence: eval `[scrollWidth, clientWidth, transborda]` = `[280, 276, true]` em 390x844; `[1134, 1134, false]` em 1440x900; `[718, 718, false]` em 1024x768; screens/10-roles-390.png e screens/11-usuarios-390.png (o sublinhado de "Roles y permisos" encosta na borda direita do card).
Observed fact: o conteúdo da régua mede 280px num contêiner de 276px; os 4px excedentes são recortados. O texto "Roles y permisos" continua legível nas capturas.
Inference: duas abas com rótulos longos em es-CL passam do card em telefone; o superadmin é o pior caso (o admin-comum vê só uma aba).
Impact: sem perda de conteúdo hoje; qualquer rótulo mais longo ou fonte maior corta o fim da segunda aba sem indicador de rolagem.
Recommendation: nenhuma ação nesta run — a Task 8 do plano decide `scrollable` com estes números.
Rule/reference: frontend/src/features/identity/components/AdministracionPage.tsx (ModuleTabs); plano 2026-09-04-frontend-revisao-ui-por-modulo-f3.md, Task 8

### UI-04 — rótulos de permissão expõem jargão interno (Flujo N, RN-02, soft delete)
Classification: B
Surface/journey: /administracion, aba Roles y permisos, abrir role em modo view (lista de permisos)
Viewport: todos; visto em 1440x900 e 390x844
Reproduction: abrir /administracion > Roles y permisos > "Ver" em "admin"; ler os rótulos de cada grupo de permissões.
Evidence: screens/07-role-view-1440.png ("Eliminar (soft delete) usuarios", "Aprobar cotización con aceptación del cliente (Flujo 2 — solo superadmin)"); screens/13-role-redator-view-390.png; contagem em es-CL.json: 9 de 41 rótulos `perm.*` carregam "Flujo N", "RN-02" ou "soft delete".
Observed fact: os rótulos mostram identificadores de especificação ("Flujo 1/4", "Flujo 3", "RN-02 — acción del redactor") e o termo técnico em inglês "soft delete". O rótulo da permissão de apagar usuário diz "Eliminar", enquanto o botão da lista para a mesma ação diz "Archivar".
Inference: as strings nasceram como descrição técnica do seeder de permissões e foram traduzidas preservando as referências internas.
Impact: o texto é compreensível, mas o operador não tem como saber o que "Flujo 5" significa, e "Eliminar" contra "Archivar" sugere uma ação destrutiva que a interface não oferece.
Recommendation: reescrever os 9 rótulos nos 3 locales sem referência interna, alinhando o verbo ao da interface ("Archivar usuarios"). Só strings; nenhuma chave muda.
Rule/reference: frontend/src/shared/config/locales/es-CL.json:153-190 (`perm.*`); frontend/src/features/identity/components/Admin/RoleDialog.tsx (t(`perm.${...}`))

## Summary
A: busca com e sem resultado (vazio com "Limpiar búsqueda"); alternador Archivados (vazio correto, toolbar sem "Nuevo usuario" no modo arquivado); diálogos de usuário e de role em modo view (rodapé fixo, rolagem interna em 390x844); aviso "Los permisos de los roles de sistema son de solo lectura" coerente com o diálogo sem "Editar"; teclado da régua e do diálogo; tema escuro; console e rede limpos.
B: UI-03, UI-04
C: UI-01, UI-02
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

| Achado | Classe | Destino | Commit |
|---|---|---|---|
| UI-01 — nome de role aparece como slug cru ("redator" em português numa tela es-CL) | `C` | corrige aqui | `e3f09648` |
| UI-02 — Usuarios e Roles rolam em 1024x768, coluna de ações cobre a última coluna de dado | `C` | corrige aqui | `db7a0920` |
| UI-03 — régua de abas transborda 4px em 390x844 | `B` | corrige aqui (Task 8) | `f80b62de` |
| UI-04 — rótulos de permissão expõem jargão interno (Flujo N, RN-02, soft delete) | `B` | ficha `D-71` | — |

**UI-01** — `roleLabel(name, t)` (novo, `shared/lib/roles.ts`, ao lado de `displayRole`) devolve
`t('roleName.<name>')` para os 3 roles de sistema (`superadmin`, `admin`, `redator`) e o nome cru
para role customizado, que não tem chave. Aplicado nos 4 pontos que o achado listou: coluna "Rol" de
`UsersTable`, coluna "Nombre" de `RolesTable`, título do `RoleDialog` e opções/valor do dropdown em
`useStaffRoleOptions`/`StaffUserDialog`. RED visto antes da correção: 4 falhas em 776 testes
(`roleLabel is not a function`; "Unable to find an element with the text: roleName.redator" /
"roleName.superadmin"). GREEN depois: 780/780 (a suíte ganhou os 3 arquivos de teste novos —
`roles.test.ts`, `UsersTable.test.tsx`, `RolesTable.test.tsx`). Medido no navegador, 1440x900,
es-CL: coluna Rol mostra "SuperAdmin"; aba Roles y permisos mostra "Administrador" / "Redactor" /
"SuperAdmin"; diálogo do role "redator" abre com título "Redactor" (antes: "redator").

**UI-02** — mesma raiz e mesmo remédio já provados em `RedatoresTable` (UI-03 da run de Pessoas,
commit `d07aa877`): o piso default do `AppDataTable` (`min-w-[48rem]` = 768px,
`AppDataTable/style.ts:73`) é maior que os 718px de moldura em 1024x768, força rolagem, e a coluna
de ações presa cobre a última coluna de dado. `UsersTable` repassa
`pt={{ table: { className: 'min-w-[42rem] table-fixed' } }}` pelo passthrough do
`SearchableTableFrame` (mecanismo que já existia, ligado por `RedatoresTable`); `RolesTable` passa o
mesmo `pt` direto ao `AppDataTable`, que já aceita a prop. RED visto: as duas tabelas com teste
asserting `min-w-[42rem]` falhavam contra o `min-w-[48rem]` herdado. GREEN depois: 782/782, lint 0,
build ok. Medido no navegador, 1024x768: Usuarios (Activos, 1 linha) foi de 718/768/768
(wrapper/scrollWidth/tabela) para 718/718/718 — "Último acceso" ("26-09-2026 03:33 p. m.") sai
inteiro; Roles (3 linhas) mesma mudança — cabeçalho "PERMISOS" sai inteiro (x 788–903), ação (x
903–999) sem sobrepor. Usuarios em Archivados (0 linhas nesta base — mesma limitação de dado da run
original): a correção é incondicional (className fixo no `pt`), e a tabela mede 718/718/718
estruturalmente, mas o PrimeReact aplica `class="p-datatable-thead hidden"` no vazio — não há linha
para confirmar ausência de sobreposição de coluna com dado real, só a largura da tabela. Sem
regressão em 1440x900: as duas tabelas seguem 1134/1134/1134, preenchendo o card.

Desvio do "achado de wrapper corrige-se no wrapper": o remédio é pontual (`pt` por tabela), não a
correção do default em `AppDataTable/style.ts` — a ficha `D-65`/item 23
(`frontend-tabelas-reserva-e-rolagem`, `docs/superpowers/backlog.md`) é quem varre as 12 tabelas do
débito, e a forma já estava provada num irmão (`RedatoresTable`), o que o critério mecânico do plano
autoriza corrigir aqui. Nota deixada na ficha `D-65` para o item 23 não repetir `UsersTable` e
`RolesTable` na varredura.

**UI-03 — corrigido pela Task 8, não por esta run:** o item 16 ligou `scrollable` na régua de abas de
`AdministracionPage` com estes números (`f80b62de`). A tabela desta seção listava, por erro, "ficha
`D-*` (Task 10)" como destino — corrigido acima; nenhuma ficha nasce daqui.

**UI-04 — não corrigido nesta run**, por triagem `B`/composição de UMA tela sem forma provada num
irmão: destino é a ficha `D-71` (`docs/superpowers/backlog.md`), escrita pela Task 10.

**Dois follow-ups de review da Task 7, registrados aqui para o rastro ficar num lugar só:**
`1b26b070` fez o guard de largura mínima da tabela vazia voltar a vencer o `pt` do chamador, e
`b4102fd1` cobriu com teste o título do `RoleDialog` e as opções de role do `StaffUserDialog` — os
dois nascidos da correção do UI-01 e do UI-02 acima.

Zero `C` aberto ao fim desta run: 2 corrigidos (UI-01, UI-02).
