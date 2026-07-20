import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "primereact/resources/primereact.min.css"; // core dos componentes
import "primeicons/primeicons.css"; // ícones
import "flag-icons/css/flag-icons.min.css"; // bandeiras do seletor de idioma
import "./index.css";
import "./shared/config/i18n"; // inicializa i18next (side-effect)
import { applyPrimeTheme } from "./shared/config/primeTheme";
import { registerPrimeLocales } from "./shared/config/primeLocale";
import { useUiStore } from "./shared/stores/uiStore";

// A folha do tema Prime não é mais um import estático (ADR-16): ela é escolhida
// pelo tema persistido, antes do primeiro paint, para não haver flash de tema.
registerPrimeLocales();
applyPrimeTheme(useUiStore.getState().theme);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
