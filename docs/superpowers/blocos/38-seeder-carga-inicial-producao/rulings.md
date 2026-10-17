# Bloco 38 — decisões tomadas em nome do João na execução

Uma decisão por linha, com o que custa se estiver errada. As do checkpoint da Task 7 (contagem de 111
e relatório) foram do próprio João e não entram aqui.

## Processo

- Execução sem o pipeline de profundidade 1 (§5.1 do `/executar-bloco`), uma task por vez — custo se errado: só tempo.
- Trailer `Co-Authored-By`: `fad2304c`, `b1777ac8` e `85390b1b` saíram com "Claude Sonnet 5.5" (o harness atribuía Sonnet naquele trecho); do `c58d542d` em diante, "Claude Opus 5.5", como o plano — custo se errado: trailer divergente em 3 commits.
- A falha do leitor no ensaio (cabeçalho `Realizado en:` e colunas em fórmula) foi tratada como defeito de leitura, não como regra a ajustar, e corrigida antes do checkpoint (`0bab71dd`) — custo se errado: nenhum número foi fechado por ajuste de regra; a contagem divergente foi levada ao João.

## Comportamento do código

- `lotus:carga-inicial`: conflito sai `1` nos dois modos; `--simular` sem conflito sai `0` — custo se errado: troca de uma linha se o `--simular` devesse sair `0` mesmo com conflito.
- O extrator apaga `carga.json` e `relatorio.md` antes de gravar, sem staging dos PDFs; depois de uma falha podem sobrar PDFs em `documentos/`, mas sem `carga.json` nada é carregado — custo se errado: PDFs avulsos na pasta de dados (fora do git).
- O `ArquivoDeCarga` valida em duas fases (forma, depois referências), exige `certificado` em toda matrícula e `approval_status = aprobado` quando há certificado — custo se errado: um erro de referência só aparece na execução seguinte à correção da forma.
- A habilitação de redator (`course_redator`) só é gravada para redator criado nesta carga; redator existente não é tocado, mesmo faltando curso — custo se errado: habilitação faltante num redator pré-existente teria de ser feita pela tela.
- A carga real descarta do disco os documentos que subiu antes de uma falha e lista só o que não conseguiu apagar — custo se errado: nenhum; é compensação.
- `CarregadorDeHistorico`: matrícula que já tem certificado de outro código é conflito — custo se errado: recusa num caso que a produção vazia não produz.
- Ficaram sem correção, por não ocorrerem com o complemento gerado nem com a produção vazia: `integer` não estrito em `workload_hours` (M-5), chaves extras espalhadas no `forceFill` (M-6) e matrícula/certificado existentes casados sem comparar conteúdo (M-7) — custo se errado: falso conflito ou campo extra gravado se alguém editar o `carga.json` à mão.
- O relatório não anota que o `student_count` 1 da COT-177 é o padrão (a COT diz "No limitado"); o valor foi mostrado ao João no checkpoint — custo se errado: uma linha a menos no relatório.
- Os demais Minor das revisões de task ficam, pela triagem da revisão final (ex.: `excluir` inexistente sem aviso, `#` tratado sempre como zip, nome sem normalização NFC/NFD, guarda de `base_path()` só sobre `backend/`) — custo se errado: diagnóstico menos amigável num complemento malformado; nenhum grava dado errado.

## Complemento curado (fora do git, mostrado no checkpoint)

- Cliente: razão social "Switch Chile Servicios Eléctricos Ltda." e giro "INSTALACIONES ELÉCTRICAS" do bloco de dados da COT-185; endereço La Concepción 81, Of. 114, Providencia, com cidade e região nulas (a COT só diz "Providencia, Chile"); contato Oscar Ibarra sem e-mail, telefone ou cargo — custo se errado: corrigir o cadastro do cliente pela tela.
- COT-177: `student_count` 1 ("No limitado"), data 2026-02-10, 69,47 UF; COT-178: 10 pessoas, 2026-04-13, 33,85 UF — custo se errado: valor de cotação pendente a ajustar pela tela.
- Módulos: nome = título sem o prefixo "Módulo N" e `contents` = os subitens do docx; Electricidad Básica com aprendizaje e horas teóricas/práticas da aba da COT-177; 035# com 1 h teórica por tópico; descrição do 202# copiada do docx sem o trecho de template — custo se errado: editar módulos pela tela.
- Telefones dos redatores normalizados para `+56 9 XXXX XXXX`; e-mail de cada um é o do CV (o do MAO é `@switch-chile.cl`) — custo se errado: editar o redator pela tela.

## Para o João decidir

- O nome do contato do cliente ("Oscar Ibarra") aparece em `spec.md` e `plano.md` deste bloco. Não é instrutor nem empresa, a exceção que a spec abre para dado público. Fica no git até você dizer o contrário.
