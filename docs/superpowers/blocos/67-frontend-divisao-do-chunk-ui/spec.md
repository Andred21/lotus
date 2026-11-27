# Bloco 67 — `frontend-divisao-do-chunk-ui` — design

- **Data:** 2026-11-27 · **Base:** `main@7381665f` · **Classificação:** bounded
- **Aprovado por:** João, 2026-11-27.
- **Origem:** D-6 da auditoria `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md`; seção
  "D-6: números" do `blocos/64-frontend-revisao-ui-ux-e-icones/fechamento.md`; §3 e D13 da spec do
  65 (`blocos/65-frontend-navegacao-sessao-e-formularios/spec.md`, na branch do 65).

## 1. Intenção

O 64 deixou o D-6 aberto com o veredito do João, opção (b): a carga inicial só melhora de verdade
com o chunk `ui` dividido, de modo que a entrada puxe só o que a casca usa. As páginas já são
`lazy` por rota desde o 64, mas o barrel `@shared/ui` continua num chunk só, de 465 kB com gzip, e
a entrada o importa de forma estática. Tirar o `ui` do `modulepreload` não adianta: a entrada o
pede de qualquer jeito, só mais tarde.

## 2. Medição de 2026-11-27 (build da lane, `main@7381665f`)

**Antes:** a entrada `index-*.js` tem 93 kB gz, e o chunk `ui-*.js` tem 1.682,47 kB brutos e
465,48 kB gz, com `modulepreload` em `index.html`. O `ui` leva recharts, DataTable, Calendar,
FileUpload e Dropdown: o que qualquer página usa.

**Causa:** `frontend/package.json` não declara `sideEffects`. Sem a declaração, o bundler trata
todo módulo de `src/` como tendo efeito colateral, e o `export *` do barrel prende cada wrapper ao
grafo estático da entrada. 29 arquivos de `src/app/` importam `@shared/ui`, entre eles a casca
(`SessionBootstrap`, `Sidebar`, `Header`, `RouteError`, `AppProviders`). O PrimeReact e o
libphonenumber já declaram `sideEffects` nos pacotes deles; quem falta é o nosso.

**Experimento descartável** (revertido, nada commitado), com
`"sideEffects": ["**/*.css", "./src/main.tsx"]`:

| Arquivo | gzip |
|---|---|
| entrada `index-*.js` | 119,34 kB |
| chunk comum pré-carregado (PrimeReact core, i18next, react-query, axios) | 150,84 kB |
| `Dashboard-*.js` (recharts), lazy | 116,70 kB |
| `PhoneInput-*.js`, lazy | 37,40 kB |
| `AppDatePicker-*.js`, lazy | 19,28 kB |
| chunk `ui` | **não existe mais** |

Entrada mais pré-carga: cerca de 270 kB gz, contra cerca de 558 kB antes (−52%).

`src/` tem hoje **um** import nu (`import './x'`) de módulo que não é CSS:
`src/main.tsx:15`, `import "./shared/config/i18n"; // inicializa i18next (side-effect)`. O
experimento não o listava em `sideEffects`, e o build de produção descartaria a inicialização do
i18next. A primeira leitura do planejamento disse "nenhum" porque o grep exigia fim de linha logo
depois do `;` e o comentário escondeu a linha; corrigido no plano, antes de qualquer código.

## 3. Objetivos, não-objetivos, anti-objetivos

- **Objetivo:** a entrada deixa de puxar o barrel inteiro; o D-6 fecha.
- **Não-objetivo:** dividir o chunk comum que sobra. Ele é o que a casca e o login usam de fato
  (botão, input, menu, i18n, query, axios).
- **Não-objetivo:** trocar PrimeReact, Phosphor ou recharts; mexer nos imports das features.
- **Anti-objetivo:** um módulo com efeito colateral real sumir do build de produção em silêncio.
  Com `sideEffects` declarado, um `import './x'` nu de módulo que não é CSS é descartado sem erro e
  sem aviso. Isso quebraria a aplicação só em produção (o `pnpm dev` não faz tree-shaking).

## 4. Abordagens consideradas

