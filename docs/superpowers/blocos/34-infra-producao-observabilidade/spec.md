# Spec — `infra-producao-observabilidade` — 2026-10-04

> Item 34 do backlog, lane aberta pelo `lane.sh abrir` em 2026-10-04 (`lane_base 77196049`),
> offset +2. `Contexto: sim` — packet em `blocos/34-infra-producao-observabilidade/context.md`,
> gerado sem Codex (`mcp__codex__codex` ausente) por três leitores `contexto-leitor` em paralelo
> (Drive, Notion e repositório). A ficha ganhou `**Depende:** 32` na linha Prioridade nesta mesma
> branch (`0ca0c58b`), porque o portão do `lane.sh abrir` só lê ali. Por decisão do João, essa
> correção vai à `main` numa PR de docs desta branch, e o bloco segue nela depois do merge.

> Desenho aprovado em quatro seções no brainstorming de 2026-10-04. O bloco fecha quatro textos que
> esperavam por ele:
> - o `[FASE 2]` "monitoramento básico (healthcheck + alerta CloudWatch)" do ADR-14;
> - a linha "canal definitivo de alerta é decisão do bloco de observabilidade", do runbook §10;
> - o "não há alarme de expiração até o item 34", do §11.7 e do ADR-14;
> - o "o log morre com a instância", do ADR-21.
>
> E cumpre o único critério de aceite da task Notion 10.1.8: "Alerta dispara em queda".

> **Uma decisão nova espera o João na revisão desta spec: a D12, sobre o D-74.** Os trechos que
> dependem dela estão marcados `(D12)`.

## 1. Contexto

### 1.1 O que já existe — medido, não suposto

- **Host.**
  - `t4g.small`: 2 GiB de RAM e swap de 2 GiB em uso (694 MiB com o host ocioso, P-80).
  - gp3 de 20 GiB, Ubuntu 24.04 arm64, IMDSv2 com hop limit 2.
  - Role `lotus-ec2`, com as inlines `s3`, `lotus-alerta` (só `sns:Publish` no tópico) e
    `lotus-ses`, mais a managed `AmazonSSMManagedInstanceCore`. Nenhuma delas dá permissão de
    CloudWatch (runbook §4).
- **`deploy/aws/user-data.sh`.**
  - Instala o Docker (repositório oficial), o AWS CLI v2 e o swap, e cria `/opt/lotus`.
  - É colado à mão no launch e serve de reparo do host vivo, com guardas de reexecução. Não
    instala agente, sonda nem crontab.
  - O botão de deploy (item 31) **não** confere o user-data. Confere os dois composes, o
    `nginx/tls.conf` e cada `bin/*.sh`. Um `deploy/bin/*.sh` novo trava o botão até a reinstalação
    pelo §7.
- **Logs.**
  - Todo serviço do `docker-compose.prod.yml` usa `json-file` 10 MB × 3.
  - O Laravel escreve em `stderr` (`LOG_CHANNEL=stderr`), em JSON, inclusive o canal `seguranca`
    do ADR-21.
  - O nginx usa o log default da imagem: a linha de requisição inteira (`$request`, com a query
    string) vem antes do status.
  - Nenhum `location` tem `access_log off`, nem o `= /up`.
- **`/up`.**
  - É o health do Laravel. O healthcheck do nginx o chama a cada 15 s (`wget --spider
    http://127.0.0.1/up`), atravessando o fastcgi.
  - É isento do 301 e responde em `https://app.lotusotec.cl/up`. É a única superfície HTTP de
    prova (`producao GET /up -> 200`).
- **Alerta.**
  - O tópico SNS `lotus-alertas` está em `sa-east-1`. O único assinante confirmado é o e-mail do
    João, e hoje só o `verificar-backup.sh` publica nele.
  - O Budget `lotus-prod-teto` manda e-mail direto, sem SNS (runbook §10).
- **Certificado.** `certbot.timer` no host, por webroot, com o hook `recarregar-nginx.sh`. O
  certificado atual vence em 2026-12-27.
- **CloudWatch na conta**, lido em 2026-10-04 com o perfil `lotus`.
  - Nenhuma métrica custom em `sa-east-1` nem em `us-east-1`, e nenhum alarme.
  - Um log group só: `/aws/lambda/lotus-site-contato`, com 11,7 KB.
  - A conta é membro de uma organização (`FeatureSet: ALL`), e o `freetier get-free-tier-usage`
    dela volta vazio.

### 1.2 O que falta

O único alerta que sai do host é o do backup atrasado. Queda do `app`, disco cheio, 5xx sustentado
e certificado a vencer não avisam ninguém, e o log morre com a instância.

Nenhuma fonte fixa métrica, limiar, período, retenção, destinatário ou teto de custo (packet, fato
1). Tudo isso é decisão deste bloco, registrada no §2.

### 1.3 Achados do brainstorming e da escrita da spec

1. **Com glob, o agente só envia o arquivo modificado por último.** Lido em 2026-10-04 no código do
   agente (`aws/amazon-cloudwatch-agent`, `plugins/inputs/logfile/logfile.go`, `getTargetFiles`).
   - Sem `publish_multi_logs`, o glob `/var/lib/docker/containers/*/*-json.log` levaria um
     contêiner por vez. Com `publish_multi_logs: true`, vão todos, cada arquivo no seu stream
     (`<log_stream_name>_<caminho com / trocado por _>`).
   - No mesmo arquivo: um arquivo que aparece depois de o agente subir, sem estado salvo e com
     `from_beginning: false`, é lido **do fim**. Perderiam-se as primeiras linhas do contêiner
     recriado pelo deploy, que são onde mora o erro de boot.
   - As duas chaves entram na config, e o lab prova as duas (§5, passo 3).
