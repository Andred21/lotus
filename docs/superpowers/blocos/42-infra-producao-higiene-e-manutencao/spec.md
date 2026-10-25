# Bloco 42 — Higiene e manutenção da produção

> Spec aprovada pelo João em 2026-10-25. Ficha: `docs/superpowers/backlog.md` §42. Insumo e linha de base:
> `docs/superpowers/audits/2026-10-25-saude-infra.md`. Onde está marcado **(Claude)**, a decisão
> foi de Claude e o João pode vetar ao ler; o resto é decisão do João nesta sessão.

## 1. Intenção

A produção acumula lixo que ninguém recolhe, e o que devia acontecer sozinho tem lacunas. O disco
está em 87% de 19 GB, com o alarme `lotus-prod-disco` em ALARM desde 2026-10-24, porque cada
promoção deixa três imagens no host e o deploy nunca apaga as velhas. O runbook deixa volume com
cópia do banco. O kernel novo espera reboot desde a instalação. Versões antigas de documento e de
foto ficam no S3 para sempre, e qualquer admin da conta apaga documento de vez. O backup de
2026-10-07 falhou por uma falha passageira do IMDS e ninguém soube.

O João quer que backup, poda, renovação de certificado e kernel aconteçam sozinhos, e que
atualização de versão, custo, segurança e saúde geral passem pela mão dele. Este bloco limpa o que
existe, fecha as lacunas do automático que são de higiene e deixa a manutenção manual com runbook.
Observabilidade centralizada, segurança da conta, custo e resiliência viram fichas próprias depois
(§3).

O bloco tem peso legal no S3: documento apagado precisa poder voltar, e só quem o João autorizou
apaga.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Entrada da ficha | Pela PR da própria lane, sem PR de docs separada (desvio da invariante 10, registrado no `## Fluxo` do backlog) |
| Disco agora | A limpeza única acontece durante a execução, antes do merge |
| Kernel | Reboot automático depois de atualização de segurança, numa janela fixa |
| Atualizações de versão | Manuais. O bloco faz a primeira rodada numa janela; depois a decisão é do João |
| Desfazer no S3 | Todo apagar de documento pode ser desfeito por **7 dias** |
| Quem apaga no S3 | Só o app (`lotus-ec2`), o `lotus-infra` e o lifecycle, com boas práticas de segurança |
| MFA do `lotus-infra` no bucket | Não exigido **por enquanto**. O `lotus-infra` apaga e mexe na proteção também pelo CLI |
| Saída de emergência da política | A raiz da conta `760144413534` é do João e funciona. O login dela é confirmado antes de aplicar a política |
| pnpm no portão | O `lane.sh abrir` passa a conferir o `pnpm` antes do `PORTAO OK` |
| Fotos no S3 | Versão antiga expira em 1 dia, o mínimo do S3. A spec J-02 já decidiu "delete imediato, sem retenção" **(Claude)** |
| Teto do journal | 200 MB **(Claude)** |
| Cache do apt | Limpeza semanal **(Claude)** |
| Janela do reboot automático | 08:30 UTC: 05:30 em Santiago no horário de verão, 04:30 no de inverno. Fica depois do backup (06:10 UTC), da conferência (06:40 UTC), das podas do banco (03:10 e 03:40 em Santiago) e do `apt-daily-upgrade` **(Claude)** |
| Retry do backup | Três tentativas de upload com espera crescente, mais o IMDS com mais tempo e mais tentativas **(Claude)** |
| Limiar do `verificar-backup.sh` | Fica em 2 dias. É decisão registrada no script ("uma noite falhada é soluço, duas é padrão"), e o retry absorve a falha passageira **(Claude)** |
| IMDS no `verificar-backup.sh` | Recebe a mesma folga de IMDS do `backup-db.sh`. Consulta que falha deixa de ser lida como "nenhum backup" **(Claude)** |
| Onde mora a poda | Num script próprio, `deploy/bin/podar-imagens.sh`, chamado pelo `deploy.sh` e provado por execução (lição 19 do `docs/README.md`) **(Claude)** |
| Ordem na produção | A janela manual (pacotes e reboot) vem antes de ligar o reboot automático. Assim, o primeiro reboot é assistido **(Claude)** |
| Registro das decisões | Emenda no ADR-11 (política e retenção do S3) e no ADR-14 (reboot automático e poda no deploy). Runbook repetível da manutenção manual no README **(Claude)** |

