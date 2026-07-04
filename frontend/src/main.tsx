import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "primereact/resources/themes/lara-light-blue/theme.css"; // tema base
import "primereact/resources/primereact.min.css"; // core dos componentes
import "primeicons/primeicons.css"; // ícones
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
