# Evidências — item 10 v2 (`infra-producao-provisionamento-aws`)

> Task 20 do plano [`plans/2026-09-02-infra-producao-provisionamento-aws.md`](../plans/2026-09-02-infra-producao-provisionamento-aws.md).
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
público. **Pendente:** o upload pela UI, que é o que exercita também a varredura do ClamAV no
caminho do produto (ver §11).

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

## 11. O que falta para o DoD fechar

| DoD | Estado |
|---|---|
| 1 — deploy por SHA | ✅ §4 |
| 2 — `/up` 200 de fora | ✅ §4 |
| 3 — S3 real | ⚠️ cadeia provada em §5; **falta o upload pela UI** (exercita o ClamAV no caminho do produto) |
| 4 — PDF | ⚠️ Chromium provado sob carga em §6; **falta emitir um certificado de teste pela UI** |
| 5 — restore | ✅ §7 |
| 6 — teto de custo | ✅ §8 (por Budgets, desvio declarado) |
| 7 — TLS | ✅ §9, ramo ficha (P-77) |

Os dois ⚠️ dependem da senha do primeiro admin, gerada **no host** com `Str::password(20)` e que
nunca passou por esta sessão nem por arquivo (Task 16 Step 1, 2026-09-04). São ações do João na UI
em `http://18.230.53.197`; a verificação do outro lado (objeto no bucket, PDF, `dmesg`) é desta
sessão.
