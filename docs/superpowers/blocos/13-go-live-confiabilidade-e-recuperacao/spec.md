# Spec — `go-live-confiabilidade-e-recuperacao` — 2026-10-05

> Item 13 do backlog, último gate P0 antes do go-live. Lane aberta pelo `lane.sh abrir` em
> 2026-10-05 (`lane_base 546be1f1`), offset +1. `Contexto: sim` — packet em
> `blocos/13-go-live-confiabilidade-e-recuperacao/context.md`, gerado sem Codex
> (`mcp__codex__codex` ausente) por quatro leitores `contexto-leitor` em paralelo (Drive, Notion,
> repositório-dados, repositório-infra). A ficha ganhou `**Depende:** —` pela PR #132, porque o
> portão do `lane.sh abrir` recusou a linha Prioridade sem o campo.

> Desenho aprovado em três seções no brainstorming de 2026-10-05, depois de sete perguntas ao
> João. O bloco fecha três textos que esperavam por ele:
> - o gate de arquitetura da ficha: `RNF-DIS-02` × EC2 única, sem aceite da Lotus registrado;
> - as tasks Notion 11.1.1 (roles em prod), 11.1.2 (smoke em prod) e 11.1.3 (restore validado);
> - as pendências P-05, P-44 e o débito D-37, cujo bloco de destino é este.

## 1. Contexto

### 1.1 O que já existe — medido, não suposto

- **Produção.** EC2 única em `sa-east-1`, MySQL 8 em contêiner (ADR-09 rev. 2026-09-02), app em
  `https://app.lotusotec.cl`. Em 2026-10-05: `GET /up` → 200, `GET /sanctum/csrf-cookie` → 204,
  `GET /api/publico/certificados/<uuid inexistente>` → 404.
- **Banco.** Nasceu em 2026-09-04 pelo `deploy.sh a5fc92bb`, com as 30 migrations aplicadas sobre
  volume novo. A coluna `archived_with_parent` existe desde 2026-08-18. O último dump lido
  (ensaio de 2026-09-26) tinha `certificates=0`.
- **Backup.** `backup-db.sh` às 06:10 UTC para `s3://<bucket>/backups/` (lifecycle 30 dias);
  `verificar-backup.sh` às 06:40 UTC alerta o SNS `lotus-alertas` acima de 2 dias. RPO ≤ 24 h.
  Não existe snapshot EBS, AMI ou RDS.
- **Restore.** Procedimento escrito no runbook §8.1.1 (baixar, conferir, cadeado, parar
  `app`/`scheduler`, dump "antes", `DROP`/`CREATE`, carga, ledger, promover). Dois ensaios fora do
  host (2026-09-17 no WSL, 2026-09-26 em `mysql:8.0`). **Nenhum restore cronometrado sobre o host,
  e nenhum com certificado emitido.**
- **Release.** Botão *Promover para producao* (SHA + `PROMOVER`, OIDC `lotus-deploy`, `deploy.sh`
  por SSM, gate de schema com código 4, ledger `/opt/lotus/releases.jsonl`). O botão confere o
  sha256 de cada `bin/*.sh` do host: **todo `deploy/bin/*.sh` novo trava o botão até a
  reinstalação pelo §7.**
- **RBAC.** `RolePermissionSeeder` idempotente, nomes vindos de `PermissionCatalog::descriptions()`,
  três roles de sistema (`superadmin` = todas, `admin`, `redator`). Instala-se pelo §8.3. Não há
  registro de ter rodado em prod. `laravel/tinker` está em `require`, então existe na imagem de
  produção.
- **Certificado.** Rota pública `GET /api/publico/certificados/{uuid}` (200 com `status` e
  `revoked_at`; 404 para uuid desconhecido). Revogação existe no domínio
  (`RevokeCertificateAction`). O QR aponta para `CERTIFICATE_VALIDATION_URL/validar/{uuid}`.
- **Observabilidade.** Item 34: agente CloudWatch, sonda `/up` e quatro alarmes provados; aguarda
  só o custo. Este bloco **mede** alertas e health, não os constrói.
- **Catraca de script de host.** Padrão do item 34: vitest em `frontend/tests/<script>.test.ts`
  executa o script de verdade com `LOTUS_BASE` e binários falsos no `PATH`.

### 1.2 A divergência de disponibilidade

`RNF-DIS-02` (Drive `requisitos-negocio.md`) exige "servidor redundante pronto para assumir em caso
de queda". O Drive `arquitetura-aws-lotus.md` §4 rebaixa para "RTO de minutos via redeploy +
restore de snapshot", sem data, autor nem aceite da Lotus — e o snapshot que ele cita não existe. A
emenda de 2026-09-26 da ficha diz que o gate é **confirmar o aceite da Lotus e replicar no
ADR-14**. Uma EC2 única não é declarada atendimento do RNF original em nenhum texto deste bloco.

