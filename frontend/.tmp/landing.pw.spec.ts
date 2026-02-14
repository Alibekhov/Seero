import { test, expect } from "@playwright/test";

test("landing navbar/buttons + auth -> dashboard", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });

  // Hero should be visible.
  await expect(page.locator("#hero-title")).toBeVisible();

  // Navbar scroll buttons should not navigate away (no hash navigation in React version).
  await page.click("#nav-about");
  await expect(page.locator("#about")).toBeVisible();

  // Open auth modal.
  await page.click("#get-started-btn");
  const modal = page.locator("#auth-modal");
  await expect(modal).toBeVisible();

  // Go to signup tab (already signup in our button, but keep deterministic).
  await page.click("#signupTab");

  const ts = Date.now();
  await page.fill("#signup-nick", "Test User");
  await page.fill("#signup-email", `pw_${ts}@example.com`);
  await page.fill("#signup-password", "Passw0rd!23");
  await page.fill("#signup-password2", "Passw0rd!23");
  await page.click("form#signupForm button[type=submit]");

  // Should land on dashboard.
  await expect(page).toHaveURL(/\\/dashboard$/);
  await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 15_000 });
});