## 3. Não-objetivos

- **Painel central de observabilidade e relatório de saúde periódico.** O João quer centralizar a
  observabilidade para interpretar e prevenir risco. Isso inclui avisar quando há atualização de
  versão pendente, que hoje acumula calada (40 pacotes). Vira ficha própria, construída sobre o
  item 34.
- **Segurança da conta:** detecção de tentativa de invasão, MFA dos IAM `gabriel` e `JoaoVBA`, SG
  do Komit com a porta 22 aberta, access key de longa duração do `lotus-infra`, MFA do `lotus-infra`
  nas ações do bucket. Ficha própria.
- **Custo:** orçamento filtrado só do Lotus (o `lotus-prod-teto` é sem filtro, e o Komit o estoura).
- **Resiliência:** espelho, failover e elasticidade. Esbarra no ADR-14 (EC2 única) e na decisão do
  `RNF-DIS-02` (RTO de minutos via redeploy e restore). Decisão de arquitetura, com proporção para
  cerca de 10 usuários.
- **Arquivar antes da poda do banco.** `PodarAuditoria` e `PodarLogins` apagam de vez por decisão da
  spec de retenção. Mudar isso é mudar aquela spec.
- Memória e swap do ClamAV, aumentar o EBS, backup de host ou AMI.

## 4. Poda de imagens no deploy

O `deploy/bin/deploy.sh` passa a apagar, depois de uma promoção aprovada, as imagens
`ghcr.io/gatika-cl/lotus-app`, `lotus-web` e `lotus-clamav` que não sejam de dois SHAs: o que acabou
de ser promovido e o anterior, que é o alvo de rollback.

- **Quando:** depois de o `CURRENT_SHA` gravar o SHA novo (hoje, o `mv -f` antes do `DEPLOY OK`).
  Antes disso, a promoção ainda pode falhar, e a imagem antiga é a rede.
- **Qual é o anterior:** o último SHA distinto do atual que rodou em produção. Quando o mesmo SHA é
  promovido de novo, o `CURRENT_SHA` lido antes da promoção é igual ao novo, e usá-lo apagaria o
  alvo de rollback. O ledger `releases.jsonl` (§8.2 do README) guarda o histórico. Como derivar o
  anterior é escolha do builder, desde que este caso esteja coberto.
- **Nunca** usar `-f` no `docker image rm`. Imagem em uso por contêiner não sai, e é isso que se quer.
- **Falha da poda não derruba a promoção.** A poda avisa no stderr e a promoção continua OK. O
  ledger registra a promoção como sucesso.
- `gotenberg:8`, `mysql:8.0` e qualquer imagem fora dos três repositórios do Lotus ficam intocados.
  Imagem órfã sem tag (dangling) pode sair junto.
- A saída do deploy lista cada imagem removida.
- **Pelo GHCR, nada se perde:** o CI nunca apaga versão, e rollback para qualquer SHA volta com
  `docker pull`.
- **Onde mora (Claude):** num script próprio, `deploy/bin/podar-imagens.sh`, que o `deploy.sh` chama
  depois do `CURRENT_SHA`, com falha virando aviso. Mora fora do `deploy.sh` para poder rodar em
  teste: o `deploy.sh` tem `BASE=/opt/lotus` fixo e não aceita `set +e`. O script novo entra na
  lista de `scp` e `mv` da §7 do README e na reinstalação do §12.

## 5. Limpeza única e Q-1

**Limpeza única, no host, antes do merge.** O João roda e Claude confere por SSH só leitura:

- remover as imagens dos três repositórios do Lotus fora do SHA em uso e do anterior. A lista sai na
  hora, de `docker image ls` contra o `CURRENT_SHA` e o ledger; a medição de 2026-10-25 achou 12
  SHAs sobrando, mantendo `e28fdc52` (em uso) e `abd73766` (rollback);
