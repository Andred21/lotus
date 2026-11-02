# 02: Assinatura do redator no padrão do slot (admin e Perfil)

**What to build:** a Assinatura do redator deixa de ser um bloco com o botão de texto "Enviar
assinatura" e passa a ser um slot como os outros documentos. Vazio: "Não enviado" e o ícone de
enviar. Com arquivo: a linha com ver, baixar, substituir e excluir, com dica.

O enviar e o substituir continuam abrindo o fluxo que existe hoje — recorte, remoção do fundo e
preview antes de salvar, com "Usar esta assinatura" e "Cancelar". Só o gatilho muda: de botão de
texto para o ícone do slot. O texto de ajuda dos formatos (PNG, JPG ou WebP) continua visível.

Vale nos dois lugares: no diálogo do redator, na administração, e no Perfil do redator logado. No
Perfil não há excluir, porque o backend não o oferece ao próprio redator.

Origem: mudança 1 da ficha 47, item 1.1 do pedido do João (2026-11-01) — "a começar pelo próprio
redator na parte de firma".

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] No diálogo do redator, a Assinatura é um slot igual ao do CV: vazio com ícone de enviar,
      preenchido com as quatro ações e dica.
- [ ] O ícone de enviar e o de substituir abrem o recorte com preview; confirmar salva, cancelar
      descarta.
- [ ] No Perfil, a Assinatura segue o mesmo slot, sem excluir.
- [ ] Excluir pede confirmação.
- [ ] O fundo claro da assinatura que o bloco 46 entregar continua valendo no preview.
