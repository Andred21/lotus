/** O MESMO 12 de `EmissionPanelQuery::JANELA_MESES` (backend). O dono do
 * default é o BACKEND — ele o aplica quando `concluidas_desde` não vem, no fuso
 * `America/Santiago`, que é o do negócio. Este número existe só para o seletor
 * ANUNCIAR a janela vigente ("Últimos 12 meses") enquanto o usuário não escolhe
 * data; o front não a calcula nem a manda.
 *
 * Havia aqui um `defaultConcludedSince()` que montava `YYYY-MM-DD` pelos
 * componentes LOCAIS do navegador e ia em TODO GET — o caminho default do
 * servidor nunca rodava, e máquina fora de Santiago perto da meia-noite
 * deslocava a borda em um dia, incluindo ou omitindo turma concluída
 * (Q-2 do review de 2026-08-29). Mudar este número sem mudar o do backend faz a
 * tela prometer uma janela e a API responder outra (spec D7). */
export const EMISSION_PANEL_WINDOW_MONTHS = 12
