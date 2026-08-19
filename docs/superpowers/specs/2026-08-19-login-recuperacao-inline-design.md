# Design — Login e recuperação na mesma tela

> Emenda do `active_work_item` `identity-ativacao-acesso-redator`, escrita em 2026-08-19 sobre a
> branch `feat/identity-ativacao-acesso-redator` em `af34e1b`. Não é bloco novo: a tela de
> recuperação é entrega deste bloco (`9726eab`, `112b145`) e o pedido do João muda a forma dela.
> A spec de origem — `2026-08-18-identity-ativacao-acesso-redator-design.md` — segue valendo; esta
> substitui apenas o desenho da superfície `/recuperar-clave`.

## 1. O que muda e por quê

Hoje `/recuperar-clave` é uma página própria: `ForgotPasswordPage` renderiza um `<main>` solto, sem
o painel de marca, sem o controle de aparência, com tipografia própria. Clicar "¿Olvidaste tu
clave?" no login troca a tela inteira, e o e-mail que o usuário acabou de digitar morre no caminho.

O pedido é que a recuperação viva **na mesma tela do login**, trocando só os campos. O ganho não é
estético: quem clica no link já digitou o e-mail, e a tela unificada é a única forma de ele
sobreviver ao clique.

## 2. Fronteira

**Frontend puro.** Nenhuma rota, DTO, migration ou tipo gerado do backend é tocado —
`POST /api/password/forgot` continua com o mesmo contrato e a mesma resposta genérica. Sem Pint,
sem `typescript:transform`, sem migration.

O que sai do escopo por consequência: `/definir-clave/:token` e `/validar/:uuid` não mudam de lugar
nem de forma. `SetPasswordPage` não é editado — o botão "link vencido" continua navegando para
`/recuperar-clave` e passa a cair na tela unificada de graça.

## 3. Decisões

| # | Decisão | Escolha | Descartado |
|---|---|---|---|
| D1 | Destino da rota | **`/recuperar-clave` fica** e renderiza a mesma tela, decidindo só o modo inicial | Apagar a rota e virar estado puro; manter as duas telas |
| D2 | Posição no router | **Dentro do `SessionBootstrap`**, irmã de `/login` sob o `LoginRoute` | Fora do bootstrap, como está hoje |
| D3 | Decomposição | **Painel + dois formulários irmãos** | Um `LoginForm` com branch de modo; extrair só o shell e manter duas páginas |
| D4 | Origem do modo | **`pathname`**, não estado local | `useState` no painel com a URL só como valor inicial |
| D5 | Estado compartilhado | **Só o e-mail** sobe para o painel | Subir e-mail e `sent`; não compartilhar nada |
| D6 | Depois do envio | **Campo some**, ficam mensagem e link de volta | Campo permanece habilitado; campo permanece desabilitado |

**D2 tem preço e ele é aceito:** visitante anônimo em `/recuperar-clave` passa a disparar um
`GET /api/me`, exatamente como `/login` já dispara. Em troca, o redirect de "já autenticado" passa a
valer para as duas rotas — quem tem sessão e abre `/recuperar-clave` vai para `/`, e troca senha no
perfil. É comportamento novo, declarado, não efeito colateral.

**D3 tem motivo medido:** `LoginForm` tem 103 linhas e o teto do ESLint em
`src/features/*/components/**` é 150. O branch de recuperação custa 40 a 60 linhas — o arquivo único
nasceria contra o teto e obrigaria a extrair sub-campos por aperto de linha, não por fronteira.

**D4 é o que faz o back do navegador funcionar** sem código de história: a URL é a única fonte do
modo, então voltar é voltar de modo, e deep link em `/recuperar-clave` abre em recuperação.

## 4. Rotas e modo

`/login` e `/recuperar-clave` viram rotas irmãs do mesmo layout. `LoginRoute` deixa de devolver
`<LoginPage/>` e passa a devolver `<Outlet/>`, mantendo o redirect de autenticado:

```tsx
<Route
  element={
    <SessionBootstrap>
      <LoginRoute />
    </SessionBootstrap>
  }
>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/recuperar-clave" element={<LoginPage />} />
</Route>
```

| `pathname` | modo |
|---|---|
| `/login` | `login` |
| `/recuperar-clave` | `forgot` |

