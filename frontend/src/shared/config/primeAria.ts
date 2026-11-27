/** Rótulos `aria` do PrimeReact, um bloco por idioma.
 *
 * O Prime lê estes nomes do locale GLOBAL dele (`api.ariaLabel`) para o botão de
 * fechar do Dialog e do Toast, os controles do paginador, a seleção de linha e
 * os demais componentes. Sem o bloco, `addLocale('es', …)` herda o inglês do
 * `en` e o leitor de tela anuncia "Close" numa tela inteira em espanhol (A-12
 * do bloco 66). O `addLocale` funde RASO sobre o `en`: o `aria` do idioma
 * SUBSTITUI o objeto inteiro, então cada bloco traz todas as chaves — uma chave
 * faltando vira `undefined` no nome acessível, não o inglês.
 *
 * `{page}`, `{star}`, `{slideNumber}` e `{0}` são marcadores do Prime. */
export type PrimeAria = Record<string, string>

export const ARIA_EN: PrimeAria = {
  cancelEdit: 'Cancel Edit', close: 'Close', collapseLabel: 'Collapse', collapseRow: 'Row Collapsed',
  editRow: 'Edit Row', expandLabel: 'Expand', expandRow: 'Row Expanded', falseLabel: 'False',
  filterConstraint: 'Filter Constraint', filterOperator: 'Filter Operator', firstPageLabel: 'First Page',
  gridView: 'Grid View', hideFilterMenu: 'Hide Filter Menu', jumpToPageDropdownLabel: 'Jump to Page Dropdown',
  jumpToPageInputLabel: 'Jump to Page Input', lastPageLabel: 'Last Page', listLabel: 'Option List',
  listView: 'List View', moveAllToSource: 'Move All to Source', moveAllToTarget: 'Move All to Target',
  moveBottom: 'Move Bottom', moveDown: 'Move Down', moveToSource: 'Move to Source',
  moveToTarget: 'Move to Target', moveTop: 'Move Top', moveUp: 'Move Up', navigation: 'Navigation',
  next: 'Next', nextPageLabel: 'Next Page', nullLabel: 'Not Selected',
  otpLabel: 'Please enter one time password character {0}', pageLabel: 'Page {page}',
  passwordHide: 'Hide Password', passwordShow: 'Show Password', previous: 'Previous',
  prevPageLabel: 'Previous Page', removeLabel: 'Remove', rotateLeft: 'Rotate Left',
  rotateRight: 'Rotate Right', rowsPerPageLabel: 'Rows per page', saveEdit: 'Save Edit',
  scrollTop: 'Scroll Top', selectAll: 'All items selected', selectLabel: 'Select',
  selectRow: 'Row Selected', showFilterMenu: 'Show Filter Menu', slide: 'Slide',
  slideNumber: '{slideNumber}', star: '1 star', stars: '{star} stars', trueLabel: 'True',
  unselectAll: 'All items unselected', unselectLabel: 'Unselect', unselectRow: 'Row Unselected',
  zoomImage: 'Zoom Image', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
}

