---
paths:
  - "backend/lang/**"
---

# Backend — arquivos de tradução (`backend/lang/`)

Três locales, sempre os três: `en`, `es_CL`, `pt_BR`. `LocaleParityTest` reprova chave que exista
em um e falte em outro, e `MensagemLiteralTest` reprova frase ao usuário que nasça literal em
`app/` em vez de sair daqui.

## Pint: só os arquivos que você tocou — nunca a pasta

```bash
cd backend && ./vendor/bin/pint lang/es_CL/operation.php   # os arquivos, um a um
```

**Nunca `pint lang/`, nunca `pint` sem argumento.** O CLAUDE.md §6 já diz isso para o repo inteiro;
esta rule existe porque o acidente **reincidiu aqui duas vezes** — uma sobrou como
`stash@{0}: pint-acidental-repo-inteiro-fechamento`, e a outra entrou no bloco
`backend-envelope-de-erro-e-recusa-de-dominio` (Q-3 do review de 2026-09-03).

O motivo é medido, não estético: `validation.php`, `actions.php`, `http-statuses.php`,
`passwords.php`, `pagination.php` e `auth.php` dos três locales **já reprovavam `pint --test` antes**
(`binary_operator_spaces` — são arquivos herdados do pacote de traduções, alinhados com `=>` em
coluna). Rodar pint na pasta reformata os seis × três locales de uma vez: **2.706 linhas de diff
sem uma única mudança semântica**, dentro de um commit de feature. O blame das traduções vai junto,
e o revisor de um bloco de peso legal precisa peneirar 98% de ruído para achar as linhas que
importam.

Verificação barata antes de commitar um bloco que tocou `lang/`:

```bash
git diff -w --stat main...HEAD -- backend/lang/   # o que sobra aqui é a mudança REAL
```

Se o diff cru for muito maior que o `-w`, você reformatou arquivo que não tocou. Pagar a dívida de
formatação é legítimo — mas em `chore(lang): pint` próprio, nunca de carona num `feat`.

## As três portas até a tela

Frase que o usuário lê nunca nasce em `app/`. São três os caminhos, e o
`MensagemLiteralTest` cobre os três:

1. `ValidationException::withMessages(['campo' => ...])` — o par literal reprova;
2. `new AlgumaException('...')` — literal reprova, salvo linha declarada em `DEBITO_CONHECIDO`;
3. **o helper que repassa para `withMessages`** — ex.: `CertificateEligibility::refuse()`, que
   recebe `[$field => $message]` em variáveis. A régua descobre o encaminhador pelo corpo (não pelo
   nome) e cobra a frase no CHAMADOR dele.

A terceira foi aberta até 2026-09-03 (Q-7 do review): seis recusas de emissão de certificado
ficaram literais em es-CL e atravessaram inteiras o bloco que traduziu as outras 41. Helper novo
com outro nome já nasce coberto — mas se você inventar uma quarta forma de chegar à tela, ela não
está coberta, e a catraca é sua para estender.

## Terminologia es-CL

O produto é chileno e do setor de capacitação. **O papel `redator` chama-se `relator` em es_CL** —
`redactor` é falso cognato e diz outra coisa. Alinhado no review de 2026-09-03 (Q-5), depois de o
mesmo arquivo passar a mostrar os dois termos para a mesma pessoa.

Exceção, e só ela: **`sin_redactor` é valor de máquina**, não texto. Ele é caso do enum
`EmissionBlockReason`, atravessa o `generated.ts` e é lido pelo SPA — renomeá-lo é mudança de
contrato (§5.3), não correção de tradução. Fica como está.
