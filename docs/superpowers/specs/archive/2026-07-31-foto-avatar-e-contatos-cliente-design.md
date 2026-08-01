# Spec — Foto/avatar das entidades derivadas de User + refino dos contatos do cliente

- **Work item:** `foto-avatar-e-contatos-cliente`
- **Data:** 2026-07-31
- **Context packet:** `docs/superpowers/context-packets/foto-avatar-e-contatos-cliente.md` (`partial`)
- **Origem:** itens 1 e 2 de `docs/superpowers/backlog.md`, unidos em um bloco por decisão explícita
  do João em 2026-07-31 — ambos são curtos, tocam a mesma camada (`shared/ui` + diálogos de cadastro)
  e serão planejados, executados e revisados juntos.

## 1. Problema

Dois gaps independentes no cadastro de pessoas e empresas:

1. **Foto não existe como fluxo.** `users.photo_path` está no schema desde a migration original
   (nullable, fillable) e nunca foi usado: nenhum DTO expõe a foto, nenhuma tela permite subir,
   substituir ou remover, e só `StudentsTable`/`StudentDialog` mostram `AppAvatar` — sempre com
   iniciais, porque não há imagem para passar. As outras três tabelas mostram o nome como texto puro.
2. **Contatos do cliente são uma grade sem rótulo e sem saída.** `ContactFields` renderiza cada
   contato como uma linha `grid-cols-[auto_1fr_1fr_1fr_1fr]` com `placeholder` no lugar de label; o
   contato principal é um radio sem texto, identificado só por `title`; e não há como excluir um
   contato — `useClientForm` expõe `patchContact`, `setPrimaryContact` e `addContact`, nunca
   `removeContact`.

## 2. Escopo

**Dentro:**

- `photo_url` nos contratos de `UserData`, `ClientData`, `RedatorData` e `StudentData`.
- Endpoints de upload e remoção de foto para as 4 entidades.
- `AppAvatar` com fallback de imagem indisponível; `AppPhotoField` novo em `shared/ui`.
- Primeira coluna das 4 tabelas com avatar; `AppPhotoField` no corpo dos 4 diálogos; remoção do
  avatar do header do `StudentDialog`.
- `ContactFields` em cards com labels, indicação do principal e exclusão; `removeContact` no hook;
  mínimo de 1 contato validado no backend.

**Fora (sem alteração silenciosa):**

- RBAC dos endpoints além do que já existe — cada rota de foto herda a permissão do módulo dono e
  nada mais é redesenhado (o acoplamento cross-módulo do dropdown de empresa em Alumnos segue no
  backlog).
- Política de retenção documental (P-02) e o débito do arquivo órfão do `UploadFileAction` na tabela
  `files` — a foto não passa por `files` (D3).
- `client_addresses.is_primary`, `ClientContactData.is_primary` sem `Optional`, e a assimetria
  UI/backend de "zero principais" — débitos já registrados no backlog, não reabertos aqui.
- Página de perfil do usuário (self-service) — módulo próprio, ainda não planejado.
- Recorte/redimensionamento de imagem no cliente. O arquivo sobe como veio, dentro do limite de D9.

## 3. Decisões

### D1 — Upload por rota nested, uma por entidade

`POST` e `DELETE` em `/api/{users|redatores|students|clients}/{id}/photo`, multipart, 4 pares de
rota, todos delegando ao mesmo serviço.

**Por quê:** `ClientData`, `StudentData` e `UserData` são contratos JSON; só `RedatorData` já fala
multipart. Uma rota única `/users/{user}/photo` economizaria 6 rotas, mas exigiria expor `user_id`
nos 4 DTOs e escolher **uma** permissão para todas as entidades — recriando exatamente o acoplamento
RBAC cross-módulo que o bloco de Alunos deixou registrado como débito. Cada rota nested carrega a
permissão do seu módulo. Precedente vivo no mesmo arquivo de rotas:
`redatores/{redator}/documents`.

**Rejeitado:** foto dentro do payload da entidade. Converteria os três contratos de escrita para
multipart e o `createCrudResource` JSON junto — custo desproporcional ao ganho de um request.

