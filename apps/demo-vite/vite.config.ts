import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import zodCompiler from "zod-compiler/vite";

export default defineConfig({
  plugins: [zodCompiler(), react(), tailwindcss()],
  server: {
    allowedHosts: [".localhost"],
    host: true,
  },
});
