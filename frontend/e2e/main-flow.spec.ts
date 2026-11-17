import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo Principal do Usuário (Issue #90)', () => {
  test('Fluxo completo: cadastro -> compra -> check-in', async ({ page }) => {
    const mockUser = {
      id: 1,
      name: 'Comprador E2E',
      email: 'buyer-e2e@example.com',
      role: 'BUYER',
    };

    const mockStaff = {
      id: 2,
      name: 'Staff Portaria',
      email: 'staff@example.com',
      role: 'STAFF',
    };

    let currentUser: typeof mockUser | typeof mockStaff = mockUser;

    await page.route('http://localhost:3333/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentUser),
      });
    });

    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const futureEndDate = new Date(Date.now() + 8 * 86400000).toISOString();

    const mockEvent = {
      id: 1,
      title: 'Festival de Inovação 2026',
      description: 'Maior festival de tecnologia e inovação.',
      location: 'São Paulo - SP',
      capacity: 500,
      startsAt: futureDate,
      endsAt: futureEndDate,
      status: 'PUBLISHED',
      lots: [
        {
          id: 10,
          eventId: 1,
          name: '1º Lote Geral',
          price: 120,
          quantity: 50,
          active: true,
          salesStartAt: new Date(Date.now() - 86400000).toISOString(),
          salesEndAt: futureDate,
        },
      ],
    };

    // Intercepta apenas chamadas ao backend na porta 3333
    await page.route('http://localhost:3333/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-buyer-jwt-token',
          user: mockUser,
        }),
      });
    });

    await page.route('http://localhost:3333/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: mockUser,
        }),
      });
    });

    await page.route('http://localhost:3333/events/1/lots', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEvent.lots),
      });
    });

    await page.route('http://localhost:3333/events/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEvent),
      });
    });

    await page.route(/http:\/\/localhost:3333\/events(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [mockEvent],
          total: 1,
          page: 1,
          pageSize: 6,
        }),
      });
    });

    await page.route('http://localhost:3333/orders/501/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 501,
          userId: 1,
          lotId: 10,
          quantity: 1,
          total: 120,
          status: 'PAID',
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          tickets: [
            {
              id: 99,
              code: 'EB-E2E-9988',
              status: 'VALID',
            },
          ],
        }),
      });
    });

    await page.route('http://localhost:3333/orders', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 501,
          userId: 1,
          lotId: 10,
          quantity: 1,
          total: 120,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        }),
      });
    });

    await page.route(/http:\/\/localhost:3333\/tickets\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 99,
              code: 'EB-E2E-9988',
              status: 'VALID',
              eventId: 1,
              event: {
                id: 1,
                title: 'Festival de Inovação 2026',
                startsAt: futureDate,
                location: 'São Paulo - SP',
              },
              lot: {
                id: 10,
                name: '1º Lote Geral',
                price: 120,
              },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        }),
      });
    });

    await page.route(/http:\/\/localhost:3333\/orders\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          total: 0,
          page: 1,
          pageSize: 50,
        }),
      });
    });

    await page.route('http://localhost:3333/tickets/EB-E2E-9988/checkin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Check-in realizado com sucesso.',
          ticket: {
            code: 'EB-E2E-9988',
            status: 'USED',
          },
          checkin: {
            checkedInAt: new Date().toISOString(),
            staff: {
              id: 2,
              name: 'Staff Portaria',
            },
          },
        }),
      });
    });

    // 1. Cadastro de Usuário
    await page.goto('/register');
    await page.fill('#name', 'Comprador E2E');
    await page.fill('#email', 'buyer-e2e@example.com');
    await page.fill('#password', 'secret123');
    await page.fill('#confirmPassword', 'secret123');
    await page.click('button[type="submit"]');

    // Aguarda transição para /events
    await expect(page).toHaveURL(/\/events/);
    await expect(page.locator('text=Festival de Inovação 2026').first()).toBeVisible();

    // 2. Navegação para detalhes do evento
    await page.click('text=Festival de Inovação 2026');
    await expect(page).toHaveURL(/\/events\/1/);

    // 3. Reserva do lote
    const reserveButton = page.locator('button:has-text("Reservar")');
    await expect(reserveButton).toBeVisible();
    await reserveButton.click();

    // 4. Seção de simulação de pagamento & checkout
    await expect(page.locator('text=Reserva #501 confirmada')).toBeVisible();
    const payButton = page.locator('button:has-text("Pagar Ingressos")');
    await expect(payButton).toBeVisible();
    await payButton.click();

    // Valida pagamento aprovado
    await expect(page.locator('text=Pagamento Aprovado com Sucesso!')).toBeVisible();

    // 5. Visualizar ingressos
    await page.click('text=Ver Meus Ingressos');
    await expect(page).toHaveURL(/\/my-tickets/);
    await expect(page.locator('text=EB-E2E-9988')).toBeVisible();
    await expect(page.locator('text=Válido')).toBeVisible();

    // 6. Check-in como Staff
    currentUser = mockStaff;
    await page.evaluate((staff) => {
      localStorage.setItem('@EventBook:token', 'mock-staff-token');
      localStorage.setItem('@EventBook:user', JSON.stringify(staff));
    }, mockStaff);

    await page.goto('/checkin');
    await expect(page.locator('h1:has-text("Check-in de Ingressos")')).toBeVisible();

    // Preenche o código do ingresso emitido
    await page.fill('input[placeholder="Ex: ABC-123-XYZ"]', 'EB-E2E-9988');
    await page.click('button:has-text("Realizar Check-in")');

    // Confirma check-in realizado com sucesso
    await expect(page.locator('text=Check-in realizado com sucesso')).toBeVisible();
    await expect(page.locator('text=EB-E2E-9988')).toBeVisible();
  });
});
