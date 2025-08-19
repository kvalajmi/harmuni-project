import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "0.0.0.0",
      port: parseInt(env.VITE_PORT || '3000'),
    },
    preview: {
      host: "0.0.0.0", 
      port: 3000,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || 'http://localhost:5000'),
      __SOCKET_URL__: JSON.stringify(env.VITE_SOCKET_URL || 'http://localhost:5000'),
    },
  };
});
