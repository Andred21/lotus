# Prova do DoD — item 30 `harness-estado-por-bloco`: `abrir` e `fechar` com stack real

> Task 9 do plano `plans/2026-09-26-harness-estado-por-bloco.md`, roteiro da spec §4.6. Clone
> descartável em `/tmp/lotus-prova-30.1hcwxb`; o repositório real ficou intocado. Cada seção cola a
> saída literal do comando.

- **Data:** 2026-09-26
- **Ponta do 30 usada:** `faec2e02` (`git -C "$PROVA/lotus" log -1 --format=%h HEAD^2` do merge do Step 1); `main` do clone em `e5ac01a9`
- **Versões:** git 2.43.0 · Docker Compose v5.5.1 · pnpm 11.23.0

**Primeira tentativa interrompida.** Na primeira rodada (clone `/tmp/lotus-prova-30.3oIuBE`), os
Steps 1 e 2 passaram. No Step 3, com o `docker compose up -d` da lane 33 em curso, o WSL reiniciou:
uptime de 1 minuto, todos os contêineres em `Exited (255)`, inclusive os stacks `lotus` e
`lotus-infra`, que estavam de pé. Pressão de memória é a causa provável: era o terceiro stack
completo, com clamav, numa VM de 12 GB. O reinício limpou o `/tmp`, o clone foi junto e ficaram
só os contêineres, volumes, rede e imagem da lane 33, removidos pelo label do projeto. Com o João
de acordo, a prova foi refeita do Step 1 com os outros stacks parados. A memória disponível foi
vigiada durante o Step 3 e não desceu de 1,5 GB. A rodada abaixo é a segunda, completa.

**Risco para o DoD do 31:** subir o stack de uma lane nova com dois stacks já de pé derrubou o WSL
uma vez. O `abrir` não sobe stack; o `docker compose up -d` é passo manual. Quem sobe o quarto
stack precisa ver a memória antes.

## 1. Clone com a ponta do 30 mesclada na `main` dele

```bash
PROVA=$(mktemp -d "${TMPDIR:-/tmp}/lotus-prova-30.XXXXXX"); echo "$PROVA"
git clone -q --branch main /home/jvbat/projetos/lotus "$PROVA/lotus"
git -C "$PROVA/lotus" merge -q --no-ff origin/chore/30-harness-estado-por-bloco -m 'merge: ponta do item 30 (prova)'
echo "merge exit=$?"
```

```
/tmp/lotus-prova-30.1hcwxb
Auto-merging docs/superpowers/backlog.md
Auto-merging docs/superpowers/pendencias/README.md
Auto-merging docs/superpowers/pendencias/abertas.md
Auto-merging docs/superpowers/state.md
CONFLICT (content): Merge conflict in docs/superpowers/state.md
Automatic merge failed; fix conflicts and then commit the result.
merge exit=1
```

O merge conflitou em `docs/superpowers/state.md`: a `main` andou depois do `lane_base` (o item 12 fechou na lane-b). O `lane.sh` não lê o `state.md` (só o cita em comentário), então o conflito foi resolvido no clone com a versão da branch, e o resto do Step 1 seguiu o plano:

```bash
git -C "$PROVA/lotus" checkout --theirs docs/superpowers/state.md && git -C "$PROVA/lotus" add docs/superpowers/state.md && git -C "$PROVA/lotus" commit -q --no-edit -m 'merge: ponta do item 30 (prova)' && echo 'conflito em state.md resolvido no clone com a versao da branch (--theirs); lane.sh nao le state.md'
git -C "$PROVA/lotus" log -1 --format='merge=%h pais=%p'
cp /home/jvbat/projetos/lotus/backend/.env "$PROVA/lotus/backend/.env"
cp /home/jvbat/projetos/lotus/frontend/.env "$PROVA/lotus/frontend/.env"
git -C "$PROVA/lotus" worktree add -q -b infra/antiga-1 "$PROVA/lotus-antiga-1" main
git -C "$PROVA/lotus" worktree add -q -b refactor/antiga-2 "$PROVA/lotus-antiga-2" main
printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$PROVA/lotus-antiga-1/.env"
printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$PROVA/lotus-antiga-2/.env"
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh descobrir | cat -v)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8083/up
```

