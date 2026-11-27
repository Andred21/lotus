/**
 * A liberação de `allowNavigation`, de um disparo só. Classe, e não ref: o objeto
 * viaja por prop até o blocker e só é lido dentro do filtro do router, nunca no
 * render.
 */
export class Allowance {
  private granted = false

  grant() { this.granted = true }

  revoke() { this.granted = false }

  /** Lê e zera: a liberação vale para uma navegação só. */
  consume() {
    const was = this.granted
    this.granted = false
    return was
  }
}
