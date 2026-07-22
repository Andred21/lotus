---
description: Revisa a qualidade VISUAL/UX do frontend — hierarquia, espaçamento, estados, consistência. Roda DEPOIS do /revisar-frontend, sobre código já limpo.
argument-hint: [feature ou tela — ex. commercial, ClientDialog]
allowed-tools: Bash(git status:*), Bash(pnpm build:*)
disable-model-invocation: true
---

> **Eixo VISUAL do review de frontend.** Estética/UX sobre código JÁ estruturado. Se a estrutura
> ainda está suja, PARE e rode `/revisar-frontend` primeiro — revisar pixel de componente-Deus é
> trabalho jogado fora.

## Escopo

**$ARGUMENTS**

Vazio → pergunte qual feature/tela. Uma superfície por execução.

## Contexto e autoridade

- **As rules do projeto vencem sempre.** `frontend-fsliced.md` define: Tailwind = layout, cor via
  variável CSS do tema (ADR-16), nunca Tailwind de cor na feature. Qualquer sugestão visual respeita
  isto — não proponha cor hardcoded, não proponha estilo que fure o tema.
- **Skill `frontend-design` = lente, não dona.** Use-a como insumo de direção estética (hierarquia,
  tipografia, ritmo visual). Onde ela conflitar com uma rule do projeto, **a rule ganha** e você
  avisa o João do conflito. Ela não conhece o Lotus; você conhece.
- Vocabulário de rótulo: `es-CL` é a referência (cliente chileno) — inconsistência de label es-CL
  é achado válido.

## Protocolo

Sobre a tela já estruturada, avalie:

1. **Hierarquia visual.** O olho vai ao que importa? Título/ação primária/campo crítico têm peso?
2. **Espaçamento e ritmo.** Grid consistente (via Tailwind layout); densidade adequada ao form.
3. **Estados.** Loading, vazio, erro, `readOnly`, `disabled` — todos tratados e visualmente claros?
   (peso legal: estado de erro de documento/idoneidade precisa ser inequívoco)
4. **Consistência entre telas.** Este diálogo parece da mesma família dos outros? Mesmos moldes
   (`ModulePage`/`CrudDialog`), mesmo espaçamento, mesmos wrappers.
5. **Affordance/acessibilidade básica.** Label associado, foco visível, alvo clicável, contraste.

## Saída (A/B/C) — proponha, não aplique em silêncio

Mesmo padrão do `/revisar-frontend`: A confirma, B/C propõem com o porquê e esperam aval. Toda
mudança visual passa pela camada certa (Tailwind layout / variável de tema), nunca cor solta.

## Definition of done

Melhoria visual **sem** regressão estrutural (não reintroduza lógica no JSX que o /revisar-frontend
tirou) e **sem** furar o tema. `pnpm build` verde. Consistência com as telas irmãs preservada.

## Restrições

- Só o eixo visual. Reestruturação de código → é do `/revisar-frontend`.
- Rule > skill, sempre. Conflito → rule ganha, avise.
- Não toque WIP sujo alheio.