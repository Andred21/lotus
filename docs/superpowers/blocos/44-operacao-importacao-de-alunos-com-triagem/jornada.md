# Bloco 44 — jornada da importação com triagem

Sessão de 2026-10-31, na lane 44 (offset +1: HTTP 8081, Vite 5174), em Chromium 1440×900, com a
interface em `es-CL` e o usuário `admin@lotus.cl`. Fiz `migrate` e `db:seed` sobre o banco da lane.
Os prints estão no scratchpad da sessão, em
`/tmp/claude-1000/-home-jvbat-projetos-lotus-44-operacao-importacao-de-alunos-com-triagem/69f00986-bc16-457b-9c36-07b30af1e339/scratchpad/`
(abaixo, `<sp>/`). Ficam fora do Git e se perdem quando a sessão acaba.

## Preparação

A jornada usa a turma 4, em curso: *Trabajos en líneas energizadas 220kV*, contratante **CGE**.

O seed não deixa nenhum aluno da CGE fora dessa turma, e a linha "registrada com nome divergente"
precisa de um. Criei esse aluno pela regra real (`StudentResolver::resolveByRut`, com o cliente
CGE e sem matrícula): `17.111.110-2`, Rodrigo Pizarro, `rodrigo.pizarro@cge.demo.cl`.

## Passos e o que foi visto

1. **Abrir o diálogo** (`<sp>/j1-upload.png`).
   - O título é "Importar planilla · Trabajos en líneas energizadas 220kV".
   - O link "Descargar plantilla" fica no cabeçalho.
   - A instrução cita as colunas RUT, Nombre, Email, Teléfono.
2. **Baixar o modelo.**
   - O arquivo baixado é `plantilla-alumnos.xlsx`, com 4445 bytes.
   - A linha 1 tem exatamente `["RUT","Nombre","Email","Teléfono"]`.
   - O Chromium não cancelou o download, apesar de o object URL ser revogado no mesmo tick (ponto
     menor da Task 5).
3. **Preencher 6 linhas** a partir do modelo baixado:

   | Fila | RUT | Nome | E-mail | Caso |
   |---|---|---|---|---|
   | 2 | `17111111-0` | Paula Soto | paula.soto@cge.demo.cl | nova |
   | 3 | `17.111.110-2` | Rodrigo Pizarro **Ruiz** | (vazio) | registrada, nome diverge |
   | 4 | `16.200.014-4` | Vicente Bustamante | (o atual dele) | de outra empresa (Transelec) |
   | 5 | `16.200.036-5` | Diego Maldonado | (vazio) | já matriculado |
   | 6 | `12.345.678-9` | Ana Inválida | ana.invalida@cge.demo.cl | RUT inválido |
   | 7 | `17.111.111-0` | Paula Soto | paula.soto@cge.demo.cl | o RUT da fila 2 em outro formato |
4. **Importar** (`<sp>/j2-triagem.png`). As contagens foram 1 nuevo, 1 ya registrado, 1 cambia de
   empresa, 1 ya matriculado e 2 con errores. Linha a linha:
   - fila 2: `Nuevo`;
   - fila 3: `Datos distintos`, "Registro: Rodrigo Pizarro", com o par *Mantener registro* (marcado)
     e *Actualizar*;
   - fila 4: `Cambia de empresa`, "Transelec → CGE";
   - fila 5: `Ya matriculado`, "Se omite", sem botão de editar;
   - fila 6: `Con error`, "RUT inválido.";
   - fila 7: `Con error`, "Este RUT aparece más de una vez en la planilla: solo vale la primera fila".
     A comparação foi pelo RUT normalizado (Review Focus 3).
   - O botão mostrou "Confirmar 3 filas".
5. **Quitar a fila 7.** As contagens passaram a mostrar "1 con error".
6. **Corrigir a fila 6** (`<sp>/j3-editor.png`). O editor abre na própria linha. O RUT passou a
   `12.345.678-5`, e pus de propósito o e-mail de outra aluna,
   `camila.aguilera@subestacionnorte.demo.cl`.
   - Depois de salvar apareceu "Editada · se valida al confirmar".
   - O botão passou a "Confirmar 4 filas", porque a linha de erro editada volta a ser enviada.
