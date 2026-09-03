import axios, {AxiosError} from "axios";
import i18n from "@shared/config/i18n";

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

// Interceptor de resposta, normalizando o erro RFC 7807 para o formato ProblemDetails
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ProblemDetails>) => {
        const problem = error.response?.data;
        
        // Erro de rede / sem resposta do servidor.
        // Traduzido pelo i18n, não fixo: desde a spec D16 este `detail` é o corpo
        // visível do AppErrorState, e queda de rede é o gatilho mais comum dele.
        // Texto fixo aqui vazava português para a UI es-CL do cliente chileno.
        if(!error.response) {
            return Promise.reject({
                type: "https://lotus.cl/errors/network",
                title: i18n.t('common.networkError'),
                status: 0,
                detail: i18n.t('common.networkErrorHint'),
                instance: '',
                localDetail: true,
            } satisfies ProblemDetails);
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

        return Promise.reject(normalized);
    }
);
