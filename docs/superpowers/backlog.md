# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.
> Itens presentes neste arquivo não estão ativos.
> Somente uma alteração explícita em `state.md` promove um item.

## Próximos blocos

1. **Arquivados e restauração de soft-delete**

    —  Notion: H.5.1–H.5.4

    Objetivo:
    tornar o lifecycle de archive/restore explícito e seguro por agregado.

    Ordem:
    1. semântica;
    2. Actions;
    3. endpoints;
    4. UI.

    Fora de escopo:
    - forceDelete;
    - exclusão permanente.
2. **Administração · Roles e permissões — redesenho de composição**
   — o protótipo tem layout dividido (lista de roles à esquerda; detalhe + matriz de permissões à
   direita, com marcação de permissão essencial); o real tem tabela + diálogo. **Não é refinamento
   visual, é redesenho de tela** — exige brainstorming. Task Notion relacionada: "Tela de
   Administração — Roles e Permissões". Respeitar ADR-07 (permissões essenciais não editáveis).
3. **Hardening**
   — ownership em rotas nested e política de retenção documental.
4. **Login · a tela que ficou fora do ADR-16**

   **Evidência, não hipótese:** `/lotus-ui-review` de 2026-08-12 sobre `/login`
   (`.artifacts/ui-review/2026-08-12T14-38-43-loginpage-wrappers/report.txt`, **2 C + 8 B**;
   diretório gitignored — a evidência é local, esta linha é o registro durável), mais a lente
   `frontend-design` aplicada por cima em **2026-08-13** e entregue como análise datada
   ("Placa de acesso", rev. 2, artifact privado
   `https://claude.ai/code/artifact/664a28ee-f388-4a88-9cf7-bea3b44d11f6`). O bloco
   `estilizacao-adr16-shell-tipografia` tocou `LoginPage.tsx` em **2 linhas** e o resto da tela
   ficou onde estava: é a única superfície do produto que não lê **nenhum** token do tema, medido —
   `--surface-ground`, `--surface-card`, `--text-color` e `--text-color-secondary` estão carregados
   nela e nenhum é consumido.

   **O argumento não é a lista de achados, é que a lista tem uma causa só.** A direção registrada
   fixou a assinatura do produto em *sidebar navy com wordmark* e a estética em "precisão
   instrumental técnico-regulatória". O login responde com **split-screen de gradiente celeste**, que
   é o default de tela de login SaaS e inventa uma segunda linguagem visual — inclusive uma segunda
   cor de marca, `#1b7fb8`, que não existe em `brand-theme.css` nem nas duas folhas geradas. A tese
   da análise: **o painel de marca do login é a sidebar antes de colapsar** — mesma navy fixa nos
   dois temas, mesmo wordmark, celeste como único acento, e o `AppLogo` indo a `variant="on-dark"`
   por ser correto (superfície escura fixa que não acompanha o tema), não por remendo de contraste.

   **A conta de "cinco achados caem por construção" estava errada e foi corrigida antes de virar
   plano.** Conferidos um a um, caem **três inteiros** — C-1, o gradiente cravado e o contraste sobre
   ele — mais **um defeito que o relatório não numerou**: o glifo celeste sobre campo celeste, quase
   invisível na captura. O achado de token cai **pela metade** (o painel de marca passa a ler token;
   o do formulário só migra por trabalho explícito) e o dos controles a 390px **não cai sozinho** —
   depende de decisão de layout mobile.

   ### Direção decidida pelo João em 2026-08-13, sobre a análise rev. 2

   Decisão tomada, não proposta. O `/planejar-bloco` ainda roda inteiro (brainstorming → spec →
   plano); estes oito pontos entram nele **fechados**:

   1. **Composição centralizada, como hoje** — logo em cima, texto embaixo. A placa assimétrica
      (identidade no alto à esquerda, série no rodapé) foi **recusada**.
   2. **Sem cartão** para o formulário: ele segue flutuando no painel, com `max-w-sm`.
   3. **Estética do botão intocada** — celeste com texto navy e raio 4px, saindo do tema (D6 do
      ADR-16).
   4. **O campo de marca vira navy com degradê mínimo**, não chapado.
   5. **Logo e tipografia do painel de marca crescem** — números na tabela de escala abaixo.
   6. **O `w-96` do `AppPassword` entra neste bloco.** A dúvida escrita aqui até 2026-08-13 ("não
      cabe se o BD-3 andar antes") está resolvida: o BD-3 foi entregue em 2026-08-12 e **não** o
      tocou, então o C segue aberto e é metade do motivo do bloco.
   7. **A copy nova entra junto** — subtítulo e texto de ajuda mudam de sentido, não só de estilo, e
      o achado do "olvidaste" não fecha sem decidir o texto.
   8. **O qualificador de setor vira mono caixa alta e o número de versão fica na tela**, em mono com
      `tabular-nums`. É o par que dá à tela a assinatura tipográfica depois de a composição
      assimétrica sair, e é o mesmo recurso do folio do certificado — a assinatura que a direção de
      2026-08-11 elegeu para o produto — aparecendo na primeira tela.

   ### O degradê, sem hex novo

   `linear-gradient(160deg, var(--primary-900), var(--brand-navy))` — `#0c3549` no alto, `#0f2b3d`
   embaixo, os dois já existentes no tema gerado. Diferença de luminância entre as pontas: **1,13:1**
   — mínimo medido, não adjetivo. O gradiente sai do `style` inline montado em JS e vira
   **`--brand-gradient`** na camada fina `brand-theme.css`, consumido por `var()`: é a recomendação
   literal do achado do gradiente, e o `#1b7fb8` deixa de existir.

   Contraste no **pior ponto** do degradê (`#0c3549`), contra os 3,10:1 e 2,79:1 de hoje: tagline
   `--primary-200` **9,84:1**; versão `--primary-300` **8,02:1**; setor `--primary-400` **6,23:1**.
   Na outra ponta sobem para 11,13 / 9,07 / 7,04. O celeste deixa de ser campo e vira o único acento
   sobre ele.

   ### Escala decidida

   | Elemento | Hoje | Bloco |
   |---|---|---|
   | wordmark | 160px (`w-40`) | **208px** (`w-52`); 150px no telefone |
   | tagline | 16px Inter | **20px** Inter, `--primary-200` |
   | setor | 16px Inter, depois de um `<br/>` | **12px mono**, caixa alta, `0.14em`, `--primary-400` |
   | versão | 12px Inter, opacidade 0,7 | **13px mono**, `tabular-nums`, `--primary-300` |
   | `h1` | 24px Inter 700, slate-800 | **24px Archivo 600**, `tracking-tight`, `--text-color` |
   | subtítulo, rótulos, botão | 16px / 14px | inalterados |

   O `h1` **não cresce de propósito**: já está no tamanho do `h1` que o `PageHeader` renderiza, e é o
   mesmo papel semântico. O que muda nele é a família — hoje o login é o único `h1` do produto sem
   `font-display`, e um grep por essa classe em `src/` devolve duas linhas (a definição do token e o
   `PageHeader`). Sem converter o login para `PageHeader`: o molde carrega layout de página interna
   que não cabe aqui.

   ### Duas consequências do "sem cartão", as duas medidas

   - **O painel do formulário fica em `--surface-card`, não em `--surface-ground`.** A razão é AA,
     não gosto: `--text-color-secondary` (`#64748b`) mede **4,34:1** sobre o humo `#f1f5f9` —
     reprova o 4,5:1 de texto normal — e **4,76:1** sobre o branco. O subtítulo e o texto de ajuda
     vivem nesse token, então pôr o formulário no humo sem cartão criaria um achado B novo em duas
     linhas de texto. O branco mantém o visual de hoje **e** passa.
   - **Achado novo desta análise, só no tema escuro:** a navy `#0f2b3d` e o `--surface-card` escuro
     `#1e293b` têm luminância praticamente idêntica (**1,00:1**), então sem cartão e sem borda a
     divisa entre os dois painéis **desaparece** no escuro — só a diferença de matiz sobra. Saída:
     traço de 1px em `--surface-border` **só no tema escuro**; no claro a divisa branco/navy já mede
     14,65:1 e um traço claro ali pareceria artefato.

   ### Copy

   | Chave | Hoje | Bloco |
   |---|---|---|
   | `login.title` | Iniciar sesión | igual — é a ação, e o botão repete o mesmo verbo |
   | `login.subtitle` | Ingresa con tus credenciales | **Acceso para administradores y redactores** — a RN-01 na tela, para cliente e aluno pararem de tentar |
   | `login.forgot` | ¿Olvidaste tu contraseña? | **¿Perdiste el acceso? Pídelo al administrador de la plataforma.** — vira `<p>`, não `<a>` sem `href` |
   | `brand.sector` | Sector eléctrico de alta tensión | mesmo texto, papel mono; o `<br/>` que hoje quebra a tagline sai |

   Três locales com chaves idênticas, `es-CL` como referência de rótulo.

   ### Os dois **C** e os oito **B**, com o destino de cada um

   - **C-1 — wordmark ilegível no tema claro**, 1,45:1 a 2,30:1 (tinta média `rgb(78,98,109)` sobre
     o gradiente). `AppLogo variant="auto"` escolhe o asset pelo **tema**; o painel é celeste nos
     dois. No escuro fica branco e legível — é seleção de asset, não qualidade do asset.
     → **cai por construção** com a navy fixa + `variant="on-dark"`.
   - **C-2 — overflow horizontal a 390px** (`scrollWidth` 416 contra `innerWidth` 390), com o olho da
     senha fora da tela. Causa: `AppPassword` fixa `inputClassName="w-96"` (384px absolutos) enquanto
     o irmão `AppInputText` usa `w-full`. **É defeito do wrapper**: toda tela com `AppPassword` +
     `leftIcon` herda. → **entra neste bloco** (decisão 6 acima): `w-full`, alinhando ao
     `AppInputText`. Alcance medido: **2 call sites** (`LoginForm` e `StaffIdentifyFields`) — nenhum
     diálogo com senha pode regredir de largura, e isso é passo de gate.
   - a tela não lê token nenhum: fundo branco em vez de humo `#f1f5f9` no claro, `slate-900` em vez
     de noche `#0b1220` no escuro, rótulos de campo em **preto puro** `rgb(0,0,0)` (sem classe de
     cor), `h1` em slate-800 e subtítulo em gray-500. → o painel de marca cai por construção; o do
     formulário migra por trabalho explícito, cor **só** por token, inclusive nos rótulos.
   - `h1` fora do papel tipográfico (Inter 700 contra Archivo 600 do `PageHeader`). → Archivo 600,
     `tracking-tight`, `--text-color`, 24px.
   - gradiente cravado em JS com `#1b7fb8` fora de qualquer fonte de verdade — mesmo modo de falha
     do D-P11 daquele bloco, que achou `#25A5E4` inline no `AppAvatar`; grep de hex não alcança
     template string em `.tsx`. → **cai por construção**: vira `--brand-gradient` no
     `brand-theme.css`.
   - texto sobre o gradiente reprova AA: tagline **3,10:1** (16px) e versão **2,79:1** (12px). Branco
     cheio sobre o mesmo ponto ainda daria 3,46:1 — o problema é o par cor-de-fundo, não a opacidade.
     → **cai por construção**: 9,84:1 e 8,02:1 no pior ponto do degradê novo.
   - "¿Olvidaste tu contraseña?" a **2,60:1** e fora da ordem de tabulação (é `<a>` sem `href`).
     → vira texto de ajuda real, `<p>` a 4,76:1 sobre o branco, sem fingir link.
   - `AppPassword` mantém `aria-label="Show Password"` do default do PrimeReact com `lang=es-CL` —
     wrapper, não call site, e chega a toda tela com senha. → nome acessível traduzido **no wrapper**,
     três locales com chaves idênticas.
   - os dois campos sem `autocomplete` (`username`/`current-password`); o próprio Chrome registra o
     aviso no console. → dois atributos no call site.
   - a 390px o par idioma/tema divide a faixa vertical do `h1`, porque é `absolute top-4 right-4` do
     `main` e no layout de coluna o `main` começa logo abaixo do painel de marca. → faixa navy
     compacta (o painel de marca cai de 391px para ~250px de altura) e os controles em **fluxo
     próprio** abaixo dela; `absolute` só a partir de `md`. Assim o par não precisa de variante nova
     para viver sobre navy.
   - **não numerado pelo relatório, visível na captura:** o glifo celeste sobre campo celeste é quase
     invisível no claro. → cai por construção, junto com o C-1.

   **O que o review confirmou funcionando, e que o bloco não deve regredir:** anel de foco azul-poste
   2px visível nas seis paradas do Tab; botão primário celeste com texto navy e raio 4px saindo do
   tema; troca de idioma reformatando na hora; ordem de tabulação seguindo a ordem visual; rótulos
   envolvendo os campos (associação acessível correta mesmo sem `for`/`id`); zero overflow horizontal
   a 1024 e 1440.

   **Movimento: nada anima** — nem o degradê. Numa estética de instrumento de medição, animação de
   carga é ruído. O único movimento continua sendo o `loading` do botão, que já existe e comunica
   estado real.

   Fora de escopo declarado: fluxo de recuperação de senha (não tem endpoint — a decisão aqui é só
   o que a tela mostra enquanto ele não existe).

## Blocos de execução de dívida — BD-2..BD-7 (proposta de 2026-08-10)

> Agrupamento dos **débitos técnicos** desta página e das **pendências de código** de
> `docs/pendencias.md`, conferidos contra o código em 2026-08-10 (não herdados de relatório).
> Isto é fila, não autorização: nenhum BD executa sem promoção explícita em `state.md`.
>
> **Nada sai do lugar de origem ao entrar num bloco.** A linha do débito em `## Débitos técnicos`
> e a linha da pendência em `docs/pendencias.md` continuam onde estão, com o mesmo ID; só são
> removidas ou encerradas **depois** do bloco aplicado e do `/fechar-sprint` correspondente. Até
> lá, o BD é o ponteiro, não o novo dono do registro.
>
> Débito que já tem ID (`Q-*`, `B-*`, `P-*`) é citado pelo ID. Débito sem ID é citado pelo título
> em negrito da própria linha — **12 débitos desta página não têm número**, e numerá-los é decisão
> de formato do João, não do agente.
>
> Ordem entre blocos: **BD-5 → BD-6**. O **BD-4** foi entregue em 2026-08-13 e saiu desta lista com
> os três débitos que cobria (as 2 tabelas sem a `SearchableTableFrame`, a catraca do `max-lines` e
> o `FormErrorSummary` que faltava nos dois diálogos); o gatilho do trio da foto que ele venceu está
> escrito no próprio **BD-5**. O **BD-3** foi entregue em 2026-08-12 e saiu desta
> lista com os seis débitos que cobria (os três do piloto UI de Clientes, `Q-14`, `Q-15`, o CTA
> duplicado e a cor fora do corte do D18); a lacuna de alcance que ele deixou na catraca de cor —
> o shell fora de `COR_HARDCODED` — ficou na **P-34**. O **BD-8** e o **BD-9** nasceram depois
> (revisão de arquitetura do backend de 2026-08-12) e **não entram nessa ordem**: são backend,
> enquanto BD-5 e BD-6 são frontend, e a fila deles era **BD-8 → BD-9** entre si — os **dois foram
> entregues em 2026-08-13** e saíram desta lista (`progress.md`), então a fila de backend está
> **vazia** e o que resta em fila é `BD-5 → BD-6`. Qual item anda antes é promoção explícita do
> João, como sempre. O **BD-1** foi entregue
> em 2026-08-11 e saiu desta lista (`progress.md`); o **BD-2** foi entregue em 2026-08-11 e saiu
> junto — a decisão do 5.2b sobre `GET /api/roles`, que ele declarou fora de escopo, continua em
> `## Débitos técnicos`. O **BD-7** foi entregue em 2026-08-12, **fora da ordem escrita e por
> promoção explícita do João**, e saiu com o débito `last_login` que ele cobria; a retenção do dado
> pessoal que a tabela nova passou a guardar ficou na **P-33** (nasceu como segunda `P-30` e foi
> renumerada no fechamento do BD-3). A ordem dentro de cada bloco é parte
> do bloco, não sugestão.

### BD-5 · `useCrudForm` mais fundo

O gatilho do débito do trio da foto — "quando alguém tocar um desses 4 diálogos por outro motivo" —
**venceu no BD-4** (2026-08-13), que reescreveu `StudentDialog` e `RedatorDialog` para caber na
régua de 150 linhas.

Cobre: **"O trio da foto é idêntico em 4 dialogs"** (a absorção; o teste saiu no bloco `guardas-que-faltam`, entregue em 2026-08-11) · **"Os 4
hooks de formulário que ficaram fora do `useCrudForm`"** · **Q-4** dos três achados de 2026-08-05
(`photo_url`/`photo_path` no corpo da escrita).

Ordem:
1. absorver o trio (`useEntityPhoto` + `afterCreate: photo.flush` + `FormErrorBanner` de falha
   bufferizada + `closeBlocked`) nos 4 diálogos;
2. migrar `useCourseForm` e `useQuoteForm`, os dois candidatos legítimos que ficaram fora por corte
   de escopo;
3. **Q-4** — guarda contra `...form` reintroduzir `photo_path` (hoje é path interno de storage, não
   URL) no corpo da escrita.

DoD: **foto real chegando no S3**, não lint verde — o caminho tem falha silenciosa conhecida
(lição 6). Fora por critério, não por escopo: `useRedatorForm` (multipart com chave polimórfica) e
`useTurmaConfigForm` (rota aninhada, não roda sobre `createCrudResource`).

### BD-6 · Falha que se disfarça de lista vazia

Bloco separado porque **muda comportamento de propósito** — nenhum DoD de "comportamento idêntico"
cabe aqui, que é exatamente por que o João o manteve fora do bloco de origem.

Cobre: **B-7**.

Ordem:
1. distinguir loading / erro-com-Reintentar / vazio de verdade no passo 1 do wizard de cotação;
2. os dois `?? '—'` da versão branda do mesmo padrão.

**Atualização de referência (2026-08-10, sem remover a original):** o `?? []` saiu de
`QuoteWizard.tsx:23` e hoje vive em `features/commercial/hooks/useQuoteCourseSearch.ts:15`, que
documenta o próprio débito no arquivo e **não** expõe `isError` de propósito; `QuotesList.tsx:33`
não existe mais — o `?? '—'` está em `useQuotesListCourses.ts:10` e `useCommercialClients.ts:19`.

### Fora dos BDs — travado em decisão do João

Não entram em bloco porque executar sem decisão é escolher no lugar dele: **Q-6** (idioma canônico
das `ValidationException` — PT em Commercial, ES em Operation, medido); **"Alunos · o dropdown de
empresa depende de uma permissão de outro módulo"** (RBAC/spec); a decisão do **5.2b** sobre
`GET /api/roles`; **"Decidir assimetria entre camadas"** (zero principais); **P-28** (fundo do
certificado, aceito como está);
**P-02** (retenção da auditoria) e **P-05** (consolidar migrations), os dois com gatilho "antes de
subir para produção".

**Atualização 2026-08-12:** o toggle da sidebar e o shell ADR-16 §4 **saíram** — o bloco
`estilizacao-adr16-shell-tipografia` os entregou (toggle ausente do DOM em compact com a pref
persistida intacta; shell inteiro em tokens do tema e a exceção do ADR-16 §4 revogada no ponto 5 do
próprio ADR). As duas linhas foram removidas daqui e de `## Débitos técnicos` no `/fechar-sprint`
de 2026-08-12, pela regra de origem acima.

## Módulos ainda não implementados (feature, não ajuste visual)

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir, e nenhum tem bloco definido.

- **Dashboard** — protótipo tem 4 KPIs, gráfico de turmas, gráfico de certificados, tarefas
  pendentes, alertas recentes e estados sem dados. Real: saudação + subtítulo (17 linhas).
- **Pessoas · Alunos**~~ — entregue em 2026-07-27 (`plans/archive/2026-07-27-bloco-alunos-modulo.md`).
- **Certificados** — entregue: backend no Bloco 7 (2026-08-07,
  `plans/archive/2026-08-05-certificacao-sprint-4.md`) e frontend em 2026-08-08
  (`plans/archive/2026-08-08-certificacao-frontend.md`).
- **Perfil do Usuário** - página dedicada para usuário (administrativo e redator), visualizando seu perfil e dados.

## Futuros dependentes de decisão

- **FUT-1:** templates de documento de turma gerados via código — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com
  a Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
  **Interseção com o item 1 dos próximos blocos:** o manual em PDF/DOCX pré-preenchido é
  exatamente a fatia "baixa, preenche à mão, sobe" para o tipo `MANUAL`. O que continua futuro é
  o mecanismo genérico para os outros tipos (`PRUEBAS`, `EVALUACION_REDATOR`) e o preenchimento
  online.
- **FUT-2:** refino de ancoragem cross-módulo — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.

## Débitos técnicos

> Cada linha continua sendo o registro canônico do seu débito. A cobertura por bloco está mapeada
> em `## Blocos de execução de dívida — BD-2..BD-7`; entrar num BD **não** move nem apaga a linha
> daqui — a remoção acontece só depois do bloco aplicado e do `/fechar-sprint` correspondente.

- **Seis achados B de UI, todos PRÉ-EXISTENTES ao diff do BD-3 e nenhum em arquivo que ele tocou.**
  Saíram das duas passadas de `/lotus-ui-review` do bloco (gate da Task 8 e gate de fechamento,
  2026-08-12) e entram aqui porque o bloco os **encontrou**, não os criou. Relatórios em
  `.artifacts/ui-review/2026-08-12T19-41-45-bd3-gate-task8/` e
  `.artifacts/ui-review/2026-08-12T21-30-00-bd3-closure/` (diretório gitignored — a evidência é
  local, a linha é o registro durável).
  1. **Nome de arquivo truncado sem `title` nem quebra a 390x844** (`RedatorDialog`, seção
     DOCUMENTS) — o valor some sem mecanismo de leitura, que é a mesma classe do débito de campo
     desabilitado que o BD-3 pagou, num controle que ele não cobria.
  2. **Plural cru em duas das sete tabelas** — "3 course(s)" e "1 user(s)" contra "4 clients",
     "7 instructors" e "6 budgets". Rodapé do `AppDataTable` alimentado por chave sem plural i18n.
  3. **Menu recolhido a 390 tira o rótulo do DOM e deixa só `title`** — no toque não há hover, então
     o nome do item de navegação fica inalcançável.
  4. **Cada montagem de página com abas busca as DUAS abas** — custo de rede dobrado na abertura de
     `PeoplePage` e `CertificatesPage`; sem falha funcional, mas mensurável.
  5. **Bloco de erro bilíngue com caminho de campo cru na tela** — título vem do i18n do front e
     segue a sessão (`Could not load the data`), corpo vem do `detail` do RFC 7807 e chega sempre em
     espanhol, citando `aluno.name` (que ainda por cima é português). Medido no estado de erro real
     do `LOT-2026-1001` em `/certificados`.
  6. **A linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão** que o
     modo leitura do próprio BD-3 usa para ausência — a lista não distingue "sem nome" de "campo
     faltando", e é o único lugar onde o registro aparece antes do clique. O diálogo do mesmo
     registro explica a falha; a linha, não.

- **O trio da foto é idêntico em 4 dialogs e ficou fora do item 1 de propósito.**
  `useEntityPhoto({resource, id, mode, url, invalidateKey})` + `afterCreate: (created) =>
  photo.flush(created.id)` + `{photo.hasBufferedFailure && <FormErrorBanner …/>}` +
  `closeBlocked={pending || photo.pending}` se repetem byte a byte em `ClientDialog`,
  `StaffUserDialog`, `StudentDialog` e `RedatorDialog`. Absorvê-los no `useCrudForm` fecharia a
  repetição inteira, mas põe o bloco em cima de caminho de upload com **falha silenciosa** (lição 6:
  `Content-Type` fixado → `File` vira `{}` → 201 com arquivo vazio) e do buffer pós-`201`, que já
  custou duas decisões de spec (D10/D11 do bloco de alunos) e a quarta saída do `CrudDialog`.
  Decisão do João em 2026-08-04: fora do item 1. Saída: entra quando alguém tocar um desses 4
  dialogs por outro motivo, e o commit que absorver paga junto a prova de upload real no gate —
  DoD é foto chegando no S3, não lint verde. `useEntityPhoto` **ganhou teste** em 2026-08-11 (bloco
  `guardas-que-faltam`, seis casos); o que segue aberto aqui é só a **absorção**.

- **B-7 — falha de GET de cursos se disfarça de lista vazia no `QuoteWizard`.**
  `QuoteWizard.tsx:23` usa `courses.data ?? []`: um 403/rede na listagem de cursos deixa o passo 1
  sem nenhum curso, `canAdvance` nunca liga e **nenhuma mensagem aparece** — o usuário lê "não há
  cursos" onde houve falha. `QuotesList.tsx:33` tem a versão branda do mesmo (`?? '—'` no nome do
  curso). É a D16/D11 outra vez, agora em `commercial`; o `BudgetsTable.tsx:36` já trata (a falha da
  query auxiliar conta como falha da tabela). Achado B-7 do `/revisar-frontend` de `commercial`
  (2026-08-03), **mantido fora do bloco por decisão do João**: muda comportamento de propósito e não
  cabe num DoD de "comportamento idêntico". Saída: distinguir loading / erro-com-Reintentar / vazio
  de verdade, como já se faz nas tabelas.
  **Atualização de referência em 2026-08-10 (as citações originais ficam):** o `?? []` migrou de
  `QuoteWizard.tsx:23` para `features/commercial/hooks/useQuoteCourseSearch.ts:15`, que documenta
  este débito no próprio arquivo e **não** expõe `isError` de propósito; `QuotesList.tsx:33` não
  existe mais — o `?? '—'` vive em `useQuotesListCourses.ts:10` e `useCommercialClients.ts:19`.
  Coberto pelo **BD-6**.
