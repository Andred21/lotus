import { addLocale } from 'primereact/api'

/** Locale es-CL do PrimeReact (nomes de mês/dia do Calendar). Rodar uma vez no
 * boot, antes do primeiro render — mesmo lugar do applyPrimeTheme (ADR-16).
 *
 * As chaves de RÓTULO entram junto com as de nome. Só os nomes registrados,
 * `chooseDate` caía no default do PrimeReact e o botão de calendário anunciava
 * "Choose Date" numa tela inteira em espanhol — invisível na pintura, audível em
 * leitor de tela (UI-09 da revisão de 2026-08-17). Elas valem para todo
 * `Calendar` da aplicação, não só para o filtro do Dashboard. */
export function registerPrimeLocales(): void {
  addLocale('es', {
    firstDayOfWeek: 1,
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    today: 'Hoy',
    clear: 'Limpiar',
    weekHeader: 'Sem',
    chooseDate: 'Elegir fecha',
    chooseMonth: 'Elegir mes',
    chooseYear: 'Elegir año',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevDecade: 'Década anterior',
    nextDecade: 'Década siguiente',
  })
}
