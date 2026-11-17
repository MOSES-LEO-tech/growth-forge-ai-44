import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

/**
 * Apply a new deployment without leaving the user on stale code.
 *
 * `updateSW(true)` activates the waiting worker, but a page already controlled
 * by the old worker keeps running its old chunks — a deploy then looks like it
 * had no effect (a parent kept seeing an error that was already fixed).
 * Activation is therefore followed by one reload, which loads the new bundle.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true).finally(() => {
      if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
        window.location.reload();
      }
    });
  },
});

createRoot(document.getElementById("root")!).render(<App />);
