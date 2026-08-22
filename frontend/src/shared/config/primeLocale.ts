import { addLocale } from 'primereact/api'

/** Locales do PrimeReact (nomes de mês/dia e rótulos do Calendar). Rodar uma vez
 * no boot, antes do primeiro render — mesmo lugar do applyPrimeTheme (ADR-16).
 *
 * As chaves de RÓTULO entram junto com as de nome. Só os nomes registrados,
 * `chooseDate` caía no default do PrimeReact e o botão de calendário anunciava
 * "Choose Date" numa tela inteira em espanhol — invisível na pintura, audível em
 * leitor de tela (UI-09 da revisão de 2026-08-17). Elas valem para todo
 * `Calendar` da aplicação, não só para o filtro do Dashboard.
 *
 * São DOIS locales e não três: o `en` já vem embutido no PrimeReact e é o
 * default dele. Registrar uma cópia nossa criaria uma segunda fonte de verdade
 * para os mesmos nomes de mês. Quem escolhe qual usar é o `AppDatePicker`, pelo
 * idioma ativo — fixar `locale="es"` no wrapper fazia a tela em pt-BR e em en
 * abrir o calendário em espanhol (UI-02 da revisão de 2026-08-22). */
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

  addLocale('pt', {
    firstDayOfWeek: 0,
    dayNames: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    monthNames: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    today: 'Hoje',
    clear: 'Limpar',
    weekHeader: 'Sem',
    chooseDate: 'Escolher data',
    chooseMonth: 'Escolher mês',
    chooseYear: 'Escolher ano',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    prevYear: 'Ano anterior',
    nextYear: 'Próximo ano',
    prevDecade: 'Década anterior',
    nextDecade: 'Próxima década',
  })
}
