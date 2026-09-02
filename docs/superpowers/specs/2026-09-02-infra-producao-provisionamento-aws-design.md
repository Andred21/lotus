# Spec — `infra-producao-provisionamento-aws` (v2) — 2026-09-02

> Replanejamento do item 10 depois do descarte de 2026-09-02. A v1 vive íntegra em
> `archive/infra-producao-provisionamento-aws-v1` (`305b6ca4`) e serve como **referência de fato**
> (o que foi medido), nunca como desenho herdado. Esta spec nasce do brainstorming com o João e
> ataca os quatro motivos do descarte registrados no `state.md` de 2026-09-02.

## 1. Contexto e motivos

O descarte da v1 teve quatro motivos, todos declarados pelo João:

1. **GATE-2 derrubou a premissa da Fase 0** — a conta Gatika é conta-membro de outra organização
   AWS e conta-membro não cria organização. O isolamento por AWS Organizations não é executável.
2. **A arquitetura voltou à mesa** — RDS × MySQL em container, compute, tamanho, custo e a
   RNF-DIS-02 (redundância), que segue `unresolved`.
3. **O escopo era grande demais** — dez fases num bloco só.
4. **A spec veio pronta de fora**, sem brainstorming — as alternativas nunca estiveram na mesa.

Esta spec responde aos quatro: as decisões abaixo foram tomadas uma a uma com o João em
2026-09-02, com as alternativas recusadas registradas ao lado de cada uma.

## 2. Decisões do brainstorming (registro com alternativas)

| # | Decisão | Escolha | Alternativas recusadas |
|---|---|---|---|
| D1 | Conta AWS | **Usar a conta Gatika como está** (conta-membro), sem Organizations. Isolamento por identidade IAM (ver Fase 0) | Medir a management account primeiro; conta standalone nova |
| D2 | Banco | **MySQL 8 em container no mesmo host**, 3306 só na rede interna do Compose; **revisa o ADR-09** | RDS gerenciado (custo ~US$ 15–20/mês contra teto de 30); MySQL em EC2 separada (custa ≈ RDS sem os benefícios gerenciados — recusada depois de o João levantar a hipótese e ver a conta) |
| D3 | Região | **`sa-east-1`** (latência ~40–60 ms do Chile) | `us-east-1` (mais barata, latência 3× maior) |
| D4 | Compute | **`t4g.small`** (ARM, 2 GiB), com swap + limites de memória por container e critério escrito de resize | `t4g.medium` (4 GiB, 2× o custo); `t3.small` x86 (~US$ 26/mês, encostava no teto) |
| D5 | Arquitetura de imagem | **CI vira multi-arch** (`linux/amd64,linux/arm64`) para o t4g rodar o par do GHCR | Trocar para EC2 x86 e não tocar a CI |
| D6 | Recorte | **3 blocos**: base+HTTPS (este) / e-mail (SES+DKIM+SPF) / observabilidade (CloudWatch+alarmes). Site institucional fora | 2 blocos (repetia o tamanho que motivou o descarte); 4 blocos (HTTPS só no segundo) |
| D7 | DNS | **Sem acesso ao painel** (zona em `ns1–ns4.stackdns.com`). Pedido de 1 registro A à Lotus/agência; TLS fica pronto e a emissão espera o registro | Migração de zona (fora de escopo e de acesso) |
| D8 | Teto de custo | **US$ 30/mês**, com billing alarm no teto já neste bloco | US$ 50 |
| D9 | Context Packet | **Não regenera.** Os fatos externos (conta-membro, DNS medido, par de imagens por SHA do espelho) já estão medidos e registrados no `state.md`; Drive/Notion não têm o que este recorte precisa que esta spec não cite | Reinvocar o Codex para packet novo |

## 3. Escopo deste bloco

Provisionar a base de produção na AWS e provar a imagem promovida por SHA rodando sobre ela:

