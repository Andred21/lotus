import {
  Archive,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUUpLeft,
  ArrowsClockwise,
  ArrowsDownUp,
  Briefcase,
  BookOpen,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Certificate,
  ChartBar,
  ChartLine,
  Check,
  CheckCircle,
  Clock,
  CornersIn,
  CornersOut,
  DotsThreeVertical,
  DownloadSimple,
  Envelope,
  Eye,
  EyeSlash,
  File,
  FileDoc,
  FilePdf,
  FileXls,
  Funnel,
  Gear,
  IdentificationCard,
  Image,
  Lock,
  MagnifyingGlass,
  Money,
  Moon,
  Package,
  PencilSimple,
  Plus,
  Prohibit,
  Receipt,
  Shield,
  ShoppingCart,
  SignOut,
  SortAscending,
  SortDescending,
  SpinnerGap,
  SquaresFour,
  Sun,
  Trash,
  UploadSimple,
  User,
  UserPlus,
  Users,
  Warning,
  WarningCircle,
  X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'

/*
 * Registro de ícones do Lotus: o nome é semântico (o que o ícone SIGNIFICA na
 * tela), não o do desenho. Só `shared/ui` importa Phosphor (CLAUDE.md §5.6).
 *
 * Tabela `pi-<nome>` (PrimeIcons) -> IconName -> componente Phosphor.
 * Inventário medido em src/: 57 tokens `pi-*`; 56 são ícones e `pi-spin` é a
 * classe de animação do PrimeIcons (vira `className` do `spinner`, não ícone).
 *
 *   pi-angle-down         chevronDown   CaretDown
 *   pi-angle-left         chevronLeft   CaretLeft
 *   pi-angle-right        chevronRight  CaretRight
 *   pi-arrow-down         arrowDown     ArrowDown
 *   pi-arrow-left         arrowLeft     ArrowLeft
 *   pi-arrow-right        arrowRight    ArrowRight
 *   pi-arrow-up           arrowUp       ArrowUp
 *   pi-ban                block         Prohibit
 *   pi-book               book          BookOpen
 *   pi-box                package       Package
 *   pi-briefcase          briefcase     Briefcase
 *   pi-building           building      Buildings
 *   pi-calendar           calendar      CalendarBlank
 *   pi-chart-bar          chartBar      ChartBar
 *   pi-chart-line         chartLine     ChartLine
 *   pi-check              check         Check
 *   pi-check-circle       checkCircle   CheckCircle
 *   pi-clock              clock         Clock
 *   pi-cog                settings      Gear
 *   pi-download           download      DownloadSimple
 *   pi-ellipsis-v         more          DotsThreeVertical
 *   pi-envelope           mail          Envelope
 *   pi-exclamation-circle warningCircle WarningCircle
 *   pi-exclamation-triangle warning     Warning
 *   pi-eye                view          Eye
 *   pi-file               file          File
 *   pi-file-excel         fileSheet     FileXls
 *   pi-file-pdf           filePdf       FilePdf
 *   pi-file-word          fileDoc       FileDoc
 *   pi-filter             filter        Funnel
 *   pi-id-card            idCard        IdentificationCard
 *   pi-image              image         Image
 *   pi-inbox              archive       Archive   (arquivar e estado vazio)
 *   pi-lock               lock          Lock
 *   pi-money-bill         money         Money
 *   pi-moon               moon          Moon
 *   pi-objects-column     dashboard     SquaresFour
 *   pi-pencil             edit          PencilSimple
 *   pi-plus               add           Plus
 *   pi-receipt            receipt       Receipt
 *   pi-refresh            refresh       ArrowsClockwise   (tentar de novo)
 *   pi-replay             replay        ArrowCounterClockwise (reemitir)
 *   pi-search             search        MagnifyingGlass
 *   pi-shield             shield        Shield
 *   pi-shopping-cart      cart          ShoppingCart
 *   pi-sign-out           signOut       SignOut
 *   pi-spinner            spinner       SpinnerGap
 *   pi-sun                sun           Sun
 *   pi-times              close         X
 *   pi-trash              delete        Trash
 *   pi-undo               restore       ArrowUUpLeft
 *   pi-upload             upload        UploadSimple
 *   pi-user               user          User
 *   pi-user-plus          userAdd       UserPlus
 *   pi-users              users         Users
 *   pi-verified           certificate   Certificate
 *
 * Nomes que nascem de ícone INTERNO do PrimeReact (SVG que o Prime desenha
 * sozinho, sem `pi-*` no código do Lotus; bloco 64, Task 5):
 *
 *   ChevronUpIcon (dropdown aberto)         chevronUp     CaretUp
 *   WindowMaximizeIcon (dialog)             maximize      CornersOut
 *   WindowMinimizeIcon (dialog maximizado)  minimize      CornersIn
 *   EyeSlashIcon (olho do AppPassword)      viewOff       EyeSlash
 *   SortAltIcon (coluna sem ordem)          sortNeutral   ArrowsDownUp
 *   SortAmountUpAltIcon (coluna crescente)  sortAsc       SortAscending
 *   SortAmountDownIcon (coluna decrescente) sortDesc      SortDescending
 *
 * Nenhum par de `pi-*` colapsou: os 56 têm sentidos distintos no código
 * (`refresh` repete a carga, `replay` reemite o certificado, `restore` tira
 * do arquivo).
 */
export const ICONS = {
  add: Plus,
  archive: Archive,
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  block: Prohibit,
  book: BookOpen,
  briefcase: Briefcase,
  building: Buildings,
  calendar: CalendarBlank,
  cart: ShoppingCart,
  certificate: Certificate,
  chartBar: ChartBar,
  chartLine: ChartLine,
  check: Check,
  checkCircle: CheckCircle,
  chevronDown: CaretDown,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronUp: CaretUp,
  clock: Clock,
  close: X,
  dashboard: SquaresFour,
  delete: Trash,
  download: DownloadSimple,
  edit: PencilSimple,
  file: File,
  fileDoc: FileDoc,
  filePdf: FilePdf,
  fileSheet: FileXls,
  filter: Funnel,
  idCard: IdentificationCard,
  image: Image,
  lock: Lock,
  mail: Envelope,
  maximize: CornersOut,
  minimize: CornersIn,
  money: Money,
  moon: Moon,
  more: DotsThreeVertical,
  package: Package,
  receipt: Receipt,
  refresh: ArrowsClockwise,
  replay: ArrowCounterClockwise,
  restore: ArrowUUpLeft,
  search: MagnifyingGlass,
  settings: Gear,
  shield: Shield,
  signOut: SignOut,
  sortAsc: SortAscending,
  sortDesc: SortDescending,
  sortNeutral: ArrowsDownUp,
  spinner: SpinnerGap,
  sun: Sun,
  upload: UploadSimple,
  user: User,
  userAdd: UserPlus,
  users: Users,
  view: Eye,
  viewOff: EyeSlash,
  warning: Warning,
  warningCircle: WarningCircle,
} as const satisfies Record<string, PhosphorIcon>

export type IconName = keyof typeof ICONS
