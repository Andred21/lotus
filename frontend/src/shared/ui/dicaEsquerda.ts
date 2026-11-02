/** A dica abre à ESQUERDA do controle: as ações de linha moram na borda direita
 * do cartão ou da tabela, e à direita (o default do Prime) a dica passa da
 * moldura e cria rolagem horizontal na página — achado do João no "Revocar" do
 * Historial (review do item 23), generalizado às linhas de arquivo no bloco 47.
 *
 * Interna de `shared/ui`: NÃO sai pelo barrel. Quem está fora da pasta não deve
 * pedir a dica à esquerda por conta própria — usa o componente que já a traz. */
export const DICA_ESQUERDA = { position: 'left' } as const
