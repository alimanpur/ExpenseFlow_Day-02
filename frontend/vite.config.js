import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    rollupOptions: {
      input: {
        main: "src/index.jsx",
        help: "src/pages/Help.jsx",
        faq: "src/pages/marketing/FAQ.jsx",
      },
    },
  },
  server: {
    port: 3000,
  },
});