```
Updated 1 path from the index
conflito em state.md resolvido no clone com a versao da branch (--theirs); lane.sh nao le state.md
merge=1952cf2b pais=e5ac01a9 faec2e02
orfa^_/tmp/lotus-prova-30.1hcwxb/lotus-antiga-1^_infra/antiga-1
orfa^_/tmp/lotus-prova-30.1hcwxb/lotus-antiga-2^_refactor/antiga-2
000
```

## 2. Abrir a lane 33

```bash
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus); echo "exit=$?"
L="$PROVA/lotus-33-harness-sinal-de-contexto-cheio"
grep '^LOTUS_DEV_' "$L/.env"
cat "$L/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md"
```

```
PORTAO OK: chore/33-harness-sinal-de-contexto-cheio pode abrir em /tmp/lotus-prova-30.1hcwxb/lotus-33-harness-sinal-de-contexto-cheio, offset +3
✓ Lockfile passes supply-chain policies (verified 8h ago)
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +323
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Packages are hard linked from the content-addressable store to the virtual store.
  Content-addressable store is at: /home/jvbat/.local/share/pnpm/store/v11
  Virtual store is at:             node_modules/.pnpm
Progress: resolved 323, reused 323, downloaded 0, added 323, done

dependencies:
+ @fontsource/archivo 5.3.0
+ @fontsource/ibm-plex-mono 5.3.0
+ @fontsource/inter 5.3.0
+ @tanstack/react-query 5.101.1
+ axios 1.18.1
+ flag-icons 7.5.0
+ i18next 26.3.4
+ i18next-browser-languagedetector 8.2.1
+ primeicons 7.0.0
+ primereact 10.9.8
+ react 19.2.7
+ react-dom 19.2.7
+ react-i18next 17.0.8
+ react-router-dom 7.18.2
+ recharts 3.10.1
+ tailwindcss-primeui 0.6.1
+ zustand 5.0.14

devDependencies:
+ @eslint/js 10.0.1
+ @tailwindcss/vite 4.3.2
+ @testing-library/dom 10.4.1
+ @testing-library/react 16.3.2
+ @types/node 24.13.2
+ @types/react 19.2.17
+ @types/react-dom 19.2.3
+ @vitejs/plugin-react 6.0.3
+ eslint 10.6.0
+ eslint-plugin-react-hooks 7.1.1
+ eslint-plugin-react-refresh 0.5.3
+ globals 17.7.0
+ jsdom 30.0.1
+ tailwindcss 4.3.2
+ typescript 6.0.3
+ typescript-eslint 8.62.0
+ vite 8.1.0
+ vitest 4.1.11

Done in 1.9s using pnpm v11.23.0
LANE ABERTA: chore/33-harness-sinal-de-contexto-cheio em /tmp/lotus-prova-30.1hcwxb/lotus-33-harness-sinal-de-contexto-cheio
  portas: HTTP 8083, DB 3310, Mailpit 8028, MinIO 9006/9007, Vite 5176
  proximo passo, quando o bloco precisar do stack: (cd /tmp/lotus-prova-30.1hcwxb/lotus-33-harness-sinal-de-contexto-cheio && docker compose up -d)
exit=0
LOTUS_DEV_HTTP_PORT=8083
LOTUS_DEV_DB_PORT=3310
LOTUS_DEV_MAILPIT_PORT=8028
LOTUS_DEV_MINIO_PORT=9006
LOTUS_DEV_MINIO_CONSOLE_PORT=9007
LOTUS_DEV_VITE_PORT=5176
---
schema_version: 3
id: 33
slug: 33-harness-sinal-de-contexto-cheio
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
resume_state: null
active_spec: null
active_plan: null
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: null
executor: null
branch: chore/33-harness-sinal-de-contexto-cheio
worktree: ../lotus-33-harness-sinal-de-contexto-cheio
offset: 3
lane_base: 1952cf2b
commit: 1952cf2b
blocker: null
updated_at: 2026-09-26T06:41:58-03:00
updated_by: jvbat@DESKTOP-U9PVHKH / opus
---

# Bloco 33 — estado

Aberto por lane.sh abrir. O contrato dos campos esta em docs/superpowers/state.md.
```

## 3. Stack da lane de pé e `/up` na 8083

```bash
(cd "$L" && docker compose up -d); echo "up exit=$?"
(cd "$L" && docker compose exec -T app composer install --no-interaction --quiet); echo "composer exit=$?"
curl -fsS -o /dev/null -w '%{http_code}\n' --retry 30 --retry-delay 2 --retry-all-errors http://localhost:8083/up
(cd "$L" && docker compose port nginx 80)
```