2. **Metric filter não aceita dimensão fixa.** A dimensão só sai de campo do evento. Um filtro
   igual no grupo do lab alimentaria a mesma métrica dos alarmes de produção. Por isso os filtros
   existem só nos grupos de `prod`, e o lab valida os padrões com `test-metric-filter` (D7).
3. **O free tier é da organização.** O free tier permanente do CloudWatch cobre o bloco com folga:
   10 métricas custom, 10 alarmes, 1 milhão de chamadas de API e 5 GB de log. Mas, numa
   organização, ele é um só para todas as contas, somado na pagadora, e esta conta não enxerga essa
   soma (D13).
4. **O gatilho do D-74 disparou.**
   - O D-74 diz que a `QueryException` leva a SQL com os bindings ao log default. O gatilho dele é
     "o próximo bloco que tocar a observabilidade ou `config/database.php`", e este bloco é esse.
   - Com o bloco, o log default deixa de ser ≤ 30 MB girando no host e passa a ficar 30 dias no
     CloudWatch. Junto com ele vão o e-mail, o RUT ou o nome que a exceção interpolar.
   - O desenho aprovado diz que o backend não muda, e o D-74 diz que a decisão é do João (D12).
5. **A "URL" do log do nginx inclui a query string.** A Seção 4 aprovou IP, user agent e URL saindo
   do host. O `$request` traz a query, e o `q` das listas paginadas (ADR-22, `PageRequest`) é termo
   de busca: pode ser nome ou RUT. Fica como limite declarado (§8), sem mudar o nginx.

## 2. Decisões

| # | Decisão | Origem |
|---|---|---|
| D1 | Os logs dos contêineres e da sonda saem do host para o CloudWatch Logs, com retenção de **30 dias** em `prod` e 1 dia em `lab`. O teto local `json-file` fica, porque o coletor pode cair (comentário do compose). | João, 2026-10-04 |
| D2 | Destinatário: o tópico `lotus-alertas` (`sa-east-1`), com o e-mail do João como único assinante. É o canal definitivo de alerta de infraestrutura e fecha a linha em aberto do runbook §10. O Budget segue por e-mail direto. | João |
| D3 | As sondas rodam em **produção**, numa janela fora do horário comercial do Chile. A EC2 de lab só prova o recreate e é terminada. Isso substitui o "encher o disco em laboratório" do DoD da ficha. | João |
| D4 | Caminho 1, **agente + linha de sonda**. O agente leva as métricas de host e todos os logs; uma sonda escreve uma linha JSON por minuto, e metric filters a transformam em métricas. Descartados: o caminho 2, sem agente, com `put-metric-data` por minuto e driver `awslogs` no compose (uma falha do CloudWatch Logs ou da IAM impede o contêiner de subir); e o 3, agente só para métricas e `awslogs` para logs (dois mecanismos, com o mesmo acoplamento). | João |
| D5 | Quatro alarmes (§4.4). Cada um avisa o tópico no `ALARM` e no `OK`, e a descrição dele aponta a subseção do runbook §14. | Seção 2 |
| D6 | Dimensões estáveis entre instâncias: `omit_hostname`, sem `InstanceId`, `drop_device` no disco e a dimensão fixa `Ambiente`. Um recreate não deixa os alarmes órfãos. | Seção 1 |
| D7 | Metric filters só nos grupos de `prod`. O lab valida os padrões por `test-metric-filter`, sem publicar métrica (achado 2). | escrita da spec |
| D8 | O `user-data.sh` ganha `AMBIENTE=prod` no topo (o lab troca para `lab`) e `--no-upgrade` em todo `apt-get install`. Assim, rodá-lo no host vivo nunca atualiza o Docker, cujo upgrade reiniciaria todos os contêineres. | Seções 1 e 3 |
| D9 | Memória e swap são coletados **sem alarme**: o swap já está em uso, e um alarme nele dispararia sempre. Os dois viram o histórico da decisão de resize (§12, P-80). | Seção 2 |
| D10 | Emenda do ADR-21: a política de retenção declarada do log de segurança passa a ser 30 dias no CloudWatch, com o teto local mantido. | Seção 4 |
| D11 | Emenda do ADR-14: o monitoramento básico sai do `[FASE 2]`. | Seção 3 |
| D12 | **Pendente do João, na revisão desta spec.** A recomendação é pagar o D-74 aqui, com `mask_bindings_in_exception_messages` na conexão e um teste (§4.8). O custo é perder os valores no diagnóstico de erro de SQL, que foi o motivo de o item 33 deixar a decisão para depois; o que mudou é que agora o log fica 30 dias fora do host. Com o sim, valem os trechos `(D12)`. Com o não, eles saem, o D-74 fica como está no backlog, e a recusa fica registrada aqui e na emenda do ADR-21. | achado 4 |
| D13 | Custo: **≈ US$ 0** dentro do free tier da organização e **≈ US$ 3–4/mês** fora dele (6 métricas custom, 4 alarmes, ~43 mil `PutMetricData`/mês e 0,3–0,5 GB de log/mês, pela tabela de `us-east-1`; a de `sa-east-1` é um pouco mais alta). O valor real sai do Cost Explorer desta conta ~3 dias depois da instalação e vai para a P-80. Teto e resize continuam decididos juntos em 2026-10-31. | Seção 4 e resposta sobre o free tier |
| D14 | Portões: o bloco para e volta ao João se a RSS do agente no lab passar de ~100 MB, se o disco de produção estiver em ≥ 75% na leitura, ou se o `test-metric-filter` recusar a regex do 5xx **e** o termo literal. | Seção 4 |
| D15 | O alarme de certificado mede o certificado **servido** na 443, não a saída do `certbot renew --dry-run` (a alternativa da ficha). Assim, pega também o hook de recarga quebrado. | Seção 2 |

