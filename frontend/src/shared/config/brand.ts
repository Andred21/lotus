// A cor primária do produto vive SÓ no CSS, como `--brand` em
// shared/styles/brand-theme.css. Havia aqui um `BRAND_COLOR` com o mesmo hex,
// e ele era a porta de fuga da catraca de cor: o seletor mede literal, não
// resolve binding, então `style={{ color: BRAND_COLOR }}` passava verde. Os
// dois consumidores foram pagos (FormSection, CoursesTable) e a constante saiu
// junto — sem segunda grafia, não há o que perseguir (spec D7).
export const APP_VERSION = 'v0.1.0'
