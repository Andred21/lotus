#!/usr/bin/env python3
"""Le a secao `## Verificacao externa` da spec de um bloco e le e escreve o
aceitacao.md dele, para o aceitacao.sh (spec do bloco 36, secao 1). Porta
das defesas do `aceitacao.ps1` do ElaDecora-Brain@3b7cc1bf.

Uso, sempre da raiz da arvore (os caminhos sao relativos a ela):
  aceitacao.py gerar    <spec> <alvo> <aliases> <porta> <NN>
      Cria ou completa <alvo>, preservando o resultado de todo item cuja
      identidade bate. stdout: um aviso por resultado descartado e, por
      ultimo, `ACEITACAO GERADA: <alvo> (<n> item(ns))`.
  aceitacao.py provas   <spec> <alvo> <aliases> <porta> <NN>
      Valida tudo e nao escreve nada. stdout: uma linha por prova
      automatica, `n<US>metodo<US>url-base<US>caminho<US>esperado`.
  aceitacao.py conferir <spec> <alvo> <aliases> <porta> <NN> [<n>=<codigo>...]
      Grava em <alvo> a medicao de cada prova automatica, datada de hoje.
      stdout: os avisos e, na ultima linha, o veredito.
  <porta> e o LOTUS_DEV_HTTP_PORT que o aceitacao.sh leu do .env da raiz.

Saida: 0 gerado ou ACEITACAO OK; 1 ACEITACAO PENDENTE; 2 recusa, com
`PORTAO RECUSOU: <motivo>` no stderr e nada escrito. Excecao inesperada
tambem sai 2: o exit 1 e so do veredito PENDENTE.
"""

import os
import re
import sys
import traceback
from datetime import date

SEP = "\x1f"
TITULO = re.compile(r"^(#{1,2})\s+(.*?)\s*$")
SECAO = re.compile(r"^verifica(ç|c)(ã|a)o externa$", re.I)
CERCA = re.compile(r"^(`{3,}|~{3,})(.*)$")
ITEM = re.compile(r"^(\d+)\.\s+(.*)$")
LINHA_PROVA = re.compile(r"^\s*-\s+prova:(.*)$")
PROVA = re.compile(r"^([a-z][a-z0-9-]*)\s+(GET|HEAD)\s+(/\S*)\s*->\s*(\d{3})$")
ALIAS = re.compile(r"^[a-z][a-z0-9-]*$")
URL_BASE = re.compile(r"^https?://[A-Za-z0-9.-]+(:[0-9]+)?$")
MARCADOR = "{LOTUS_DEV_HTTP_PORT}"
LINHA_TABELA = re.compile(r"^\|\s*(\d+)\s*\|")
PIPE = re.compile(r"(?<!\\)\|")
DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MEDIDA = re.compile(r"^(\d+)=(\d{3})$")
USO = ("uso: aceitacao.py <gerar|provas|conferir> <spec> <alvo> <aliases> "
       "<porta> <NN> [<n>=<codigo>...]")

CABECALHO = """# Bloco {nn} — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|"""


class Recusa(Exception):
    pass


def ler_linhas(caminho):
    try:
        with open(caminho, encoding="utf-8") as f:
            return f.read().split("\n")
    except (OSError, UnicodeDecodeError) as e:
        raise Recusa("nao consegui ler %s: %s" % (caminho, e))


def normalizar(texto):
    return re.sub(r"\s+", " ", texto).strip()


def fechar_item(atual, itens):
    if atual is None:
        return
    n = atual["n"]
    if not atual["provas"]:
        raise Recusa("o item %d da ## Verificacao externa nao tem a linha `- prova:`; "
                     "item manual declara `- prova: nenhuma`" % n)
    if len(atual["provas"]) > 1:
        raise Recusa("o item %d da ## Verificacao externa tem %d linhas `- prova:`; "
                     "deixe uma so" % (n, len(atual["provas"])))
    texto = normalizar(" ".join(atual["partes"]))
    if not texto:
        raise Recusa("o item %d da ## Verificacao externa nao tem texto" % n)
    itens.append({"n": n, "texto": texto, "prova": atual["provas"][0]})


