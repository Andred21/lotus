# Bloco 46 — Ajustes de interface, lote 1 (spec)

**Classificação:** bounded. **Data:** 2026-11-01. **Fonte:** ficha 46 do `backlog.md` e os sete
tickets em `tickets/` (06 e 07 entraram na revisão da spec, 2026-11-01), ditados pelo João mudança a mudança e conferidos no código. Esta spec não
reabre nenhuma decisão dos tickets: registra o que foi decidido, fixa o que eles deixam ao
construtor e diz onde cada mudança mora.

## 1. Por que

O João levantou, usando o sistema, três incômodos de leitura: o corpo do diálogo nasce colado ao
header e longe do footer; título de seção, label e valor saem com o mesmo peso e quase a mesma
cor; e as tabelas têm ações de linha em ordem diferente da esperada, encostadas à direita e sem
dica. Somam-se a isso a ordem e a ordenação de Presupuestos, a largura dos diálogos grandes, que
encolheu no bloco 43, o mesmo respiro colado na aba Configuración › Certificados e a assinatura
que some sobre o xadrez escuro.

Sucesso é o João abrir Cliente, Perfil, Redactores e Presupuestos e ler a tela sem tropeçar nesses
pontos. Fracasso, mesmo funcionando: quebrar o nome acessível de algum campo, criar rolagem
horizontal na página (pela dica ou pela largura nova) ou trazer a marca para um lugar que não é
título de seção de formulário.

## 2. Objetivos

| # | Ticket | Onde mora |
|---|---|---|
| M1 | 01 — respiro simétrico do diálogo | `shared/ui/AppDialog/style.ts` |
| M2 | 02 — hierarquia seção × label × valor | `shared/ui/SectionLabel`, `FormSection`, `FormField` |
| M3 | 03 — ações de linha: ordem, centro, dica | `shared/ui/RowActions`, `ArchiveRowActions`, adaptadores das features |
| M4 | 04 — Presupuestos: mais novo primeiro e ordenação | `features/commercial/components/Budget/BudgetsTable.tsx` |
| M5 | 05 — `lg` mais largo, Curso em `lg` | `shared/ui/AppDialog/style.ts`, `features/catalog/components/Course/CourseDialog.tsx` |
| M6 | 06 — respiro em Configuración › Certificados | `app/pages/Administracion/ConfiguracionTab.tsx` |
| M7 | 07 — fundo da assinatura sempre claro | `shared/ui/AppSignatureUpload/checkerboard.ts`, `shared/styles/brand-theme.css` |

Os critérios de aceite são os dos tickets, um a um; a spec não os repete.

## 3. Não-objetivos

- Nada de backend, schema, DTO ou `generated.ts`. A ordenação de Presupuestos é no navegador.
- Ordenação em outras tabelas além de Presupuestos.
- `ConfirmDialog` (moldura própria) não muda.
- `fieldLabelClass` (o `<dt>` de `CertificateFolio`, validação e `IssuedDialog`) não muda: é outra
  peça, não a label do `FormField`.
- `SectionLabel` fora do `FormSection` (Dashboard, Sidebar, cartões de operation,
  `BudgetDocumentUploadDialog`) continua na tinta de corpo. Ver D2.
- `sm` e `md` do `AppDialog` não mudam de largura.
- `AppTabView` não muda: as abas Usuarios e Roles y permisos são tabelas de borda a borda, e o
  `p-0` do `panelContainer` é delas.

## 4. Decisões

### D1 — Reversão da D1/P-36 (decisão do João, 2026-11-01)

A D1 do audit de 2026-08-26 tirou a tinta de marca do título de seção, por dois motivos: o celeste
media 2,77:1 sobre o humo, e pintava sete papéis na mesma dobra de `/perfil`. O João reverte essa
decisão para o título de seção de formulário, com o celeste `--primary-color` (`#25a5e4`) — a cor
do código Scap na tabela de Presupuestos — **nos dois temas**. No escuro ele passa o AA. No claro
fica abaixo dele (2,77:1 no card branco, 2,53:1 no humo): o João foi avisado na revisão da spec,
escolheu o celeste também no claro em vez do degrau 700 do `--brand-ink`, e aceita o contraste
como decisão dele (2026-11-01). O motivo de ambiguidade também é aceito em troca da hierarquia. A
medição dos dois temas entra na prova do bloco, com o número, para o próximo audit não reabrir a
ficha sem ler esta linha. Os testes do `FormSection` e do
`SectionLabel` que travavam a D1 são reescritos para a regra nova, e os docblocks que a explicam
passam a contar a reversão, com data e autor. Esta seção é o registro da reversão no bloco.