Trocar de modo é um `<Link>`, não um botão com `navigate`: o destino é uma URL de verdade, e o
`<Link>` mantém `href`, botão do meio e menu de contexto funcionando. Sem `replace`, então o back do
navegador desfaz a troca.

**A tela não remonta na troca, e isso está medido, não suposto.** Em `react-router@7.18.0`,
`_renderMatches` monta cada match dentro de `RenderedRoute` **sem `key`**. Duas rotas irmãs cujo
`element` é o mesmo componente reconciliam no mesmo lugar da árvore: o shell, o `AppearanceControls`
e o estado do painel sobrevivem. Um teste de regressão pina isso — se a premissa cair numa
atualização de dependência, o teste é quem avisa.

## 5. Componentes e estado

```
Login/LoginPage.tsx     shell inalterado; <LoginForm/> vira <AuthPanel/>
Login/AuthPanel.tsx     novo — escolhe o formulário pelo modo
Login/LoginForm.tsx     perde o estado de e-mail, ganha props
Login/ForgotForm.tsx    novo — corpo do ForgotPasswordPage sem o <main>
hooks/useAuthPanel.ts   novo — modo, e-mail compartilhado e sinal de troca
```

```ts
export function useAuthPanel() {
  const { pathname } = useLocation()
  const [email, setEmail] = useState('')
  const mode = pathname === '/recuperar-clave' ? 'forgot' : 'login'

  // `switched` separa troca de modo de abertura da tela — só a troca move foco.
  // Ref e não estado: guardar o modo anterior não deve provocar render.
  const anterior = useRef(mode)
  const switched = anterior.current !== mode
  useEffect(() => { anterior.current = mode }, [mode])

  return { mode, email, setEmail, switched }
}
```

```tsx
export function AuthPanel() {
  const { mode, email, setEmail, switched } = useAuthPanel()
  return mode === 'forgot'
    ? <ForgotForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
    : <LoginForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
}
```

Os dois hooks de submit deixam de guardar e-mail e passam a recebê-lo:

| hook | assinatura | devolve |
|---|---|---|
| `useLoginForm` | `(email: string)` | `password`, `setPassword`, `submit`, `isSubmitting`, `fieldErrors`, `generalError` |
| `useForgotPassword` | `(email: string)` | `submit`, `isSubmitting`, `sent` |

**Só o e-mail atravessa, e é intencional.** Senha digitada, erro de credencial e o `sent` da
recuperação morrem com o formulário que os produziu. Voltar da recuperação para o login dá tela
limpa com o e-mail preservado; voltar para a recuperação depois de enviar mostra o campo de novo, e
não a mensagem antiga — a recuperação não guarda memória de pedido feito.

Nenhum componente chama `useQuery`/`useMutation` direto: `AuthPanel` consome só `useAuthPanel`, e
cada formulário consome só o seu hook.

## 6. Copy, i18n e acessibilidade

| | login | recuperação | recuperação enviada |
|---|---|---|---|
| título | `login.title` | `password.forgotTitle` | `password.forgotTitle` |
| subtítulo | `login.subtitle` | `password.forgotSubtitle` (nova) | — |
| banner de erro | `generalError` | — | — |
| campo e-mail | `login-email` | `forgot-email` | — |
| campo senha | sim | — | — |
| mensagem | — | — | `password.forgotSent` |
| botão | `login.submit` | `password.forgotSubmit` | — |
| link | `login.forgotPassword` → `/recuperar-clave` | `password.backToLogin` → `/login` | `password.backToLogin` → `/login` |

Todas as chaves já existem menos `password.forgotSubtitle`, criada nos três dicionários
(`es-CL`, `pt-BR`, `en`). O texto informa que o link vai por e-mail **sem afirmar que a conta
existe** — mesma disciplina do `forgotSent`, que espelha a resposta genérica do backend para a tela
não virar enumerador de usuários. `parity.test.ts` é a catraca: chave em um dicionário só reprova.

Os ids de campo continuam distintos por modo (`login-email`, `forgot-email`). Os dois nunca
coexistem na árvore, e um id único mentiria sobre qual campo está na tela. O molde de rótulo é o
mesmo já usado: `htmlFor`/`id` com `aria-invalid` e `aria-describedby`, nunca embrulhando o campo
(UI-03).

Duas coisas que a tela inline cria e a tela separada não tinha:

