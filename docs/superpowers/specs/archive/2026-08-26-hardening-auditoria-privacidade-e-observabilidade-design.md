# Design — `hardening-auditoria-privacidade-e-observabilidade`

> Item 5 da fila (`docs/superpowers/backlog.md`), `lane-a`, main tree, branch
> `feat/hardening-auditoria-privacidade-e-observabilidade`. Context Packet:
> [`context-packets/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md`](../context-packets/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md)
> (`status: ready`, quatro fontes recuperadas, nenhuma `unavailable`).
> Base de medição: `main@038b4a70` — os commits posteriores da branch são só `docs(state)`.

## 1. Problema

Três requisitos de segurança do Drive estão declarados e nenhum tem mecanismo. A medição contra
`main@038b4a70` — não a leitura do backlog — mostra o tamanho de cada buraco.

**Retenção: não existe, e nada poderia executá-la.** `grep -rn "prunable\|MassPrunable\|prune" app/`
volta vazio. `grep -rn "Schedule::" app/ routes/ config/ bootstrap/` volta vazio. Não há
`app/Console/`, não há `Kernel.php`, não há um único comando Artisan próprio — `routes/console.php`
tem só o `inspire` do stub. Nenhum compose (`docker-compose.yml`, `docker-compose.prod.yml`,
`docker-compose.prod-probe.yml`) e nem `docker/php/entrypoint.sh` mencionam `schedule:run`,
`schedule:work`, cron ou supervisor. O `Dockerfile.prod` termina em
`ENTRYPOINT ["entrypoint"] / CMD ["php-fpm"]`. Ou seja: **hoje não há onde uma poda rodar.**

**A `audits` cresce sem teto e carrega PII pura.** Medido no MySQL de dev: 5513 linhas em 15 dias
(2026-08-10 → 2026-08-25), 15 models `Auditable`. A tabela veio do stub do vendor sem uma linha
alterada (`backend/database/migrations/2026_07_02_205621_create_audits_table.php`) e guarda `url`
(`text`), `ip_address` (`ipAddress`) e `user_agent` (`varchar 1023`). Índices existentes:
`PRIMARY`, `(auditable_type, auditable_id)` e `(user_id, user_type)` — **nenhum em `created_at`**,
então qualquer recorte por data varre a tabela inteira. Parte do volume é ruído de console:
linhas com `url: "artisan migrate:fresh --seed"`, `ip_address: 127.0.0.1`, `user_agent: Symfony`.

**A `login_logs` é a mesma PII com a mesma ausência de política.** 262 linhas, append-only por
desenho — zero `update`, `delete` ou `forceDelete` em todo o app; escrita só por
`RecordLoginAction:25`, chamado de `AuthController:62`. Guarda `ip_address` (`varchar 45`) e
`user_agent` (`text`), tem `created_at` mas não `updated_at`, e um índice composto
`(user_id, created_at)`. É exatamente a ficha **P-33**, e o `PivotAudit:33` já cita no código "uma
tabela cuja retenção segue aberta (P-02/P-33)".

**Logs de ações: praticamente inexistentes.** `config/logging.php` é o stub vanilla do Laravel,
sem um canal próprio. O app inteiro tem **três** chamadas de log, todas `Log::warning` de descarte
de objeto órfão (`Shared/Files/Actions/UploadFileAction.php:124,130` e
`Identity/Services/UserPhotoService.php:110`). Zero `logger()`. **Nenhum evento de acesso é
registrado em log.**

**Alertas de acesso suspeito: nenhum, mas os três pontos de captura existem e são silenciosos.**

| O que acontece | Onde | O que o sistema faz hoje |
|---|---|---|
| senha errada | `AuthController:40` lança `ValidationException` | conta só no balde do limitador `login` (`RateLimits:63`, chave `email\|ip`); nada é registrado |
| conta desativada com sessão viva | `EnsureAccountIsActive:48` lança `AuthenticationException` | invalida a sessão e devolve 401; nada é registrado |
| autorização negada | `AuthorizationException` no braço 403 de `ProblemDetails:26` | devolve o envelope 7807; nada é registrado |

