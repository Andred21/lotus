# Revisão de UI + passe de design — Mi perfil (`/perfil`)

**Data:** 2026-08-17 · **Superfície:** `frontend/src/features/identity/components/Profile/`
**Base:** `main` @ `d8c401f` (worktree `fix-frontend`) · **Estado do workflow:** `idle`, `active_work_item: null`
**Fontes:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`, relatório verbatim na §2) e
`frontend-design` (lente estética, §3)

> **Nada foi corrigido por esta auditoria.** `git status --short` vazio antes e depois; nenhum
> arquivo de código tocado. O artefato existe para que os achados sobrevivam ao `/clear` e virem
> fila de bloco — a correção é passo separado, sob `/planejar-bloco`.
>
> Este arquivo segue o mesmo molde de `2026-08-17-lotus-ui-review-dashboard.md`: §2 é o relatório
> bruto da skill, verbatim e intocado; §3 em diante é o que se fez com ele.

---

## 1. Método e por que houve dois passes

A revisão da skill classifica pela `references/review-rubric.md` — nove eixos, condições A/B/C,
tudo medido no navegador. Ela é boa em achar o que **falha**: contraste abaixo de 4,5:1, controle
cortado, tecla que não responde. Ela não pergunta se a tela tem ponto de vista.

O passe de design pergunta isso, e é lente complementar por decisão explícita do frontmatter da
skill: *"quem classifica é `references/review-rubric.md`. Se ela conflitar com uma rule de
`.claude/rules/`, a rule ganha e o conflito é avisado ao João."* Nenhum achado de design abaixo
contradiz uma rule; onde a recomendação estética esbarraria em `frontend-fsliced.md` ou no ADR-16,
o alvo foi reescrito para `shared/ui` e tokens, e isso está anotado item a item.

Os dois passes convergem em três pontos (§4), e é essa convergência que define a fila da §5.

**Fatos de método do passe de design:** o navegador não foi reaberto. Toda afirmação da §3 sai de
(a) leitura do código, (b) as 18 capturas de `.artifacts/ui-review/2026-08-17-1241-perfil/` e (c)
`grep` no repositório. Onde a conclusão depende de medida que só o navegador dá, o item diz
`inferência` e não `fato`.

---

## 2. Relatório da skill — verbatim

Evidência (18 capturas) em `.artifacts/ui-review/2026-08-17-1241-perfil/`, coberta por
`.gitignore:24-25`. O bloco abaixo é o `report.txt` daquela pasta, sem edição.

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Mi perfil (rota /perfil), papéis Admin e Redator, locale es-CL, temas claro e escuro
Local URL: http://localhost:5174/perfil (Vite desta worktree; :5173 serve o main tree, que está em feat/dashboard-frontend-analitico-e-redator — outra base)
Branch/commit: main @ d8c401fff4b2d40a40602a3adbeb21ff11661550 (worktree /home/jvbat/projetos/fix-frontend)
Date/time: 2026-08-17 12:41–13:25 -03:00
Agent: Claude Opus 5 (1M) via /lotus-ui-review
Playwright CLI: 0.1.18, sessão `lotus-perfil-1241`, chromium headed (--headed --browser=chromium). Headless trava neste WSL: `TimeoutError2: Timeout 180000ms exceeded` no launch do chrome full; chrome-headless-shell sobe, chrome headed sobe. Sem impacto — a skill exige headed.
Chrome DevTools: complementary_unavailable
Git working tree before/after: antes `git status --short` vazio, main @ d8c401f — depois `git status --short` vazio, main @ d8c401f. Idêntico.

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Admin — perfil completo, tema claro | 1440x900 | 1024x768 | 390x844 | 01, 02, 04, 05, 06, 07 |
| Admin — perfil completo, tema escuro | 1440x900 | — | — | 03 |
| Admin — ordem de tabulação (25 paradas, ciclo fechado) | 1440x900 | — | — | snapshot por parada, seção Technical signals |
| Redator — perfil completo, tema claro | 1440x900 | 1024x768 | 390x844 | 08, 09, 10, 11, 12, 13 |
| Redator — seção documental, tema escuro | 1440x900 | — | — | 14 |
| Redator — preview de documento (CV e REUF) | 1440x900 | — | — | 16, 17 |
| Redator — slot ausente (Post-Grado) | — | — | 390x844 | 13 |
| Troca de locale EN→es-CL e de tema | 1440x900 | — | — | 00, 01, 03 |

Todas as capturas em `.artifacts/ui-review/2026-08-17-1241-perfil/` (ignorada por `.gitignore:24-25`).

## Technical signals
Console: 0 erros, 0 warnings nos dois papéis, do login ao fim da jornada. A única entrada é `[INFO] Download the React DevTools…`, do próprio React em dev.
Network: `GET /api/me => 200` e `GET /api/profile => 200`, uma vez cada por montagem. Zero requisição repetida, zero 4xx/5xx, zero requisição na troca de tema ou de locale.
Performance: nenhuma medição de performance foi tomada. A ausência é limitação desta run, não afirmação sobre a tela.
Untested states: `vence_em_breve`, `vencido` e `no_idoneo` (nenhum documento do seed está nesses estados; alcançá-los exigiria mutação); erro isolado de `/api/profile` e `AppErrorState` (exigiria interceptação de rota, proibida pela skill); `disabled` durante PUT de perfil e de senha (exigiria escrita); toast de sucesso; upload em voo e rejeição por tamanho; `AppDetailSkeleton` — tentado por captura imediata pós-`goto`, mas a carga local resolve antes do primeiro frame pintado (evidência 15 saiu em branco).

## Findings
### UI-01 — em 390px o slot documental com arquivo vaza do card e apaga o nome do arquivo
Classification: C
Surface/journey: Redator, seção `Documentación profesional`, slots com arquivo E self-service (CV, Título universitario)
Viewport: 390x844
Reproduction: logar como Redator, ir a /perfil em 390x844, rolar até `Documentación profesional`, observar o cartão `Currículum (CV)`.
Evidence: `12-redator-390-docs.png`, `13-redator-390-postgrado.png`; medição por `getBoundingClientRect` no cartão do CV.
Observed fact: o cartão do CV mede `clientWidth` 227px e `scrollWidth` 311px (overflow interno de 84px). O botão `Reemplazar` ocupa de x=286 a x=425, enquanto o cartão termina em x=342 e a viewport em 390 — 83px do alvo ficam fora do cartão e 35px fora da tela, com o rótulo cortado em "Reem". O nome do arquivo `cv-fechamento.pdf` não tem caixa mensurável (largura 0) e desaparece da tela; sobra a linha de metadados quebrada em quatro linhas ("8/17/2026", "·", "69", "B"), com o ícone `Ver` (x=182–230) sobreposto a ela. O mesmo ocorre em `Título universitario`. O REUF (sem botão self-service) mede `scrollWidth` 227 = `clientWidth` e não vaza; `Post-Grado` (ausente) também não.
Inference: quem vaza é a linha `AppFileRow` + `AppFileActions` com o botão de texto do upload dentro: os três alvos mais o rótulo `Reemplazar` não cabem em 227px, e a linha não tem quebra nem contenção — o nome do arquivo cede primeiro, o botão transborda depois. O contra-exemplo do REUF isola a causa no botão de texto, não no cartão.
Impact: em telefone, o Redator perde de vista QUAL documento está substituindo — e substituir apaga o anterior de forma irreversível. O rótulo que é o único aviso disso (spec §6) fica ilegível, e parte do alvo sai da tela. Documento de peso legal.
Recommendation: em larguras estreitas, empilhar a linha do arquivo (nome/metadados acima, ações abaixo) ou reduzir o botão de upload a ícone com nome acessível, mantendo o aviso de substituição em texto próprio. A correção pertence a `shared/ui` (`AppFileRow`/`AppFileActions`), não à feature, e alcança todos os consumidores.
Rule/reference: rubrica eixos 3 e 4 (condição C — sobreposição, truncamento de conteúdo essencial, controle cortado); `.claude/rules/frontend-fsliced.md` (customização de componente vive em `shared/ui`).

### UI-02 — texto branco sobre tag preenchida reprova AA, inclusive no status de documento
Classification: B
Surface/journey: Redator — tags `Vigente` dos slots documentais e tags de curso do `Resumen profesional`
Viewport: 1440x900 (a cor é a mesma nas três; a tag pinta o próprio fundo)
Reproduction: logar como Redator, ir a /perfil, medir `color` e `background-color` computados de `.p-tag`.
Evidence: `08-redator-1440-claro.png`, `10-redator-1440-claro-fim.png`, `14-redator-1440-escuro-docs.png`; razões calculadas sobre os valores computados.
Observed fact: `Vigente` renderiza `rgb(255,255,255)` sobre `rgb(34,197,94)` a 12px/700 — **2.28:1**. As três tags de curso renderizam branco sobre `rgb(14,165,233)` — **2.77:1**. A tag `secondary` (`Sin subir`) renderiza `rgb(51,65,85)` sobre `rgb(226,232,240)` — **8.4:1**. As razões não mudam entre tema claro e escuro, porque a tag preenche o próprio fundo.
Inference: `AppTag` com `severity` de tom pinta fundo saturado e texto branco. 12px bold não é "texto grande" para a WCAG (o corte é 18.66px bold), então o critério aplicável é 4.5:1 e as duas variantes ficam abaixo dele — a de sucesso em menos da metade. A `secondary`, corrigida no review de 2026-08-16 (UI-03), é a única que passa.
Impact: o status de validade é a informação de compliance da seção, e é justamente a menos legível para baixa visão ou tela sob luz forte. Contradiz a tese que o passe de 2026-08-17 fixou no Dashboard — cor de sinal em traço e marca, texto em contraste cheio — que não alcançou as tags preenchidas.
Recommendation: aplicar às variantes de tom o mesmo tratamento que fechou a UI-04 do Dashboard: fundo suave e texto na tinta escura do mesmo tom (ou borda de tom com texto em contraste cheio), preservando a distinção entre os quatro estados. Alcance declarado: `AppTag` é `shared/ui` e as variantes de tom aparecem fora desta tela.
Rule/reference: rubrica eixo 6 (condição B — contraste aumenta esforço); ADR-16 (cor pelas variáveis do tema).

### UI-03 — títulos de seção reprovam AA no tema claro
Classification: B
Surface/journey: Admin e Redator — todos os títulos de `FormSection` (`Identidad`, `Datos personales`, `Seguridad`, `Resumen profesional`, `Documentación profesional`)
Viewport: 1440x900, 1024x768 e 390x844 (mesma cor nas três)
Reproduction: abrir /perfil no tema claro e medir `color` computado dos `<h3>` contra o fundo do cartão.
Evidence: `01-admin-1440-claro.png`, `04-admin-1024-claro.png`, `08-redator-1440-claro.png`; medição por elemento.
Observed fact: os `<h3>` renderizam `rgb(37,165,228)` sobre `rgb(255,255,255)` a 14px/700 — **2.77:1**. No tema escuro, a mesma cor sobre `rgb(30,41,59)` dá **5.28:1**, que passa. O subtítulo da página (`rgb(100,116,139)` sobre `rgb(241,245,249)`, 14px) mede **4.34:1**, também abaixo de 4.5:1. Os demais textos da tela passam: rótulos secundários 4.76:1, valores 10.35:1.
Inference: o título de seção usa a tinta de marca como cor de texto. Ela foi calibrada para superfície escura — onde de fato passa — e não para o cartão branco, que é o fundo dominante da tela.
Impact: o texto que organiza a leitura da tela é o de menor contraste dela, e só no tema claro. Não impede o uso, mas inverte a hierarquia de legibilidade: o rótulo do campo lê melhor que o título da seção.
Recommendation: escurecer a tinta do título de seção no tema claro até ≥4.5:1 mantendo a identidade de marca, ou trocar a cor pelo texto forte e marcar a seção por outro meio (peso, régua, espaçamento). Vale também para o subtítulo da página. `FormSection` é `shared/ui` — alcance declarado: toda tela que o usa.
Rule/reference: rubrica eixo 6 (condição B); ADR-16.

### UI-04 — o subtítulo promete ao Admin uma seção que ele nunca vê
Classification: B
Surface/journey: Admin, cabeçalho da página
Viewport: 1440x900, 1024x768, 390x844
Reproduction: logar como Admin, ir a /perfil e ler o subtítulo; comparar com as seções presentes.
Evidence: `01-admin-1440-claro.png` (subtítulo e tela inteira), `08-redator-1440-claro.png` (mesmo subtítulo com a seção presente).
Observed fact: o subtítulo é "Tus datos personales, tu seguridad y tu documentación profesional." nos dois papéis. As seções renderizadas para o Admin são três — `Identidad`, `Datos personales`, `Seguridad`; para o Redator são cinco, com `Resumen profesional` e `Documentación profesional`.
Inference: `ProfilePage.tsx:40` passa `t('profile.subtitle')` sem ramificar por papel, enquanto o corpo ramifica em `profile.redator` (linhas 56 e 61).
Impact: o Admin lê uma promessa de terceira seção e não a encontra em nenhuma viewport — em 1024 e 390, onde a página tem 2 a 4 dobras, isso custa uma rolagem de busca até o fim antes de concluir que não existe. Esta mesma frase já enganou uma medição do fechamento de 2026-08-17, que checava a presença da seção documental por texto.
Recommendation: ramificar o subtítulo pelo mesmo predicado que ramifica o corpo (`profile.redator`), com chave própria para o texto sem documentação.
Rule/reference: rubrica eixo 8 (condição B — texto compreensível com inconsistência frente ao estado).

### UI-05 — abaixo de `xl`, tudo que é editável cai atrás de uma dobra e meia
Classification: B
Surface/journey: Admin e Redator, layout de coluna única
Viewport: 1024x768 (medido); 390x844 (mesma ordem)
Reproduction: abrir /perfil em 1024x768 e medir a posição vertical de cada `<h3>` sem rolar.
Evidence: `04-admin-1024-claro.png`, `11-redator-1024-claro.png`; medição de `getBoundingClientRect().top` com `scrollTop` 0.
Observed fact: em 1024x768 a área de conteúdo tem 688px de altura útil. Admin: `Identidad` em y=511, `Datos personales` em y=829, `Seguridad` em y=1137, total 1476px. Redator: `Identidad` em y=511, `Resumen profesional` em y=829, `Datos personales` em y=1059, `Documentación profesional` em y=1809, total 2544px — 3,7 dobras. Em ambos, a primeira dobra contém apenas o cartão de identidade, e nele o único controle é o de foto.
Inference: a grade só vira duas colunas em `xl` (`ProfilePage.tsx:53`, correção deliberada da UI-04 de 2026-08-16). Em coluna única, a ordem do DOM entrega primeiro a coluna que a spec D1 definiu como "o que o usuário não controla" — a hierarquia que o layout de duas colunas expressa lado a lado vira precedência vertical.
Impact: numa tela cujo propósito é self-service, quem entra em tablet ou telefone vê primeiro uma tela inteira de leitura. Para o Redator, a seção documental — a de maior peso — começa a 2,6 dobras. Não bloqueia; custa rolagem em toda visita.
Recommendation: abaixo de `xl`, reordenar de modo que o self-service preceda o bloco de leitura (`order-*` na grade, sem alterar a ordem em `xl`), ou compactar o cartão de identidade nessa faixa (foto e nome em linha, em vez de empilhados e centrados).
Rule/reference: rubrica eixos 2 e 4 (condição B — prioridade compreensível, mas posição atrasa; scroll aumenta esforço sem bloquear).

### UI-06 — as ações dos slots documentais não formam coluna
Classification: B
Surface/journey: Redator, seção `Documentación profesional`
Viewport: 1440x900
Reproduction: abrir /perfil como Redator em 1440x900, rolar até a seção e medir a posição horizontal do primeiro ícone de ação de cada cartão.
Evidence: `10-redator-1440-claro-fim.png`, `14-redator-1440-escuro-docs.png`; medição de `getBoundingClientRect().left` por botão.
Observed fact: o ícone `Ver` fica em x=1132 nos cartões de CV e Título (que têm três ações) e em x=1275 no cartão do REUF (que tem duas) — 143px de deslocamento entre linhas equivalentes, empilhadas verticalmente e separadas por 16px.
Inference: o grupo de ações é justificado à direita e o REUF não tem o botão de upload, então todo o grupo desliza para ocupar o espaço vago em vez de manter as colunas de `Ver` e `Descargar` alinhadas.
Impact: as duas ações que existem em todos os slots deixam de ser varridas por coluna; o olho precisa reencontrá-las a cada linha. A seção é a que o Redator mais usa.
Recommendation: reservar a faixa da ação de upload também quando ela não existe (largura fixa ou célula vazia), de modo que `Ver` e `Descargar` fiquem na mesma coluna nos quatro slots.
Rule/reference: rubrica eixo 3 (condição B — inconsistência de alinhamento dificulta varredura).

### UI-07 — o disparador de upload é um `<span>` sem papel de botão
Classification: B
Surface/journey: Admin e Redator — `Reemplazar` da foto; Redator — `Reemplazar`/`Subir documento` dos slots
Viewport: 1440x900
Reproduction: abrir /perfil, percorrer a tela por Tab e inspecionar o elemento focado na parada 13; ler `role`, `aria-label` e `tabindex` dos elementos com `tabindex=0`.
Evidence: percurso de tabulação (25 paradas) e leitura de atributos, em Technical signals; `01-admin-1440-claro.png` mostra o controle.
Observed fact: o disparador é `<span class="p-button p-component p-fileupload-choose" tabindex="0">` com `role` nulo e `aria-label` nulo; recebe foco na sequência natural (parada 13) e mostra anel de foco de 2px. Por contraste, `Eliminar foto`, `Guardar cambios` e `Cambiar contraseña` são `<button>`, e o toggle de senha é `<svg role="button" aria-label="Mostrar contraseña">`.
Inference: é o `FileUpload` do PrimeReact no modo básico, exposto pelo wrapper `AppFileUpload` sem papel acrescentado. O nome acessível vem só do texto interno, sem semântica de botão.
Impact: para leitor de tela o controle é anunciado como texto focável, não como botão — e é o controle que substitui um documento de peso legal de forma irreversível. Não testei a ativação por teclado porque acioná-la abre o seletor de arquivos do sistema, fora do contrato read-only desta revisão; o impacto relatado é o do nome acessível, que foi observado.
Recommendation: acrescentar `role="button"` (ou embrulhar num `<button>` que delegue) no wrapper `AppFileUpload` em `shared/ui`, com nome acessível explícito que inclua o tipo documental — hoje três slots repetem o rótulo "Reemplazar" sem dizer de qual documento.
Rule/reference: rubrica eixo 6 (condição B — label/nome acessível aumenta ambiguidade); `.claude/rules/frontend-fsliced.md` (a correção vai no wrapper, não na feature).

### UI-08 — Escape não fecha o preview quando o foco está no visor de PDF
Classification: B
Surface/journey: Redator — `Documentación profesional`, diálogo de pré-visualização
Viewport: 1440x900
Reproduction: abrir /perfil como Redator, clicar em `Ver` no slot do REUF, dar foco ao `<iframe>` do visor (clicar dentro dele) e pressionar Escape. O diálogo permanece aberto. Com o foco no botão de fechar, Escape fecha.
Evidence: `17-redator-1440-preview-reuf.png`; leitura de `document.activeElement` e da presença de `.p-dialog` antes e depois de cada Escape.
Observed fact: com `activeElement` = `IFRAME`, Escape deixa `.p-dialog` presente. Com `activeElement` = `BUTTON` (estado logo após a abertura), Escape remove `.p-dialog`. O `X` do cabeçalho fecha nos dois casos. Na primeira abertura observada o foco foi para o `<iframe>` sem clique meu.
Inference: o visor de PDF nativo do Chrome consome a tecla dentro do iframe, e o handler de Escape do diálogo, que escuta no documento hospedeiro, não a recebe.
Impact: a saída convencional falha exatamente depois da interação mais provável — olhar o documento. A recuperação continua disponível pelo `X`, então não bloqueia; custa uma tentativa perdida.
Recommendation: não depender apenas do `closeOnEscape` do diálogo quando o conteúdo é um iframe — devolver o foco ao contêiner do diálogo ao montar e manter o `X` como saída visível (já está). Correção em `AppFilePreviewDialog`, em `shared/ui`.
Rule/reference: rubrica eixos 1 e 6 (condição B — a jornada termina, mas o feedback do controle convencional falha).

### UI-09 — o toggle de senha se anuncia como botão e não responde a Espaço
Classification: B
Surface/journey: Admin e Redator — seção `Seguridad`, os três campos de senha
Viewport: 1440x900
Reproduction: abrir /perfil, dar foco ao ícone de olho de `Contraseña actual`, pressionar Enter (o campo passa a `type="text"`), pressionar Espaço (o campo permanece `type="text"`).
Evidence: leitura de `input.p-password-input.type` antes e depois de cada tecla, em Technical signals; `01-admin-1440-claro.png` mostra os três controles.
Observed fact: o elemento é `<svg class="p-icon p-password-show-icon" role="button" tabindex="0" aria-label="Mostrar contraseña">`, sem `aria-pressed`. Enter alterna `password` → `text`. Espaço, com o mesmo foco, não altera o tipo.
Inference: o ícone recebeu papel de botão e foco, mas não o contrato de teclado que o papel promete — a WAI-ARIA exige Enter e Espaço para `role="button"`. Falta também o estado de alternância (`aria-pressed`), então o leitor de tela não anuncia se a senha está visível.
Impact: quem opera por teclado e usa Espaço — a tecla natural para botão — não vê resposta e não tem sinal de que a ação existe. Menor: Enter funciona e o campo é utilizável sem o toggle.
Recommendation: no wrapper `AppPassword`, tratar Espaço junto de Enter e expor `aria-pressed` refletindo a visibilidade. Alcance declarado: `AppPassword` tem 5 sítios no projeto.
Rule/reference: rubrica eixo 6 (condição B); `.claude/rules/frontend-fsliced.md` (customização do componente Prime vive no wrapper).

## Summary
A: o corte por mutabilidade da spec D1 continua legível em 1440 nos dois papéis; o Admin não recebe seção documental nem resumo profissional; e-mail, RUT e papel são texto, não input desabilitado. Para o Redator, os quatro slots são sempre projetados, o REUF aparece sem ação de envio e com a nota de gestão administrativa, o ausente lê "Sin subir" em cinza neutro (8.4:1) e nenhum slot oferece exclusão, em papel nenhum. O rótulo distingue "Reemplazar" de "Subir documento", que é o único aviso de substituição irreversível. "Vence el 10-08-2028" sai no formato es-CL — a correção UI-01 de 2026-08-16 se sustenta. Em 390px os cinco campos editáveis medem 229px, iguais entre si e ao formulário — UI-02 de 2026-08-16 e Q-5 do review de sprint se sustentam. A ordem de tabulação cobre as 25 paradas em ciclo fechado, com foco sempre visível, o campo `username` do gerenciador de senhas corretamente fora dela (`tabindex=-1`, `aria-hidden`, 1x1 `clip`), e o link "Saltar al contenido" como primeira parada. Nenhuma viewport produz overflow horizontal de documento. Console em 0/0 e rede em duas requisições, sem repetição.
Duas observações que NÃO viram achado, por já estarem decididas ou serem de dado: o `created_at` da linha de arquivo sai como "8/17/2026" (idioma do navegador, não da interface) — é a **D-18** já registrada no `backlog.md` pelo review de 2026-08-16, decisão consciente e não achado novo; e o preview de `cv-fechamento.pdf` falha com "Failed to load PDF document." porque o arquivo é o resíduo de 69 B do DoD de 2026-08-16 (P-44), não um PDF válido — o `reuf-juan-morales.pdf` do seed abre e renderiza normalmente no mesmo diálogo, o que isola a causa no dado.
B: 8 — UI-02 (contraste de tag preenchida, inclui o status documental), UI-03 (título de seção a 2.77:1 no tema claro), UI-04 (subtítulo promete documentação ao Admin), UI-05 (self-service atrás de 1,5+ dobras abaixo de `xl`), UI-06 (ações dos slots desalinhadas em 143px), UI-07 (disparador de upload sem papel de botão), UI-08 (Escape preso no visor de PDF), UI-09 (toggle de senha ignora Espaço).
C: 1 — UI-01 (em 390px o slot documental com arquivo vaza do cartão, apaga o nome do arquivo e corta o botão de substituição).
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

---

## 3. Passe de design (`frontend-design`)

Numeração `DS-nn` para não colidir com o `D-nn` das divergências do `backlog.md` nem com o `Dn` das
decisões de spec.

### DS-01 — o celeste da marca pinta título, ação primária, ação secundária, ação destrutiva e etiqueta de dado ao mesmo tempo

**Fato.** Em `08-redator-1440-claro.png`, na mesma dobra, a mesma família de celeste pinta sete
papéis distintos:

| Papel | Elemento | Origem da cor |
|---|---|---|
| Título de seção | `DATOS PERSONALES`, `IDENTIDAD`, `SEGURIDAD` | `FormSection` → `BRAND_COLOR` `#25A5E4` |
| Ação primária | `Guardar cambios`, `Reemplazar` (foto) | `AppButton` primário do tema |
| Ação **destrutiva** | `Eliminar foto` | `AppButton text` — celeste, não `danger` |
| Ação secundária | `Ir a mi panel` (outlined) | `--brand-ink` |
| Ação de upload | `Reemplazar` / `Subir documento` dos slots | `p-button-text p-button-sm` |
| Etiqueta de dado | as três tags de curso | `severity="info"`, `rgb(14,165,233)` |
| Ícone de ação | `Ver`, `Descargar` | `AppButton text rounded` |