def ler_itens(caminho):
    """Itens numerados da secao, na ordem: [{n, texto, prova}]. `n` e a
    posicao, nunca o digito escrito; `prova` e o valor cru da linha
    `- prova:`. Cerca de codigo e ignorada por inteiro, dentro e fora da
    secao: uma spec documenta o formato com exemplo em cerca."""
    itens, atual = [], None
    dentro = coletando = False
    secoes = 0
    cerca = None  # (caractere, tamanho) da cerca aberta
    for linha in ler_linhas(caminho):
        m = CERCA.match(linha.strip())
        if cerca:
            if m and m.group(1)[0] == cerca[0] and len(m.group(1)) >= cerca[1] \
                    and not m.group(2).strip():
                cerca = None
            continue
        if m:
            cerca = (m.group(1)[0], len(m.group(1)))
            coletando = False
            continue
        t = TITULO.match(linha)
        if t:
            if dentro:
                fechar_item(atual, itens)
                atual = None
            titulo = re.sub(r"\s+#+$", "", t.group(2))
            dentro = len(t.group(1)) == 2 and bool(SECAO.match(titulo))
            secoes += dentro
            coletando = False
            continue
        if not dentro:
            continue
        i = ITEM.match(linha)
        if i:
            fechar_item(atual, itens)
            atual = {"n": len(itens) + 1, "partes": [i.group(2)], "provas": []}
            coletando = True
            continue
        p = LINHA_PROVA.match(linha)
        if p:
            if atual is None:
                raise Recusa("linha `- prova:` fora de item na ## Verificacao externa: %s"
                             % linha.strip())
            atual["provas"].append(p.group(1))
            coletando = False
            continue
        if coletando and linha.strip() and linha[:1].isspace():
            atual["partes"].append(linha)
        else:
            coletando = False
    if cerca:
        raise Recusa("a spec tem uma cerca de codigo que abre e nao fecha; cerca "
                     "desbalanceada e erro de spec, nao secao vazia")
    if dentro:
        fechar_item(atual, itens)
    if secoes == 0:
        raise Recusa("a spec nao tem a secao ## Verificacao externa; secao ausente e "
                     "spec incompleta, nao bloco sem itens")
    if secoes > 1:
        raise Recusa("a spec tem %d secoes ## Verificacao externa; deixe uma so" % secoes)
    if not itens:
        raise Recusa("a ## Verificacao externa nao tem item numerado, e o estado.md diz "
                     "efeito_externo: sim")
    return itens


def ler_aliases(caminho, porta):
    """{alias: URL-base}. O marcador {LOTUS_DEV_HTTP_PORT} vira <porta>; nada
    e avaliado como shell."""
    aliases = {}
    for num, linha in enumerate(ler_linhas(caminho), 1):
        linha = linha.split("#", 1)[0].strip()
        if not linha:
            continue
        partes = linha.split()
        if len(partes) != 2 or not ALIAS.match(partes[0]):
            raise Recusa("a linha %d de %s nao e `<alias> <URL-base>`" % (num, caminho))
        alias, url = partes[0], partes[1].replace(MARCADOR, porta)
        if alias in aliases:
            raise Recusa("o alias `%s` aparece duas vezes em %s" % (alias, caminho))
        if not URL_BASE.match(url):
            raise Recusa("o alias `%s` de %s vale `%s`, fora de ^https?://<host>(:<porta>)?$ "
                         "(sem userinfo, sem caminho, sem barra final, e %s e o unico "
                         "marcador)" % (alias, caminho, url, MARCADOR))
        aliases[alias] = url
    return aliases


def classificar(itens, aliases, arquivo_aliases):
    """Da a cada item `auto` (None no manual) e `rotulo`, o texto da coluna
    Prova. Prova fora do formato, ou com alias desconhecido, e recusa."""
    for it in itens:
        valor = normalizar(it["prova"].strip().strip("`"))
        if valor.lower() == "nenhuma":
            it["auto"], it["rotulo"] = None, "manual"
            continue
        m = PROVA.match(valor)
        if not m:
            raise Recusa("o item %d declara a prova `%s`, fora do formato `<alias> <GET|HEAD> "
                         "<caminho> -> <codigo>`, com o caminho comecando em /; item manual "
                         "declara `nenhuma`" % (it["n"], valor))
        alias, metodo, caminho, esperado = m.groups()
        if alias not in aliases:
            raise Recusa("o item %d usa o alias `%s`, que nao esta em %s"
                         % (it["n"], alias, arquivo_aliases))
        it["auto"] = {"metodo": metodo, "base": aliases[alias], "caminho": caminho,
                      "esperado": esperado}
        it["rotulo"] = "`%s %s %s -> %s`" % (alias, metodo, caminho, esperado)


def escapar(celula):
    return celula.replace("|", "\\|")


def desescapar(celula):
    return celula.replace("\\|", "|")


def ler_tabela(caminho):
    """{n: {item, prova, resultado, data}} das linhas `| <n> | ...` do
    aceitacao.md; {} quando ele nao existe. Linha que nao da cinco colunas
    e recusa: com um `|` cru, nao da para saber de que celula ele veio."""
    if not os.path.exists(caminho):
        return {}
    tabela = {}
    for linha in ler_linhas(caminho):
        m = LINHA_TABELA.match(linha)
        if not m:
            continue
        celulas = PIPE.split(linha)
        if len(celulas) != 7 or celulas[6].strip():
            raise Recusa("a linha do item %s de %s nao tem as cinco colunas | # | Item | Prova "
                         "| Resultado | Data |; um `|` dentro de celula se escreve `\\|`. "
                         "Linha: %s" % (m.group(1), caminho, linha))
        n = int(m.group(1))
        if n in tabela:
            raise Recusa("%s tem duas linhas para o item %d" % (caminho, n))
        item, prova, resultado, data = (desescapar(c.strip()) for c in celulas[2:6])
        tabela[n] = {"item": item, "prova": prova, "resultado": resultado, "data": data}
    return tabela


