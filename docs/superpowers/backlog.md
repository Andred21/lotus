# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.

## Próximos blocos

1. **Bloco 6-frontend · Exec 3 · Documentación + Conclusión + manual + P-07**
   — usar a spec de Operação, consumir os endpoints existentes e planejar just-in-time.
2. **Bloco 6-frontend · Seed operacional**
   — cenário demo ponta a ponta, somente após Exec 3.
3. **Bloco 7 · Sprint 4 · Certificação**
   — templates, PDF, emissão e validação pública por QR.
4. **Hardening**
   — ownership em rotas nested e política de retenção documental.

## Futuros dependentes de decisão

- **FUT-1:** templates de documentos de turma gerados via código; depende de definição com a Lotus.
- **FUT-2:** ancoragem cross-módulo genérica; o link turma→orçamento é apenas o caso inicial.

## Débitos técnicos

- Check automático de paridade `PermissionCatalog` ↔ `perm.*` nos três locales.
- Unicidade de `client_addresses.is_primary`.
- Tornar `ClientContactData.is_primary` `Optional` no update.
- Decidir assimetria de zero contatos principais entre UI e backend.
- Consolidar migrations adicionais antes da produção.
- Minors do review dos Blocos 5.2a e 5.2b, incluindo projeção de permissões em `GET /api/roles`.