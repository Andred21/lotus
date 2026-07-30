# Patch — `modelo-conceitual.md` (Drive, ID `1QB9ei5JiWV33GNmXxZH_8_hSZPqoY_3a`)

> Gerado pelo doc-sync `hardening-doc-sync-sprint4` (2026-07-30). Cobre P-01/P-06 (E2-01), mesma
> divergência do patch de `modelo-fisico-e-diagramas.md`, na camada conceitual (sem tipos).

## No bloco `mermaid erDiagram`, trocar a relação Redator↔Turma

**Trecho atual:**

```
REDATOR ||--o{ TURMA : "ministra"
```

**Trecho novo:**

```
REDATOR }o--o{ TURMA : "ministra (N:N)"
```

## Atualizar o glossário — entrada "Turma"

**Trecho atual (coluna Definição):**

> Instância de um curso sendo ministrada. Status em 3 estados (em andamento → habilitada →
> concluída).

**Trecho novo:**

> Instância de um curso sendo ministrada, ministrada por N redatores (decisão posterior ao desenho
> original, 2026-07-21 — ver nota de sincronização). Status persistido em 2 estados
> (`em_andamento`/`concluida`); `habilitada` é derivado em runtime a partir da documentação completa
> (RN-16), não é um terceiro estado gravado.

## Acrescentar à "Nota de sincronização com o diagrama" no topo do documento

**Trecho a acrescentar como item 3:**

```markdown
3. **Redator↔Turma é N:N**, não 1:N. Decisão posterior ao desenho original (2026-07-21, spec
   `2026-07-21-bloco6b-turma-designacao-design.md` D5, explícita do João): a premissa
   "ocasionalmente mais de um redator por turma" pediu relação N:N (pivô `turma_redator` no
   físico), não a designação simples do desenho inicial.
```
