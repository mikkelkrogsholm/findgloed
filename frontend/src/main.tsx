import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initPwa } from "./lib/pwa";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initPwa();
