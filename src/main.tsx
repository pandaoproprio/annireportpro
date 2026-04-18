import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cross-domain redirect REMOVIDO: estava quebrando o iframe de "Visualizar"
// (relatorios.* → forms.* bloqueado por X-Frame-Options) e causando tela branca
// em janela anônima. As rotas /f/:id agora funcionam em qualquer subdomínio.

// Force reload when a new Service Worker is activated (fixes stale cache in installed PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // Força verificação imediata de nova versão do SW para matar bundle antigo em cache
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.update().catch(() => {}));
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
