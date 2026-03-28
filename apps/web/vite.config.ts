import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { validateFrontendEnv } from "./src/config/env-validation";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const fileEnv = loadEnv(mode, __dirname, "");
  const parsed = validateFrontendEnv(
    {
      ...fileEnv,
      ...process.env,
    },
    {
      mode,
      isBuild: command === "build",
    },
  );

  if (!parsed.success) {
    console.error("Invalid frontend environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid frontend environment variables for ${command} (${mode})`);
  }

  return {
    server: {
      watch: {
        // Polling is more reliable for WSL + Windows-mounted workspaces.
        usePolling: true,
        interval: 100,
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
