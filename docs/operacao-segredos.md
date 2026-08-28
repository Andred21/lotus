# Operação de segredos

> Companheiro do ADR-21 e do `docker-compose.prod.yml`. Cobre onde cada segredo vive hoje, por que
> não há cofre gerenciado ainda, o inventário e o procedimento de rotação — não código, procedimento.
> Paga a metade "fora do código" do `RNF-SEC-03` e fecha a P-02/P-33 junto com o ADR-21 e o
> `RetentionPolicy` (ver `docs/adrs.md`).

## 1. Onde os segredos vivem hoje

Em produção, os segredos moram **fora da imagem e fora do repositório**, num arquivo único que o
Compose injeta nos dois serviços que rodam a aplicação:

- `docker-compose.prod.yml:30` (serviço `app`) e `docker-compose.prod.yml:60` (serviço `scheduler`)
  — ambos: `env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}`. Mesmo arquivo para os dois, porque os dois
  rodam a mesma imagem e precisam da mesma configuração (comentário em
  `docker-compose.prod.yml:43`).
- `docker/Dockerfile.prod` **nunca monta** o `.env` — só `COPY` de código (`docker/Dockerfile.prod:23`,
  `29`, `46`, `49`, `80`, `89`, `90`). A imagem que sai do build não carrega segredo nenhum; eles
  entram só no `docker run`/`compose up`, pela variável de ambiente do host que aponta o `env_file`.
- `docker/php/entrypoint.sh:19-25` recusa o arranque (`exit 1`, sem subir o `php-fpm`) se qualquer um
  destes estiver vazio: `APP_KEY`, `APP_URL`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`,
  `SESSION_DOMAIN`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`. É um gate de **presença**, não de
  **correção** — um valor errado mas não-vazio passa pelo gate e some numa falha silenciosa (ver
  §3 e §4 para `SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN`, que são o caso medido).

## 2. Por que não há cofre gerenciado ainda

O `RNF-SEC-03` da fonte canônica pede: *"Segredos (chaves, tokens, credenciais de e-mail/nuvem) fora
do código, em cofre de segredos"* (spec `2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md:60-61`).
São duas metades:

- **"Fora do código"** — cumprida. `env_file` fica fora da imagem e fora do repositório (§1); nenhum
  segredo é literal em `.php`, `.ts` ou migration.
- **"Em cofre de segredos"** — não cumprida ainda, e **datada, não esquecida**: cofre gerenciado
  (AWS Secrets Manager ou equivalente) depende de conta AWS provisionada, e isso é o item 10 do
  backlog, `infra-producao-provisionamento-aws` (`docs/superpowers/backlog.md:152`). Decisão do João
  de 2026-08-26 (spec **D8**): "Segredos seguem em `env_file` fora da imagem, com rotação
  documentada; cofre gerenciado fica no item 10." Este documento é a prova do que dá para entregar
  **agora** — procedimento escrito — sem prometer o resto antes de a conta existir.

## 3. Inventário