### D2 — Marca só no `FormSection` (minha decisão)

O ticket 02 nomeia o `FormSection`. O `SectionLabel` ganha uma prop de tinta (`tone: 'body' |
'brand'`, default `body`) e o `FormSection` passa `brand`: título em `var(--primary-color)` e
linha em `var(--section-rule)` (D3). Assim a marca chega a todo formulário
do produto (diálogos, Perfil, login) pela fonte, e as faixas de Dashboard, Sidebar e cartões
seguem como estão. O teste do `SectionLabel` trava o default `body` e a variante `brand`; o do
`FormSection` trava `brand` e a linha ligada.

### D3 — Linha contínua no `FormSection`, no tom do título e mais clara

O `FormSection` deixa de passar `rule={false}`. A hairline segue `h-px` contínua; no tom `brand`
ela troca o `--surface-border` por um token novo do `brand-theme.css`, `--section-rule`, que é o
`--primary-color` misturado com transparência (`color-mix(in srgb, var(--primary-color) 35%,
transparent)` — minha decisão; o percentual se ajusta no navegador). Transparência, e não um degrau
mais claro da rampa, porque vale nos dois temas: no claro sai um celeste pálido, no escuro um
celeste apagado, e nos dois a linha fica abaixo do título. O tom `body` mantém o `--surface-border`.
Token, e não `color-mix` no `style`, porque a catraca `COR_LITERAL_EM_STYLE` só aceita valor que
comece por `var(`.

### D4 — Label e valor do `FormField`

Label: `text-sm font-medium` em `--text-color` (hoje `text-sm` em `--text-color-secondary`).
Valor de leitura (`ReadOnlyValue`): `text-sm` regular em `--text-color` (já é assim; o teste
passa a travar). O `htmlFor`, o `id` e o nível de heading de cada seção não mudam.

### D5 — Respiro simétrico, no diálogo e em Configuración › Certificados (valor: minha decisão)

O conteúdo do `AppDialog` passa a ter o mesmo respiro em cima e embaixo, `1.5rem` (`pt-6 pb-6`),
igual ao padding lateral do Lara — o corpo fica emoldurado igual nos quatro lados. Substitui o
`pt-2` de cima e sobrescreve os 2rem de baixo do Lara. Os `py-3` do footer ficam. Se a medição no
navegador mostrar que o primeiro filho de algum diálogo traz margem própria que quebra a simetria,
o ajuste é nesse filho, não na moldura.

A aba Configuración da administração (ticket 06, pedido do João na revisão da spec) recebe o
mesmo `1.5rem` em todo o contorno: `p-6` no grid do `ConfiguracionTab`, que leva junto a
navegação lateral. Fica na aba, não no `AppTabView` (ver Não-objetivos).

### D6 — Ações de linha

- **Ordem:** `ArchiveRowActions` monta ver → `leading` (as ações próprias da feature) → arquivar.
  A prop `leading` passa a se chamar `extra`, porque "leading" mentiria sobre a posição (minha
  decisão); os adaptadores que a usam mudam junto. O menu colapsado herda a ordem do
  mesmo array.
- **Centro:** `RowActions` troca `justify-end` por `justify-center`, nas duas formas (botões
  soltos e gatilho do menu). O botão "Restaurar" de `ArchiveRowActions` também fica centralizado
  na célula.