```
 Image lotus-33-harness-sinal-de-contexto-cheio-app Building 
#1 [internal] load local bake definitions
#1 reading from stdin 721B done
#1 DONE 0.0s

#2 [internal] load build definition from Dockerfile
#2 transferring dockerfile: 602B done
#2 DONE 0.2s

#3 [internal] load metadata for docker.io/library/php:8.3-fpm-alpine
#3 DONE 0.3s

#4 [internal] load metadata for docker.io/library/composer:2
#4 DONE 1.4s

#5 [internal] load .dockerignore
#5 transferring context: 1.83kB done
#5 DONE 0.2s

#6 [internal] load build context
#6 transferring context: 1.07kB 0.0s done
#6 DONE 0.7s

#7 FROM docker.io/library/composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7
#7 resolve docker.io/library/composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7
#7 ...

#8 [stage-0 1/7] FROM docker.io/library/php:8.3-fpm-alpine@sha256:bf90236449d333cef008b1f01c72a3d4f11a6470a74629665e4c6b6158f03fc8
#8 resolve docker.io/library/php:8.3-fpm-alpine@sha256:bf90236449d333cef008b1f01c72a3d4f11a6470a74629665e4c6b6158f03fc8 0.9s done
#8 DONE 1.1s

#8 [stage-0 1/7] FROM docker.io/library/php:8.3-fpm-alpine@sha256:bf90236449d333cef008b1f01c72a3d4f11a6470a74629665e4c6b6158f03fc8
#8 DONE 1.1s

#7 FROM docker.io/library/composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7
#7 resolve docker.io/library/composer:2@sha256:9715c7f69044da2a212a5fbde29ee7da24e364d426560ae6367b060236f847d7 0.6s done
#7 DONE 1.1s

#9 [stage-0 6/7] COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/zz-uploads.ini
#9 CACHED

#10 [stage-0 4/7] RUN addgroup -g 1000 appuser  && adduser -D -u 1000 -G appuser appuser
#10 CACHED

#11 [stage-0 5/7] WORKDIR /var/www
#11 CACHED

#12 [stage-0 2/7] RUN apk add --no-cache libzip-dev icu-dev oniguruma-dev libpng-dev poppler-utils  && docker-php-ext-install pdo_mysql gd zip intl bcmath
#12 CACHED

#13 [stage-0 3/7] COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
#13 CACHED

#14 [stage-0 7/7] COPY docker/php/memory-cli.ini /usr/local/etc/php/conf.d/zz-memory-cli.ini
#14 CACHED

#15 exporting to image
#15 exporting layers done
#15 exporting manifest sha256:3e6c0754d91a9264fd1dbc0e1f54470bc8325e05ad0fd94713ca6d88ca07a40b 0.1s done
#15 exporting config sha256:8e694887eb275a8b7f3b445dd2aad69e971fa12c995b7543f80c99e6a29ff2ee
#15 exporting config sha256:8e694887eb275a8b7f3b445dd2aad69e971fa12c995b7543f80c99e6a29ff2ee 0.1s done
#15 exporting attestation manifest sha256:47ba9126b8d767bcda9e1e48dede6822844fc4b0afa72835673e7d381646e431
#15 exporting attestation manifest sha256:47ba9126b8d767bcda9e1e48dede6822844fc4b0afa72835673e7d381646e431 0.3s done
#15 exporting manifest list sha256:9f7c166d1108505440e1efeefe70011a9221570f73eaaab9d6351a8303ed6dc6
#15 exporting manifest list sha256:9f7c166d1108505440e1efeefe70011a9221570f73eaaab9d6351a8303ed6dc6 0.2s done
#15 naming to docker.io/library/lotus-33-harness-sinal-de-contexto-cheio-app:latest
#15 naming to docker.io/library/lotus-33-harness-sinal-de-contexto-cheio-app:latest 0.0s done
#15 unpacking to docker.io/library/lotus-33-harness-sinal-de-contexto-cheio-app:latest
#15 unpacking to docker.io/library/lotus-33-harness-sinal-de-contexto-cheio-app:latest 1.0s done
#15 DONE 2.0s

#16 resolving provenance for metadata file
#16 DONE 0.0s
 Image lotus-33-harness-sinal-de-contexto-cheio-app Built 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Creating 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Creating 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Creating 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Creating 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Creating 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Creating 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Created 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Created 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Created 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Created 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Created 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Creating 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Created 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Started 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Starting 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Started 
up exit=0
composer exit=0
200
0.0.0.0:8083
FIM
```

