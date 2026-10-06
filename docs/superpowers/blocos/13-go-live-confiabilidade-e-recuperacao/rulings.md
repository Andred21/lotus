# Bloco 13 — rulings

Decisões tomadas pela sessão de execução em nome do João. Cada linha traz o que custa se estiver errada.

1. **Executei a T8 (proposta) antes da T6 (runbook).** A T8 não consome nada e o runbook cita o caminho da proposta; assim `repo-docs-refs` não falha por caminho ausente. Se errado: só muda a ordem dos commits.
2. **Corrigi a §4 da proposta.** O texto do plano dizia "el número de serie no se reutiliza", falso: `certificate_sequences` volta ao valor do dump e o número `LOT-<ano>-<n>` de um certificado perdido pode ser reatribuído. A spec §8 manda dizer "com todas as letras" o que se perde. O QR valida por uuid, então o QR perdido só deixa de validar. Se errado: reverter um parágrafo.
3. **Levei o mesmo fato ao §15 do runbook, à emenda do ADR-14 e (revisão final) ao §8.1.1.** Risco legal de certificado: os documentos precisam dizer o mesmo. Se errado: remover quatro frases.
4. **Acrescentei que o restore também desfaz revogações feitas depois do dump** (certificado volta a validar como emitido; repetir a revogação), na proposta, no §15, no §8.1.1 e no ADR-14. Achado I-1 da revisão final, verificado contra o código. Se errado: remover uma frase em cada.
5. **Qualifiquei RPO/RTO na proposta** ("≤ 24 h com respaldo sano; alerta aos 2 dias"; RTO medido sobre base pequena, cresce com o volume). O mecanismo real alerta só acima de 2 dias. Se errado: reverter duas frases.
6. **Troquei "US$ 40–60/mês" por campo `<costo estimado>`**, a preencher pela calculadora da AWS antes do envio; a cifra só existia no plano, sem ADR/spec. O passo 9 do §15 e o ADR-14 mandam preenchê-lo. Se errado: repor a cifra.
7. **Mitigação técnica não entra no bloco:** avançar `last_seq` depois do restore (eliminaria a reatribuição de número) fica para o João decidir. Se o João quiser, é task nova.
8. **Corrigi na revisão final** a guarda de data ilegível do `aws` (`FALHA backup`, sem abortar o smoke), espera e `--memory 512m` na alternativa D3, o comando exato da contagem no passo 4, o item `backup` em FALHA no passo 2 e "Proposta:" no ADR-14. Se errado: reverter o commit b13b1726.
9. **Minors deixados sem correção** (todos resultam em FALHA, nunca em OK falso): `export KEY=` (T1), desvios do mysql de roles/n_super sem cenário e `wc -l <<< ""` (T2, T3, T5), `created_at` todo NULL (T3), rótulos inesperados no smoke (T5), comentário `lotus-<data>-golive` (T6). Também para a lane de aceitação: RTO "parcial" na proposta, prefixo "no nome" das entidades sem nome, segundo terminal para o `t2`, e alinhar a redação do gatilho de RPO entre ADR-09 e ADR-14. Se errado: correção pontual cada.

Desvio do harness: nenhum. O Passo 5.1 (pipeline de profundidade 1) não foi usado; o loop foi sequencial, como a SDD descreve.
