import { expect, test } from '@playwright/test';

test('pagina inicial carrega e resolve acesso', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/(entrar)?$/);
  await expect(page.locator('body')).toContainText(/Entrar na árvore|Verificando acesso|Minha Árvore/i);
});

test('login exibe formulario', async ({ page }) => {
  await page.goto('/entrar');

  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('login-submit')).toBeVisible();
});

test('rota protegida bloqueia usuario nao autenticado', async ({ page }) => {
  await page.goto('/minha-arvore');

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});

test('perfil de pessoa nao quebra sem sessao e redireciona para login', async ({ page }) => {
  const personId = process.env.E2E_PUBLIC_PERSON_ID || '00000000-0000-4000-8000-000000000000';
  await page.goto(`/pessoa/${personId}`);

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});

test('admin bloqueia usuario nao autenticado', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});