**Inferência.** Cor de marca que marca tudo deixa de marcar. Antes de ler o texto, o usuário não
distingue um título de um link, nem uma ação segura de uma irreversível. O caso pior está a 54px de
distância na captura: `Eliminar foto` — que apaga a foto sem confirmação de desfazer — é texto
celeste imediatamente abaixo do `Reemplazar` celeste preenchido. As duas ações do bloco de foto
compartilham hue, e a destrutiva é a de menor peso visual, o que lê como "menos importante", não
como "mais perigosa".

**Impacto.** É a raiz estética do UI-03: o título de seção só está a 2,77:1 porque foi pintado com
a tinta que também é botão. Corrigir só o contraste do título (subir o degrau da rampa) resolve a
medida e mantém a ambiguidade de papel.

**Recomendação.** Reservar o celeste preenchido à ação primária única de cada card. Título de seção
sai da cor de marca e passa a `--text-color`, marcado por peso, `tracking` e espaço — o que fecha o
UI-03 pelo caminho que o próprio achado listou como alternativa. Ação destrutiva de texto usa
`dangerText`, que já existe em `shared/styles/tokens.ts` e já passa 4,5:1 nos dois temas.

**Alcance e conformidade.** `FormSection` e `AppPhotoField`, ambos em `shared/ui`; nenhuma feature
muda. Toda cor sai de token existente — ADR-16 satisfeito, sem Tailwind de cor em feature
(`frontend-fsliced.md`).