- **Q-6 — idioma das mensagens de `ValidationException` é inconsistente no repo.** Commercial escreve em
  PT (`DeleteQuoteAction`, `DeleteClientContactAction`), Operation em ES (`Turma`, `ConcludeTurmaAction`)
  — o usuário chileno lê um ou outro conforme o endpoint. Pré-existente, não introduzido pelo bloco;
  levantado no segundo review (2026-08-01) porque o 422 novo de contatos tem uma única mensagem e ela é
  a que o cliente vê. Exige decisão do João sobre o idioma canônico antes de valer a pena unificar.
- **Guardrail das leis §5 (P-04).** Leis invioláveis hoje são instrução em `CLAUDE.md`, não mecanismo
  — "lei que precisa valer sempre quer Arch test ou hook, não parágrafo" (lição 14). Instalar Pest
  Arch tests cobrindo DDD-lite/sem-Repository, auditoria só na aplicação e demais leis testáveis no
  backend, mais `eslint-boundaries` para a regra de dependência do frontend (features não importam
  PrimeReact direto nem outra feature). Gatilho em `pendencias.md` P-04: reavaliar em 2026-08-15.
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2b (minors do review final) — **só a decisão do João continua aberta:** `GET /api/roles`
  permitir a admin comum enumerar permissões do superadmin enquanto `/api/permissions` é
  superadmin-only. A parte de teste desta linha e a linha inteira do **Bloco 5.2a** saíram em
  2026-08-11 com o BD-2 (`integridade-e-concorrencia-backend`).
