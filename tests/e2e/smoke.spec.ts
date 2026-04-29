import { expect, test } from "@playwright/test";

test("homepage renders the BWF Virtual Seats heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "BWF Virtual Seats" }),
  ).toBeVisible();
});
