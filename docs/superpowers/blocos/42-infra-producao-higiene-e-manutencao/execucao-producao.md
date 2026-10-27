# Bloco 42 — execução em produção

## Host

### Medição antes

2026-10-27, por volta de 18:30 UTC. O João rodou o comando do Step 1 da Task 9 (só leitura) e colou
a saída.

- `CURRENT_SHA`: `61dde89ddc6ac5bc7dff33c2d3d7e2b41f4ec07d`, promovido em 2026-10-25T17:49:04Z.
- Anterior que a poda guarda: `e28fdc52e1c6a172b9c73f3a5dbdedf40c9be66c`. É o último `fim` ok de
  outro SHA no ledger (2026-10-24T17:14:12Z). O `fim` com falha das 17:09:52Z, do mesmo SHA, não
  conta.
- SHAs por repositório: `lotus-app` 14, `lotus-web` 13, `lotus-clamav` 13. O `683e6221` só existe
  no `lotus-app`. Saem 12 + 11 + 11 = 34 imagens.
- Volume dangling: `901f0f780df7510476a0449772f3ec9605353c322a7fc1cd8b2b7df5c99e04cf`.
- Contêineres: seis, todos `Up`. `app`, `scheduler`, `nginx` e `clamav` rodam o `61dde89d`. Nenhum
  contêiner parado.
- Disco: 88% (17G de 19G, 2,3G livres). `lotus-prod-disco` em `ALARM`. `lotus-prod-up`,
  `lotus-prod-5xx` e `lotus-prod-certificado` em `OK`. Os quatro com ações ligadas.
- Kernel `7.0.0-1012-aws`, com `/var/run/reboot-required` presente. 40 pacotes pendentes no apt,
  entre eles `docker-ce` 29.8.0 → 29.9.2 e `containerd.io` 2.3.4 → 2.4.2.
- Fuso `Etc/UTC`. Journal em 198,9M. Cache do apt em 117M.
- `/opt/lotus/prova-certificado.php` presente (8929 bytes, `ubuntu:ubuntu`, 2026-09-10).

O que mudou desde a medição de 2026-10-25 (`docs/superpowers/audits/2026-10-25-saude-infra.md`):
- A promoção do `61dde89d` (2026-10-25T17:48Z) entrou depois dela.
- O SHA atual passou de `e28fdc52` para `61dde89d`.
- O alvo de rollback passou de `abd73766` para `e28fdc52`, e o `abd73766` agora sai.
- O disco foi de 87% para 88%.

### Limpeza única

2026-10-27, por volta de 18:35 UTC. O João rodou no host a poda, com o `podar-imagens.sh` da lane
em `/tmp` e o cadeado do deploy
(`sudo flock -n /opt/lotus/.deploy.lock sh -c 'bash /tmp/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'`).
Depois rodou o `docker ps -a --filter volume=…` (vazio), o `docker volume rm` do
`901f0f780df7510476a0449772f3ec9605353c322a7fc1cd8b2b7df5c99e04cf` e o `rm` de
`/opt/lotus/prova-certificado.php` e `/tmp/podar-imagens.sh`. A saída da poda não foi colada, e o
estado final é a prova.

Conferido por Claude, por SSH, às 18:36 UTC:
- Imagens: só `61dde89d` e `e28fdc52` em cada um dos três repositórios do Lotus, mais
  `gotenberg/gotenberg:8` e `mysql:8.0`. As 34 previstas saíram.
- `docker volume ls -qf dangling=true`: vazio. Dois volumes locais, os dois em uso.
- `prova-certificado.php` e `/tmp/podar-imagens.sh`: ausentes.
- Disco: de 88% para 57% (11G de 19G, 8,1G livres).
- `docker system df`: 8 imagens, 4,221GB. Os 163,9MB recuperáveis são as imagens do `e28fdc52`,
  o alvo de rollback, que não está em uso.
