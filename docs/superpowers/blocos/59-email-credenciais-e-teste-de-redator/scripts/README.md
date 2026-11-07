# Scripts de senha temporária — teste de redator (bloco 59)

Três snippets de `tinker` que dão uma senha temporária às duas contas de redator do teste, deixam o
João navegar pela UI do redator e depois apagam a senha. Allowlist fixa nos três:
`app()->environment('production') ? [252, 253] : [2, 5]` (local: 2 = Juan Morales, 5 = Carlos Fuentes).

| Arquivo | Escreve? | O que faz |
| --- | --- | --- |
| `impressao-digital.php` | não | `env=… session=…`, aponta `RECUSADO` se houver, e uma linha por id |
| `trocar-senha.php` | sim | guarda; `Str::password(32)` + `Hash::make` + `save()` por id; imprime `<id> senha=…` e a impressão digital nova |
| `limpar-senha.php` | sim | recusa se `session.driver !== 'database'`; guarda; senha aleatória descartada, `remember_token` nulo, `DELETE FROM sessions` do id; **não** imprime senha |

Linha de impressão digital: `<id> type=… ativo=… hash=<8 hex do sha256 da senha> sessoes=… convites=…
resets=… logins=… updated_at=…`. Só o `hash` e `updated_at` mudam numa troca/limpeza; é a prova de que
nada além do esperado foi escrito.

**Guarda (igual nos três).** Para cada id: existe, `type === 'redator'`, `is_active === true`. Qualquer
falha imprime `RECUSADO: <id> <motivo>` e **nenhum** id é escrito (todos são checados antes do primeiro
`save()`). A escrita passa por Eloquent de propósito: a auditoria (owen-it) só dispara por `save()`.

## Como rodar (provado no Step 3, local)

Os arquivos não têm `<?php` (o PsySH lê stdin como código de tinker) e são ASCII de propósito: o
PsySH embaralha o eco de UTF-8, e a saída útil aparece depois do eco do código.

```bash
# local (de dentro da worktree)
docker compose exec -T app php artisan tinker < docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/impressao-digital.php

# produção
ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 \
  "sudo docker exec -i lotus-app-1 php artisan tinker" \
  < docs/superpowers/blocos/59-email-credenciais-e-teste-de-redator/scripts/impressao-digital.php
```

A forma de produção usa o mesmo stdin e **não foi executada** nesta task (escrita remota em produção é do
João); só a forma local foi provada. Confira o `env=production` na primeira linha antes de seguir.

## Ordem

1. `impressao-digital` — registra H0 (hash de cada id).
2. `trocar-senha` — registra H1; **copie a senha só para o gerenciador do João, nunca para arquivo, chat
   ou relatório.**
3. Checklist de navegação (Task 4 do plano).
4. `limpar-senha` — H2, `sessoes=0` esperado.
5. `impressao-digital` — H3: `hash` diferente de H0 e de H1, `sessoes=0`.

Rodar `trocar-senha` de novo gera outra senha (a anterior deixa de valer); rodar `limpar-senha` de novo
é inofensivo (mais uma senha aleatória descartada).

## Proibições

- **Não edite a allowlist em produção.** Os ids 252 e 253 são o escopo aprovado; outro id é outro bloco.
- **Não cole a senha em lugar nenhum** (arquivo, commit, ticket, chat, relatório).
- Não troque `save()` por `DB::table('users')->update(...)`: sem auditoria, sem rastro.
- Não rode `limpar-senha` com `SESSION_DRIVER` diferente de `database` (ele mesmo recusa).
