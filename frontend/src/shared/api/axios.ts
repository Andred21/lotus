import axios, {AxiosError, type InternalAxiosRequestConfig} from "axios";
import i18n from "@shared/config/i18n";
import {useSessionStore} from "@shared/stores/sessionStore";

// Envolope RFC 7807 que o backend retorna quando ocorre um erro
export interface ProblemDetails {
    type: string
    title: string
    status: number
    detail: string
    instance: string
    errors?: Record<string, string[]>
    /** Envelope montado pelo FRONT, não pelo servidor: o `detail` dele já é
     * i18n e pode ir à tela. A marca é o que o distingue, porque a allowlist do
     * `screenDetail` (shared/lib) é por STATUS — e rede caída ou corpo
     * não-parseável não têm status de servidor para casar com ela. */
    localDetail?: true
}

// NÃO fixe "Content-Type" aqui. O axios já o deriva do payload: objeto simples
// vira application/json, FormData vira multipart com boundary. Um default de
// application/json faz o transformRequest serializar o FormData como JSON
// (axios/lib/defaults/index.js: `isFormData ? hasJSONContentType ?
// JSON.stringify(formDataToJSON(data)) : data`) — cada File vira `{}` e o
// upload chega vazio ao backend, com 201 e sem erro nenhum.
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,   // envia/recebe cookies (Sactum SPA)
    withXSRFToken: true,     // lê o cookie XSRF-TOKEN e envia no header X-XSRF-TOKEN
    // Sem timeout, uma requisição pendurada NUNCA resolve: a mutation fica
    // `isPending` para sempre e o `closeBlocked` do CrudDialog — que bloqueia
    // Cancelar, X e ESC durante uma escrita em voo — tranca o usuário no
    // diálogo até ele recarregar a aba e perder o formulário inteiro.
    // Com timeout, o erro chega, cai no ramo "sem resposta" do interceptor
    // abaixo (vira ProblemDetails traduzido) e o gate abre sozinho.
    //
    // 120s e não 30s por causa do UPLOAD: o teto é 10 MB (documentos) e 5 MB
    // (foto), e o timeout do axios conta a requisição INTEIRA, não a inatividade
    // — um teto curto mataria o upload grande em rede lenta, que é o oposto do
    // problema que este valor resolve.
    timeout: 120_000,
    headers: {
        Accept: "application/json",
    },
});

// Envia o idioma atual (i18n) ao backend via Accept-Language, para as mensagens
// do servidor (validação, auth) voltarem localizadas no envelope RFC 7807.
// O middleware SetLocale (Laravel) mapeia o header para o locale da app.
api.interceptors.request.use((config) => {
    config.headers.set("Accept-Language", i18n.language);
    return config;
});

/**
 * Rotas em que 401/419 NÃO significam "a sessão que eu tinha caiu": ou o usuário
 * ainda não tem sessão (login, convite, recuperação), ou a pergunta É se há
 * sessão (`/api/me` no boot), ou ele está saindo (`logout`). Expirar aqui
 * redirecionaria para o login quem já está nele. Caminho exato, sem query.
 *
 * As três rotas de senha são cópia dos paths de `features/identity/api/
 * passwordApi.ts` (`ROTA` e `/api/password/forgot`): `shared` não importa de
 * feature, então a lista mora aqui — quem mudar um path lá muda aqui.
 */
const ROTAS_SEM_SESSAO = new Set([
    "/api/me",
    "/api/login",
    "/api/logout",
    "/api/invitation/accept",
    "/api/password/reset",
    "/api/password/forgot",
]);

// Mesma chamada de `initCsrf()` (./csrf), refeita aqui de propósito: `csrf.ts`
// importa `api` deste arquivo, e importá-lo de volta fecha um ciclo que trava os
// testes que trocam `@shared/api/axios` por um mock (a factory carrega o módulo
// real, que pede o `csrf`, que pede o mock em construção).
const CSRF_COOKIE = "/sanctum/csrf-cookie";

/** O `config` repetido pelo interceptor do 419 carrega a marca de que já foi. */
type ConfigRepetivel = InternalAxiosRequestConfig & { _retried419?: boolean };

