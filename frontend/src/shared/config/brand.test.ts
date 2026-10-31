import { describe, expect, it } from 'vitest'
import pkg from '../../../package.json'
import { APP_VERSION } from './brand'

describe('APP_VERSION', () => {
  it('deriva da versão do package.json, sem literal próprio', () => {
    expect(APP_VERSION).toBe(`v${pkg.version}`)
  })
})