## 2. Decisões

| # | Decisão | Origem |
|---|---|---|
| D1 | O bloco redige a proposta de revisão do `RNF-DIS-02` (sem redundância, RPO ≤ 24 h, RTO medido, HA como trilha futura com gatilho). O João envia e colhe o aceite. A emenda do ADR-14 entra no PR como **proposta** e é finalizada na lane de aceitação, com o número e o aceite. | João, P1 |
| D2 | O RTO sai **medido** do runbook §8.1.1 como está. Nenhum snapshot EBS, AMI ou RDS entra. | João, P2 |
| D3 | O restore cronometrado roda **sobre o volume real de produção, antes do go-live**. Regra escrita: havendo dado real de cliente, o passo cai para contêiner descartável no host e o RTO é declarado parcial. | João, P3 |
| D4 | P-05: **não consolidar**. As 30 migrations são histórico imutável; migration aplicada em prod nunca se reescreve. A conferência prova banco = código. A P-05 encerra no PR. | João, P4 |
| D5 | Tudo que o smoke cria leva o prefixo `SMOKE-GOLIVE`. Depois da prova o certificado é **revogado** pela UI e o resto **arquivado**. Nada se apaga: auditoria e numeração ficam íntegras. | João, P5 |
| D6 | D-37 e P-44 encerram pela prova de que produção está limpa (nenhum registro anterior a 2026-08-18, nenhum e-mail de sonda de dev). O banco de dev não é tocado. | João, P6 |
| D7 | Entrega = runbook §15 "Go-live" + `deploy/bin/conferir-golive.sh` só-leitura. O smoke é manual, pela UI, com admin real. | João, P7 |
| D8 | A proposta à Lotus é escrita em espanhol, versionada na pasta do bloco. | João, seção 1 |
| D9 | Escrita em produção é do João. A sessão desenha, lê e confere; nunca escreve em prod. | memória + aliases |

## 3. Escopo

**Dentro.**
- `deploy/bin/conferir-golive.sh` e a catraca dele.
- Runbook: §15 novo e a lista do `scp`/`mv` da §7 com o script novo.
- `docs/adrs.md`: emenda-proposta do ADR-14 e nota cruzada no ADR-09.
- `blocos/13-…/proposta-dis02.md`.
- `pendencias/`: P-05 encerrada no PR.
- Fase B em produção, pelo João, na ordem da §5.

**Fora.**
- HA, multi-AZ, ALB, snapshot EBS/AMI, volta ao RDS (fica como gatilho do ADR-09).
- Cofre gerenciado de segredos (`docs/operacao-segredos.md`); aqui só os nomes de chave.
- Alarme de falha de backup no CloudWatch e alarme de memória (D9 do item 34).
- Reseed do banco de dev; atualização do Drive e do Notion (decisão do João).
- Smoke automatizado com credencial guardada.
- Nenhuma mudança em PHP ou em tela.

## 4. Fase A — repositório

### 4.1 `deploy/bin/conferir-golive.sh`

Invocação no host: `sudo /opt/lotus/bin/conferir-golive.sh [--final]`.

**Contrato.**
- Só leitura. Nenhum `INSERT`, `UPDATE`, `DELETE`, DDL, `artisan` que escreva, `docker compose
  run` ou `up`. Lê pelos contêineres vivos do projeto `lotus` (`exec`), nunca sobe outro.
- `LOTUS_BASE` (default `/opt/lotus`) é o gancho da catraca, como no `verificar-backup.sh`.
- Do `.env` lê **nomes** de chave e o valor de `LOTUS_BACKUP_BUCKET`. Nenhum outro valor do `.env`
  aparece na saída, nem em erro.
- Roda **todas** as verificações, sem parar na primeira falha. Uma linha por verificação:
  `OK`, `FALHA`, `AVISO` ou `INFO`, seguida do nome e do detalhe. Sai 1 se houver ao menos uma
  `FALHA`; senão 0.
- Verificação que não consegue ler (MySQL fora, `aws` sem permissão) sai `FALHA` com o motivo.
  Nunca `OK` por omissão.
- Comentários em ASCII, sem acento, como `criar-oidc-e-role.sh` e `sondar-saude.sh`.

**Verificações.**

