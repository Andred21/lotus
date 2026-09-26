# Spec — `backend-config-e-conteudo-de-documento` (item 29)

> **Lane:** `lane-a` · **Árvore:** main tree (gate P-03) · **Contexto:** não (as fontes são as fichas
> `P-79`, `P-75` e `P-59` de `pendencias/abertas.md` e o próprio código) · **Brainstorming:**
> 2026-09-24, com o João.

## 1. Objetivo

Três chaves de configuração do backend foram fichadas como divergentes do que o `.env` promete, e
uma delas grava conteúdo de documento legal. O bloco fecha as três — duas por mecanismo provado em
teste, uma por veredito escrito — e, no caminho, corrige um defeito de data em certificado que a
remedição do brainstorming achou e a ficha subestimava.

## 2. O que a remedição de 2026-09-24 mudou em relação às fichas

As três fichas foram relidas contra `main@3ce23023` antes de decidir. Duas não descreviam o que o
código faz.

| Ficha | O que a ficha dizia | O que a árvore mostra |
|---|---|---|
| `P-75` | `config('sanctum.stateful')` ignora o `.env` e perde `localhost:5173` | A config **segue** o ambiente. Desde `03127249` (2026-08-24) o `docker-compose.yml:19` injeta `SANCTUM_STATEFUL_DOMAINS=localhost:${LOTUS_DEV_VITE_PORT},localhost:${LOTUS_DEV_HTTP_PORT}`, e variável de ambiente real vence o `backend/.env` por desenho (aviso em `backend/.env.example:5-9`). O `.env` da raiz do main tree declara `LOTUS_DEV_VITE_PORT=5174` com `LOTUS_DEV_HTTP_PORT=8080` — por isso o runtime mediu `['localhost:5174','localhost:8080']`, e o Vite desta árvore sobe em `:5174` com `strictPort`. A sonda de 2026-09-02 bateu de `:5173`, onde nada desta árvore roda. A derivação já é guardada por `frontend/tests/compose-dev.test.ts:130` |
| `P-59` | "Alcance conhecido pequeno: só certificado com prazo" | `IssueCertificateAction:29` faz `$now = now()` em UTC, e dele saem o **`emitido_em` do snapshot**, o `valido_ate` e o **ano do código**. Certificado emitido depois das 21h de Santiago (UTC-3 no horário de verão) congela a data de amanhã; em 31/12 à noite, sai `LOT-<ano seguinte>`. Os `today()` de `DocumentValidityStatus`, `StudentClientLinkService`, `RedatorIdoneidadeService` e dos serviços do Dashboard têm o mesmo defeito, com peso menor. Só o `CertificateDisplayStatus` declara o fuso |
| `P-79` | Chave própria com fallback para `app.frontend_url` | Com fallback incondicional, esquecer a chave em produção cai de volta no EIP — o mesmo modo de falha da regra operacional que a ficha critica ("depende de quem opera lembrar"). E o QR é recalculado a cada download (o PDF é regerado do snapshot, spec §4.7 da certificação); o que é imutável é a **cópia já distribuída**, não o registro |

## 3. Decisões

### D1 — `P-59`: instantes gravados em UTC; data de calendário derivada no fuso do negócio

Escolhida pelo João sobre "fuso global Santiago" (que reinterpretaria em 3–4h todo `DATETIME` já
gravado, inclusive em produção, e tornaria ambígua a hora do fim do horário de verão nas
auditorias) e sobre "só o certificado agora".

- Nasce `App\Shared\Support\FusoDoNegocio`, dono único do fuso do cliente:
  - `TIMEZONE = 'America/Santiago'`;
  - `hoje(): CarbonImmutable` — meia-noite local de hoje;
  - `agora(): CarbonImmutable` — o instante atual, expresso no fuso local.
- `CertificateDisplayStatus::TIMEZONE` e `::hoje()` passam a **delegar** ao `FusoDoNegocio`; os
  consumidores atuais de Certification não mudam de assinatura.
- **Instante continua instante.** `approved_at = now()`, `revoked_at`, `concluded_at`,
  `RetentionPolicy` e `SignedUrlTransformer` seguem em UTC — nada já gravado é reinterpretado.
