# 07: Fundo da assinatura sempre claro

**What to build:** a assinatura é traço escuro sobre fundo transparente, e o xadrez que mostra a
transparência usa as superfícies do tema. No escuro o xadrez fica escuro e a assinatura some
(Configuración › Certificados, medido pelo João em 2026-11-01). O fundo da assinatura passa a ser
sempre claro:

- **tema claro:** como está hoje (xadrez de `--surface-border` e `--surface-card`);
- **tema escuro:** xadrez num azul claro, não branco, para a assinatura escura aparecer sem o
  quadro virar um bloco branco na tela escura.

Vale em todo lugar que mostra assinatura: a prévia do `AppSignatureUpload` (Perfil, Redactor) e a
assinatura já enviada em Configuración › Certificados, que reusa o mesmo xadrez.

Origem: mudança 4 da ficha 46, pedida pelo João na revisão da spec (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] No escuro a assinatura de Configuración › Certificados se lê sobre xadrez azul claro.
- [ ] No claro o xadrez é o de hoje.
- [ ] A prévia do upload de assinatura no Perfil e no Redactor segue a mesma regra.
- [ ] A cor vem de variável do tema (sem exceção nova na catraca de cor).
- [ ] `pnpm build`, `pnpm lint` e `pnpm test` verdes.