- Fase 0: usuário IAM dedicado (§4);
- Security Group + IP elástico na VPC default de `sa-east-1` (§5);
- EC2 `t4g.small` com Docker via cloud-init versionado (§6);
- `mysql` no `docker-compose.prod.yml` + revisão do ADR-09 (§7);
- backup do banco para S3 com restore provado (§8);
- bucket S3 real + instance role least-privilege (§9);
- emenda multi-arch no job `image` da CI (§10);
- `deploy/bin/deploy.sh <sha>` manual e documentado (§11);
- nginx/Certbot prontos + pedido do registro A a terceiro (§12);
- billing alarm de US$ 30 (§13).

**Fora deste bloco** (registrado, não perdido):

- **E-mail** — SES, DKIM e a emenda do SPF `-all` do Google Workspace. Vira bloco próprio
  (`infra-producao-email-ses`, título; a criação do item na fila é do João, no main tree).
  Até lá, `MAIL_MAILER=log` em produção.
- **Observabilidade** — CloudWatch agent, alarmes de app, canal de alerta. Bloco próprio
  (`infra-producao-observabilidade`, título; idem).
- **Site institucional** — o WordPress no apex de `lotusotec.cl` continua onde está.
- **Promoção automatizada** — item 12, estacionado; este bloco entrega o alvo que o desestaciona.
- **RNF-DIS-02 (redundância)** — segue `unresolved`, reservado ao gate do item 13. EC2 única não
  a satisfaz e esta spec não finge que satisfaz.

## 4. Fase 0 — usuário IAM dedicado (pedido do João)

Antes de qualquer recurso: criar um usuário IAM próprio para esta arquitetura (proposta de nome:
`lotus-infra`), com console + MFA próprio, e as credenciais fora do acesso compartilhado com o
cliente. O isolamento aqui é de **identidade** (quem fez o quê, rastreável no CloudTrail da org
dona), não de permissão fina — a permissão do usuário é administrativa na conta; o least-privilege
de verdade fica na instance role da EC2 (§9).

**Fallback declarado pelo João:** se a criação exigir o MFA que está com o cliente e ele estiver
fora de horário comercial, o bloco **prossegue** com o acesso atual e a criação do usuário vira a
primeira pendência do bloco (ficha com gatilho "MFA disponível"). Nenhuma outra task depende da
Fase 0.

**Risco medido a registrar na execução:** SCPs da organização dona são desconhecidas. A primeira
sessão de console/CloudShell roda `aws organizations describe-organization` (AccessDenied também é
resposta) e qualquer recusa de SCP a um recurso deste bloco vira blocker com a mensagem literal.

## 5. Conta e rede

- Conta Gatika como está; sem Organizations, sem conta nova.
- VPC default de `sa-east-1` — VPC dedicada seria cerimônia sem ganho para um host.
- 1 Security Group: `22/tcp` restrito ao IP do João (atualizável), `80/tcp` e `443/tcp` abertos.
- IP elástico anexado à instância (grátis enquanto anexado; o custo de EIP ocioso entra no teto se
  a instância parar).

## 6. Host

- `t4g.small` (Graviton, ARM64, 2 GiB), Ubuntu Server 24.04 LTS arm64, EBS gp3 20 GiB.
- Docker Engine + compose plugin instalados por **cloud-init versionado** em `deploy/aws/`
  (user-data reproduzível, não console-clicking sem rastro).
- **Swap de 2 GiB** (arquivo) criado pelo cloud-init — obrigatório, não opcional.
- Limites de memória por container no compose de produção: os já medidos (CLI 320M, FPM 256M) e
  limites novos para `mysql` e `gotenberg`, dimensionados na execução com medição registrada.
- **Critério escrito de resize:** OOM-kill em geração de PDF em lote, ou swap sustentado sob uso
  normal, promove a `t4g.medium` (stop/start, minutos de indisponibilidade, aceitável para ~10
  usuários). O critério fica no runbook, não na cabeça.

## 7. MySQL em container + revisão do ADR-09

