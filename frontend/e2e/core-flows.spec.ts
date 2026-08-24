import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

async function expectNoPageOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1,
  );
}

test.describe("critical route smoke tests", () => {
  test("public booking starts with a real catalog and usable layout", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Hizmetini seç/i }).first(),
    ).toBeVisible();
    await expect(page.getByText("Erkek Hizmetleri").first()).toBeVisible();
    await expect(page.getByText("Kadın Hizmetleri").first()).toBeVisible();
    await expect(page.getByText(/Anatomik Saç Kesimi/i).first()).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test("service cards keep a visible boundary on hover", async ({ page }) => {
    await page.goto("/");
    const serviceCard = page.locator(".service-option").first();
    await expect(serviceCard).toBeVisible();
    await serviceCard.hover();

    const hoverStyle = await serviceCard.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
      };
    });

    expect(hoverStyle.borderColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(hoverStyle.borderColor).not.toBe("transparent");
    expect(hoverStyle.boxShadow).toContain("inset");
  });

  test("customer account exposes a safe sign-in or account view", async ({
    page,
  }) => {
    await page.goto("/hesabim");

    await expect(
      page
        .getByRole("heading", {
          name: /Randevularım|Randevularına ulaş|Telefonunla devam et/i,
        })
        .first(),
    ).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test("admin stays isolated behind its own sign-in", async ({ page }) => {
    await page.goto("/admin");

    const passwordField = page.locator(".admin-secret-field");
    const eyeAlignment = await passwordField.evaluate((element) => {
      const button = element.querySelector("button");
      const icon = button?.querySelector("svg");
      if (!button || !icon) return null;
      const buttonRect = button.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      return {
        x: Math.abs(
          buttonRect.left +
            buttonRect.width / 2 -
            (iconRect.left + iconRect.width / 2),
        ),
        y: Math.abs(
          buttonRect.top +
            buttonRect.height / 2 -
            (iconRect.top + iconRect.height / 2),
        ),
      };
    });
    expect(eyeAlignment).not.toBeNull();
    expect(eyeAlignment?.x).toBeLessThan(1);
    expect(eyeAlignment?.y).toBeLessThan(1);

    await expect(
      page.getByRole("heading", { name: /Randevu merkezine giriş/i }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
  });
});

test.describe("responsive critical widths", () => {
  for (const width of [320, 627, 768, 1024]) {
    test(`public booking has no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width <= 390 ? 720 : 900 });
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /Hizmetini seç/i }).first(),
      ).toBeVisible();
      await expectNoPageOverflow(page);
    });
  }
});
