# Revisão de UI — Certificados (`/certificados` e `/validar/:uuid`)

**Data:** 2026-08-25 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/certification/components/` (índice com duas abas + tela
pública de validação) · **Base:** `refactor/frontend-revisao-ui-f2` @ `07728d15`
**Evidência bruta:** `.artifacts/ui-review/2026-08-25-1910-certificados/` (9 capturas + `report.txt`,
coberta pelo `.gitignore`)

> Run 2 da fatia 2 do item 16 (`frontend-revisao-ui-por-modulo-f2`), Task 9 do plano
> `2026-08-25-frontend-revisao-ui-por-modulo-f2.md`. Papel **admin** — Certificados é módulo de
> admin (D1 da spec). A run correu **depois** da Task 8 de propósito: o achado de wrapper da run 1
> (UI-01 de Comercial, `AppCardToolbar`) já estava pago, então ele não podia ocupar dois relatórios.
>
> A §2 é o `report.txt` verbatim. A §3 é o que foi feito com ele na Task 10 e **não** faz parte do
> relatório.

## 1. Escopo e limites da run

- Papel: **admin** (`admin@lotus.cl`), sessão real criada pela tela de login. Sessão Playwright
  própria (`f2-certificados`), separada da `f2-comercial` da run 1.
- Chromium **empacotado** (`--browser=chromium`): esta máquina não tem `/opt/google/chrome/chrome` e
  o canal default falha com `Chromium distribution 'chrome' is not found`. Limitação de ambiente,
  não da run.
- Alvo: SPA em `http://localhost:5175` e API em `http://localhost:8082` — portas do offset +2 desta
  árvore (Task 1 do plano).
- Read-only: nenhuma mutação. Selecionar turma, trocar de aba, digitar na busca e alternar tema são
  estado de interface. `git status --short` vazio antes e depois, mesmo branch, mesmo commit
  (`07728d15`).
- Viewports percorridos: `1440x900`, `1024x768` (só a medição da régua de abas) e `390x844`.
- Idioma: **es-CL**, referência de rótulo do cliente chileno. A sessão nasceu em EN (perfil efêmero)
  e a troca foi feita pelo `localStorage` (`lotus-lang`), porque o popup do menu de idioma não
  aparece no snapshot do CLI. Preferência de interface no perfil efêmero da revisão, não dado de
  negócio.
- Tema: claro e **escuro** (o escuro exercitado no Historial, captura 09).
- A tela pública `/validar/:uuid` foi alcançada com um UUID inexistente, de propósito: a base de
  demonstração tem **0 certificados emitidos**, e emitir um seria mutação. Só o estado
  `no encontrado` é alcançável sem escrita — os estados `válido`, `revocado` e `vencido` ficam
  declarados não testados.
- A **falta de dados** é o maior limite desta run: o Historial está vazio, então lista com linhas,
  busca com resultado, filtro de estado com efeito, paginação, diálogo de visualização, reemissão e
  revogação não foram observados. Nada foi classificado a partir deles.

## 2. `report.txt` — verbatim

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Certificados — `/certificados` (abas Emisión e Historial) + `/validar/:uuid` em leitura, papel admin
Local URL: http://localhost:5175 (API http://localhost:8082 — árvore `../fix-frontend`, offset +2)
Branch/commit: refactor/frontend-revisao-ui-f2 @ 07728d15
Date/time: 2026-08-25 16:10–16:20 (America/Santiago -03)
Agent: Claude Opus 5 (1M) — Claude Code
Playwright CLI: @playwright/cli, sessão `f2-certificados`, chromium empacotado (`--browser=chromium`; o canal `chrome` não existe nesta máquina)
Chrome DevTools: complementary_unavailable
Git working tree before/after: limpo / limpo (`git status --short` vazio nos dois momentos)

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Índice, aba Emisión sem turma | 1440x900 | — | 390x844 | 01-emision-1440x900.png, 06-emision-390x844.png |
| Emisión com turma selecionada (13 alunos) | 1440x900 | — | 390x844 | 02-emision-turma-selecionada-1440x900.png, 03-emision-tabla-1440x900.png, 07-emision-turma-390x844.png |
| Aba Historial, lista vazia + busca + filtro de estado | 1440x900 | — | 390x844 | 04-historial-vacio-1440x900.png, 05-historial-390x844.png |
| Régua de abas nos três viewports | 1440x900 | 1024x768 | 390x844 | medição de `scrollWidth`/`clientWidth` do `[role=tablist]` |
| Validação pública, certificado inexistente | 1440x900 | — | — | 08-validar-no-encontrado-1440x900.png |
| Tema escuro (Historial) | 1440x900 | — | — | 09-historial-oscuro-1440x900.png |