---

### DS-02 — a tela desenha a mutabilidade no layout e não no visual; abaixo de `xl` a tese some

**Fato.** A spec D1 é a única ideia estrutural da tela, e o docblock de `ProfilePage.tsx:10-13` a
enuncia: à esquerda o que o usuário não controla, à direita exatamente o que é self-service. Os dois
lados renderizam o mesmo `AppCard` — `rounded-lg border p-4`, `--surface-card`, `--surface-border`.
O único sinal da divisão é a posição horizontal, que existe apenas a partir de 1280px
(`ProfilePage.tsx:53`).

**Inferência.** Estrutura é informação; aqui ela é geometria e nada mais. Abaixo de `xl` — que é
onde o UI-05 mediu 1476px e 2544px de página — a regra vira ordem vertical, e ordem vertical sem
marca visual não é lida como regra, é lida como "a ordem em que ficou".

**Impacto.** A decisão de produto mais forte da tela é invisível em duas das três viewports
revisadas, e ambígua na terceira: nada diz ao usuário por que `Identidad` não tem campo editável.
Hoje isso se resolve por uma nota de 12px em cinza (`profile.identity.managedByAdmin`) no fim do
card.

**Recomendação.** Dar às duas famílias tratamentos de superfície distintos, usando mecânica que o
`AppCard` já tem: o bloco de leitura sem borda sobre `--surface-ground`, ou o bloco self-service com
o trilho de `variant="stat"` na borda de início. Assim a divisão sobrevive à coluna única e a nota de
12px vira reforço, não único portador.

