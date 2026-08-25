# Evidências — CI de governança e artefato imutável

> Bloco `cicd-ci-governanca-e-artefato` · item 11 · 2026-08-24
> Cada seção prova um item do DoD da spec §7.

## DoD 1 — sonda da D-08 (lei §5.3)

**Antes:** o único guardião do `generated.ts` era `globalIgnores` no
`eslint.config.js:158`, que só tira o arquivo do corte do lint. Editar à mão passava verde.

| Passo | Run | Resultado |
|---|---|---|
| gate verde de partida | [32797133739](https://github.com/Andred21/lotus/actions/runs/32797133739) | `types-drift` PASS |
| `generated.ts` editado à mão — **falso verde** | [32797276027](https://github.com/Andred21/lotus/actions/runs/32797276027) | `types-drift` PASS (gate não mordeu) |
| gate corrigido, sonda ainda no lugar | [32797778156](https://github.com/Andred21/lotus/actions/runs/32797778156) | `types-drift` **FAIL** |
| sonda revertida | [32797947563](https://github.com/Andred21/lotus/actions/runs/32797947563) | `types-drift` PASS |

**O falso verde é o achado, e ele custou o gate original.** O mecanismo desenhado no plano era
`php artisan typescript:transform` seguido de `git diff --exit-code`. Medido nos dois ambientes —
no runner e dentro do container do compose — o transformer é **incremental**: guarda o hash da
saída em `frontend/src/shared/types/typescript-transformer-manifest.json` e **não reescreve nada**
quando as classes PHP não mudaram. Uma linha acrescentada à mão sobreviveu ao comando; uma
declaração existente alterada (`view: 'admin'` → `view: 'HACKED'`) também sobreviveu. Um gate que
regenera por cima do manifesto não enxerga edição manual — que é exatamente o que a lei §5.3 proíbe.

Correção: apagar o par (saída + manifesto) antes do transform, forçando a regeneração do zero, e
julgar o diretório inteiro no diff. Foi essa versão que reprovou.

Linha de erro exata, do run `32797778156`:

```
::error file=frontend/src/shared/types/generated.ts::generated.ts diverge do que typescript:transform produz. Corrija o DTO no backend e regenere; nao edite o arquivo.
-export type SondaD08 = "editado a mao";
```

**Escopo do que fecha:** somente a §5.3. As §5.1/§5.2 já têm `PersistenceLawsTest` e a §5.6 tem
`no-restricted-imports`; §5.4, §5.5, §5.7 e §5.8 seguem sem guarda e não entram como promessa.

## Achado colateral — o path do frontend estava preso ao compose

O primeiro run do job `backend` ([32796740392](https://github.com/Andred21/lotus/actions/runs/32796740392))
reprovou com `Failed asserting that file "/frontend/src/shared/config/locales/en.json" exists`. O
literal `/frontend` é o mount do compose; no runner não existe. O
`TypeScriptTransformerServiceProvider` carregava o mesmo literal, então o `types-drift` teria
quebrado pelo mesmo motivo antes de ser escrito. `App\Shared\Support\FrontendPath` passou a ser o
dono único da raiz: `/frontend` quando existe, `base_path('../frontend')` quando não, sem fallback
silencioso.

## Custo medido — run `32796975205` (gates de correção)

| Job | Duração |
|---|---|
| `backend` | 1m14s |
| `frontend` | 1m45s |

## DoD 2 — commit reprovado não publica

Provado no gatilho real, em `main`, com a CI já mesclada (PR #71, merge `7fa1cb0a`).

| SHA em `main` | `types-drift` | `image` | Imagem no GHCR |
|---|---|---|---|
| [`7fa1cb0a`](https://github.com/Andred21/lotus/actions/runs/32801617073) (merge do PR #71) | pass | success | par publicado |
| [`1d97f59f`](https://github.com/Andred21/lotus/actions/runs/32802067520) (sonda vermelha) | **failure** | **skipped** | `manifest unknown` |
| [`11c8914f`](https://github.com/Andred21/lotus/actions/runs/32802264365) (revert da sonda) | pass | success | par novo publicado |

A sonda foi uma linha acrescentada à mão em `generated.ts` — a mesma violação da lei §5.3 — e o
`image` declara `needs: [backend, frontend, types-drift, audit-prod]`. O gate é mecânico: nenhuma
decisão humana separa o commit reprovado do registry. Saída literal do registry para o SHA vermelho:

```
$ docker manifest inspect ghcr.io/andred21/lotus-app:1d97f59f28152e93796c0883837b735d5d043b4b
manifest unknown
$ docker manifest inspect ghcr.io/andred21/lotus-web:1d97f59f28152e93796c0883837b735d5d043b4b
manifest unknown
```

Nota: `audit-dev` reprovou nos três runs e nenhum deles mudou de conclusão por causa disso — é o
`continue-on-error` no nível do job funcionando como a spec §6 desenhou. Ele reporta, nunca decide.

## DoD 3 — o par, no mesmo SHA

```
ghcr.io/andred21/lotus-app:7fa1cb0a24beb17b993aa5c7c046cc7eb6acab82
  sha256:b55c1b32b2dfc2d4c26f22de0128c273faad59ebc0d95528f1162c362028f051
ghcr.io/andred21/lotus-web:7fa1cb0a24beb17b993aa5c7c046cc7eb6acab82
  sha256:bd652d55158a3d24e2af2d05630f29d8377d4459fc0eff02be822272801e7a74
```

`latest` não existe em nenhuma das duas imagens — `docker manifest inspect ...:latest` responde
`manifest unknown`. A tag é sempre o `github.sha` completo, então o artefato é imutável e a
promoção por SHA do item 12 não fica ambígua.

Release é o **par**, não uma imagem: `docker-compose.prod.yml:23,36` consome `LOTUS_IMAGE` e
`LOTUS_WEB_IMAGE` como variáveis independentes, e as duas precisam apontar para o mesmo SHA.

## DoD 4 — `--frozen-lockfile` sobrevive

O job `frontend` instala com `pnpm install --frozen-lockfile` e passa em todos os runs acima: o
`pnpm-lock.yaml` commitado é resolvível pela versão declarada em `packageManager`
(`pnpm@11.23.0`), sem reescrita do lock durante a instalação.

## Fatia 2 — `Gatika-CL/lotus` recebeu a CI; a protection não pôde ser aplicada

`Gatika-CL/lotus` criado privado e vazio pelo João em 2026-08-24; `upstream` configurado e `main`
empurrada. O workflow rodou uma vez antes de qualquer protection — é o que ensina os nomes dos
checks ao GitHub, e é por isso que a ordem desta fatia não é preferência.

Run [32802872714](https://github.com/Gatika-CL/lotus/actions/runs/32802872714) (`11c8914f`, push em
`main`): seis jobs, `image` inclusive. Nomes lidos de
`GET /repos/Gatika-CL/lotus/commits/11c8914f/check-runs`, exatamente os seis esperados:

```
audit-dev
audit-prod
backend
frontend
image
types-drift
```

Par publicado no registry corporativo, digests do log do job `image`:

```
ghcr.io/gatika-cl/lotus-app:11c8914fc35018e6445c551caa1e70147d496e06
  sha256:f678de8c9637a092232b1ede9cfea04c598d13b262ff0e26a3a146103e477486
ghcr.io/gatika-cl/lotus-web:11c8914fc35018e6445c551caa1e70147d496e06
  sha256:4c62375f17a2a055c1e666ea6963bc9bd9952ae1307e10b6720301525f643303
```

`docker manifest inspect` contra essas tags responde `denied`, não `manifest unknown`: o pacote é
da organização e o token da sessão não tem `read:packages` nela. É recusa de leitura, não ausência
de artefato — a existência está provada pelo `pushing manifest ... done` do log.

### DoD 5 — BLOQUEADO por plano de conta, não por configuração

`PUT /repos/Gatika-CL/lotus/branches/main/protection` responde:

```
HTTP 403
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

`GET /orgs/Gatika-CL` confirma a causa: `"plan": {"name": "free"}`. **Branch protection em
repositório privado exige plano pago.** A rota alternativa tem a mesma trava —
`POST /repos/Gatika-CL/lotus/rulesets` devolve o mesmo 403.

As duas saídas são decisão do João, não do agente:

1. **Subir `Gatika-CL` para GitHub Team.** Mantém o repositório privado, que é a exigência de um
   cliente regulado, e a protection do Step 6 do plano entra como escrita, sem nenhuma outra
   mudança.
2. **Tornar o repositório público.** Libera a protection de graça e é inaceitável aqui: o
   repositório carrega o domínio de um cliente do setor elétrico chileno.

Enquanto a decisão não vem, a `main` de `Gatika-CL` está **sem régua no servidor**: a CI roda e
reporta, mas nada impede um push direto ou um force-push. O gate de publicação (DoD 2) continua
valendo, porque ele é `needs:` dentro do próprio workflow e não depende de protection.

## DoD 5 — COMPENSADO, não provado

A prova pedida pela spec §7 é o readback de `GET /branches/main/protection`. Ela não existe e não
vai existir enquanto `Gatika-CL` estiver no plano free. O que existe no lugar, medido em
2026-08-25:

### Camada 1 — `.githooks/pre-push`, na máquina

Recusa real, não simulada. `git push origin HEAD:refs/heads/main` do worktree `lotus-infra`:

```
pre-push RECUSOU: push direto para main em 'origin'

Main entra por Pull Request:
    git push origin HEAD:refs/heads/$(git branch --show-current)
    gh pr create --fill
    gh pr merge --merge
error: failed to push some refs to 'github.com:Andred21/lotus.git'
```

Exit 1. Push de branch (`HEAD:refs/heads/sonda-hook-nao-main`) passou no mesmo teste — o hook
fecha o atalho e deixa o caminho certo livre. As outras duas ramificações foram exercidas
alimentando o hook direto: push manual em `main` no corporativo recusado, `LOTUS_ESPELHO=1` passa,
e apagar `main` recusado nos dois destinos.

Instalação: `git config core.hooksPath .githooks`, gravado em
`/home/jvbat/projetos/lotus/.git/config` — o config comum, então vale para as quatro worktrees de
uma vez.

### Camada 2 — job `procedencia`, no `needs` do `image`

É a camada que substitui a protection onde ela realmente doía. A protection impediria a **escrita
na ref**; esta impede que a escrita vire **artefato**. Duas procedências são aceitas e nenhuma
outra: PR mesclado, ou commit de espelho com trailer `Source-Commit` **e** árvore limpa de todo
path de `.espelho-exclusoes`.

O segundo caminho não vira atalho no repositório pessoal porque lá `docs/` e `.claude/` existem: a
checagem de árvore limpa reprova e a exigência de PR volta a valer. A regra se auto-restringe, sem
nome de repositório escrito no meio dela.

Predicado medido contra commits reais, antes de subir:

| Commit | O que é | PRs mesclados associados |
|---|---|---|
| `7fa1cb0a` | merge do PR #71 | 1 |
| `1d97f59f` | sonda empurrada direto em `main` | 0 |
| `11c8914f` | revert empurrado direto em `main` | 0 |

### Camada 3 — espelho filtrado

`scripts/espelhar-corporativo.sh` publica em `Gatika-CL/lotus` a árvore de `origin/main` menos
`.espelho-exclusoes`, um commit por release, com `Source-Commit: <sha>` no trailer. Medido em
`--simular`: **1177 arquivos contra 1417 da origem**. O que atravessa, na raiz:

```
.dockerignore  .editorconfig  .env.example  .github  .gitignore  README.md
backend  docker  docker-compose.prod-probe.yml  docker-compose.prod.yml
docker-compose.yml  frontend
```

O commit é montado com `commit-tree` sobre um índice temporário (`GIT_INDEX_FILE`): a árvore de
trabalho e o índice de quem roda o script não são tocados.

### O que continua descoberto — e é para continuar escrito

- **Ninguém é impedido pelo servidor.** Push direto em `main` continua sendo aceito pelo GitHub.
  O que muda é que ele não vira imagem e fica vermelho no histórico.
- `git push --no-verify` desliga a camada 1. Contra distração, funciona; contra decisão, não.
- Quem clona e não roda `git config core.hooksPath .githooks` fica sem a camada 1.
- Force-push em `main` é **detectado** (`github.event.forced`), não impedido. O histórico
  reescrito já aconteceu quando o job reprova.
- O espelho remove os arquivos da **árvore**, não do **histórico** que já foi empurrado para
  `Gatika-CL` antes desta decisão. Nada ali é segredo — é planejamento interno — mas o fato fica
  registrado em vez de subentendido.

Quando houver orçamento para GitHub Team, o Step 6 da Task 9 entra sem nenhuma outra mudança e
vira a camada 0.

### O buraco não era teórico

Enquanto este trabalho era escrito, em 2026-08-25, a lane-c empurrou `94463eb2`, `9e059720`,
`d0d29c68` e um merge direto em `main`, sem PR. Nenhum deles passou por gate de PR porque nenhum
gate de PR existia para eles. É o caso exato que a camada 2 passa a marcar em vermelho e a manter
fora do registry.

## As três camadas no gatilho real — 2026-08-25

Tudo abaixo é run no gatilho real, depois do merge do PR #74 (`24c2105d`).

### O caminho certo publica

[Run 32887545241](https://github.com/Andred21/lotus/actions/runs/32887545241), push do merge do PR #74:

```
procedencia: commit entrou por Pull Request mesclado.
```

Sete jobs, `image` incluído. Par publicado: `ghcr.io/andred21/lotus-app:24c2105d…` e `-web`,
verificados com `docker manifest inspect`.

### O espelho atravessa filtrado, e o CI do corporativo confere

`scripts/espelhar-corporativo.sh` publicou `3d158773` em `Gatika-CL/lotus`, com
`Source-Commit: 24c2105d3bcd646eaecf5ed53160d4a98858154d` no trailer. Raiz do que atravessou:

```
.dockerignore  .editorconfig  .env.example  .espelho-exclusoes  .github  .gitignore
README.md  backend  docker  docker-compose.prod-probe.yml  docker-compose.prod.yml
docker-compose.yml  frontend
```

`git cat-file -e upstream/main:<path>` responde ausente para `.claude`, `.agents`, `docs`,
`CLAUDE.md` e `scripts`.

[Run 32888129954](https://github.com/Gatika-CL/lotus/actions/runs/32888129954) no corporativo, os
sete jobs sobre a árvore filtrada:

```
procedencia: release de espelho. Fonte: 24c2105d3bcd646eaecf5ed53160d4a98858154d
frontend:    Test Files 106 passed (106)
```

**106 arquivos de teste contra 107 no pessoal** — a diferença é exatamente
`repo-docs-refs.test.ts`, que não atravessa porque o alvo dele (a documentação interna) também
não atravessa. O job `image` publicou em `ghcr.io/gatika-cl/lotus-app:3d158773…` e `-web`.

### O caminho errado não publica — DoD 5, na forma compensada

Commit `26d0e3e9` empurrado direto em `main`, sem PR. O `pre-push` recusou primeiro; o push só
saiu com `LOTUS_FORCA_MAIN=1`, que é a saída de emergência documentada — e é justamente o cenário
em que a camada 2 precisa valer sozinha.

[Run 32889018234](https://github.com/Andred21/lotus/actions/runs/32889018234):

| Job | Conclusão |
|---|---|
| `backend`, `frontend`, `types-drift`, `audit-prod` | success |
| `procedencia` | **failure** |
| `image` | **skipped** |

Linha exata:

```
##[error]26d0e3e9c00076888a9ae0aa6d8602abcc48af7c entrou em main sem Pull Request mesclado e sem trailer de espelho. Nenhuma imagem sera publicada para ele.
```

Registry para esse SHA: `manifest unknown` nas duas imagens.

**O código do commit estava perfeito** — os quatro gates passaram, porque a sonda é um commit
vazio sobre a árvore aprovada. O que reprovou foi a **procedência**, e só ela. É essa a diferença
entre este job e os outros quatro: os outros julgam o código, este julga o caminho.

A sonda ficou em `main` de propósito, sem revert: ela é um commit vazio (mesma árvore do pai), e
desfazê-la exigiria force-push — exatamente o que a camada 2 marca em vermelho. `main` fica com um
head sem imagem publicada até o próximo merge por PR, que é o comportamento correto e não um
efeito colateral.