## 3. Escopo

**Repositório (Fase A):**
- `deploy/aws/user-data.sh`;
- `deploy/bin/sondar-saude.sh` (novo);
- `deploy/aws/criar-observabilidade.sh` (novo);
- catracas em `frontend/tests/`;
- runbook `deploy/aws/README.md`: §14 nova e emendas em §6, §7, §10, §11.7 e §12;
- `docs/adrs.md`: ADR-14 e ADR-21;
- `docs/superpowers/pendencias/abertas.md`: P-80;
- `(D12)` `backend/config/database.php` e um teste de feature.

**Fora do repositório (Fase B):** recursos base, lab, reinstalação, reparo, alarmes, janela de
sondas e medição de custo, na ordem do §5.

**Não mudam:** o `docker-compose.prod.yml`, o nginx (`deploy/nginx/` e `docker/nginx/`) e, sem a
D12, o backend.

**Fora:**
- APM, tracing e dashboards;
- auditoria de aplicação (é o `owen-it/laravel-auditing`);
- sonda externa (health check do Route 53, Synthetics);
- auto-recover da EC2;
- alarme de memória e swap;
- RNF-SEC-07 (alerta de acesso suspeito);
- mascarar a query string no log do nginx;
- IaC;
- atualizar o Drive.

## 4. Fase A — repositório

### 4.1 `deploy/aws/user-data.sh`

O arquivo segue sendo o recreate e o reparo. Tudo o que ele ganha é idempotente: a segunda
execução não muda nada, e o lab prova isso.

- **`AMBIENTE=prod`** no topo, validado contra `prod|lab` antes de qualquer outra linha. Valor fora
  disso sai 1 sem tocar no host.
- **`--no-upgrade`** em todo `apt-get install`, inclusive na linha do Docker que já existe.
- **Agente** `amazon-cloudwatch-agent`: o `.deb` arm64 da AWS, com versão e sha256 fixados no
  arquivo. A task que escreve essa linha lê a versão corrente publicada e o sha256 do `.deb`
  baixado. O script confere o sha256 antes do `dpkg -i` e pula a instalação se a mesma versão já
  estiver instalada.
- **Config do agente** num heredoc, aplicada por
  `amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:<json> -s`:
  - `agent`: `omit_hostname: true` e coleta a cada 60 s. O agente roda como root (o default),
    porque é root quem lê `/var/lib/docker/containers`.
  - `metrics`: namespace `Lotus/Host`. `disk` só em `/`, com `used_percent` e `drop_device: true`;
    `mem` e `swap`, com `used_percent`. Cada um com `append_dimensions` `{"Ambiente": "<AMBIENTE>"}`.
  - `logs`, com stream `{instance_id}`:
    - `/var/lib/docker/containers/*/*-json.log` vai para `/lotus/<AMBIENTE>/containers`, com
      `publish_multi_logs: true` e `from_beginning: true`;
    - `/var/log/lotus/sonda.log` vai para `/lotus/<AMBIENTE>/sonda`, com `from_beginning: true`.
  - Sem `retention_in_days` na config. A retenção é do script da AWS, e a role não pode mudá-la.
- **Sonda:**
  - cria `/var/log/lotus/`;
  - logrotate do `sonda.log`, diário, com 7 cópias;
  - `lotus-sonda.service` (oneshot, com `ConditionPathExists=/opt/lotus/bin/sondar-saude.sh`) e
    `lotus-sonda.timer` (todo minuto), habilitados com `enable --now`.

  O script da sonda chega pelo §7. Sem ele, o timer não roda nada, falta dado, e o alarme de `/up`
  acusa. É o comportamento certo para um host recriado que ainda não recebeu deploy.

### 4.2 `deploy/bin/sondar-saude.sh`

- Executável, com `set -euo pipefail`, sem credencial AWS e sem ler o `.env`.
- **O que mede:**
  - `GET https://app.lotusotec.cl/up`, por `curl` sem `-L`, com teto de 10 s;
  - os dias que faltam no certificado servido na 443, por `openssl s_client` com SNI
    `app.lotusotec.cl`, também com teto de 10 s.
- **Caminho:** o hairpin pelo EIP. Se a leitura do §5, passo 1, mostrar que o hairpin falha, o
  default passa a ser `--resolve app.lotusotec.cl:443:127.0.0.1` no `curl` e
  `-connect 127.0.0.1:443` no `openssl`, mantendo o nome.