- Serviço `mysql` entra no `docker-compose.prod.yml`: imagem `mysql:8` fixada **por digest**,
  volume nomeado, healthcheck, `3306` apenas na rede interna — **nunca** publicada no host.
- `app` e `scheduler` passam a depender do `mysql` saudável.
- **Lição 19:** o `docker-compose.prod.yml` tem catraca (`frontend/tests/compose-prod.test.ts`);
  toda mudança soma asserção **no mesmo commit**.
- **ADR-09 ganha revisão datada** (2026-09) por escrito: a regra passa de "RDS gerenciado, nunca
  no mesmo host" para "MySQL em container no host único, com backup provado em S3 e retenção
  mínima de 7 dias". A revisão registra o motivo (teto de custo US$ 30/mês; RDS custaria
  ~US$ 15–20), a mitigação (§8) e o **gatilho de reversão**: se o restore provado falhar, se o
  backup ficar > 7 dias sem sucesso, ou se o cliente exigir SLA de dado que dump diário não
  atende, volta-se ao RDS e a revisão se desfaz.

## 8. Backup — o preço do descarte do RDS

- `deploy/bin/backup-db.sh`: `mysqldump` (via `docker exec` no serviço `mysql`) → gzip → upload
  ao S3 (prefixo `backups/`), com nome datado.
- Agendado por **cron do host** — o serviço `scheduler` roda dentro do container e não alcança
  `docker exec` de outro serviço.
- Retenção por **lifecycle rule** no S3: expira em 30 dias (≥ 7 do requisito original).
- **DoD inclui restore provado**: o dump mais recente restaurado num container MySQL limpo, com
  contagem de linhas de tabelas de peso legal (`certificates`, `audits`) conferida contra a
  origem. Backup que nunca restaurou não é backup (lição 1).

## 9. S3 real + IAM least-privilege

- Bucket privado em `sa-east-1`, versionamento **ligado** (documento tem peso legal), block
  public access total.
- Credencial da aplicação via **instance role** (perfil da EC2), política mínima restrita ao
  bucket — sem access key de longa duração no `.env`.
- A execução **prova** que o Flysystem resolve a credencial pela chain do IMDSv2 e que
  `temporaryUrl()` (pré-assinada) funciona com role. Se não funcionar, o fallback medido é IAM
  user dedicado com chave no `env_file` — registrado como desvio, não escondido.
- CORS: **nenhum** até uma medição provar necessidade (upload passa pela API; download é URL
  pré-assinada por GET simples).

## 10. CI multi-arch

- Emenda no job `image` de `.github/workflows/ci.yml`: `docker/setup-qemu-action` +
  `platforms: linux/amd64,linux/arm64` nos quatro passos de build/push.
- Preço aceito: build ~2× mais lento no job `image`.
- Tag por SHA é write-once: **só SHAs novos** ganham par multi-arch. O deploy deste bloco usa o
  primeiro SHA corporativo publicado **depois** da emenda chegar à `main` corporativa pelo
  espelho (`scripts/espelhar-corporativo.sh`).
- O par implantado é o **corporativo**: `ghcr.io/gatika-cl/lotus-{app,web}:<sha>`. GHCR privado →
  PAT `read:packages` no host, em arquivo fora da imagem.

## 11. Deploy por SHA (manual, documentado)

- `deploy/bin/deploy.sh <sha>` no host, sobre o precedente do `scripts/provar-release.sh`:
  login no GHCR → pull do par → `php artisan migrate --force` → `up -d` → espera `/up` responder
  200 → confere que os digests em execução são os puxados → registra o SHA corrente em arquivo no
  host (`/opt/lotus/CURRENT_SHA`).
- Falha em qualquer passo aborta com mensagem; rollback manual é `deploy.sh <sha-anterior>`
  (migration incompatível fica explícita como limite — estratégia é do item 12).
- Herança registrada da v1 do runtime: `key:generate` exige `--entrypoint php`.