7. **Marcar *Actualizar* na fila 3** (`<sp>/j4-pre-confirm.png`).
8. **Confirmar.** O corpo enviado tem só `row, rut, name, email, phone, update_registration` por
   linha, sem status nem cliente (D13). A fila 3 foi com `update_registration: true` e as filas 5 e
   7 ficaram de fora. A resposta foi 200 com `created 1, relinked 1, moved [Vicente: Transelec →
   CGE], errors [fila 6]`.
9. **Resumo** (`<sp>/j5-resultado.png`). Mostrou "Creados: 1", "Reasociados: 1", "Movidos de
   cliente" e "Filas con error: Fila 6: Este e-mail já está cadastrado.", junto com o botão
   "Corregir filas rechazadas".
10. **Voltar à triagem** (`<sp>/j6-recusadas.png`). Só a fila 6 voltou, como `Con error` e com a
    mensagem do servidor. O botão "Confirmar 0 filas" ficou desabilitado até a linha ser editada.
11. **Corrigir o e-mail** para `ana.soto@cge.demo.cl` e **reenviar**. O corpo levou só a fila 6, e
    a resposta foi `created 1, errors []` (`<sp>/j7-reenvio.png`).
12. **Banco depois da jornada** (tinker):

    | Aluno | Matrícula na turma 4 | Resultado |
    |---|---|---|
    | Paula Soto | 1 | criada, vínculo CGE aberto |
    | Rodrigo Pizarro Ruiz | 1 | ver abaixo |
    | Vicente Bustamante | 1 | log Transelec fechado, CGE aberto |
    | Ana Inválida (`12.345.678-5`, ana.soto@cge.demo.cl) | 1 | criada |
    | Diego Maldonado | **1** | nada se duplicou |

    Rodrigo teve o nome atualizado, e a auditoria `updated` registra `name: "Rodrigo Pizarro"` →
    `"Rodrigo Pizarro Ruiz"`, feita pelo usuário 1. O e-mail ficou como estava, porque a célula vazia
    não apaga o cadastro (D17).
13. **Reimportar a mesma planilha.** Deu 4 ya matriculados e 2 con errores, sem nenhuma matrícula
    nova. Isso equivale a confirmar duas vezes (Review Focus 4).
14. **Fechar no meio da triagem.**
    - O diálogo fechou sem nenhuma requisição além de `GET`.
    - Ao reabrir, ele começa do upload ("Elegir archivo") (`<sp>/j8-reabertura.png`; Review
      Focus 5).
15. **Planilha só com cabeçalho** (o modelo, sem preencher; `<sp>/j9-vazia.png`). Aparece "No hay
    filas para importar." no lugar da tabela, com o botão "Confirmar 0 filas" desabilitado (Review
    Focus 1).
16. **Console:** nenhum erro durante a jornada.

## Achados da jornada

| # | Severidade | Achado | Evidência |
|---|---|---|---|
| J-1 | Important | O link "Descargar plantilla" tem `rgb(22,98,135)` sobre o cabeçalho `rgb(15,43,61)`. O contraste é 2,18:1, abaixo do AA (4,5:1). O botão "Corregir filas rechazadas", no rodapé navy, usa o mesmo tom. | `<sp>/j-link.png`, `<sp>/j5-resultado.png` |
| J-2 | Important | Na tabela, o RUT invade a coluna Nombre (por exemplo, "17.111.110-2" encosta em "Rodrigo"). Um e-mail longo passa por cima da tag de Situación. | `<sp>/j2-triagem.png`, `<sp>/j4-pre-confirm.png` |
| J-3 | Minor | Com a planilha vazia, o rodapé mantém "Las filas con error no se envían" e o botão "Confirmar 0 filas", só que desabilitado. O Review Focus 1 previa a mensagem **no lugar** de "Confirmar 0 filas". | `<sp>/j9-vazia.png` |
| J-4 | Pré-existente | A recusa por e-mail duplicado sai em pt-BR ("Este e-mail já está cadastrado.") numa interface es-CL. A frase é literal em `UserProvisioner::DUPLICADO`, um caso já registrado em `pendencias/abertas.md` (gatilho: "bloco que tocar `Identity/Services/UserProvisioner`"). Este bloco não tocou esse arquivo. | `<sp>/j5-resultado.png` |
