# Bloco 40 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Antes do deploy do bloco, o João atualiza `/opt/lotus/docker-compose.prod.yml` no servidor com a tag exata do Gotenberg (D17). O deploy sobe essa versão, conferida por `docker inspect` via SSH. | manual | `/opt/lotus/docker-compose.prod.yml:131` com `image: gotenberg/gotenberg:8.36.0`; `lotus-gotenberg-1` Up (healthy) em `gotenberg/gotenberg:8.36.0`; `docker inspect` dá `.Config.Image` `gotenberg/gotenberg:8.36.0` e label `org.opencontainers.image.version` `8.36.0` (SSH do João) | 2026-10-31 |
| 2 | O superadmin carrega em produção, pela tela Administración › Configuración › Certificados, a assinatura da Marcia de Batalha (ação do João ou da Lotus, depois do deploy). | manual | Configurado já em produção: print da tela Administración › Configuración › Certificados com Marcia de Batalha, Gerente OTEC, `firma.png` de 31-10-2026 | 2026-10-31 |
| 3 | Depois do deploy, um certificado já emitido em produção é reimpresso e sai em 2 páginas, com as duas assinaturas, no layout v5 (smoke do João; o PDF exige sessão). | manual | Certificado real LOT-2026-125 reimpresso em produção: 3 páginas porque o temário passa de uma (continuação prevista na spec), aceito pelo João; as duas assinaturas (Marcia de Batalha e Magallanes Acuña Olate) na página 1, layout v5, cabeçalho e "Página X de Y" em toda página | 2026-10-31 |
| 4 | Depois do deploy, a assinatura da Marcia e a de um redator real são subidas a partir de uma foto de celular. A prévia sai sem fundo cinza, sem sombra e sem perder traço. Se não sair, ajuste `CleanSignatureOptions` (o comentário em `cleanSignature.ts` diz quais parâmetros). | manual | Subido a partir de prints (não foto de celular) e funcionou, palavra do João; ver as assinaturas no certificado real LOT-2026-125 | 2026-10-31 |