- **(A) Declarar `sideEffects` em `frontend/package.json`.** **Escolhida.** Uma linha de
  configuração resolve: a medição da §2 mostra o `ui` sumindo. Os arquivos são disjuntos do plano do
  65, e o 67 corre em paralelo com ele.
- (B) Trocar o import do barrel por import direto nos 178 arquivos que usam `@shared/ui` (161 na
  medição do 64). Descartada: colide com quase toda task do 65 e contradiz a regra de que o barrel
  é a única porta de `shared/ui` (`frontend-fsliced.md`). A medição mostra que não precisa.
- (C) Regra de chunk (`advancedChunks`/`manualChunks`) no `vite.config.ts`. Descartada: com a
  entrada importando o barrel de forma estática, agrupar módulos não muda o que ela pede. Depois da
  (A), o chunk comum que sobra é o que a casca usa, e não há corte que valha.

## 5. Desenho

1. **Configuração.** `frontend/package.json` ganha
   `"sideEffects": ["**/*.css", "./src/main.tsx", "./src/shared/config/i18n.ts"]`. O `main.tsx`
   fica na lista porque é a raiz que monta a aplicação e importa o CSS global; o `i18n.ts` porque
   o `main.tsx` o importa nu para inicializar o i18next (§2).
2. **Catraca.** Um teste em `frontend/tests/` (projeto `repo` do vitest, que só lê o repositório)
   reprova as duas regressões que nada mais veria:
   - a remoção do campo `sideEffects`, ou a troca dele por um valor que não seja a lista declarada;
   - um import nu em `frontend/src/` (fora de teste) que não seja CSS nem aponte para um caminho da
     lista, porque com a declaração ele some do build. Quem precisar de um módulo com efeito
     colateral real acrescenta o caminho dele à lista `sideEffects` e à lista do teste, no mesmo
     commit.
3. **Prova de carga.** Antes e depois, em gzip, no `fechamento.md` do bloco: entrada, chunk comum
   pré-carregado e os `modulepreload` do `index.html`.
4. **Prova de que nada sumiu.** Passada visual curta na stack da lane (offset +2), com o build de
   produção servido (`vite preview`), porque o defeito que a §3 teme só aparece no build:
   - login, Dashboard com gráficos, um formulário com PhoneInput e DatePicker, um diálogo e uma
     tabela;
   - tema claro e escuro;
   - rótulos traduzidos em es-CL, e não chaves cruas: prova de que o i18next inicializou;
   - console sem erro em todas.

## 6. Critério de aceite

1. O build não emite mais o chunk `ui`, e a entrada não importa o barrel inteiro.
2. Entrada mais pré-carga (os `modulepreload` do `index.html` e o `index-*.js`) com até 300 kB gz.
   O número é decisão do Claude, aprovada pelo João com o desenho; a medição da §2 dá cerca de
   270 kB.
3. A catraca da §5.2 existe e falha quando se remove o `sideEffects` ou se escreve um import nu.
4. A passada visual da §5.4 sem regressão e sem erro de console.
5. Gate: `pnpm build`, `pnpm lint` e `pnpm test` verdes.
6. O `fechamento.md` registra o D-6 como **fechado**, com os números de antes e depois.

## 7. Paralelismo com o 65

O plano do 65 não toca `frontend/package.json`, `frontend/vite.config.ts` nem `frontend/tests/`
(conferido contra a branch dele em 2026-11-27). O `lane.sh conferir 67` confirma depois do plano.
Se a execução descobrir que a configuração não basta e for preciso mexer nos imports, o bloco
para: a saída (B) colide com o 65 e volta ao João.

## 8. Deixado ao executor

O nome do arquivo de teste da catraca e a forma da varredura (regex sobre os arquivos de `src/`),
a escolha exata das telas da passada visual dentro do roteiro da §5.4, e o texto do `fechamento.md`.

## Verificação externa

Nenhuma. O bloco cobre a configuração do build do frontend, uma catraca em `frontend/tests/` e o
registro do D-6, tudo dentro do repositório e entregue pelo deploy normal da `main`.
`efeito_externo: nao`.
