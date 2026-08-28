import { describe, expect, it } from 'vitest'
import { mergePt } from './mergePt'

/** O defeito que este teste tranca: `{ ...pt, ...pins }` substituía a CHAVE
 * inteira, então o `className` do chamador sumia em silêncio sempre que o
 * wrapper também escrevia naquela chave (Q-3 do review de 2026-08-13). */
describe('mergePt', () => {
  it('preserva chave que só o chamador tem', () => {
    const merged = mergePt<Record<string, unknown>>(
      { input: { className: 'w-40' } },
      { showIcon: { 'aria-label': 'Mostrar' } },
    )
    expect(merged).toEqual({
      input: { className: 'w-40' },
      showIcon: { 'aria-label': 'Mostrar' },
    })
  })

  it('mantém as folhas do chamador na mesma chave que o wrapper crava', () => {
    const merged = mergePt<{ showIcon: Record<string, unknown> }>(
      { showIcon: { className: 'text-lg', onClick: 'do' } },
      { showIcon: { role: 'button', 'aria-label': 'Mostrar' } },
    )
    expect(merged.showIcon).toEqual({
      className: 'text-lg',
      onClick: 'do',
      role: 'button',
      'aria-label': 'Mostrar',
    })
  })

  it('o wrapper vence a folha em conflito', () => {
    const merged = mergePt<{ showIcon: { 'aria-label': string } }>(
      { showIcon: { 'aria-label': 'do chamador' } },
      { showIcon: { 'aria-label': 'do wrapper' } },
    )
    expect(merged.showIcon['aria-label']).toBe('do wrapper')
  })

  it('funde nó aninhado sem descartar o irmão', () => {
    const merged = mergePt<{ iconField: { root: Record<string, unknown> } }>(
      { iconField: { root: { style: { gap: 4 } } } },
      { iconField: { root: { className: 'w-full' } } },
    )
    expect(merged.iconField.root).toEqual({ style: { gap: 4 }, className: 'w-full' })
  })

  it('compõe valor de função do chamador em vez de descartá-lo', () => {
    const merged = mergePt<{ showIcon: (options: unknown) => Record<string, unknown> }>(
      { showIcon: (options: unknown) => ({ className: `icon-${String(options)}` }) },
      { showIcon: { role: 'button' } },
    )
    expect(merged.showIcon('lg')).toEqual({ className: 'icon-lg', role: 'button' })
  })

  it('compõe função do WRAPPER sobre o nó do chamador', () => {
    // A direção espelhada, que faltava (Q-3 do review de 2026-08-18): a forma
    // do `maximizableButton` do `AppDialog` é função no `pins`, e a folha do
    // chamador caía no ramo de substituição — o mesmo silêncio que este arquivo
    // existe para matar, na direção que ele não cobria.
    const merged = mergePt<{ maximizableButton: (options: unknown) => Record<string, unknown> }>(
      { maximizableButton: { className: 'text-lg' } },
      { maximizableButton: (options: unknown) => ({ 'aria-label': `max-${String(options)}` }) },
    )
    expect(merged.maximizableButton('on')).toEqual({
      className: 'text-lg',
      'aria-label': 'max-on',
    })
  })

  it('o wrapper vence a folha em conflito também quando é função', () => {
    const merged = mergePt<{ showIcon: (options: unknown) => Record<string, unknown> }>(
      { showIcon: { 'aria-label': 'do chamador' } },
      { showIcon: () => ({ 'aria-label': 'do wrapper' }) },
    )
    expect(merged.showIcon(null)['aria-label']).toBe('do wrapper')
  })

  it('sem `pins` devolve a base intacta', () => {
    const base = { input: { className: 'w-40' } }
    expect(mergePt<typeof base>(base, undefined)).toBe(base)
  })

  it('apaga a chave quando o wrapper crava `undefined`', () => {
    const merged = mergePt<{ showIcon: Record<string, unknown> }>(
      { showIcon: { 'aria-checked': 'true' } },
      { showIcon: { 'aria-checked': undefined } },
    )
    expect(merged.showIcon['aria-checked']).toBeUndefined()
  })

  /**
   * Handler é comportamento ADITIVO do chamador, não propriedade do wrapper.
   * Enquanto `togglePt` do `AppPassword` só carregava dado (`role`, `style`), um
   * `onClick` do chamador sobrevivia por não colidir. Com o D-33 o wrapper passou
   * a cravar `onClick` e `onKeyDown` no mesmo nó, e a folha do chamador caía no
   * ramo de substituição — o MESMO silêncio que este arquivo existe para matar,
   * na terceira direção (Q-3 de 2026-08-13: nó; Q-3 de 2026-08-18: função sobre
   * nó; Q-5 de 2026-08-27: função sobre função).
   */
  it('encadeia handler do chamador com o do wrapper, na ordem', () => {
    const ordem: string[] = []
    const merged = mergePt<{ showIcon: { onClick: (e: string) => void } }>(
      { showIcon: { onClick: (e: string) => ordem.push(`chamador:${e}`) } },
      { showIcon: { onClick: (e: string) => ordem.push(`wrapper:${e}`) } },
    )

    merged.showIcon.onClick('ev')

    expect(ordem).toEqual(['chamador:ev', 'wrapper:ev'])
  })

  /** Só chave de handler encadeia. Valor de função em chave de NÓ é o resolver
   * `(options) => props` do PrimeReact: encadear ali descartaria o retorno, que
   * é justamente o que o nó vale. */
  it('não encadeia função que NÃO é handler — pins continua vencendo', () => {
    const merged = mergePt<{ showIcon: (options: unknown) => Record<string, unknown> }>(
      { showIcon: () => ({ className: 'do chamador' }) },
      { showIcon: () => ({ className: 'do wrapper' }) },
    )

    expect(merged.showIcon('lg')).toEqual({ className: 'do wrapper' })
  })
})