function expirarSeAutenticada(config?: InternalAxiosRequestConfig): void {
    const caminho = (config?.url ?? "").split("?")[0];
    if (ROTAS_SEM_SESSAO.has(caminho)) return;
    // Idempotente no store: um painel com três queries recusadas ao mesmo tempo
    // vira UMA transição — um redirecionamento, um aviso, um `from`.
    useSessionStore.getState().expire();
}

// Interceptor de resposta, normalizando o erro RFC 7807 para o formato ProblemDetails
function normalizar(error: AxiosError<ProblemDetails>): ProblemDetails {
        const problem = error.response?.data;
        
        // Erro de rede / sem resposta do servidor.
        // Traduzido pelo i18n, não fixo: desde a spec D16 este `detail` é o corpo
        // visível do AppErrorState, e queda de rede é o gatilho mais comum dele.
        // Texto fixo aqui vazava português para a UI es-CL do cliente chileno.
        if(!error.response) {
            return {
                type: "https://lotus.cl/errors/network",
                title: i18n.t('common.networkError'),
                status: 0,
                detail: i18n.t('common.networkErrorHint'),
                instance: '',
                localDetail: true,
            } satisfies ProblemDetails;
        }

        // Se o backend mandou o envelope RFC 7807, retorna normalizado (já vem
        // localizado — o request manda Accept-Language). Se não (raro), monta um
        // fallback com o status HTTP, TRADUZIDO nas duas linhas.
        //
        // O `detail` não pode ser `error.message`: "Request failed with status
        // code 500" é string do axios, em inglês, e é justamente o `detail` que
        // o `AppErrorState`/`InlineLoadState` renderizam como corpo — o título
        // é a linha curta. Enquanto o ramo abaixo era inalcançável (corpo vazio
        // virava `''` e passava direto), o inglês não aparecia; a guarda de
        // OBJETO passou a rotear corpo vazio e HTML para cá, e a partir daí ele
        // chega à UI es-CL do cliente. Mesma chave do `problemFromBlob`, que
        // monta este mesmo envelope sintético para corpo não-parseável.
        //
        // O que qualifica um corpo aqui é ser OBJETO, não ser não-nulo: um `??`
        // só pega `null`/`undefined`, e resposta de erro SEM CORPO entrega `''`
        // — que passava direto e virava a REJEIÇÃO. Aí `loadError` era string
        // vazia, falsy, e o `InlineLoadState` desistia no `!error`: a tela
        // falhava em SILÊNCIO, sem aviso nenhum (medido em /perfil com um 500 de
        // corpo vazio, 2026-08-16). Vale igual para corpo em HTML (página de
        // debug do Laravel, proxy no meio): string não é envelope.
        const envelope = typeof problem === 'object' && problem !== null ? problem : null

        const normalized: ProblemDetails = envelope ?? {
            type: 'https://lotus.cl/errors/unknown',
            title: i18n.t('common.unexpectedError'),
            status: error.response.status,
            detail: i18n.t('common.unexpectedErrorHint'),
            instance: '',
            localDetail: true,
        };

        return normalized;
}

// Interceptor de resposta: sessão (419/401) e normalização do erro RFC 7807.
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ProblemDetails>) => {
        const status = error.response?.status;
        const config = error.config as ConfigRepetivel | undefined;

        // 419 = token CSRF vencido (não a sessão). Renova e repete UMA vez; o
        // `csrf-cookie` fica de fora para a renovação não entrar em laço consigo.
        if (status === 419 && config && config.url !== CSRF_COOKIE) {
            if (!config._retried419) {
                config._retried419 = true;
                try {
                    await api.get(CSRF_COOKIE);
                } catch {
                    return Promise.reject(normalizar(error));
                }
                return api.request(config);
            }
            // Renovou e o servidor recusou de novo: não é token, é sessão.
            expirarSeAutenticada(config);
        } else if (status === 401) {
            expirarSeAutenticada(config);
        }

        return Promise.reject(normalizar(error));
    }
);
