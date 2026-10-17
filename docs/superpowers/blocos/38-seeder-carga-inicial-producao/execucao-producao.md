# Bloco 38 — roteiro da carga inicial em produção

> Quem executa é o João; Claude prepara e confere cada saída (escrita remota é bloqueada no auto
> mode). Spec §9. A pasta de dados tem dado pessoal: ela nunca entra no git, no `backend/` nem na
> imagem, e sai do host no fim.

## Contagens aprovadas (relatório de 2026-10-17, ensaio na stack da lane)

| Entidade | Quantidade |
|---|---|
| clientes | 1 |
| alunos | 59 |
| redatores | 3 |
| documentos | 8 |
| cursos | 6 |
| módulos | 32 |
| orçamentos | 12 |
| cotações | 12 (10 aprovadas, 2 pendentes) |
| turmas | 10 |
| matrículas | 111 |
| certificados | 111 |

Linhas no recorte: 127; recusadas: 16 (o João aceitou 111 em vez da estimativa de 116 — dois RUTs
com grafia diferente entre SCAPs saem inteiros pela regra R4).

Tabelas, depois da carga, contadas a partir de um banco só com os usuários criados antes: `users`
+63, `clients` 1, `client_addresses` 1, `client_contacts` 1, `students` 59, `student_client_logs`
59, `redatores` 3, `course_redator` 8, `files` 8, `courses` 6, `course_modules` 32, `budgets` 12,
`quotes` 12, `turmas` 10, `turma_redator` 10, `enrollments` 111, `certificates` 111,
`certificate_sequences` 0.

## Atalho usado em todos os passos

Todo comando que fala com o Docker roda como root, inteiro dentro de `sudo -i sh -c '…'` com aspas
**simples** (runbook `deploy/aws/README.md` §8.3). Para não repetir, os passos abaixo escrevem
`<COMPOSE>` no lugar de:

```
cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml
```

Exemplo completo, o `--simular` do passo 4:

```bash
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml run --rm -v /opt/lotus/carga-inicial:/carga:ro app php artisan lotus:carga-inicial /carga --simular'
```

## 1. Pré-condições

- A aceitação do bloco 13 está fechada: o banco foi limpo, e a carga roda **depois** dela (o restore
  do bloco 13 apagaria o que a carga gravasse).
- Os usuários do João e do cliente já foram criados.
- A imagem com este bloco está promovida: `cat /opt/lotus/CURRENT_SHA` aponta para um SHA que
  contém o merge do bloco 38.
- Nenhum usuário criado à mão usa o RUT do cliente (`77.117.942-8`), nem o RUT ou o e-mail de um
  dos 3 redatores (estão no `relatorio.md`). Se usar, o `--simular` acusa conflito no passo 4.

## 2. Contagem por tabela antes da carga

```bash
sudo -i sh -c '<COMPOSE> run --rm app php artisan db:show --counts'
```

Claude confere: só existem os usuários esperados, e `budgets`, `quotes`, `turmas`, `enrollments`,
`certificates`, `students`, `courses` e `redatores` estão vazias. Orçamento com id entre 176 e 187
é conflito previsível — pare.

## 3. A pasta de dados no host

Do WSL, com o `.pem` da §6 do runbook:

```bash
PEM=~/.ssh/<o .pem da §6>
scp -i "$PEM" -r /home/jvbat/lotus-carga-inicial-38 ubuntu@<EIP>:/tmp/carga-inicial
```

No host:

```bash
sudo rm -rf /opt/lotus/carga-inicial
sudo mv /tmp/carga-inicial /opt/lotus/carga-inicial
sudo chown -R root:root /opt/lotus/carga-inicial
sudo chmod -R a+rX /opt/lotus/carga-inicial
```

O `a+rX` deixa o usuário do container ler; o `/opt/lotus` (`750 root:root`) já fecha o acesso no
host. O `complemento.json` vai junto, sem uso pela carga; pode ficar de fora se preferir.

## 4. Ensaio (`--simular`)

```bash
sudo -i sh -c '<COMPOSE> run --rm -v /opt/lotus/carga-inicial:/carga:ro app php artisan lotus:carga-inicial /carga --simular'
```

Esperado: saída `0`, a tabela "Simulação (nada é gravado)" com "A criar" igual às contagens
aprovadas acima e "Já existe" zerado, e nenhuma linha de conflito. Saída `1` ou qualquer conflito:
pare e mostre a Claude.

## 5. Backup manual

```bash
sudo /opt/lotus/bin/backup-db.sh
```

Esperado: `backup ok: s3://…`. Anote o caminho; é o rollback.

## 6. Carga real e segunda execução

```bash
sudo -i sh -c '<COMPOSE> run --rm -v /opt/lotus/carga-inicial:/carga:ro app php artisan lotus:carga-inicial /carga'
sudo -i sh -c '<COMPOSE> run --rm app php artisan db:show --counts'
sudo -i sh -c '<COMPOSE> run --rm -v /opt/lotus/carga-inicial:/carga:ro app php artisan lotus:carga-inicial /carga'
```

Esperado:

- a primeira carga sai `0` com a tabela "Carga gravada" igual às contagens aprovadas;
- o `db:show --counts` mostra as tabelas da seção "Contagens aprovadas", somadas ao que existia no
  passo 2;
- a segunda carga sai `0` com "A criar" = 0 em todas as linhas (a linha `modulos` não aparece:
  curso existente não toca os módulos).

Se a carga real falhar, ela imprime "Arquivos gravados no disco sem linha no banco:" com os
caminhos no S3; nada fica no banco. Mostre a saída a Claude antes de repetir.

## 7. Amostra: `/validar` e PDF

Um certificado de cada curso, pelo `codigo`: `LOT-2026-001` (051#), `LOT-2026-017` (035#),
`LOT-2026-021` (201#), `LOT-2026-038` (200#, dois dias) e `LOT-2026-055` (202#). Na tela de
certificados, abra cada um, baixe o PDF e abra o link de validação (o QR leva a
`/validar/<uuid>`). Confira no PDF: o nome impresso, o código, os dois dias no 200# e a página de
temário.

## 8. Remover a pasta de dados

```bash
sudo rm -rf /opt/lotus/carga-inicial
sudo ls /opt/lotus
```

Esperado: `carga-inicial` não aparece. A cópia local em `/home/jvbat/lotus-carga-inicial-38/` sai
quando o João der a carga por aceita.

## Rollback

Restaurar o dump do passo 5 pelo runbook `deploy/aws/README.md` §8.1.1. Os 8 documentos que a carga
subiu ao S3 ficam órfãos depois do restore; são inofensivos.
