import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cross-domain redirect REMOVIDO: estava quebrando o iframe de "Visualizar"
// (relatorios.* → forms.* bloqueado por X-Frame-Options) e causando tela branca
// em janela anônima. As rotas /f/:id agora funcionam em qualquer subdomínio.

// ──────────────────────────────────────────────────────────────────────────
// SW KILL-SWITCH (bump quando precisar invalidar cache de TODOS os usuários)
// Android nativo / Samsung Internet / WebView mantêm SWs antigos servindo
// bundles obsoletos do PublicFormPage. Para garantir que todo dispositivo
// receba o bundle novo, desregistramos TODOS os SWs e apagamos TODOS os
// caches uma única vez por versão.
// ──────────────────────────────────────────────────────────────────────────
const SW_KILL_VERSION = 'v4-2026-04-21-forms-routes';

if ('serviceWorker' in navigator) {
  try {
    const lastKill = localStorage.getItem('sw_kill_version');
    if (lastKill !== SW_KILL_VERSION) {
      // Desregistra TODOS os service workers
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});

      // Apaga TODOS os caches (workbox, runtime, fontes, storage…)
      if ('caches' in window) {
        caches.keys().then((keys) => {
          Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
            .then(() => {
              localStorage.setItem('sw_kill_version', SW_KILL_VERSION);
              // Recarrega uma única vez para pegar bundle limpo
              if (!sessionStorage.getItem('sw_kill_reloaded')) {
                sessionStorage.setItem('sw_kill_reloaded', '1');
                window.location.reload();
              }
            })
            .catch(() => {
              localStorage.setItem('sw_kill_version', SW_KILL_VERSION);
            });
        }).catch(() => {
          localStorage.setItem('sw_kill_version', SW_KILL_VERSION);
        });
      } else {
        localStorage.setItem('sw_kill_version', SW_KILL_VERSION);
      }
    } else {
      // Em sessões já limpas, mantém comportamento padrão: recarrega quando
      // novo SW assume controle e força update.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.update().catch(() => {}));
      }).catch(() => {});
    }
  } catch {
    // localStorage bloqueado (modo privado iOS antigo) — segue o jogo
  }
}

createRoot(document.getElementById("root")!).render(<App />);
