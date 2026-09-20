# Evidências — item 10 v2 (`infra-producao-provisionamento-aws`)

> Task 20 do plano [`plans/archive/2026-09-02-infra-producao-provisionamento-aws.md`](../plans/archive/2026-09-02-infra-producao-provisionamento-aws.md).
> Conta AWS `760144413534`, região `sa-east-1`, instância `i-0789e30d781790dd4` (`t4g.small`),
> EIP `18.230.53.197`, SHA corporativo implantado `a5fc92bb7728ea0da6dc16a62958e02556df999b`.
>
> As Tasks 12–15 foram medidas em **2026-09-04** e estão reproduzidas aqui a partir do ledger
> `.superpowers/sdd/progress.md` — este arquivo é o consolidado, não a fonte. As Tasks 16–19
> foram medidas em **2026-09-17**, depois de a instância ser religada (estava `stopped` desde a
> pausa por viagem; a stack voltou sozinha e `/up` respondeu 200 sem intervenção).

## 1. SCP — a conta é membro de outra organização (Task 12)

`aws organizations describe-organization`, saída literal:

```json
{
    "Organization": {
        "Id": "o-fdepe5skxg",
        "Arn": "arn:aws:organizations::312977845331:organization/o-fdepe5skxg",
        "FeatureSet": "ALL",
        "MasterAccountId": "312977845331",
        "MasterAccountEmail": "<redigido>"
    }
}
```

Nenhuma recusa por SCP apareceu em qualquer recurso das Tasks 13–19. A consequência real dessa
filiação aparece na §7: a métrica de billing não existe nesta conta.

## 2. Release provado localmente (Task 4)

`scripts/provar-release.sh d0d8db50…` → **RELEASE PROVADO**, `GET /up` → 200,
`app@sha256:98b469d4…`, `web@sha256:666b5a3e…`, exit 0 — com o `mysql` vindo do compose de
produção e a sonda só acrescentando MinIO/Mailpit.

## 3. Par multi-arch (Task 11)

`docker buildx imagetools inspect`, `linux/amd64` + `linux/arm64` nos três:

| Imagem | Digest do índice |
|---|---|
| `lotus-app` | `sha256:f5cd518dcd9c834097a782df404e3c7a9d60347834e010f0becbbca5a4483ca3` |
| `lotus-web` | `sha256:29051d6886ceac954bd8117a8e9ad317b50060b2e9ade75dd720d049f7bc81d7` |
| `lotus-clamav` | `sha256:1eaaf060d551c0e418cd43e30c79b58526769583e16dbfde49726001213ca9c3` |

## 4. Deploy e prova externa (Task 15 — DoD 1 e 2)

`deploy.sh a5fc92bb…` → **DEPLOY OK**: pull dos 5, 30 migrations em ~9s (banco novo), up dos 6,
nginx `healthy`, `/up` 200 interno. De fora, do WSL:

```
GET http://18.230.53.197/up  -> 200
GET http://18.230.53.197/    -> 200 (SPA)
GET /api/user (Accept: application/json) -> 401 RFC 7807
```

Em 2026-09-17, depois do religamento, os seis containers subiram sozinhos (`restart` do compose) e
o `clamav` ficou `healthy` novamente. `GET /up` de fora: **200** na primeira tentativa.

## 5. Cadeia de credencial e S3 real (Task 16 — DoD 3)

Do **container `app`**, sem nenhuma access key no `.env` (a credencial vem do IMDSv2 + instance
profile), via `artisan tinker`:

```
disk=s3
existe=sim
conteudo=prova de cadeia IMDSv2
url=https://lotus-prod-760144413534.s3.sa-east-1.amazonaws.com/probes/imds-20260918-005204.txt…
```

Do **WSL**, contra o objeto recém-escrito:

| Requisição | Código |
|---|---|
| URL pré-assinada (5 min) | **200**, corpo `prova de cadeia IMDSv2` |
| Mesma URL sem assinatura | **403** |

O objeto de sonda foi apagado no fim (`apagado=sim`, `restam=0` em `probes/`). Isso prova a cadeia
inteira — role da instância, hop limit 2, escrita, leitura, assinatura e o bucket fechado ao
público.

### 5.1 Upload pela UI e ClamAV no caminho do produto — 2026-09-20 (fecha o DoD 3)

O João subiu, logado na UI em `http://18.230.53.197`, os três documentos obrigatórios da RN-16 da
turma de prova. Os objetos apareceram no bucket:

