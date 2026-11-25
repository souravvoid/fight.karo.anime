import { expect, test } from "@playwright/test";

test("menu flow reaches a live battle without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: /enter the arena/i })).toBeVisible();

  await page.getByRole("button", { name: /enter the arena/i }).click();
  await expect(page.getByRole("heading", { name: /select mode/i })).toBeVisible();

  await page.locator(".mode-card").first().click();
  await expect(page.getByRole("heading", { name: /choose your fighter/i })).toBeVisible();

  await page.locator(".roster-card").first().click();
  await expect(page.getByRole("heading", { name: /choose your rival/i })).toBeVisible();

  await page.locator(".roster-card").nth(1).click();
  await expect(page.getByRole("heading", { name: /set the stage/i })).toBeVisible();

  await page.getByRole("button", { name: "FIGHT!", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".timer")).toBeVisible();
  await expect(page.locator(".hp-fill")).toHaveCount(2);

  expect(errors).toEqual([]);
});

test("corrupted local saves fall back to defaults", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("anime-clash.settings.v1", '{"sfx":"yes","music":null}');
    localStorage.setItem("anime-clash.record.v1", "[1,2,3]");
    localStorage.setItem("anime-clash.last-match.v1", '{"playerId":"__proto__"}');
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: /enter the arena/i })).toBeVisible();
  await expect(page.locator(".record-value").first()).toHaveText("0");

  await page.reload();
  await expect(page.getByRole("button", { name: /enter the arena/i })).toBeVisible();
});