**Conflito / decisão pendente.** Isto **muda o que a spec D1 desenhou**, ainda que não o que ela
decidiu. Vai para o João antes de virar task; não é correção de defeito.

---

### DS-03 — o dado de peso legal é o menor e mais apagado do slot; o derivado dele é o mais saturado

**Fato.** Em `ProfileDocumentSlot.tsx:119-127`, `Vence el 10-08-2028` renderiza `text-xs` em
`--text-color-secondary`, como **última** linha do slot, abaixo da nota administrativa
(`linha 105-109`). O `Vigente` — que o backend calcula **a partir dessa data** — é a pílula verde
saturada no canto superior direito (`linha 81`). Confirmado em `10-redator-1440-claro-fim.png`: no
slot do REUF, `Vigente` é o elemento mais chamativo do cartão e `Vence el 10-08-2028` é o menos.

**Inferência.** A fonte da verdade está rebaixada abaixo da sua própria derivação. Enquanto o status
é `vigente` isso não custa nada — o derivado basta. No momento em que ele vira `vence_em_breve`, que
é exatamente quando o Redator precisa saber **quando**, a data é o texto mais difícil de ler do
cartão. E `vence_em_breve` é um dos estados que a revisão listou como não alcançável sem mutação,
então nunca foi visto renderizado.