```
2026-09-20 20:49:47      78203 turma/1/RZIEjFf9g8ZG50W0clPK0gh1h6P6e3OG4kqxFjWb.pdf
2026-09-20 20:49:49     148326 turma/1/KvVIFWRMiD9CVCz3dHvG8pv3VAWHo2dh7U8zf4D3.pdf
2026-09-20 20:49:55     108526 turma/1/zv8dmMWJYzOtWaPeguY5CZomlni21RDY4GJhxIbL.pdf
```

O ClamAV de produção foi provado **ativo e discriminante** no mesmo dia, contra o daemon real, pelo
`MalwareScanner` que a aplicação usa:

| Arquivo | Resposta |
|---|---|
| EICAR | **FOUND** |
| arquivo limpo | **OK** |

Isso importa porque o `ClamAvScanner` **falha fechado** — resposta que não é `OK` nem `FOUND` vira
`ScannerUnavailableException` e derruba o upload. Logo, upload que conclui é upload varrido; não há
o modo de falha silencioso em que o antivírus está fora e os arquivos passam assim mesmo.

> **Nota de método:** os pré-requisitos da turma (curso, template, relator com REUF, cliente,
> orçamento, cotação aprovada, turma, matrícula) foram semeados por `artisan tinker` no host, pelas
> mesmas Actions do domínio que o `OperationDemoSeeder` usa — ele próprio não roda em produção, por
> guarda de ambiente (`app()->environment(['local','demo'])`). O que o DoD 3 e o DoD 4 exigem pela
> UI — o upload e a emissão — foi feito pela UI.

## 6. PDF e memória sob carga (Task 16 — DoD 4 e Step 4)

Três renders sequenciais de um HTML grande (40 blocos, ~200 KB) pelo `GotenbergHtmlToPdf` real:

```
render 1: 50836 bytes em 9.9s, cabecalho=%PDF-
render 2: 50836 bytes em 0.5s, cabecalho=%PDF-
render 3: 50836 bytes em 0.5s, cabecalho=%PDF-
```

Os 9,9s do primeiro são o arranque frio do Chromium; depois ele fica quente. `dmesg | grep -i oom`:
**0 linhas**, antes e depois.

Memória, em três momentos:

| Container | Ocioso (antes) | Durante/depois da carga | Teto |
|---|---|---|---|
| `clamav` | 929,1 MiB | **421,2 MiB** | 1,5 GiB |
| `gotenberg` | 29,3 MiB | **385,2 MiB** | 768 MiB |
| `app` | 57,3 MiB | 52,2 MiB | 768 MiB |
| `mysql` | 106,9 MiB | — | 512 MiB |
| `scheduler` | 9,4 MiB | — | 384 MiB |
| `nginx` | 2,6 MiB | — | 128 MiB |

`free -m` ao longo da carga:

```
00:54:38 avail=390 used=1444 swap=693
00:54:46 avail=554 used=1280 swap=1045
00:54:55 avail=749 used=1085 swap=1091
00:55:51 avail=688 used=1146 swap=1076
```

**Leitura, e é um achado:** o host sobrevive ao PDF **paginando o ClamAV para o swap** — a base de
assinaturas dele caiu de 929 MiB residentes para 421 MiB e o swap subiu ~400 MiB no mesmo minuto.
Não houve OOM e o PDF saiu rápido, mas o swap já estava em **694 MiB com o sistema ocioso**, dois
minutos depois do boot, e terminou em ~1,08 GiB de 2 GiB. O critério de resize do runbook §12 diz
`t4g.small` → `t4g.medium` quando houver *"swap sustentado em uso normal (`free -m`, não pico
isolado)"*. **Esse critério está satisfeito.** A decisão é do João (custo + reinício da produção),
não deste bloco; o que este bloco entrega é a medição que a dispara.

### 6.1 Certificado emitido pela UI — 2026-09-20 (fecha o DoD 4)

O João emitiu, pela UI, o certificado do aluno da turma de prova, depois de concluí-la (a RN-16 só
destrava a conclusão com os três documentos da §5.1 no lugar — por isso o DoD 3 é pré-requisito
natural do DoD 4):

```
id=1 codigo=LOT-2026-1000 uuid=542d9254-eb60-40f7-83a1-debd76129ffe
status=emitido valido_ate=2028-09-20   (24 meses, do `validity_months` do template)
enrollment=1 course=2 redator=1
```

As seis portas do `CertificateEligibility` foram exercidas de verdade: turma `Concluida`, matrícula
`aprobado`, sem certificado vigente, template do curso presente, cidade de emissão (`Santiago`, do
`local_aplicacao` da turma) e relator designado.

**Validação pública do QR, de fora do host**, na rota anônima:

