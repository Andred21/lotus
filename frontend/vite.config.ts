/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// A RAIZ do repositório, não `frontend/`: o offset de portas da árvore de
// trabalho mora no `.env` da raiz, que o compose também lê. O prefixo
// `LOTUS_` restringe a leitura a ele — `import.meta.env` da aplicação segue
// vindo só de `frontend/.env`, e as chaves `VITE_*` continuam sendo dele.
const RAIZ_DO_REPO = path.resolve(__dirname, "..");

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const offset = loadEnv(mode, RAIZ_DO_REPO, "LOTUS_");
  const portaVite = Number(offset.LOTUS_DEV_VITE_PORT ?? 5173);
  const portaApi = offset.LOTUS_DEV_HTTP_PORT ?? "8080";
  const apiJaDefinida = loadEnv(mode, __dirname, "VITE_").VITE_API_URL !== undefined;

  return {
    plugins: [react(), tailwindcss({ optimize: true })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app": path.resolve(__dirname, "./src/app"),
        "@shared": path.resolve(__dirname, "./src/shared"),
        "@features": path.resolve(__dirname, "./src/features"),
      },
    },
    // `strictPort` falha alto na porta ocupada em vez de escorregar para a
    // seguinte: o container recebe `SANCTUM_STATEFUL_DOMAINS` com ESTA porta,
    // e escorregar em silêncio mata a sessão sem mensagem que explique.
    server: { port: portaVite, strictPort: true },
    // Só no `serve`, e só como default. No `build` este define NÃO é emitido:
    // a imagem de produção passa `ENV VITE_API_URL=""` (docker/Dockerfile.prod)
    // para servir SPA e API da mesma origem, e um define incondicional
    // gravaria a URL de desenvolvimento dentro do bundle. Um `VITE_API_URL`
    // explícito em `frontend/.env` continua vencendo o derivado.
    ...(command === "serve" && !apiJaDefinida
      ? { define: { "import.meta.env.VITE_API_URL": JSON.stringify(`http://localhost:${portaApi}`) } }
      : {}),
    // Sem `globals`: cada teste importa describe/it/expect de 'vitest'. Assim os
    // arquivos de teste continuam type-checados pelo `tsc -b` do pnpm build, em
    // vez de virarem zona sem tipo.
    test: {
      environment: "jsdom",
      // `tests/` fica fora de `src/` porque o que ele confere é o REPOSITÓRIO,
      // não a app: o container `app` monta só `./backend` e `./frontend`, então
      // o vitest é o único runner do projeto com acesso à raiz.
      include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    },
  };
});