| Nome | O que compara | `OK` quando |
|---|---|---|
| `migrations` | nomes na tabela `migrations` × basenames de `database/migrations/*.php` dentro do contêiner `app` | os dois conjuntos são iguais; o detalhe imprime as duas contagens |
| `rbac` | nomes em `permissions` × `PermissionCatalog::descriptions()` lido no `app` | conjuntos iguais, as três roles de sistema existem e `superadmin` tem todas |
| `dados-antigos` (D-37) | `MIN(created_at)` das oito tabelas de `archived_with_parent` | toda tabela vazia ou com mínimo ≥ `2026-08-18` |
| `sondas-dev` (P-44) | `users` com e-mail `e2e.gate%`, `gate.fechamento@lotus.cl` ou `gate-bd9@gate.cl` | zero linhas |
| `env` | nomes de chave do `.env` × lista embutida no script | nenhuma chave da lista falta; chave a mais sai `AVISO`, não `FALHA` |
| `backup` | idade do objeto mais recente em `s3://$LOTUS_BACKUP_BUCKET/backups/` | ≤ 1 dia |
| `smoke` | entidades `SMOKE-GOLIVE` | sem `--final`: `INFO` com o que existe. Com `--final`: ao menos um certificado, todos com `revoked_at`, e cliente, curso, turma e aluno `SMOKE-GOLIVE` arquivados |

A lista de chaves do `env` é embutida porque `env.prod.example` não vai ao host. A catraca prende
a lista ao arquivo (§7, item 4): divergência reprova o CI.

As colunas exatas de `created_at`, arquivamento e vínculo certificado→aluno são resolvidas no
plano, lendo `docs/der-fisico.md` e as migrations; tabela sem `created_at` usa a coluna de
nascimento equivalente e o plano a nomeia.

### 4.2 Runbook

- **§7:** `conferir-golive.sh` entra no `scp` e no `mv`.
- **§15 "Go-live"** novo, com a sequência da §5 desta spec, os comandos exatos, onde anotar cada
  marco de tempo e a regra de risco do D3. Cita §7, §8.1.1, §8.3, §9 e §14 em vez de copiá-los.

### 4.3 ADRs

- **ADR-14**, emenda datada: `RNF-DIS-02` revisado **em proposta** — sem redundância; RPO ≤ 24 h
  pelo dump diário; RTO = valor medido no go-live; HA (RDS multi-AZ + segunda EC2 atrás de ALB)
  como trilha futura, com gatilho "cliente exigir RTO/RPO menor ou indisponibilidade acima do RTO
  declarado". Status: *aguardando aceite da Lotus*. O texto diz explicitamente que a EC2 única
  **não** atende o RNF original.
- **ADR-09**, nota cruzada apontando para a emenda do ADR-14.

### 4.4 Proposta à Lotus

`blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md`, em espanhol: o que o
requisito pede, o que a arquitetura entrega, RPO, RTO, o que se perde num restore, a trilha de HA
e o pedido de aceite. O valor do RTO é um campo marcado `<RTO medido>`, preenchido na Fase B,
passo 9 — é lacuna de projeto, não pendência de redação.

### 4.5 Pendências

P-05 sai de `abertas.md` para `encerradas.md` com a D4. D-37 (backlog) e P-44 ficam abertas até a
lane de aceitação, que as encerra com a saída do `conferir-golive.sh --final`.

## 5. Fase B — produção, depois do merge e do espelho

Quem roda é o João; a sessão lê e confere. É a ordem do runbook §15.

1. **Instalar e promover.** Reinstalação pelo §7 com o script novo; promover o SHA mesclado pelo
   botão.
2. **Linha de base.** `conferir-golive.sh`. `rbac` em `FALHA` → §8.3 e conferir de novo. `env` em
   `FALHA` → corrigir o `.env`, promover, conferir de novo. `smoke` sai `INFO`.
3. **Smoke pela UI, sobre HTTPS, com admin real.** Cliente, cotação, curso, turma, matrícula,
   resultado, conclusão e certificado, tudo `SMOKE-GOLIVE`. Abrir o QR fora da sessão: a validação
   pública mostra emitido. Anotar o uuid; `GET /api/publico/certificados/<uuid>` → 200.
4. **Dump manual.** `backup-db.sh` com rótulo `golive`. O certificado consta no dump
   (`certificates` ≥ 1 na contagem do §9).
5. **Restore cronometrado sobre o volume real** (D3), pelo §8.1.1 com esse dump. Marcos: `t0`
   início do download; `t1` parada de `app`/`scheduler`; `t2` primeiro `/up` 200 depois da
   promoção. RTO declarado = `t2 − t0`; cada etapa anotada.
6. **Pós-restore.** A validação pública do uuid continua emitido e o PDF baixa do S3. Prova que
   certificado emitido antes do dump sobrevive ao restore.
7. **Limpeza.** Revogar o certificado pela UI e arquivar o resto (D5). A validação mostra revogado.
8. **Final.** `conferir-golive.sh --final` sai 0, todo `OK`.
9. **Proposta.** O João preenche o RTO, envia à Lotus e registra a resposta. A lane de aceitação
   finaliza a emenda do ADR-14, encerra D-37 e P-44 e remove a ficha 13 do backlog.

## 6. Falhas e recuo

