# Bloco 4 · CR Curso frontend — Roteiro de verificação manual

> Este documento **não** foi executado por nenhum agente. Ele existe para o João Victor rodar no
> navegador e preencher o resultado de cada cenário na tabela do final. Nenhum cenário aqui foi
> marcado como testado — a prova é a execução real, não este arquivo.

**Por que manual:** o frontend não tem test runner nem browser automation (decisão do João: não
instalar Playwright no meio de um bloco de UI). O comportamento a provar é 100% de tela — criar
curso, reabrir, reordenar módulos, ver totais e aviso — então a prova é alguém olhando a tela.

**O cenário 5 é o mais importante do roteiro.** Ele reproduz a regressão que o Bloco 3 deixou
aberta: antes deste bloco, editar um curso mudando **só o nome** (sem tocar nos módulos) fazia o
formulário enviar o `PUT` sem o campo `modules`, e o backend — que faz replace-total dos módulos a
cada save — apagava **todos os módulos do curso em silêncio**, sem erro, sem aviso. Curso é
registro de peso legal; um apagamento silencioso desses é o tipo de bug que este roteiro existe
para nunca deixar passar despercebido de novo.

## Antes de começar: subir o ambiente

1. Subir o backend (container Docker):
   ```bash
   docker compose up -d
   ```
2. Confirmar que a API está de pé, sem sessão:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' http://localhost:8080/api/user
   ```
   **Esperado:** `401`.

   > Se você rodar o `curl` **sem** o header `-H 'Accept: application/json'`, o resultado pode vir
   > `500` mesmo com a API saudável — é um efeito colateral de como o middleware de auth do Laravel
   > decide entre JSON e redirect quando o pedido não diz que aceita JSON, e não tem relação com o
   > problema abaixo. O frontend real (axios/fetch) sempre manda esse header, então esse `500` do
   > `curl` cru não te avisa de bug nenhum — use sempre o `curl` com o header acima para checar o
   > ambiente.
   >
   > Se mesmo com o header vier `500`, aí sim investigue: achado do Bloco 3 é que
   > `backend/storage/logs/laravel.log` às vezes fica com dono `www-data`, enquanto o PHP-FPM do
   > container roda como `appuser` — sem permissão de escrita no log, toda exceção vira `500`
   > genérico e mascara o erro real. Rode `docker compose exec app ls -la storage/logs/` e, se o
   > dono não for `appuser`, ajuste antes de seguir.
3. Subir o frontend (fora do container, no WSL):
   ```bash
   cd frontend && pnpm dev
   ```
4. Abrir o navegador em `http://localhost:5173` e fazer login como **admin** ou **redator**
   (são os únicos perfis que autenticam neste sistema).
5. Ir para a tela **Cursos** (`/cursos`).

> **Como editar um curso (mecanismo usado em vários cenários abaixo):** a tabela de cursos só tem
> o ícone de olho (👁) em cada linha — não existe atalho de edição direto na lista. Para editar,
> clique no ícone de olho para abrir o curso em modo **visualizar** e, no rodapé do diálogo,
> clique no botão **Editar** (ícone de lápis). O diálogo não fecha e reabre — ele troca de modo no
> lugar, com os mesmos dados já carregados. Sempre que um cenário abaixo disser "abrir em modo
> editar", é esse o caminho: **visualizar → Editar**.

Com isso feito, execute os 6 cenários abaixo, em ordem — cada um depende do estado deixado pelo
anterior.

---

## Cenário 1 — Criar curso com 2 módulos

1. Em `/cursos`, clicar em **Novo curso**.
2. Preencher **Nome**: `GATE B4`.
3. Preencher **Carga horária (h)**: `40`.
4. Clicar em **Adicionar módulo** (1ª vez) e preencher o Módulo 1:
   - Nome do módulo: `Riscos`
   - Horas teóricas: `8`
   - Horas práticas: `0`
   - Aprendizagens: `Identificar riscos`
   - Conteúdos:
     ```
     1.1 Perigos
     1.2 Barreiras
     ```
     (duas linhas — confirme que o campo de conteúdos é uma área de texto que aceita quebra de
     linha, não um campo de linha única.)
5. Clicar em **Adicionar módulo** (2ª vez) e preencher o Módulo 2:
   - Nome do módulo: `Terreno`
   - Horas teóricas: `4`
   - Horas práticas: `8`
   - (deixar aprendizagens e conteúdos em branco)
6. Sem fechar o formulário, observar a tela.
7. Clicar em **Criar curso**.

**Resultado esperado:**
- Antes de salvar (passo 6): o card do Módulo 1 (`Riscos`) mostra `Total: 8 h`; o card do Módulo 2
  (`Terreno`) mostra `Total: 12 h`; abaixo dos módulos aparece `Total dos módulos: 20 h`; e aparece
  um aviso em fundo âmbar dizendo que a soma dos módulos (20 h) difere da carga horária do curso
  (40 h). O aviso **não** impede nada — é só um alerta visual.
- Ao clicar em **Criar curso** (passo 7): o curso é salvo sem erro **com o aviso âmbar ainda visível na
  tela**, e o diálogo fecha. Este é o único cenário do roteiro em que se salva com o aviso
  presente — é a prova de que o aviso nunca bloqueia o salvar (no Cenário 4 a carga horária é
  corrigida antes de qualquer salvar, então o aviso já não estará mais na tela).

