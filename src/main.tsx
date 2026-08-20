import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearChunkRetry, installGlobalChunkErrorHandler } from "./lib/chunkError";

// Arranque com sucesso = versão atual carregada: permite nova tentativa
// automática na próxima publicação (evita loop infinito).
clearChunkRetry();

// Erros de import dinâmico que ocorram fora do React (ex: módulo principal)
// também disparam recarga automática única.
installGlobalChunkErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);