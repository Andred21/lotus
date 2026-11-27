# Fechamento do bloco 64: quadro dos IDs

O bloco 64 assumiu quatro IDs da auditoria: T10, D-6, C-12 e C-10. Cada linha abaixo diz como o ID ficou e qual prova sustenta isso. A prova é um teste (arquivo e nome), uma captura (caminho) ou um veredito do João.

A passada visual foi feita em 2026-11-26 com a stack da lane 64, offset +1.
- **Telas:** Dashboard, Comercial, detalhe de orçamento, Operación, detalhe e criação de turma, Cursos, Certificados, Personas, Administración, Perfil, login e 404.
- **Variações:** três viewports (1440×900, 1024×768 e 390×844), tema claro e escuro, es-CL, usuário admin.
- **Onde estão as capturas:** a varredura completa ficou na pasta de artefatos da run, ignorada pelo Git. Aqui só se versionam as capturas que provam um veredito, em `visual/`.

| ID | Estado | Prova |
|---|---|---|
| T10 — ícones | fechado | **Testes:** `frontend/tests/icons-ratchet.test.ts`, que verifica "nenhuma classe PrimeIcons em src", "primeicons fora do package.json" e "Phosphor só em shared/ui"; e `frontend/src/shared/ui/AppIcon/AppIcon.test.tsx`. **Capturas:** `visual/T10-sidebar-listagem-light.png` e `visual/T10-sidebar-listagem-dark.png`, com o módulo ativo em `fill` e as ações de linha; `visual/T10-dialogo-light.png` e `visual/T10-dialogo-dark.png`. **Grep do Step 4b:** `grep -rE "pi pi-\|primeicons" frontend` não acha nada fora da própria catraca. |
| C-12 — título por rota e foco | fechado | **Testes:** `frontend/src/app/router/routeChrome.test.tsx`, casos "título segue a rota" e "foco vai ao main na navegação e não na carga". **Ao vivo:** clicar em Operación na sidebar leva o foco para `MAIN#contenido` (`tabindex=-1`) e muda a aba para "Operación · Lotus". Nas 12 rotas varridas, a aba mostra `<Módulo> · Lotus`. |
| C-10 — 404 e 403 | fechado | **404:** captura `visual/C10-404-light.png` e `visual/C10-404-dark.png`, mais o teste `routeChrome.test.tsx` "rota desconhecida mostra 404 dentro do layout". **403, fechado só por teste (veredito do João, 2026-11-26):** `routeChrome.test.tsx` "módulo sem permissão mostra 403 sem Reintentar" e "detalhe sem permissão mostra 403"; e `frontend/src/features/operation/components/Turma/TurmaDetailPage.forbidden.test.tsx` "403 do GET: explica a recusa e NÃO oferece Reintentar". Não houve captura porque nenhum redator do seed tem senha conhecida. |
| D-6 — carga inicial | **aberto** | **Veredito do João (2026-11-26), opção (b):** o D-6 só fecha com o chunk `ui` dividido. A divisão vai para o plano do bloco 65. Os números estão logo abaixo. |

## D-6: números (gzip)

| Arquivo | Antes do bloco | Depois do bloco 64 |
|---|---|---|
| JS de entrada (`index-*.js`) | 590,47 kB | 93,25 kB |
| CSS de entrada (`index-*.css`) | 93,93 kB | 8,28 kB |
| chunk `ui` (`ui-*.js`), com `modulepreload` em `index.html` | (estava dentro do `index`) | 465,48 kB |

O ganho real de JS na carga inicial foi pequeno: de 590 para uns 558 kB. As páginas viraram `lazy` por rota, mas o barrel `@shared/ui` continua num chunk só, com PrimeReact, Phosphor e libphonenumber, e esse chunk é pré-carregado já na entrada. O ganho grande foi no CSS, porque o CSS do flag-icons agora só carrega dentro do PhoneInput.

## Pedido do João na passada

Ícones maiores no geral (2026-11-26). Correção na Task 1 (`AppIcon`) com a escala: sm passa de 14 para 16 px, md de 16 para 20 px e lg de 24 para 28 px. Os ícones internos do PrimeReact passam de 16 para 20 px. Os ícones de 32 px nos cabeçalhos de diálogo não mudam. As capturas do T10 acima foram tiradas depois dessa correção. Para não mudar a altura de botões, cabeçalhos de tabela e toggles, o glifo maior foi compensado com `-my-0.5`.

O aumento teve um efeito colateral que o João precisa ver. Na tabela de instrutores do Dashboard, a 1440 px, o glifo de ordenação de "DOCUMENTOS POR VENCER" desce para uma segunda linha. A altura do `th` continua a mesma, e o comportamento é o `flex-wrap` que as colunas de título longo já tinham.

## Gate final

- **Em `d57c6e82`, antes do aumento dos ícones:** `pnpm lint` exit 0, `pnpm test` com 268 arquivos e 2254 testes, `pnpm build` ok, `php artisan test` com 2103 passando e 7 pulados.
- **Em `696d3167`, depois do aumento:** `pnpm lint` exit 0, `pnpm test` com 268 arquivos e 2258 testes, `pnpm build` ok. O backend não mudou.