def mesmo_item(it, linha):
    """A identidade e o texto normalizado mais a prova: trocar so a prova
    (automatica por `nenhuma`) tambem descarta o resultado."""
    return normalizar(linha["item"]) == it["texto"] \
        and normalizar(linha["prova"].strip("`")) == normalizar(it["rotulo"].strip("`"))


def reaproveitar(itens, tabela, alvo):
    """({n: (resultado, data)}, avisos). Vale so o registro cujo item, na
    mesma posicao, tem a mesma identidade; o resto e descartado, com aviso
    quando havia algo escrito."""
    valores, avisos = {}, []
    for n, linha in sorted(tabela.items()):
        it = itens[n - 1] if 1 <= n <= len(itens) else None
        if it is not None and mesmo_item(it, linha):
            valores[n] = (linha["resultado"], linha["data"])
        elif linha["resultado"] or linha["data"]:
            motivo = ("o item %d mudou na spec (texto ou prova)" % n) if it \
                else ("a spec nao tem mais o item %d" % n)
            avisos.append("aviso: %s; o resultado gravado em %s foi descartado" % (motivo, alvo))
    return valores, avisos


def escrever_tabela(caminho, nn, itens, valores):
    linhas = [CABECALHO.format(nn=nn)]
    for it in itens:
        resultado, data = valores.get(it["n"], ("", ""))
        celulas = [str(it["n"]), it["texto"], it["rotulo"], resultado, data]
        linhas.append("| " + " | ".join(escapar(c) for c in celulas) + " |")
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(linhas) + "\n")


def data_valida(texto):
    if not DATA.match(texto):
        return False
    try:
        date.fromisoformat(texto)
    except ValueError:
        return False
    return True


def ler_medidas(extras, itens):
    """{n: codigo} dos argumentos `<n>=<codigo>`; cada prova automatica
    medida uma vez, e nada alem delas."""
    automaticos = {it["n"] for it in itens if it["auto"]}
    medidas = {}
    for e in extras:
        m = MEDIDA.match(e)
        if not m or int(m.group(1)) not in automaticos or int(m.group(1)) in medidas:
            raise Recusa("medicao invalida: %s" % e)
        medidas[int(m.group(1))] = m.group(2)
    faltam = sorted(automaticos - set(medidas))
    if faltam:
        raise Recusa("prova automatica sem medicao: item(ns) %s" % ", ".join(map(str, faltam)))
    return medidas


def conferir(itens, tabela, medidas, alvo, nn):
    valores, avisos = reaproveitar(itens, tabela, alvo)
    hoje = date.today().isoformat()
    pendentes = []
    for it in itens:
        n = it["n"]
        if it["auto"]:
            esperado = it["auto"]["esperado"]
            ok = medidas[n] == esperado
            valores[n] = ("`%s`, esperado `%s`: %s" % (medidas[n], esperado,
                                                        "OK" if ok else "FALHOU"), hoje)
            if not ok:
                pendentes.append(n)
            continue
        resultado, data = valores.get(n, ("", ""))
        if not resultado or not data_valida(data):
            pendentes.append(n)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    if not pendentes:
        print("ACEITACAO OK: %d item(ns)" % len(itens))
        return 0
    print("ACEITACAO PENDENTE: %d de %d item(ns): %s"
          % (len(pendentes), len(itens), ", ".join(map(str, pendentes))))
    return 1


def executar(args):
    if len(args) < 6 or args[0] not in ("gerar", "provas", "conferir") \
            or (args[0] != "conferir" and len(args) > 6):
        raise Recusa(USO)
    verbo, spec, alvo, arquivo_aliases, porta, nn = args[:6]
    itens = ler_itens(spec)
    classificar(itens, ler_aliases(arquivo_aliases, porta), arquivo_aliases)
    tabela = ler_tabela(alvo)
    if verbo == "provas":
        for it in itens:
            a = it["auto"]
            if a:
                print(SEP.join([str(it["n"]), a["metodo"], a["base"], a["caminho"],
                                a["esperado"]]))
        return 0
    if verbo == "conferir":
        return conferir(itens, tabela, ler_medidas(args[6:], itens), alvo, nn)
    valores, avisos = reaproveitar(itens, tabela, alvo)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    print("ACEITACAO GERADA: %s (%d item(ns))" % (alvo, len(itens)))
    return 0


def main(argv):
    try:
        return executar(argv[1:])
    except Recusa as e:
        sys.stderr.write("PORTAO RECUSOU: %s\n" % e)
        return 2
    except Exception:
        traceback.print_exc()
        sys.stderr.write("PORTAO RECUSOU: erro interno do aceitacao.py\n")
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
