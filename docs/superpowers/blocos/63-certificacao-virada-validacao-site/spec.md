# Bloco 63 — `certificacao-virada-validacao-site` — design

> Data: 2026-11-25 · Lane: `feat/63-certificacao-virada-validacao-site` · Packet: nenhum (`Contexto: não`)
> Ficha: `docs/superpowers/backlog.md` §63. Entrega 3 da spec do 61
> (`blocos/61-certificacao-validacao-no-site/spec.md`, §1, §2 decisões 3 e 4, §11). `P-89`, `D-70`.
> Tamanho: mudança pequena (`bounded`). Design aprovado pelo João em 2026-11-25.

## 1. Intenção

A validação de certificado sai do app e passa a viver só no site institucional. A pré-condição
está cumprida: a página `lotusotec.cl/validar` está no ar (release `5fb34c9` do `lotus-site`, A8
provado), e o 61 está aceito em produção.

Depois deste bloco:

- o QR de todo certificado emitido aponta para `https://lotusotec.cl/validar/<uuid>`;
- o QR antigo impresso (`https://app.lotusotec.cl/validar/<uuid>`) chega ao site por `301`;
- o app não tem mais tela de validação.

O certificado tem peso legal. O conteúdo e o layout do PDF não mudam, só o destino do QR.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos:**
- QR novo: `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl` no molde e no host.
- QR antigo: `301` de `/validar` e `/validar/*` do app para o mesmo caminho no site.
- Saída da `ValidationPage` e de tudo que só ela usa.
- P-89 com o endereço novo no gatilho.
- D-70 fechada como "migrou para o site".

**Não-objetivos:** a página do site; conteúdo e layout do PDF; a API pública
(`GET /api/publico/certificados/{uuid}`, consulta e PDF públicos ficam como estão, porque o site
as usa); mover o `SessionBootstrap` de volta para cima do `AppRouter`.

**Anti-objetivos** — falha mesmo que funcione:
- qualquer rota `api/*`, `sanctum`, `up` ou de tela autenticada desviada pelo `301`;
- caminho que só começa com `validar` (ex.: `/validarx`) redirecionado;
- query string perdida no redirect;
- o `tls.conf` e o `prod.conf` divergindo fora do que a catraca já admite;
- o botão de deploy recusando por `tls.conf` desalinhado no host.

## 3. Como funciona hoje

- `CertificateValidationUrl::para()` (`backend/app/Domains/Certification/Services/CertificateValidationUrl.php:41`)
  monta `<base>/validar/{uuid}`. Em produção a base vem de `CERTIFICATE_VALIDATION_URL`, obrigatória
  e https. O valor atual é `https://app.lotusotec.cl` (`deploy/aws/env.prod.example:101`), pinado
  pela catraca `frontend/tests/env-prod-example.test.ts:33` e pela tabela do runbook
  (`deploy/aws/README.md:744`).
- O nginx serve `/validar/*` pelo fallback do SPA (`location /` com `try_files ... /index.html`),
  em `docker/nginx/prod.conf` e no servidor 443 de `deploy/nginx/tls.conf`. A catraca
  `frontend/tests/nginx-conf.test.ts` compara os blocos dos dois arquivos.
- O `tls.conf` vai ao host por `scp` (`deploy/aws/README.md:284`). A checagem de alinhamento compara
  o sha256 dele no host com o do SHA promovido, e o botão recusa quando divergem
  (`.github/scripts/conferir-alinhamento.sh:59`).
- A tela: rota `/validar/:uuid` em `frontend/src/app/router/AppRouter.tsx:34`, fora do ramo
  protegido. Só ela usa:
  - `features/certification/components/Validation/` (`ValidationPage`, `StatusHeading`,
    `NotFoundCard` e os testes);
  - `features/certification/hooks/useValidationPage.ts` e o teste;
  - `features/certification/api/usePublicCertificate.ts`;
  - `validationVerdictClass` em `shared/ui/typography.ts:86`, com os asserts dele em
    `typography.test.ts`;
  - o bloco `certificate.validation` dos três locales (`shared/config/locales/*.json`).
- Comentários e docs que citam a tela: `app/App.tsx`, `shared/testing/providers.tsx:70`,
  `Historial/CertificateViewDialog.tsx:62`, `.claude/rules/frontend-fsliced.md:38` e `:322`,
  `PRODUCT.md:18`.

## 4. Abordagens consideradas

- **Ordem do deploy (decidido: env e `301` no mesmo release).** A alternativa, env primeiro e `301`
  depois, só faria sentido se a página do site ainda não existisse. Ela existe, então separar custa
  dois deploys sem reduzir risco.
- **QR antigo (decidido no 61: `301` + saída da tela).** Manter as duas telas faria a validação
  divergir com o tempo.
- **Prova do QR novo.** Não há certificado de teste em produção (decisão da P-89), então a prova é
  o QR decodificado do primeiro PDF real emitido depois do deploy, com `pdftoppm` + `zbarimg`.

## 5. Design

### 5.1 QR novo

- `deploy/aws/env.prod.example`: `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl`. O comentário da
  fase sem DNS continua valendo. Uma linha nova diz que o domínio é o do site, não o do app.
- Catraca `env-prod-example.test.ts`: o caso de `CERTIFICATE_VALIDATION_URL` sai do `DOMINIO` do app
  e passa a esperar `https://lotusotec.cl`. Os outros cinco campos não mudam.
