/**
 * Rótulo do curso onde ele aparece como escolha ou como título: `C-12 · Nome`.
 * Sem código (curso criado fora da Action, `code` ausente ou nulo) devolve só o
 * nome — o código é derivado do id e nunca é digitado, então não há o que
 * inventar no lugar.
 */
export function courseLabel(course: { code?: string | null; name: string }): string {
  return course.code ? `${course.code} · ${course.name}` : course.name
}
