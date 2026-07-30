# Patch — `decisao-stack.md` (Drive, ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`)

> Gerado pelo doc-sync `hardening-doc-sync-sprint4` (2026-07-30). Cobre P-17 (E2-03, E2-04, E2-05,
> E2-06). Cole os trechos abaixo no documento do Drive, nos pontos indicados.

## 1. Revisar ADR-15 (o Drive tem a versão pré-revisão)

**Onde entra:** logo após o bloco atual do `## ADR-15 — Internacionalização: PT-BR / EN-US / ES-CL`,
antes do `---` seguinte.

**Trecho a acrescentar:**

```markdown
**Revisão (2026-07-17).** A versão original deste ADR mandava "localização do Laravel como fonte;
compilar traduções PHP → JSON via Vite" para não duplicar dicionário, e deixava a biblioteca
`[A CONFIRMAR NA FASE 2]`. Nada disso foi construído e a decisão real foi outra: não existe plugin
de compilação no `vite.config.ts`, e os dois dicionários (front `i18next`, back `lang/` do Laravel)
vivem separados desde a fundação da UI, cada um traduzindo só o que a própria camada emite. A
premissa "evita duplicar dicionário" não se sustentou: não há duplicação a evitar, porque os
conjuntos de mensagem não se sobrepõem.
```

## 2. Adicionar ADR-16 (ausente do Drive)

**Onde entra:** logo após o `## ADR-17 — Código de negócio para Orçamento/Cotação`, como novo ADR,
ou entre ADR-15 e ADR-17 se a numeração cronológica for preferida.

**Trecho a acrescentar:**

```markdown
## ADR-16 — Tailwind como layout; tema do PrimeReact trocado em runtime

- **Contexto:** o frontend precisa de layout responsivo rápido de iterar (Tailwind) mas também do
  design system do PrimeReact para os componentes ricos (tabelas, diálogos, formulários).
- **Decisão:** Tailwind v4 só para layout (grid, spacing, responsividade); o tema visual dos
  componentes vem do PrimeReact, trocado em runtime via `<link>` injetado no topo do `<head>` — as
  utilities do Tailwind continuam vencendo por ordem de cascata.
- **Justificativa:** evita reescrever wrappers para todo componente PrimeReact (que `unstyled` + `pt`
  global exigiria) e mantém o Tailwind como ferramenta de layout, não de temização de componente.
- **Trade-off:** utility não vence a especificidade do tema — ao depurar estilo, checar o seletor
  completo que o markup gera, não a classe isolada.
- **Alternativa descartada:** PrimeReact `unstyled` + `pt` global com Tailwind — controle total, mas
  reescreve todos os wrappers e abandona o visual Lara; desproporcional ao estágio do projeto.
- **Nota de proveniência:** nasceu no desenvolvimento (repo), ratificada no doc-sync de 2026-07-30.
```

## 3. Adicionar ADR-18 (ausente do Drive)

**Trecho a acrescentar:**

```markdown
## ADR-18 — Frontend: clientes REST (`createCrudResource`) na camada `shared/api`

- **Contexto:** cada feature precisava reimplementar o CRUD HTTP contra a API (list/show/create/
  update/delete), duplicando a mesma forma de chamada Axios em vários lugares.
- **Decisão:** `createCrudResource` factory em `shared/api`, não em `features/<x>/api/`. Toda feature
  usa a factory para o CRUD do recurso principal; `features/<x>/api/` guarda só hooks de sub-recurso
  (nested/upload) que invalidam a key do pai.
- **Justificativa:** centraliza a forma de chamada HTTP, evita duplicação e mantém o padrão de
  invalidação de cache do TanStack Query consistente entre features.
- **Trade-off:** a árvore original do planejamento insinuava `features/<x>/api/` como casa do CRUD —
  a convenção vigente diverge nesse ponto.
- **Nota de proveniência:** nasceu no desenvolvimento (repo), ratificada no doc-sync de 2026-07-30.
```

## 4. Adicionar ADR-19 (ausente do Drive)

**Trecho a acrescentar:**

```markdown
## ADR-19 — Dinheiro em decimal + bcmath, nunca float

- **Contexto:** valores monetários (UF, totais de orçamento/cotação) não podem sofrer erro de
  arredondamento de ponto flutuante.
- **Decisão:** colunas monetárias são `decimal` no schema; toda aritmética financeira usa `bcmath`
  (`bcadd`, `bcmul`, etc.), nunca operadores nativos de float/double.
- **Justificativa:** float/double introduzem erro de representação binária em valores decimais —
  inaceitável para dado com peso legal/financeiro, mesmo que "registro histórico, não gate" (RN-14).
- **Trade-off:** chamadas `bcmath` são mais verbosas que `+`/`*` nativos — custo aceito pela precisão.
- **Nota de proveniência:** nasceu no desenvolvimento (repo), ratificada no doc-sync de 2026-07-30.
```