---

## Cenário 2 — Reabrir em modo de visualização

1. Na lista de cursos, localizar `GATE B4` e abri-lo em modo **visualizar** (não editar).

**Resultado esperado:**
- Os módulos aparecem na ordem: `Riscos` em 1º lugar, `Terreno` em 2º lugar.
- Os textos e as horas de cada módulo conferem com o que foi digitado no Cenário 1 (nome,
  teóricas, práticas, aprendizagens, conteúdos com as duas linhas).
- Todos os campos estão desabilitados (não dá para editar nada).
- Não aparecem os botões de mover para cima/baixo, remover módulo, nem o botão de adicionar
  módulo — a tela é só leitura.
- O `Total: 8 h` / `Total: 12 h` de cada módulo e o `Total dos módulos: 20 h` continuam visíveis.
- O aviso âmbar de divergência de horas continua visível (a carga horária ainda é 40, a soma
  ainda é 20).

---

## Cenário 3 — Reordenar os módulos

1. Abrir `GATE B4` em modo editar (visualizar → Editar, ver nota em "Antes de começar").
2. No card do módulo `Riscos`, clicar na seta **↓** (mover para baixo).
3. Salvar.
4. Reabrir o curso em modo **editar** — assim dá para checar a ordem e o estado das setas na
   mesma abertura (as setas de mover só aparecem em modo editar, não em modo visualizar).

**Resultado esperado:**
- A ordem agora é: `Terreno` em 1º lugar, `Riscos` em 2º lugar.
- Ao reabrir em modo editar, a seta **↑** do primeiro item (`Terreno`) está desabilitada, e a
  seta **↓** do último item (`Riscos`) está desabilitada — não dá para mover além das pontas.

---

## Cenário 4 — Divergência resolvida (e módulo 100% teórico não gera aviso à toa)

1. Abrir `GATE B4` em modo editar (visualizar → Editar, ver nota em "Antes de começar").
2. Trocar a **Carga horária** de `40` para `20`.
3. Observar a tela, sem mexer em mais nada.
4. **Não salvar.** Clicar em **Cancelar** para fechar o diálogo, descartando o `20` digitado —
   este cenário só observa a tela; a carga horária salva do curso continua `40` para o Cenário 5.

**Resultado esperado:**
- O aviso âmbar de divergência de horas **desaparece** (a soma dos módulos, 20 h, agora bate com
  a carga horária, 20 h).
- O módulo `Riscos`, que é 100% teórico (8 horas teóricas, 0 práticas), **não** dispara nenhum
  aviso próprio por não ter horas práticas — só existe o aviso de divergência entre soma e carga
  horária, e ele já sumiu.

---

## Cenário 5 — REGRESSÃO DO GATE (o cenário que mais importa deste roteiro)

Este é o teste que prova que o bug do Bloco 3 está fechado. **Antes deste bloco**, o passo abaixo
apagava todos os módulos do curso sem nenhum erro na tela — o formulário salvava "com sucesso" e
os módulos simplesmente sumiam.

1. Com o diálogo fechado (o Cenário 4 terminou sem salvar — a carga horária do curso continua
   `40`), abrir `GATE B4` em modo editar (visualizar → Editar).
2. Mudar **só** o campo **Nome**, de `GATE B4` para `GATE B4 renomeado`. **Não tocar em nenhum
   outro campo** — não mexer nos módulos, não mexer na carga horária.
3. Salvar.
4. Reabrir o curso (visualizar).

**Resultado esperado (CRÍTICO):**
- O curso aparece com o nome `GATE B4 renomeado`.
- **Os 2 módulos continuam lá**, na ordem certa (`Terreno` em 1º, `Riscos` em 2º, seguindo a
  reordenação do Cenário 3).
- Se os módulos tiverem sumido (lista vazia, ou mensagem de "nenhum módulo cadastrado"), **o gate
  reabriu** — é uma regressão grave, pare e reporte antes de continuar para o Cenário 6.

---

## Cenário 6 — Remover um módulo

1. Abrir `GATE B4 renomeado` em modo editar (visualizar → Editar).
2. No módulo `Riscos`, clicar no botão de remover.
3. Salvar.
4. Reabrir o curso.

**Resultado esperado:**
- Só sobrou um módulo: `Terreno`.
- Esse módulo agora aparece rotulado como `Módulo 1` (o rótulo é posicional — reflete a posição
  atual na lista, não um número fixo herdado de quando havia dois módulos).

---

## Registro do resultado (preencher durante a execução)

Para cada cenário, marcar `✅` (passou como esperado) ou `❌` (não passou) e descrever o que foi
observado na tela — especialmente se divergir do esperado.

| Cenário | Resultado (✅/❌) | O que foi observado |
| --- | --- | --- |
| 1. Criar curso com 2 módulos | | |
| 2. Reabrir em view | | |
| 3. Reordenar | | |
| 4. Divergência resolvida | | |
| 5. REGRESSÃO DO GATE | | |
| 6. Remover | | |

**Conclusão geral do bloco:** _(preencher após rodar os 6 cenários — o bloco só pode ser marcado
como "Entregue" em `docs/superpowers/progress.md` depois que esta tabela estiver preenchida e,
idealmente, todos os cenários em ✅)_
