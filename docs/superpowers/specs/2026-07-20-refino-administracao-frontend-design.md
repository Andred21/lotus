# Bloco 5.4 · Refino frontend Administração — Design

**Data:** 2026-07-20 · **Status:** Ativo · **Escopo:** frontend-only (zero backend, zero regen de tipo)

## Origem

Achados aprovados do `/revisar-frontend` + `/revisar-ui` sobre a feature `identity/Admin`
(Blocos 5.2a Usuarios + 5.2b Roles y Permisos). Molde: Bloco 1 (Refino Sprint 2) e Bloco 5.3
(Refino frontend Comercial) — refino C+B de sprint entregue, sem mudar comportamento de negócio.

O `/revisar-frontend` (eixo código) achou a feature **aderente** — nada estrutural. Os itens abaixo
saem do `/revisar-ui` (eixo visual/UX) mais um item de estado-de-erro que tangencia peso legal.

## Escopo — 5 itens

| Id | Tipo | Alvo |
|----|------|------|
| C-1 | estado de erro | `FormErrorSummary` em `RoleDialog` + `StaffUserDialog` — 422 sem campo mapeado deixa de sumir |
| C-2 | consistência | Toolbar contextual por aba em `AdministracionPage` (espelha `CommercialPage`) |
| C-3 | label es-CL | Grupos de permissão via `permGroup.*` i18n (fim do slug inglês cru) |
| B-1/ui | afordância | Campo "Tipo" no `StaffUserDialog`: input disabled → `AppTag` |
| (b) | label es-CL | Descrições de permissão via `perm.*` i18n (fim do texto PT do backend na UI) |

## Fora do escopo (registrado, não entra)

- **Q-1 backend** — auditoria de pivot de roles/permissões sem `auditSync` (`syncRoles`/`syncPermissions`
  em model Auditable não grava `audits`). Reincidente desde a Sprint 1 (`courses()->sync`). Decisão
  separada do João (auditar via `auditSync` vs. aceitar-e-registrar) — não é frontend, não entra aqui.
- Minors registrados de 5.2a/5.2b e o leak `GET /api/roles` (permissions[] a quem tem `user.view`) —
  já no backlog do `progress.md`.
- **B-1/revisar-frontend** (clonar `role.permissions` no `useRoleForm`) — **falso achado, dropado**:
  `useEntityForm` já tem `structuredClone` como default (`toFields = (e) => structuredClone(e)`), então
  `useRoleForm` já clona. Não se toca em `useRoleForm` nem em `useStaffUserForm`.

## Decisões de design

1. **Chave i18n do (b) = underscore transform.** Nomes de permissão têm ponto (`identity.user.view`)
   e o `keySeparator` do i18next é `.` (config default em `shared/config/i18n.ts`, namespace único
   `translation`), então `t('perm.identity.user.view')` tentaria aninhar 4 níveis e falharia. Solução:
   chave plana com ponto→underscore. Bloco `perm` plano, fácil conferir as 3×35 chaves idênticas por
   script, transform de 1 linha no render. (Aninhar por segmento duplica a hierarquia do catálogo e
   dificulta o diff; override de `keySeparator` no `t()` é frágil — ambas rejeitadas.)

2. **Autoria dos 105 rótulos (35 permissões × 3 idiomas):** PT = cópia literal das descrições que já
   existem em `PermissionCatalog::descriptions()`; es-CL + en traduzidos pelo agente; **o João revisa o
   es-CL na execução** (es-CL é a referência de vocabulário — cliente chileno).

3. **`PermissionData.description` do backend fica** (frontend-only). Deixa de ser renderizado; vira
   dev-facing. Não fere a lição 13 ("descrição não se duplica") porque o único outro consumidor do
   catálogo, o `RolePermissionSeeder`, só lê `array_keys()` — nunca exibe a descrição. Adiciona-se um
   comentário em `PermissionCatalog` marcando que o texto user-facing agora mora nos locales
   (doc-only, não é mudança de comportamento; permitido no escopo frontend).

## Detalhe por item

### C-1 — FormErrorSummary (estado de erro)

`useMutationErrors` põe todo mapa `errors` de um 422 em `fieldErrors` e deixa `generalError = null`;
logo `FormErrorBanner` não mostra nada num 422. Hoje `RoleDialog` só tem `FormField` ligado a `name`,
então um 422 keyed `permissions` (de `PermissionCatalog::assertAssignable`) ou `permissions.0` (do DTO
`Rule::notIn`/`exists`) **renderiza em lugar nenhum**: o botão para de girar, o diálogo fica aberto,
zero mensagem. Molde da correção: `ClientDialog` (que usa `FormErrorSummary` exatamente para 422 sem
campo onde pendurar).

