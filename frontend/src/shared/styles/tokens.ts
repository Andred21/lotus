/**
 * Fórmulas de cor com UM dono.
 *
 * As variáveis simples do tema (`var(--text-color-secondary)`,
 * `var(--surface-border)`) ficam escritas onde são usadas: são a variável, não
 * uma composição. O que mora aqui são as fórmulas — `color-mix` com
 * `--text-color`, que é o que mantém contraste nos dois temas porque os palette
 * vars do Lara (`--red-500`, `--yellow-500`) NÃO invertem com a folha.
 *
 * Estavam copiadas literalmente em 13 arquivos (review do BD-3, Q-5): mudar o
 * tom custava 19 edições, e a catraca de cor do `eslint.config.js` só enxerga
 * `className`, então uma cor errada entrando por `style` passava verde. Aqui
 * ela tem um lugar para ser corrigida.
 */

/** Texto de erro: mensagem de 422, título do estado de falha, item de lista de erro. */
export const dangerText = 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))'

/** Texto informativo e de sucesso — os dois outros tons do `AppCard`. Moram
 * aqui pela mesma razão, e não porque estivessem duplicados: deixar dois tons
 * do mesmo mapa escritos à mão é como o `dangerText` virou 19 cópias. */
export const infoText = 'color-mix(in srgb, var(--blue-500) 70%, var(--text-color))'
export const successText = 'color-mix(in srgb, var(--green-500) 70%, var(--text-color))'

/** Fundo do bloco de erro (banner, resumo de 422). Par do `dangerText`. */
export const dangerSurface = 'color-mix(in srgb, var(--red-500) 10%, var(--surface-card))'

/** Texto de aviso — NÃO é erro: âmbar, sem `role="alert"`, nunca bloqueia ação (§5.7). */
export const warningText = 'color-mix(in srgb, var(--yellow-500) 70%, var(--text-color))'

/** Fundo do bloco de aviso. Par do `warningText`. */
export const warningSurface = 'color-mix(in srgb, var(--yellow-500) 12%, var(--surface-card))'
