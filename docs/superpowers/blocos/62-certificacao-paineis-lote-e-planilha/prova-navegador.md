# Prova no navegador: bloco 62

Data: 2026-11-24. Lane com offset +1: SPA em http://localhost:5174, API em http://localhost:8081. HEAD 2b37163d.
O navegador foi o `playwright-cli` com chromium em 1440×900, logado como `admin@lotus.cl`.

## Dados

- Turma 3 (`Scap 5 - R1`, `quote_id=7`, concluída em 2026-06-26): 15 certificados emitidos (LOT-2026-1000 a 1014).
- Pendente: matrícula 46 (turma 3, aluno 1, `aprobado`, sem certificado). Foi inserida pelo `tinker`, porque o domínio não matricula em turma concluída. Ela serve só para a turma aparecer como pendente.
- Revogado: LOT-2026-1014, revogado **pela tela** (Historial › Revoke, motivo preenchido). A chamada foi `POST /api/certificates/15/revoke`, que devolveu 200.

## Passo 1: navegador

| Critério | Observado |
| --- | --- |
| O card lista a turma pendente | Período padrão "Last 12 months": o card "Scap 5 - R1 · Seguridad en alta tensión · Concluded on 6/26/2026 · 1 to issue · 15 issued". |
| O card abre a tabela | Clicar no card abre a tabela da turma: "15 certificate issued · 1 pending", com o botão "Issue all pending (1)" e as colunas Name, Final grade, Attendance, Academic status e Certificate. |
| O período `Mes` muda a lista | Ao escolher "Month", a SPA faz `GET /api/certificates/emission-panel?period_start=2026-11-01&period_end=2026-11-24` (200). A lista passa a "No classes with pending issuance · Widen the period to see more concluded classes." |
| O Historial filtra pela cotação | Quote = "Scap 5 - R1" faz `GET /api/certificates?page=1&per_page=10&quote_id=7` (200). A coluna Quote aparece, e o botão ZIP só fica habilitado com a cotação escolhida. |
| O aviso mostra N e o revogado | Planilha e ZIP mostram os dois o mesmo aviso: "14 certificates will be exported according to the applied filters" e "1 revoked certificate is not included". |
| A planilha baixa | `certificados-scap-5-r1.xlsx` (5762 bytes). |
| O ZIP baixa | `certificados-scap-5-r1.zip` (5,9 MB). `GET /api/certificates/export/zip?quote_id=7` devolveu 200 em cerca de 6 s, do clique ao fim. |
| Console | 0 erros na tela de certificados. |

## Passo 2: conteúdo dos arquivos

**Planilha.** Lida no XML cru (`xl/worksheets/sheet1.xml`), não pela biblioteca que a escreveu.
- Dimensão `A1:F15`: o cabeçalho e 14 linhas.
- Cabeçalho, nesta ordem: `Código | Fecha Curso | RUT | Nombre Completo | Curso | Link Descarga`.
- Linhas em ordem crescente de `codigo`, de LOT-2026-1000 a LOT-2026-1013. O revogado LOT-2026-1014 ficou fora.
- `Fecha Curso` é `26/06/26`, o `end_date` da turma em `dd/mm/yy`.
- `Link Descarga` é a fórmula `HYPERLINK("http://localhost:8081/api/publico/certificados/<uuid>/pdf","ABRIR")`, com `ABRIR` gravado como valor em cache.

**Link `ABRIR`.** Abri o link da linha LOT-2026-1001 (Diego Inostroza, RUT 16.200.021-7). Ele devolveu 200 `application/pdf`. O texto do PDF traz `N° LOT-2026-1001`, `Diego Inostroza` e `RUT 16.200.021-7`, ou seja, é o aluno da linha.

**ZIP.**
- 14 arquivos, de `certificado-LOT-2026-1000.pdf` a `certificado-LOT-2026-1013.pdf`, sem o revogado.
- O `certificado-LOT-2026-1001.pdf` do ZIP também traz `Diego Inostroza`.

## Passo 3: Excel e Gmail (critério 10 da spec)

Pendente com o João. Ele vai abrir a planilha baixada no Excel, copiar a tabela e colar num e-mail do Gmail, e conferir se `ABRIR` continua clicável.

Resposta do João, em 2026-11-24: **clicável**.

O João abriu `certificados-scap-5-r1.xlsx` no Excel, copiou as 15 linhas, das colunas A a F, e colou num e-mail do Gmail. Depois enviou o e-mail e o abriu na outra conta dele. A tabela chegou com cabeçalho, 14 linhas, de LOT-2026-1000 a 1013, e as datas `26/06/26`. Cada `ABRIR` aparece como link azul sublinhado e clicável.

## Observações fora do escopo

- O texto "15 certificate issued" está sem plural. A chave `certificate.issuedPending` em `en.json` vem do commit aebce34f, anterior ao bloco.
- Não provados no navegador: o 503 do conversor e o 429. O stack local não os provoca. Eles têm cobertura de teste de hook e de componente (Task 9) e de feature (Tasks 5 e 6).
