/**
 * Cor de severidade com UM dono.
 *
 * As variáveis simples do tema (`var(--text-color-secondary)`,
 * `var(--surface-border)`) ficam escritas onde são usadas: são a variável, não
 * uma composição. O que mora aqui são as TINTAS de severidade e os fundos
 * pareados com elas.
 *
 * Estavam copiadas literalmente em 13 arquivos (review do BD-3, Q-5): mudar o
 * tom custava 19 edições, e a catraca de cor do `eslint.config.js` só enxerga
 * `className`, então uma cor errada entrando por `style` passava verde. Aqui
 * ela tem um lugar para ser corrigida.
 *
 * As quatro tintas eram `color-mix(hue 70%, --text-color)`, sob a tese de que
 * compor com a tinta do corpo mantinha contraste nos dois temas. Medido, valia
 * só no escuro: no claro o hue dominava e o número em aviso do KPI ficava em
 * 2,86:1 (UI-04 do review de 2026-08-17). Hoje apontam para os tokens
 * `--tone-*-ink` do `brand-theme.css`, que trocam o DEGRAU da rampa por tema —
 * a mesma mecânica que o `--brand-ink` já usava. O porquê de cada degrau está
 * lá; a régua medida está em `frontend/tests/tone-ink.test.ts`.
 *
 * Servem a texto E a traço: passam 4,5:1 sobre `--surface-card` e sobre o card
 * tingido a 8%, nos dois temas — logo cobrem também o 3:1 de elemento gráfico.
 */

/** Texto de erro: mensagem de 422, título do estado de falha, item de lista de erro. */
export const dangerText = 'var(--tone-danger-ink)'

/** Tinta informativa e de sucesso — os dois outros tons do `AppCard`. Moram
 * aqui pela mesma razão, e não porque estivessem duplicados: deixar dois tons
 * do mesmo mapa escritos à mão é como o `dangerText` virou 19 cópias. */
export const infoText = 'var(--tone-info-ink)'
export const successText = 'var(--tone-success-ink)'

/** Fundo do bloco de erro (banner, resumo de 422). Par do `dangerText`. */
export const dangerSurface = 'color-mix(in srgb, var(--red-500) 10%, var(--surface-card))'

/** Tinta de aviso — NÃO é erro: âmbar, sem `role="alert"`, nunca bloqueia ação (§5.7). */
export const warningText = 'var(--tone-warning-ink)'

/** Fundo do bloco de aviso. Par do `warningText`. */
export const warningSurface = 'color-mix(in srgb, var(--yellow-500) 12%, var(--surface-card))'

/** Traço de tom sem severidade. Não é tinta de texto: é o trilho do card neutro,
 * onde o tom precisa ocupar o lugar sem afirmar urgência. */
export const neutralInk = 'var(--tone-neutral-ink)'