| Rota | Permissão | Controller |
|---|---|---|
| `POST\|DELETE /api/users/{user}/photo` | `identity.user.update` | `Identity/Http/Controllers/UserPhotoController` |
| `POST\|DELETE /api/redatores/{redator}/photo` | `identity.user.update` | `Identity/Http/Controllers/RedatorPhotoController` |
| `POST\|DELETE /api/students/{student}/photo` | `identity.user.update` | `Identity/Http/Controllers/StudentPhotoController` |
| `POST\|DELETE /api/clients/{client}/photo` | `commercial.client.update` | `Commercial/Http/Controllers/ClientPhotoController` |

### D2 — `UserPhotoService`, não uma Action por operação

A regra de foto vive em `App\Domains\Identity\Services\UserPhotoService`, com `store()`, `remove()`
e `urlFor()`.

**Por quê:** `backend-ddd.md` diz "Action = regra de escrita, uma por operação" **e** "Domain Service
= regra compartilhada entre entidades. Não se duplica." Cliente, redator, aluno e staff são todos
extensões 1:1 de `User`; a foto é do `User`, não de cada uma. É o mesmo caso do `UserProvisioner`,
que centraliza o provisionamento do User de login e é chamado por `CreateClientAction` e
`CreateRedatorAction`. Duplicar `SetPhoto`/`RemovePhoto` em 4 domínios seria a dívida que a rule
manda evitar. Decisão registrada aqui para não ser lida como drift no review.

### D3 — Foto em `users.photo_path`, fora da tabela `files`

**Por quê:** a coluna já existe. A tabela `files` é trilha de anexo documental — documentos de
idoneidade do redator, faturas, documentos de turma, coisas com peso legal e `valid_until`. Foto de
perfil não é documento: não vence, não habilita turma, não entra em certificado. Misturá-la
poluiria a trilha, exigiria um tipo novo no enum e deixaria `photo_path` como coluna morta.

**Consequência boa:** `User` já é `Auditable`, então toda troca de `photo_path` cai em `audits`
automaticamente — sem código de auditoria novo, e sem violar a lei §5.2 (auditoria só na aplicação).

**Consequência a tratar:** a foto não herda `UploadFileAction`, logo `download_url`/`temporaryUrl`
precisam de um caminho próprio (`urlFor()`), e o débito conhecido do arquivo órfão em rollback de
transação **não** se aplica aqui — o caminho da foto é desenhado em D4 justamente para não repeti-lo.

### D4 — Ordem de escrita: banco primeiro, delete do objeto anterior por último

Decisão `[J-02]`: substituir ou remover a foto **apaga o objeto anterior imediatamente**, sem
retenção. Delete imediato é irreversível, então a ordem não é detalhe de implementação:

`store(User $u, UploadedFile $f)`:

1. guarda `$old = $u->photo_path`;
2. sobe o arquivo novo → `$new`;
3. `$u->update(['photo_path' => $new])`;
4. se (3) lançar: apaga `$new` (compensação) e propaga a exceção;
5. só depois de (3) ter sucesso: apaga `$old`, se existir.

`remove(User $u)`: no-op se `photo_path` é `null`; senão `update(['photo_path' => null])` e **depois**
apaga o objeto.

**Por quê essa ordem:** apagar o antigo antes do update deixa a linha apontando para um objeto morto
se o update falhar — avatar quebrado, referência mentindo. Apagar depois, e falhar, deixa um objeto
órfão no bucket: custo de storage, nenhuma mentira no banco. Das duas falhas possíveis, a barata é
essa. Sem `DB::transaction`: é um `UPDATE` de uma linha, e envolver o delete de storage numa
transação é exatamente o débito já registrado no `UploadFileAction`.

### D5 — `photo_url` é `#[Computed]`, só saída

Os 4 DTOs ganham `#[Computed] public ?string $photo_url`, derivado de
`UserPhotoService::urlFor($user->photo_path)`. `null` quando não há foto. O DTO nunca aceita
`photo_url` na entrada — a foto entra pelas rotas de D1. `generated.ts` é regenerado
(`php artisan typescript:transform`), nunca editado à mão (lei §5.3).

### D6 — URL pré-assinada de 60 minutos para foto

`temporaryUrl(..., 60)` em vez dos 10 minutos usados nos documentos.

**Por quê:** o documento é baixado no clique — 10 minutos cobrem o gesto. A foto é renderizada em
listagem que fica aberta; com 10 minutos, uma tela aberta por 20 minutos passa a mostrar iniciais no
lugar da foto, e essa degradação é indistinguível de "esta pessoa não tem foto". 60 minutos encolhem
a janela; D7 cobre o resto.