- **Saída:** **uma linha JSON por execução**, em append, como
  `{"ts":"<UTC ISO-8601>","up":1,"http":200,"cert_dias":84}`.
  - `up` é 1 só com HTTP 200.
  - `http` é o código, ou 0 sem resposta.
  - `cert_dias` é o piso de (validade − agora) em dias, negativo se o certificado venceu. Se a
    medição falhar, a chave é **omitida**, nunca gravada como número.
- **Código de saída:** 0 quando a linha foi gravada, qualquer que seja a medição, porque a medição
  é a linha. Diferente de 0 só se a linha não pôde ser gravada.
- **Overrides,** para o teste local e para a prova do certificado:
  - `LOTUS_SONDA_URL`;
  - `LOTUS_SONDA_TLS`, o `host:porta` do `openssl`;
  - `LOTUS_SONDA_CERT_ARQUIVO`, que lê o certificado de um PEM em vez de conectar;
  - `LOTUS_SONDA_LOG`.

### 4.3 `deploy/aws/criar-observabilidade.sh`

Segue o padrão do `criar-oidc-e-role.sh`:
- `set -euo pipefail`, idempotente, e termina em readback;
- quem roda é o João, com credencial administrativa;
- a conta é lida do `sts`, e a região é `sa-east-1` (`LOTUS_REGIAO` muda);
- nenhum número de conta nem ARN no arquivo. O ARN do tópico é montado a partir da conta e da
  região.

**Etapa `base <prod|lab>`:**

- **Inline `lotus-observabilidade`** na `lotus-ec2`, a mesma para os dois ambientes:
  - `logs:CreateLogStream`, `logs:PutLogEvents` e `logs:DescribeLogStreams`, em
    `arn:aws:logs:sa-east-1:<conta>:log-group:/lotus/*` e nos streams desses grupos;
  - `cloudwatch:PutMetricData`, com a condição `cloudwatch:namespace = Lotus/Host`.

  Sem `logs:CreateLogGroup` nem `logs:PutRetentionPolicy`: do host não se cria grupo nem se muda
  retenção.
- **Log groups** `/lotus/<ambiente>/containers` e `/lotus/<ambiente>/sonda`, com retenção de 30
  dias em `prod` e 1 dia em `lab`.
- **Metric filters,** só em `prod`, no namespace `Lotus/Sonda` e sem dimensão:
  - `Up`, no grupo `sonda`, com valor `$.up`;
  - `CertDias`, no grupo `sonda`, com valor `$.cert_dias`, casando só a linha que traz a chave;
  - `Http5xx`, no grupo `containers`, com valor 1, **default 0** e o padrão
    `{ $.log = %HTTP/[0-9.]+" 5[0-9]{2} % }`. Se a regex for recusada, entra um termo literal
    equivalente.

  `Up` e `CertDias` ficam **sem** default. Um 0 em cada linha que não casa viraria queda falsa e
  certificado vencido falso.

  Cada padrão passa por `aws logs test-metric-filter` antes do `put-metric-filter`, com uma linha
  que tem de casar e outra que não pode casar. As linhas do nginx são linhas reais do `json-file` de
  produção, colhidas no §5, passo 1, com o IP trocado. Se as duas formas do 5xx forem recusadas,
  vale o portão D14.
- **Readback:** a policy, a retenção dos grupos e os filtros.

**Etapa `alarmes`** (só `prod`):

- **Recusa** em três casos, e em cada um olha o efeito:
  - sem um ponto de `Lotus/Sonda Up` nos últimos 10 minutos — senão o alarme de `/up` nasceria
    disparando por falta de dado;
  - sem a métrica `Lotus/Host disk_used_percent` com as dimensões exatas do alarme — senão o de
    disco nunca sairia de `INSUFFICIENT_DATA`;
  - sem uma assinatura confirmada no `lotus-alertas` (`PendingConfirmation` não conta) — senão os
    alarmes avisariam ninguém.
- `put-metric-alarm` dos quatro do §4.4, com `AlarmActions` e `OKActions` no tópico.
- **Readback** de cada alarme: nome, métrica, dimensões, estatística, período, limiar, M de N,
  tratamento de falta de dado e ações.

### 4.4 Os alarmes

| Alarme | Métrica | Estatística, período | Dispara | M de N | Falta de dado |
|---|---|---|---|---|---|
| `lotus-prod-up` | `Lotus/Sonda` `Up` | mínimo, 60 s | `< 1` | 3 de 5 | `breaching` |
| `lotus-prod-5xx` | `Lotus/Sonda` `Http5xx` | soma, 300 s | `≥ 5` | 1 de 1 | `notBreaching` |
| `lotus-prod-disco` | `Lotus/Host` `disk_used_percent`, com `Ambiente=prod`, `path=/` e as demais dimensões que o lab ler | máximo, 300 s | `> 80` | 2 de 2 | `ignore` |
| `lotus-prod-certificado` | `Lotus/Sonda` `CertDias` | mínimo, 300 s | `< 21` | 1 de 1 | `ignore` |

- **`/up`, 3 de 5.**
  - Métrica de metric filter chega com atraso. Com 3 de 3 e falta de dado contando como falha,
    1–2 min de atraso já dariam alarme falso.
  - Uma queda real dispara em ~3–5 min.
  - É o único alarme em que falta de dado conta como falha: ele é o *dead-man's switch* do agente,
    da sonda e do host.
