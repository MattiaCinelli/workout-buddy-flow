import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyStoredAppearance } from './hooks/useTheme.ts'

// The service worker (offline shell + update flow) is registered from
// PwaUpdatePrompt via vite-plugin-pwa's virtual module.
applyStoredAppearance();
createRoot(document.getElementById("root")!).render(<App />);
