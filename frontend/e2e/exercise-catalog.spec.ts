import { expect, test } from '@playwright/test';

async function openExerciseCatalog(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('luciano@teamtrack.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Ingresar a TeamTrack' }).click();

  const catalogLink = page.getByRole('button', { name: 'Catálogo Ejercicios' });
  await expect(catalogLink).toBeVisible();
  await catalogLink.click();
  await expect(page.getByText(/Mostrando/)).toBeVisible();
}

test.describe('catálogo de ejercicios en navegador', () => {
  test.beforeEach(async ({ page }) => {
    await openExerciseCatalog(page);
  });

  test('muestra una página acotada y permite avanzar y volver', async ({ page }) => {
    await expect(page.locator('main h3')).toHaveCount(12);
    await expect(page.getByText(/Mostrando 1.*12 de 876 ejercicios/)).toBeVisible();
    await expect(page.getByText('Página 1 de 73')).toBeVisible();

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText('Página 2 de 73')).toBeVisible();
    await expect(page.getByText(/Mostrando 13.*24 de 876 ejercicios/)).toBeVisible();
    await expect(page.locator('main h3')).toHaveCount(12);

    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.getByText('Página 1 de 73')).toBeVisible();
  });

  test('permite cambiar la cantidad mostrada por página', async ({ page }) => {
    await page.getByLabel('Cantidad de ejercicios por página').selectOption('24');

    await expect(page.locator('main h3')).toHaveCount(24);
    await expect(page.getByText(/Mostrando 1.*24 de 876 ejercicios/)).toBeVisible();
    await expect(page.getByText('Página 1 de 37')).toBeVisible();
  });

  test('busca por nombre y filtra por grupo muscular', async ({ page }) => {
    const search = page.getByPlaceholder(/Buscar ejercicio por nombre/);
    await search.fill('press de banca');

    const summary = page.getByText(/Mostrando/);
    await expect(summary).toContainText(/de (?!876\b)\d+ ejercicios/);
    await expect(page.locator('main h3').first()).toContainText(/press de banca/i);

    await search.fill('');
    await expect(page.getByText(/Mostrando 1.*12 de 876 ejercicios/)).toBeVisible();
    await page.locator('main select').first().selectOption({ index: 1 });
    await expect(summary).toContainText(/de (?!876\b)\d+ ejercicios/);
  });
});
