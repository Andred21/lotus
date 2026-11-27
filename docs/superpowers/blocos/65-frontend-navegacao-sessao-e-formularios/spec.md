# Bloco 65 — `frontend-navegacao-sessao-e-formularios` — design

- **Data:** 2026-11-26 · **Base:** `main@7381665f` · **Classificação:** bounded
- **Spec canônica:** `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md`, a spec
  compartilhada pelos blocos 64, 65 e 66 (D12). Intenção, objetivos, anti-objetivos, decisões
  D1–D12, design por fase e critério de aceite moram lá e **valem aqui sem repetição**. Este
  documento registra só o recorte do 65 e o que o planejamento dele decidiu.
- **Fonte dos achados:** `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md` (`arquivo:linha` de
  cada ID).

## 1. Recorte

Segundo dos três blocos da revisão ui-ux-pro-max. Fecha **16 IDs**:

| Tema | IDs | Fase da spec do 64 |
|---|---|---|
| Lista e abas na URL, voltar pelo histórico | C-3, C-11 | 2 (parte de navegação) |
| Sessão e dado fresco | C-1, D-1, D-9 | 3 |
| Formulários protegidos | C-2 (diálogo), C-7, C-8, A-10, C-9 | 4 |
| Feedback e confirmações | C-5, C-4, C-6, A-2 | 4 |
| Gerador de tema | A-1 (D1), B-8 (D5); o índigo de info (D7) entra aqui como parte do gerador, e o B-2 fecha no 66 | 5 (parte) |

Critério de aceite: itens **3, 5 e 6** da §7 da spec do 64.

## 2. Conferência do rascunho contra a `main`

O rascunho `blocos/64-…/rascunho-plano-65.md` (movido para `plano.md` deste bloco) foi conferido contra `main@7381665f`, que o 64
deixou:

- todos os caminhos que ele cita existem;
- a guarda do 64 (`shared/hooks/useUnsavedChangesGuard.ts`) expõe `confirmDiscard`,
  `allowNavigation` e `dialogProps`, com o contrato que o rascunho supõe: quem liga a guarda monta
  `<DiscardChangesDialog {...guard.dialogProps} />`, e `allowNavigation()` vem antes do `navigate`
  do salvar;
- o rascunho tem 10 tasks, no teto (`plano-de-bloco-ate-10-tasks`).

O plano do bloco é o rascunho movido para `plano.md`, **sem a seção do D-6** e com a contagem de
IDs em 16.

## 3. Abordagens consideradas — encaixe do D-6

O 64 deixou o D-6 aberto (veredito do João, opção b: só fecha com o chunk `ui` dividido) e mandou
o encaixe para este planejamento.

**Medição de 2026-11-26, build da lane:** a entrada `index-*.js` importa o chunk `ui-*.js` de
forma **estática** (primeira instrução do arquivo). O chunk tem 1.682,47 kB brutos e 465,48 kB com
gzip. Não há `manualChunks` nem regra de divisão no `vite.config.ts`: o rolldown juntou o barrel
`@shared/ui` sozinho. Consequência: **tirar o `ui` do `modulepreload` não reduz a carga**, porque a
entrada o pede de qualquer jeito, só que mais tarde. A única saída real é dividir, de modo que a
entrada puxe só o que a casca usa. Ainda não se sabe se isso se resolve por configuração
(`sideEffects`, regra de chunk) ou se exige trocar o import do barrel por import direto nos 161
arquivos que usam `@shared/ui`.

- **(A) Bloco próprio, fora do 65.** **Escolhida pelo João (2026-11-26).** O bloco novo começa
  medindo. Se a saída for configuração, os arquivos são disjuntos de qualquer lane, e ele pode rodar
  em paralelo. Se exigir import direto, roda depois do 65 sem colisão. O 65 fica com 10 tasks e 16
  IDs.
- (B) Dentro do 65, fundindo a Task 4 (painel) na Task 3 (sessão) para abrir vaga. Descartada:
  se a saída for import direto em 161 arquivos, colide com quase toda task do 65 e estoura a task.
- (C) Empurrar outro ID do 65 para o 66. Descartada: o 66 já carrega 27 IDs.

## 4. Decisão

| # | Decisão | Quem |
|---|---|---|
| D13 | O **D-6** sai do 65 e vira a ficha **67** do backlog, bloco próprio, com a medição da §3 como ponto de partida. A ficha entra na `main` pela via normal (PR de docs, invariante 10), fora desta lane. O `fechamento.md` do 65 registra o D-6 como "levado ao 67", não como ID do bloco. | João |

## 5. Deixado ao executor

O mesmo da §8 da spec do 64, no recorte deste bloco: textos novos (sessão expirada, motivos de
botão desabilitado, toasts de sucesso), divisão fina das tasks e o registro de veredito com prova
quando um achado já estiver resolvido na `main`.

## Verificação externa

Nenhuma. O bloco cobre frontend (hooks de `shared/`, wrappers de `shared/ui`, formulários das
features, gerador de tema e CSS gerado) e o DESIGN.md, tudo dentro do repositório e entregue pelo
deploy normal da `main`. `efeito_externo: nao`.