- **5xx, ≥ 5 em 5 min.**
  - Com ~10 usuários, cinco erros em 5 minutos são um padrão, não ruído.
  - Pega a falha parcial, como uma rota quebrada ou o S3 ou o Gotenberg fora, com o `/up` verde.
  - Com o `app` parado, dispara junto com o de `/up`, porque o healthcheck do nginx leva 502 a cada
    15 s. É redundância aceita.
- **Disco, 80% em 2 de 2.**
  - Deixa 4 GiB livres dos 20, e os dois períodos absorvem o pico do `docker pull` do deploy.
  - O número se confirma na leitura do §5, passo 1, sob o portão D14.
- **Certificado, < 21 dias.** O Let's Encrypt renova quando faltam 30 dias. Abaixo de 21, a
  renovação já falhou por 9 dias seguidos, e ainda sobram 3 semanas para consertar.
- **Disco e certificado mantêm o estado** quando falta dado, em vez de repetir o aviso que o de
  `/up` já dá.

### 4.5 Runbook — `deploy/aws/README.md`

- **§14 nova, "Observabilidade":**
  - criar os recursos (`base`) e montar o lab;
  - instalar no host vivo (§7 e reparo) e criar os alarmes;
  - a janela de sondas;
  - como ler os logs e as métricas;
  - o que fazer com cada e-mail. O de `/up` manda olhar
    `systemctl status amazon-cloudwatch-agent lotus-sonda.timer` antes do app;
  - parada planejada: `disable-alarm-actions` antes, `enable-alarm-actions` depois;
  - conferir a assinatura do tópico.
- **§6:** o user-data instala o agente e o timer da sonda, e tem `AMBIENTE`. A prova do cloud-init
  ganha `systemctl is-active amazon-cloudwatch-agent lotus-sonda.timer`.
- **§7:** o `scp` e o `mv` levam o `sondar-saude.sh`, e o merge trava o botão até a reinstalação.
- **§10:** o canal definitivo está decidido (D2).
- **§11.7:** o alarme de expiração existe (`lotus-prod-certificado`, < 21 dias).
- **§12:** memória e swap ficam no `Lotus/Host`. O histórico de lá substitui o `free -m` à mão como
  evidência do critério de resize.

### 4.6 ADRs — `docs/adrs.md`

**ADR-14, emenda de 2026-10-04.**
- O `[FASE 2]` "monitoramento básico (healthcheck + alerta CloudWatch)" está vencido: existem o
  agente, a sonda, os quatro alarmes e o canal.
- Os limites ficam escritos: hairpin, sem sonda externa e sem auto-recover. O ponteiro é o runbook
  §14.
- Fecha também o "não há alarme de expiração até o item 34" da emenda de 2026-09-27, sem
  reescrevê-la.

**ADR-21, emenda de 2026-10-04.**
- O coletor existe. A política de retenção declarada do log de segurança passa a ser **30 dias no
  CloudWatch Logs** (`/lotus/prod/containers`), e o teto local fica para quando o coletor cair.
- O que sai do host:
  - do canal `seguranca`: id do ator e IP. Nunca e-mail, senha ou token, pela forma fixa do
    `EventoDeSeguranca`;
  - do nginx: IP, user agent e a URL com a query string (achado 5);
  - `(D12)` as mensagens de `QueryException`, sem os bindings.
- 30 dias é menos que os 12 meses do IP no `login_logs` e no `audits` (D1/D2 da spec de hardening).
  O registro longo é o banco.
- Os logs ficam na mesma conta e região (`sa-east-1`) que o S3 e os backups, e o CloudWatch Logs
  cifra em repouso.
- A regra do ADR não muda, porque o coletor não é o microserviço do RNF-SEC-05. A P-64 segue
  aberta.

### 4.7 Pendências

A P-80 ganha três dados: o custo do bloco nas duas hipóteses (D13), a RSS do agente medida no lab e,
depois da Fase B, o custo medido.

### 4.8 `(D12)` D-74 — bindings fora da mensagem da `QueryException`

- `backend/config/database.php`: `mask_bindings_in_exception_messages => true` nas conexões que o
  app usa. São a `mysql`, de produção, e a `sqlite`, da suíte, para o teste exercer o mesmo caminho.
- Um teste de feature, por TDD, provoca uma `QueryException` com um valor conhecido e exige a
  mensagem sem esse valor.
- **Resíduo declarado:** o texto de erro do próprio MySQL (`Duplicate entry '<valor>' for key ...`)
  continua trazendo o valor. Mascarar os bindings não o alcança.
- A suíte PHP inteira roda no contêiner da lane (offset +2), e o Pint roda nos arquivos tocados.
- Em produção, o efeito só existe depois que o botão promove o SHA do merge (§5, passo 5).

## 5. Fase B — fora do repositório, na ordem

A escrita na AWS e no host é do João. A sessão confere por leitura: SSH só de leitura e `aws` com o
perfil `lotus`.

Cada leitura vai para `blocos/34-infra-producao-observabilidade/audit.md`, sem número de conta, sem
IP de cliente, sem endereço de e-mail e sem valor do `.env`.

**Antes do merge, durante a execução:**

1. **Leituras no host de produção.** Este passo vem antes da task da sonda, porque o hairpin decide
   o default dela (§4.2).
   - `df -h /`, `findmnt -no FSTYPE /`, `docker system df` e `free -m`;
   - `curl` e `openssl s_client` em `app.lotusotec.cl` **a partir do próprio host**, para provar o
     hairpin;
   - três linhas cruas do `json-file` do nginx, para o `test-metric-filter`.

   Disco em ≥ 75% aciona o portão D14.
