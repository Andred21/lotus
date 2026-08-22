---
schema_version: 1
packet_id: feedbacks-resolver-escopo-2026-08-22
block_id: feedbacks-resolver-escopo
status: ready
generated_at: 2026-08-22
base_ref: main
base_commit: 666d9d2a0fd345dac006f279b3335a14d0b3bc27
state_path: docs/superpowers/state.md
state_blob_sha: 60ebb813819aaa631bf27528e1388008dce1f59c
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 0457320abea178668c65112513c37fc45dcbb281
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Resolver escopo de Feedbacks

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** determinar o escopo canônico atual de feedbacks/avaliações de turma e fornecer contexto suficiente para a decisão explícita entre implementação na v2 e descope formal.

**Non-goals:** implementar, definir schema ou workflow ainda não decidido, alterar Drive/Notion/DER, remover permissões, avançar o workflow ou modificar arquivos locais.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RF | Google Drive | file `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J` · `requisitos-negocio.md` | 2026-07-16T07:22:27.224Z | retrieved | RF-TUR-06/07, RF-FBK-01..04, atores e gates |
| DRIVE-ENTITY | Google Drive | file `11wSCY7J7yUEptJgjtSdRkiUuX6UttuGZ` · `entidade-feedback.md` | 2026-06-12T18:15:01.000Z | retrieved | vínculo com turma, PDFs e modelagem ainda não confirmada |
| DRIVE-MODULE | Google Drive | file `1Nt0O--hHDQhHn-65ZXJf3fj9NrhW2ZwN` · `modulo-pos-curso.md` | 2026-06-12T20:57:30.000Z | retrieved | posição F6, fronteira do MVP e escopo funcional |
| NOTION-741 | Notion | page `39dbc960-3dfa-81ef-ad6f-d908331d5059` · collection `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-07-14T11:21:17.551Z | retrieved | gap e decisão de implementação/descope |
| NOTION-H123 | Notion | page `39dbc960-3dfa-81cf-9ca5-e20c48624f67` · collection `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-07-14T20:56:27.539Z | retrieved | decisão posterior sobre domínio futuro/scaffold |

## Key facts

1. O requisito canônico atual mantém Feedback na v2 como módulo de pós-curso F6, "fora da vertical MVP" e previsto para implementação por último; essa classificação é adiamento, não descope. `[DRIVE-RF]` `[DRIVE-MODULE]`
2. Feedback possui três origens: alunos, redator e cliente; inicialmente são documentos PDF vinculados à turma. `[DRIVE-RF]` `[DRIVE-ENTITY]`
3. O redator cadastra em PDF as avaliações dos alunos e a própria avaliação; o admin cadastra a avaliação do cliente ao final da ordem de serviço. `[DRIVE-RF]`
4. A completude dos feedbacks é pré-condição para finalizar formalmente a turma e, por consequência, a cotação; a confirmação final continua sendo ação do admin. `[DRIVE-RF]` `[DRIVE-MODULE]`
5. A relação `Feedback → Turma` está definida, mas a referência ao autor individual está marcada explicitamente como `[A CONFIRMAR]`; não há base para inventar esse vínculo. `[DRIVE-ENTITY]` `[DRIVE-MODULE]`
6. A página Notion 7.4.1 permanece em `Backlog` e registra que a decisão não pode ser unilateral: se entrar, deve ser desdobrada; se sair, o descope deve ser formalizado. `[NOTION-741]`
7. Nenhuma decisão posterior de João descopando Feedback foi encontrada: o RF do Drive, modificado depois da abertura da 7.4.1, ainda contém RF-FBK-01..04; a decisão posterior H.1.2.3 chama Feedback de "100% futuro", não removido. `[DRIVE-RF]` `[NOTION-741]` `[NOTION-H123]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| V2 versus MVP | Feedback está em F6, fora da vertical MVP | Permanece no escopo canônico da v2; "fora do MVP" define ordem, não exclusão | Drive canônico e terminologia explícita `[DRIVE-RF]` `[DRIVE-MODULE]` |
| Drive versus Notion | Drive define a regra; Notion pede confirmação de implementação ou descope | Não existe override/descope posterior; a decisão de executar agora deve ser confirmada com João no planejamento | Hierarquia Drive sobre Notion e ausência de decisão posterior `[DRIVE-RF]` `[NOTION-741]` `[NOTION-H123]` |
| Finalização | RF-FBK exige feedback completo; RN-16 mantém confirmação pelo admin | Documentação habilita a conclusão; o admin confirma. Financeiro não integra esse gate | Requisitos complementares, sem conflito material `[DRIVE-RF]` `[DRIVE-MODULE]` |

## Constraints

- A primeira decisão do planejamento deve ser: implementar agora o requisito preservado na v2 ou formalizar seu descope.
- Se mantido, não inventar referência de autor, schema adicional ou estados além do contrato comprovado.
- Não confundir feedbacks em PDF com notas, médias e presença acadêmica.
- Honorários/pagamento de redator estão explicitamente fora desta versão. `[DRIVE-MODULE]`
- A evidência local declarada no bloco — ausência de `Domains/Feedback` e permissões órfãs em `PermissionCatalog.php:87-89` — define a lacuna, não a solução.

## External acceptance signals

- Retenção: três origens, PDFs vinculados à turma, atores segregados e completude exigida antes da conclusão. `[DRIVE-RF]`
- Descope: decisão formal registrada no Drive, Notion e DER; a instrução atual também exige remover as permissões órfãs.
- Nenhum dos caminhos autoriza implementação antes da decisão explícita de João.

## Open questions

- João confirma trazer agora o módulo F6 para implementação ou determina descope formal?
- Se entrar, Feedback referencia o autor individual ou somente turma, origem e documento?

## Deferred

- Detalhamento das telas além do contrato mínimo de upload/consulta.
- Qualquer expansão para honorários ou pagamento de redator.

## Staleness triggers

- `active_work_item` ou os ponteiros de spec/plano mudarem.
- João registrar decisão de implementação ou descope.
- RF-TUR-06/07, RF-FBK-01..04 ou os documentos F6 mudarem materialmente.
- A página Notion 7.4.1 mudar de decisão, status ou critério.
- O código passar a conter `Domains/Feedback` ou alterar/remover as permissões declaradas.