- `lotus-prod-disco`: ainda em `ALARM` às 18:36 UTC. Precisa de dois períodos de 5 minutos abaixo
  de 80%.

### journald e apt

2026-10-27, por volta de 18:37 UTC. O João rodou no host os seis comandos do Step 3 da Task 9: o
`lotus.conf` do journald, o restart do `systemd-journald`, o `journalctl --vacuum-size=200M`, o
`52lotus-limpeza` e o `apt-get clean`. O vacuum soltou 0B: o journal já estava abaixo do teto.

Conferido por Claude, por SSH, às 18:37 UTC:
- `journalctl --disk-usage`: 198,9M, abaixo do teto de 200M.
- `apt-config dump | grep AutocleanInterval`: `APT::Periodic::AutocleanInterval "7";`. Antes era
  `"0"`.
- `/var/cache/apt`: de 117M para 12K.
- `/etc/systemd/journald.conf.d/lotus.conf` e `/etc/apt/apt.conf.d/52lotus-limpeza`, lidos com
  `sudo cat`: iguais aos trechos do `deploy/aws/user-data.sh`.
- Disco em 56%.

### Janela manual

2026-10-27, das 18:41 às 18:45 UTC (15:41 a 15:45 em Santiago), em horário comercial, por decisão
do João.

Antes, às 18:40 UTC: kernel `7.0.0-1012-aws`, 37 dias ligado, `/var/run/reboot-required` presente
por causa do `linux-image-7.0.0-1013-aws` e do `linux-image-7.0.0-1014-aws`. Os 40 pacotes
pendentes eram os da medição.

Passos:
- O João desligou as ações do `lotus-prod-up` e do `lotus-prod-5xx` (§14.7).
- No host, rodou `sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get clean`. O
  `needrestart` reiniciou os serviços do sistema e avisou do kernel pendente.
- O `apt list --upgradable` saiu vazio: nada ficou retido.
- Rodou `sudo reboot`.

A sonda (`curl` no `/up` a cada 5 s, rodando no WSL) registrou duas quedas:
- **Upgrade do `docker-ce`:** 18:42:24 a 18:42:42, cerca de 20 s, com `000` e um `502`.
- **Reboot:** 18:43:57 a 18:44:26, cerca de 30 s, com `000` e um `502`.

Somadas, menos de 1 minuto fora, bem abaixo dos 3 minutos da parada.

Conferido por Claude, por SSH, às 18:44 e 18:45 UTC:
- Kernel `7.0.0-1014-aws`.
- `/var/run/reboot-required` ausente.
- `apt list --upgradable` vazio.
- Docker 29.9.2.
- Os seis contêineres em `Up`: `app`, `scheduler`, `mysql`, `nginx`, `gotenberg` e `clamav`. Os
  cinco com healthcheck estão `healthy`.
- O log do MySQL não tem nenhuma linha de `crash recovery` nem de `not shut down normally`. No
  reboot, o MySQL recebeu o `SHUTDOWN` às 18:43:53, terminou com `Shutdown complete` às 18:43:58 e
  voltou com `ready for connections` às 18:44:23.
- Disco em 56%.

Alarmes:
- O histórico do CloudWatch mostra as ações do `lotus-prod-up` e do `lotus-prod-5xx` desligadas às
  18:41:13 UTC e religadas às 18:47:40 UTC.
- Às 18:48 UTC, os quatro alarmes estavam em `OK` com `ActionsEnabled` `True`.
- O `lotus-prod-disco` saiu de `ALARM` para `OK` às 18:40:48 UTC, fechando o item da limpeza única.

### Reboot automático

2026-10-27, às 18:48 UTC, depois da janela. O João gravou no host o
`/etc/apt/apt.conf.d/53lotus-reboot` com o `printf` do Step 5.

Conferido por Claude, por SSH, às 18:48 UTC:
- `apt-config dump | grep -i Automatic-Reboot`:
  - `Unattended-Upgrade::Automatic-Reboot "true";`
  - `Unattended-Upgrade::Automatic-Reboot-Time "08:30";`