- **Alunos · o dropdown de empresa depende de uma permissão de outro módulo.** O módulo de alunos
  inteiro é gated por `identity.user.*` (D8 da spec, e é o que o `StudentController` exige), mas o
  dropdown de empresa do create lista via `clientsApi`, que exige `commercial.client.view`. Quem tem
  `identity.user.create` sem `commercial.client.view` consegue criar aluno pela API e não consegue
  pela tela. Duas tentativas de contornar na UI foram revertidas por serem piores que o problema
  (gate duplo no botão escondia a ação de quem tinha autorização real, `3e0bc36`; travar o submit
  por `isError` bloqueava com lista utilizável em cache, `03280c6`). O estado atual é o menos ruim:
  a falha fica **visível** (dropdown desabilitado + motivo + "Reintentar"), não escondida.
  **Alinhar de verdade exige decisão do João sobre RBAC/spec** — endpoint de clientes sob
  `identity.user.view`, permissão nova, ou aceitar o acoplamento. Levantado no `/revisar-sprint` do
  `bloco-alunos-modulo` (2026-07-27); movido para cá para não morrer no arquivamento do `state.md`.

- **Os 4 hooks de formulário que ficaram fora do `useCrudForm`, com o critério de cada um.**
  `useRedatorForm` monta o create com `new FormData()` — a exceção única e declarada da regra
  `no-restricted-syntax` — e `toPayload` devolvendo objeto **não modela multipart**; entra quando
  (e se) o transporte do redator deixar de ser multipart, ou quando o module aprender a devolver
  `FormData`. `useTurmaConfigForm` **não roda sobre `createCrudResource`** (a turma nasce em rota
  aninhada), então não satisfaz o `MutableResource`; entra se a turma ganhar recurso CRUD próprio.
  `useCourseForm` e `useQuoteForm` são candidatos legítimos e ficaram fora só por corte de escopo —
  ambos manipulam coleção nested (módulos, itens da cotação) e usam `setForm`, que o Q-1 do review
  de 2026-08-05 tirou do retorno público: os dois leem `setForm` do par `{ crud, setForm }`.