**Segredos.** `env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}` já mantém os segredos fora da imagem
e do repositório (spec D6 do bloco de runtime). O que falta é procedimento: não há inventário nem
rotação documentada em lugar nenhum dos `/docs`.

## 2. O que a fonte canônica exige

O packet recuperou o texto do Drive. Verbatim:

- **RNF-SEC-01** — "Dados armazenados conforme LGPD (Brasil) e legislação chilena".
- **RNF-SEC-03** — "Segredos (chaves, tokens, credenciais de e-mail/nuvem) fora do código, em cofre
  de segredos".
- **RNF-SEC-04** — "Auditoria na camada de aplicação via biblioteca, registrando quem/o quê/valor
  antigo/novo numa estrutura central, aplicando o polimorfismo".
- **RNF-SEC-05** — "Micro-serviço em nuvem com logs das ações do software, com registro das ações
  feitas".
- **RNF-SEC-07** — "Alertas de acessos suspeitos, com parâmetro de identificação definido".

Três leituras que o packet fixou e que esta spec não reabre:

1. **Nenhum RNF-SEC fixa janela de retenção, volume, canal ou prazo.** Os 7 dias do RNF-DIS-03 são
   backup de banco e não dizem nada sobre `audits`, `login_logs` ou documentos.
2. **"Micro-serviço em nuvem" é a forma literal do RNF-SEC-05**, não uma inferência. Trocá-la exige
   revisão escrita, não equivalência silenciosa.
3. **A fonte não determina expiração documental** — não há prazo, descarte, preservação nem legal
   hold para PDF de turma ou de redator.

Notion: a task **9.1.2** (EAP) exige poda agendada no scheduler mas não define janelas; a **10.1.8**
cobre queda operacional via CloudWatch e **não** é alerta de acesso suspeito. Nenhuma das duas
restringe o escopo abaixo.

## 3. Decisões

| # | Decisão | Razão |
|---|---|---|
| **D1** | Retenção: `audits` **5 anos**, `login_logs` **12 meses**, ambos podados pelo scheduler. | Instrução explícita do João, 2026-08-26. Auditoria acompanha o peso legal do certificado; PII pura sai antes. |
| **D2** | A `audits` é podada em **duas fases**: aos 12 meses anonimiza `ip_address`, `user_agent` e `url`; aos 5 anos apaga a linha. | Instrução explícita do João, 2026-08-26. A `audits` carrega a **mesma** PII pura que motivou a P-33 no `login_logs` — sem a fase 1, IP e user agent sobreviveriam 5 anos pela outra porta e as duas janelas contariam histórias diferentes. Quem/o quê/valor antigo/novo, que é o que o RNF-SEC-04 exige, sobrevive intacto até os 5 anos. |
| **D3** | O runner é um **serviço `scheduler` no compose de produção**, da mesma imagem, com `php artisan schedule:work`. | Sem runner a poda é código morto — e hoje não existe nenhum. Cron do host foi recusado: colocaria a poda dependendo do working tree do servidor, que é justo o que o item 10 comprou ao COPIAR o código para dentro da imagem. |
| **D4** | Documentos de turma e redator **não expiram**; permanece só o arquivamento lógico vigente. | Instrução explícita do João, 2026-08-26. A fonte canônica não define prazo nem descarte, e inventar um sobre documento de peso legal seria supor regra de negócio. Decisão documental, sem código novo. |
| **D5** | Centralização dos logs de ações **dentro do monólito**; o RNF-SEC-05 é revisado formalmente por escrito. | Instrução explícita do João, 2026-08-26. Microserviço em nuvem é desproporcional para ~10 usuários internos, mas a forma está escrita na fonte canônica: substituí-la em silêncio deixaria doc e sistema divergentes sem rastro. |
| **D6** | Acesso suspeito são **três famílias mensuráveis**: falhas repetidas na mesma chave, sessão de conta desativada e sequência de 403. Cada uma com condição, destino e expectativa temporal. | Instrução explícita do João, 2026-08-26, e é o "parâmetro de identificação definido" que o RNF-SEC-07 pede nominalmente. As três já têm ponto de captura no código e nenhuma emite sinal. |
| **D7** | Alerta é **síncrono, no request que cruza o limiar**, por e-mail aos admins ativos mais linha de log. | Produção **não tem worker de fila** — está medido e escrito no cabeçalho do `docker-compose.prod.yml`. Assíncrono exigiria subir worker junto, e isso é outro bloco. Cruzar limiar é raro por construção, e a latência cai num caminho que já é resposta de erro. |
| **D8** | Segredos seguem em `env_file` fora da imagem, com **rotação documentada**; cofre gerenciado fica no item 10. | Instrução explícita do João, 2026-08-26. Cofre real depende de conta AWS, que é `infra-producao-provisionamento-aws`. Procedimento escrito é o que dá para provar agora. |
| **D9** | `config/audit.php` mantém `console => true`. | Os testes de auditoria rodam em console: desligá-lo cegaria a suíte inteira. O ruído de seed que ele produz sai sozinho na poda de D2, sem custo de desenho. |