## Technical signals
Console: 2 mensagens na sessão pós-login. A de nível info é o convite do React DevTools, esperada em dev. O único ERROR é `Failed to load resource: the server responded with a status of 404 (Not Found) @ http://localhost:8082/api/publico/certificados/00000000-…` — o 404 da URL de validação inventada de propósito para alcançar o estado "no encontrado" sem mutação. Nenhum erro na jornada autenticada.
Network: `GET /api/me` 200, `GET /api/turmas?...` 200, `GET /api/certificados` 200, `GET /api/publico/certificados/{uuid}` 404 (esperado, autorização pública sem registro). Nenhum 5xx; nenhuma repetição inesperada.
Performance: nenhuma medição tomada — nenhuma alegação de performance neste relatório.
Untested states: emissão de fato (é escrita — a run é read-only), reemissão e revogação, Historial com dados (a base de demonstração tem 0 certificados emitidos, então lista com linhas, busca com resultado, filtro por estado com efeito e paginação ficam declarados NÃO testados), `loading`, erro de carga, e as variantes `válido`/`revocado`/`vencido` da tela pública, que exigiriam certificado emitido.

## Findings
### UI-01 — o filtro de estado do Historial não tem nome, visual nem acessível
Classification: B
Surface/journey: `/certificados`, aba Historial, dropdown à direita do campo de busca.
Viewport: 1440x900 (independe do viewport)
Reproduction: abrir a aba Historial e ler o DOM do `.p-dropdown`: `{aria:null, lby:null, labels:0, prevText:null}` — nenhum `aria-label`, nenhum `aria-labelledby`, nenhum `<label>` na página inteira e nenhum texto adjacente. O único texto exposto é o VALOR corrente ("Todos"), e o botão que abre a lista aparece no snapshot SEM nome nenhum (`button [ref=f3e82]`).
Evidence: 04-historial-vacio-1440x900.png (o dropdown lê apenas "Todos"); leitura de DOM citada acima; snapshot da aba Historial.
Observed fact: o controle é operável, mas não expõe nome — nem para leitor de tela, nem visualmente.
Inference: é a TERCEIRA ocorrência do mesmo defeito — UI-07 da run de Operação (2026-08-23, corrigido no `TurmaStatusFilter`) e UI-02 da run de Comercial (2026-08-25, corrigido no `BudgetStatusFilter`). Aqui o filtro nem é componente próprio: é o literal `filterSlot={<div className="w-48"><AppDropdown …/></div>}` dentro do `HistorialTable.tsx:35-44`, a mesma forma que as outras duas telas tinham.
Impact: quem usa leitor de tela ouve "Todos, combo box" sem saber o que filtra; quem enxerga precisa abrir a lista para descobrir. A jornada não trava — a busca por texto continua disponível —, e por isso é B, na mesma classe dos dois irmãos.
Recommendation: repetir a forma já provada duas vezes — `useId` + `<label htmlFor>` + `inputId` no `AppDropdown`. A chave `certificate.colStatus` ("Estado") já existe nas 3 locales, titulando a coluna; não é preciso texto novo.
Rule/reference: rubrica eixo 6 (condição B) e eixo 7 (consistência com telas irmãs); `HistorialTable.tsx:35-44` contra `TurmaStatusFilter.tsx:37-51` e `BudgetStatusFilter.tsx:43-58`.

### UI-02 — o seletor de turma da Emisión se apoia no placeholder para ter nome
Classification: B
Surface/journey: `/certificados`, aba Emisión, dropdown "Selecciona una turma concluida…".
Viewport: 1440x900 (independe do viewport)
Reproduction: ler o DOM do `.p-dropdown` da aba Emisión: `{aria:null, lby:null, inpAria:null, inpLby:null, labels:[]}` — não há `<label>` nem atributo de rótulo. O nome acessível existe, mas vem do PLACEHOLDER, que o PrimeReact usa como texto do botão que abre a lista: o snapshot mostra `button "Selecciona una turma concluida..."` antes e DEPOIS de a turma ser escolhida.
Evidence: 01-emision-1440x900.png e 02-emision-turma-selecionada-1440x900.png; snapshots das duas situações.
Observed fact: o controle tem nome acessível estável ("Selecciona una turma concluida…"), mas nenhum `<label>` associado, e no visual não existe rótulo — só o placeholder, que some assim que há seleção.
Inference: é o mesmo `<div>` com `AppDropdown` solto do UI-01, com a diferença de que aqui o placeholder salvou o nome acessível por acidente de implementação do PrimeReact, não por desenho. Depois da seleção o campo passa a mostrar só o VALOR, e nada na tela diz que aquilo é a turma — o texto abaixo repete o nome da turma, não o papel do campo.
Impact: menor que o UI-01 — a jornada termina e o leitor de tela tem o que anunciar. O custo é de consistência: as três telas irmãs de filtro passam a ter par rótulo+`inputId` e esta fica dependendo de um placeholder para o mesmo efeito.
Recommendation: mesmo par rótulo visível + `inputId`. A chave `certificate.turmaConcluida` ("Turma concluida" / "Turma concluída" / "Completed class") já existe nas 3 locales e hoje não é usada em lugar nenhum do código.
Rule/reference: rubrica eixo 7 (condição B); `EmissionPanel.tsx:31-38` contra `TurmaStatusFilter.tsx:37-51`.

