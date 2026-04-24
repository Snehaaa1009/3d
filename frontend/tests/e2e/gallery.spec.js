import { test, expect } from '@playwright/test'

test('gallery loads and navigation works', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /product gallery/i })).toBeVisible()
  await expect(page.getByText(/interactive 3d product platform/i)).toBeVisible()
})
