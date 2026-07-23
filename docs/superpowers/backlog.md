# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.
> Itens presentes neste arquivo não estão ativos.
> Somente uma alteração explícita em `state.md` promove um item.

## Próximos blocos

1. **Bloco 6-frontend · Seed operacional**
   — cenário demo ponta a ponta registrado na spec de Operação, somente após a conclusão do item
   operacional ativo.
2. **Bloco 7 · Sprint 4 · Certificação**
   — templates, PDF e endpoint público QR. Contexto: `adrs.md` (ADR-08/10), `der-fisico`
   (`certificates`, `certificate_sequences`) e lição sobre snapshot do template no ato da emissão.
3. **Hardening**
   — ownership em rotas nested e política de retenção documental.

## Futuros dependentes de decisão

- **FUT-1:** templates de documento de turma gerados via código — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com
  a Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
- **FUT-2:** refino de ancoragem cross-módulo — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.

## Débitos técnicos

- Check de paridade permissão↔i18n — teste/CI que assere
  `array_keys(PermissionCatalog::descriptions())` (dot→underscore) igual às chaves `perm.*` de cada
  locale; sem isso, permissão nova renderiza chave crua no picker.
- Unicidade de `client_addresses.is_primary` — mesmo gap que o Bloco 2 fechou nos contatos; ficou
  fora porque o contratante não pediu e a tela só edita o primeiro endereço.
- `ClientContactData.is_primary` tem default `false` não-`Optional` — `PUT /api/contacts/{id}` sem
  o campo rebaixa o principal em silêncio; rota ainda sem consumidor no frontend.
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2a (minors do review final): `SuperadminGuard` sem teste do caso superadmin inativo;
  `UserData::fromModel` chama `getRoleNames()` duas vezes; unicidade de RUT/email do
  `UpdateStaffUserAction` roda fora da transação; auto-colisão no update sem teste; teste do 422 de
  `redator` não afirma a chave `role`.
- Bloco 5.2b (minors do review final): testes de falha de `CreateRoleAction`/`UpdateRoleAction` não
  afirmam a chave do error-bag; decisão pendente do João sobre `GET /api/roles` permitir a admin
  comum enumerar permissões do superadmin enquanto `/api/permissions` é superadmin-only.
