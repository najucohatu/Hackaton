import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const base = "http://127.0.0.1:5173";
const getData = (p: Page) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("rota-plus:v1")!));
const future = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(10, 30, 0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
test("jornada real: cadastro → visita → negociação → ativação → compra → backup → exclusão", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "Vamos conquistar novos caminhos." }),
  ).toBeVisible();
  const initial = await getData(page);
  const initialXP = initial.rewards.reduce(
    (n: number, r: { xp: number }) => n + r.xp,
    0,
  );
  await page
    .getByRole("button", { name: "+ Novo potencial", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Cadastrar potencial" }).click();
  await expect(modal).toBeVisible();
  await modal
    .getByLabel("Nome do estabelecimento *")
    .fill("Padaria Jornada E2E");
  await modal.getByLabel("Tipo de estabelecimento *").selectOption("Padaria");
  await modal.getByLabel("Nome do responsável").fill("Pessoa fictícia");
  await modal
    .getByLabel("E-mail", { exact: true })
    .fill("jornada@exemplo.invalid");
  await modal.getByText("Localização", { exact: true }).click();
  await modal.getByLabel("Endereço", { exact: true }).fill("Rua Ilustrativa");
  await modal.getByLabel("Cidade", { exact: true }).fill("Campinas");
  await modal.getByLabel("Estado (UF)").fill("SP");
  await modal.getByRole("button", { name: "Cadastrar potencial" }).click();
  await expect(
    page.getByRole("heading", { name: "Padaria Jornada E2E", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("+1 XP");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copiar sugestões", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Padaria Jornada E2E",
  );
  await page
    .getByRole("button", { name: "Editar cadastro", exact: true })
    .click();
  await page.getByLabel("Nome do responsável").fill("Responsável atualizado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByText("Responsável atualizado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar primeira compra", exact: true })
    .click();
  await page.getByLabel("Valor total (R$) *").fill("700");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar registro" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ative o cliente");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agendar visita", exact: true })
    .click();
  await page.getByLabel("Data e horário *").fill(future());
  await page.getByLabel("Objetivo da visita *").fill("Apresentar o portfólio");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar registro" })
    .click();
  await page.getByRole("button", { name: "Registrar resultado" }).click();
  await page.getByLabel("Resultado da visita *").selectOption("Produtiva");
  await page
    .getByLabel("O que aconteceu na visita? *")
    .fill("Cliente tem interesse em conhecer as opções.");
  await page
    .getByLabel("Objeção encontrada")
    .selectOption("Já tenho fornecedor.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Concluir visita", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("+2 XP");
  await page
    .getByRole("button", { name: "Atualizar negociação", exact: true })
    .click();
  await page.getByLabel("Novo estágio").selectOption("negotiation");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar registro" })
    .click();
  await expect(page.getByRole("status")).toContainText("+3 XP");
  await page
    .getByRole("button", { name: "Agendar retorno", exact: true })
    .first()
    .click();
  await page.getByLabel("Próximo contato *").fill(future());
  await page.getByLabel("Próxima ação *").fill("Retomar proposta");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar registro" })
    .click();
  await page
    .getByRole("button", { name: "Concluir cadastro", exact: true })
    .click();
  await page.getByLabel("Conferi os dados comerciais").check();
  await page
    .getByRole("button", { name: "Ativar cliente", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("+4 XP");
  await page
    .getByRole("button", { name: "Registrar primeira compra", exact: true })
    .click();
  await page.getByLabel("Valor total (R$) *").fill("700");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar registro" })
    .click();
  await expect(page.getByRole("status")).toContainText("+5 XP");
  await expect(page.getByText("R$ 700,00", { exact: true })).toBeVisible();
  let data = await getData(page);
  expect(
    data.rewards.reduce((n: number, r: { xp: number }) => n + r.xp, 0) -
      initialXP,
  ).toBe(15);
  const p = data.prospects.find(
    (p: { businessName: string }) => p.businessName === "Padaria Jornada E2E",
  );
  expect(p.stage).toBe("purchased");
  expect(
    data.orders.filter((o: { prospectId: string }) => o.prospectId === p.id),
  ).toHaveLength(1);
  const expected = {
    total: data.prospects.length,
    open: data.prospects.filter(
      (item: { activatedAt: string | null }) => !item.activatedAt,
    ).length,
    active: data.prospects.filter(
      (item: { activatedAt: string | null }) => item.activatedAt,
    ).length,
    purchases: new Set(
      data.orders.map((item: { prospectId: string }) => item.prospectId),
    ).size,
    xp: data.rewards.reduce(
      (sum: number, item: { xp: number }) => sum + item.xp,
      0,
    ),
  };
  const stat = (label: string) =>
    page.locator(".stat-card").filter({ hasText: label }).locator("strong");
  await page.goto(`${base}/#dashboard`);
  await expect(stat("Potenciais clientes")).toHaveText(String(expected.total));
  await expect(stat("Oportunidades abertas")).toHaveText(String(expected.open));
  await expect(stat("Clientes conquistados")).toHaveText(
    String(expected.active),
  );
  await expect(stat("Primeiras compras")).toHaveText(
    String(expected.purchases),
  );
  await expect(stat("Taxa de conversão")).toHaveText(
    `${((expected.active / expected.total) * 100).toFixed(1).replace(".", ",")}%`,
  );
  await expect(stat("XP acumulado")).toHaveText(String(expected.xp));
  await page.goto(`${base}/#prospects/${p.id}`);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Padaria Jornada E2E", exact: true }),
  ).toBeVisible();
  data = await getData(page);
  expect(data.prospects).toHaveLength(16);
  expect(
    data.rewards.reduce((n: number, r: { xp: number }) => n + r.xp, 0),
  ).toBe(initialXP + 15);
  await page.goto(`${base}/#prospects`);
  await page
    .getByRole("textbox", { name: "Buscar estabelecimentos" })
    .fill("jornada");
  await expect(
    page.getByRole("button", { name: /Padaria Jornada E2E/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /Padaria Jornada E2E/ }).click();
  await page
    .getByRole("button", { name: "Excluir estabelecimento", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir estabelecimento", exact: true })
    .click();
  expect((await getData(page)).prospects).toHaveLength(15);
  await page.goto(`${base}/#settings`);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain("rota-plus-backup");
  const exported = await download.path();
  expect(exported).toBeTruthy();
  expect(JSON.parse(await readFile(exported!, "utf8")).prospects).toHaveLength(
    15,
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(page.getByRole("alert")).toContainText("Backup inválido");
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("button", { name: "Importar e substituir" }).click();
  expect((await getData(page)).prospects).toHaveLength(16);
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page
    .getByRole("button", { name: "Restaurar demonstração", exact: true })
    .click();
  expect((await getData(page)).prospects).toHaveLength(15);
  expect(errors).toEqual([]);
});
test("agenda permite editar e cancelar; contato e filtros funcionam", async ({
  page,
}) => {
  await page.goto(`${base}/#route`);
  await page
    .getByRole("button", { name: "Agendar visita", exact: true })
    .click();
  await page.getByLabel("Estabelecimento *").selectOption("demo-1");
  await page.getByLabel("Data e horário *").fill(future());
  await page.getByLabel("Objetivo da visita *").fill("Visita para edição E2E");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  const visit = page
    .locator(".visit-card")
    .filter({ hasText: "Visita para edição E2E" });
  await visit
    .getByRole("button", { name: "Editar visita Mercado Vila Nova" })
    .click();
  await page.getByLabel("Objetivo da visita *").fill("Objetivo editado E2E");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  const edited = page
    .locator(".visit-card")
    .filter({ hasText: "Objetivo editado E2E" });
  await edited
    .getByRole("button", { name: "Cancelar visita Mercado Vila Nova" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar visita", exact: true })
    .click();
  await expect(edited).toContainText("Cancelada");
  await page.goto(`${base}/#prospects/demo-1`);
  await page
    .getByRole("button", { name: "Registrar contato", exact: true })
    .click();
  await page
    .getByLabel("Descrição do contato *")
    .fill("Mensagem de apresentação E2E");
  await page
    .getByLabel("Resultado *", { exact: true })
    .fill("Retorno combinado");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByText("Mensagem de apresentação E2E", { exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/#prospects`);
  await page.getByLabel("Filtrar por tipo").selectOption("Padaria");
  const data = await getData(page);
  await expect(page.locator(".prospect-card")).toHaveCount(
    data.prospects.filter(
      (p: { businessType: string }) => p.businessType === "Padaria",
    ).length,
  );
  await page.getByLabel("Filtrar por tipo").selectOption("");
  await page.getByLabel("Filtrar por prioridade").selectOption("alta");
  await expect(page.locator(".prospect-card")).toHaveCount(
    data.prospects.filter((p: { priority: string }) => p.priority === "alta")
      .length,
  );
});
for (const width of [375, 430, 768, 1366])
  test(`layout funcional sem transbordamento em ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "dashboard",
      "prospects",
      "opportunities",
      "route",
      "performance",
      "settings",
      "prospects/demo-1",
    ]) {
      await page.goto(`${base}/#${route}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
    }
    await page.goto(`${base}/#dashboard`);
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "+ Novo potencial", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByLabel("Nome do estabelecimento *")
      .fill(`Teste mobile ${width}`);
    await page.getByRole("button", { name: "Cadastrar potencial" }).click();
    await expect(
      page.getByRole("heading", { name: `Teste mobile ${width}`, exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
test("recupera armazenamento corrompido sem travar", async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem("rota-plus:v1", "{bad json"));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Vamos conquistar novos caminhos." }),
  ).toBeVisible();
  await expect(page.locator(".storage-warning")).toContainText("inválidos");
  expect((await getData(page)).prospects).toHaveLength(15);
});

test("bloqueia duplicado, ativação incompleta e compra sem pedido no formulário", async ({
  page,
}) => {
  await page.goto(`${base}/#prospects`);
  await page
    .getByRole("button", { name: "Novo potencial", exact: true })
    .click();
  await page.getByLabel("Nome do estabelecimento *").fill("Mercado Vila Nova");
  await page.getByText("Localização", { exact: true }).click();
  await page.getByLabel("Bairro", { exact: true }).fill("Vila Nova");
  await page.getByLabel("Cidade", { exact: true }).fill("Campinas");
  await page.getByRole("button", { name: "Cadastrar potencial" }).click();
  await expect(page.getByRole("alert")).toContainText("duplicado");
  await page.getByRole("button", { name: "Revisar Mercado Vila Nova" }).click();
  await expect(
    page.getByRole("heading", { name: "Mercado Vila Nova", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Atualizar negociação", exact: true })
    .click();
  await page.getByLabel("Novo estágio").selectOption("purchased");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("alert")).toContainText("Registre uma compra");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.goto(`${base}/#prospects`);
  await page
    .getByRole("button", { name: "Novo potencial", exact: true })
    .click();
  await page.getByLabel("Nome do estabelecimento *").fill("Cliente Sem Dados");
  await page.getByRole("button", { name: "Cadastrar potencial" }).click();
  await page
    .getByRole("button", { name: "Concluir cadastro", exact: true })
    .click();
  await page.getByLabel("Conferi os dados comerciais").check();
  await page
    .getByRole("button", { name: "Ativar cliente", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Complete o cadastro");
});
