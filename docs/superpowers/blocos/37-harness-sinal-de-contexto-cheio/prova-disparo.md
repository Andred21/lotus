# Prova de disparo do `sinal-contexto.sh` (DoD 2)

Data: 2026-10-04, 19:27 (-03). `HEAD` da lane na sessão da prova: `dbd34892`.

Uma sessão interativa nasceu no diretório da lane, rodada pelo João. O controlador recebeu o que
ela mostrou e grava aqui o registro. A sessão da prova não escreveu nada.

## Comando

```bash
cd /home/jvbat/projetos/lotus-37-harness-sinal-de-contexto-cheio && LOTUS_CONTEXTO_LIMIAR=20000 claude
```

## Primeiro prompt: as chamadas de ferramenta

```text
Rode `pwd` e depois `date`, uma chamada de Bash para cada. Não escreva nada.
```

O modelo fez as duas chamadas de Bash, e o terminal mostrou a mensagem do hook uma vez:

```text
PostToolUse:Bash says: Contexto em ~54 mil tokens, acima de 20 mil. Nao abra unidade nova: feche a task atual, grave em fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este aviso nao repete ate o contexto cair abaixo do limiar.
```

- O texto é o da spec §1.5. A medição foi de ~54 mil, dentro da faixa esperada de ~40 a ~75 mil.
- A interface juntou as duas chamadas numa linha só ("Ran 2 shell commands") e mostrou o aviso
  uma única vez abaixo dela. Por isso não dá para dizer se ele saiu depois do `pwd` ou do `date`.
  Em qualquer dos casos, a outra chamada não repetiu o aviso.
- A resposta do modelo, logo abaixo, já reagiu ao aviso: "O hook sinal-contexto avisou que o
  contexto está em ~54 mil tokens, acima do limiar de 20 mil." Isso mostra que o
  `additionalContext` chegou a ele nesse mesmo turno.

## Segundo prompt: o canal do modelo e o silêncio do `UserPromptSubmit`

```text
Algum hook te mandou aviso de contexto nesta sessão? Cite o texto exato.
```

Resposta do modelo, como o João a copiou:

```text
Sim, um. Ele veio como contexto adicional do hook PostToolUse:Bash, logo depois das duas chamadas de Bash (pwd e date). O texto exato foi:

▎ Contexto em ~54 mil tokens, acima de 20 mil. Nao abra unidade nova: feche a task atual, grave em fronteira duravel (commit, estado.md) e peca ao Joao /compact ou /clear. Este aviso nao repete ate o contexto cair abaixo do limiar.

O hook de SessionStart também mandou uviso de contexto. Ela listava as lanes, indicava que esta sessão é a lane 37 e avisava de uma árvore órfã (lotus-preview).
```

- O modelo citou o aviso palavra por palavra. Isso prova que o `additionalContext` chegou a ele.
- O "aviso" do `SessionStart` que ele cita é o inventário de lanes, não um aviso de contexto. Não
  é o `sinal-contexto.sh`.
- Neste prompt o hook não repetiu o aviso: o `UserPromptSubmit` encontrou a marca da sessão.

## Constatação

O aviso saiu **uma vez** na sessão. Não se repetiu na outra chamada de Bash nem no segundo
prompt. Os dois canais funcionaram: o `systemMessage` apareceu para o João no terminal, e o
`additionalContext` chegou ao modelo.