2. **`criar-observabilidade.sh base prod` e `base lab`**, rodados pelo João. Leitura: o readback e
   as saídas do `test-metric-filter`.
3. **Lab.** EC2 `t4g.small`, Ubuntu 24.04 arm64, role `lotus-ec2`, security group `lotus-web`,
   IMDSv2 com hop 2, e o user-data da branch com `AMBIENTE=lab`. Na instância, confere-se:
   - agente e timer ativos, e o log do agente sem `AccessDenied`;
   - as métricas `Lotus/Host` com `Ambiente=lab` no `list-metrics`. As dimensões exatas do disco
     ficam registradas para o alarme;
   - logs de dois contêineres diferentes em `/lotus/lab/containers` (prova do
     `publish_multi_logs`), e a primeira linha de um contêiner que nasceu depois do agente (prova do
     `from_beginning`);
   - a sonda, copiada à mão, roda uma vez, e a linha chega em `/lotus/lab/sonda`;
   - o user-data rodado de novo não muda nada, e o Docker não reinicia (`ActiveEnterTimestamp`
     igual);
   - a RSS do agente (`ps -o rss=`), contra o portão D14 e para a P-80.

   No fim, a instância é terminada e os dois grupos do lab são apagados.

**Depois do merge e do espelho, pela lane de aceitação:**

4. **Reinstalação pelo §7,** com o `sondar-saude.sh`, a partir de uma árvore igual à `main` do
   corporativo. O botão volta a passar na conferência.
5. `(D12)` **O botão promove o SHA do merge,** e `/up` responde 200.
6. **Reparo.** O João copia o `user-data.sh` novo por `scp`, como os artefatos do §7, e o roda como
   root no host vivo. Leitura:
   - o Docker e os contêineres não reiniciaram: o `ActiveEnterTimestamp` do Docker e o `StartedAt`
     dos contêineres são os mesmos de antes;
   - agente e timer ativos;
   - streams de todos os contêineres em `/lotus/prod/containers`, e linhas em `/lotus/prod/sonda`;
   - as métricas `Lotus/Host` com `Ambiente=prod` e as `Lotus/Sonda` publicadas.

   Depois, espera-se pelo menos 10 min, para a sonda acumular `Up` e o envio inicial do
   `from_beginning` sair da janela do 5xx.
7. **`criar-observabilidade.sh alarmes`,** rodado pelo João. Leitura: o readback igual ao §4.4 e,
   10 min depois, os quatro alarmes em `OK`.
8. **Janela de sondas,** fora do horário comercial do Chile:
   - **`/up` e 5xx:** `docker compose stop app` por ~6 min, e `lotus-prod-up` e `lotus-prod-5xx` vão
     a `ALARM`. Depois, `start app` e `/up` 200; se o nginx não reconectar, `restart nginx`. Os dois
     voltam a `OK`;
   - **disco:** `fallocate` de um arquivo em `/` até 82%, por ~12 min, e `lotus-prod-disco` vai a
     `ALARM`. Apagado o arquivo, volta a `OK`;
   - **certificado:** uma execução da sonda com `LOTUS_SONDA_CERT_ARQUIVO` apontando para um
     certificado de teste de 1 dia, gravando no `sonda.log` real. `lotus-prod-certificado` vai a
     `ALARM` e volta a `OK` no período seguinte;
   - cada transição aparece no `describe-alarm-history`, e o João confirma o e-mail de `ALARM` e o
     de `OK` de cada alarme. O assunto e a hora vão para o audit.
9. **Custo.** ~3 dias depois do passo 6, a linha do CloudWatch desta conta no Cost Explorer vai para
   a P-80. A leitura é pelo console, sem custo de API. Um valor perto de US$ 0 diz que o free tier
   da organização cobre.

## 6. Falhas e recuo

**Em operação:**

| Falha | Efeito | Quem avisa |
|---|---|---|
| Agente morre, IAM revogada ou CloudWatch Logs inacessível | o app não sente; as linhas da sonda param de chegar | `lotus-prod-up`, por falta de dado. A descrição manda olhar o agente antes do app |
| Sonda ou timer morrem | o mesmo | `lotus-prod-up` |
| Host morre | o mesmo; não há auto-recover | `lotus-prod-up` |
| Assinatura do SNS some ou volta a `PendingConfirmation` | o alarme dispara para ninguém | só o readback do `alarmes`. Não há detecção contínua (§8) |
| CloudWatch ou SNS fora na região | nenhum aviso | ninguém: limite aceito (§8) |
| Parada planejada (resize, TLS) | o alarme de `/up` dispara | o runbook manda `disable-alarm-actions` antes e `enable-alarm-actions` depois |

**Na instalação:**

- **Passo 2, com a regex e o literal recusados:** vale o portão D14, e o bloco volta ao João. A
  saída seria mudar o formato de log do nginx.
- **Passo 3 fora do esperado** (agente sem publicar, `AccessDenied`, contêiner faltando, RSS acima
  do portão): termina-se o lab, corrige-se na branch e repete-se. Nada tocou a produção.
- **Passo 6 com o Docker ou um contêiner reiniciado:** o `--no-upgrade` falhou. PARE e leia o
  `/var/log/apt/history.log` antes de qualquer outro passo.
