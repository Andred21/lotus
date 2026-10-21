# Ruling — RN-09 (idoneidade do redator) vira aviso

> Bloco 39. Decisão do João Victor em 2026-10-17, na abertura do bloco (`spec.md` §1, D7–D10).
> O Drive (requisitos) vence sobre os `/docs`: até o João refletir esta decisão lá (item 1 da
> `## Verificação externa` da spec), o Drive descreve uma trava que o código não aplica.

## Regra anterior

Spec do bloco 6b (`docs/superpowers/specs/archive/2026-07-21-bloco6b-turma-designacao-design.md`,
D3, decisão do João em 2026-07-21): o redator só era designado à turma se estivesse habilitado
ao curso (`course_redator`) **e** tivesse REUF válido (`valid_until` nulo vale sempre; só o
vencido reprova). CV e título não contavam. A recusa era 422 (`RedatorNaoElegivelException`).
A habilitação redator↔curso nunca teve essa trava.

## Decisão

A idoneidade não trava mais a designação redator→turma. Os mesmos dois critérios viram motivos
de aviso: `not_qualified` (não habilitado ao curso) e `reuf_invalid` (REUF ausente ou vencido).
A tela mostra o motivo e pede confirmação; a API aceita. Continuam travando, porque não são
RN-09: turma concluída (RN-15) e redator arquivado.

## Rastro

A designação de um redator com motivo grava os motivos daquele instante na mesma linha de audit
da designação: `new_values.inidoneidade = {"<redator_id>": [...]}`. A designação idônea grava a
linha de sempre.

## Pendência

Refletir no Drive (requisitos, `Viagem Chile/Projetos/Lotus.cl/V2`): ação do João.
