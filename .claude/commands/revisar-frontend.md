---
description: Revisa a qualidade de CÓDIGO do frontend de uma feature/sprint — estrutura, componentização, aderência às rules. NÃO toca estética.
argument-hint: [feature ou caminho — ex. commercial, features/catalog]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(pnpm lint:*), Bash(pnpm build:*)
disable-model-invocation: true
---

> **Eixo CÓDIGO do review de frontend.** Estrutura, não pixel. Roda ANTES do `/revisar-ui` —
> não se pole o que vai ser reescrito. Estética é problema do outro comando.

## Escopo

**$ARGUMENTS**

Vazio → pergunte qual feature/caminho revisar. Nunca varra `frontend/src/**` inteiro de uma vez —
revisão sem alvo vira ruído. Uma feature por execução.

## Contexto — carregue só isto

- A rule `.claude/rules/frontend-fsliced.md` **carrega sozinha** ao ler os arquivos da feature.
  Ela é a régua desta revisão — não invente critério fora dela.
- Working tree: `git status --short` (não mexa em arquivo sujo alheio — WIP do João é intocável).
- Nada de progress.md/ADR aqui, salvo se um achado exigir decisão de arquitetura (aí PARE e pergunte).

## Protocolo de revisão

Para cada arquivo da feature, verifique contra os cheiros da rule — nesta ordem de gravidade:

1. **Lógica no JSX.** Handler/derivação/`.map`/ternário aninhado computando dado dentro do `return`
   → deveria estar acima do `return` ou num hook da feature. (rule: "componente = declarativo")
2. **Estado com regra fora de hook.** 2+ `useState` que mudam juntos, `useEffect` de sincronização,
   manipulação de array nested solta no componente → `use<Algo>()` na feature. (rule: `useCourseForm`
   é molde; `patchContact` é contra-exemplo)
3. **Grupo de campos coeso repetido.** Bloco de entidade (endereço, contato) inline em vez de
   subcomponente. (rule: novo bullet `AddressFields`)
4. **Componente-Deus.** >~150 linhas ou >1 responsabilidade (busca + form + layout no mesmo lugar).
5. **Fronteira violada.** PrimeReact direto em vez de `shared/ui`; import de outra feature (nem tipo).
   → é **lei §6**, não convenção. Achou → registre e trate como bloqueante.
6. **Duplicação do kit.** `Field`/`UnmappedErrors` local reintroduzido em vez do `FormField` kit.

## Saída — classifique cada achado (A/B/C), NÃO refatore em silêncio

- **Caso A:** aderente — confirme, siga.
- **Caso B:** funciona mas melhora — descreva o quê e o porquê, proponha o diff, **espere aval**.
- **Caso C:** viola rule/lei — aponte, apresente a correção ideal, **espere aval** (bloqueante se §6).

Agrupe por arquivo. Priorize C > B. Não afogue o João em micro-A.

## Definition of done da refatoração

**Comportamento idêntico, provado — não "diff mais bonito".** Refatoração que muda o que a tela
renderiza/faz NÃO é refatoração, é bug (peso legal). Extraiu `AddressFields`? A tela renderiza
exatamente igual. Gate mínimo antes de dar por fechado: `pnpm build` + `pnpm lint` verdes E
verificação visual/comportamental da tela afetada. Build verde não é aceite (lei §8).

## Restrições

- Só o eixo código. Espaçamento/tipografia/cor → é do `/revisar-ui`, não toque.
- Mudança cirúrgica: não "melhore" o vizinho não pedido.
- Desvio de convenção proposto → o motivo vai para `.superpowers/sdd/progress.md`.
- Achado que vira decisão de arquitetura → PARE e pergunte.