- O arquivo, lido com `sudo cat`, é igual ao trecho do `deploy/aws/user-data.sh`.
- `apt-config dump | grep -i WithUsers` sai vazio. Vale o default do `unattended-upgrades`, que é
  `true`: o reboot acontece mesmo com sessão aberta, que é o desejado.
- `timedatectl`: `Time zone: Etc/UTC (UTC, +0000)`. As 08:30 UTC são 05:30 em Santiago no horário
  de verão.
- `/var/run/reboot-required` está ausente, porque o reboot da janela o consumiu.
  `/run/systemd/shutdown/scheduled` também está ausente. Nada fica agendado agora (spec §7).

## S3

### Lifecycle

2026-10-27, por volta de 18:55 UTC.

Antes, lido por Claude:
- O versionamento estava `Enabled`.
- O lifecycle só tinha a regra `expira-backups`, idêntica à do `deploy/aws/s3-lifecycle.json`.
- O `put` só acrescenta as regras `fotos` e `documentos`. A retenção dos backups não muda.

O João rodou da raiz da lane:
`aws s3api put-bucket-lifecycle-configuration --bucket lotus-prod-760144413534 --lifecycle-configuration file://deploy/aws/s3-lifecycle.json --profile lotus`.
A CLI respondeu `{"TransitionDefaultMinimumObjectSize": "all_storage_classes_128K"}`, o eco normal
da versão nova da AWS CLI.

Conferido por Claude com `get-bucket-lifecycle-configuration`:
- Saem as três regras: `expira-backups`, `fotos` e `documentos`.
- Comparadas pelo `ID` com o JSON versionado, as três são iguais. O filtro vazio da `documentos`
  voltou como `{}`.
- A única chave a mais é a `TransitionDefaultMinimumObjectSize`, uma normalização da AWS.

### Login da raiz

Não houve login da raiz. O João entra na AWS só como usuário IAM e não tem as credenciais da raiz
da conta `760144413534`. Por decisão do João, em 2026-10-27, a saída de emergência da política
passou a ser o IAM. Ela foi provada antes do Step 3 por Claude, com o simulador e só leitura:

- **O `lotus-infra` desfaz a política.** O `simulate-principal-policy` contra o
  `deploy/aws/s3-politica.json` local, ainda não aplicado, dá `allowed` em `s3:PutBucketPolicy`,
  `s3:DeleteBucketPolicy` e `s3:GetBucketPolicy`.
- **Se a chave do `lotus-infra` se perder.** O `JoaoVBA`, que tem login no console e está no grupo
  `administrador2`, recebe `allowed` em `iam:CreateAccessKey` e `iam:ListAccessKeys` sobre o
  `user/lotus-infra`. O `lotus-infra` tem uma chave ativa, de 2026-09-04, e o limite é duas, então
  cabe uma nova. O caminho é console → IAM → `lotus-infra` → criar chave →
  `aws s3api delete-bucket-policy --bucket lotus-prod-760144413534`.
- **Se o usuário `lotus-infra` for apagado.** A política compara o `aws:PrincipalArn` como texto.
  Recriar o usuário com o mesmo nome devolve o acesso.
- **O que fica sem saída.** Ficar trancado fora exigiria perder também todo acesso de
  administrador ao IAM. Nesse caso, a raiz já seria necessária com ou sem a política.

À parte, o `JoaoVBA` está sem MFA, e ele é agora a saída de emergência. O MFA dele fica como
recomendação.

### Política

2026-10-27, por volta de 19:05 UTC. Antes de aplicar, o `aws sts get-caller-identity --profile lotus`
deu `arn:aws:iam::760144413534:user/lotus-infra`, e o bucket não tinha política
(`NoSuchBucketPolicy`).

O João rodou da raiz da lane:
`aws s3api put-bucket-policy --bucket lotus-prod-760144413534 --policy file://deploy/aws/s3-politica.json --profile lotus`.
O comando não imprimiu nada. Em seguida, abriu documentos no app pela URL pré-assinada, e eles
abriram.