**Ruído que causou o rebaixamento.** Três dos quatro slots trazem `valid_until: null` e imprimem
`Sin fecha de vencimiento`. A linha existe majoritariamente para dizer que não há informação — foi
racional demovê-la, e o custo caiu sobre o único caso em que ela importa.

**Recomendação.** Promover a validade para a mesma linha do status (`Vigente · vence 10-08-2028`),
na tinta do corpo, e suprimir inteiramente o caso nulo. Casa com o UI-02: a tag deixa de ser
preenchida saturada e o par status+data passa a ler como uma coisa só, em contraste cheio.

**Alcance.** `ProfileDocumentSlot` (feature) + `AppTag` (`shared/ui`). Não recalcula status — o
`status` continua vindo pronto do DTO, como `frontend-fsliced.md` exige.

---

### DS-04 — o card de identidade repete três vezes o que já está na tela e ocupa a primeira dobra inteira

**Fato.** `Juan Morales` aparece em três lugares simultaneamente visíveis em
`08-redator-1440-claro.png`: no menu de usuário do header, sob a foto
(`ProfileIdentityCard.tsx:23`) e no input `Nombre`. `Redactor` aparece também três vezes: header,
sob a foto (`linha 26`) e no campo `Perfil` (`linhas 38-42`). Em 1024x768 esse card sozinho preenche
a primeira dobra — o UI-05 mediu `Datos personales` em y=829 com 688px úteis.

