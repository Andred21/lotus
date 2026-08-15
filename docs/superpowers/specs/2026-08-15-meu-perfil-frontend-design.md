# Spec — `meu-perfil-frontend` (Sprint 6 · Meu Perfil, bloco 2 de 2)

> **Data:** 2026-08-15 · **Estado de origem:** `ready_for_planning` → `planning`
> **Context Packet:** `docs/superpowers/context-packets/2026-08-15-meu-perfil-frontend.md`
> **Fonte canônica:** Drive `meu-perfil-escopo-funcional.md` (ID `1lI3IEOx9_2H093TvhkfO16_hhO9LxFvI`)
> **EAPs:** Notion 8.5.4 (hook/mutations), 8.5.5 (página e aceite), 8.5.9 (UI review)
> **Baseline:** `feat/meu-perfil-frontend@64d2883`, ramificado de `main@36faf44`

## 1. O que o bloco entrega

A tela **Mi perfil** em `/perfil`, para Admin e Redator, consumindo o contrato self-service
estabilizado pelo bloco 1. O usuário lê o próprio perfil, edita o que é seu (nome, telefone, foto),
troca a própria senha e — quando é Redator — envia a própria documentação profissional e vê o
resumo dos cursos que está habilitado a ministrar. A rota já existe como `ModulePlaceholder`; o
bloco substitui o conteúdo, não cria entrada de navegação.

**Não entrega:** nada de backend, nenhuma regeneração de `generated.ts`, nenhuma feature `profile`
transversal, nenhuma edição de e-mail/RUT/papel/`type`/`is_active`, e nada de turmas, agenda,
pendências ou séries — que são do Dashboard e foram removidos deste contrato pelo corte D1 do
bloco 1.

## 2. Decisões

D1–D5 foram escolhidas pelo João entre alternativas apresentadas no brainstorming. D6–D10 são
derivadas e declaradas como tais.

- **D1 — Layout de duas colunas com corte por mutabilidade.** À esquerda o que o usuário **não**
  controla: foto e nome exibidos, papel, e-mail e RUT em leitura, mais o resumo do Redator. À
  direita, exatamente o que é self-service: nome, telefone, senha e documentos. A regra do bloco
  vira a regra visível do layout, e a esquerda tem conteúdo real nos dois papéis — o que não
  acontecia no corte por seção, onde para o Admin a coluna existia só para segurar uma foto. Custo
  aceito e declarado: o nome aparece nos dois lados, exibido à esquerda e editável à direita.
  Colapsa para uma coluna abaixo de `lg`.
- **D2 — `useResourceState` nasce como hook novo em `shared/hooks/`; `useLoadState` fica
  intocado.** `useLoadState` é tipado `UseQueryResult<T[], ProblemDetails>` e sua razão de existir é
  a política "falhou" vs. "veio vazia" de uma **lista** (`isEmpty`, `unusable`, `data.length`). O
  perfil é um objeto único: não tem vazio, e generalizar o hook mexeria nos seis consumidores atuais
  por conveniência de um sétimo caso que não é do mesmo tipo. Arquivo novo também é a opção de menor
  colisão com a frente paralela do Dashboard, que pode adotá-lo depois.
- **D3 — `ProfileDocumentSlot` é componente irmão, não reuso do `RedatorDocumentSlot`.** O slot
  administrativo deriva o status no front (`docStatus(doc.valid_until)`), porque
  `RedatorDocumentData` não tem `status`. O slot do perfil consome
  `RedatorProfileDocumentData.status` **pronto do backend, sem recalcular nada** (key fact 3 do
  packet; Drive §5). São duas fontes de verdade diferentes para a mesma pergunta — embutir as duas
  no mesmo componente é o que faria a tela mentir sob refactor. `RedatorDocumentSlot`, `SlotBody` e
  `redatorStatus.ts` não são tocados por este bloco.