- remover o volume anônimo `901f0f78…` (216 MB, datadir do MySQL descartável `lotus-golive-prova`,
  com uma cópia do banco), depois de confirmar que nenhum contêiner o usa;
- remover `/opt/lotus/prova-certificado.php`, script obsoleto do provisionamento.

**Q-1.** Todo `docker rm -f` de contêiner descartável no `deploy/aws/README.md` passa a `-fv`, para
levar junto o volume anônimo. Hoje são três: `:533` (§9), `:1433` e `:1465` (§15). O builder confere
o arquivo inteiro e não só essas linhas.

## 6. journald e apt

Versionados no `deploy/aws/user-data.sh`, que já é reexecutável no host vivo (`--no-upgrade` em todo
`apt-get install`, item 34, D8), e aplicados no host atual na execução:

- journald com `SystemMaxUse=200M`, num drop-in em `/etc/systemd/journald.conf.d/`, mais um
  `journalctl --vacuum-size` na aplicação;
- apt com limpeza periódica semanal do cache (`APT::Periodic::AutocleanInterval`), mais um
  `apt-get clean` na aplicação.

## 7. Kernel, reboot e pacotes

**Reboot automático.** O `unattended-upgrades` continua aplicando só a origem de segurança
(`noble-security`). O repositório do Docker continua fora: o upgrade do Docker reinicia o daemon e
derruba os contêineres. Passa a valer `Unattended-Upgrade::Automatic-Reboot "true"`, com
`Automatic-Reboot-Time` às 08:30 UTC. O horário é local do host: o builder confere o fuso
(`timedatectl`) e ajusta se não for UTC. Isso fica versionado no `user-data.sh` e é aplicado no host
atual.

O `lotus-prod-up` só dispara com 3 minutos sem resposta em 5. Um reboot normal deve passar sem
alarme. A janela manual abaixo mede isso, e o resultado vai para a execução.

O reboot automático só é ligado **depois** da janela manual **(Claude)**. O `/var/run/reboot-required`
já existe, e o `unattended-upgrades` pode agendar o reboot assim que vir esse arquivo. Ligar antes
deixaria o primeiro reboot sem assistência, com os alarmes ligados e o MySQL ainda sem a prova de
parada limpa (§13). O builder confere no host como o `unattended-upgrades` trata o arquivo que já
existe.

**Janela manual, uma vez, antes do merge.** O João roda, com as ações dos alarmes desligadas pela
§14.7 do README:

- os pacotes fora de segurança pendentes (40 na medição), com `docker-ce`, `containerd.io` e
  `docker-compose-plugin`;
- o reboot pendente: o kernel `7.0.0-1012-aws` roda, e o `1014` já está instalado.

Prova: `uname -r` no kernel novo, os seis contêineres de pé, `/up` 200, alarmes religados, tempo
fora do ar medido.

**Manutenção manual repetível (Claude).** A janela vira uma seção do README que o João repete
quando decidir aplicar atualização de versão: listar o pendente, desligar as ações dos alarmes,
aplicar, reiniciar se preciso, conferir e religar. Avisar que há pendência é do painel central (§3).

## 8. S3

### 8.1 Política do bucket

Hoje o bucket `lotus-prod-760144413534` não tem política nenhuma (medido em 2026-10-25). A role do
app, `lotus-ec2`, tem `GetObject`, `PutObject`, `DeleteObject` e `ListBucket`, sem
`DeleteObjectVersion`. Quem mais alcança o bucket por ser admin: os usuários `gabriel`, `JoaoVBA` e
`lotus-infra`, e as roles `OrganizationAccountAccessRole` e `administrador`, assumidas pela conta-mãe
`312977845331`. A política nova tem quatro regras, todas `Deny`:

1. **Só HTTPS:** nega `s3:*` no bucket e nos objetos quando `aws:SecureTransport` é `false`.
2. **Ninguém apaga de vez:** nega `s3:DeleteObjectVersion` a todos. Quem apaga de vez é só o
   lifecycle, que não passa por política de bucket. Todo apagar vira marca de exclusão e pode ser
   desfeito pelo prazo do §8.2.
