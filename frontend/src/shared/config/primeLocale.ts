import { addLocale, locale } from 'primereact/api'
// A instância global do i18next, e não `./i18n`: importar o módulo de init
// inicializaria o i18n em todo teste que só registra os locales do Prime.
import i18n from 'i18next'
import { ARIA_EN, ARIA_ES, ARIA_PT } from './primeAria'

/** Locales do PrimeReact (nomes de mês/dia e rótulos do Calendar). Rodar uma vez
 * no boot, antes do primeiro render — mesmo lugar do applyPrimeTheme (ADR-16).
 *
 * As chaves de RÓTULO entram junto com as de nome. Só os nomes registrados,
 * `chooseDate` caía no default do PrimeReact e o botão de calendário anunciava
 * "Choose Date" numa tela inteira em espanhol — invisível na pintura, audível em
 * leitor de tela (UI-09 da revisão de 2026-08-17). Elas valem para todo
 * `Calendar` da aplicação, não só para o filtro do Dashboard.
 *
 * O `en` já vem embutido no PrimeReact (nomes de mês e de dia, e é o default
 * dele); registramos só o bloco `aria` dele, e não uma cópia dos nomes, para não
 * criar uma segunda fonte de verdade para os meses. Quem escolhe qual usar é o `AppDatePicker`, pelo
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
    aria: ARIA_ES,
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
    aria: ARIA_PT,
  })

  // Explícito, e não só o embutido: o bloco `aria` dos três idiomas mora no mesmo
  // arquivo (`primeAria.ts`) e o teste compara os conjuntos de chaves entre eles.
  addLocale('en', { aria: ARIA_EN })

  // Os rótulos `aria` (fechar do Dialog e do Toast, controles do paginador) o
  // Prime lê do locale GLOBAL, e `addLocale` só registra. Sem este espelho o
  // bloco ficava instalado e o leitor de tela seguia no inglês (A-12). O
  // `Calendar` não depende disto: o `AppDatePicker` passa `locale` por componente.
  const seguirIdioma = (lng?: string): void => {
    locale(primeLocaleFor(lng))
  }
  seguirIdioma(i18n.language)
  i18n.on('languageChanged', seguirIdioma)
}

/** `es-CL`/`pt-BR` → `es`/`pt`; o resto cai no `en` embutido. */
function primeLocaleFor(lng?: string): 'es' | 'pt' | 'en' {
  if (lng?.startsWith('es')) return 'es'
  if (lng?.startsWith('pt')) return 'pt'
  return 'en'
}
