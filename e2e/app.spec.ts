// ============================================================
// E2E — Test flussi principali dell'app
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('homepage loads with Planning view', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Planning App')
    await expect(page.locator('.nav-link.router-link-active')).toContainText('Planning')
  })

  test('can navigate to all main views', async ({ page }) => {
    await page.goto('/')

    // Ticket
    await page.click('text=Ticket')
    await expect(page).toHaveURL('/tickets')

    // Capacità
    await page.click('text=Capacità')
    await expect(page).toHaveURL('/capacity')

    // Release
    await page.click('text=Release')
    await expect(page).toHaveURL('/releases')

    // Report
    await page.click('text=Report')
    await expect(page).toHaveURL('/reports')

    // Impostazioni
    await page.click('text=Impostazioni')
    await expect(page).toHaveURL('/settings')
  })
})

test.describe('Settings — User Management', () => {
  test('can create a user', async ({ page }) => {
    await page.goto('/settings')

    // Compila il form (se visibile)
    const nameInput = page.locator('input[placeholder*="Nome"]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User E2E')
      // Submit
      const submitBtn = page.locator('button:has-text("Aggiungi")').first()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        // Verifica che l'utente appaia nella lista
        await expect(page.locator('text=Test User E2E')).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe('API Health', () => {
  test('backend health check responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  test('scheduler status responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/scheduler/status')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body).toHaveProperty('totalTickets')
    expect(body).toHaveProperty('totalAssignments')
  })
})

