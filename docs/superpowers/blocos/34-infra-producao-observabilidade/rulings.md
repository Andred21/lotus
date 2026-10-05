# Bloco 34 — rulings da execução

Decisões tomadas durante o `/executar-bloco 34` (SDD, Tasks 1 a 10). Cada linha diz quem decidiu
e quanto custa se a decisão estiver errada.

## Do João

- **Task 6, portão D14 da RSS excedido: aceitar e seguir.** O agente CloudWatch mediu 112.8 MiB
  de RSS no lab (≈ 118 MB, acima dos ~100 MB do portão), dos quais 28.8 MiB são heap e 84.0 MiB
  páginas limpas do binário. O critério "RSS dentro do portão" do mapa de DoD cede a essa
  decisão; a leitura está no `audit.md` (Task 6) e na P-80. **Se estiver errado:** o host de
  2 GiB, já com swap em uso, perde RAM para o agente; o recuo é desligar o agente com
  `systemctl disable --now` (runbook §14), sem desfazer o resto do bloco.

- **Revisão final, I1: ligar `zend.exception_ignore_args = On` na imagem de produção.** O canal
  `stderr` grava o stack trace, e sem a diretiva cada argumento string ia ao CloudWatch, por 30
  dias, com até 15 caracteres, o que cabe num RUT. Foram acrescentados `docker/php/excecoes.ini`,
  o COPY no `docker/Dockerfile.prod` e a catraca `imagem-excecoes.test.ts`; o ADR-21 declara o
  efeito. **Se estiver errado:** os traces de produção perdem o valor dos argumentos, mas mantêm
  arquivo, linha e função; reverter é tirar um ini e uma linha de COPY.

- **`/revisar-bloco`, rodada 1 (2026-10-05): corrigir os cinco achados e emendar a lição 19.**
  O João aprovou corrigir o Q-1 (Crítico) e levar os quatro Menores na mesma rodada.
  - **Q-2 inverte a ordem da spec §4.3:** o literal do 5xx vem antes da regex, que fica como recuo.
    O `.` da regex deixa uma URL forjada (`/HTTP/1.1--500-`) contar como 5xx. O literal exige a
    aspa real que fecha a linha de requisição. A produção tem hoje o `Http5xx` com a regex
    (`audit.md`, Task 6). **O João reroda `deploy/aws/criar-observabilidade.sh base prod` antes de
    preencher o item 1 do `aceitacao.md`:** o script confere o literal no `test-metric-filter` e o
    `put-metric-filter` sobrescreve o filtro de mesmo nome.
  - **A emenda da lição 19** registra os quatro pares do bloco e obriga o plano a listar, para cada
    gate, a sonda `|| true` e o cenário que o faz disparar.

  **Se estiver errado:** o literal lista só `HTTP/1.0`, `HTTP/1.1` e `HTTP/2.0`. Uma versão de
  protocolo nova, como o `HTTP/3` (o nginx não serve hoje), passa a não contar. Nesse caso o
  recuo é a regex de volta na frente.

- **`/revisar-bloco`, rodada 2 (2026-10-05): corrigir o Q-1 e o Q-2 e acrescentar à lição 19.**
  O `FAKE_ERRA` da fixture dá lugar ao `FAKE_INVERTE=<padrao>:<linha>`, que vira a resposta de
  uma só das 10 comparações do portão dos padrões. Cada comparação ganha o seu caso de teste. O
  cabeçalho da fixture diz que a retenção é a exceção ao "tudo passa". O acréscimo à lição 19: um
  gate de várias comparações tem uma sonda por comparação. **Se estiver errado:** só um cenário
  de fixture a mais. O script de produção não muda.

## Do controlador, em nome do João

- **Tasks 1 e 6 feitas pelo controlador, não despachadas.** Dependem de SSH em produção e de
  escrita na AWS, que são do João (Handoff do plano); um `revisor-task` independente revisou cada
  commit. **Se estiver errado:** nenhum custo de código; só a ordem de quem escreveu o audit.
- **Pipeline de profundidade 1 (Passo 5.1 do `/executar-bloco`), desvio declarado da SDD
  sequencial.** Rodou em G1 (2, 3, 4, 5) e G2 (7, 8, 9), uma revisão em segundo plano por vez,
  cada revisor numa worktree efêmera destacada no commit da task. **Se estiver errado:** achado
  fantasma de árvore intermediária; nenhum apareceu, e as worktrees foram removidas.
- **Task 1, SSH com `-o HostKeyAlias=<EIP>`** em vez de gravar o nome do host no `known_hosts`:
  a chave ed25519 do nome é a mesma já confiada sob o IP. **Se estiver errado:** nenhum; o
  `known_hosts` não mudou.