- **Restore falha no passo 5.** Repetir o passo 4 do §8.1.1 inteiro (o `DROP` limpa carga
  parcial). Persistindo, carregar o dump "antes" pelo mesmo procedimento. Restore que falha é
  gatilho do ADR-09 (volta ao RDS) e bloqueia o go-live: registrar e parar.
- **Certificado some depois do restore (passo 6).** O bloco não passa: é perda legal. Parar e
  investigar antes de qualquer outra coisa.
- **`migrations` em `FALHA`.** Banco e código divergem. Não promover nada; investigar pelo ledger.
- **`dados-antigos` ou `sondas-dev` em `FALHA`.** Houve importação de dev. D-37 volta a pedir
  conferência caso a caso nas oito tabelas, e o D6 cai: parar e voltar ao João.
- **Aceite recusado.** A emenda do ADR-14 fica como "recusada", o go-live não é declarado pronto e
  HA vira ficha nova no backlog, por PR de docs. Decisão do João.

## 7. Catracas (lição 19)

Em `frontend/tests/conferir-golive.test.ts`, executando o script de verdade com `docker` e `aws`
falsos no `PATH` e `LOTUS_BASE` temporário:

1. Fixture boa: sai 0, uma linha `OK` por verificação.
2. Cada verificação vista reprovar isolada: a fixture estraga só aquela, a linha sai `FALHA` e o
   script sai 1 — e as outras continuam rodando.
3. Leitor indisponível (`docker`/`aws` falso saindo diferente de zero): `FALHA`, nunca `OK`.
4. A lista embutida de chaves é igual às chaves de `deploy/aws/env.prod.example`.
5. Sentinela secreta no valor de uma chave do `.env` nunca aparece em stdout nem em stderr.
6. `--final`: certificado sem `revoked_at` ou entidade não arquivada → `FALHA`.
7. Nenhum comando de escrita: os falsos registram as chamadas, e o teste reprova `INSERT`,
   `UPDATE`, `DELETE`, `DROP`, `run` e `up`.

## 8. Limites e riscos declarados

- **O passo 5 apaga o banco de produção.** Só é aceitável porque o dump tem minutos, a cópia
  "antes" fica no S3 e ainda não há dado real de cliente (D3).
- **O RTO medido é de um banco pequeno.** Cresce com o volume; o ADR-14 registra a data e o
  tamanho do dump da medição.
- **RPO ≤ 24 h significa perder até um dia de certificados num desastre.** A proposta diz isso com
  todas as letras.
- **O aceite da Lotus está fora do controle do repositório.** O bloco pode ficar `blocked` por
  tempo indeterminado aguardando a resposta.
- **Smoke manual** depende de quem executa seguir o roteiro; a rodada `--final` é a rede.

## 9. Definition of Done — comportamento provado

1. Catracas da §7 verdes, cada uma vista reprovar; `pnpm lint`, `pnpm test`, `pnpm build`.
2. Suíte PHP verde (nada de PHP muda; prova de não-regressão).
3. Runbook §7 e §15, ADR-14/ADR-09, proposta e P-05 commitados.
4. Fase B: linha de base, smoke, restore cronometrado com certificado sobrevivente, limpeza e
   `--final` todo `OK`, lidos pela sessão.
5. RTO medido e aceite (ou recusa) da Lotus registrados; emenda do ADR-14 finalizada.

## 10. Handoff

A Fase A roda na lane pelo `/executar-bloco`. A PR mescla com o bloco `blocked`, aguardando
aceitação (invariante 11). A Fase B roda em produção depois do merge e do espelho, pelo João,
seguindo o runbook §15. A lane de aceitação registra os resultados na `aceitacao.md`, finaliza a
emenda do ADR-14, encerra D-37 e P-44 e remove a ficha 13.

## Verificação externa

Todos os itens só existem depois do merge e do espelho. O procedimento é o runbook §15; a ordem é a
da §5.

1. Script instalado pela §7 e SHA do merge promovido pelo botão (§5, passo 1).
   - prova: `producao GET /up -> 200`
2. Linha de base do `conferir-golive.sh` sem `FALHA`, com roles e `.env` corrigidos se preciso
   (§5, passo 2).
   - prova: nenhuma
3. Smoke ponta a ponta sobre HTTPS, de cotação até validação pública do certificado; uuid anotado
   no Resultado (§5, passo 3).
   - prova: `producao GET /sanctum/csrf-cookie -> 204`
4. Dump manual com o certificado e restore cronometrado sobre o volume real; certificado
   sobrevivente; RTO e etapas anotados (§5, passos 4 a 6).
   - prova: `producao GET /up -> 200`
5. Certificado revogado, sondas arquivadas e `conferir-golive.sh --final` todo `OK` (§5, passos 7
   e 8).
   - prova: nenhuma
6. Proposta enviada à Lotus com o RTO medido e a resposta registrada (§5, passo 9).
   - prova: nenhuma
