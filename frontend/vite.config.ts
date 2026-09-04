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
  // `||`, não `??`: o Compose lê o MESMO arquivo com `${VAR:-default}`, que
  // cai no default tanto quando a variável está unset quanto quando está
  // VAZIA. `??` só cobre o primeiro caso — com `LOTUS_DEV_VITE_PORT=` o Vite
  // faria `Number("") === 0` e subiria em porta aleatória (`strictPort` não
  // protege: porta 0 é pedido válido de porta aleatória), e `portaApi` vazio
  // geraria a baseURL quebrada "http://localhost:".
  const portaVite = Number(offset.LOTUS_DEV_VITE_PORT || 5173);
  const portaApi = offset.LOTUS_DEV_HTTP_PORT || "8080";
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
    //
    // DOIS projetos, desde 2026-09-03 (item 27). `tests/` só lê o repositório
    // com `readFileSync` — medido: 11 de 11 arquivos, ZERO tocando `render(`,
    // `document` ou `window` — e `environment` era o maior item do tempo da
    // suíte (121,39s de 96,68s de parede, somados entre workers).
    //
    // `extends: true` no `unit` NÃO é decoração: sem ele o projeto perde os
    // `resolve.alias` (`@shared`, `@features`) e o plugin do React, e todo
    // `src/**` deixa de compilar. O `repo` fica sem `extends` de propósito —
    // ele não usa alias nem JSX, e herdar plugin é transform que ninguém lê.
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            // COM `setupFiles`, desde 2026-09-02 (P-69): o `afterEach(cleanup)`
            // do Testing Library era grafia manual em 62 dos 127 arquivos, e o
            // desmonte dependia de quem copiava o molde de quem. O par que
            // sustenta a decisão é a catraca `CLEANUP_A_MAO` (eslint.config.js)
            // mais a guarda `tests/desmonte-global.test.ts`, que confere que
            // ESTA linha existe e que ela mora NESTE projeto.
            setupFiles: ['./src/test-setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          test: {
            name: 'repo',
            environment: 'node',
            // `tests/` fica fora de `src/` porque o que ele confere é o
            // REPOSITÓRIO, não a app: o container `app` monta só `./backend` e
            // `./frontend`, então o vitest é o único runner do projeto com
            // acesso à raiz. E por isso mesmo roda em `node`: não há DOM a
            // montar, só arquivo a ler.
            include: ['tests/**/*.test.{ts,tsx}'],
          },
        },
      ],
    },
  };
});