Claude leu a política de volta com `get-bucket-policy` e comparou como JSON com o
`deploy/aws/s3-politica.json`: `igual`.

### Negações

**Simulador.** Rodado por Claude com o `simulate-principal-policy`, contra o JSON versionado, com
`aws:SecureTransport=true` e o `aws:PrincipalArn` de cada principal. Nenhum dos três ARNs de role tem
caminho (`get-role`). As 18 células batem com a tabela do plano.

| Principal | DeleteObject | DeleteObjectVersion | PutBucketPolicy |
|---|---|---|---|
| `user/gabriel` | explicitDeny | explicitDeny | explicitDeny |
| `user/JoaoVBA` | explicitDeny | explicitDeny | explicitDeny |
| `role/OrganizationAccountAccessRole` | explicitDeny | explicitDeny | explicitDeny |
| `role/administrador` | explicitDeny | explicitDeny | explicitDeny |
| `role/lotus-ec2` | allowed | explicitDeny | explicitDeny |
| `user/lotus-infra` | allowed | explicitDeny | allowed |

**Chamada real.** O João, como `lotus-infra`, subiu o `probes/bloco42-teste.txt` (versão
`5M81xKWGAHNjm5gm2sJJN9BTle.AZ2xA`) e tentou apagar essa versão com
`delete-object --version-id`. Resposta:
`An error occurred (AccessDenied) when calling the DeleteObject operation: User: arn:aws:iam::760144413534:user/lotus-infra is not authorized to perform: s3:DeleteObjectVersion on resource: "arn:aws:s3:::lotus-prod-760144413534/probes/bloco42-teste.txt" with an explicit deny in a resource-based policy`.
Claude conferiu em seguida, às 19:04 UTC: a versão continua lá, como `IsLatest`, sem marca de
exclusão por cima.

### Órfãos

**A lista.** Calculada por Claude às 19:04 UTC, só com leitura:
- Chaves atuais do S3 (`list-objects-v2`), sem `backups/` e sem `probes/`: 29.
- Caminhos do banco (`SELECT path FROM files UNION SELECT photo_path FROM users WHERE photo_path IS NOT NULL`),
  lidos por SSH no contêiner do MySQL, com todas as linhas, arquivadas inclusive: 17.
  - Hoje eram 11. A diferença é a carga do bloco 38.
  - Todos os 17 existem no S3.
- `comm -23`: 12 órfãos. São os mesmos 12 da medição, nas mesmas categorias.
- Nenhum órfão divide prefixo de entidade com um caminho do banco.
- O mais novo é de 2026-10-24.

| LastModified (UTC) | Bytes | Chave |
|---|---|---|
| 2026-09-30T22:41:46 | 2222195 | `budget/2/3lffuel60mKnHI9usZMdUuUtsmutkQrh20kXYiuf.pdf` |
| 2026-09-30T22:40:05 | 655027 | `quote/2/94I32lPOlaDJA2ny8ZCwRQGPM2Luo3ifEXskyibc.pdf` |
| 2026-09-30T22:40:50 | 74931 | `quote/2/MyFoVJpF6quor5o6dHPszrQM6fidevXCvcSnKBGO.pdf` |
| 2026-09-30T22:55:37 | 3431994 | `quote/2/epYHfbh3BHLdX2l9kbGbH2SdmUm0kEYgiyYmBJkH.pdf` |
| 2026-09-30T22:56:52 | 3431994 | `quote/2/q3rqWP0SvXKvY2d7zJiVmuAJlneYi98p80kpHB4g.pdf` |
| 2026-10-24T16:59:23 | 842813 | `turma/1/M3nkFvOQuKubVEhCddDGJIT2UtuF2nMyuu7BNAnI.pdf` |
| 2026-10-24T16:59:06 | 451151 | `turma/1/T4yRbHphBvhvUZJXKSQeP3M8X46iBYLE9MA7Ztjk.pdf` |
| 2026-10-24T16:59:20 | 842813 | `turma/1/qIW0vYKjylXtxFNCnpQtw4jslnitGwnR4flxEw8g.pdf` |
| 2026-10-17T16:14:18 | 76083 | `turma/2/4zjtlY0vIffaIZ0PTPKD9BVFEDXIygWGp07KZ1Ot.pdf` |
| 2026-10-17T16:14:26 | 76083 | `turma/2/8gFQ5RoPbTsXRbqSi8wVMPplWujgNdKy38wKhupl.pdf` |
| 2026-10-17T16:14:22 | 76083 | `turma/2/SatFiUaAIirtjszR31Ax5jg9g6wmD5sAzCIvAMp0.pdf` |
| 2026-09-09T21:49:42 | 1877301 | `user-photos/4/H8owXWk5tBTzhiuZvOFv85fueUygzmjnx2WCRWD3.png` |