**Inferência.** O conteúdo mais repetido da tela ocupa o espaço mais caro dela. E o único controle
dessa dobra é o de foto, que é a exceção deliberada da coluna (docblock, `linhas 11-13`).

**Recomendação.** Abaixo de `xl`, colapsar o card numa faixa horizontal — avatar + nome + papel em
linha, campos de `Identidad` em duas colunas de leitura — e eliminar a duplicata de papel (sob a
foto **ou** no campo `Perfil`, não os dois). Alivia o UI-05 sem tocar na ordem de `xl`, que a UI-04
de 2026-08-16 fixou de propósito.

**Alcance.** `ProfileIdentityCard` (feature).

---

### DS-05 — a foto é ampliada por `transform: scale(200%)` e o espaçamento em volta é compensação manual

**Fato.** `AppPhotoField.tsx` monta `<div className="transform scale-200"><AppAvatar size="xlarge" /></div>`
e, logo abaixo, a linha de controles com `pt-10`. `AppCard` é `rounded-lg border overflow-hidden`.

**Inferência.** `transform` não altera a caixa de layout: o avatar pintado tem o dobro do tamanho da
área que ele reserva, e os 40px de `pt-10` são um número mágico que repõe a diferença. Duas
consequências: (a) o excedente pintado sobe acima da caixa e entra no `overflow-hidden` do card, e
(b) o fallback de iniciais (`AppAvatar` sem imagem) também dobra de corpo, saindo da escala
tipográfica. **Nenhuma das duas foi medida no navegador** — a aritmética (`xlarge` ≈ 64px de caixa,
128px pintados, centro deslocado ~32px para cima) prevê recorte no topo, e a captura é compatível
com isso, mas a confirmação exige `getBoundingClientRect`.

**Impacto.** É o único ponto da tela em que o design system é derrotado por um hack: o tamanho não é
token, é fator de escala, e o espaço que o conserta é constante literal. Mudar o padding do card ou
o tamanho do avatar quebra a composição em silêncio, sem erro de tipo e sem teste que pegue.

**Recomendação.** Dar ao `AppAvatar` um tamanho real (valor de `size` ou dimensão explícita em
token) em vez de escalar, e deixar a caixa natural governar o espaçamento.

**Alcance.** `AppPhotoField` / `AppAvatar` (`shared/ui`) — alcança todos os diálogos de cadastro que
usam o campo de foto. **Verificar no navegador antes de virar task.**

---

### DS-06 — a tela não usa dois dos três papéis tipográficos que a marca definiu

**Fato.** `index.css:20-24` declara os três papéis da spec §5: `--font-sans` (corpo),
`--font-display` Archivo (títulos) e `--font-mono` IBM Plex Mono (dado técnico — folio, RUT, datas).
Por `grep`, `font-display` tem 3 sítios no projeto (`PageHeader`, `KpiRow`, `LoginForm`) e
`font-mono` tem 12. **Em `/perfil`, os componentes da tela usam zero dos dois.** O único display que
aparece chega herdado do `h1` do `PageHeader`.

O contraste com o resto do app é direto e verificável: o RUT sai `font-mono` em
`StudentsTable.tsx:46`, `RedatoresTable.tsx:47` e `RedatorCard.tsx:41` — mas em
`ProfileIdentityCard.tsx:33-37`, que é o RUT do próprio usuário, sai por `FormField readOnly` em
sans. Mesma coisa para as datas do slot documental, para o telefone e para o tamanho de arquivo.

Os níveis efetivamente usados na tela: `text-2xl` (um número), `text-base font-semibold` (nome),
`text-sm font-bold uppercase` (título de seção), `text-sm` (rótulo, valor, papel), `text-xs` (quatro
tipos de nota distintos). O título de seção é menor que o nome e que o número dentro do próprio
card.

**Inferência.** A marca tem três vozes e esta tela fala com uma. Não é falta de sistema — o sistema
existe e está aplicado no Dashboard e no Login; é a tela que não o alcançou.