- **Um dos três achados do review de 2026-08-05 segue aberto — 🟢, esforço P.** (Q-4) O fato medido
  em 2026-08-01 — `PUT` com `photo_url` devolve 200 porque a promoção no construtor do `ClientData`
  desvia do `CannotSetComputedValue` — foi apagado junto do `submit` do `useClientForm` e não
  reapareceu, num bloco que **aumentou a aposta**: a propriedade deixou de carregar URL e passa a
  carregar path, então quem reintroduzir `...form` manda um caminho interno de storage no corpo da
  escrita. Saída: o próximo commit que tocar `useCrudForm` ou `useClientForm` paga o que couber.
  **Os outros dois foram fechados pelo bloco `guardas-que-faltam` em 2026-08-11:** (Q-2) o barrel
  `shared/hooks/index.ts` parou de exportar `unclassifiedPayloadKeys`, `MutableResource` e
  `CrudFormOptions`; (Q-3) chave declarada em `mapped` **e** em `summaryOnly` passou a reprovar.

- **`UpdateStaffUserAction` apaga o `rut` do staff num `PUT` que só o OMITE.** `UserData::$rut` é
  `Optional`, e a Action traduz `Optional` para `null` antes de gravar
  (`($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut`): quem manda o
  formulário sem a chave zera o RUT de um usuário que tinha. É a mesma classe do defeito que o
  bloco `contrato-de-entrada-identidade-e-nested` fechou nas coleções nested — omissão virando
  apagamento —, num campo escalar. **Pré-existente e fora do escopo daquele bloco**, que só
  atravessou o arquivo para trocar a checagem de unicidade pela porta única; declarado no relatório
  de execução de 2026-08-13 e registrado aqui na correção do review do mesmo dia. Saída: o próximo
  commit que tocar a escrita do staff decide entre preservar o valor atual quando a chave falta e
  exigir a chave no `PUT` — decisão do João, porque muda contrato de entrada. DoD é o teste que
  mostra o RUT sobrevivendo à omissão, não o `if` novo.
