# Rulings: bloco 62, decisões tomadas em nome do João

Cada decisão vem com o que custa se estiver errada. A execução foi a `subagent-driven-development`, de 652c01a2 até o fechamento.

## Processo

- **Pipeline de profundidade 1** (Passo 5.1 do `/executar-bloco`). Este é um desvio declarado do loop sequencial da SDD. As Tasks 3 e 7 rodaram em paralelo: a 3 na sessão e a 7 com o implementador. O grupo G1 do plano declara as duas disjuntas, e a 7 só consome a Task 1. Custo se errado: um commit concorrente no index. Foi mitigado: a sessão só commitou a Task 3 depois que o implementador da 7 terminou.
- **Ordem de execução:** 1, 2, (3 ∥ 7), 4, 5, 6, 8, 9, 10, 11. Custo se errado: nenhum além do item acima.
- **A Task 4 foi inteira ao `implementador-integracao`,** incluindo a varredura de N do Step 5. Custo se errado: a medição feita por subagente pode ser menos criteriosa. A sessão conferiu o registro antes de aceitar.
- **O Step 4 da Task 3 (comparar `pdftoppm` antes e depois) foi reduzido ao baseline.** Nenhum código de renderização mudou, então o documento é igual por construção. Custo se errado: falta uma evidência redundante.
- **As correções da Task 3 foram feitas pela sessão,** porque o Handoff dá a Task 3 à sessão principal. Houve re-revisão escopada. Custo se errado: perde-se a independência entre implementador e corretor, mitigada pelo re-revisor.
- **Seed da prova (Task 10):** a matrícula aprovada sem certificado (matrícula 46, turma 3) foi inserida pelo `tinker`, porque o domínio não matricula em turma concluída. O revogado foi feito pela tela. Custo se errado: nenhum em produção; é dado só do banco da lane.

## Gotenberg e lote

- **`GOTENBERG_CONCURRENCY=2`.** A folga de 20% que o plano exige foi lida na mediana: N=2 dá 20% na mediana e 17% no pior caso. A spec §5.6.3 só exige estabilidade sem reinício nem OOM. Custo se errado: `GOTENBERG_CONCURRENCY=1` por env, e o ZIP fica ~37% mais lento.
- **Teto do ZIP = 70 certificados,** extrapolado da medição de 60. Custo se errado: ajustar a constante depois de medir um ZIP real em produção, que é o item 1 do `aceitacao.md`.
- **O lote vai ao Gotenberg por `Http::pool` com `asMultipart`.** A chave `GOTENBERG_CONCURRENCY` fica comentada no `env.prod.example`, porque o `conferir-alinhamento.sh` lê só linhas ativas. Custo se errado: a chave não aparece no alinhamento, e o default 2 do `config/services.php` vale.
- **A falha persistente do conversor no ZIP responde 503 com `Retry-After` e PublicDetail,** no molde do `ScannerUnavailableException`, reportando a causa. O 422 fica só para snapshot inválido, teto e conjunto vazio. A spec §5.5 não fixa o status. Custo se errado: trocar o status num `throw` e num teste.
- **Orçamento de 60 s nas novas tentativas do lote e timeout de 15 s por requisição do lote** (achado I-1 da revisão final). O `render()` unitário segue com 30 s. Custo se errado: um conversor muito lento corta um PDF válido; nesse caso, subir os 15 s.
- **Só um ZIP gerado por vez no sistema todo,** com `Cache::lock('certificate-zip', 150)` (achado I-2). Sem vaga, a resposta é 503 com "tente de novo". Custo se errado: dois usuários gerando ZIP ao mesmo tempo — um espera e tenta de novo.
- **NÃO apliquei `request_terminate_timeout` no `docker/php/www.conf`, porque limita toda requisição do app.** Decisão de infra sua. Custo se errado: com o Gotenberg aceitando conexão e nunca respondendo, a primeira passada de 70 PDFs ainda segura um processo do PHP por até ~9 min, porque o orçamento de 60 s só vale para as novas tentativas. O lock expira aos 150 s e deixa entrar um segundo ZIP. Com `request_terminate_timeout = 125s` esse caso fecha.
- **A mensagem de diagnóstico do `batchFailed` continua dizendo "mesmo depois de uma nova tentativa"** também para os itens que o orçamento poupou. Custo se errado: só o texto do log fica impreciso; a tela usa `lang/`.

