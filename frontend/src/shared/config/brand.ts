// A cor primária do produto vive SÓ no CSS, como `--brand` em
// shared/styles/brand-theme.css. Havia aqui um `BRAND_COLOR` com o mesmo hex,
// e ele era a porta de fuga da catraca de cor: o seletor mede literal, não
// resolve binding, então `style={{ color: BRAND_COLOR }}` passava verde. Os
// dois consumidores foram pagos (FormSection, CoursesTable) e a constante saiu
// junto — sem segunda grafia, não há o que perseguir (spec D7).
// A versão vem do `version` do package.json, injetada no build pelo `define`
// do vite.config.ts (`__APP_VERSION__`). Sem literal aqui: a fonte é uma só.
export const APP_VERSION = `v${__APP_VERSION__}`
