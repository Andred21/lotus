# Bloco 36 — rulings da execução

Decisões tomadas durante a execução. Cada linha diz quem decidiu e quanto custa se a decisão
estiver errada.

## Do controlador, em nome do João

- **Pipeline de profundidade 1 (Passo 5.1 do `/executar-bloco`) não usada.** O loop rodou
  estritamente sequencial: as tasks eram curtas e o controle fica mais simples. **Se estiver
  errado:** custou só tempo de parede.
- **I-2 da revisão final: `curl` com `-g` em vez de recusar `[]{}` no caminho.** A URL vai
  literal, e a gramática da prova não fica mais estreita: uma query `filter[x]=` continua
  válida. Registrado como emenda E7 na spec (§1.4) e no Global Constraint do plano. **Se estiver
  errado:** reverter a flag e a E7; a alternativa recusaria no `gerar`, não no `conferir`.
- **I-1 da revisão final: o `aceitar` restaura o `estado.md` antes do `LANE PELA METADE`**, e o
  `lane.sh fechar` indicado na mensagem passa. O mesmo defeito no `semear_estado` do `abrir`
  existia antes do bloco e ficou fora. **Se estiver errado:** uma falha no meio do `abrir`
  continua exigindo limpeza manual.
- **M-1 da revisão final corrigido junto** (uma frase no Passo 5 do `finalizar-bloco.md`). Os
  outros minors ficaram como o `revisor-branch` triou. **Se estiver errado:** ficam polimentos
  pendentes no harness:
  - `aceitacao.py`: `\d` casa dígito Unicode (`[0-9]` ou `re.ASCII` resolveria; texto do plano);
  - `aceitacao.py`: o `escrever_tabela` trunca com `"w"` (arquivo temporário mais `os.replace`
    protegeria a palavra manual numa queda no meio);
  - `aceitacao.py`: `LINHA_PROVA` aceita `- prova:` na coluna 0;
  - `aceitacao-aliases.conf` com comentários acentuados (texto do plano; o arquivo é dado);
  - `aceitacao.sh`: falha do `ler-frontmatter.py` vira a recusa `efeito_externo: null`;
  - `aceitacao.sh`: o `printf` do `MEDIDO` passa de 100 colunas;
  - `lane.sh`: a checagem "branch já existe" do `aceitar` é inalcançável (o portão 3 recusa
    antes) e não tem teste; o glob `"$nn"-*` não casaria pasta legada `0N-…` (teórico);
  - `classificar-comando.py`: o aninhamento `len(params) in (1,3)` é indireto (texto do plano);
  - `finalizar-bloco.md`: o ramo `PORTAO RECUSOU` do 6a não distingue a lane do bloco da lane de
    aceitação (o fluxo é igual), e o YAML do `blocker` no 6e passa de 100 colunas;
  - `prova-catraca.md`: o placar aparece como `<placar do plano>` em vez do `awk` literal.
- **A revisão final da branch rodou antes da Task 9**, sobre `20aa04ef..b1ed0031`. A onda de
  correção levou a ponta a `df228dce`, e a Task 9 provou essa ponta no clone. Ela só acrescenta
  o `prova-clone.md` e não teve revisão de task. **Se estiver errado:** o `prova-clone.md` entra
  no `/revisar-bloco` sem um revisor anterior.
- **Briefs das tasks extraídos por faixa de linha do plano.** O `task-brief` da SDD se perdeu nas
  cercas de código e vazava até o fim do plano. **Se estiver errado:** um brief truncado; o
  implementador teria pedido contexto, e nenhum pediu.