**Recomendação.** Aplicar `font-mono` a RUT, telefone, datas e tamanho de arquivo (o mesmo
tratamento que as tabelas já dão), e decidir o papel do display no título de seção junto com o
DS-01, que já move essa cor. Fecha por consequência a assimetria de que o RUT do outro é técnico e o
seu não é.

**Alcance.** `ProfileIdentityCard`, `ProfileDocumentSlot` (feature) e `AppFileRow` (`shared/ui`).
Sem cor nova, sem escala nova — só aplicação de token existente.

---

### DS-07 — direção, não defeito: a tela não tem assinatura, e o assunto oferece uma óbvia

O `frontend-design` pede que a página tenha um elemento pelo qual seja lembrada. Hoje `/perfil` são
cinco retângulos brancos arredondados iguais, distinguidos só pelo texto — a saída default do
Lara + grade Tailwind. Nada nela diz "Lotus", e nada diz "setor elétrico regulado".

O assunto oferece a assinatura de graça: a coisa que faz este perfil existir é a **habilitação
documental** — CV, título, REUF, pós-graduação, cada um com validade e peso legal. O eixo natural
não é "quatro linhas de arquivo", é **vencimento**: um mural de credenciais em que a posição já
diz urgência, e `vence_em_breve` se vê antes de qualquer palavra ser lida. É a mesma tese que o
folio e o QR do certificado já carregam no produto.

**Isto não entra na fila de correção.** Inverte a ordem que a spec D1 fixou (documentos são hoje o
último card da segunda coluna, a 2,6 dobras do topo para o Redator) e é escopo de bloco próprio, com
brainstorming e spec. Fica registrado como direção, para o João decidir se vira item de backlog.

---

## 4. Onde os dois passes convergem

Três convergências, e são elas que definem a ordem da §5.

**(a) O contraste do título de seção é sintoma, não causa.** UI-03 mede 2,77:1; DS-01 mostra por que
a cor está ali. Corrigir só o degrau da rampa fecha a medida e preserva a ambiguidade de papel —
título continua indistinguível de link. Os dois se resolvem no mesmo toque em `FormSection`.

**(b) A tag preenchida e a data rebaixada são o mesmo erro, em dois sentidos opostos.** UI-02: o
status está saturado demais para ser lido. DS-03: a data que o gera está apagada demais para ser
lida. O par vive na mesma linha do slot e se conserta junto — tag suave com tinta escura, data ao
lado em contraste cheio. Sozinho, cada um deixa metade do problema.

**(c) O peso da primeira dobra abaixo de `xl` tem duas causas somáveis.** UI-05 aponta a ordem do
DOM; DS-04 aponta que o card que a ocupa é majoritariamente duplicata. Reordenar sem compactar
empurra o mesmo volume para baixo; compactar sem reordenar mantém leitura antes de ação. Juntos
custam uma dobra a menos.

Uma divergência a registrar: o UI-05 recomenda `order-*` para inverter a ordem abaixo de `xl`. O
DS-02 diz que, sem marca visual, inverter a ordem não comunica a regra — só troca qual metade fica
por último. Os dois cabem, mas a ordem entre eles importa: decidir DS-02 antes de aplicar UI-05
evita fazer o mesmo trabalho duas vezes.

---

## 5. Reconciliação com o que já estava registrado

CLAUDE.md §3 manda consultar `pendencias/` antes de reportar divergência. A consulta foi feita
**depois** de escrever as §2–§4, e muda a fila — fica registrado nesta ordem porque é o fato.

**UI-03 não é achado novo: é a P-36, aberta desde 2026-08-13.** A ficha
(`pendencias/abertas.md:47-71`) nomeia `FormSection.tsx:19` com `style={{ color: BRAND_COLOR }}` num
`<h3>` e mede **os mesmos 2,77:1**. O que esta revisão acrescenta é (a) a confirmação de que o sítio
segue vivo em `main` @ `d8c401f` e agora medido em `/perfil`, não só no bloco do login onde nasceu, e
(b) o DS-01, que explica *por que* a cor está ali e que corrigir o degrau da rampa não basta.

**E o gatilho da P-36 acabou de disparar.** A ficha diz: *"fecha quando um bloco tocar `FormSection`
ou `CoursesTable` por outro motivo e puder absorver os dois sítios junto com a guarda"*. O DS-01 é
exatamente isso — toca `FormSection` por outro motivo (ambiguidade de papel da cor de marca). O
motivo que a manteve aberta (`FormField`/`FormSection` sob reescrita ativa do BD-5, worktree
`fix-frontend`) venceu: o BD-5 foi entregue.

**UI-01 é a metade não paga da D-01.** A D-01 diz *"nome de arquivo truncado sem `title` nem quebra a
390x844"*. A metade do `title` **já foi paga** — `AppFileRow.tsx` expõe `title={name}` e tem teste
que o prova (`AppFileRow.test.tsx`, citando o próprio UI-01 de 2026-08-16). A metade da **quebra**
segue aberta e é o que o UI-01 desta revisão mede pior: em 390px não é só o nome que trunca, é a
linha inteira que vaza 84px do cartão e corta o botão.

**UI-09 é vizinha de porta da P-37.** A ficha cita como sítio *"o olho do `AppPassword` dentro do
`StaffUserDialog`"* — mesmo controle, defeito diferente (lá o nome acessível somado pelo `<label>`
sem `htmlFor`; aqui a tecla Espaço e o `aria-pressed`). `ProfileSecuritySection` compõe `FormField` +
`AppPassword` exatamente no padrão que a P-37 descreve, três vezes.

**D-18 volta para dentro.** A §2 a excluiu corretamente como "já decidida". Mas ela é fix de uma
linha em `AppFileRow.tsx:42`, e o UI-01 reescreve esse mesmo arquivo — pagá-la junto é mais barato
que deixá-la para depois, que foi o argumento original para adiá-la.

### Consequência: o bloco absorve o BD-10 inteiro

