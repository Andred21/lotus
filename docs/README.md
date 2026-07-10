# /docs — Contexto do Projeto Lotus

> Índice dos documentos de contexto para agentes. **Fonte canônica: Google Drive** (`V2/Planejamento/`).
> Os arquivos aqui são snapshots datados, adaptados para consumo por agente de código.
> Se um doc divergir do Drive, o Drive vence — sinalize a divergência ao João Victor.

**Snapshot gerado em:** 2026-07-04 · **Atualizado em:** 2026-07-10

---

## Como usar estes docs

O `CLAUDE.md` na raiz é o mapa e as regras. Esta pasta é o detalhe sob demanda. Um agente não precisa carregar tudo isto toda sessão — carrega o doc relevante quando a tarefa exige. O `CLAUDE.md` §3 ("Como consultar contexto") diz qual doc consultar para cada tipo de decisão; a mecânica de código detalhada mora em `INSTRUÇÕES-DO-PROJETO.md`.

---

## Documentos

### `adrs.md` — Architecture Decision Records
As 17 decisões de arquitetura fechadas do projeto, cada uma com contexto, decisão, justificativa e trade-off. **Consulte antes de qualquer decisão de stack, padrão, estrutura ou infra.** Estas decisões já foram tomadas e ponderadas — não as reabra sem motivo; se uma tarefa parecer contrariar um ADR, sinalize antes de prosseguir.

Fonte canônica: `Drive/V2/Planejamento/3-avancado/decisao-stack.md`.

### `der-fisico.md` — Modelo físico de dados
DER físico MySQL com 24 tabelas (18 de domínio + 6 de RBAC/auditoria), tipos de coluna, PK/FK, relações. **Consulte antes de criar migration, model ou mexer em schema.** Os nomes de tabela e coluna aqui são a referência — não invente nomes divergentes.

> **Divergência de idioma (em aberto):** o schema **implementado** está em inglês (decisão do João Victor, spec `2026-07-07-sprint1-cadastros-backend-design.md` §2.1); o canônico do Drive segue em PT/ES. As tabelas já construídas estão documentadas em inglês; as ainda no papel ficam em PT/ES até serem implementadas (também em inglês). Alinhar o Drive canônico é follow-up pendente de autorização (write externo).

Fonte canônica: `Drive/V2/Planejamento/3-avancado/modelo-fisico-e-diagramas.md`.

### `estrutura-monolito.md` — Esqueleto do código
Estrutura detalhada de pastas do backend (DDD-lite por domínio) e frontend (feature-based), com as regras de dependência entre camadas. **Consulte antes de criar qualquer arquivo novo** — para saber onde ele vai e que regra de importação segue.

---

## Lições institucionalizadas (erros que já custaram caro — não repetir)

Estas são regras de processo aprendidas na prática. Valem tanto quanto os ADRs.

1. **Definition of done = critério de aceite provado, não pacote instalado.** Exemplo real: `laravel-auditing` foi instalado mas a migration nunca rodou — falha silenciosa, a tabela `audits` não existia. Task de infra só fecha quando o comportamento é comprovado (tabela existe, grava registro).

2. **Auditoria via camada de aplicação, nunca trigger.** Trigger de banco não enxerga o usuário autenticado — vê a conexão, não quem agiu. Toda auditoria passa pelo Laravel (owen-it observers).

3. **YAGNI com critério.** Não criar estrutura especulativa (pasta de domínio vazia, wrapper de componente ainda não usado, tipo abstraído contra dor inexistente). Criar quando o uso chega. Mas manter a *fronteira* pronta (ex: o tipo do wrapper existe e é o que a feature importa, mesmo que hoje seja um alias puro).

4. **O tipo TS à mão é dívida consciente.** Enquanto o DTO `spatie/laravel-data` do endpoint não existe, um tipo escrito à mão no front é aceitável — mas deve ser marcado com comentário de que será substituído pelo tipo gerado. Não deixar virar permanente.

5. **Auditoria + SoftDeletes: `$model->delete()`, nunca delete no query builder.** `$relation->delete()` / `$builder->delete()` emite UPDATE puro — não dispara os eventos `deleting`/`deleted`, então owen-it **não grava nada** em `audits`. Provado (task A2): replace de documento via builder gerou 0 linhas de auditoria; via `$model->delete()`, gerou. Vale para todo Auditable+SoftDeletes de peso legal (documentos, templates de certificado).

6. **Axios não fixa `Content-Type`.** Fixar `application/json` na instância faz o `transformRequest` converter todo `FormData` em JSON — cada `File` vira `{}` e o upload chega **vazio** ao backend, com 201 silencioso (bug 3, achado só na verificação real; documento tem peso legal). Deixe o axios derivar: objeto → JSON, `FormData` → multipart+boundary.

7. **Upload polimórfico: valide cada FOLHA com `instanceof UploadedFile`.** `is_array()` só olha o nível de cima — `documents[CV][]` (array de arquivos sob chave de tipo válida) passa e estoura `TypeError`/500 na action. Sempre `ValidationException::withMessages([...])`, nunca `abort()`.

8. **Unicidade + soft-delete: `withTrashed` no check.** RUT (ou qualquer coluna `unique`) de um registro soft-deletado ainda ocupa o índice — checar sem `withTrashed` deixa a colisão escapar para o banco e retornar 500 em vez de 422. O check de disponibilidade (ex.: `UserProvisioner::ensureRutAvailable`) usa `withTrashed`.

9. **Tooling e git com escopo cirúrgico.** `./vendor/bin/pint` **sem argumento** reformata o repo inteiro (44 arquivos numa ocorrência, incluindo `use` de classes inexistentes) — passe só os arquivos tocados. `git add` só os caminhos exatos da task. Rode `git status` no início e `git diff <arquivo>` antes de editar arquivo sujo: o João edita o working tree **ao vivo** durante a execução (padrão recorrente) e o WIP dele é intocável.

> **Histórico vivo do desenvolvimento:** `.superpowers/sdd/progress.md` é o índice do que já foi construído, provado e decidido (com os desvios validados). Os planos e specs aprovados ficam em `docs/superpowers/plans/` e `docs/superpowers/specs/`. Consulte-os no início de uma feature para alinhar com o que já existe — não repita erro já mapeado aqui.

---

## Fontes que NÃO foram espelhadas (ficam só no Drive)

Por decisão de escopo, o que é planejamento puro ou volátil não vem para o repo — consulte no Drive quando necessário:
- Camadas `1-inicial` e `2-intermediario` (histórico de requisitos e modelo conceitual)
- Fluxos de UI/UX (Mermaid dos fluxos 1–7)
- Protótipos de tela (Figma)
- Diagramas de arquitetura de aplicação e de nuvem

Se uma tarefa precisar destes, o João Victor traz o contexto ou aponta o arquivo no Drive.