## 4. `fechar` recusado com a branch não mesclada, stack de pé

```bash
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh fechar 33); echo "exit=$?"
(cd "$L" && docker compose ps --format '{{.Service}} {{.State}}')
```

```
PORTAO RECUSOU: a branch chore/33-harness-sinal-de-contexto-cheio nao esta mesclada na main; fechar agora apagaria commits
exit=1
app running
clamav running
gotenberg running
mailpit running
minio running
mysql running
nginx running
```

## 5. Lane mesclada na `main` do clone (simula a PR) e `fechar`

```bash
git -C "$PROVA/lotus" merge -q --no-ff chore/33-harness-sinal-de-contexto-cheio -m 'merge: lane 33 (simula a PR)'; echo "merge exit=$?"
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh fechar 33); echo "exit=$?"
```

```
merge exit=0
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-createbuckets-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-nginx-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-mailpit-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-app-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Stopping 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-gotenberg-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-minio-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-clamav-1 Removed 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Stopped 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Removing 
 Container lotus-33-harness-sinal-de-contexto-cheio-mysql-1 Removed 
 Image lotus-33-harness-sinal-de-contexto-cheio-app:latest Removing 
 Dangling images Removing 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Removing 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Removing 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Removing 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-db Removed 
 Volume lotus-33-harness-sinal-de-contexto-cheio_lotus-minio Removed 
 Image lotus-33-harness-sinal-de-contexto-cheio-app:latest Removed 
 Network lotus-33-harness-sinal-de-contexto-cheio_default Removed 
 Dangling images Removed 
LANE FECHADA: chore/33-harness-sinal-de-contexto-cheio, arvore /tmp/lotus-prova-30.1hcwxb/lotus-33-harness-sinal-de-contexto-cheio removida
exit=0
```

## 6. Nada sobrou

```bash
P=lotus-33-harness-sinal-de-contexto-cheio
echo "conteineres: [$(docker ps -a --filter "label=com.docker.compose.project=$P" --format '{{.Names}}')]"
echo "volumes: [$(docker volume ls --filter "label=com.docker.compose.project=$P" --format '{{.Name}}')]"
echo "imagens: [$(docker image ls --filter "label=com.docker.compose.project=$P" --format '{{.Repository}}')]"
echo "redes: [$(docker network ls --filter "label=com.docker.compose.project=$P" --format '{{.Name}}')]"
git -C "$PROVA/lotus" worktree list
echo "branch: [$(git -C "$PROVA/lotus" branch --list 'chore/33-*')]"
ls -d "$L" 2>&1
```

```
conteineres: []
volumes: []
imagens: []
redes: []
/tmp/lotus-prova-30.1hcwxb/lotus           fd8bf278 [main]
/tmp/lotus-prova-30.1hcwxb/lotus-antiga-1  1952cf2b [infra/antiga-1]
/tmp/lotus-prova-30.1hcwxb/lotus-antiga-2  1952cf2b [refactor/antiga-2]
branch: []
ls: cannot access '/tmp/lotus-prova-30.1hcwxb/lotus-33-harness-sinal-de-contexto-cheio': No such file or directory
```

## Veredito

Os sete pontos do roteiro da §4.6 que esta prova cobre:

1. Duas worktrees irmãs com `.env` em +1 e +2 aparecem como órfãs, e nenhuma lane viva. **Step 1.**
2. `abrir 33 chore harness-sinal-de-contexto-cheio` reserva **+3** e grava as seis portas no `.env` da lane, com o `estado.md` semeado com `offset: 3`. **Step 2.**
3. `docker compose up -d` na lane e `/up` responde **200 na 8083**, com o nginx publicado em `0.0.0.0:8083`. **Step 3.**
4. `fechar` recusado com a branch não mesclada: `exit=1` e o stack continua `running`. **Step 4.**
5. A lane é mesclada na `main` do clone e o `fechar` passa limpo, com `down -v --rmi local` e `LANE FECHADA`. **Step 5.**
6. Nenhum contêiner, volume, imagem ou rede sobrou do projeto `lotus-33-…`. **Step 6.**
7. A worktree e a branch `chore/33-*` somem, e o `worktree list` do clone volta às três árvores. **Step 6.**