- **Data de calendário deriva do fuso do negócio.** Sítios migrados (lista fechada, medida em
  `main@3ce23023`):

  | Sítio | O que deriva |
  |---|---|
  | `Certification/Actions/IssueCertificateAction` | `emitido_em` (via `CertificateSnapshotBuilder`), `valido_ate`, ano do código |
  | `Certification/Enums/CertificateDisplayStatus` | passa a delegar |
  | `Identity/Enums/DocumentValidityStatus` | "hoje" da vigência de documento do redator |
  | `Identity/Services/StudentClientLinkService` | `started_on` / `ended_on` do vínculo aluno-empresa |
  | `Operation/Services/RedatorIdoneidadeService` | "hoje" da idoneidade |
  | `Dashboard/Services/IdentityMetricsQuery`, `RedatorScopeQuery`, `RedatorLoadQuery`, `CertificationMetricsQuery`, `OperationMetricsQuery`, `DashboardWindows` | "hoje" e janelas |
  | `Dashboard/Data/DashboardFilterData` | período default |
  | `Dashboard/Services/CommercialMetricsQuery` (`approved_at`), `CertificationMetricsQuery` (`concluded_at`) | instante projetado em data — passa a converter para o fuso local antes do `toDateString()` |

- **Catraca estática** em `tests/Unit/Shared/`: reprova em `app/` as grafias `today()`,
  `Carbon::today(`, `CarbonImmutable::today(`, `now()->toDateString(` e `Carbon::now()`/
  `CarbonImmutable::now()` seguidos de `->toDateString(`/`->startOfDay(`/`->endOfDay(`. Allowlist
  declarada: só `Shared/Support/FusoDoNegocio.php`. Usa `Tests\Support\ScansPhpSource`, como as
  catracas do item 24 (Q-4 daquele review).

### D2 — `config/app.php` mantém `'timezone' => 'UTC'` literal, como decisão escrita

Refinamento aprovado pelo João. A ficha propunha `env('APP_TIMEZONE', 'UTC')`; o bloco **não** faz
isso. Com a chave lida do ambiente, bastaria alguém escrever `America/Santiago` no `.env` de
produção para reinterpretar o banco inteiro em silêncio — exatamente o risco que a D1 rejeitou. A
divergência entre `.env` e config fecha do mesmo jeito, na direção segura:

- `config/app.php` ganha comentário dizendo que o fuso de armazenamento é UTC por decisão e que o
  fuso do negócio mora no `FusoDoNegocio`;
- `APP_TIMEZONE` **sai** de `backend/.env.example`, no lugar fica um comentário apontando para o
  `FusoDoNegocio` (medido: nem `deploy/` nem `docker-compose.prod.yml` declaram a chave);
- teste prova `config('app.timezone') === 'UTC'` **com** `APP_TIMEZONE=America/Santiago` no
  ambiente.

### D3 — `P-79`: chave própria, fallback só fora de produção

Escolhida pelo João sobre "fallback sempre" (a ficha) e "sem fallback nenhum".

- `config/app.php`: `'certificate_validation_url' => env('CERTIFICATE_VALIDATION_URL')`, ao lado de
  `certificate_issuer` — os dois são conteúdo de documento.
- Dono único: `Certification\Services\CertificateValidationUrl`, com
  - `base(): string` — resolve e valida a base;
  - `para(Certificate $certificate): string` — `base() . '/validar/' . uuid`.
  - Fora de `production`: chave vazia cai para `app.frontend_url`.
  - Em `production`: chave vazia **ou** sem `https://` lança
    `Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada`.
- A exceção segue o molde da `CorruptedSnapshotException`: `RuntimeException` + `PublicDetail`,
  **não** `RecusaDeDominio`. Sai **500** pelo `ProblemDetails`, com `detail` legível (frase em
  `lang/<locale>/certification.php` nos três locales) e **registrada no log** — é configuração
  quebrada, não recusa de negócio, e precisa virar chamado.
- A guarda dispara em dois pontos: no `CertificatePdfService` (monta o QR) e **antes da transação**
  em `IssueCertificateAction`, para que não nasça certificado que ninguém consegue baixar.
