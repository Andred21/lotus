import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ClientAddressData, ClientContactData } from '@shared/types/generated'
import { clientsApi } from './clientsApi'

function useInvalidateClients() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: clientsApi.keys.all })
}

export function useAddContact() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientContactData, ProblemDetails, { clientId: number; payload: ClientContactData }>({
    mutationFn: ({ clientId, payload }) =>
      api.post(`/clients/${clientId}/contacts`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateContact() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientContactData, ProblemDetails, { contactId: number; payload: ClientContactData }>({
    mutationFn: ({ contactId, payload }) =>
      api.put(`/contacts/${contactId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveContact() {
  const invalidate = useInvalidateClients()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (contactId) => api.delete(`/contacts/${contactId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useAddAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientAddressData, ProblemDetails, { clientId: number; payload: ClientAddressData }>({
    mutationFn: ({ clientId, payload }) =>
      api.post(`/clients/${clientId}/addresses`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientAddressData, ProblemDetails, { addressId: number; payload: ClientAddressData }>({
    mutationFn: ({ addressId, payload }) =>
      api.put(`/addresses/${addressId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (addressId) => api.delete(`/addresses/${addressId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