- **Recuo do host, sem tocar no app:** `systemctl disable --now amazon-cloudwatch-agent
  lotus-sonda.timer` e `disable-alarm-actions` nos quatro alarmes.
- **Recuo da AWS:** apagar os alarmes, os filtros, os grupos e a inline `lotus-observabilidade`.
  Os ADRs e o runbook ficam, com emenda datada dizendo o que foi revertido.
- **Passo 8 sem `/up` 200** depois do `start app` e do `restart nginx`: `deploy.sh <sha corrente>`
  (runbook §8.1). No disco, o arquivo sai na hora, a qualquer sinal de problema.
- **Alarme falso de `/up` por atraso na primeira semana:** o ajuste de M de N é uma decisão
  registrada no runbook e na P-80, nunca uma mudança silenciosa no script.

## 7. Catracas (lição 19)

| Entregável | Catraca | Sonda que tem de reprovar |
|---|---|---|
| `deploy/aws/user-data.sh` | `frontend/tests/user-data.test.ts`. Exige: `--no-upgrade` em todo `apt-get install`; `AMBIENTE=prod` validado; versão e sha256 fixados e conferidos antes do `dpkg`; a config JSON do heredoc parseando, com `omit_hostname`, `Lotus/Host`, `Ambiente`, `drop_device`, `publish_multi_logs` e `from_beginning`; o timer e o `ConditionPathExists` | um `apt-get install` sem `--no-upgrade`; `publish_multi_logs` removido |
| `deploy/bin/sondar-saude.sh` | `frontend/tests/sondar-saude.test.ts`. Estática: executável, `set -euo pipefail`, sem `aws`, sem `.env`. **Execução**, com servidor HTTP e certificados locais pelos overrides: 200 dá `up` 1; 503 dá `up` 0; sem servidor dá `up` 0 e `http` 0; certificado de 30 dias dá `cert_dias` 29 ou 30; PEM ilegível dá a linha sem `cert_dias` | gravar `cert_dias` 0 na falha; `up` 1 com 503 |
| `deploy/aws/criar-observabilidade.sh` | `frontend/tests/criar-observabilidade.test.ts`. Exige: nomes, métricas, limiares, M de N e falta de dado iguais ao §4.4; `OKActions`; nenhum número de 12 dígitos; `alarmes` recusando sem `Up`, sem a métrica de disco e sem assinatura confirmada; `test-metric-filter` antes do `put-metric-filter`; IAM sem `CreateLogGroup` nem `PutRetentionPolicy`; `Up` e `CertDias` sem default | trocar um limiar ou o tratamento de falta de dado |
| Nomes entre arquivos | catraca cruzada: log groups, namespaces e nomes de métrica iguais no user-data, no script e no runbook §14 | renomear um grupo num arquivo só |
| `docs/adrs.md` | `frontend/tests/repo-docs-refs.test.ts`, no que ele já cobre | já provada |
| `(D12)` `backend/config/database.php` | teste de feature em `backend/tests/Feature/Shared/` | sem a chave, o teste reprova com o valor na mensagem |

Fora a catraca cruzada, o runbook não tem catraca. Nunca teve, e isso fica declarado, como no item
33.

## 8. Limites e riscos declarados

- **Hairpin.** A sonda mede de dentro da AWS. Cobre DNS, EIP, security group e TLS, mas não a rede
  do cliente até o EIP. Sonda externa está fora do bloco (custo, D13).
- **Assinatura do SNS.** Só o readback do `alarmes` a confere. Se ela sumir depois, os alarmes
  disparam para ninguém, sem aviso.
- **O provedor.** CloudWatch ou SNS fora na região não avisam ninguém: são o mesmo provedor do
  resto.
- **Sem auto-recover.** Host morto vira e-mail, não reinício.
- **Agente como root,** porque precisa ler `/var/lib/docker/containers`. A RAM dele entra num host
  de 2 GiB com swap em uso: é medida no lab, sob o portão D14, e registrada na P-80.
- **Atraso do metric filter.** O 3 de 5 absorve 1–2 min de atraso. Atraso maior dá alarme falso de
  `/up` (§6).
- **Deploy lento.** O `app` recriado devolve 502 ao healthcheck até subir. Um deploy que passe de
  ~1 min pode levar o `lotus-prod-5xx` a `ALARM`, com o `OK` no período seguinte.
- **Certificado sem medição.** Se o `openssl` falhar com o `curl` funcionando, o `cert_dias` some,
  e o alarme mantém o último estado sem avisar. O caso comum, TLS quebrado, derruba também o `curl`,
  e o alarme de `/up` acusa.
- **Privacidade.** Saem do host, por 30 dias:
  - o id do ator e o IP, do canal `seguranca`;
  - IP, user agent e URL com query string, do nginx (o `q` das listas pode ser nome ou RUT);
  - as mensagens de erro do Laravel, com bindings se não houver a D12.

  Lê esses logs quem tem `logs:GetLogEvents` ou `logs:FilterLogEvents` na conta. Hoje, é o usuário
  administrativo do João.
- **Stream por contêiner, não por serviço.** O nome do stream traz o ID do contêiner, e o serviço
  se reconhece pelo conteúdo. Rotular no compose está fora, porque o compose não muda.
- **Lab com a role de produção.** A EC2 de lab assume a `lotus-ec2`, com o S3, o SES e o SNS de
  produção, porque é a role que um recreate real usaria. Ela vive minutos, sem app, e é terminada.
