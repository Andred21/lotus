# Patch — `modelo-fisico-e-diagramas.md` (Drive, ID `1GLv7fNsvZccrJ2CsbJDeFhqWo7BNl4ad`)

> Gerado pelo doc-sync `hardening-doc-sync-sprint4` (2026-07-30). Cobre P-01/P-06 (E2-01).

## No bloco `mermaid erDiagram`, trocar a entidade `turmas`

**Trecho atual:**

```
turmas {
  bigint id PK
  bigint quote_id FK,UK
  bigint course_id FK
  bigint redator_id FK
  enum modalidade
  enum status
}
```

**Trecho novo:**

```
turmas {
  bigint id PK
  bigint quote_id FK
  bigint course_id FK
  enum modalidade
  varchar local_aplicacao
  date start_date
  date end_date
  enum status
  timestamp concluded_at
  bigint active_quote_id UK "generated STORED"
}
turma_redator {
  bigint id PK
  bigint turma_id FK
  bigint redator_id FK
}
```

## Trocar a relação `redatores ||--o{ turmas : "ministra"`

**Trecho atual:**

```
redatores ||--o{ turmas : "ministra"
```

**Trecho novo:**

```
redatores }o--o{ turmas : "ministra (via turma_redator)"
turmas ||--o{ turma_redator : ""
redatores ||--o{ turma_redator : ""
```

## Nota a acrescentar logo abaixo do diagrama

```markdown
### Nota — Redator↔Turma é N:N, não 1:N

Decisão posterior (2026-07-21, spec `2026-07-21-bloco6b-turma-designacao-design.md` D5, explícita
do João): a premissa "ocasionalmente mais de um redator por turma" pediu N:N via pivô
`turma_redator`, não a FK simples `turmas.redator_id` do desenho original. `active_quote_id` é uma
coluna gerada STORED (`CASE WHEN deleted_at IS NULL THEN quote_id END`) que carrega a unicidade —
permite recriar turma sobre uma cotação cuja turma anterior foi soft-deletada.
```
