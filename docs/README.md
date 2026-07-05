# /docs — Contexto do Projeto Lotus

> Índice dos documentos de contexto para agentes. **Fonte canônica: Google Drive** (`V2/Planejamento/`).
> Os arquivos aqui são snapshots datados, adaptados para consumo por agente de código.
> Se um doc divergir do Drive, o Drive vence — sinalize a divergência ao João Victor.

**Snapshot gerado em:** 2026-07-04

---

## Como usar estes docs

O `CLAUDE.md` na raiz é o mapa e as regras. Esta pasta é o detalhe sob demanda. Um agente não precisa carregar tudo isto toda sessão — carrega o doc relevante quando a tarefa exige. O `CLAUDE.md` seção 8 diz qual doc consultar para cada tipo de decisão.

---

## Documentos

### `adrs.md` — Architecture Decision Records
As 15 decisões de arquitetura fechadas do projeto, cada uma com contexto, decisão, justificativa e trade-off. **Consulte antes de qualquer decisão de stack, padrão, estrutura ou infra.** Estas decisões já foram tomadas e ponderadas — não as reabra sem motivo; se uma tarefa parecer contrariar um ADR, sinalize antes de prosseguir.

Fonte canônica: `Drive/V2/Planejamento/3-avancado/decisao-stack.md`.

### `der-fisico.md` — Modelo físico de dados
DER físico MySQL com 24 tabelas (18 de domínio + 6 de RBAC/auditoria), tipos de coluna, PK/FK, relações. **Consulte antes de criar migration, model ou mexer em schema.** Os nomes de tabela e coluna aqui são a referência — não invente nomes divergentes.

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

---

## Fontes que NÃO foram espelhadas (ficam só no Drive)

Por decisão de escopo, o que é planejamento puro ou volátil não vem para o repo — consulte no Drive quando necessário:
- Camadas `1-inicial` e `2-intermediario` (histórico de requisitos e modelo conceitual)
- Fluxos de UI/UX (Mermaid dos fluxos 1–7)
- Protótipos de tela (Figma)
- Diagramas de arquitetura de aplicação e de nuvem

Se uma tarefa precisar destes, o João Victor traz o contexto ou aponta o arquivo no Drive.
