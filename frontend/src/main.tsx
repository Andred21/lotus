import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "primereact/resources/primereact.min.css"; // core dos componentes
import "primeicons/primeicons.css"; // ícones
import "flag-icons/css/flag-icons.min.css"; // bandeiras do seletor de idioma
// Fontes self-hosted (spec §5, D2): só os pesos que os papéis usam — sem CDN em
// app corporativo e sem carregar família inteira.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
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
