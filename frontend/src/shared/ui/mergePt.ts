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
 * Valor de função (o PrimeReact aceita `(options) => props`) é preservado por
 * composição, **dos dois lados**: a saída da função é fundida com o nó do outro
 * lado na hora da chamada, e `pins` continua vencendo folha a folha. A metade
 * que faltava era função no `pins` sobre nó do chamador — a forma que o
 * `maximizableButton` do `AppDialog` tem —, e ali a folha do chamador caía no
 * ramo de substituição e sumia em silêncio: exatamente a falha que este arquivo
 * existe para matar, na direção que ele ainda não cobria (Q-3 do review de
 * 2026-08-18).
 *
 * **Handler colide encadeando, nunca substituindo.** Chave `on[A-Z]` cujos dois
 * lados são função vira uma só que chama o do chamador e depois o do wrapper.
 * Handler é comportamento ADITIVO de quem usa o componente, não propriedade do
 * wrapper: `pins` vencer ali apagava código do chamador em silêncio — o mesmo
 * defeito, na terceira direção (Q-5 do review de 2026-08-27, aberto quando o
 * `togglePt` do `AppPassword` passou a cravar `onClick`/`onKeyDown` pelo D-33).
 * A restrição a `on[A-Z]` é o que separa handler de RESOLVER: o PrimeReact
 * aceita `(options) => props` em chave de NÓ, e ali o retorno é o valor inteiro
 * — encadear descartaria exatamente o que aquele nó vale.
 */
type PtNode = Record<string, unknown>

const isPlainNode = (value: unknown): value is PtNode =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** `onClick`, `onKeyDown`, `onFocus`… — a convenção de evento do React. */
const ehHandler = (key: string): boolean => /^on[A-Z]/.test(key)

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
    } else if (isPlainNode(current) && typeof value === 'function') {
      const resolve = value as (options: unknown) => unknown
      merged[key] = (options: unknown) => mergePt<PtNode>(current, resolve(options))
    } else if (typeof current === 'function' && typeof value === 'function' && ehHandler(key)) {
      const doChamador = current as (...args: unknown[]) => unknown
      const doWrapper = value as (...args: unknown[]) => unknown
      merged[key] = (...args: unknown[]) => {
        doChamador(...args)
        doWrapper(...args)
      }
    } else {
      merged[key] = value
    }
  }
  return merged as T
}
