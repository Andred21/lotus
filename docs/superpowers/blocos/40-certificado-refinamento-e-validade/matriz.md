# Bloco 40 — Matriz do certificado no Gotenberg real e tetos medidos

Medido na Task 6, sobre o layout v5 da Task 5 (HEAD `d3b94320`), com o Gotenberg **`8.36.0`**
(Chromium 151), A4, pelo `MedidorDeCertificado` (`CertificatePdfService` de produção, conversor de
produção, leitura por Poppler). O teste que guarda a matriz é
`backend/tests/Feature/Certification/CertificadoMatrizGotenbergTest.php`, que roda no container e é
pulado fora dele. Trocar a tag do Gotenberg (D17), o layout ou um teto obriga a rodar a matriz de novo
e atualizar este arquivo.

## Regra de medição (D15)

- **Nomes primeiro:** cada nome recebe o maior comprimento de `TextoRealista::nome()` (MAIÚSCULAS
  espanholas) em que ele, sozinho, ocupa no máximo **2 linhas** da própria caixa. Busca binária,
  arredondada para baixo à dezena. No técnico a caixa inclui o `· 32 horas cronológicas` que o segue.
- **Descrição depois:** com todos os nomes no teto, mais nota, asistencia e vigência, recebe o maior
  comprimento de `TextoRealista::prosa()` em que as assinaturas ficam na página 1. Temário de 8
  módulos de 3 marcadores (o "tamanho do aprovado").
- Texto adversário (sem espaço, glifo `W`) fica fora do cálculo: pode levar as assinaturas para a
  página 2, mas nunca perde texto.

## Tetos

Constantes em `backend/app/Shared/Support/TetosImpressos.php`.

| campo | maior de produção | teto | linhas no teto | linhas com teto+1 | máximo medido (antes de arredondar) |
|---|---|---|---|---|---|
| `NOME_ALUNO` | pendente | 70 | 2 | 2 (o teto+1 ainda cabe: o máximo é 79) | 79 |
| `NOME_CURSO` | pendente | 110 | 2 | 3 | 110 |
| `NOME_TECNICO` | pendente | 160 | 2 | 2 (máximo 169) | 169 |
| `RAZAO_SOCIAL` | pendente | 150 | 2 | 2 (máximo 152) | 152 |
| `NOME_ASSINANTE` (gerente e instrutor) | pendente | 60 | 2 | 2 (máximo 65) | 65 |
| `CARGO_ASSINANTE` | pendente | 70 | 2 | 2 (máximo 75) | 75 |
| `DESCRICAO_CURSO` | pendente | 620 | 7 (com a frase da nota) | assinaturas vão à página 2 com 628 | 627 |

"Linhas com teto+1" só vira 3 onde o teto coincide com o máximo medido (`NOME_CURSO`); nos demais o
arredondamento à dezena deixa uma folga de 1 a 9 caracteres.

## Produção

pendente — leitura de produção recusada pelo auto mode; o João roda scratchpad/medir-prod.php e o controlador preenche

A coluna "maior de produção" acima e a conferência das folgas (nomes: teto >= 1,5x o maior valor de
produção; descrição: teto >= o maior valor) ficam pendentes até lá. Se algum dado de produção passar
de um teto, as Tasks 7 e 11 esperam a decisão do João.

## A matriz

Páginas, página das assinaturas (`Instructor`), página do `Temario del curso`, página do aviso legal e
reticências (`…`) de cada caso, gerados pelo medidor nesta execução. Toda página de todo caso traz o
rodapé `LOT-2026-1001 · Página p de n` e o logo, e nenhuma entrada perde texto.

| caso | páginas | assinaturas (pág.) | temário (pág.) | aviso legal (pág.) | reticências |
|---|---|---|---|---|---|
| aluno no teto, sozinho | 2 | 1 | 2 | 2 | nenhuma |
| curso no teto, sozinho | 2 | 1 | 2 | 2 | nenhuma |
| tecnico no teto, sozinho | 2 | 1 | 2 | 2 | nenhuma |
| razao no teto, sozinho | 2 | 1 | 2 | 2 | nenhuma |
| cargo no teto, sozinho | 2 | 1 | 2 | 2 | nenhuma |
| assinantes no teto, sozinhos | 2 | 1 | 2 | 2 | nenhuma |
| todos os nomes no teto juntos, com nota, asistencia e vigencia | 2 | 1 | 2 | 2 | nenhuma |
| descricao no teto | 2 | 1 | 2 | 2 | nenhuma |
| todos os nomes e a descricao no teto | 2 | 1 | 2 | 2 | nenhuma |
| temario do tamanho do aprovado (8 modulos) | 2 | 1 | 2 | 2 | nenhuma |
| temario do tamanho do aprovado, com tudo no teto | 2 | 1 | 2 | 2 | nenhuma |
| temario grande (16 modulos) | 3 | 1 | 2 | 3 | nenhuma |
| sem campos opcionais | 2 | 1 | 2 | 2 | nenhuma |
| sem temario | 1 | 1 | - | 1 | nenhuma |
| sem temario, com tudo no teto | 2 | 1 | - | 2 | nenhuma |
| adversario no teto: aluno | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: curso | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: tecnico | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: razao | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: cargo | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: assinantes | 2 | 1 | 2 | 2 | nenhuma |
| adversario no teto: descricao | 3 | 2 | 3 | 3 | nenhuma |
| adversario no teto: todos os campos | 3 | 2 | 3 | 3 | nenhuma |
| EXTRA: temario de 18 modulos | 3 | 1 | 2 | 3 | nenhuma |
| EXTRA: temario de 24 modulos | 4 | 1 | 2 | 4 | nenhuma |

As duas linhas `EXTRA` não são casos do teste; medem onde o temário passa de 16 módulos.

## Achados

1. **Adversário leva as assinaturas para a página 2** (descrição e "todos os campos" no teto: 3 páginas,
   assinaturas na 2). Dentro da D15: o adversário só garante que nenhum texto se perde. Os outros
   adversários, no teto de um campo só, ainda fecham em 2 páginas com as assinaturas na 1.
2. **Sem temário, tudo no teto: o aviso legal desce sozinho para a página 2** (2 páginas). Sem temário o
   aviso divide a página 1 com as assinaturas, e a descrição só cabe com ~280 caracteres para o
   documento fechar em 1 página (contra o teto de 620, medido com o temário). As assinaturas ficam na
   página 1 e nada se perde, então está dentro da D15; o caso `sem temario, com tudo no teto` fixa
   isso. O caso `sem temario` (texto realista curto) sai em 1 página.
3. **Aviso legal sozinho na última página** (observado na Task 5, temário de 18 módulos): não reproduz
   com os módulos desta matriz (3 marcadores), em que o aviso divide a página 3 (16 e 18 módulos) ou a 4
   (24) com os últimos módulos. Acontece quando o temário enche a última página até o pé: o aviso não
   cabe e vai só. Está dentro da D15 (nada se perde).
4. **O temário de 8 módulos de 3 marcadores cabe numa página com o nome do curso no teto** (110
   caracteres, 3 linhas no cabeçalho do quadro). Com 4 marcadores por módulo (teste de exploração,
   descartado) ele passa de uma página, então "tamanho do aprovado" é a medida do temário que os tetos
   garantem.
5. O teto da descrição vale para prosa. A mesma área comporta bem menos de palavras longas e
   uniformes (D15, §2 da spec).