3. **Apagar com desfazer:** nega `s3:DeleteObject` a todo principal fora de
   `arn:aws:iam::760144413534:role/lotus-ec2` e `arn:aws:iam::760144413534:user/lotus-infra`, por
   `aws:PrincipalArn`.
4. **Mexer na proteção:** nega, a todo principal fora do `lotus-infra`, `s3:PutBucketPolicy`,
   `s3:DeleteBucketPolicy`, `s3:PutBucketVersioning`, `s3:PutLifecycleConfiguration`,
   `s3:PutBucketPublicAccessBlock`, `s3:PutEncryptionConfiguration`,
   `s3:PutBucketOwnershipControls` e `s3:DeleteBucket`. O builder pode acrescentar ações de
   governança do bucket a esta regra, e não pode tirar.

Saída de emergência: a raiz da conta sempre consegue apagar a política de um bucket, mesmo quando
ela a nega. A raiz de `760144413534` é do João e funciona, e o login dela é confirmado antes de
aplicar a política (§8.3). Essa saída vai escrita no runbook.

O app não muda de comportamento: as três ações dele continuam permitidas.

### 8.2 Lifecycle

| Prefixo | Atual | Versão antiga | Outras |
|---|---|---|---|
| `backups/` | expira em 30 dias (sem mudança) | 7 dias (sem mudança) | multipart incompleto em 7 dias (sem mudança) |
| `user-photos/` | — | 1 dia | limpar marca de exclusão que sobrar sozinha |
| todo o resto (documentos) | — | **7 dias** | limpar marca de exclusão que sobrar sozinha; multipart incompleto em 7 dias |

"Todo o resto" é qualquer chave fora de `backups/` e `user-photos/`, inclusive prefixo que o app
venha a criar. O builder escolhe entre dois caminhos:
- uma regra geral sobreposta às de prefixo, confirmando na documentação da AWS que a sobreposição
  resolve `user-photos/` pelo prazo menor;
- regras por prefixo, com uma catraca que liste os prefixos que o app grava.

As versões antigas que já existem fora de `backups/` expiram pelas regras novas. Na medição eram 7:
1 em `probes/`, 1 em `redator/`, 3 em `turma/` e 2 em `user-photos/`.

### 8.3 Ordem de aplicação

O João aplica com o perfil `lotus` (`lotus-infra`), na ordem:
1. lifecycle;
2. login na raiz confirmado, no console e com MFA: é a saída de emergência da política;
3. política;
4. prova das negações;
5. órfãos;
6. prova do desfazer;
7. leitura de volta (`get-bucket-policy`, `get-bucket-lifecycle-configuration`).

A política e o lifecycle ficam versionados no repositório, em arquivo JSON ou num bloco da §3 do
README, com catraca textual. A escolha é do builder.

**Prova das negações (Claude):** `aws iam simulate-principal-policy` com `--resource-policy`
apontando para a política nova, sem escrever nada. Ela confirma:
- `s3:DeleteObject` negado para `gabriel`, `JoaoVBA` e as duas roles da conta-mãe;
- `s3:DeleteObject` permitido para `lotus-ec2` e `lotus-infra`;
- `s3:DeleteObjectVersion` negado para todos;
- governança negada fora do `lotus-infra`.

Além do simulador, uma chamada real do `lotus-infra` com `delete-object --version-id` precisa
voltar `AccessDenied`.

### 8.4 Órfãos e desfazer

- **Órfãos:** chave atual do S3 sem linha em `files.path` ∪ `users.photo_path`. A lista se recalcula
  na hora da remoção, porque a produção mudou desde a medição (12 na época). Cada órfão sai com
  `DeleteObject` sem versão, o que deixa marca de exclusão e o desfazer de 7 dias valendo. A lista
  removida vai para a execução.
