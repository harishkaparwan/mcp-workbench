import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const mcpTarget = env.VITE_MCP_TARGET || "http://localhost:8080";
  const remotePort = Number(env.VITE_REMOTE_PORT || env.VITE_PORT || 5175);
  const remoteOrigin = env.VITE_REMOTE_ORIGIN || `http://localhost:${remotePort}`;

  return {
    plugins: [
      react(),
      federation({
        name: "mcp_workbench",
        filename: "remoteEntry.js",
        exposes: {
          "./App": "./src/App.tsx",
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: "^19.0.0",
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^19.0.0",
          },
        },
        bundleAllCSS: true,
        manifest: true,
        dts: {
          generateTypes: {
            tsConfigPath: "./tsconfig.app.json",
          },
        },
        dev: {
          disableDynamicRemoteTypeHints: true,
        },
      }),
    ],
    server: {
      port: remotePort,
      origin: remoteOrigin,
      proxy: {
        "/mcp": {
          target: mcpTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: remotePort,
    },
  };
});