- Runbook `deploy/aws/README.md` §11, tabela (`:744`): coluna "Agora" com `https://lotusotec.cl`.
- Nenhuma mudança no backend: `para()` já fixa `/validar/`.

### 5.2 QR antigo (`301`)

- Uma `location` nova em `docker/nginx/prod.conf` e no servidor 443 de `deploy/nginx/tls.conf`,
  idêntica nos dois arquivos.
  - Casa exatamente `/validar` e `/validar/...`, e não `/validarx`.
  - Responde `return 301 https://lotusotec.cl$request_uri;`, com caminho e query string preservados.
  - O `/validar` sem uuid entra também: o formulário de código + RUT do site mora nele.
- Ela não tem `add_header`: no 443 herda o HSTS do server, e a catraca do HSTS continua verde.
- O servidor 80 do `tls.conf` não muda: manda tudo para https no app, que então dá o `301` ao site.
- A catraca `nginx-conf.test.ts` ganha três casos: a `location` existe nos dois arquivos com o mesmo
  corpo, o destino é `https://lotusotec.cl$request_uri`, e o padrão não casa `/validarx` nem
  `/api/...`.
- Prova de comportamento, além da estática: o `prod.conf` rodando num `nginx:alpine` na rede do
  compose da lane, medido com `curl -sI`. `/validar/<uuid>?x=1` e `/validar` dão `301` com
  `Location` exato; `/validarx`, `/` e `/api/...` não. O mecanismo da medição é do executor.

### 5.3 Saída da tela

- Sai a rota `/validar/:uuid` do `AppRouter`, e saem os arquivos que só a tela usa (§3).
- `validationVerdictClass` sai de `typography.ts`, com os asserts dele.
- O bloco `certificate.validation` sai dos três locales. Antes de remover, o executor confere
  por busca que nenhuma chave dele é lida fora dos arquivos removidos. A catraca de plural
  `shared/config/locales/plural.test.ts:37` lista `certificate.validation.hours` e perde a entrada
  junto.
- O `SessionBootstrap` fica onde está. A frase do `App.tsx` sobre a rota pública passa a dizer que
  não há rota pública hoje. Mover o bootstrap é refactor fora do escopo.
- Os comentários de §3 que citam a tela são atualizados ou removidos.
- `.claude/rules/frontend-fsliced.md` e `PRODUCT.md` passam a dizer que a validação pública é do
  site.
- `pnpm build`, `pnpm lint` e `pnpm test` verdes. A suíte do backend não muda: a API pública fica.

### 5.4 Pendências

- **P-89** (`pendencias/abertas.md` e o índice em `pendencias/README.md`): o gatilho passa a ser o
  QR de um PDF de produção emitido depois do deploy, decodificado para
  `https://lotusotec.cl/validar/<uuid>`, e a página do site responder com o estado certo. Ela fecha
  na aceitação (item 4 da verificação externa).
- **D-70**: a linha "contacta a Lotus" sai do app junto com o bloco de locale. A ficha sai do
  `backlog.md` no fechamento deste bloco, com a nota de que migrou para o site. Se o canal de
  contato do site ainda depende da Lotus, a pendência é do `lotus-site`.

## 6. Critério de aceite

1. `env.prod.example` traz `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl`, e a catraca prova o
   valor.
2. `prod.conf` e `tls.conf` têm a mesma `location` de `301`. A catraca prova presença, igualdade,
   destino e o recorte do padrão. A medição no `nginx:alpine` prova o comportamento (§5.2).
3. Nenhum arquivo do frontend importa ou cita `ValidationPage`, `useValidationPage`,
   `usePublicCertificate` ou `validationVerdictClass`. Não há rota `/validar` no `AppRouter`.
   `build`, `lint` e `test` verdes.
4. P-89 com o gatilho novo, nas duas casas.
5. Em produção, depois do deploy: os quatro itens de §Verificação externa.

## 7. Deixado ao executor

- A forma exata da `location` (regex ou prefixo), desde que cumpra §5.2.
- Como medir o `prod.conf` no `nginx:alpine`.
- A redação dos comentários e das linhas de doc atualizadas.

## Verificação externa

1. Trocar `CERTIFICATE_VALIDATION_URL` para `https://lotusotec.cl` no `.env` de produção em
   `/opt/lotus`, **antes** do deploy. A checagem de alinhamento só compara nomes de chave, e o
   container `app` só lê o valor novo quando o deploy o recria.
   - prova: nenhuma
2. Copiar por `scp` o `deploy/nginx/tls.conf` do SHA a promover para `/opt/lotus/nginx/`, **antes**
   do botão. Sem isso a checagem de alinhamento recusa o deploy pelo sha256 do `tls.conf`. O nginx
   em execução só carrega o arquivo novo no deploy.
   - prova: nenhuma
3. Deploy do bloco em produção (merge na `main`, espelho para o corporativo, botão de deploy). O QR
   antigo passa a responder `301`. Antes do deploy, o mesmo caminho responde `200` pelo fallback do
   SPA.
   - prova: `producao GET /validar/00000000-0000-0000-0000-000000000000 -> 301`
4. Decodificar com `pdftoppm` + `zbarimg` o QR do primeiro certificado real emitido depois do deploy:
   ele leva a `https://lotusotec.cl/validar/<uuid>`, e a página do site abre com o estado certo.
   Fecha a P-89.
   - prova: nenhuma