### D7 — `AppAvatar` cai para iniciais quando a imagem falha

Hoje `AppAvatar` só decide por `image` estar presente; imagem quebrada (URL expirada, objeto
apagado, rede) renderiza o avatar vazio do Prime. Passa a manter estado de falha e tratar
`onImageError` caindo para as iniciais.

**Por quê:** é requisito literal do bloco ("sem foto **ou com imagem indisponível**, exibir as duas
iniciais") e a rede de segurança de D6.

### D8 — `AppPhotoField` é apresentacional; a orquestração vive em `shared/hooks`

- **`shared/ui/AppPhotoField/`** — avatar grande + ações *Selecionar* / *Substituir* / *Remover*.
  Props: `name`, `url`, `readOnly`, `pending`, `error`, `onSelect(File)`, `onRemove()`. Sem mutation,
  sem conhecimento de rota, sem regra de domínio.
- **`shared/api/photoResource.ts`** — fábrica `photoResource('students')` → `{ upload, remove }`.
  Nasce em `shared/api` porque o cliente REST sempre nasce lá (ADR-18).
- **`shared/hooks/useEntityPhoto.ts`** — o fluxo: buffer no create, upload imediato em edit,
  invalidação da query, estado de erro.

**Por quê em `shared/` e não na feature:** os consumidores estão em `identity` **e** em `commercial`,
e feature não importa feature — nem para tipo (lei §5.6). Componente de feature é declarativo; a
mutation e o estado vão para o hook (`frontend-fsliced.md`).

### D9 — Limite: 5 MB, `jpg`/`jpeg`/`png`/`webp`

`['photo' => ['required','file','mimes:jpg,jpeg,png,webp','max:5120']]`, declarado **uma vez** como
constante no `UserPhotoService` e consumido pelos 4 controllers — não recopiado.

**Por quê 5 MB e não os 10 MB dos documentos:** foto de perfil não precisa de 10 MB, e o teto menor
barra o upload acidental de foto de câmera crua. Nginx e PHP já aceitam 12 MB de transporte desde o
bloco anterior — nenhuma camada de infra é tocada, e o `422` continua sendo quem rejeita, com
envelope RFC 7807.

### D10 — No create, a foto é bufferizada e sobe depois do 201

No modo `create` não existe id para pendurar a foto. `useEntityPhoto` guarda o `File` em estado e
mostra `URL.createObjectURL(file)` como preview, sem request. O `submit` do form chama `flush(id)` no
`onSuccess` do create — `useCreate` já devolve a entidade criada, então o id está disponível.

**Rejeitado:** desabilitar a foto no create com a dica "salve primeiro". Elimina o risco de sucesso
parcial, mas obriga dois passos para toda pessoa nova cadastrada, que é o caminho comum.

### D11 — Falha parcial no create é visível, e o diálogo não fecha

Se o cadastro retorna 201 e o upload da foto falha, a entidade **existe sem foto**. O diálogo não
fecha: passa a `edit` da entidade recém-criada, com banner explícito ("cadastro criado, mas a foto
não subiu") e *Reintentar* no próprio `AppPhotoField`.

**Por quê:** fechar e engolir é falha silenciosa. O bloco de Alunos reverteu duas tentativas de
esconder falha na UI justamente por isso, e o estado final adotado lá — falha **visível** com motivo
e retry — é o molde que este bloco segue.

### D12 — Contatos em `AppCard`, com o principal em `tone="info"`

Cada contato vira um `AppCard`. O contato principal recebe `tone="info"` mais um `AppTag`
"Principal". Dentro do card, os campos usam `FormField` (label + erro) no lugar do `NestedField`
atual, que por contrato não tem label. Grid de 1 coluna no mobile, 2 a partir de `sm`.

**Por quê:** `tone` já existe no `AppCard` e resolve "indicação de contato principal" sem CSS novo
nem cor hardcoded (ADR-16). `FormField` é o que entrega as "labels explícitas" pedidas — hoje o
rótulo só existe como `placeholder`, que some ao digitar. `NestedField` continua sendo o certo para
`AddressFields`, que não muda.

`key={i}` permanece: o replace-total do backend recria os nested e o `id` muda a cada save
(`frontend-fsliced.md`).

### D13 — Mínimo de 1 contato validado no backend; UI desabilita o botão do último

`ClientData::rules()` ganha `'contacts' => ['required','array','min:1']` — a API deixa de aceitar
coleção vazia. Na tela, restando um único contato, o ícone de excluir fica **desabilitado com
tooltip do motivo**.

**Por quê:** o Drive (`entidade-contato-cliente.md`) define que o cliente tem um ou mais contatos; a
API de hoje aceita `[]`, o que é divergência real da fonte canônica, ratificada por decisão explícita
`[J-02]`. Validar só na UI repetiria a assimetria UI/API já registrada no backlog para `is_primary`.
Desabilitar com motivo, em vez de esconder o botão, é o padrão que o bloco de Alunos consolidou:
falha visível vence falha escondida.

**É mudança de contrato.** O teste que a prova precisa ser visto **reprovando contra o código atual**
(`git stash` no fix, roda, `git stash pop`) — teste que passa nos dois estados prova nada
(`backend-ddd.md`).

**Interação com a regra de coleção nested.** `ClientData::$contacts` hoje é `array $contacts = []`,
não `Optional` — exatamente o caso que `backend-ddd.md` descreve como perigoso: com replace-total, um
`PUT` que **omite** `contacts` apaga a coleção em silêncio. Adicionar `required` fecha esse buraco de
lado, porque a omissão passa a ser `422` em vez de apagamento mudo. Não é o mesmo que promover o
campo a `Optional` (que significaria "ausente = não mexe"), e essa promoção **não** entra neste bloco:
mudaria a semântica de escrita do cliente inteiro, muito além do refino de contatos. Registrado para
que a diferença não seja lida como meia-correção.

### D14 — Remover contato não pede confirmação

`removeContact(i)` tira a linha do formulário. Nada é apagado até o save do cliente, e fechar o
diálogo descarta tudo.

**Por quê:** confirmar mutação de estado local é cerimônia. A manipulação do array vive no hook
(`add/remove/patch`), não solta no JSX — o `patchContact(setForm, ...)` avulso é o contra-exemplo
citado na própria rule, não o molde.

### D15 — `StudentDialog` perde o avatar do header

Requisito literal do bloco. O `headerExtra={<AppAvatar ... />}` sai; a identidade visual passa a ser
o `AppPhotoField` no corpo, igual às outras três entidades. Sem isso o aluno teria avatar em dois
lugares, um deles não editável.

## 4. Arquitetura

```
backend/app/
  Domains/Identity/
    Services/UserPhotoService.php            (novo — store/remove/urlFor + RULES)
    Http/Controllers/UserPhotoController.php      (novo)
    Http/Controllers/RedatorPhotoController.php   (novo)
    Http/Controllers/StudentPhotoController.php   (novo)
    Data/{UserData,RedatorData,StudentData}.php   (+ photo_url)
    routes.php                                     (+ 6 rotas)
  Domains/Commercial/
    Http/Controllers/ClientPhotoController.php    (novo)
    Data/ClientData.php                            (+ photo_url, + rules contacts min:1)
    routes.php                                     (+ 2 rotas)

frontend/src/
  shared/ui/AppAvatar/AppAvatar.tsx          (fallback de imagem quebrada)
  shared/ui/AppPhotoField/                   (novo)
  shared/api/photoResource.ts                (novo)
  shared/hooks/useEntityPhoto.ts             (novo)
  shared/types/generated.ts                  (REGENERADO)
  features/identity/components/Admin/{UsersTable,StaffUserDialog}.tsx
  features/identity/components/Redator/{RedatoresTable,RedatorDialog}.tsx
  features/identity/components/Student/{StudentsTable,StudentDialog}.tsx
  features/commercial/components/Client/{ClientsTable,ClientDialog,ContactFields}.tsx
  features/commercial/hooks/useClientForm.ts (+ removeContact)
```

Sem migration: `users.photo_path` já existe.

## 5. Fluxo de dados

**Leitura.** `XData::fromModel()` → `UserPhotoService::urlFor($user->photo_path)` → URL pré-assinada
de 60 min → `photo_url` no JSON → `AppAvatar image={...}` na tabela e `AppPhotoField url={...}` no
diálogo. Sem foto, `photo_url` é `null` e o avatar mostra as duas iniciais.

**Escrita (edit).** `AppPhotoField.onSelect(File)` → `useEntityPhoto` → `photoResource(x).upload(id, file)`
→ multipart → controller valida (D9) → `UserPhotoService::store()` (ordem de D4) → invalidação da
query → `photo_url` novo chega na próxima leitura.

**Escrita (create).** `onSelect` só bufferiza + preview local → `submit` cria a entidade → `onSuccess`
chama `flush(created.id)` → mesmo caminho de upload. Falha aqui cai em D11.

**Remoção.** `onRemove()` → `DELETE` → `UserPhotoService::remove()` → `photo_path` nulo, objeto
apagado → invalidação → avatar volta às iniciais.

## 6. Erros

- Arquivo grande demais ou tipo errado: `422 application/problem+json` com `errors.photo`, exibido no
  `error` do `AppPhotoField`. Nunca `413` opaco — o teto do nginx/PHP é 12 MB, acima dos 5 MB de D9,
  então quem rejeita é sempre o Laravel.
- Sem permissão do módulo dono: `403`. A UI não esconde o campo — `can()` é conveniência, a
  autorização é da API (ADR-07).
- Upload da foto falha no create: D11 (banner + retry, diálogo aberto em `edit`).
- `PUT /api/clients/{id}` com `contacts: []`: `422` com `errors.contacts`. Em condições normais a UI
  não permite chegar lá (D13), mas o erro precisa ser exibível.
- URL pré-assinada expirada ou objeto ausente: D7 (iniciais), sem tela quebrada.

## 7. Testes

**Backend** (`docker compose exec -T app php artisan test`, sqlite `:memory:`, sem mock):

1. `POST .../photo` grava `photo_path` e o objeto existe no disco (`Storage::fake`).
2. Substituir foto: `photo_path` muda **e o objeto anterior não existe mais** no disco (prova de
   D4/J-02).
3. `DELETE .../photo` zera `photo_path` e apaga o objeto; segundo `DELETE` é no-op, não erro.
4. `422` para `mimes` inválido e para arquivo acima de 5 MB, com `errors.photo`.
5. `403` para cada rota sem a permissão do módulo dono (as 4).
6. `photo_url` presente nos 4 DTOs quando há foto, `null` quando não há.
7. `PUT /api/clients/{id}` com `contacts: []` → `422` com `errors.contacts` — **visto reprovando
   contra o código atual** antes de valer.
8. Um `audit` é gravado na troca de `photo_path` (confirma que D3 herda a auditoria do `User`).

**Frontend:** `pnpm build` + `pnpm lint` verdes. Sem test runner no projeto — a prova comportamental
é a visual do §8.

## 8. Definition of done

Comportamento provado, não pacote instalado:

1. Contra a API real com sessão Sanctum: upload em cada uma das 4 entidades retorna sucesso e
   `photo_url` não-nulo na leitura seguinte; substituição apaga o objeto anterior; remoção volta
   `photo_url` a `null`; arquivo de 6 MB retorna `422 application/problem+json`.
2. `PUT /api/clients/{id}` com `contacts: []` retorna `422`, e o mesmo teste reprova contra o código
   anterior.
3. Suíte backend verde (baseline atual: 321 passed), Pint limpo nos arquivos tocados.
4. `pnpm build` + `pnpm lint` verdes; `generated.ts` regenerado pelo artisan, não editado à mão.
5. Prova visual do João, nos dois temas, a 1400px e 768px:
   - as 4 tabelas com avatar na primeira coluna, foto quando há e iniciais quando não há;
   - os 4 diálogos com `AppPhotoField` no corpo, exercitando selecionar, substituir e remover;
   - `StudentDialog` **sem** avatar no header;
   - imagem indisponível caindo para iniciais (URL adulterada à mão);
   - foto escolhida no create aparecendo depois do save;
   - contatos em cards com labels, principal destacado, exclusão funcionando e o botão desabilitado
     com motivo quando resta um só contato.

## 9. Limitações declaradas

- As 4 imagens de referência (`alumnos-exemplo-avatar`, `client-no-component-photo`,
  `redator-no-component-photo`, `alumnos-component-wrong-photo`) são caller-held — a única fonte
  `unavailable` do packet. O João as fornece durante o planejamento/execução; elas calibram o visual,
  não alteram os contratos decididos aqui.
- Falha no delete do objeto antigo (D4, passo 5) deixa órfão de storage. É o lado escolhido do
  trade-off, não um esquecimento; se virar volume, interage com P-02.
