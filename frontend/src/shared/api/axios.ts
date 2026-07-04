import axios, {AxiosError} from "axios";

// Envolope RFC 7807 que o backend retorna quando ocorre um erro
export interface ProblemDetails {
    type: string
    title: string
    status: number
    detail: string
    instance: string
    errors?: Record<string, string[]>
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,   // envia/recebe cookies (Sactum SPA)
    withXSRFToken: true,     // lê o cookie XSRF-TOKEN e envia no header X-XSRF-TOKEN 
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

// Interceptor de resposta, normalizando o erro RFC 7807 para o formato ProblemDetails
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ProblemDetails>) => {
        const problem = error.response?.data;
        
        // Erro de rede / sem resposta do servidor
        if(!error.response) {
            return Promise.reject({
                type: "https://lotus.cl/errors/network",
                title: "Erro de conexão",
                status: 0,
                detail: "Não foi possível conectar ao servidor.",
                instance: '',
            } satisfies ProblemDetails);
        }

        // Se o backend mandou o envelope RFC 7807, retorna normalizado.
        // Se não (raro), monta um fallback com o status HTTP.
        const normalized: ProblemDetails = problem ?? {
            type: 'https://lotus.cl/errors/unknown',
            title: 'Erro inesperado',
            status: error.response.status,
            detail:error.message,
            instance: '',
        };

        return Promise.reject(normalized);
    }
);