- `deploy/aws/env.prod.example` ganha `CERTIFICATE_VALIDATION_URL=https://app.lotusotec.cl`, com o
  motivo; o runbook `deploy/aws/README.md` §7/§11 troca "nenhum certificado real se emite antes de…"
  (procedimento) por "o sistema recusa emitir e baixar sem a chave https" (mecanismo), mantendo a
  razão de fundo.

### D4 — `P-75`: fecha por veredito escrito, sem código

A ficha é encerrada com a medição da §2: o mecanismo que ela pedia ("provar `config('sanctum.stateful')`
seguindo o ambiente") já existe e é guardado no lado do compose. Nenhum código, nenhum teste novo. O
offset misto do `.env` da raiz do main tree (`VITE=5174`, `HTTP=8080`) é arquivo local gitignorado e
escolha do João; o veredito o registra como a causa da medição, não o corrige.

## 4. Fora de escopo

- **`P-76`** — decisão do João de 2026-09-21, mantida.
- Datas calculadas no **frontend** (formatação e "hoje" do React): o bloco é backend.
- **`Dashboard/Services/AnalyticsQuery`** (achado no planejamento, 2026-09-24): agrupa INSTANTES
  (`created_at`, `approved_at`, `concluded_at`) por mês com `format('Y-m')` em UTC, e filtra o
  período com limites também em UTC. É coerente por dentro. Migrar só o agrupamento criaria balde
  fora do período — uma linha de 31/08 às 22h em Santiago entra em setembro pelo limite UTC e cai
  no balde de agosto. Limites e baldes precisam mudar juntos, com conversão do período de dias
  locais para instantes UTC. Fica fora deste bloco e vira ficha nova no fechamento.
  **Emenda de 2026-09-25 (review Q-1, aprovada pelo João):** a premissa caiu. Os limites do
  `AnalyticsQuery` vêm do `DashboardFilterData`, que a D1 migrou — o período default passou a
  terminar às 23:59:59 UTC do dia de Santiago, e das 21h à meia-noite locais o que acontecia no dia
  sumia das séries e dos rankings. Limites e baldes migraram juntos neste bloco
  (`FusoDoNegocio::inicioDoDia()`/`fimDoDia()` e mês de Santiago); a ficha nova não nasce.
- Consequência operacional aceita da D3: na fase sem DNS a produção **recusa** emitir e baixar
  certificado, inclusive o de prova `LOT-2026-1000` já emitido. É a proibição do runbook virando
  comportamento.
- Consolidar `DataSql`, `JanelaDeAviso` ou a `CertificateQueryBuilder` no `FusoDoNegocio` além do
  que a delegação do `CertificateDisplayStatus` já alcança.
- Reemitir ou corrigir certificados já emitidos: a produção só tem o `LOT-2026-1000` de prova, e o
  runbook proibiu emissão real até o domínio definitivo.

## 5. DoD (comportamento provado)

1. Emissão com relógio congelado em **23h de Santiago** grava `emitido_em` com a data local; emissão
   em **31/12 às 22h** de Santiago grava código `LOT-<ano local>`. Os dois testes são vistos
   reprovar contra o código atual.
2. `config('app.timezone')` é `UTC` com `APP_TIMEZONE=America/Santiago` no ambiente.
3. Pelo menos um sítio não-certificado migrado (`DocumentValidityStatus`) provado na virada:
   documento que vence hoje em Santiago, às 22h locais, segue vigente.
4. Catraca de D1 verde e **vista reprovar por sonda** — arquivo restaurado de cópia no scratchpad,
   nunca por `git stash`.
5. QR carrega a URL da chave quando preenchida; em `local`, sem chave, cai para `frontend_url`; em
   `production`, sem chave **e** com chave `http://`, PDF e emissão respondem 500 com o `detail` da
   exceção nomeada, e nenhum certificado é criado — o fallback exercido nos dois sentidos.
6. Contra a API real do dev: um certificado emitido com `CERTIFICATE_VALIDATION_URL` definida carrega
   no QR a URL dessa chave (QR decodificado do PDF, não inspeção de código).
7. `generated.ts` com diff vazio após `typescript:transform`; Pint `passed` nos `.php` tocados;
   `LocaleParityTest` e `MensagemLiteralTest` verdes; suíte backend inteira verde.
8. Fichas: `P-79` e `P-59` fecham por mecanismo, `P-75` por veredito escrito, e as três migram para
   `encerradas.md` no fechamento.