- **D4 — Senha em formulário inline na seção Seguridad, com o aviso antes do botão.** Não é diálogo
  nem tela separada: são três campos numa seção que já está na coluna direita. O aviso "as outras
  sessões serão encerradas; esta continua aberta" (D3 do bloco 1) fica **acima** do botão, onde é
  lido antes de agir, não depois. Sucesso emite toast e limpa os três campos.
- **D5 — O resumo do Redator entrega `cursos_habilitados` como contagem, `cursos` como tags e o CTA
  para `/`.** É o máximo que `RedatorProfileData` fornece depois do corte D1. Turmas e pendências
  ficam no Dashboard, e o CTA é o que a EAP 8.5.5 pede para fechar o caminho até lá.
- **D6 (derivada) — Nenhuma feature `profile`. Tudo mora em `features/identity/`.** É a feature 1:1
  com `App\Domains\Identity`, dona do backend deste contrato. Uma feature transversal por
  conveniência de tela contraria a direção canônica registrada no packet (key fact 6).
- **D7 (derivada) — Foto do perfil ganha hooks próprios em `features/identity/api/`, reusando
  `AppPhotoField`.** `useEntityPhoto`/`photoResource` montam `/api/<resource>/<id>/photo` a partir
  de um id e ainda carregam o buffer de criação (segurar o arquivo até a entidade existir). As rotas
  do perfil são singulares e sem id — `POST`/`DELETE /api/profile/photo` — e não há criação a
  bufferizar. Reusar exigiria furar a assinatura do hook genérico; o componente apresentacional,
  esse sim, é reusado inteiro.
- **D8 (derivada) — O shell reflete nome e foto por invalidação de `['me']`.** `SessionUserData`
  carrega `name` e `photo_url`, e `useSessionBootstrap` já reage a toda mudança de `data` do
  `useMe()` chamando `setUser`. Invalidar a key basta; escrever no `sessionStore` a partir da tela
  criaria a segunda fonte manual de verdade que o key fact 7 proíbe.
- **D9 (derivada) — O namespace i18n `profile` é novo e traz as próprias chaves de status
  documental.** `documentStatus.*` já existe nos três locales com a taxonomia do front
  (`sin_venc`/`por_vencer`), que **não** é a do backend (`vence_em_breve`/`ausente`). Reusar a chave
  homônima acoplaria as duas telas a uma taxonomia que só uma delas usa: mudar o rótulo de "Vigente"
  para o perfil mudaria também a tela administrativa, que o mede por outra régua.
- **D10 (derivada) — `ausente` recebe tag neutra (`secondary`), não `danger`.** O perfil não recebe
  idoneidade no DTO e não a calcula (D3). Pintar ausência de vermelho seria emitir um veredito de
  compliance que este contrato não fornece — exatamente a recalculação que o bloco proíbe. A
  ausência aparece como ação pendente pelo corpo do slot (botão "Enviar"), não como estado
  reprovado.

## 3. Arquitetura

Três camadas, seta apontando só para baixo (ADR-05).

```
app/router/AppRouter.tsx          → ProfilePage           (1 import, 1 rota)
  features/identity/components/Profile/                   (JSX declarativo)
    features/identity/hooks/                              (form, derivação, estado local)
      features/identity/api/useProfile.ts                 (TanStack Query: query + mutations)
        shared/api/{axios,postMultipart}  shared/hooks/useResourceState  shared/ui/*
```

Nenhum componente de `components/**` chama `useQuery`/`useMutation` nem recebe um `xxxApi` como
argumento — é o `no-restricted-syntax` de `eslint.config.js`, não conselho.

### 3.1 Arquivos

