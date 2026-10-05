# 34 — Revisão

## Em aberto

- **Q-1 (rodada 2) · Importante**: nenhuma comparação do portão dos padrões tem catraca própria.
  São 10 comparações em `Up`, `CertDias` e 5xx. Falta a aprovação do João para a correção.

## Rodada 2 — `77196049..e45d0ce1` — 2026-10-05 · Lente 1: opus · Lente 2: sonnet

Rodada aberta pela correção dos cinco achados da rodada 1, nos commits `cc82f4d8`, `ed05b6b3`,
`5f201427` e `e45d0ce1`. A lente Codex não foi despachada. A cota segue esgotada até 3 de novembro
de 2026 (rodada 1), por isso a lente 1 desta rodada é só o `revisor-bloco`.

Fechamento da rodada 1, com sonda própria do revisor sobre uma cópia:

- **Q-1 (a), sha256:** fechado. Com `sha256sum -c - || true`, o teste `sha256 errado sai ≠ 0…`
  reprova.
- **Q-1 (b), readback:** fechado. Com `= 4 ] || true`, o caso `FAKE_ACOES: '3'` reprova.
- **Q-1 (c), `Up`/`CertDias`:** fechado em parte. O `|| falha` tem catraca; as comparações, não.
  É o Q-1 abaixo.
- **Q-2, Q-3, Q-4 e Q-5:** fechados. Com o literal e a regex trocados de volta, o teste `prod`
  reprova.

Os gates da assinatura, da retenção e os dois `[ "$pontos" -gt 0 ]` também reprovaram com a sonda.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| 1 | Importante | A catraca do portão dos padrões ancora a saída de falha, mas não as comparações. A fixture tem dois cenários de falha, `FAKE_ERRA=up` e `FAKE_ERRA=cert`, e cada um inverte todas as respostas do padrão. No ramo `$.log`, a resposta é sempre 1 para `' 502 '`/`' 503 '` e 0 para o resto. Por isso apagar uma comparação deixa a suíte com 21 de 21 verdes. Os casos medidos: o `0 "$LIXO"` do `Up`, o `0 "$SONDA_FORA"` do `CertDias` e os dois `0` de 200 do 5xx. O ramo do loop em que o candidato é aceito pela API mas não se comporta nunca é exercido. A defesa contra um `Http5xx` que case toda requisição, que mandaria e-mail falso em série no `lotus-prod-5xx`, fica sem prova. | CONFIRMED | `deploy/aws/criar-observabilidade.sh:144-155`, `frontend/tests/fixtures/aws-falso.sh:30`, `:35` e `:47` | aguarda aprovação do João |
| 2 | Menor | O cabeçalho da fixture diz "sem eles, tudo existe e tudo passa". Mas sem `FAKE_RETENCAO` o readback da retenção recebe vazio e sai 1. Quem escrever o próximo cenário vai esperar `base` verde sem configurar nada. | CONFIRMED | `frontend/tests/fixtures/aws-falso.sh:6` e `:52`, `deploy/aws/criar-observabilidade.sh:172-174` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

**Sobre o alcance do Q-1.** A sessão principal sondou também as comparações positivas: apagou
`confere "$P_UP" 1 "$SONDA_OK"` e `confere "$candidato" 1 "$NGINX_502"` e rodou a suíte. Ficaram
21 de 21 verdes. Os arquivos voltaram idênticos ao HEAD, conferido com `cmp`. Como o `FAKE_ERRA`
inverte as três respostas do padrão, as outras duas ainda falham e o `|| falha` dispara de todo
jeito. As 10 comparações estão sem catraca individual, não só as negativas.

**Correção proposta.** A fixture ganha um `FAKE_INVERTE=<padrao>:<linha>` que vira a resposta de
uma única comparação:

- `<padrao>`: `up`, `cert`, `literal` ou `regex`;
- `<linha>`: `sonda-ok`, `sonda-fora`, `sonda-vencido`, `lixo`, `200-h1`, `502-h1`, `200-h2` ou
  `503-h2`.

Ela substitui o `FAKE_ERRA`. Um `it.each` cobre as 10 comparações:

- nas 6 de `Up` e `CertDias`, `base prod` sai 1 com a mensagem do padrão e sem `put-metric-filter`;
- nas 4 do literal, o loop cai na regex, e o `put-metric-filter` grava `P_5XX_REGEX`.

O comentário do cabeçalho (Q-2) passa a dizer que a retenção é a exceção. A sonda de prova apaga
cada comparação, uma por vez. Esforço: P.

### Padrão reincidente

É o terceiro caso de "palavra, não gate" da lição 19 e o segundo neste bloco. A emenda de
2026-10-05 pede a sonda `|| true`, que prova só a saída de falha. Um gate que soma várias
comparações num `&&` passa nela com um cenário que inverte tudo, como passou aqui. O texto a
seguir é proposto para acrescentar à emenda de 2026-10-05, e a decisão é do João:

> Gate que soma várias comparações (`a && b && c || falha`) tem uma sonda por comparação: apagar
> qualquer uma reprova a catraca, e a fixture tem o cenário que faz só aquela comparação responder
> errado. Um cenário que inverte todas as respostas ancora a saída de falha, não as comparações.

## Rodada 1 — `77196049..b0e26d71` — 2026-10-05 · Lente 1: opus · Lente 2: sonnet

