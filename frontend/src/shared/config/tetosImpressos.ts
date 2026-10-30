/**
 * Tetos de caracteres dos campos que o certificado imprime (spec D10, D15). Espelham
 * `App\Shared\Support\TetosImpressos` no backend, que é quem os mede e recusa acima
 * deles; aqui só limitam a digitação. `TetosImpressosParityTest` reprova se um
 * número divergir — mude os dois lados juntos.
 */
export const TETOS_IMPRESSOS = {
  nomeAluno: 70,
  nomeCurso: 110,
  nomeTecnico: 160,
  descricaoCurso: 620,
  razaoSocial: 150,
  nomeAssinante: 60,
  cargoAssinante: 70,
} as const
