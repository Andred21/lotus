/** Modo do dialog unificado de cadastro: visualização, edição ou criação.
 * Vive em shared porque toda feature de cadastro usa a mesma forma. */
export type DialogMode = 'view' | 'edit' | 'create'