## Planilha e exportação

- **O link `ABRIR` é uma fórmula `HYPERLINK` com o valor gravado em cache,** e as células de texto são gravadas como string explícita, o que impede injeção de fórmula. Custo se errado: nenhum conhecido. O critério 10 (Excel → Gmail) foi provado por você.
- **Limitadores:** `certificate-export` com 30/min (resumo e planilha no mesmo balde) e `certificate-zip` com 5/min. O limitador público do PDF não mudou. Custo se errado: ajustar uma constante em `RateLimits`.
- **Exceção do DTO de query da exportação no `InputDataDefaultsTest`.** Custo se errado: uma entrada a menos na catraca.
- **O ZIP checa antes de renderizar se algum certificado não é apresentável (`naoApresentaveis`)** e recusa com 422 nomeando os códigos. Custo se errado: nenhum além de uma ida a mais ao banco.
- **Um único "hoje" por requisição no ZIP.** Na planilha, o "hoje" ainda é calculado duas vezes (achado M-f da revisão final, deixado). Custo se errado: numa virada de meia-noite em Santiago, no máximo uma linha muda de estado.
- **Entradas novas de débito no `MensagemLiteralTest`** para as mensagens de diagnóstico. Custo se errado: o débito cresce em vez de diminuir.
- **CORS expõe `Content-Disposition` e `Retry-After`.** Sem isso, em dev, que tem origens separadas, o arquivo baixava com nome genérico. Custo se errado: dois headers expostos às origens já permitidas, sem efeito prático.

## Frontend

- **O front não lê o `Retry-After`:** o diálogo diz "unos segundos". Custo se errado: o aviso não diz quantos segundos esperar.
- **O texto do aviso sem filtro é "Se exportarán N certificados: todos los certificados".** Custo se errado: só a redação.
- **O 504 do nginx e as respostas não-JSON não mostram o convite a tentar de novo** (T9 M-3, deixado, porque corrigir exige mexer em `shared/api`). Custo se errado: num ZIP que estoura o tempo, aparece a mensagem genérica. Candidato a item D.
- **Testes do filtro de cotação e da exportação foram para arquivos irmãos** (`*.quote.test.tsx`, `*.export.test.tsx`, `*.exportDownload.test.tsx`, `EmissionPanel.back.test.tsx`), por causa do `max-lines`. Custo se errado: ~60 linhas de helper de teste duplicadas.
- **A cache das cotações (`quotesKey`) é invalidada junto com a dos certificados.** Não há teste dedicado. Custo se errado: o combo de cotação fica desatualizado até recarregar.
- **A coluna Cotação do Historial ficou com a largura atual,** e os nomes cortam em 1440 px. Custo se errado: ajustar a largura numa linha.

## Task 11 (pedido seu, fora do plano)

- **A chave `certificate.cardPending` foi trocada por `cardToIssue` e `cardIssued`,** para o "por emitir" ter cor própria. O "por emitir" usa o tom `info`, porque o `warning` já marca o estado bloqueado. Custo se errado: trocar o tom numa linha.
- **A barra de filtros foi extraída para `EmissionFilters.tsx`,** por causa do `max-lines`. Custo se errado: nenhum.
- **"Emitir todos" continua aparecendo, desabilitado, quando não há pendentes.** Custo se errado: tirar o botão nesse caso.
- **Ficaram como estão quatro pontos pequenos da revisão da Task 11:**
  - o card mostra "1 emitidos", sem plural — o mesmo defeito já existia no texto antigo;
  - o teste da mesma linha depende da estrutura do DOM;
  - a linha do botão de voltar em 390 px e o hover do tema escuro não foram capturados;
  - a seta do voltar fica ~20 px recuada, porque o botão de texto tem padding próprio, igual ao `DetailHeader`.

  Custo se errado: um ajuste de chave `_one`/`_other` e alinhamento cosmético.
