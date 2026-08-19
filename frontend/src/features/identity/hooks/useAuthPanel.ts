import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type AuthMode = 'login' | 'forgot'

/**
 * Estado da tela de autenticação, que serve login e recuperação no mesmo lugar.
 *
 * O modo sai do `pathname` e não de `useState`: assim o back do navegador desfaz
 * a troca sem código de história, e deep link em `/recuperar-clave` abre no modo
 * certo. As duas rotas renderizam o MESMO componente, e o `_renderMatches` do
 * react-router monta cada match sem `key` — a árvore reconcilia em vez de
 * remontar, que é o que deixa o e-mail atravessar a troca.
 *
 * Só o e-mail sobe para cá. Senha, erro de credencial e o `sent` da recuperação
 * morrem com o formulário que os produziu, e é isso que se quer: voltar para a
 * recuperação depois de enviar mostra o campo de novo, não a mensagem velha.
 */
export function useAuthPanel() {
  const { pathname } = useLocation()
  const [email, setEmail] = useState('')

  const mode: AuthMode = pathname === '/recuperar-clave' ? 'forgot' : 'login'

  // `switched` separa troca de modo de abertura da tela — só a troca move foco,
  // senão quem abre /login direto tem o foco roubado. Ref e não estado: guardar
  // o modo anterior não deve provocar render.
  const anterior = useRef(mode)
  /* eslint-disable react-hooks/refs -- leitura de `.current` no render é intencional,
   * não descuido: o consumidor precisa ver `switched` verdadeiro NO RENDER COMMITADO para
   * mover o foco. Ajustar estado no render (o molde do `useEntityForm.ts`) apaga a borda —
   * o primeiro render é descartado e `switched` chega `false`, o que foi MEDIDO contra
   * o teste desta task. */
  const switched = anterior.current !== mode
  /* eslint-enable react-hooks/refs */
  useEffect(() => {
    anterior.current = mode
  }, [mode])

  return { mode, email, setEmail, switched }
}