- `RoleDialog`: importar `FormErrorSummary`; após o `FormErrorBanner`, `<FormErrorSummary errors={fieldErrors} mapped={['name']} />`.
- `StaffUserDialog`: idem, `mapped={['name','rut','email','password','role']}`.
- **Critério de aceite (provado, não build):** criar role com nome que já existe → a mensagem
  "Já existe uma role com esse nome." aparece na tela (antes: save mudo).

### C-2 — Toolbar contextual (consistência)

`AdministracionPage` fura o molde de módulo tabbed do `CommercialPage` (unificado no commit `b883b6b`):
hoje "Nuevo usuario" é fixo no header (tab-agnóstico) e "Nuevo rol" é um botão solto dentro da aba
Roles — dois botões de criar na aba Roles, com escopos diferentes. Alvo = espelhar `CommercialPage`:

- `const [tab, setTab] = useState(0)`; `const onRoles = tab === 1`.
- `<ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>`.
- Header `actions` = contextual: `canManage ? (onRoles ? <Nuevo rol> : <Nuevo usuario>) : null`.
- Remove o `<div className="flex justify-end">` + botão de dentro da aba Roles; `RolesTable` fica
  direto na aba (simétrico ao `UsersTable`).
- A aba Roles só monta com `canManage`, então `tab===1` só é alcançável por superadmin — consistente.
- **Critério de aceite:** aba Users → header "Nuevo usuario"; aba Roles → header "Nuevo rol", sem
  botão duplo.

### C-3 — Grupos de permissão i18n (label es-CL)

`RoleDialog` renderiza `{group}` com `capitalize` — o grupo é o slug de domínio (`identity`,
`commercial`, `catalog`, `operation`, `certification`, `feedback`), então um usuário chileno vê
"Identity", "Feedback", "Operation" numa UI es-CL. `permGroup` está ausente dos 3 locales.

- Adiciona `permGroup.{identity,commercial,catalog,operation,certification,feedback}` aos 3 locales
  (chaves idênticas). es-CL: Identidad / Comercial / Catálogo / Operación / Certificación /
  Retroalimentación (João revisa). Grupo é palavra só (sem ponto) → lookup nativo seguro.
- `RoleDialog`: `{group}` → `t(\`permGroup.${group}\`)`; remove `capitalize` (o locale controla a caixa).

### B-1/ui — Campo Tipo (afordância)

`StaffUserDialog`: o campo "Tipo" é um `AppInputText disabled` só pra exibir a constante "Admin" —
parece campo editável acinzentado. Alvo: `<AppTag value={t('admin.typeAdmin')} severity="info" />`
(sinaliza "atributo fixo", não "campo editável desligado"). Importar `AppTag` do barrel `@shared/ui`.

### (b) — Descrições de permissão i18n (label es-CL)

O picker mostra `p.description`, vindo de `PermissionCatalog::descriptions()` hardcoded em PT, numa UI
es-CL. Alvo:

- Bloco `perm` plano nos 3 locales; chave = `p.name` com `.`→`_` (ex.: `identity_user_view`);
  35 entradas × 3 idiomas = 105 rótulos.
- `RoleDialog`: `<span>{p.description}</span>` → `<span>{t(\`perm.${p.name.replaceAll('.', '_')}\`)}</span>`.
- Backend `PermissionData.description` fica (dev-facing) + comentário dev em `PermissionCatalog`.
- **Critério de aceite:** picker em es-CL mostra as descrições em espanhol; trocar idioma reflete.

## DoD / verificação

Gate mínimo (lei §8 — build verde não é aceite):

1. `pnpm build` + `pnpm lint` verdes.
2. Chaves idênticas nos 3 locales conferidas por script (top-level, `permGroup`, `perm`).
3. **Verificação visual no `pnpm dev`** das 2 telas — as 4 provas de aceite acima olhadas de fato:
   erro visível ao duplicar nome de role (C-1), header por aba (C-2), grupos e descrições em espanhol
   (C-3/b), campo Tipo como tag (B-1/ui).

## Lições aplicadas

- **Lição 11** (regen de tipo ajusta consumidores no mesmo commit) — **N/A**: (b) não regenera, o DTO
  fica intacto; só o render muda.
- **i18n (rule frontend-fsliced):** 3 locales com chaves idênticas; es-CL é a referência de rótulo.
- **Estado de erro inequívoco (peso legal):** C-1 é o item de maior peso — molde `NestedField`/
  `FormErrorSummary` existe justamente porque "422 fora dos campos visíveis some e o botão parece inerte".
