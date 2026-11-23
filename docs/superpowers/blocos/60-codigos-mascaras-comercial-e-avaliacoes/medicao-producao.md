# Medição de formatos em produção — bloco 60

Data: 2026-11-22. O João rodou `scripts/medir-formatos-producao.php` pelo tinker do container `app`
em produção, e o agente conferiu a saída. São só contagens: o script não imprime nenhum RUT,
telefone ou e-mail.

## RUT (`users`, por `type`)

| type    | total | sem RUT | formatado (`12.345.678-5`) | cru | só hífen |
|---------|------:|--------:|---------------------------:|----:|---------:|
| admin   |     2 |       1 |                          1 |   0 |        0 |
| redator |     6 |       0 |                          6 |   0 |        0 |
| aluno   |    86 |       0 |                         86 |   0 |        0 |
| cliente |     1 |       0 |                          1 |   0 |        0 |

Todo RUT gravado está formatado, então não há achado: nenhum caminho de escrita escapa do
provisioner. O admin sem RUT tem o campo nulo, não mal formatado.

## Telefone

| tabela            | total | vazio | só dígitos | com `+` | com separador |
|-------------------|------:|------:|-----------:|--------:|--------------:|
| `users`           |    95 |    73 |         19 |       3 |             3 |
| `client_contacts` |     2 |     2 |          0 |       0 |             0 |

Padrões que aparecem, e que a Task 15 tem de cobrir:

- **Vazio:** 73 em `users` e os 2 de `client_contacts`.
- **Só dígitos:** 19.
- **Com `+` e separador:** os mesmos 3. A soma prova: 73 + 19 + 3 = 95, e só dígitos ou vazio não
  podem ter separador.

O script não mede o comprimento dos 19 telefones só com dígitos. Não dá para saber, por esta medição,
se algum vem sem o `56` ou sem o `9` do celular.

## E-mail (`users`)

- Grupos duplicados depois de `lower(trim())`: **0**.
- E-mails fora da forma normalizada: **0**.

Não há achado.

## Arquivos de turma (`files` com `fileable_type = 'turma'`)

**Nenhum arquivo.** O resultado foi `[]`. Conferi o filtro antes de aceitar o vazio: o alias
`turma` é o do `Relation::enforceMorphMap` (`AppServiceProvider.php:109`), e o banco local da lane
grava os arquivos de turma com esse alias (MANUAL 4, PRUEBAS 4, EVALUACION_REDATOR 2).

Consequências:

- Nenhum `type` fica fora de MANUAL, PRUEBAS e EVALUACION_REDATOR, então o bloco segue.
- Em produção, a migration `000002` da Task 9 (PRUEBAS → EVALUACION_ALUNO) vai converter 0 linhas.

## Correção no script

O comando do cabeçalho tinha dois erros. O usuário `ubuntu` precisa de `sudo docker`, e o tinker
lido pela entrada padrão não aceita a linha `<?php`. O comando do cabeçalho foi corrigido para o
que de fato rodou.
