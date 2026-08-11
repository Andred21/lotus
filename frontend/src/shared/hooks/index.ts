export { useClock } from './useClock'
export { useCrudPage } from './useCrudPage'
// `unclassifiedPayloadKeys`, `classificationConflicts`, `MutableResource` e
// `CrudFormOptions` NÃO saem daqui: são o mecanismo interno da guarda de
// classificação, e o único consumidor é o teste ao lado, por caminho relativo
// (Q-2 do review de 2026-08-05). Barrel é fronteira pública.
export { useCrudForm } from './useCrudForm'
export { useEntityForm, useMutationErrors } from './useEntityForm'
export { useEntityPhoto } from './useEntityPhoto'
export type { UseEntityPhotoOptions } from './useEntityPhoto'
export { useFilePreview } from './useFilePreview'
export { useIsCompactViewport } from './useIsCompactViewport'
export { usePermissions } from './usePermissions'
export { useTableFilter } from './useTableFilter'
export type { TableFilter } from './useTableFilter'
