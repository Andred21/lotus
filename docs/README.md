# /docs — Contexto do Projeto Lotus

> Índice dos documentos de contexto para agentes. **Fonte canônica: Google Drive** (`V2/Planejamento/`).
> Os arquivos aqui são snapshots datados, adaptados para consumo por agente de código.
> Se um doc divergir do Drive, o Drive vence — sinalize a divergência ao João Victor.

**Snapshot gerado em:** 2026-07-04 · **Atualizado em:** 2026-07-17

---

## Como usar estes docs

`CLAUDE.md` é o mapa e as leis. Esta pasta é o **detalhe sob demanda** — um agente não carrega tudo
toda sessão; carrega o doc que a tarefa exige (CLAUDE.md §3 diz qual).

**Mecânica de código não está aqui nem no `INSTRUÇÕES`** — mora em `.claude/rules/`, path-scoped:
entra sozinha quando o agente toca `backend/app/**`, `frontend/src/**`, migrations ou DTOs. O
`INSTRUÇÕES-DO-PROJETO.md` guarda só a postura e as cláusulas de exceção.

| Arquivo | O que é |
|---|---|
| `adrs.md` | ADRs — decisão + porquê + trade-off |
| `der-fisico.md` | DER físico MySQL |
| `estrutura-monolito.md` | Esqueleto back+front, regras de dependência |
| `pendencias.md` | Divergências conhecidas, cada uma com gatilho de expiração |
| `superpowers/progress.md` | Índice vivo — 1 linha por feature |
---

## Documentos

### `adrs.md` — Architecture Decision Records
As 19 decisões de arquitetura fechadas do projeto, cada uma com contexto, decisão, justificativa e trade-off. **Consulte antes de qualquer decisão de stack, padrão, estrutura ou infra.** Estas decisões já foram tomadas e ponderadas — não as reabra sem motivo; se uma tarefa parecer contrariar um ADR, sinalize antes de prosseguir.

Fonte canônica: `Drive/V2/Planejamento/3-avancado/decisao-stack.md`.

### `der-fisico.md` — Modelo físico de dados
DER físico MySQL com 25 tabelas-alvo (18 de domínio + 7 de RBAC/auditoria), tipos de coluna, PK/FK, relações. **Consulte antes de criar migration, model ou mexer em schema.** Os nomes de tabela e coluna aqui são a referência — não invente nomes divergentes.

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

10. **Teste que nunca viu o bug é cobertura fantasma.** Um teste de regressão só vale depois de você
    o ver **reprovar contra o código antigo** (`git stash` no fix, rode, `git stash pop`). Dois casos
    reais: `learnings`/`contents` "passavam" gravando `null` (Bloco 3); e os testes de "coleção
    preservada" passariam com o bug presente se afirmassem a coisa errada (Bloco 5.0). Teste que
    passa nos dois estados prova nada.

11. **Task que roda `typescript:transform` ajusta os consumidores no MESMO commit.** Regenerar muda
    a forma dos tipos (`job_title` virou chave obrigatória; `modules` virou `| undefined`) e quebra
    os literais TS existentes na hora. Ou a task já corrige os consumidores, ou o plano não pode
    pedir "build verde" na task seguinte.

12. **Prova e2e via curl precisa de `-H 'Origin: <FRONTEND_URL>'` E `-H 'Accept: application/json'`.**
    Sem `Origin`, o Sanctum não trata a request como stateful e o login dá 500. Sem `Accept`, o
    middleware de auth tenta redirecionar para uma rota `login` inexistente e dá 500. Os dois 500 são
    do curl, não do código — não saia caçando bug que não existe.

13. **Doc que descreve intenção não-construída é pior que doc ausente.** O ADR-15 mandou por dois
    anos-luz de arquitetura que nunca existiu ("compilar PHP → JSON via Vite") e as leis invioláveis
    mandavam por DTO em `app/Data`, pasta que nunca existiu — ambos sobreviveram porque ninguém
    confere doc contra código. Doc afirma o que **é**; o que se pretende vai marcado como pendência.
    
14. **Mecanismo vence instrução — quando existe mecanismo, use-o.** "Carregue só o necessário" era
    instrução (o agente obedecia quando lembrava); `.claude/rules` com `paths:` é mecanismo (carrega
    sozinho e volta depois da compactação). Mesma regra, custo zero de disciplina. Vale para o resto:
    lei que precisa valer sempre quer Arch test ou hook, não parágrafo. Enquanto o mecanismo não
    existe, a lei é instrução — e isso vai registrado como pendência (P-04), não como conforto.

15. **Migration verde em sqlite pode falhar em MySQL — o gate prova contra o engine real.** No Bloco
    6a, `student_client_logs` tinha uma coluna gerada STORED (`open_link_student_id`, que garante "1
    vínculo aberto por aluno") dependendo de `student_id`, e a FK `student_id` era `ON DELETE CASCADE`.
    O InnoDB **proíbe** `ON DELETE CASCADE` (ou `SET NULL`) numa FK cuja coluna uma coluna gerada STORED
    referencia (erro 1215). A suíte roda em sqlite `:memory:`, que **ignora** a restrição — 201 verdes,
    migration quebrada. Só a prova do `/fechar-sprint` contra o MySQL real pegou. Toda coluna gerada
    dependente de FK: a FK é `restrictOnDelete`, não cascade. E a prova de aceite de bloco que toca
    schema roda `migrate` no MySQL de dev, não só a suíte.


> **Índice vivo do desenvolvimento:** `docs/superpowers/progress.md` (versionado) é o índice do que
> foi construído e provado — **uma linha por feature**, e é assim que ele fica: detalhe de decisão
> mora no ADR, de schema no `der-fisico`, de padrão de código no `INSTRUÇÕES`, e o passo-a-passo nos
> planos/specs em `docs/superpowers/plans|specs/` (concluídos em `archive/`). O ledger fino de
> execução é `.superpowers/sdd/progress.md` (local, não versionado). Consulte no início de uma
> feature para alinhar com o que já existe — não repita erro já mapeado aqui.

---

> **Divergências conhecidas:** `docs/pendencias.md`. Não duplique a lista aqui — ela já morou em dois
> lugares (comando `sync-docs` + Parte IV do INSTRUÇÕES) e as duas cópias divergiram entre si.

## Fontes que NÃO foram espelhadas (ficam só no Drive)

Por decisão de escopo, o que é planejamento puro ou volátil não vem para o repo — consulte no Drive quando necessário:
- Camadas `1-inicial` e `2-intermediario` (histórico de requisitos e modelo conceitual)
- Fluxos de UI/UX (Mermaid dos fluxos 1–7)
- Protótipos de tela (Figma)
- Diagramas de arquitetura de aplicação e de nuvem

Se uma tarefa precisar destes, o João Victor traz o contexto ou aponta o arquivo no Drive.