### UI-03 — o motivo que desabilita a emissão fica longe da ação, e as linhas não o repetem
Classification: B
Surface/journey: `/certificados`, aba Emisión com turma selecionada (Seguridad en alta tensión · Enel Distribución, 13 pendientes).
Viewport: 1440x900
Reproduction: selecionar a turma e olhar a faixa acima da tabela: a tag "El curso no tiene plantilla de certificado" (`EmissionPanel.tsx:62-64`) fica encostada à ESQUERDA, e o botão "Emitir todos los pendientes (13)" (`EmissionPanel.tsx:66-75`), desabilitado por causa dela, fica encostado à DIREITA, com a largura do card entre os dois. Nas 13 linhas, cada botão "Emitir" está desabilitado (`disabled:true`, `p-disabled`, `opacity: 0.6`, `pointer-events: none`) e não carrega `title` nem `data-pr-tooltip` — nenhum texto explica ali por que não dá. Ao rolar até a tabela, a tag sai da viewport (medido: a tag some do quadro em 03-emision-tabla-1440x900.png).
Evidence: 02-emision-turma-selecionada-1440x900.png (tag à esquerda, botão à direita), 03-emision-tabla-1440x900.png (tabela com 13 botões desabilitados e nenhuma menção ao motivo), leitura de DOM dos botões citada acima.
Observed fact: o motivo do bloqueio está na tela uma vez só, num canto oposto ao da ação, e desaparece da viewport exatamente quando a pessoa chega nos controles bloqueados.
Inference: o aviso foi tratado como selo de estado da turma e não como explicação do controle; em 390x844 a mesma pilha empilha e o par fica junto (07-emision-turma-390x844.png), o que confirma que o problema é a régua horizontal do desktop, não o texto.
Impact: a pessoa vê 13 botões inertes e precisa rolar de volta para descobrir o porquê. A jornada de emissão é escrita e está fora desta run, mas o BLOQUEIO é observável em leitura e é o que a tela comunica mal. Não há caminho errado nem controle mentindo estado — por isso B, não C.
Recommendation: aproximar motivo e ação (o aviso ao lado do botão do lote, ou o motivo como tooltip/`title` de cada botão desabilitado). É decisão de composição e de texto da tela, não de wrapper.
Rule/reference: rubrica eixo 1 (condição B) e eixo 5 (estado disabled compreensível).

### UI-04 — a validação pública de um código inexistente responde só com o título
Classification: B
Surface/journey: `/validar/{uuid inexistente}` — rota pública, fora do ramo autenticado.
Viewport: 1440x900
Reproduction: abrir `/validar/00000000-0000-0000-0000-000000000000`. A API responde `404` (esperado) e a tela renderiza um card com uma linha: "Certificado no encontrado". Não há segunda linha, nem orientação, nem link de retorno.
Evidence: 08-validar-no-encontrado-1440x900.png; `ValidationPage.tsx:109-113` (o ramo `notFound` renderiza só o `StatusHeading`, enquanto o ramo `revoked` logo abaixo acrescenta a linha "Revocado el {{date}}").
Observed fact: o estado terminal mais provável para quem escaneia um QR errado é também o único que não diz nada além do título.
Inference: os outros estados da mesma tela têm complemento (data de revogação, vigência) porque têm dado para mostrar; o `notFound` não tem dado, e ficou sem texto de orientação em vez de ganhar um.
Impact: quem valida um certificado é alguém DE FORA (fiscalizador, cliente), sem acesso ao sistema e sem contexto. "No encontrado" sozinho não distingue código digitado errado de certificado inexistente e não oferece próximo passo — numa tela de peso legal.
Recommendation: acrescentar uma linha de orientação ao ramo `notFound`, no mesmo molde de duas linhas que os vazios do app já usam ("Aún no hay certificados emitidos" + dica). O TEXTO é decisão do João: é copy pública, em es-CL, de tela com peso legal — não deve ser inventada por quem revisa.
Rule/reference: rubrica eixo 5 (condição B) e eixo 8; `ValidationPage.tsx:109-113` contra `ValidationPage.tsx:115-124`.

