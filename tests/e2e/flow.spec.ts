import { devices, expect, test } from "@playwright/test";

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

test("quitting a match and starting another does not crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  async function startTraining(): Promise<void> {
    await page.getByRole("button", { name: /enter the arena/i }).click();
    await page.locator(".mode-card").nth(1).click();
    await page.locator(".roster-card").nth(4).click();
    await page.locator(".roster-card").nth(1).click();
    await page.getByRole("button", { name: "START TRAINING", exact: true }).click();
    await expect(page.locator("canvas")).toBeVisible();
  }

  await page.goto("/");
  await startTraining();

  await page.locator(".stage-pause").click();
  await page.getByRole("button", { name: /quit to menu/i }).click();
  await expect(page.getByRole("button", { name: /enter the arena/i })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  // A second battle must mount a fresh Phaser game, not throw on a dead scene.
  await startTraining();
  await expect(page.locator("canvas")).toBeVisible();
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

// The device preset carries defaultBrowserType, which cannot be applied to a
// single describe group; keep the viewport, touch and mobile flags only.
const phoneLandscape = { ...devices["iPhone 13 landscape"] };
delete (phoneLandscape as { defaultBrowserType?: string }).defaultBrowserType;

test.describe("touch layout", () => {
  test.use(phoneLandscape);

  test("touch controls fit the arena without overlapping", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /enter the arena/i }).click();
    await page.locator(".mode-card").first().click();
    await page.locator(".roster-card").first().click();
    await page.locator(".roster-card").nth(1).click();
    await page.getByRole("button", { name: "FIGHT!", exact: true }).click();
    await expect(page.locator("canvas")).toBeVisible();

    const frame = await page.locator(".battle-frame").boundingBox();
    expect(frame).not.toBeNull();
    const viewport = page.viewportSize()!;

    // The arena fills the screen height: no strip to reserve space for.
    expect(Math.abs(frame!.height - viewport.height)).toBeLessThanOrEqual(2);

    const boxes = await page.locator(".touch-btn").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          label: node.getAttribute("aria-label") ?? "?",
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          w: rect.width,
          h: rect.height,
        };
      }),
    );

    expect(boxes).toHaveLength(9);

    for (const box of boxes) {
      // Every control stays inside the arena...
      expect(box.left).toBeGreaterThanOrEqual(frame!.x - 1);
      expect(box.top).toBeGreaterThanOrEqual(frame!.y - 1);
      expect(box.right).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
      expect(box.bottom).toBeLessThanOrEqual(frame!.y + frame!.height + 1);
      // ...and is still a usable tap target.
      expect(Math.min(box.w, box.h)).toBeGreaterThanOrEqual(43);
    }

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        expect(overlaps, `${a.label} overlaps ${b.label}`).toBe(false);
      }
    }
  });
});
