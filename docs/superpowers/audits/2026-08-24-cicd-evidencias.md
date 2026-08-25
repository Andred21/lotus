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