**A remoção.** O João aprovou a lista e rodou um `aws s3 rm "s3://lotus-prod-760144413534/<chave>"`
por chave, nas 12 chaves acima, entre 19:04 e 19:08 UTC. A remoção foi em horário comercial, por
decisão dele. O risco de pegar um upload no meio era nulo: todos os órfãos ficam em prefixos de
entidades que já não existem.

**A conferência.** Claude recalculou às 19:08 UTC, relendo o S3 e o banco:
- 17 chaves atuais no S3, sem contar `backups/` e `probes/`, e 17 caminhos no banco.
- Chaves no S3 sem caminho no banco: 0. A lista de órfãos saiu vazia.
- Caminhos do banco sem chave no S3: 0. Nenhum arquivo em uso saiu.
- Os 12 órfãos têm uma marca de exclusão como versão atual. Dá para desfazer pelo §3.1: 7 dias, ou 1
  dia para a foto.

### Desfazer

2026-10-27, às 19:07 UTC. O João rodou o §3.1 do runbook no `probes/bloco42-teste.txt`:
- `aws s3 rm`: o comando respondeu `delete: s3://lotus-prod-760144413534/probes/bloco42-teste.txt`.
- `head-object`: `An error occurred (404) when calling the HeadObject operation: Not Found`, porque
  a marca de exclusão estava por cima.
- `copy-object` com `versionId=5M81xKWGAHNjm5gm2sJJN9BTle.AZ2xA`: virou a versão nova
  `jO2yIhtlE8W4NPG1mN0Yt1x2AGcxz7CF`.
- `aws s3 cp … -`: devolveu `bloco 42 2026-10-27T19:02:40Z`, o mesmo texto do
  `/tmp/bloco42-teste.txt`.
- `aws s3 rm` final: o objeto de teste fica para o lifecycle.
- `rm /tmp/bloco42-teste.txt`.

Lido por Claude às 19:08 UTC:
- Duas versões não atuais: `jO2y…` e `5M81…`.
- Duas marcas de exclusão, a atual por cima.
- A regra `documentos` expira o que sobrou em 7 dias.

### Leitura de volta

2026-10-27, às 19:08 UTC, por Claude:
- **Política.** O `get-bucket-policy`, comparado como JSON com o `deploy/aws/s3-politica.json`, deu
  `igual`.
- **Lifecycle.** O `get-bucket-lifecycle-configuration`, comparado pelo `ID` com o
  `deploy/aws/s3-lifecycle.json`, deu as três regras iguais. O filtro vazio da `documentos` voltou
  como `{}`. A única chave a mais é a `TransitionDefaultMinimumObjectSize`, uma normalização da AWS.
- **Fica para um ou dois dias depois.** Rodar
  `list-object-versions --prefix user-photos/4/` e confirmar que o lifecycle expirou a versão da
  foto órfã apesar do `Deny` em `s3:DeleteObjectVersion`. Isso só a produção prova.