| Segredo | Onde é lido no código | Observação |
|---|---|---|
| `APP_KEY` | `backend/config/app.php:107` (cifra de cookie/sessão, `cipher => AES-256-CBC` em `app.php:105`) | Ver §5 — aviso à parte. |
| `DB_PASSWORD` | `backend/config/database.php:54` (conexão `mysql`) | Compartilhado pelos serviços `app` e `scheduler` (mesmo `env_file`). |
| Credenciais de S3 (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) | `backend/config/filesystems.php:52-53` (disco `s3`, ADR-11) | Hoje esse par cobre **só o S3**: o mailer de produção é `smtp`, não `ses` (ver as duas linhas abaixo). |
| `MAIL_PASSWORD` (com `MAIL_USERNAME`) | `backend/config/mail.php:46-47` (mailer `smtp`), selecionado por `MAIL_MAILER=smtp` em `backend/.env.production.example:106` | **É o segredo de e-mail que produção usa hoje** — o relay por onde sai o alerta síncrono da `DetectorDeAcessoSuspeito` (D7). Rotação em §4. |
| Credenciais de SES (mesmas `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) | `backend/config/services.php:24-28` (bloco `ses`), consumido pelo mailer `ses` (`backend/config/mail.php:52-54`) | **Caminho futuro, não o corrente.** O bloco existe e a identidade IAM é a mesma do S3, mas enquanto `MAIL_MAILER` for `smtp` este par não manda e-mail nenhum — quem manda é a linha acima. Trocar para `ses` no item 10 inverte as duas linhas, e aí sim uma única identidade cobre storage e e-mail. |
| `SANCTUM_STATEFUL_DOMAINS` / `SESSION_DOMAIN` | `backend/config/sanctum.php:21` (`explode(',', ...)`), `backend/config/session.php:159`, `backend/config/cors.php:22` | **Não são segredo** — não dão acesso a nada por si só —, mas entram aqui porque um valor errado quebra o login **em silêncio**: o gate do entrypoint (`docker/php/entrypoint.sh:19-25`) só confere que a variável não está vazia, então uma string não-vazia e errada passa, o container sobe saudável (`/up` responde 200) e o cookie do Sanctum simplesmente nunca é aceito. |

## 4. Procedimento de rotação por segredo

**`DB_PASSWORD`.** Trocar a senha do usuário no MySQL (`ALTER USER ... IDENTIFIED BY ...`), atualizar
o `env_file` com o novo valor e reiniciar `app` **e** `scheduler` na mesma janela — os dois leem o
mesmo arquivo, e um reinício desalinhado deixa um dos dois autenticando com a senha velha contra um
banco que já mudou. Efeito colateral: qualquer conexão já aberta com a senha antiga cai; não há downtime
de dado, só de conexão até o reinício completar.

**`MAIL_PASSWORD` (senha do relay SMTP).** É o segredo de e-mail **em uso**: `MAIL_MAILER=smtp`
(`backend/.env.production.example:106`) faz o Symfony Mailer autenticar com
`MAIL_USERNAME`/`MAIL_PASSWORD` (`backend/config/mail.php:46-47`). Procedimento: emitir a credencial
nova no provedor do relay **sem revogar a antiga**, atualizar o `env_file`, reiniciar `app` **e**
`scheduler` (o alerta de acesso suspeito pode nascer em qualquer um dos dois) e só então revogar a
antiga. A prova é um **e-mail de teste que chega**, nunca "o container subiu": e-mail é a única
superfície deste inventário cuja falha é assintomática do lado de dentro — o alerta da D7 quebra em
silêncio, a `FalhaDeObservabilidade` registra a falha no canal default (sem endereço, sem mensagem
crua) e a linha `acesso.suspeito` continua saindo no canal `seguranca` como se nada tivesse
acontecido. Ninguém percebe pela aplicação; percebe-se pelo alerta que não chegou.

**Credenciais de S3 (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`).** Hoje a rotação afeta só
upload/download de arquivo (S3, ADR-11) — o e-mail sai pelo SMTP acima, não por SES (§3).
Procedimento seguro: criar uma **segunda** chave de acesso na mesma conta IAM (não desativar a
antiga ainda), atualizar o `env_file` com o par novo, reiniciar `app` e `scheduler`, confirmar a
superfície funcionando (um upload e um download de teste) e só então desativar/apagar a chave antiga
no IAM. Rotacionar sem esse intervalo de sobreposição arrisca quebrar a superfície inteira se o par
novo estiver errado, sem chave velha para recuar. **Se o item 10 trocar `MAIL_MAILER` para `ses`**,
esta rotação passa a derrubar também todo o e-mail de saída, e a prova precisa incluir o e-mail de
teste.

**`SANCTUM_STATEFUL_DOMAINS` / `SESSION_DOMAIN`.** Não têm cadência — mudam só quando a topologia de
domínio muda (ex.: `FRONTEND_URL` migra de host). Como o entrypoint só confere presença (§1, §3), todo
ajuste nestas variáveis precisa de um login real de ponta a ponta como prova, nunca só "o container
subiu" — é exatamente o caso em que subir saudável e estar errado coexistem.

**`APP_KEY`.** Ver §5 — tem procedimento próprio, não o padrão "trocar e reiniciar" acima.

## 5. O aviso do `APP_KEY`

**Rotacionar o `APP_KEY` NÃO revoga sessão nenhuma quando a chave antiga vai para
`APP_PREVIOUS_KEYS` — e ir para lá é justamente o que o procedimento padrão manda fazer.** Este
aviso já esteve escrito ao contrário aqui ("a partir daqui toda sessão viva cai"), e o erro apontava
para o lado perigoso: quem rotacionasse a chave para expulsar uma sessão roubada acreditaria ter
revogado o acesso que continuaria valendo. Corrigido no review de 2026-08-28 (achado Q-3).

O `EncryptCookies` (`backend/bootstrap/app.php:89`) cifra o cookie que carrega o ID de sessão do
Sanctum com o `APP_KEY`/`AES-256-CBC` (`backend/config/app.php:105,107`) — isso vale **mesmo** com
`SESSION_ENCRYPT=false` (o payload da sessão no banco não é cifrado, mas o cookie que aponta pra ele
é). Só que a decifragem tenta **todas** as chaves configuradas, não só a atual:
`Illuminate\Encryption\Encrypter::getAllKeys()` devolve `[$this->key, ...$this->previousKeys]` e
`decrypt()` percorre a lista inteira até uma funcionar. Com a chave velha em `APP_PREVIOUS_KEYS`
(`backend/config/app.php:109-111`), todo cookie emitido antes da troca continua abrindo normalmente.

