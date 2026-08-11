/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss({ optimize: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@features": path.resolve(__dirname, "./src/features"),
    },
  },
  // Sem `globals`: cada teste importa describe/it/expect de 'vitest'. Assim os
  // arquivos de teste continuam type-checados pelo `tsc -b` do pnpm build, em
  // vez de virarem zona sem tipo.
  test: {
    environment: "jsdom",
    // `tests/` fica fora de `src/` porque o que ele confere é o REPOSITÓRIO,
    // não a app: o container `app` monta só `./backend` e `./frontend`, então
    // o vitest é o único runner do projeto com acesso à raiz.
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
  },
});
