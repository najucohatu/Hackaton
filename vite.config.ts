import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function offlineHtml() {
  return {
    name: "offline-html",
    async closeBundle() {
      const output = resolve(process.cwd(), "dist");
      const page = resolve(output, "index.html");
      let html = await readFile(page, "utf8");
      const scriptMatch = html.match(
        /<script type="module" crossorigin src="\.\/assets\/([^"]+)"><\/script>/,
      );
      if (scriptMatch) {
        const source = await readFile(
          resolve(output, "assets", scriptMatch[1]),
          "utf8",
        );
        html = html.replace(
          scriptMatch[0],
          () => `<script type="module">${source}</script>`,
        );
      }
      const styleMatch = html.match(
        /<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+)">/,
      );
      if (styleMatch) {
        const source = await readFile(
          resolve(output, "assets", styleMatch[1]),
          "utf8",
        );
        html = html.replace(styleMatch[0], () => `<style>${source}</style>`);
      }
      await writeFile(page, html);
    },
  };
}

// Relative asset URLs allow the production build to run when `dist/index.html`
// is opened directly from a local folder, without a Node.js server.
export default defineConfig({ base: "./", plugins: [react(), offlineHtml()] });