Hoje nenhum model usa cast `encrypted` nem chama `Crypt::encrypt()` diretamente (conferido: nenhuma
ocorrência em `backend/app/`) — então o único portador de valor cifrado é o cookie de sessão. O
aviso genérico ("todo valor cifrado pela chave antiga") continua valendo para qualquer coluna ou
cache que passe a usar cifra no futuro: quem cifrar algo com o `APP_KEY` herda esta mesma regra.

Por isso são **dois procedimentos diferentes**, e escolher o errado é o risco:

### 5.1. Rotação planejada — higiene, sem derrubar ninguém

1. Gerar o valor novo (`php artisan key:generate --show` imprime um candidato sem gravar nada).
2. Mover o valor **atual** de `APP_KEY` para dentro de `APP_PREVIOUS_KEYS` (lista separada por
   vírgula; se já houver chaves antigas ali, acrescentar, não substituir).
3. Escrever o valor novo em `APP_KEY`.
4. Fazer o deploy (`app` e `scheduler`, mesmo `env_file`).
5. **Ninguém é desconectado.** Os cookies antigos seguem sendo decifrados pela chave da lista, e cada
   resposta os recifra com a chave nova.
6. Manter a(s) chave(s) velha(s) em `APP_PREVIOUS_KEYS` até ter certeza de que nada cifrado com ela
   sobrou. Hoje isso é rápido (o único portador é o cookie de sessão, e `SESSION_LIFETIME=120`
   minutos no `.env.example:38` é o teto de vida de qualquer cookie ainda em trânsito); se um valor
   `encrypted` em coluna ou cache entrar no futuro, essa janela deixa de ser de minutos e precisa ser
   reavaliada antes de remover a chave da lista.
7. **Nunca** sobrescrever `APP_KEY` direto e reiniciar sem passar pelo passo 2 — isso derruba a
   decifragem de qualquer coisa que ainda dependa da chave velha sem deixar `APP_PREVIOUS_KEYS` como
   rede de segurança. (É o que o procedimento 5.2 faz de propósito; aqui seria acidente.)

### 5.2. Rotação por comprometimento — quando o objetivo É derrubar as sessões

Gatilho: cookie/sessão vazado, chave exposta, suspeita de acesso indevido (§6). Aqui a chave velha
**não** entra em `APP_PREVIOUS_KEYS`, e só isso ainda não basta:

1. Gerar o valor novo e escrevê-lo em `APP_KEY`, deixando `APP_PREVIOUS_KEYS` **vazio** (ou sem a
   chave comprometida).
2. Fazer o deploy (`app` e `scheduler`). A partir daqui todo cookie emitido com a chave velha falha a
   decifragem — inclusive o do atacante — e toda sessão viva cai.
3. Apagar as linhas de sessão no banco: `SESSION_DRIVER=database`
   (`backend/.env.production.example:60`) guarda cada sessão numa linha de `sessions`
   (`backend/database/migrations/0001_01_01_000000_create_users_table.php:39`), e um
   `DELETE FROM sessions;` no MySQL revoga independentemente de chave. É o passo que **garante** a
   revogação: sem ele, restaria confiar em que nenhuma outra porta reabra a sessão.
4. Avisar os usuários antes, quando der — o efeito é todo mundo logando de novo. Com ~10 usuários
   internos, o custo é uma mensagem; o custo de acreditar numa revogação que não aconteceu é outro.

## 6. Cadência

Nenhum `RNF-SEC` fixa um intervalo calendário de rotação, e não há decisão registrada do João sobre
isso — diferente das janelas de retenção (`RetentionPolicy`), que **são** decisão dele e viraram
constante. Por isso este documento não inventa um número com peso de decisão de negócio: propõe uma
cadência de **trabalho**, proporcional a ~10 usuários internos e revisável a qualquer momento por ele:

- **Base:** revisão anual de `DB_PASSWORD`, do `MAIL_PASSWORD` e das credenciais de S3 — suficiente
  para uma equipe deste tamanho, sem o custo operacional de uma rotação trimestral que ninguém está
  medindo.
- **`APP_KEY`:** sem cadência de calendário própria — só rotaciona pelos gatilhos abaixo. A rotação
  planejada (§5.1) não custa sessão nenhuma; a de comprometimento (§5.2) derruba todas de propósito,
  e é a que o gatilho pede.

**Gatilho de rotação fora de cadência — vale para qualquer segredo do inventário (§3), a qualquer
momento, independente da cadência acima:**

- **Saída de pessoa com acesso** ao `env_file` de produção, ao console AWS ou ao MySQL.
- **Suspeita de vazamento** (log exposto, commit acidental, backup mal protegido).
- **Alerta de acesso suspeito confirmado** pela `DetectorDeAcessoSuspeito`
  (`backend/app/Shared/Alerts/DetectorDeAcessoSuspeito.php`) — se a investigação apontar
  comprometimento real (não falso positivo), rotacionar o que o atacante pode ter alcançado é o
  primeiro passo, antes de qualquer outra remediação.