- **Janela de sondas.** São ~6 min de `app` parado de verdade e ~12 min com 18% de disco livre,
  fora do horário comercial.
- **Free tier.** A sobra da organização não se lê desta conta. O custo fica nas duas hipóteses até
  a medição (D13).

## 9. Definition of Done — comportamento provado

1. As catracas do §7 verdes, com as sondas vistas reprovar; `pnpm lint`, `pnpm test` e `pnpm build`
   verdes.
2. O readback do `base`:
   - a inline com as ações, os recursos e a condição do §4.3;
   - os grupos com 30 dias em `prod` e 1 dia em `lab`;
   - os três filtros em `prod`, com as saídas do `test-metric-filter`.
3. O lab: tudo o que o §5, passo 3, lista, com a RSS dentro do portão e a instância terminada.
4. A produção:
   - o botão passando depois do §7;
   - o reparo sem reiniciar o Docker nem contêiner;
   - agente e timer ativos;
   - streams de todos os contêineres e da sonda;
   - as métricas dos dois namespaces.
5. Os quatro alarmes com o readback igual ao §4.4, ≥ 1 assinatura confirmada e os quatro em `OK`
   10 min depois.
6. Cada alarme visto em `ALARM` e de volta a `OK` no `describe-alarm-history`, e os dois e-mails de
   cada um recebidos pelo João.
7. `producao GET /up -> 200` ao fim da janela.
8. O runbook com a §14 e as emendas do §4.5; o ADR-14 e o ADR-21 emendados; a P-80 com a
   estimativa, a RSS e o custo medido.
9. O `audit.md` com cada leitura, nas regras do §5.
10. `(D12)` O teste do §4.8 verde, com a sonda vista reprovar, a suíte PHP inteira verde, o Pint
    limpo e o SHA do merge em produção.

## 10. Handoff

`executor: claude`. O bloco mexe em IAM, no user-data do host vivo e em decisões de operação; o
plano confirma isso no `## Handoff de execução`.

- **Quem faz o quê:** a Fase A é da sessão, pelo `/executar-bloco`. A revisão é o `/revisar-bloco`,
  e os riscos dela são a policy IAM, um script que roda como root no host de produção e um agente
  root. O `/finalizar-bloco` abre a PR.
- **A PR de docs desta branch** traz a ficha 34 com o `Depende: 32` (`0ca0c58b`). Ela mescla antes,
  e a branch segue com o bloco. Leva só os commits até `0ca0c58b`; os da spec em diante vão na PR
  do bloco.
- **A PR do bloco** mescla com o `estado.md` em `blocked`, aguardando aceitação (invariante 11),
  porque os itens 3 a 7 da `## Verificação externa` só existem depois do merge e do espelho.
  - Os passos 1 a 3 do §5 acontecem na execução, antes da PR, e entram no `audit.md`.
  - A lane do bloco tira a linha da ficha 34 da `# Ordem de execução` e escreve a do bloco em
    `## Aguardando aceitação` (invariante 10).
- **A lane de aceitação** roda os passos 4 a 9, grava as provas e o `closed`, e remove a ficha 34 e
  a linha de `## Aguardando aceitação`.
  - `(D12)` Remove também o D-74, como pago.
  - Sem a D12, o D-74 fica como está, porque nenhuma lane edita ficha alheia (invariante 10).
    Reescrever o gatilho dele é uma PR de docs do João.

## Verificação externa

Os itens 1 e 2 acontecem na execução, antes da PR (§5, passos 1 a 3). A leitura deles fica no
`audit.md` e vai ao corpo do `estado.md` no fechamento.

Os itens 3 a 7 só existem depois do merge e do espelho. Vão no `blocker` do aguardando aceitação e
voltam na PR de docs da aceitação (§10). O procedimento é o runbook §14.

1. Recursos base: a inline `lotus-observabilidade`, os log groups de `prod` com 30 dias e os de
   `lab` com 1 dia, e os três metric filters de `prod` validados por `test-metric-filter` (§5,
   passo 2).
   - prova: nenhuma
2. Lab nascido do user-data: agente publicando as métricas e os logs de dois contêineres,
   reexecução sem mudança e sem reiniciar o Docker, RSS medida e instância terminada (§5, passo 3).
   - prova: nenhuma
3. Produção instalada: reinstalação pelo §7 com a sonda e o botão passando, `(D12)` o SHA do merge
   promovido, reparo sem reiniciar contêiner, agente e timer ativos, e alarmes criados com
   assinatura confirmada (§5, passos 4 a 7).
   - prova: `producao GET /up -> 200`
4. `lotus-prod-up` e `lotus-prod-5xx` vão a `ALARM` com o `app` parado e voltam a `OK`, com os
   e-mails das duas transições (§5, passo 8).
   - prova: `producao GET /up -> 200`
5. `lotus-prod-disco` vai a `ALARM` a 82% e volta a `OK`, com os e-mails (§5, passo 8).
   - prova: nenhuma
6. `lotus-prod-certificado` vai a `ALARM` com o certificado de teste e volta a `OK`, com os e-mails
   (§5, passo 8).
   - prova: nenhuma
7. Custo do CloudWatch desta conta medido no Cost Explorer ~3 dias depois da instalação e
   registrado na P-80 (§5, passo 9).
   - prova: nenhuma