- **Dica:** sai a prop `tooltip` de `RowAction`; todo botão solto mostra o próprio `label` como
  dica, habilitado ou não (o caminho do `span` envolvente vira o caminho de todo botão
  desabilitado). O "Restaurar" só-ícone da coluna colapsada também ganha a dica; o
  "Restaurar" com rótulo visível não precisa dela e fica sem (minha decisão). A posição
  `left` fica (evita rolagem horizontal). Os rótulos já chegam traduzidos; nenhuma chave nova de
  i18n é esperada — se alguma ação sem rótulo traduzido aparecer, ganha chave nos três idiomas
  (es-CL, en, pt-BR).
- Tabelas que montam ações direto (Emisión, Historial, matrículas, Turma): confirma-se que já
  seguem ver → próprias → destrutiva; ajusta-se a que não seguir.

### D7 — Presupuestos

- **Ordem padrão:** as linhas chegam à tabela já ordenadas por `id` decrescente (o `id` é o
  número do Scap). Com o `removableSort` do `AppDataTable`, o terceiro clique num cabeçalho volta
  a essa ordem.
- **Código:** coluna `sortable` pelo `id`, numérica.
- **Estado:** `sortFunction` pela posição no negócio, `pending` < `approved` < `rejected`, igual
  nos três idiomas (não pelo texto traduzido). Orçamento sem estado vai para o fim, nos dois sentidos da ordenação (minha decisão).
- **Cotizaciones:** `sortFunction` por `quotes.length`.
- Visão de arquivados: mesma tabela, mesmas regras; o critério é não quebrar.

### D8 — Largura do `lg` e Curso

`lg`: `w-[95vw]`, `sm:w-[85vw]`, `lg:w-[70vw]`, `max-w-[84rem]`, e o maximizado solta o teto como
hoje. `sm` e `md` mantêm `w-[95vw]` e os tetos atuais (32rem e 48rem). O `CourseDialog` passa de
`size="md"` para `size="lg"` e ganha o maximizar pela regra existente do `AppDialog`.

### D9 — Fundo da assinatura sempre claro (tons do escuro: minha decisão)

O `signatureCheckerboard` passa a ler dois tokens novos do `brand-theme.css`, `--signature-bg-a` e
`--signature-bg-b`. No claro valem o que o xadrez usa hoje (`--surface-border` e
`--surface-card`), sem mudança visível. No escuro valem `--primary-200` (`#c2e6f7`) e
`--primary-300` (`#96d4f2`): azul claro, não branco, e o traço escuro da assinatura aparece. Os
dois degraus se confirmam no navegador; se o quadro ficar forte demais na tela escura, desce para
`--primary-100`/`--primary-200`. Vale para a prévia do `AppSignatureUpload` (Perfil, Redactor) e
para a assinatura já enviada em Configuración › Certificados, que importam o mesmo xadrez.

## 5. Restrições

- Leis do §5 do `CLAUDE.md`: feature não importa PrimeReact nem outra feature; cor só por
  variável do tema em `style` (ADR-16, `frontend-estilizacao.md`); as catracas do
  `eslint.config.js` (`ACAO_SEM_ANCORA`, `ACAO_SEM_COLAPSO`, `COR_LITERAL_EM_STYLE` e as demais)
  continuam verdes sem exceção nova.
- Testes do `AppDialog`, `RowActions`, `SectionLabel`, `FormSection`, `FormField` e do xadrez da
  assinatura travam cada regra nova; teste de `BudgetsTable` (ou da função de ordenação extraída) trava a ordem padrão,
  a numérica do código e a de estado.
- DoD: `pnpm build`, `pnpm lint` e `pnpm test` verdes, e cada critério dos tickets provado no
  navegador, no stack da lane (offset +3), nos temas claro e escuro onde o ticket pede.

## 6. Deixado ao construtor

- Se a ordenação de Presupuestos vira função pura em `features/commercial/lib/` (testável sem
  render) ou fica na tabela.
- A forma de travar em teste a largura responsiva do `lg` (classes no root, como o teste atual).
- A ordem das tasks: M1 e M5 tocam o mesmo `style.ts`, e M2 e M7 o mesmo `brand-theme.css`;
  esses pares não correm em paralelo.

## Verificação externa

Nenhuma. O bloco cobre só ajustes de interface no frontend, provados no stack local da lane.
`efeito_externo: nao`.
