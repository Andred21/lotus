/** Máximo de caracteres de um RUT limpo: oito dígitos de corpo mais o DV. */
const MAX_CLEAN = 9

/** Só dígitos e `K`, em maiúscula; o `K` só sobrevive na última posição, onde
 * é DV. Mesma limpeza do `Rut::parse` do backend, que é quem decide. */
function clean(raw: string): string {
  const upper = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  return upper.slice(0, -1).replace(/K/g, '') + upper.slice(-1)
}

/** Máscara progressiva de RUT: `12.345.678-5`. O ÚLTIMO caractere é sempre o DV
 * (como no `Rut::parse`), então `1234` já sai `123-4`. Idempotente: pontuação
 * que vem junto — colada, com espaço, ponto a mais — é descartada e refeita. */
export function formatRutInput(raw: string): string {
  const all = clean(raw).slice(0, MAX_CLEAN)
  if (all.length < 2) return all
  const body = all.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${body}-${all.slice(-1)}`
}

/** Módulo 11 do RUT. SÓ dica visual: quem valida de verdade é o backend. */
export function isRutValid(raw: string): boolean {
  const all = clean(raw)
  const body = all.slice(0, -1)
  if (!/^\d+$/.test(body)) return false

  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const mod = 11 - (sum % 11)
  const dv = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod)
  return all.slice(-1) === dv
}
