# Rulings do bloco 66 — decisões tomadas em nome do João

Uma decisão por linha, na ordem em que foram tomadas, com o que custa se estiver errada. Decisões
que o próprio João tomou durante a execução (o adiamento das mudanças visuais do header e da cor dos
ícones de linha, e a correção do Editar do `CrudDialog`) não são rulings; estão no `fechamento.md`.

1. **Execução sem pipeline.** O grupo G1 (Tasks 2, 4 e 6) permitia pipeline de profundidade 1; as 10
   tasks rodaram em série, cada uma revisada antes da seguinte. Se errado: só tempo de relógio.
2. **Task 1:** `UserMenu.tsx` (e o teste dele) entrou fora dos Files. O avatar neutro por padrão
   apagaria a marca do gatilho sobre o navy, e o brief manda "sobre o shell continua o que já é".
   Se errado: reverter 2 arquivos, e o avatar do header fica neutro.
3. **Task 2:** o trilho da barra de documentos é `--surface-200` com borda `--surface-500`/`--surface-300`
   (a opção "borda cinza-traço" do brief), não `--surface-400` sozinho, que mede 2,56:1. Se errado:
   o trilho fica visualmente diferente do rascunho.
4. **Task 4:** `DashboardEndpointTest.php` entrou fora dos Files. Três testes afirmavam série vazia
   = `[]`, e a mudança para meses zerados é intencional (D-2). Se errado: reverter 1 arquivo de teste.
5. **Task 6:** o KPI zerado usa o tom `'neutral'` (`AppCardTone` não aceita `null`; `neutral` não tem
   cor em `TONE_HUE`), não o `null` literal do brief. Mesmo efeito, sem mudar tipo. Se errado: trocar
   1 literal.
6. **Task 6:** o pré-preenchimento do campo de UF sai do formato de exibição. O `formatUf` passou a
   agrupar milhar, e `'1234.0000'` virava "1.234" e gravava 1,234 UF ao editar. Helper próprio
   `formatUfField` em `shared/lib/uf.ts` (sem agrupamento, vírgula decimal, zeros cortados), com
   teste de round-trip acima de 1000. Se errado: nada visível; o campo mostra o mesmo de antes.
7. **Correção do `CrudDialog` nesta lane, fora dos Files do plano** (pedido explícito do João): o
   Editar salvava em vez de abrir a edição, regressão do `550a4160` (bloco 65). Commit `d9d8ef0f`,
   `key` por modo no rodapé. Se errado: nenhum custo; é uma `key` por ramo.
8. **Task 7: `locale()` global do PrimeReact aceito, seguindo o `i18n.language` por listener.** O
   critério do plano (bloco `aria` em es e pt, `plano.md:209`) só vale com ele, porque o Prime lê o
   `aria` do locale global. A recusa antiga (comentário do `AppDataTable`) pesava 3 chaves contra
   estado global e não seguia o idioma; agora são 57 chaves, com o idioma seguido. A revisão final
   avaliou o risco como baixo. Se errado: remover o listener e o `locale()` (1 função), e o `aria` do
   Prime volta ao inglês.
9. **Task 8:** o `useMoveFocus` ganhou o alvo `'remove'`, fora do brief. Sem ele, remover o módulo do
   último índice com outros sobrando fazia o foco sumir. Se errado: nenhum custo; um alvo a mais.
10. **Task 8:** o link do relator segue para `/personas` sem `?q=`. A spec do 64 (§6, fase 7)
    condiciona o `?q=` a a listagem aceitar busca na URL, e o `RedatoresTab` filtra em memória.
    Se errado: um clique a mais para achar o relator.
11. **Task 9:** B-9 e B-10 fecham além dos sítios listados no plano: `index.css:64` foi para `100dvh`,
    e a prop `rounded` saiu de `QuoteRow` e `ContactCard`. O audit diz "e outros", e o critério é o
    comportamento, não a lista. Se errado: nenhum custo; muda raio e altura nos mesmos papéis.
12. **Task 10:** a passada visual rodou pelo Playwright CLI direto, com várias telas numa run e login
    automatizado com o usuário de dev da lane, em vez da `lotus-ui-review` canônica (uma tela por run,
    login manual). É o mesmo arranjo do fechamento do 65. Só leitura, sem escrita além do `POST` de
    login. Se errado: a passada não segue o contrato da skill, e o João pode pedir a run canônica
    antes do merge.
13. **Revisão final, I-1:** o login volta à aparência da `main` (`iconToggle` no tema, `compact` no
    idioma) pela prop `surface="page"`. É regressão que a branch introduziu (~1,5:1), e a Task 10
    manda corrigir regressão vista na passada. Não é o visual novo que o João adiou, que usava a
    variante `text`. Se errado: o João preferia o login como estava no HEAD; reverter uma prop.
14. **Revisão final, triagem:** uma leva única (`b6ee8dc0`) levou I-1 a I-4, M-5, M-10, M-12 e os docs
    do M-13. Ficam para ficha ou para o João: M-6 (teto da janela do painel), M-7 (tinta da barra por
    token), M-8 (`tabIndex` e região viva do `AppDataTable`), M-9 (badge do ranking) e M-11
    (digitação de UF "1.500"), listados no `fechamento.md`. Se errado: um deles vira achado do
    `/revisar-bloco`. **Atualização no fechamento (2026-11-27):** o `/revisar-bloco` pegou o M-6 e o M-11 como Q-1 e Q-2
    da rodada 1, e o João mandou corrigir os dois (`697723ce` e `df8e6cad`). O M-7, o M-8 e o M-9
    seguem fora do bloco, na **P-121**.