O **BD-10 · Frontend · kit de formulário: nome acessível e cor de marca** cobre P-37, P-36, D-01 e
D-18. Os quatro moram nos mesmos dois arquivos que esta revisão manda tocar (`FormSection`,
`AppFileRow`) e nos mesmos dois temas que o título dele já nomeia. Planejar separado significa
reescrever `FormSection.tsx:19` duas vezes.

**A fila abaixo é, portanto, um BD que absorve o BD-10, não um bloco paralelo a ele.**

---

## 6. Fila consolidada

Ordenada por severidade e por alcance, não por esforço. **Nada aqui está autorizado** — a promoção é
do João, via `backlog.md` e `/planejar-bloco`.

**Escopo escolhido pelo João em 2026-08-17: A + B + C, com DS-02 dentro.**

### Frente A — o que corta conteúdo ou reprova AA

| # | Item | Alvo | Camada |
|---|---|---|---|
| UI-01 (**C**) + D-01 | linha de arquivo vaza 84px em 390px, apaga o nome e corta `Reemplazar` | `AppFileRow`, `AppFileActions` | `shared/ui` |
| UI-02 + DS-03 | tag preenchida a 2,28:1 / data de validade rebaixada abaixo da própria derivação | `AppTag`, `ProfileDocumentSlot` | ambas |
| UI-03 + DS-01 + **P-36** | título de seção a 2,77:1 por usar a tinta de marca como texto, em 11 consumidores | `FormSection`, `AppPhotoField`, `CoursesTable` | `shared/ui` |
| D-18 | data do `AppFileRow` no idioma do navegador (`AppFileRow.tsx:42`) | `AppFileRow` | `shared/ui` |
| UI-06 | ações dos slots desalinhadas em 143px | `ProfileDocumentSlot` | feature |

Único C do relatório está aqui. A P-36 traz junto o **segundo sítio** (`CoursesTable.tsx:43`, ícone a
2,77:1, reprova o 3:1 de elemento gráfico) e a decisão do seletor da catraca `COR_HARDCODED` —
lembrando que cor por `style` é a grafia **certa** quando o valor é `var(--…)`, que é o que sempre
adiou o desenho da guarda.

### Frente B — semântica e teclado

| # | Item | Alvo | Camada |
|---|---|---|---|
| UI-07 | disparador de upload é `<span>` sem `role` nem nome acessível | `AppFileUpload` | `shared/ui` |
| UI-09 + **P-37** | toggle de senha ignora Espaço e não expõe `aria-pressed`; `FormField` sem `htmlFor` soma o rótulo do controle | `AppPassword`, `FormField` | `shared/ui` |
| UI-08 | Escape preso no `<iframe>` do visor de PDF | `AppFilePreviewDialog` | `shared/ui` |

Inteiramente em `shared/ui`. A P-37 exige **copiar o molde inteiro** do `LoginForm.tsx:40-85`
(`htmlFor`/`id`, `aria-describedby`, `aria-invalid`), não só o `htmlFor` — está escrito na ficha.

### Frente C — conteúdo, densidade e tipografia

| # | Item | Alvo | Camada |
|---|---|---|---|
| UI-04 | subtítulo promete documentação ao Admin | `ProfilePage`, i18n | feature |
| DS-02 | corte de mutabilidade sem marca visual — **gate do UI-05** | `ProfilePage`, `AppCard` | ambas |
| UI-05 + DS-04 | self-service atrás de 1,5+ dobras; card de identidade em triplicata | `ProfilePage`, `ProfileIdentityCard` | feature |
| DS-06 | `font-mono` ausente em RUT, telefone e datas do próprio perfil | `ProfileIdentityCard`, `ProfileDocumentSlot`, `AppFileRow` | ambas |

UI-04 é o item mais barato de toda a fila e o único que já enganou uma medição de fechamento.
**DS-02 vem antes de UI-05** — inverter a ordem sem marca visual só troca qual metade fica por
último (divergência da §4).

### Fora do bloco — decisão do João antes de virar task

- **DS-05** — trocar `scale-200` por tamanho real no avatar. Precisa de medição no navegador antes
  de virar task; a previsão de recorte é aritmética, não observação.
- **DS-07** — mural de credenciais como assinatura da tela. Bloco próprio, com brainstorming.

### Não reabrir

- **P-44** (`cv-fechamento.pdf`, resíduo de 69 B) — defeito de dado do ambiente de dev, não da tela.
  O `reuf-juan-morales.pdf` do seed abre normalmente no mesmo diálogo.

---

## 7. Conformidade com as leis e rules

- **Lei 6 / `frontend-fsliced.md`** — nenhuma recomendação importa PrimeReact em feature nem
  atravessa features. Toda customização de componente Prime foi endereçada ao wrapper de
  `shared/ui`, e onde a lente estética pediria Tailwind de cor na feature, o alvo foi reescrito para
  token.
- **ADR-16** — nenhuma cor nova. DS-01 e DS-03 consomem `dangerText`, `--text-color` e os
  `--tone-*-ink` que já existem; DS-06 consome `--font-mono`, já declarado em `index.css:23`.
- **`frontend-design` vs. rules** — sem conflito a reportar. A lente foi aplicada como crítica, e
  toda recomendação dela passou pelo filtro das rules antes de entrar aqui.
- **Passo 16 da `lotus-ui-review`** — *"Return the report and wait for explicit approval. Do not
  correct UI, documentation, data, or code as a consequence of the review."* Cumprido: este
  documento é registro, não correção.

## 8. Estado do ambiente após os dois passes

- O `workflow_state` era `idle` quando esta auditoria foi escrita, e o arquivo **não promove
  trabalho sozinho**. A promoção para `ready_for_planning` foi feita em seguida, por seleção
  explícita do João (escopo A+B+C com DS-02), e entra no mesmo commit deste artefato.
- Sessão Playwright encerrada (`playwright-cli list` → `(no browsers)`); Vite `:5174` desta worktree
  encerrado.
- Os containers `docker compose` estavam parados antes da revisão e foram subidos por ela
  (`docker compose up -d` em `/home/jvbat/projetos/lotus`). **Seguem de pé.**
- `git status --short` vazio; `main` @ `d8c401f`.
