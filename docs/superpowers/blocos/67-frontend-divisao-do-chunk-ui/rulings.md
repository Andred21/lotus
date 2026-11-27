# Bloco 67 — rulings da execução

Decisões tomadas em nome do João durante o `/executar-bloco 67`, uma por linha, com o custo se estiverem erradas.

- **Regex do detector mantida como o plano manda (`import\s+['"]`).** As revisões da Task 1 e da branch notaram que `import"./x"` e `import {} from './x'` escapam da catraca. Nenhuma das duas formas existe em `src/`, e ficou registrada como pendência no `fechamento.md`. Custo se errado: um import nu com essa grafia passaria pela catraca e o módulo sumiria do build de produção sem aviso.
- **O 401 de `GET /api/me` na tela de login não conta como "erro de console".** É a sonda de sessão do `SessionBootstrap` antes de autenticar, e o console ficou zerado em todas as telas depois do login. Custo se errado: o critério 4 da spec ("sem erro de console") estaria declarado cumprido sem estar.
- **O DatePicker foi provado na edição de turma (`TurmaConfigCard`), não num diálogo.** O plano pedia "um diálogo com PhoneInput e DatePicker", mas nenhum diálogo tem os dois. O PhoneInput foi provado no diálogo "Nuevo instructor". Custo se errado: o DatePicker dentro de um diálogo ficaria sem passada no build de produção.
- **No `fechamento.md`, os números de entrada, chunk comum e total vêm do build da Task 1, e as três linhas lazy vêm do build da passada visual.** Os dois builds são do mesmo código e diferem em 16 bytes de gzip no total. Custo se errado: as três linhas lazy não seriam do build exato da Task 1.
- **Um Menor da revisão da branch foi acatado só com uma nota no `fechamento.md`, sem nova rodada de correção nem re-revisão.** A nota diz que a entrada do `i18n.ts` é defensiva e que a sonda provou o padrão. Custo se errado: a nota ficaria sem revisão, mas ela é só documentação.
