# Bloco 40 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Antes do deploy do bloco, o João atualiza `/opt/lotus/docker-compose.prod.yml` no servidor com a tag exata do Gotenberg (D17). O deploy sobe essa versão, conferida por `docker inspect` via SSH. | manual |  |  |
| 2 | O superadmin carrega em produção, pela tela Administración › Configuración › Certificados, a assinatura da Marcia de Batalha (ação do João ou da Lotus, depois do deploy). | manual |  |  |
| 3 | Depois do deploy, um certificado já emitido em produção é reimpresso e sai em 2 páginas, com as duas assinaturas, no layout v5 (smoke do João; o PDF exige sessão). | manual |  |  |
| 4 | Depois do deploy, a assinatura da Marcia e a de um redator real são subidas a partir de uma foto de celular. A prévia sai sem fundo cinza, sem sombra e sem perder traço. Se não sair, ajuste `CleanSignatureOptions` (o comentário em `cleanSignature.ts` diz quais parâmetros). | manual |  |  |