```
GET http://18.230.53.197/api/publico/certificados/542d9254-… → 200
{"codigo":"LOT-2026-1000","status":"emitido","valido_ate":"2028-09-20",
 "revoked_at":null,…,"display_status":"vigente"}
```

**PDF renderizado pelo Gotenberg de produção:** 213.425 bytes, A4, 3 páginas. Memória e OOM depois do
fluxo real completo (3 uploads varridos + emissão + renders):

| Container | Memória |
|---|---|
| `gotenberg` | 347 MiB / 768 MiB |
| `clamav` | 341 MiB / 1,5 GiB |
| `app` | 62,5 MiB / 768 MiB |
| `mysql` | 115,2 MiB / 512 MiB |

`free -m`: `used=1127 avail=148 swap=1055`. `dmesg | grep -i oom`: **0 linhas**. O padrão repete o da
§6 — o host aguenta paginando o ClamAV, e o critério de resize segue satisfeito.

**Achado colateral, fora do escopo deste bloco:** o PDF saiu com 3 páginas, e a página 2 tem só a
assinatura do relator e o aviso legal, com ~25% do rodapé da página 1 vazio. Não é regressão da
nuvem — é o trade-off que o template documenta (`min-height`, para não sobrepor conteúdo de peso
legal). Ficha **P-78**, com a medição que falta indicada.

## 7. Backup e restore (Task 17 — DoD 5)

Cron do runbook §9 instalada no host:

```
10 6 * * * /opt/lotus/bin/backup-db.sh >> /var/log/lotus-backup.log 2>&1
```

A **primeira execução real recusou um dump íntegro**: `erro: dump suspeito de vazio (8903 bytes)`.
A guarda media o arquivo já comprimido contra um piso escrito para o tamanho bruto — 62.299 bytes
crus, 8.912 em gzip, 36 `CREATE TABLE` e 11 `INSERT` dentro. Corrigido no commit `b3093022`
(guarda sobre o bruto, rodapé `-- Dump completed` exigido, `trap … EXIT`, catraca nova em
`frontend/tests/backup-db.test.ts`). Segunda execução:

```
backup ok: s3://lotus-prod-760144413534/backups/lotus-2026-09-18T00-49.sql.gz
```

Restore em container limpo, com as contagens do mesmo `SELECT` dos dois lados:

| Tabela | Produção | Restaurado |
|---|---|---|
| `certificates` | 0 | 0 |
| `audits` | 7 | 7 |
| `users` | 2 | 2 |
| `permissions` | 41 | 41 |
| tabelas em `lotus` | — | 36 |

**Desvio do plano, declarado:** o restore rodou no **WSL**, não no host. O host tinha 393 MiB
disponíveis e 694 MiB de swap em uso (§6); subir um segundo `mysql:8.0` ali arriscava OOM na
produção para provar um backup. A prova é a mesma — o artefato provado é o objeto que está no S3,
baixado de lá.

## 8. Teto de custo (Task 18 — DoD 6)

A métrica `AWS/Billing EstimatedCharges` **não existe nesta conta**:
`aws cloudwatch list-metrics --region us-east-1 --namespace AWS/Billing` → `{"Metrics": []}`. É a
consequência da §1: a métrica só é publicada na conta pagadora (`312977845331`), e não temos acesso
a ela. **Desvio previsto pela própria spec**, executado: AWS Budgets na própria conta.

Budget `lotus-prod-teto`, MONTHLY, **30 USD**, sem filtro de serviço (o `lotus-site-teto` que já
existia cobre só S3 + CloudFront e não veria a EC2), com duas notificações para
`jvbatalha32@gmail.com` — `ACTUAL > 100%` e `FORECASTED > 100%`. Budgets manda e-mail direto, sem
a confirmação de subscription que o SNS exigiria: o canal já está ativo no ato da criação.

Gasto do mês corrente, no ato da criação:

| | USD |
|---|---|
| Gasto real até 17/09 | **21,02** |
| Previsão do mês | **35,74** |
| Teto | 30,00 |

Quebra por serviço (`ce get-cost-and-usage`, 01–18/09):

| Serviço | USD |
|---|---|
| EC2 — Compute | 9,13 |
| EC2 — Other (EBS) | 4,48 |
| VPC (IPv4 público / EIP ocioso) | 3,55 |
| Tax | 3,36 |
| Route 53 | 0,50 |
| S3 | 0,002 |

**Achado:** a previsão já estoura o teto, e parte disso é o EIP cobrado enquanto a instância ficou
**parada** — IPv4 público ocioso custa mais, não menos. O `t4g.medium` da §6 sobe o EC2-Compute de
~9 para ~18 USD/mês: com ele, o teto de 30 USD **não se sustenta** e precisa ser revisto junto com
a decisão de resize.

