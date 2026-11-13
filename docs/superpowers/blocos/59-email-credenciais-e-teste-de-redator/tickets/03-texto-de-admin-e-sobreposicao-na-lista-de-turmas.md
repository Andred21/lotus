# 03: Texto escrito para o admin e coluna sobreposta na lista de turmas

**What to build:** dois acabamentos na lista de Operaciones, achados com o redator:

- o subtítulo diz "Manage classes and approved quotes" e o estado vazio diz "Classes are created
  from an approved quote." (navegador em inglês), frases para quem cria turma; o redator não vê
  cotização nem cria turma;
- a 1280 px, o código da turma ("Scap 3 - Cot 1") invade a coluna Curso e sobrepõe o nome do curso.
  Não é exclusivo do redator: a coluna é a mesma para o admin.

Origem: ensaio local do bloco 59 (Fase A do `audit.md`), checklist §4.3 item 2, contas 2 e 5 do seed
(2026-11-07). As chaves equivalentes em es-CL e pt-BR mudam junto.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] Para quem não cria turma, subtítulo e estado vazio falam do que ele faz (ver e trabalhar as
      próprias turmas).
- [ ] O código não sobrepõe o curso de 1280 px para cima; abaixo, quebra ou corta com reticências.
- [ ] Paridade de chave nos três locales.
