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
