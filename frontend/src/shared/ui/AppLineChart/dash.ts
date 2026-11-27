/**
 * Um traço por posição de série. A cor sozinha não separa duas linhas para quem
 * não distingue matiz, e a rampa de tokens é de 5 tintas para até 4 séries por
 * gráfico: o traço é o segundo canal. A primeira é contínua (`''`); o vetor é
 * fixo e indexa pela POSIÇÃO da série no gráfico, não pelo `inkOffset`, para
 * dois gráficos irmãos começarem ambos pela linha contínua. Passa de 4 séries,
 * recomeça.
 */
export const TRACOS = ['', '6 3', '2 3', '8 3 2 3'] as const

export const tracoDaSerie = (indice: number): string => TRACOS[indice % TRACOS.length]