## Summary
A: jornada percorrida sem erro de console na parte autenticada: as duas abas, a seleção de turma com os 13 alunos certificáveis, o vazio do Historial com título+dica e o rodapé de resumo ("0 vigentes · 0 por vencer · 0 vencidos · 0 revocados"), a busca com placeholder próprio, o tema escuro sem perda de contraste aparente (09), e a tabela de alunos em 390x844 rolando DENTRO do contêiner (`.p-datatable-wrapper`, `overflow-x: auto`, `scrollWidth 768` contra `clientWidth 242`) sem estourar o documento (`documentElement.scrollWidth` = 390 = viewport) — contêiner rolável intencional, não vazamento. Teclado: 16 paradas no índice, ordem coerente (aba → controles do painel → skip link → menu → navegação → idioma/tema/usuário) e a régua de abas com uma parada só, trocando de aba por seta e Enter, como manda o padrão de tablist. A régua de abas do módulo não transborda em nenhum viewport medido (974/974 em 1440x900, 718/718 em 1024x768, 276/276 em 390x844), então nada pede `scrollable` aqui.
B: 4 (UI-01, UI-02, UI-03, UI-04)
C: 0
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

Feita na Task 10 do plano, com o mesmo critério da run 1: `C` corrige aqui, um commit por achado,
medido na tela antes e depois; `B` corrige se couber no escopo desta fatia, senão vira ficha `D-*`
no `backlog.md`. Esta run não teve nenhum `C`.

| Achado | Classe | Destino | Commit |
|---|---|---|---|
| UI-01 | `B` | corrigido na tela — `HistorialTable` | `6cba1305` |
| UI-02 | `B` | corrigido na tela — `EmissionPanel` | `d0297221` |
| UI-03 | `B` | ficha no `backlog.md` (Task 12) | — |
| UI-04 | `B` | ficha no `backlog.md` (Task 12) | — |

**UI-01 e UI-02 — corrigidos porque o remédio já estava provado e não exigiu texto novo.** Os dois
ganharam o par `useId` + `<label htmlFor>` + `inputId` que o `TurmaStatusFilter` e o
`BudgetStatusFilter` já carregam, reusando chaves que já existiam nas 3 locales:
`certificate.colStatus` (que titula a coluna ESTADO) e `certificate.turmaConcluida` (que não era
usada em lugar nenhum do código). Cada um nasceu de uma catraca vermelha —
`Unable to find a label with the text of: …` — e foi medido na tela depois: rótulo renderizado com
`htmlFor` apontando para o INPUT do dropdown, sem overflow em 1440x900.

**O que os dois primeiros achados provam sobre a repetição.** UI-07 (Operação, 2026-08-23), UI-02
(Comercial, 2026-08-25) e UI-01 desta run são o MESMO defeito, na mesma forma
(`<div className="w-48">` com o `AppDropdown` solto dentro), encontrado por três runs
independentes em três dias. Três correções idênticas, nenhuma catraca que reprove a quarta
ocorrência — nem o lint, nem a suíte, nem o `tsc` sabem que um `AppDropdown` de filtro precisa de
nome. É isso, e não cada achado isolado, que a Task 12 leva ao `backlog.md`.

**UI-03 — vira ficha, porque a correção é decisão de composição e de texto.** Aproximar o motivo do
bloqueio ("El curso no tiene plantilla de certificado") do controle que ele desabilita tem mais de
um remédio possível — aviso ao lado do botão do lote, tooltip por linha, ou os dois — e cada um
muda o que a tela diz numa jornada de peso legal que esta run não pôde exercitar (emitir é escrita).
Registrada no `backlog.md` na Task 12.

**UI-04 — vira ficha, porque o texto é do João.** A linha de orientação que falta no ramo
`notFound` da validação pública é copy em es-CL, numa tela que quem escaneia o QR vê de FORA do
sistema — fiscalizador, cliente — e com peso legal. Inventá-la aqui seria decidir wording de
cliente dentro de um passe de correção de UI. Registrada no `backlog.md` na Task 12.
