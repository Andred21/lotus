[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# Portao de efeito externo (spec do bloco 36, secoes 1 e 3): o aceitacao.sh
# contra repositorios descartaveis. Nenhuma prova sai para a rede externa:
# `gerar` nao mede nada, e `conferir` mede contra um http.server em
# 127.0.0.1 ou contra um curl falso que so anota os argumentos.

ACEITACAO_SH="$DIR_TESTES/../scripts/aceitacao.sh"
_AC_P=docs/superpowers/blocos/50-demo
_ac_t=$(mktemp -d "${TMPDIR:-/tmp}/lotus-aceitacao.XXXXXX"); registrar_descarte "$_ac_t"
printf 'teste http://teste.local\noutro-alias http://outro.local:8443\n' > "$_ac_t/aliases.conf"
AC_ALIASES="$_ac_t/aliases.conf"
AC_CURL=false

ac_novo() {
  # $1 = efeito_externo, $2 = active_spec (vazio vira null). Repo
  # descartavel novo em AC_R, com o estado.md do bloco 50.
  AC_R=$(criar_repo); registrar_descarte "$AC_R"
  mkdir -p "$AC_R/$_AC_P"
  printf -- '---\nschema_version: 3\nid: 50\nslug: 50-demo\nworkflow_state: ready_for_closure\nactive_spec: %s\nefeito_externo: %s\n---\n' \
    "${2:-null}" "$1" > "$AC_R/$_AC_P/estado.md"
}

ac_spec() { cat > "$AC_R/$_AC_P/spec.md"; }   # stdin = a spec do bloco 50

ac_spec_padrao() {
  ac_spec <<'SPEC'
# Bloco 50 — spec

## Desenho

1. Item numerado fora da secao nao conta.
   - prova: teste GET /fora -> 200

## Verificação externa

1. Publicar a rota /up, com o texto quebrado
   em duas linhas.
   - prova: `teste GET /up -> 200`
2. O João confere o e-mail de alerta.
   - prova: nenhuma

## Depois

1. Outro item fora da secao.
SPEC
}

ac_rodar() {
  # $@ = argumentos do aceitacao.sh, rodado de AC_R. Seta AC_SAIDA (stdout
  # e stderr), AC_COD e AC_ULTIMA.
  AC_SAIDA=$(cd "$AC_R" && ACEITACAO_ALIASES=$AC_ALIASES ACEITACAO_CURL=$AC_CURL \
    bash "$ACEITACAO_SH" "$@" 2>&1)
  AC_COD=$?
  AC_ULTIMA=$(printf '%s\n' "$AC_SAIDA" | tail -n 1)
}

ac_tabela() { cat "$AC_R/$_AC_P/aceitacao.md" 2>/dev/null; }

ac_linha() {
  # $1 = numero do item. A linha dele na tabela.
  ac_tabela | grep -E "^\| $1 \|"
}

ac_recusa() {
  # $1 = trecho do motivo, $2 = titulo. A recusa sai 2, pelo portao.
  assert_igual 2 "$AC_COD" "$2: sai 2"
  assert_contem "$AC_SAIDA" 'PORTAO RECUSOU' "$2: pelo portao"
  assert_contem "$AC_SAIDA" "$1" "$2: pelo motivo certo"
}

ac_nada_escrito() {
  # $1 = titulo.
  if [[ -e $AC_R/$_AC_P/aceitacao.md ]]; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: o aceitacao.md nasceu\n' "$1"
  else
    printf '  ok    %s: nada escrito\n' "$1"
  fi
}

ac_manual() {
  # $1 = numero do item manual, $2 = resultado, $3 = data. Escreve as duas
  # celulas como o Joao escreveria.
  sed -i -E "s/^\| $1 \| (.*) \| manual \|  \|  \|\$/| $1 | \1 | manual | $2 | $3 |/" \
    "$AC_R/$_AC_P/aceitacao.md"
}

# --- gerar: a tabela
ac_novo sim "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'gerar sai 0'
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (2 item(ns))" "$AC_ULTIMA" \
  'gerar anuncia o caminho e a contagem'
assert_igual '| 1 | Publicar a rota /up, com o texto quebrado em duas linhas. | `teste GET /up -> 200` |  |  |' \
  "$(ac_linha 1)" 'item automatico, com a linha de continuacao no texto'
assert_igual '| 2 | O João confere o e-mail de alerta. | manual |  |  |' "$(ac_linha 2)" \
  'prova nenhuma vira item manual'
assert_igual 2 "$(ac_tabela | grep -cE '^\| [0-9]+ \|')" \
  'so os itens da secao: o numerado de antes e o de depois ficam fora'
assert_contem "$(ac_tabela)" '# Bloco 50 — aceitação externa' 'titulo da tabela'
assert_contem "$(ac_tabela)" '| # | Item | Prova | Resultado | Data |' 'cabecalho de cinco colunas'
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/antes.md"
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'gerar de novo sai 0'
if cmp -s "$_ac_t/antes.md" "$AC_R/$_AC_P/aceitacao.md"; then
  printf '  ok    gerar e idempotente\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA gerar e idempotente\n'
fi
ac_manual 2 'recebido as 10h' 2026-10-04
ac_rodar gerar 50
assert_igual '| 2 | O João confere o e-mail de alerta. | manual | recebido as 10h | 2026-10-04 |' \
  "$(ac_linha 2)" 'gerar preserva o resultado manual'
assert_nao_contem "$AC_SAIDA" 'aviso' 'nada descartado, nenhum aviso'

# --- identidade: texto mudado e prova mudada descartam, com aviso
sed -i 's/O João confere o e-mail de alerta./O João confere o SMS de alerta./' "$AC_R/$_AC_P/spec.md"
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'texto mudado: gerar sai 0'
assert_contem "$AC_SAIDA" 'aviso: o item 2 mudou na spec' 'texto mudado: avisa o descarte'
assert_igual '| 2 | O João confere o SMS de alerta. | manual |  |  |' "$(ac_linha 2)" \
  'texto mudado: o resultado volta a vazio'
sed -i -E 's/^\| 1 \| (.*) \|  \|  \|$/| 1 | \1 | `200`, esperado `200`: OK | 2026-10-01 |/' \
  "$AC_R/$_AC_P/aceitacao.md"
sed -i 's/- prova: `teste GET \/up -> 200`/- prova: nenhuma/' "$AC_R/$_AC_P/spec.md"
ac_rodar gerar 50
assert_contem "$AC_SAIDA" 'aviso: o item 1 mudou na spec' 'prova mudada, texto igual: avisa o descarte'
assert_igual '| 1 | Publicar a rota /up, com o texto quebrado em duas linhas. | manual |  |  |' \
  "$(ac_linha 1)" 'a medicao antiga nao vale como palavra do Joao'

# --- pipe: escapado na escrita, lido de volta; cru, recusado
ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

1. Conferir a | b no painel.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual '| 1 | Conferir a \| b no painel. | manual |  |  |' "$(ac_linha 1)" '| do texto sai escrito \|'
sed -i -E 's/^(\| 1 \| .* \| manual \| ) \|  \|$/\1x \\| y | 2026-10-04 |/' "$AC_R/$_AC_P/aceitacao.md"
ac_rodar gerar 50
assert_igual '| 1 | Conferir a \| b no painel. | manual | x \| y | 2026-10-04 |' "$(ac_linha 1)" \
  '\| no resultado e lido e reescrito igual'
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/pipe.md"
sed -i 's/x \\| y/x | y/' "$AC_R/$_AC_P/aceitacao.md"
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/pipe-cru.md"
ac_rodar gerar 50
ac_recusa 'cinco colunas' '| cru dentro de celula'
assert_contem "$AC_SAIDA" 'x | y' '| cru: a recusa mostra a linha'
if cmp -s "$_ac_t/pipe-cru.md" "$AC_R/$_AC_P/aceitacao.md"; then
  printf '  ok    | cru: a tabela fica como estava\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA | cru: a tabela fica como estava\n'
fi
cp "$_ac_t/pipe.md" "$AC_R/$_AC_P/aceitacao.md"
grep -E '^\| 1 \|' "$_ac_t/pipe.md" >> "$AC_R/$_AC_P/aceitacao.md"
ac_rodar gerar 50
ac_recusa 'duas linhas para o item 1' 'linha duplicada na tabela'

# --- leitura da secao
ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificacao externa

1. Sem acento no titulo.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (1 item(ns))" "$AC_ULTIMA" 'titulo sem acento casa'

ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

O formato, com exemplo em cerca:

```markdown
1. Exemplo dentro da cerca.
   - prova: teste GET /exemplo -> 200
## Titulo dentro da cerca
```

1. Item real.
   - prova: nenhuma
1. Segundo item real, com o mesmo digito.
   - prova: nenhuma

~~~
3. Outro exemplo, em cerca de til.
~~~
1. Terceiro.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (3 item(ns))" "$AC_ULTIMA" \
  'item em cerca nao conta, e titulo em cerca nao fecha a secao'
assert_contem "$(ac_linha 2)" 'Segundo item real' 'numerado pela posicao (1. 1. 1.)'
assert_contem "$(ac_linha 3)" 'Terceiro.' 'o terceiro e o 3'

ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

```
1. Cerca que nunca fecha.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
ac_recusa 'cerca' 'cerca aberta e nunca fechada'
ac_nada_escrito 'cerca aberta'

ac_novo sim "$_AC_P/spec.md"
printf '# Bloco 50\n\n## Desenho\n\nSem a secao.\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'nao tem a secao' 'secao ausente'
ac_nada_escrito 'secao ausente'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\nNenhuma. `efeito_externo: nao`.\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'nao tem item numerado' 'zero itens'
ac_nada_escrito 'zero itens'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Um.\n   - prova: nenhuma\n\n## Verificação externa\n\n1. Dois.\n   - prova: nenhuma\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'secoes ## Verificacao externa' 'duas secoes'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Sem prova.\n2. Com prova.\n   - prova: nenhuma\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'item 1 da ## Verificacao externa nao tem a linha' 'item sem - prova:'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Duas provas.\n   - prova: nenhuma\n   - prova: teste GET /up -> 200\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'tem 2 linhas' 'item com duas - prova:'
ac_nada_escrito 'duas provas'

# --- prova: formato, alias, ancora e shell
for _ac_p in 'teste POST /up -> 200' 'teste GET /up 200' 'teste GET /up -> 20' 'teste GET @evil.example/x -> 200' ''; do
  ac_novo sim "$_AC_P/spec.md"
  printf '## Verificação externa\n\n1. Item.\n   - prova: %s\n' "$_ac_p" | ac_spec
  ac_rodar gerar 50
  ac_recusa 'fora do formato' "prova [$_ac_p] recusada ja no gerar"
done
ac_nada_escrito 'prova fora do formato'
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Item.\n   - prova: desconhecido GET /up -> 200\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'alias `desconhecido`' 'alias desconhecido'
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Item.\n   - prova: $(touch %s) GET /up -> 200\n' "$_ac_t/pwned" | ac_spec
ac_rodar gerar 50
ac_recusa 'fora do formato' 'prova com $(...)'
if [[ -e $_ac_t/pwned ]]; then
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA a prova com $(...) foi executada\n'
else
  printf '  ok    a prova com $(...) nunca vira shell\n'
fi

# --- estado.md, pasta e argumentos
ac_novo nao "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'efeito_externo: nao' 'efeito_externo nao'
ac_novo null "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'efeito_externo: null' 'efeito_externo null'
ac_novo sim ''; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'nao tem active_spec' 'active_spec null'
ac_novo sim "$_AC_P/outra-spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'que nao existe' 'active_spec para arquivo que nao existe'
ac_nada_escrito 'active_spec ausente'
ac_rodar gerar 51
ac_recusa 'nenhuma pasta' 'bloco sem pasta'
mkdir -p "$AC_R/docs/superpowers/blocos/50-outro"
cp "$AC_R/$_AC_P/estado.md" "$AC_R/docs/superpowers/blocos/50-outro/estado.md"
ac_rodar gerar 50
ac_recusa 'mais de uma pasta' 'duas pastas com estado.md'
ac_rodar gerar
ac_recusa 'uso' 'sem NN'
ac_rodar gerar 50 extra
ac_recusa 'uso' 'argumento a mais'
ac_rodar apagar 50
ac_recusa 'desconhecido' 'verbo desconhecido'
ac_rodar gerar 050
ac_recusa 'numero' 'NN com zero a esquerda'
AC_SAIDA=$(cd "$_ac_t" && bash "$ACEITACAO_SH" gerar 50 2>&1); AC_COD=$?
ac_recusa 'fora de um repositorio' 'fora de repositorio'

# --- aliases: so URL-base, sem userinfo, sem caminho, sem marcador alheio
ac_novo sim "$_AC_P/spec.md"; ac_spec_padrao
for _ac_u in 'http://user@teste.local' 'http://teste.local/x' 'http://teste.local/' 'ftp://teste.local' 'http://teste.local:{OUTRA}'; do
  printf 'teste %s\n' "$_ac_u" > "$_ac_t/ruim.conf"
  AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
  ac_recusa 'fora de ^https?' "alias com URL [$_ac_u] recusado"
done
printf 'teste http://a.local\nteste http://b.local\n' > "$_ac_t/ruim.conf"
AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
ac_recusa 'duas vezes' 'alias repetido'
printf 'teste\n' > "$_ac_t/ruim.conf"
AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
ac_recusa 'nao e `<alias> <URL-base>`' 'linha sem URL'
ac_nada_escrito 'aliases invalidos'
printf '## Verificação externa\n\n1. Item.\n   - prova: producao GET /up -> 200\n' | ac_spec
AC_ALIASES='' ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'o aceitacao-aliases.conf real e valido e tem producao'
printf '## Verificação externa\n\n1. Item.\n   - prova: teste GET /up -> 200\n' | ac_spec
AC_ALIASES='' ac_rodar gerar 50
ac_recusa 'alias `teste`' 'alias fora do conf real e recusado'
