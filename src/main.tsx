import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Auto-apply the new version when a service-worker update is ready, so users
// are not stuck on a stale cached bundle after a deploy.
const updateSW = registerSW({
  onNeedRefresh() {
    void updateSW(true);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
