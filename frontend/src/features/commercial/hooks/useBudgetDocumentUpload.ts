import { useState } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import type { BudgetDocumentType } from '@shared/types/generated'
import { useUploadBudgetFile } from '../api/useCommercialFiles'

/** O diálogo de subir documento do orçamento (bloco 43, spec J1): o tipo se
 * escolhe em cartões, o arquivo no seletor, e só o "Subir" envia. Erro de envio
 * fica dentro do diálogo, com tipo e arquivo preservados para tentar de novo;
 * fechar e o sucesso zeram tudo, para a próxima abertura começar limpa. */
export function useBudgetDocumentUpload(budgetId: number) {
  const upload = useUploadBudgetFile()
  const { message } = useMutationErrors([upload.error])
  // `message` sai tipado `string`, mas é `null` sem erro (o `?? null` final do
  // `useMutationErrors` some no tipo); alargar aqui é o tipo dizer a verdade.
  const error = message as string | null
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState<BudgetDocumentType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  // Rejeição por tamanho é local: o AppFileUpload barra o arquivo antes de
  // qualquer request, então não vira erro de mutação.
  const [sizeError, setSizeError] = useState<string | null>(null)

  const limpar = () => {
    upload.reset()
    setType(null)
    setFile(null)
    setSizeError(null)
  }

  const close = () => {
    // A tela já trava X, ESC e Cancelar com o envio em voo; esta guarda cobre
    // quem chegar aqui por outro caminho.
    if (upload.isPending) return
    limpar()
    setVisible(false)
  }

  // O AppFileUpload é `auto`: o handler só GUARDA o arquivo, quem envia é o
  // "Subir". `clear()` devolve o seletor ao vazio, para aceitar o mesmo arquivo
  // de novo depois de um erro.
  const pickFile = (e: FileUploadHandlerEvent) => {
    const escolhido = e.files[0]
    e.options.clear()
    if (!escolhido) return
    // O erro do servidor é do arquivo (ou tipo) anterior: não fica ao lado do novo.
    upload.reset()
    setFile(escolhido)
    setSizeError(null)
  }

  const chooseType = (novo: BudgetDocumentType) => {
    upload.reset()
    setType(novo)
  }

  const submit = () => {
    if (type === null || file === null || upload.isPending) return
    upload.mutate(
      { budgetId, type, file },
      {
        onSuccess: () => {
          limpar()
          setVisible(false)
        },
      },
    )
  }

  return {
    visible,
    open: () => setVisible(true),
    close,
    type,
    setType: chooseType,
    file,
    pickFile,
    sizeError,
    onSizeReject: setSizeError,
    error,
    pending: upload.isPending,
    canSubmit: type !== null && file !== null && !upload.isPending,
    submit,
  }
}
