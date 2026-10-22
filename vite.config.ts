import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Relative asset URLs allow the production build to run when `dist/index.html`
// is opened directly from a local folder, without a Node.js server.
export default defineConfig({ base: "./", plugins: [react()] });