Risco **alto**: infra de produção com efeito externo (CloudWatch, IAM e o agente instalado como
root no host), `config/database.php`, a imagem de produção e a emenda do ADR-21. A lente Codex foi
despachada e caiu sem devolver achado: `You've hit your usage limit ... try again at Nov 3rd, 2026`.
A lente 1 desta rodada é só o `revisor-bloco`.

O `revisor-bloco` deixou fora da lista, por já estarem decididos no `rulings.md` ou declarados
como limite na spec §8:
- a RSS do agente acima do portão D14, que o João aceitou;
- a inline em `/lotus/*`, que deixa o lab escrever em `prod`;
- o `RESOLVER[@]` vazio em bash < 4.4 (o host roda bash 5.2);
- o `.deb` baixado em `/tmp`;
- o readback que só conta as ações (M5);
- a query string do nginx no CloudWatch e o resíduo `Duplicate entry` do MySQL.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| 1 | Crítico | Três gates guardados só pela palavra (lição 19, emenda de 2026-09-26). **(a)** A catraca do sha256 do agente compara só posições no texto: com `sha256sum -c - \|\| true`, o teste segue verde. **(b)** A fixture responde `echo 4` sem cenário de falha, então o `= 4 \|\| falha` do readback pode sumir sem reprovar nada. **(c)** Nenhum `FAKE_*` faz `Up`/`CertDias` responderem errado. O código dos três gates está correto; o que falta é catraca que o guarde. | CONFIRMED | `frontend/tests/user-data.test.ts:99-102`, `deploy/aws/user-data.sh:72`, `frontend/tests/fixtures/aws-falso.sh:27-32` e `:58-60`, `deploy/aws/criar-observabilidade.sh:140-143` e `:217-219` | aguarda aprovação do João |
| 2 | Menor | `P_5XX_REGEX` é tentada antes do literal e foi a que entrou em produção. O `.` casa qualquer caractere, então uma URL forjada (`GET /HTTP/1.1--500- HTTP/1.1" 404`) incrementa a métrica de 5xx; o literal exige a `"` real, que o nginx escapa quando vem do cliente. Custo: só e-mail falso no `lotus-prod-5xx`. | CONFIRMED | `deploy/aws/criar-observabilidade.sh:47` e `:144`, `audit.md:44` | registrado, não bloqueia. A ordem regex-primeiro vem da spec §4.3; inverter é decisão do João |
| 3 | Menor | Andaime do plano ficou na sonda de produção: os marcadores `>>> VARIANTE A … troque pela VARIANTE B` e um `RESOLVER=()` sempre vazio, sendo que a variante B só existe no `plano.md:528` e a decisão (hairpin ok) já foi tomada. | CONFIRMED | `deploy/bin/sondar-saude.sh:18-24` e `:33` | registrado, não bloqueia |
| 4 | Menor | O comentário do canal `seguranca` diz que o teto `json-file` 10 MB × 3 "É a política de retenção deste log". A emenda de 2026-10-04 do ADR-21 passou a política para 30 dias no CloudWatch. O arquivo está fora do diff, mas o diff o desatualizou. | CONFIRMED | `backend/config/logging.php:115-118`, `docs/adrs.md:441` | divergência de doc: P-99 |
| 5 | Menor | Os quatro pares de catraca novos não entraram na lição 19, que exige pares nominais desde a emenda do item 12: `user-data.sh`, `sondar-saude.sh`, `criar-observabilidade.sh` e `Dockerfile.prod` ↔ `imagem-excecoes.test.ts`. | CONFIRMED | `docs/README.md:127` | divergência de doc: P-99 |

Placar: Crítico: 1 confirmado, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 4 confirmados, 0 plausíveis, 0 refutados

**Sobre o Q-1 (c).** O verificador confirmou (a) e (b) e deixou (c) sem leitura. A sessão principal
leu a fixture: o `test-metric-filter` de `$.up` e de `$.cert_dias` responde só pela presença da
chave na linha (`aws-falso.sh:27-32`), sem `FAKE_*` que o desvie. Os dois `|| falha` não têm cenário
que os acione.

**Sobre a severidade do Q-1.** O gabarito trata repetir lição mapeada como Crítico, e é isso que
pesa aqui, não um defeito em produção: os três gates funcionam hoje. O risco é a regressão. O ponto
mais sensível é o sha256 de um pacote instalado como root, que poderia virar `|| true` com a suíte
verde.

## Padrão reincidente

O Q-1 é a segunda ocorrência do caso "palavra, não gate" da lição 19. A primeira foi o Q-2 do
item 12, que gerou a emenda de 2026-09-26. A lição já diz a regra; o que falhou foi o plano. As
sondas das Tasks 3 e 4 do `plano.md` não pedem a `|| true` para nenhum dos três gates. Texto
proposto para a lição 19 (emenda do item 34), a decidir pelo João:

> Todo plano que criar ou mexer em gate (`exit`, `|| falha`, `|| exit 1`) num arquivo guardado
> lista, na Task que o cria, a sonda que acrescenta `|| true` ao gate e o cenário da fixture (ou a
> entrada) que faz o gate disparar. A Task só fecha com a sonda reprovando a catraca. Uma asserção
> de ordem ou de presença de texto (`indexOf`, `toContain`) não conta como catraca de gate.
