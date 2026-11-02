import { useTranslation } from 'react-i18next'

/** Texto de ajuda dos formatos aceitos (PNG, JPG ou WebP). Fica visível onde há
 * como enviar a assinatura: o botão só-ícone do slot não diz o que aceita. */
export function SignatureHint() {
  const { t } = useTranslation()
  return (
    <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('signature.hint')}</p>
  )
}
