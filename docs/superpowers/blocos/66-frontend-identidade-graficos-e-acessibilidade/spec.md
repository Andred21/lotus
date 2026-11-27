# Bloco 66 — `frontend-identidade-graficos-e-acessibilidade` — design

- **Data:** 2026-11-27 · **Base:** `main@9447d785` · **Classificação:** bounded
- **Spec canônica:** `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md`, a spec
  compartilhada pelos blocos 64, 65 e 66 (D12). Intenção, objetivos, anti-objetivos, decisões
  D1–D12, design por fase e critério de aceite moram lá e **valem aqui sem repetição**. Este
  documento registra só o recorte do 66 e o que o planejamento dele decidiu.
- **Fonte dos achados:** `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md` (`arquivo:linha` de
  cada ID).

## 1. Recorte

Terceiro e último bloco da revisão ui-ux-pro-max. Fecha **27 IDs**:

| Tema | IDs | Fase da spec do 64 |
|---|---|---|
| Identidade | B-2 (D7), B-5 (D4), B-3/A-11, B-4 (D3) | 5 |
| Identificadores | B-1, B-7, B-11 | 5 |
| Gráficos do painel | D-2 (D6), D-3, D-4, D-5, D-7, D-8 | 6 |
| Teclado e leitor de tela | A-3, A-4, A-5, A-6, A-7, A-8, A-9, A-12 | 7 |
| Carga e polimento | D-10, B-6, B-9, B-10, B-12 | 8 |

O bloco também paga quatro pendências que outros blocos passaram a ele. Nenhuma é ID da auditoria:

1. **Irmãs da tinta suave** (decisão 2 do João no fechamento do 65): `p-tag` e `p-badge` nas
   severidades `success`, `warning` e `danger` seguem o `info`, que o 65 levou à tinta suave (D15).
2. **T8 do fechamento do 64, item 1 da P-120:** `useHistorial.ts:144,148` entrega o `refetch` cru,
   e nos diálogos de ver certificado e de reemissão o 403 ainda mostra "Reintentar". Os dois passam
   pelo `retryFor`, na forma que o `useEmissionPanelState.ts:141` já usa.
3. **M-2 do fechamento do 64:** a seção de diálogos do DESIGN.md (D8), que o 64 deixou ao 66. Já
   estava no rascunho (Task 9).
4. **Item 2 da P-120:** as rotas-layout (`SessionBootstrap`, `AppLayout`, `ModuleGuard`) não têm
   `errorElement`. Um erro de render nelas cai no `DefaultErrorComponent` do react-router, que
   mostra mensagem e stack (D16).

Com os itens 2 e 4, a P-120 fecha inteira neste bloco.

O bloco monta, por fim, o **"Quadro dos 46"** (critério 1): cada ID da auditoria aponta para o
`fechamento.md` do bloco que o fechou — 64, 65, 66 e, para o D-6, **67** (D13 da spec do 65).

Critério de aceite: itens **1, 3 e 4** da §7 da spec do 64. O item 3 inclui `php artisan test`,
porque o D-2 toca o backend.

## 2. Conferência do rascunho contra a `main`

O rascunho `blocos/64-…/rascunho-plano-66.md` (movido para `plano.md` deste bloco) foi conferido
contra `main@9447d785`, que o 65 e o 67 deixaram:

- todo caminho que ele cita existe, exceto os arquivos de teste que ele mesmo cria;
- os achados seguem abertos no código: `role="img"` nos dois wrappers de gráfico, `formatUf` com
  vírgula fixa, `monthlyCounts`/`monthlyAmounts` sem início e fim, `transition-all` no sidebar,
  `h-screen` no layout, nenhuma regra `prefers-reduced-motion` no `index.css`;
- o rascunho tem 10 tasks, no teto (`plano-de-bloco-ate-10-tasks`), e segue com 10 depois do D14
  e do D16.

Ajustes ao rascunho, todos *call do Claude*:

- **Medição de carga (Task 9):** o `dist` se compara com o do bloco 67 (entrada mais pré-carga,
  267,85 kB com gzip, no `fechamento.md` dele), não com a Task 7 do 64. O D-6 é do 67.
- **Assets sem uso (D-10):** `src/assets/Logo.png`, `hero.png`, `react.svg` e `vite.svg`, mais
  `public/favicon.svg` e `public/icons.svg`, não têm referência em `src` nem no `index.html`.
  Saem os seis. O `index.html:7` declara `type="image/svg+xml"` para `/lotus.png`; vira
  `image/png`.
- **Quadro dos 46 (Task 10):** inclui o fechamento do 67, para o D-6.
- **Linha do layout (B-9):** o `h-screen` do `AppLayout` está em `:17`, não em `:11`.

## 3. Abordagens consideradas — encaixe das pendências 1 e 2

O plano já estava no teto de 10 tasks quando as duas pendências apareceram.

- **(a) Dentro das tasks existentes.** **Escolhida pelo João (2026-11-27).** A pendência 1 entra na
  Task 2, que já trata de contraste (barra de progresso): é o gerador de tema mais
  `pnpm brand-theme`. A pendência 2 entra na Task 7, que trata do estado dos controles. O plano
  fica com 10 tasks, e a Task 2 cresce um pouco.
- (b) Ficha nova no backlog, com o 66 igual ao rascunho. Descartada: as duas são pequenas, e os
  arquivos delas não colidem com nenhuma task.

## 4. Decisões

| # | Decisão | Quem |
|---|---|---|
| D14 | Pendências 1 e 2 entram nas Tasks 2 e 7, abordagem 3(a). | João |
| D15 | **Irmãs da tinta suave.** `.p-tag-{success,warning,danger}` e `.p-badge-{success,warning,danger}` recebem no gerador a composição que o `info` recebeu no 65: fundo do `-500` do matiz a 15% sobre `--surface-card` e tinta no mesmo degrau do `--tone-<sev>-ink` de cada tema (`brand-theme.css`). Assim a classe crua e o `AppTag` (`severityTone`) pintam igual. `message` e `toast` ficam fora, porque a decisão do João nomeou tag e badge. Hoje nenhuma tela renderiza a classe crua: o `AppTag` compõe por `style` inline, e não há `Badge` em `src`. Por isso a prova é o teste do gerador nos dois temas, sem captura. | João (escopo) · Claude (composição, recorte e prova) |
| D16 | **Item 2 da P-120 entra na Task 3** (o shell). As três rotas-layout de `src/app/router/routes.tsx` — o grupo de login, o grupo protegido e o guard por módulo — ganham `errorElement: <RouteError />`. O `RouteError` do 64 não depende do layout: mostra o `AppErrorState` com "Recargar", sem stack. O erro de uma página continua no `errorElement` dela, que é o mais próximo. | João (encaixe) · Claude (forma) |

## 5. Fora

- O que é do 64, do 65 e do 67.
- Uso autenticado no celular como contexto novo: B-6 e B-9 só deixam de quebrar.
- O aviso de React `prevButton`/`nextButton` do `AppTabView`, registrado no fechamento do 65.
  *Call do Claude:* não é ID nem pendência passada ao 66.

## 6. Deixado ao executor

O mesmo da §8 da spec do 64, no recorte deste bloco: os textos novos (rótulos curtos `nav.short.*`,
títulos dos cards "Clases" e "Alumnos", rótulos `aria` do Prime e fechar do toast), a divisão fina
das tasks e o registro de veredito com prova quando um achado já estiver resolvido na `main`.

## Verificação externa

Nenhuma. O bloco cobre frontend (wrappers de `shared/ui`, shell, painel, gerador de tema e CSS
gerado), um ajuste de query no backend (`AnalyticsQuery`, D-2) e o DESIGN.md, tudo dentro do
repositório e entregue pelo deploy normal da `main`. `efeito_externo: nao`.
