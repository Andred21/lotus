# 02: A turma vista pelo redator não oferece ação nem pede dado que ele não tem

**What to build:** na tela da turma e na lista de Operaciones, o redator vê controles e dispara
requisições de admin que a API recusa:

- aba Students: botões "Add student" e "Import sheet (xlsx/csv)" (a API responde 403 a
  `POST /api/turmas/{id}/alunos`);
- cabeçalho da turma: link "Budget · Quote" que leva a uma página "You do not have permission";
- lista de Operaciones: chamada a `GET /api/turmas/pendientes-configuracion` (403 no console);
- tela da turma: chamada a `GET /api/courses` (403 no console).

A aba Conclusion já faz o certo ("You do not have permission to conclude classes") e serve de
modelo. Rótulos como apareceram no ensaio, com o navegador em inglês. As
ações que o redator tem (registrar resultado, subir e apagar documento da turma) funcionaram no
ensaio local e ficam como estão.

Origem: ensaio local do bloco 59 (Fase A do `audit.md`), checklist §4.3 item 3, conta 2 do seed
(2026-11-07).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] Sem `operation.turma.*` de escrita de alunos, os botões de agregar e importar não aparecem.
- [ ] Sem permissão comercial, o vínculo com presupuesto/cotización é texto, não link.
- [ ] O redator abre Operaciones e uma turma sem nenhum 403 no console.
- [ ] O admin vê tudo como hoje.