## 9. TLS (Task 19 — DoD 7, ramo ficha)

| Registro | Valor |
|---|---|
| `A` de `app.lotusotec.cl` | `185.146.167.195` (hospedagem antiga) |
| `AAAA` | `2a07:7800::195` (hospedagem antiga) |
| EIP da produção | `18.230.53.197` |

Diferentes ⇒ ramo ficha, como a Task 19 prevê. Ficha **P-77** aberta, com o §11 do runbook como
ação e a igualdade com o EIP como gatilho. A produção fica em HTTP no IP; o overlay TLS e o
`tls.conf` seguem no repositório desde a Task 7, prontos e nunca exercidos contra certificado real.

## 10. Segurança

- **Chave vazada `AKIA3B7BDINPIEP2W4WK`:** já **não existe** na conta (`list-access-keys` do
  usuário `lotus-infra` devolve só a `AKIA3B7BDINPPYESZA6T`, criada em 2026-09-04). O CloudTrail
  dela devolve **três eventos, todos `GetCallerIdentity` do próprio `lotus-infra` em 2026-09-04** —
  nenhum uso de terceiro, nenhuma chamada de recurso.
- **Access key `AKIA3B7BDINPPYESZA6T` (usuário `lotus-infra`):** é a credencial que executou esta
  sessão. **Apagar no fechamento do bloco** — segue aberta.
- O `.env` de produção não tem access key: a aplicação usa o instance profile (§5).

## 11. Estado do DoD — fechado em 2026-09-20

| DoD | Estado |
|---|---|
| 1 — deploy por SHA | ✅ §4 |
| 2 — `/up` 200 de fora | ✅ §4 |
| 3 — S3 real | ✅ cadeia em §5, upload pela UI e ClamAV discriminante em §5.1 |
| 4 — PDF | ✅ Chromium sob carga em §6, certificado `LOT-2026-1000` emitido pela UI em §6.1 |
| 5 — restore | ✅ §7 |
| 6 — teto de custo | ✅ §8 (por Budgets, desvio declarado) |
| 7 — TLS | ✅ §9, ramo ficha (P-77) |

Os dois ⚠️ que restavam em 2026-09-17 dependiam da senha do primeiro admin, gerada **no host** com
`Str::password(20)`, que nunca passou por sessão nem por arquivo (Task 16 Step 1, 2026-09-04). O João
executou as duas ações na UI em **2026-09-20** e esta sessão verificou o outro lado: objetos no
bucket, linha em `certificates`, QR público, PDF, `dmesg` e `docker stats`.

### 11.1 Gate de fechamento (Task 20 Step 2)

```
pnpm lint  → 0
pnpm build → 0
pnpm test  → 785/785 em 130 arquivos
git diff main...HEAD -- backend/ frontend/src/shared/api/generated.ts → vazio
```

### 11.2 Dado sintético da prova — removido e conferido

A cadeia `PRUEBA DOD` e o curso de teste `ss` existiam só para esta prova. Decisão do João em
2026-09-20: apagar tudo, preservando `admin@lotus.cl` com a foto de perfil e a tabela `audits`
(trilha de auditoria não se apaga — lei 2).

A primeira passada parou numa FK legítima:

```
SQLSTATE[23000]: ... `lotus`.`student_client_logs`,
CONSTRAINT `student_client_logs_client_id_foreign` ... ON DELETE RESTRICT
```

`student_client_logs` referencia `students` **e** `clients` com `RESTRICT`: o vínculo aluno-cliente é
registro histórico que se encerra por `ended_on` e não se apaga. A segunda passada removeu o vínculo
sintético antes das pontas.

Estado final da base, conferido por esta sessão depois da limpeza:

```json
{"certificates":0,"turmas":0,"enrollments":0,"redatores":0,"student_client_logs":0,
 "students":0,"clients":0,"quotes":0,"budgets":0,"courses":0,"files":0,
 "users":1,"audits":49}
user id=4 type=admin active=sim foto=sim
```

Bucket, no mesmo momento — só os backups e a foto do admin:

```
backups/lotus-2026-09-18T00-49.sql.gz
backups/lotus-2026-09-18T06-10.sql.gz
backups/lotus-2026-09-20T06-10.sql.gz
user-photos/4/H8owXWk5tBTzhiuZvOFv85fueUygzmjnx2WCRWD3.png
```

`GET http://18.230.53.197/up` → **200** depois da limpeza. Os 49 `audits` guardam a trilha do que a
prova escreveu e apagou — inclusive a emissão do `LOT-2026-1000`, cujo certificado em si não existe
mais.
