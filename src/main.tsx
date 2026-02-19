import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force reload when a new Service Worker is activated (fixes stale cache in installed PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
