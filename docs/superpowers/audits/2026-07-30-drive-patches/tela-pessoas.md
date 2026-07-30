# Patch — `tela-pessoas.md` (Drive, ID `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V`)

> Gerado pelo doc-sync `hardening-doc-sync-sprint4` (2026-07-30). Cobre P-14 (E2-02).

## Seção "Fluxo técnico passo a passo" → "B. Cadastro/edição de aluno"

**Trecho atual (passo 3):**

> Front valida RUT (formato + dígito verificador) e envia `POST/PUT /api/alunos`.

**Trecho novo:**

> Front valida RUT (formato + dígito verificador) e envia `POST/PUT /api/students`. **Nomenclatura
> de API decidida em 2026-07-27** (spec `2026-07-27-bloco-alunos-modulo-design.md` D7): a rota casa
> com o model `Student` e evita o hack de inflector que `redatores`→`redatore` precisaria. A rota de
> **UI** segue em espanhol (`/personas`, aba `Alumnos`), só a API HTTP mudou de idioma.

## Seção "A. Navegação por abas"

**Trecho atual (passo 1):**

> View (React/TS): hub com abas "Alunos" e "Redatores". Cada aba carrega sua listagem (`GET
> /api/alunos`, `GET /api/redatores`).

**Trecho novo:**

> View (React/TS): hub com abas "Alumnos" e "Redactores" (`PeoplePage`, rota `/personas`). Cada aba
> carrega sua listagem (`GET /api/students`, `GET /api/redatores`).

## Nota adicional a acrescentar ao final da seção B

```markdown
**Divergências implementadas conscientemente (bloco alunos, 2026-07-27):** a edição de aluno NÃO
troca o vínculo de cliente (isso é ato exclusivo da matrícula — spec D3); o detalhe do aluno não
mostra certificados ainda (`Certification` é pasta vazia — Bloco 7, spec D10); a aba `Alumnos` não
virou a primeira do hub, `Redactores` continua primeiro (decisão do João, spec D11).
```
