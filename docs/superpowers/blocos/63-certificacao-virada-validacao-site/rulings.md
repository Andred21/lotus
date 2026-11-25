# Bloco 63 — rulings da execução

Decisões tomadas em nome do João durante o `/executar-bloco 63` (subagent-driven-development). Uma por linha, com o custo se estiver errada.

- **Desvio declarado: pipeline de profundidade 1** (Passo 5.1 do `/executar-bloco`). As quatro tasks estão no grupo G1, e o revisor de cada task rodou numa worktree destacada no commit dela enquanto o implementador seguinte trabalhava. Custo se errado: nenhum, porque houve no máximo uma revisão em segundo plano por vez e nenhuma correção ficou empilhada.
- **O 443 do `tls.conf` não rodou em nginx real** (⚠️ da revisão da Task 2) **e não foi tratado como lacuna.** A spec (§5.2) pede a medição só do `prod.conf`. O 443 fica coberto pela catraca textual (corpo idêntico ao do `prod.conf`, sem `add_header`) e pelo item 3 da aceitação em produção. Custo se errado: uma falha do `301` no 443 só aparece no deploy, antes do aceite.
- **`DESIGN.md` entrou no escopo da Task 4** (Important da revisão dela: citava `validationVerdictClass` e o Folio de 30px). Foi omissão do plano no mesmo tema. Custo se errado: um arquivo a mais no diff, revertível.
- **I-1 da revisão final pela correção preferida.** A prop `size` saiu do `CertificateFolio` (`shared/ui`), que agora tem um degrau só, 20px com tracking 0.1em. O `DESIGN.md` e o `.impeccable/design.json` foram alinhados. Fundamento: a spec, §2, manda sair "a `ValidationPage` e tudo que só ela usa", e o site é outro repositório, que não importa `shared/ui`. Custo se errado: a API de `shared/ui` encolheu, e a variante volta revertendo `33097eb2`.
- **Os menores M-1, M-2, M-3, M-4 e M-6 da revisão final entraram na mesma onda de correção**: `estrutura-monolito.md`, `PRODUCT.md`, `.impeccable/design.json`, a linha em branco antes do `---` na P-89 e "revisar na aceitação do 63". Custo se errado: diff de doc um pouco maior.
- **M-5 sem mudança de código.** Ao preencher o `Resultado` do item 3 da aceitação, registrar a saída de `curl -sI` com o `Location` exato, e não só o código `301`. Custo se errado: a aceitação provaria o código, mas não o destino.
- **M-7 fica como está.** Os fixtures do backend com `https://app.lotusotec.cl` (`CertificateValidationUrlTest.php:42`, `IssueCertificateTest.php:386`) são exemplos de "https aceito", não o domínio real. Custo se errado: nenhum funcional.

## Menores estacionados, que ficam como estão

- Comentário "no 443 o 301 herda o HSTS" repetido no `prod.conf`, que só tem porta 80: o texto idêntico nos dois arquivos é intencional e a frase é condicional.
- `~` do nginx diferencia maiúsculas, então `/Validar/<uuid>` não redireciona. O plano fixa `~` e o QR do backend é minúsculo.
- `providers.test.tsx:65-66` usa `'/validar/abc'` como rota-exemplo genérica do MemoryRouter.
- Comentários longos sem reflow em `useDashboard.test.tsx:181` e `HistorialTableRowActions.test.tsx:12`.
- Linha de `PRODUCT.md:18` com mais de 130 colunas.
- `frontend/src/index.css:87` cita "valores da validação pública" num comentário histórico, no passado.
