import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getFormsRedirectUrl } from "./lib/hostMode";

// Redireciona rotas públicas de forms para o subdomínio canônico
// (ex: relatorios.giraerp.com.br/f/nossa-gente → forms.giraerp.com.br/f/nossa-gente)
const formsRedirect = getFormsRedirectUrl();
if (formsRedirect) {
  window.location.replace(formsRedirect);
} else {
  // Force reload when a new Service Worker is activated (fixes stale cache in installed PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);
}
