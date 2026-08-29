export { useClock } from './useClock'
export { useCrudPage } from './useCrudPage'
export type { CrudPageQueryOptions } from './useCrudPage'
export { useServerTable, SERVER_TABLE_DEBOUNCE_MS } from './useServerTable'
export type { ServerTable, ServerTableOptions, ServerSortOrder } from './useServerTable'
export { useCrudDialog } from './useCrudDialog'
export type { OneResource } from './useCrudDialog'
export { useRestoreAction } from './useRestoreAction'
// `unclassifiedPayloadKeys`, `classificationConflicts`, `MutableResource` e
// `CrudFormOptions` NÃO saem daqui: são o mecanismo interno da guarda de
// classificação, e o único consumidor é o teste ao lado, por caminho relativo
// (Q-2 do review de 2026-08-05). Barrel é fronteira pública.
export { useCrudForm } from './useCrudForm'
export { useArchivedPage } from './useArchivedPage'
export { useArchiveAction } from './useArchiveAction'
export { useBlobTabOpener } from './useBlobTabOpener'
// `useArchiveToasts` NÃO sai daqui: é o mecanismo interno das duas linhas acima,
// consumido por caminho relativo. Barrel é fronteira pública (mesma nota da
// guarda de classificação do `useCrudForm`).
export type { ArchiveMode } from './useArchivedPage'
export type { RestoreOptions } from './useRestoreAction'
export { useCrudFormWithPhoto } from './useCrudFormWithPhoto'
export type { CrudFormPhotoOptions } from './useCrudFormWithPhoto'
export { useEntityForm, useMutationErrors } from './useEntityForm'
export { useEntityPhoto } from './useEntityPhoto'
export type { UseEntityPhotoOptions } from './useEntityPhoto'
export { useFilePreview } from './useFilePreview'
export { useIsCompactViewport, useIsNarrowViewport } from './useViewport'
export { useLoadState } from './useLoadState'
export { listSource, loadFailure } from './listSource'
export { usePermissions } from './usePermissions'
export { useResourceState } from './useResourceState'
export { useTableFilter } from './useTableFilter'
export type { TableFilter } from './useTableFilter'