| Path | Estado | Papel |
|---|---|---|
| `frontend/src/shared/hooks/useResourceState.ts` | novo | estados de carga de **recurso único** |
| `frontend/src/shared/hooks/useResourceState.test.ts` | novo | corte do runner cobre `shared/hooks/` |
| `frontend/src/shared/hooks/index.ts` | editado | 1 linha no barrel |
| `frontend/src/features/identity/api/useProfile.ts` | novo | query `['profile']` + 5 mutations |
| `frontend/src/features/identity/hooks/useProfilePage.ts` | novo | query + `useResourceState` |
| `frontend/src/features/identity/hooks/useProfileForm.ts` | novo | form nome/telefone |
| `frontend/src/features/identity/hooks/useProfileForm.test.tsx` | novo | |
| `frontend/src/features/identity/hooks/useProfilePassword.ts` | novo | form de senha |
| `frontend/src/features/identity/hooks/useProfilePassword.test.tsx` | novo | |
| `frontend/src/features/identity/hooks/useProfilePhoto.ts` | novo | seleção, envio, remoção, teto |
| `frontend/src/features/identity/hooks/useProfileDocuments.ts` | novo | upload por slot |
| `frontend/src/features/identity/hooks/useProfileDocuments.test.tsx` | novo | |
| `frontend/src/features/identity/components/Profile/ProfilePage.tsx` | novo | ramos de carga + grid |
| `.../Profile/ProfileIdentityCard.tsx` | novo | coluna esquerda: foto e leitura |
| `.../Profile/ProfileSummaryCard.tsx` | novo | coluna esquerda, só Redator |
| `.../Profile/ProfilePersonalSection.tsx` | novo | coluna direita: nome, telefone |
| `.../Profile/ProfileSecuritySection.tsx` | novo | coluna direita: senha |
| `.../Profile/ProfileDocumentsSection.tsx` | novo | coluna direita, só Redator |
| `.../Profile/ProfileDocumentSlot.tsx` | novo | um tipo documental |
| `frontend/src/app/router/AppRouter.tsx` | editado | troca `ModulePlaceholder` |
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | editados | namespace `profile` |

Todo componente fica sob a régua de 150 linhas (`max-lines` em `src/features/*/components/**`).

### 3.2 `useResourceState`

```ts
export function useResourceState<T>(query: UseQueryResult<T, ProblemDetails>)
```

Devolve `data` (`T | undefined`), `isLoading`, `isError`, `errorDetail`, `loadError`
(`ProblemDetails | null`, `{}` quando o interceptor não populou o corpo), `failedWithoutData`
(`query.isError && data === undefined`) e `refetch` que engole a promise. **Não** tem `isEmpty` nem
`unusable`: um recurso único não "vem vazio", e inventar o predicado seria a divergência que o
`useLoadState` existe para impedir. `failedWithoutData` é o único que autoriza substituir a tela;
falha **com** cache vira aviso ao lado, preservando o que o usuário digitou.

## 4. Contrato consumido

Todas as rotas sob `auth:sanctum`, sem parâmetro de id — a posse é estrutural.