## 4. Arquitetura

### 4.1 Política de retenção como peça única

`backend/app/Shared/Retention/RetentionPolicy.php` publica as janelas como constantes, no mesmo
idioma do `Shared/RateLimiting/RateLimits.php`: **quem quer saber a política lê UM arquivo**, e
nenhum número mora no comando, na migration ou no `routes/console.php`.

Três janelas, e só três: anonimização de `audits`, descarte de `audits`, descarte de `login_logs`.

**Números não entram nesta spec** além dos que o João fixou (12 meses / 5 anos / 12 meses); tamanho
de chunk e horário sai de medição no plano.

### 4.2 Poda de `audits` em duas fases

Um comando Artisan próprio — o **primeiro** do projeto, o que faz nascer `app/Console/`, exatamente
como o `docs/estrutura-monolito.md:69` já previa ("comandos … nascem quando a poda entrar em
desenvolvimento").

**Fase 1 — anonimizar.** Linhas mais velhas que a janela de anonimização e que ainda tenham
qualquer um dos três campos preenchidos recebem `NULL` em `ip_address`, `user_agent` e `url`.
`user_id`, `user_type`, `event`, `auditable_type`, `auditable_id`, `old_values`, `new_values`,
`tags` e `created_at` **permanecem** — é o conteúdo que o RNF-SEC-04 exige e o que a
`ArchiveTrailQuery` lê.

**Fase 2 — descartar.** Linhas mais velhas que a janela de descarte são apagadas.

**Fase 3** não existe para `login_logs`: descarte direto na janela de 12 meses.

As duas fases percorrem em **chunk**, não em uma sentença só, para não segurar a tabela.

`Prunable` do Laravel fica fora: ele só sabe apagar, e a fase 1 é um `UPDATE`. Com metade do
mecanismo no trait e metade num comando, a política ficaria em dois lugares — contra 4.1.

**Escrita em massa é correta aqui, e a razão é medível:** nem `Audit` nem `LoginLog` implementam
`Auditable`. A lição 5 do `docs/README.md` (usar `$model->delete()`, nunca delete de builder) existe
para que o `owen-it` registre a exclusão; aqui o requisito é o oposto — **apagar trilha não pode
gerar trilha nova**. Isso vira asserção de teste, não comentário.

### 4.3 Índice em `audits.created_at`

Migration nova. Sem ele as duas fases varrem 100% da tabela toda madrugada, e o único índice que
poderia ajudar (`auditable_type, auditable_id`) não tem a data.

Provado contra **MySQL real**, não sqlite — lição 15 do `docs/README.md`.

### 4.4 Runner do scheduler

`routes/console.php` ganha as entradas de `Schedule::command(...)`, diárias, de madrugada.

`docker-compose.prod.yml` ganha o serviço `scheduler`: mesma `${LOTUS_IMAGE}`, mesmo
`env_file`, `command: php artisan schedule:work`, `restart: unless-stopped`, mesmo teto de log
`json-file` 10 MB × 3 dos demais serviços. Sem `ports`, sem healthcheck próprio.

Dev **não** ganha o serviço: a poda roda à mão no container `app` quando se quer prová-la.

### 4.5 Centralização dos logs de ação

`config/logging.php` ganha um canal próprio com formatação JSON sobre `stderr` — o stub vanilla de
hoje não tem nenhum. Produção passa a apontar para ele. Continua saindo por `stderr` e sendo
coletado pelo Docker: a mudança é **forma e conteúdo**, não destino.

`backend/app/Shared/Logging/` publica o **ponto único de escrita** de evento de segurança, com
forma fixa: evento, ator (id e tipo — **nunca** e-mail), IP, resultado, alvo. Nunca senha, token,
corpo de request nem `old_values`.

Eventos cobertos: login bem-sucedido, login falho, logout, sessão revogada por desativação, 403,
429 e cada execução de poda com as linhas afetadas **por fase**.

A retenção do log é o teto `json-file` 10 MB × 3 que o bloco de runtime já instalou. Ele deixa de
ser proteção de disco e passa a ser **política declarada**.

### 4.6 As três famílias de acesso suspeito

`backend/app/Shared/Alerts/` publica os limiares como constantes, mesmo idioma de 4.1.

| Família | Condição | Ponto de captura |
|---|---|---|
| falhas repetidas na mesma chave | N falhas em `email\|ip` dentro de uma janela | `AuthController:40`, contador em cache com a chave do limitador `login` |
| sessão de conta desativada | primeira ocorrência por usuário dentro de uma janela | `EnsureAccountIsActive:48` |
| sequência de 403 | N negações do mesmo usuário dentro de uma janela | braço 403 do `ProblemDetails:26` |

**Destino:** e-mail aos usuários `admin` ativos, mais linha de nível `warning` no canal de 4.5.
O projeto já tem infra de e-mail (`Identity/Notifications/`, `MAIL_MAILER`), então nada novo sobe.

**Expectativa temporal:** o alerta sai **no mesmo request que cruza o limiar** (D7).

Falha no envio vira `Log::error` e a resposta segue: **alerta que quebra nunca derruba a
requisição**. Isso vira teste.

Números de limiar e janela saem do plano, por medição — não desta spec.

### 4.7 Segredos e rotação

Sem código. Entregável é `docs/operacao-segredos.md`: inventário de cada segredo, onde vive,
procedimento de rotação e cadência.

O documento precisa registrar em destaque que **rotacionar `APP_KEY` invalida toda sessão viva e
todo valor cifrado**, e que a rotação passa por `APP_PREVIOUS_KEYS` — não por trocar a linha e
reiniciar o container.

### 4.8 Revisão formal do RNF-SEC-05

**ADR-21**, registrando por escrito que os logs centralizados no monólito substituem o
"Micro-serviço em nuvem" do requisito, com o custo e a consequência da troca.

O Drive é a fonte canônica e vence os `/docs`, então o ADR **não basta sozinho**: abre pendência
para o João replicar a revisão lá.

Com 4.1–4.4 no ar, **P-02 e P-33 fecham por mecanismo** — o ADR-08 deixa de ter lacuna de pruning
e a `login_logs` deixa de ser PII sem política.

## 5. Catracas

Lei que sempre precisa valer quer mecanismo, não instrução (lição 14 do `docs/README.md`).

1. **A poda está agendada.** Teste que lê o `Schedule` montado e exige as entradas de poda — no
   molde do `AuthenticatedRouteMiddlewareTest`, que lê o roteador em vez do texto dos arquivos.
   Comando de poda novo sem agendamento reprova.
2. **Apagar trilha não gera trilha.** Teste que roda as duas fases e prova que a contagem de
   `audits` não cresceu por causa da própria poda.
3. **A fase 1 preserva o que o RNF-SEC-04 exige.** Teste que anonimiza e prova que `user_id`,
   `event`, `auditable_*`, `old_values` e `new_values` sobreviveram intactos.
4. **O log de segurança não vaza.** Teste que exercita cada evento e prova que a linha emitida não
   contém senha, token nem e-mail.
5. **Alerta que falha não derruba a resposta.** Teste com envio quebrado provando que o request
   segue com o status que teria sem alerta.

## 6. Fora de escopo

- **Expiração ou descarte de documento de turma/redator** — D4, decisão do João. Permanece só o
  arquivamento lógico.
- **Microserviço de logs em nuvem** — D5. Substituído por revisão formal, não por silêncio.
- **Cofre de segredos gerenciado, conta AWS e o que depende dela** — D8, item 10
  (`infra-producao-provisionamento-aws`).
- **Alerta operacional em CloudWatch** (Notion 10.1.8) — depende da EC2, não é acesso suspeito.
- **Exportação fria para Glacier** — segue opcional no ADR-08, sem requisito aprovado.
- **Worker de fila** — D7 escolheu síncrono justamente para não arrastar isso para dentro.
- **`Shared/Files/ContentClass`, throttle nomeado e antivírus síncrono** — fechados pelo bloco
  anterior, não se reabrem.

## 7. Definition of Done

Cada item é comportamento **provado**, não pacote instalado (lei §5.8).

1. Rodada a poda contra MySQL real com dados plantados nas três idades, uma linha de `audits` mais
   velha que 12 meses e mais nova que 5 anos está com `ip_address`, `user_agent` e `url` em `NULL`
   e com `user_id`, `event`, `auditable_*`, `old_values` e `new_values` intactos.
2. Na mesma rodada, linha de `audits` mais velha que 5 anos não existe mais, e linha mais nova que
   12 meses está intocada.
3. Na mesma rodada, linha de `login_logs` mais velha que 12 meses não existe mais, e a mais nova
   está intocada.
4. `EXPLAIN` da consulta de recorte por data em MySQL real usa o índice novo de `created_at`.
5. A suíte prova que a poda não acrescentou nenhuma linha em `audits`.
6. `docker compose -f docker-compose.prod.yml config` mostra o serviço `scheduler`, e
   `php artisan schedule:list` no container lista as entradas de poda.
7. A catraca de agendamento reprova quando a entrada é removida — vista falhando contra o código
   sem ela (lição 10).
8. Cada um dos sete eventos de 4.5 aparece no canal, em JSON, com a forma fixa e sem senha, token
   ou e-mail.
9. Cada uma das três famílias de 4.6 dispara ao cruzar o limiar, com e-mail ao admin e linha de log,
   e **não** dispara abaixo dele.
10. Com o envio de e-mail quebrado, o request que cruza o limiar devolve o mesmo status que
    devolveria sem alerta.
11. `docs/operacao-segredos.md` existe, com inventário, procedimento por segredo e o aviso do
    `APP_KEY`.
12. ADR-21 existe e a pendência de replicar a revisão do RNF-SEC-05 no Drive está aberta.
13. P-02 e P-33 estão fechadas apontando para o mecanismo, não para promessa.

## 8. Riscos

- **Poda em produção é irreversível.** Uma janela errada apaga trilha de peso legal. Mitigação: as
  janelas em peça única (4.1), a primeira execução em produção conferida à mão, e o comando
  registrando no log quantas linhas cada fase tocou (4.5).
- **`login_logs` podado zera o "último acesso" de conta sem login há mais de 12 meses.**
  `User::latestLogin():120` alimenta `UserData:98`, `RedatorData:105` e três pontos do
  `UserController`. Consequência **aceita e declarada**: a tela passa a mostrar ausência de acesso
  registrado. Preservar sempre a última linha por usuário manteria PII indefinida em conta
  abandonada, contra D1 e D2.
- **`schedule:work` num container só.** Se o serviço morre em silêncio, a poda para sem ninguém
  notar e a descoberta é o disco enchendo meses depois. `restart: unless-stopped` cobre queda do
  processo, não travamento. Fica como ficha de dívida com gatilho, não como monitor inventado aqui.
- **Alerta síncrono em e-mail.** SES lento acrescenta latência ao request que cruza o limiar. Aceito
  porque é caminho de erro e raro por construção; a catraca 5 garante que lentidão vire, no pior
  caso, resposta normal.
- **Anonimização é uma via só.** Não há como recuperar o IP depois. É o objetivo, e a consequência é
  que investigação forense além de 12 meses deixa de ser possível — declarada, não descoberta.
