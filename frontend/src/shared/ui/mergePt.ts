/** Funde o `pt` (passthrough do PrimeReact) do chamador com o que o wrapper
 * precisa cravar, CHAVE A CHAVE e em profundidade.
 *
 * O `mergeProps` do próprio PrimeReact resolve um nível — e, dentro dele,
 * substitui a chave inteira. Um spread raso (`{ ...pt, ...pins }`) faz o mesmo:
 * quem passa `pt={{ showIcon: { className: 'x' } }}` perde `className`, `style`
 * e handler em silêncio quando o wrapper também escreve em `showIcon`.
 *
 * `pins` vence folha a folha: o que o wrapper crava (nome acessível, largura de
 * campo, papel ARIA) não é opcional. Chave que só o chamador tem sobrevive
 * intacta, em qualquer profundidade — inclusive nós aninhados como
 * `iconField.root`.
 *
 * Valor de função no `pt` do chamador (o PrimeReact aceita
 * `(options) => props`) é preservado por composição: a saída dele é fundida com
 * o `pins` na hora da chamada.
 */
type PtNode = Record<string, unknown>

const isPlainNode = (value: unknown): value is PtNode =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function mergePt<T>(base: unknown, pins: unknown): T {
  if (!isPlainNode(pins)) return (pins ?? base) as T
  if (!isPlainNode(base)) return pins as T

  const merged: PtNode = { ...base }
  for (const [key, value] of Object.entries(pins)) {
    const current = merged[key]
    if (isPlainNode(current) && isPlainNode(value)) {
      merged[key] = mergePt<PtNode>(current, value)
    } else if (typeof current === 'function' && isPlainNode(value)) {
      const resolve = current as (options: unknown) => unknown
      merged[key] = (options: unknown) => mergePt<PtNode>(resolve(options), value)
    } else {
      merged[key] = value
    }
  }
  return merged as T
}