export const ARIA_ES: PrimeAria = {
  cancelEdit: 'Cancelar edición', close: 'Cerrar', collapseLabel: 'Contraer', collapseRow: 'Fila contraída',
  editRow: 'Editar fila', expandLabel: 'Expandir', expandRow: 'Fila expandida', falseLabel: 'Falso',
  filterConstraint: 'Condición del filtro', filterOperator: 'Operador del filtro',
  firstPageLabel: 'Primera página', gridView: 'Vista de cuadrícula', hideFilterMenu: 'Ocultar menú de filtro',
  jumpToPageDropdownLabel: 'Lista para ir a una página', jumpToPageInputLabel: 'Campo para ir a una página',
  lastPageLabel: 'Última página', listLabel: 'Lista de opciones', listView: 'Vista de lista',
  moveAllToSource: 'Mover todo al origen', moveAllToTarget: 'Mover todo al destino',
  moveBottom: 'Mover al final', moveDown: 'Mover abajo', moveToSource: 'Mover al origen',
  moveToTarget: 'Mover al destino', moveTop: 'Mover al inicio', moveUp: 'Mover arriba',
  navigation: 'Navegación', next: 'Siguiente', nextPageLabel: 'Página siguiente', nullLabel: 'Sin seleccionar',
  otpLabel: 'Ingresa el carácter {0} de la contraseña de un solo uso', pageLabel: 'Página {page}',
  passwordHide: 'Ocultar contraseña', passwordShow: 'Mostrar contraseña', previous: 'Anterior',
  prevPageLabel: 'Página anterior', removeLabel: 'Quitar', rotateLeft: 'Girar a la izquierda',
  rotateRight: 'Girar a la derecha', rowsPerPageLabel: 'Filas por página', saveEdit: 'Guardar edición',
  scrollTop: 'Ir arriba', selectAll: 'Todos los elementos seleccionados', selectLabel: 'Seleccionar',
  selectRow: 'Fila seleccionada', showFilterMenu: 'Mostrar menú de filtro', slide: 'Diapositiva',
  slideNumber: '{slideNumber}', star: '1 estrella', stars: '{star} estrellas', trueLabel: 'Verdadero',
  unselectAll: 'Ningún elemento seleccionado', unselectLabel: 'Deseleccionar', unselectRow: 'Fila deseleccionada',
  zoomImage: 'Ampliar imagen', zoomIn: 'Acercar', zoomOut: 'Alejar',
}

export const ARIA_PT: PrimeAria = {
  cancelEdit: 'Cancelar edição', close: 'Fechar', collapseLabel: 'Recolher', collapseRow: 'Linha recolhida',
  editRow: 'Editar linha', expandLabel: 'Expandir', expandRow: 'Linha expandida', falseLabel: 'Falso',
  filterConstraint: 'Condição do filtro', filterOperator: 'Operador do filtro',
  firstPageLabel: 'Primeira página', gridView: 'Visualização em grade', hideFilterMenu: 'Ocultar menu de filtro',
  jumpToPageDropdownLabel: 'Lista para ir a uma página', jumpToPageInputLabel: 'Campo para ir a uma página',
  lastPageLabel: 'Última página', listLabel: 'Lista de opções', listView: 'Visualização em lista',
  moveAllToSource: 'Mover tudo para a origem', moveAllToTarget: 'Mover tudo para o destino',
  moveBottom: 'Mover para o fim', moveDown: 'Mover para baixo', moveToSource: 'Mover para a origem',
  moveToTarget: 'Mover para o destino', moveTop: 'Mover para o início', moveUp: 'Mover para cima',
  navigation: 'Navegação', next: 'Próximo', nextPageLabel: 'Próxima página', nullLabel: 'Não selecionado',
  otpLabel: 'Digite o caractere {0} da senha de uso único', pageLabel: 'Página {page}',
  passwordHide: 'Ocultar senha', passwordShow: 'Mostrar senha', previous: 'Anterior',
  prevPageLabel: 'Página anterior', removeLabel: 'Remover', rotateLeft: 'Girar para a esquerda',
  rotateRight: 'Girar para a direita', rowsPerPageLabel: 'Linhas por página', saveEdit: 'Salvar edição',
  scrollTop: 'Ir para o topo', selectAll: 'Todos os itens selecionados', selectLabel: 'Selecionar',
  selectRow: 'Linha selecionada', showFilterMenu: 'Mostrar menu de filtro', slide: 'Slide',
  slideNumber: '{slideNumber}', star: '1 estrela', stars: '{star} estrelas', trueLabel: 'Verdadeiro',
  unselectAll: 'Nenhum item selecionado', unselectLabel: 'Desmarcar', unselectRow: 'Linha desmarcada',
  zoomImage: 'Ampliar imagem', zoomIn: 'Aproximar', zoomOut: 'Afastar',
}