## 12. DNS e TLS — dependência de terceiro declarada

- A zona de `lotusotec.cl` está em `ns1–ns4.stackdns.com` e o João **não tem acesso** ao painel.
- Task no **início** da execução: João solicita à Lotus/agência a criação de 1 registro
  A — `app.lotusotec.cl` → IP elástico. Pedido cedo para dar tempo ao terceiro.
- Nginx e Certbot ficam **prontos**: conf da porta 80 com o challenge ACME + redirect, overlay
  443, comando único de emissão documentado no runbook.
- **Prova do registro:** o A responder com o IP elástico — nunca "o nome resolve", porque o
  curinga `*.lotusotec.cl` faz qualquer nome resolver para o host WordPress (medição de
  2026-09-02).
- Registro chegar durante o bloco → HTTPS prova dentro do bloco. Não chegar → o bloco fecha com
  HTTP no EIP provado e uma **ficha** com gatilho "registro A criado", apontando o comando de
  emissão. O fechamento não espera terceiro.

## 13. Custo

- Estimativa: EC2 `t4g.small` ~US$ 12 + EBS gp3 20 GiB ~US$ 4 + S3/tráfego ~US$ 2 ≈
  **US$ 18–25/mês**. Teto: **US$ 30/mês** (D8).
- Billing alarm no teto entra **neste bloco** (alarme de billing vive em `us-east-1` — métrica de
  billing só existe lá; isso vai no runbook para ninguém "corrigir" a região depois).
- Canal do alarme: e-mail do João via SNS (canal definitivo de alerta é decisão do bloco de
  observabilidade).

## 14. Execução

- `executor: claude`. O bloco toca decisão de arquitetura, credencial e console AWS. Ações de
  console/CloudShell são do João, guiadas passo a passo — o AWS CLI **não está instalado** nesta
  máquina, e credencial AWS não entra no repositório nem nesta sessão.
- Árvore: `../lotus-infra` (esta), branch `infra/producao-provisionamento-aws`. Backend não é
  tocado; P-03 não dispara. As catracas de frontend (`compose-prod.test.ts`, `compose-dev`)
  rodam nativas no WSL.
- A emenda da CI atravessa o fluxo normal: PR na pessoal → merge → espelho → corporativo.

## 15. DoD comportamental do bloco

1. A EC2 existe em `sa-east-1`, criada com o cloud-init versionado; swap ativo e limites de
   memória aplicados (medição registrada).
2. O par corporativo multi-arch de um SHA novo sobe no host via `deploy.sh <sha>`; `/up` responde
   200 pelo IP elástico na porta 80; os digests em execução conferem com os puxados.
3. Upload de arquivo pela aplicação chega ao bucket S3 real com credencial de instance role, e a
   URL pré-assinada baixa o arquivo.
4. Um certificado PDF é gerado no host (Gotenberg sob limite de memória) sem OOM.
5. O backup roda pelo cron do host, o objeto aparece no S3, e o **restore num container limpo é
   provado** com contagem conferida.
6. Billing alarm de US$ 30 ativo, com notificação testada.
7. HTTPS: provado no bloco se o registro A chegar; senão, ficha aberta com gatilho e comando
   único, e a prova HTTP do item 2 vale como fechamento.
8. Nada depende do working tree do servidor: host novo + cloud-init + `deploy.sh` reproduzem o
   ambiente (runbook em `deploy/aws/README.md`).

## 16. Riscos e limitações declaradas

- **SCPs desconhecidas** da org dona podem recusar recurso — medição na primeira sessão, recusa
  vira blocker com evidência (§4).
- **RNF-DIS-02** segue `unresolved` — EC2 única, sem redundância; gate do item 13.
- **E-mail em `log`** até o bloco de SES.
- **Sem alarme de app** até o bloco de observabilidade (só billing).
- **Restore manual** — RTO/RPO são os do dump diário + operador humano; registrado na revisão do
  ADR-09.
