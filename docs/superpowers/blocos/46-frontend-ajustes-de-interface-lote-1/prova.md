# Bloco 46 — prova na tela

Stack da lane (offset +3: Vite :5176, nginx :8083), banco do seed local, admin `admin@lotus.cl`.
Medido em 2026-11-01 com Playwright (Chromium 1248), por `getComputedStyle` e
`getBoundingClientRect`; interface em `en`.

## Ticket 01 / 05 — moldura do diálogo, `lg` e Curso

- Respiro do corpo: `padding` 24px / 24px / 24px (topo / base / lado) no Cliente, nos dois temas.
  Com rolagem (1440), primeiro filho a 24px do topo e último a 24px da base; sem rolagem (1920 e
  2560), 24 / 24. O `pt-6 pb-6` vence o Lara na cascata — o `pb-6!` não foi preciso.
- Largura do `lg` (Cliente e Curso): 1440 → 1008px; 1920 → 1344px; 2560 → 1344px (teto 84rem);
  390 → 371px (95vw).
- Maximizar o Cliente em 1440: 1440px (teto solto); restaurar: volta a 1008px.
- Curso abre em `lg`: 1008px em 1440 e 1344px em 1920. Tem o botão de maximizar em leitura e em
  edição; em edição, maximizado 1440px e restaurado 1008px, respiro 24 / 24 nos três, sem
  rolagem horizontal na página nem no corpo.
- Cliente novo (`lg`, criação): 1008px, 24 / 24.
- `md` igual a antes: Usuario e Rol abrem em 768px (48rem), 24 / 24.
- Não medidos no navegador: `sm` (nenhum diálogo `sm` alcançável com o dado local) e os diálogos de
  certificação (Emisión e Historial sem linhas; a amostra do Curso abre em aba, não em diálogo).
  Ficam pelos testes do `AppDialog` (degraus do `lg` ausentes em `sm`/`md`; corpo `pt-6 pb-6`).
  O confirmar de arquivar é `ConfirmDialog` do Prime, fora do `AppDialog`, e ficou como era.

## Ticket 02 — hierarquia seção × label × valor (Cliente, leitura e edição)

- Título de seção: `rgb(37, 165, 228)` (`--primary-color`), 12px / 600, nos dois temas.
  Contraste sobre `--surface-card`: **claro 2,77:1** (abaixo do AA, aceito pelo João na spec D1);
  **escuro 5,28:1**.
- Linha da seção: `color(srgb 0.145 0.647 0.894 / 0.35)` (`--section-rule`), 1px, nos dois temas.
- Label: 14px / 500 na tinta de corpo — claro `rgb(51, 65, 85)` (10,35:1), escuro
  `rgba(255,255,255,0.87)` (14,63:1). Valor de leitura: 14px / 400, mesma tinta.
- Perfil: label 14px / 500 — escuro `rgba(255,255,255,0.87)`, claro `rgb(51, 65, 85)`.
  Login: 14px / 500 — claro `rgb(51, 65, 85)`, escuro `rgba(255,255,255,0.87)`.

## Ticket 03 — ações de linha (1440 e 390)

- Ordem ver → próprias → arquivar e folga esquerda/direita na célula (px), em 1440:
  - Clientes: View 23 / Archive 22.
  - Presupuestos: View 33 / 32.
  - Cursos: View, View sample certificate, Archive — 21 / 20.
  - Redactores (Instructors): View, Resend invitation, Archive — 21 / 20.
  - Clases (Operación): View, Archive — 23 / 22.
  - Usuarios: View, Archive — 23 / 22.
- Dica no hover do último botão: aparece em todos os casos acima, classe `p-tooltip-left`,
  borda direita a ~92px da borda da janela; `scrollWidth − innerWidth` = 0.
- 390px, colapsado: gatilho centrado (Cursos 13 / 12, Redactores 17 / 16); menu na ordem
  `View, View sample certificate, Archive` e `View, Resend invitation, Archive`; sem rolagem
  horizontal.
- Arquivados (um cliente arquivado pela UI e restaurado depois): em 1440 o "Restore" rotulado fica
  centrado (25 / 24); em 390 o só-ícone mostra a dica "Restore" com `p-tooltip-left`, sem rolagem.
- Não medido no navegador: botão desabilitado (Emisión e Historial sem linhas no banco local) e
  matrículas arquivadas (sem dado). Os dois ficam cobertos pelos testes de `RowActions`
  (`p-tooltip-left` também no desabilitado).
- Alumnos (Personas › Students) e Roles: passaram ao `RowActions` na onda de correção final
  (ruling, "toda tabela do produto" no ticket 03). Remedido depois dela: View 33 / 32 nas duas,
  dica `p-tooltip-left`; as demais tabelas mantiveram as mesmas folgas com o `span` estável.
- O desabilitado usa o mesmo `DICA` à esquerda medido no habilitado; os rótulos existem nos três
  locales (medida feita só em `en`).

## Ticket 04 — Presupuestos

- Abre no mais novo: `Scap 6, 5, 4, 3, 2, 1`.
- Código: 1º clique crescente (1→6), 2º decrescente, 3º volta à ordem padrão.
- Cotizaciones: crescente `1,1,1,1,1,3`, decrescente `3,1,…`; 3º clique volta ao padrão.
- Estado: ordena e volta, mas o banco local só tem `Approved`. Três e quatro dígitos
  (`Scap 999` antes de `Scap 1000`) e a ordem Pendiente → Aprobada → Rechazada com sem-estado no fim
  ficam provados pelos testes de `budgetOrder` e `BudgetsTable.ordem`.
- Os três cabeçalhos levam `aria-sort`.

## Ticket 06 — Configuración › Certificados

- Grid da aba com `padding` 24px nos quatro lados, nos dois temas; a navegação lateral fica a
  24px do topo e da esquerda, em 1440 e em 390, sem rolagem horizontal.
- Usuarios segue de borda a borda: tabela encostada no painel (`padding` 0), em 1440 e 390.

## Ticket 07 — fundo da assinatura

- Escuro: xadrez `#96d4f2` / `#c2e6f7` (`--primary-300` / `--primary-200`); a assinatura (traço
  preto) fica legível, lida em Administración › Settings › Certificates. Mantido 300/200, sem descer para 100/200.
- Claro: `#dfe7ef` / `#ffffff`, o xadrez de antes.
- Perfil do admin não tem campo de assinatura e o banco local não tem Redactor com assinatura: a
  prévia do Redactor não foi medida; usa o mesmo `AppSignatureUpload`, coberto pelo teste do xadrez.

## Gate

`pnpm build` ok (só o aviso de chunk pré-existente); `pnpm lint` limpo; `pnpm test` 199 arquivos,
1439 testes (depois da onda de correção final), todos passando. O cliente arquivado para a medida foi restaurado (`deleted_at` nulo).