- **Desfazer:** copiar a versão anterior por cima da chave (`copy-object` com
  `--copy-source "<bucket>/<chave>?versionId=<id>"`). A cópia vira a versão atual. Remover a marca de
  exclusão exigiria `DeleteObjectVersion`, que fica negado para todos. O passo a passo vai para uma
  seção nova do README.
- **Prova do desfazer:** um objeto de teste em `probes/` é criado, apagado, restaurado pelo runbook
  e conferido pelo conteúdo. Depois é apagado de novo e fica para o lifecycle.

## 9. Retry no backup

`deploy/bin/backup-db.sh`:
- o upload para o S3 tenta até três vezes, com espera crescente entre as tentativas; o dump é feito
  uma vez só e o arquivo já existe até o `trap` do fim;
- cada falha sai no stderr, que o cron manda para `/var/log/lotus-backup.log`;
- com três falhas, o script sai `1`, como hoje;
- a causa de 2026-10-07 foi `Unable to locate credentials`: o CLI desistiu do IMDS no default de 1
  tentativa e 1 segundo. O script passa a exportar `AWS_METADATA_SERVICE_NUM_ATTEMPTS` e
  `AWS_METADATA_SERVICE_TIMEOUT` com mais folga. Os valores são do builder.

O `deploy.sh` chama o mesmo script para o dump pré-deploy e herda o retry.

`deploy/bin/verificar-backup.sh` **(Claude)**:
- recebe a mesma folga de IMDS;
- hoje, qualquer falha do `aws s3api list-objects-v2` vira `None` e dispara "nenhum backup… gatilho
  do ADR-09", um falso alarme grave. A consulta que falha passa a alertar que a consulta falhou, e
  não que não há backup.

## 10. pnpm no portão do `lane.sh`

O `lane.sh abrir` confere `"$PNPM"` (o `LANE_PNPM` que os testes injetam, ou `pnpm`) entre as
checagens do portão, antes do `PORTAO OK` e de criar qualquer coisa. Ausente → `PORTAO RECUSOU`,
com a instrução `corepack enable pnpm`. Hoje ele só descobre no `pnpm install`, depois de criar
branch e árvore, e sai `LANE PELA METADE`. Isso aconteceu duas vezes na abertura deste bloco: o node
22 instalado em 2026-10-24 virou o default do nvm sem o pnpm, que só existia no node 24.

Teste em `.claude/tests/lane-abrir.tests.sh`: com `LANE_PNPM` apontando para um comando
inexistente, sai `PORTAO RECUSOU`, e nem a branch nem a árvore existem depois. Uma linha no
`CLAUDE.md` §6: node novo no nvm pede `corepack enable pnpm`.

## 11. Testes, prova local e registros

Vale a lição 19 do `docs/README.md`: comportamento e gate se provam **por execução**, com `docker`
e `aws` falsos (o precedente é o `conferir-golive.test.ts`, com fixtures em `frontend/tests/fixtures/`).
Cada gate tem uma sonda que apaga o `exit`, ou acrescenta `|| true`, e reprova a catraca.
`indexOf` e `toContain` não contam como catraca de gate.

- **`podar-imagens.sh`, por execução:**
  - guarda o SHA novo e o anterior;
  - cobre o mesmo SHA promovido de novo (o anterior sai do ledger, não do `CURRENT_SHA`);
  - não toca imagem fora dos três repositórios do Lotus;
  - não usa `-f`.
- **`deploy.sh`, catraca textual da chamada:** a poda roda depois do `mv` do `CURRENT_SHA`, e a
  falha dela vira aviso. A sonda que tira o tratamento da falha reprova.
- **Retry do `backup-db.sh`, por execução** (é o DoD da ficha): `docker` e `aws` falsos no PATH. O
  `aws` falha nas duas primeiras chamadas com `Unable to locate credentials` e o upload sai na
  terceira. Com três falhas, o script sai `1`, e a sonda do `exit` reprova. As variáveis do IMDS são
  asseridas.
- **`verificar-backup.sh`, por execução:** a consulta que falha não alerta "nenhum backup".
- **Textuais:**
  - `user-data.test.ts`: journald, apt e o reboot automático com o horário;
  - uma catraca do runbook: nenhum `docker rm -f` de descartável sem `-v`;
  - a política e o lifecycle do S3, onde quer que fiquem versionados.
