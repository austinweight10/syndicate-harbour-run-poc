import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const port = Number(process.env.PORT || 44731);

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    allowedHosts: true,
    cors: { preflightContinue: true },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  ssr: { external: ["playwright"] },
  build: { assetsInlineLimit: 0 },
  optimizeDeps: { include: ["@shopify/app-bridge-react"] },
}) satisfies UserConfig;