| Verbo | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/profile` | — | `ProfileData` |
| PUT | `/api/profile` | `{ name, phone }` | `ProfileData` |
| POST | `/api/profile/photo` | multipart `photo` | 204 |
| DELETE | `/api/profile/photo` | — | 204 |
| PUT | `/api/profile/password` | `{ current_password, password, password_confirmation }` | 204 |
| POST | `/api/profile/documents` | multipart `type`, `file`, `valid_until?` | `RedatorDocumentData` |

Tipos vêm de `shared/types/generated.ts` e não se editam (lei §5.3): `ProfileData`,
`ProfileUpdateData`, `ProfilePasswordData`, `RedatorProfileData`, `RedatorProfileDocumentData`,
`DocumentValidityStatus`.

**Multipart passa por `postMultipart`, nunca por `new FormData()`** — é `no-restricted-syntax` em
`src/features/**`. Foto respeita `max:5120` (5 MB, `UserPhotoService::RULES`); documento respeita
`max:10240` (10 MB, `ProfileDocumentController`). O teto é checado antes da requisição, via
`onSizeReject` do `AppFileUpload`.

### 4.1 Invalidação

| Mutation | Invalida |
|---|---|
| PUT `/api/profile` | `['profile']`, `['me']` |
| POST/DELETE `/api/profile/photo` | `['profile']`, `['me']` |
| PUT `/api/profile/password` | nada (204, sem estado de leitura afetado) |
| POST `/api/profile/documents` | `['profile']` |

`['me']` entra só onde `SessionUserData` muda: `name` e `photo_url`. Documento e senha não tocam a
sessão — invalidar seria refetch inútil em toda troca de senha.

## 5. Papéis

O ramo é `profile.redator !== null`, não uma checagem de role. O backend já decide quem tem perfil
profissional, e `usePermissions`/`can()` é conveniência de interface, não autoridade (ADR-07).

| Bloco | Admin | Redator |
|---|---|---|
| Identidade (foto, nome, papel, e-mail, RUT) | sim | sim |
| Datos personales (nome, telefone) | sim | sim |
| Seguridad (senha) | sim | sim |
| Documentos profesionales | **não** | sim, 4 slots |
| Resumen profesional | **não** | sim |

Para o Admin a coluna esquerda mantém o cartão de identidade e a direita mantém duas seções — o
layout não fica oco em nenhum dos dois papéis, que é o motivo de D1.

## 6. Documentos

`RedatorProfileData.documentos` traz **sempre os quatro tipos**, projetados de
`RedatorDocumentType::cases()`. Cada slot renderiza:

- rótulo por `documentType.<TYPE>` (chave que já existe nos três locales — reuso, não duplicação);
- `AppTag` com `profile.docStatus.<status>` e severidade: `vigente` → `success`, `vence_em_breve` →
  `warning`, `vencido` → `danger`, `ausente` → `secondary` (D10);
- metadados quando o documento existe: `original_name`, `size`, `valid_until`, `created_at`, e
  download por `download_url`;
- ação de envio **somente quando `self_service` é `true`**. REUF é administrativo (D5 do bloco 1,
  RN-09): o slot mostra o estado e uma nota de que a gestão é do administrador, sem botão.

Não existe remoção self-service: o backend oferece substituição, e a rota de `destroy` não existe
neste caminho. O rótulo do botão reflete isso ("Enviar" quando ausente, "Reemplazar" quando há
documento), pelo mesmo motivo pelo qual `AppPhotoField` troca o dele — substituir é irreversível e o
texto é o único aviso na tela.

## 7. Estados

O que ramifica a tela é o **dado que falta**, não o `status` da query.

| Situação | Tela |
|---|---|
| Primeira carga | `AppSkeleton` no lugar das duas colunas |
| `failedWithoutData` | `AppErrorState` com `detail` do RFC 7807 e "Reintentar" |
| Falha **com** perfil em cache | conteúdo mantido + `InlineLoadState` com o erro e "Reintentar" |
| Mutation em voo | botão da seção em `loading`, campos daquela seção desabilitados |
| Mutation 422 | `fieldErrors` nos campos via `FormField`; sem campo onde pendurar, `FormErrorSummary` |
| Mutation não-422 | `generalError` na própria seção |
| Sucesso | toast (`useToast().success`) e, na senha, limpeza dos três campos |
| Redator sem cursos | dica própria no `ProfileSummaryCard`, distinta de falha |
| Documento ausente | slot com tag `ausente` e ação de envio, não linha faltando |

`useMutationErrors` normaliza os `ProblemDetails` (é consumo de erro, liberado nos componentes). O
erro de uma seção nunca derruba as outras: cada seção tem o próprio par de estados, e uma falha ao
trocar a senha não pode apagar o telefone que o usuário acabou de digitar.

Reset de formulário usa **adjust state during render** comparando `profile.id`, nunca
`useEffect` + `setState` (lint `react-hooks/set-state-in-effect`). O motivo é o mesmo do
`useEntityForm`: um refetch produz objeto novo com o mesmo id, e resetar ali apagaria o que o
usuário digitou.

## 8. i18n

Namespace `profile` novo, chaves **idênticas** nos três locales, `es-CL` como referência de rótulo.

```
profile.subtitle
profile.identity.{title,email,rut,role,noRut}
profile.personal.{title,name,phone,save,saved}
profile.security.{title,currentPassword,newPassword,confirmPassword,warning,save,saved}
profile.documents.{title,hint,send,replace,validUntil,managedByAdmin,sent,noValidity}
profile.docStatus.{vigente,vence_em_breve,vencido,ausente}
profile.summary.{title,enabledCourses,noCourses,goToDashboard}
profile.loadError
```

Reusa `documentType.*`, `photo.*` e `common.*`, que já existem. O `title` do `PageHeader` vem de
`userMenu.profile` ("Mi perfil") — é o rótulo pelo qual o usuário chegou, e inventar um segundo nome
para a mesma tela é divergência de vocabulário; a `description` vem de `profile.subtitle`.

**Risco declarado:** `i18n.test.ts` protege a sincronia de `<html lang>`, **não** a paridade de
chaves entre dicionários. Nada reprova um locale esquecido; a verificação é disciplina do gate, e
os três arquivos se editam no mesmo commit.

## 9. Testes e verificação

Entram no runner (`pnpm test`, vitest/jsdom): `useResourceState`, `useProfileForm`,
`useProfilePassword`, `useProfileDocuments` — os hooks de feature por `renderHook` +
`QueryClientProvider`, com o teste morando na própria feature. Teste de componente com PrimeReact
no jsdom segue **fora** do corte, como no resto do projeto.

Cobertura mínima por hook: seed a partir do perfil e não-reset em refetch com mesmo id; payload
enviado (`{name, phone}` e os três campos de senha); normalização de erro 422; limpeza dos campos de
senha após 204; rejeição por teto de tamanho antes da requisição; e o gate de `self_service` no
upload documental.

Gate de verificação: `pnpm build` + `pnpm lint` + `pnpm test`, todos verdes.

**DoD end-to-end**, contra a API real, nos dois papéis, no molde do bloco 1: ler o perfil, editar
nome e telefone e ver o header atualizar, trocar a foto e removê-la, trocar a senha e continuar
navegando, enviar um documento self-service e ver o status mudar, e conferir que o REUF não oferece
envio. Mais `/lotus-ui-review` cobrindo Admin e Redator, dados/erro/ausência documental, os três
locales, os dois temas e desktop/mobile (EAP 8.5.9).

## 10. Riscos e débitos

- **Débito nomeado — taxonomia documental divergente entre as duas telas.** O mesmo documento
  aparece como `sin_venc` na tela administrativa e `vigente` no perfil, e um documento que vence em
  exatamente 30 dias é `vigente` no front (`<` estrito, relógio de parede) e `vence_em_breve` no
  backend (`<=` inclusivo, meia-noite). A raiz é `RedatorDocumentData` não ter `status`, e corrigi-la
  é backend — declarado fora de escopo pela spec do bloco 1 (D6). Este bloco **não** unifica: cria o
  slot irmão, consome o status do backend e registra a divergência para o bloco que reabrir o DTO
  administrativo.
- **Divergência de documentação.** `.claude/rules/frontend-fsliced.md` afirma "status de documento e
  idoneidade se calculam no front". Isso é verdade para o DTO administrativo e **falso** para o DTO
  de perfil desde o bloco 1. Vira pendência de doc, não correção deste bloco (auditoria reporta, não
  corrige).
- **Superfície compartilhada com a frente paralela.** `feat/dashboard-frontend-central-controle`
  toca `app/router/AppRouter.tsx` e os três locales. A colisão é pequena e mecânica — uma linha de
  rota e um namespace novo cada — mas existe e se resolve no merge, não por coordenação prévia.
- **CTA para `/` aponta hoje para um `PageHeader` de boas-vindas.** `DashboardPage` ainda é
  placeholder; a frente paralela é que a preenche. O link funciona em qualquer ordem de merge; se
  este bloco fechar primeiro, ele apenas leva a uma tela magra.
- **Backlog e EAP ainda prometem turmas e pendências no resumo do Redator.** O corte D1 os removeu do
  contrato. Resolvido no packet com base declarada: a instrução posterior e o contrato entregue
  vencem, e o front não inventa campo.