**Envio sem troca de página.** O campo some e a mensagem aparece no mesmo lugar, sem navegação:
leitor de tela não anuncia nada sozinho. `password.forgotSent` sai dentro de um container
`aria-live="polite"` **presente nos dois estados** — container que nasce junto com o texto não
anuncia.

**Troca de modo sem troca de página.** O `<h1>` muda e o React Router não move foco. O `<h1>` do
modo destino recebe `tabIndex={-1}` e foco programático, disparado **só quando `switched` é
verdadeiro**: quem abre `/login` direto não tem o foco roubado.

## 7. Mudanças por arquivo

| Arquivo | Mudança |
|---|---|
| `app/router/AppRouter.tsx` | `LoginRoute` devolve `<Outlet/>`; `/login` e `/recuperar-clave` viram filhas do mesmo layout; import de `ForgotPasswordPage` some |
| `features/identity/components/Login/LoginPage.tsx` | `<LoginForm/>` vira `<AuthPanel/>` |
| `features/identity/components/Login/AuthPanel.tsx` | novo |
| `features/identity/components/Login/LoginForm.tsx` | e-mail vira prop; `<Link>` de recuperação preservado; `<h1>` com `tabIndex={-1}` e foco condicional |
| `features/identity/components/Login/ForgotForm.tsx` | novo, a partir de `ForgotPasswordPage` |
| `features/identity/components/Password/ForgotPasswordPage.tsx` | apagado |
| `features/identity/hooks/useAuthPanel.ts` | novo |
| `features/identity/hooks/useLoginForm.ts` | recebe `email`, perde o `useState` dele |
| `features/identity/hooks/useForgotPassword.ts` | recebe `email`, perde o `useState` dele |
| `shared/config/locales/{es-CL,pt-BR,en}.json` | `password.forgotSubtitle` |
| `features/identity/hooks/useAuthPanel.test.tsx` | novo |
| `features/identity/hooks/useForgotPassword.test.tsx` | adapta à assinatura nova |
| `features/identity/components/Login/AuthPanel.test.tsx` | novo |

## 8. Definition of done

**Testes.** `useAuthPanel.test.tsx` cobre modo derivado dos dois pathnames, e-mail sobrevivendo à
mudança de rota e `switched` falso no mount. `AuthPanel.test.tsx` é o teste da feature: em
`MemoryRouter`, digitar e-mail em `/login`, clicar o link de recuperação, e o campo do modo
recuperação já vem preenchido, sem campo de senha na tela. `useForgotPassword.test.tsx` mantém a
asserção do `POST /api/password/forgot`.

Não há teste unitário do foco no `<h1>`: jsdom mede `document.activeElement`, mas não mede o que
importa, que é o leitor de tela anunciar. Isso fica na prova de navegador.

**Prova end-to-end**, contra a API real, com a stack do worktree em 8081 e o Vite em 5174:

1. `/login`, digitar e-mail, clicar "¿Olvidaste tu clave?" — a URL vira `/recuperar-clave`, o e-mail
   segue preenchido, o campo de senha some, e a página não recarrega.
2. Enviar — a mensagem genérica aparece, o campo some, o Mailpit recebe. Com e-mail inexistente a
   mensagem é a mesma e o total do Mailpit não sobe.
3. Back do navegador — volta ao modo login.
4. Deep link direto em `/recuperar-clave` — abre em recuperação.
5. `/definir-clave/<token vencido>` → "Solicitar novo link" — cai na tela unificada em recuperação.
6. Autenticado abrindo `/recuperar-clave` — redirecionado para `/`.

**Catracas.** `pnpm lint`, `pnpm build`, `pnpm test`. Nenhum arquivo de backend tocado, então Pint,
migration e `generated.ts` não entram.

## 9. Fora de escopo

- **Redesenhar `/definir-clave/:token`** no mesmo shell de marca. É a mesma incoerência visual que
  esta emenda corrige no login, mas a tela é acessada por link de e-mail sem sessão e fica fora do
  `SessionBootstrap` — corte diferente, decisão diferente. Vira linha de backlog, não parte desta
  emenda.
- **Limitar reenvio na própria tela.** O `throttle:6,1` do backend continua sendo o único limite; a
  tela some com o campo depois do envio, o que já retira o convite ao reenvio repetido.
