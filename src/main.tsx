import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cross-domain redirect REMOVIDO: estava quebrando o iframe de "Visualizar"
// (relatorios.* → forms.* bloqueado por X-Frame-Options) e causando tela branca
// em janela anônima. As rotas /f/:id agora funcionam em qualquer subdomínio.

if ('serviceWorker' in navigator) {
  // Recarrega quando um novo SW assume controle (mata bundle velho em cache)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // Força verificação imediata + limpa caches antigos do workbox que podem
  // estar servindo bundles obsoletos do PublicFormPage com bugs já corrigidos
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.update().catch(() => {}));
  }).catch(() => {});

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys
        .filter((k) => k.includes('precache') || k.includes('workbox-precache'))
        .forEach((k) => caches.delete(k).catch(() => {}));
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);