- `.claude/tests/run-all.sh` e `pnpm test` verdes. O bloco não toca o backend.

**Registros (Claude):**
- emenda curta no ADR-11 (Storage): ninguém apaga de vez; desfazer por 7 dias; fotos em 1 dia; quem
  apaga e quem mexe na proteção;
- emenda curta no ADR-14 (Compute/Deploy): reboot automático na janela e poda de imagens no deploy;
- seções do README:
  - política e lifecycle na §3;
  - desfazer um apagão no S3;
  - manutenção manual repetível (§7 desta spec);
  - `podar-imagens.sh` na §7;
  - saída de emergência da política.

## 12. Execução em produção

Toda escrita em produção é do João. Claude prepara os comandos, confere por SSH e AWS só leitura e
registra em `execucao-producao.md`, nesta pasta.

**Antes do merge, na lane:**
1. Medição antes: disco, imagens, volumes, órfãos, kernel e pacotes pendentes. A medição de
   2026-10-25 é a referência, e o que mudou se mede de novo.
2. Limpeza única (§5). `lotus-prod-disco` volta a OK.
3. journald e apt (§6).
4. Janela manual: pacotes e reboot (§7).
5. Reboot automático ligado, só depois da janela (§7).
6. S3 na ordem do §8.3.

**Depois do merge, na lane de aceitação:**
1. Reinstalar no host os scripts de `deploy/bin/` (§7 do README). O botão de deploy recusa promover
   enquanto o host diverge da `main` (item 31).
2. Uma promoção real. O host passa a guardar só dois SHAs por imagem.
3. O backup diário do dia seguinte sai pelo script novo, visto no log.

## 13. Riscos

- **Reboot e MySQL:** no reboot, o dockerd para os contêineres com o timeout dele. O builder confere
  se o MySQL para limpo (o InnoDB não pode entrar em recuperação no boot) e, se não parar, ajusta o
  `stop_grace_period` no compose.
- **Reboot e alarme:** se a janela manual mostrar mais de 3 minutos fora, o reboot automático vai
  disparar o `lotus-prod-up`. Isso fica registrado e volta ao João antes do merge.
- **Política e o João fora:** tudo o que muda a proteção passa a depender do `lotus-infra`. Perder o
  acesso dele cai na saída de emergência da raiz, que é do João e tem o login confirmado antes da
  política (§8.1, §8.3).
- **Admins barrados:** `gabriel`, `JoaoVBA` e as roles da conta-mãe deixam de apagar no bucket. É o
  pedido do João, e fica dito no runbook.
- **Lista de órfãos velha:** recalcular na hora (§8.4). O bloco 38 carregou dados depois de parte
  da medição.
- **Snapshots do containerd:** o espaço pode não voltar na hora em que a imagem sai. Medir depois.

## Verificação externa

1. Limpeza única feita: só dois SHAs por imagem do Lotus no host; volume `901f0f78…` e
   `/opt/lotus/prova-certificado.php` removidos; `lotus-prod-disco` em OK.
   - prova: nenhuma
2. journald com teto de 200 MB e apt com limpeza periódica, aplicados no host.
   - prova: nenhuma
3. Janela manual feita: pacotes aplicados, kernel novo rodando, seis contêineres de pé, alarmes
   religados.
   - prova: `producao GET /up -> 200`
4. Reboot automático ligado no host, às 08:30 UTC, depois da janela.
   - prova: nenhuma
5. S3: lifecycle e política aplicados e lidos de volta; negações provadas; órfãos removidos com a
   lista registrada; desfazer provado num objeto de teste.
   - prova: nenhuma
6. Scripts de `deploy/bin/` reinstalados no host depois do merge.
   - prova: nenhuma
7. Promoção real depois do merge, com o host guardando só dois SHAs por imagem do Lotus.
   - prova: nenhuma
8. Backup diário do dia seguinte saiu pelo script novo, visto no `/var/log/lotus-backup.log`.
   - prova: nenhuma
