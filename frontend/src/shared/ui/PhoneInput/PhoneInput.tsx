import { useMemo, useState, type ClipboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  phoneCountryOptions,
  phoneFromText,
  phoneFromValue,
  phoneWithCountry,
  type PhoneCountryOption,
} from '../../lib/phone'
import { AppDropdown } from '../AppDropdown'
import { AppInputText } from '../AppInputText'
import { FieldContext, useFieldBind } from '../FormField/fieldContext'

export interface PhoneInputProps {
  /** E.164, o texto cru que a API recusou, ou `null`. Ausente dentro de um
   * `Field` ligado a form: o bind do campo é o default. */
  value?: string | null
  /** E.164 quando o texto parseia, o cru quando não (a API devolve o 422) e
   * `null` para vazio. */
  onChange?: (value: string | null) => void
  inputId?: string
  disabled?: boolean
  invalid?: boolean
  'aria-label'?: string
  className?: string
  /** Classe do campo do número (ex.: `technicalDataClass`), não do conjunto. */
  inputClassName?: string
}

const flag = (code: string) => <span className={`fi fi-${code.toLowerCase()}`} aria-hidden="true" />

/** Telefone com seletor de país e máscara internacional. O formulário guarda
 * E.164 — o mesmo formato que a API grava (spec §4.8). O campo mostra o número
 * nacional formatado enquanto digita; colar um número com `+` troca país e
 * texto de uma vez. `emit` não depende de `isValid()`: a API é a autoridade, e
 * o 422 dela aparece no campo. */
export function PhoneInput({
  value: valueProp, onChange: onChangeProp, inputId, disabled, invalid, className, inputClassName, 'aria-label': ariaLabel,
}: PhoneInputProps) {
  const { t, i18n } = useTranslation()
  const bind = useFieldBind((v: string | null) => v)
  const value = (valueProp !== undefined ? valueProp : (typeof bind.value === 'string' ? bind.value : null)) || null
  const onChange = onChangeProp ?? bind.onChange
  const options = useMemo(() => phoneCountryOptions(i18n.language), [i18n.language])

  const [draft, setDraft] = useState(() => phoneFromValue(value))
  // Valor que NÃO foi o que o campo emitiu (form recarregado, outro registro):
  // refaz país e texto dele. "Adjust state during render", não effect.
  if (value !== draft.emit) setDraft(phoneFromValue(value))

  const commit = (next: typeof draft) => {
    setDraft(next)
    onChange?.(next.emit)
  }

  // Colar `+56 9 …` com o texto do campo já cheio concatenaria o código; um
  // número internacional colado substitui o campo inteiro.
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!pasted.trim().startsWith('+')) return
    e.preventDefault()
    commit(phoneFromText(pasted, draft.country))
  }

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {/* Fora do contexto do `Field`: o id, o `aria-invalid` e o `describedby`
          pertencem ao campo do número, e o dropdown os duplicaria. */}
      <FieldContext.Provider value={null}>
        <AppDropdown
          className="w-32 shrink-0"
          panelClassName="min-w-72"
          aria-label={t('common.phoneCountry')}
          options={options}
          optionLabel="name"
          optionValue="code"
          value={draft.country}
          onChange={(e) => commit(phoneWithCountry(draft.text, e.value))}
          filter
          filterBy="name,calling"
          emptyFilterMessage={t('common.noOptions')}
          disabled={disabled}
          valueTemplate={(o: PhoneCountryOption | null) => (o ? <span className="flex items-center gap-2">{flag(o.code)}+{o.calling}</span> : null)}
          itemTemplate={(o: PhoneCountryOption) => (
            <span className="flex items-center gap-2">{flag(o.code)}<span className="flex-1">{o.name}</span>+{o.calling}</span>
          )}
        />
      </FieldContext.Provider>
      <AppInputText
        className={`min-w-0 flex-1 ${inputClassName ?? ''}`}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label={ariaLabel}
        value={draft.text}
        onChange={(e) => commit(phoneFromText(e.target.value, draft.country))}
        onPaste={paste}
        disabled={disabled}
        {...(inputId !== undefined ? { id: inputId } : {})}
        {...(invalid !== undefined ? { invalid } : {})}
      />
    </div>
  )
}