- **Task 1, o audit mantém `<EIP>`, `<conta>` e `<instancia>` literais** apesar do "nenhum `<…>`"
  do plano: o próprio plano manda escrever `<EIP>`, e o cabeçalho das regras traz os outros.
  **Se estiver errado:** trocar três marcadores no `audit.md`.
- **Tasks 2 e 4, comentários dos scripts e da fixture em ASCII** (`§` e `—` do plano trocados):
  a Global Constraint de ASCII vence o texto literal do plano. **Se estiver errado:** nenhum;
  só pontuação em comentário.
- **Task 2, o teste do plano reprovava o `pnpm lint`** (`no-useless-assignment` em
  `let linhas: string[] = []`); corrigido tirando o inicializador, em commit novo (`6daab29f`).
  **Se estiver errado:** nenhum; sem mudança de comportamento.
- **Task 4, o comentário "conferido no lab" do `criar-observabilidade.sh`** ficou até a Task 6
  ler o `fstype` do lab, que deu `ext4`, como o comentário diz. **Se estiver errado:** comentário
  impreciso.
- **Task 9, a frase da RSS na P-80 foi reescrita:** o molde do plano supunha o portão passado, e
  copiar "~100 MiB" ao lado de 112.8 MiB sem dizer que excedeu seria registro enganoso. A frase
  nova registra o excesso, a divisão heap/páginas e a aceitação do João. **Se estiver errado:**
  reescrever uma frase da P-80.
- **Task 10, `noreply@anthropic.com` isento do grep de higiene:** é o trailer `Co-Authored-By`
  dos modelos de commit do `plano.md`, não e-mail de cliente, conta ou pessoa. **Se estiver
  errado:** um endereço noreply público fica no `plano.md`, sem dado da conta nem do cliente.

- **Revisão final, `Dockerfile.prod` e `docker/php/excecoes.ini` fora do Mapa de arquivos,** pela
  decisão do João no I1. A prova roda na base `php:8.3-fpm-alpine` do estágio `app`, pelo digest,
  com o ini montado; o build da imagem inteira não rodou, e a catraca amarra o COPY. **Se estiver
  errado:** o ini não entra na imagem e o CI não acusa; a Fase B pega isso com `ini_get` no
  contêiner.
- **Revisão final, DoD 3 ("RSS dentro do portão") sem emenda na spec:** a spec não muda na
  execução (precedente do bloco 33), e a cessão do D14 fica registrada acima, como decisão do
  João. **Se estiver errado:** o `/finalizar-bloco` lê o DoD 3 como reprovado se não ler este
  arquivo.
- **Revisão final, M4: o §14.5 do runbook acha o stream pelo ID** (`describe-log-streams` com
  `contains`), em vez de afirmar o prefixo `<instância>_var_lib…`, que o lab não registrou.
  **Se estiver errado:** só um comando mais longo no runbook.
- **Revisão final, adiado 3 corrigido:** um `fetch-config` que falha apaga a config antes de
  sair, e a reexecução do user-data reaplica. **Se estiver errado:** nenhum custo no caminho
  feliz, que o lab provou.
- **Revisão final, adiados 8 e 9 corrigidos:** o audit e a P-80 separam a decisão do João da
  leitura do controlador e citam o portão como "~100 MB", como está na spec.

- **Revisão final, os dois resíduos da re-revisão (linhas acima de 100 colunas na P-80 e no
  audit) foram corrigidos pelo controlador** num commit só de reflow (`30c5255b`), fora da rodada
  única de correção; o `word-diff` saiu vazio. **Se estiver errado:** nenhum; nenhuma palavra
  mudou.

## Minors estacionados

- **M5, o readback dos alarmes confere só a contagem das ações, não o tópico**
  (`criar-observabilidade.sh`): o script grava `--alarm-actions "$TOPICO"` na mesma execução, e a
  contagem 0 pega a ação ausente. **Se estiver errado:** um alarme que aponte para outro tópico,
  trocado à mão no console, passa no readback.
- **Task 1, a abertura do audit está em prosa, não no molde literal do plano.** As leituras e os
  valores são os mesmos. **Se estiver errado:** só a forma da seção.
- **Descartados na revisão final, com o motivo do revisor:**
  - a sonda sem `curl` (o user-data instala o `curl`);
  - `RESOLVER[@]` com bash < 4.4 (o host tem bash 5.2);
  - o `.deb` em `/tmp` (o sha256 é conferido);
  - o readback dos metric filters (o `set -e` derruba antes);
  - a inline truncada no readback (não se reproduziu);
  - a inline em `/lotus/*` (conforme a spec, §8);
  - o `flush_interval` do ADR-14 (vale para a config versionada);
  - os 2 períodos de 5 min do disco no ADR-14 (o ADR aponta para o §14).
