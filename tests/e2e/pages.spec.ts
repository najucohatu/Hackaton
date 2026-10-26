import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

const liveUrl = "https://najucohatu.github.io/Hackaton/";

test("GitHub Pages redireciona para o build e mantém rota interna ao recarregar", async ({
  page,
}) => {
  const rootHtml = await readFile("index.html", "utf8");
  const buildHtml = await readFile("dist/index.html", "utf8");
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://najucohatu.github.io/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/Hackaton/" || pathname === "/Hackaton/index.html") {
      await route.fulfill({ contentType: "text/html", body: rootHtml });
      return;
    }
    if (
      pathname === "/Hackaton/dist/" ||
      pathname === "/Hackaton/dist/index.html"
    ) {
      await route.fulfill({ contentType: "text/html", body: buildHtml });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto(liveUrl);
  await page.getByLabel("E-mail").fill("demo@rota.plus");
  await page.getByLabel("Senha").fill("demonstracao");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(`${liveUrl}dist/`);
  await expect(
    page.getByRole("heading", { name: "Vamos conquistar novos caminhos." }),
  ).toBeVisible();

  await page.goto(`${liveUrl}dist/#prospects/demo-1`);
  await expect(
    page.getByRole("heading", { name: "Mercado Vila Nova", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(`${liveUrl}dist/#prospects/demo-1`);
  await expect(
    page.getByRole("heading", { name: "Mercado Vila Nova", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
