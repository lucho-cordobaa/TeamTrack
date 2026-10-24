import { expect, test, type Page } from '@playwright/test';

const password = 'teamtrack-e2e-password';
const coachEmail = 'teamtrack-e2e-coach@teamtrack.test';
const athleteEmail = 'teamtrack-e2e-athlete@teamtrack.test';
const teamName = 'Equipo E2E TeamTrack';
const routineName = 'Rutina E2E de fuerza';

async function register(page: Page, name: string, email: string, role: 'Entrenador' | 'Atleta') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear Cuenta' }).click();
  await page.getByPlaceholder(/Luciano/).fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar Ahora' }).click();
  await expect(page.getByRole('complementary').getByText(name, { exact: true })).toBeVisible();
}

async function navigate(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
}

test('flujo integral: equipo, rutina, asistencia, sesión en vivo y progreso', async ({ page, browser, request }) => {
  const athleteContext = await browser.newContext();
  const athletePage = await athleteContext.newPage();
  const concurrentAthleteContext = await browser.newContext();
  const concurrentAthletePage = await concurrentAthleteContext.newPage();

  try {
    await register(page, 'Entrenador E2E', coachEmail, 'Entrenador');
    await register(athletePage, 'Atleta E2E', athleteEmail, 'Atleta');

    await navigate(page, 'Equipos & Atletas');
    await page.getByRole('button', { name: 'Nuevo Equipo' }).click();
    await page.getByPlaceholder('Ej: Jaguares Rugby Club').fill(teamName);
    await page.getByRole('button', { name: 'Crear Equipo' }).click();
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();

    await page.getByRole('button', { name: 'Asociar atleta' }).click();
    await page.locator('select').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Asociar al Equipo' }).click();
    await expect(page.getByText(athleteEmail)).toBeVisible();

    await navigate(page, 'Constructor Rutinas');
    await page.getByRole('button', { name: 'Crear Rutina' }).click();
    await page.getByPlaceholder(/Fuerza Máxima Piernas/).fill(routineName);
    const routineForm = page.locator('form');
    await routineForm.locator('select').nth(0).selectOption('GRUPAL');
    await routineForm.locator('select').nth(1).selectOption({ index: 1 });
    await page.locator('#exercisePicker').selectOption({ index: 1 });
    await expect(routineForm.locator('input[type="number"]')).toHaveCount(2);
    await routineForm.locator('input[type="number"]').nth(0).fill('1');
    await routineForm.locator('input[type="number"]').nth(1).fill('5');
    await page.getByRole('button', { name: 'Crear Rutina Completa' }).click();
    await expect(page.getByRole('heading', { name: routineName, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Asignar', exact: true }).click();
    await page.locator('select').last().selectOption({ index: 1 });
    await page.getByRole('button', { name: /Confirmar Asignaci/ }).click();
    await expect(page.getByRole('heading', { name: routineName, exact: true })).toBeVisible();

    await register(concurrentAthletePage, 'Atleta Concurrencia E2E', 'teamtrack-e2e-concurrency@teamtrack.test', 'Atleta');
    const coachToken = await page.evaluate(() => localStorage.getItem('teamtrack_token'));
    const coachHeaders = { Authorization: `Bearer ${coachToken}` };
    const teamResponse = await request.get('http://127.0.0.1:3000/api/teams', { headers: coachHeaders });
    const [team] = await teamResponse.json();
    const routineResponse = await request.get('http://127.0.0.1:3000/api/routines', { headers: coachHeaders });
    const routines = await routineResponse.json();
    const coachRoutine = routines.find((routine: { nombre: string }) => routine.nombre === routineName);
    const routineId = coachRoutine.id;
    const exercise = coachRoutine.ejercicios[0];
    const athletesResponse = await request.get('http://127.0.0.1:3000/api/users/athletes', { headers: coachHeaders });
    const athletes = await athletesResponse.json();
    const concurrentAthlete = athletes.find((athlete: { email: string }) => athlete.email === 'teamtrack-e2e-concurrency@teamtrack.test');
    expect((await request.post(`http://127.0.0.1:3000/api/teams/${team.id}/athletes`, {
      headers: coachHeaders,
      data: { atleta_id: concurrentAthlete.id },
    })).ok()).toBeTruthy();
    expect((await request.post(`http://127.0.0.1:3000/api/routines/${routineId}/assign`, {
      headers: coachHeaders,
      data: { atleta_ids: [concurrentAthlete.id] },
    })).ok()).toBeTruthy();

    const concurrentAthleteToken = await concurrentAthletePage.evaluate(() => localStorage.getItem('teamtrack_token'));
    const concurrentAthleteHeaders = { Authorization: `Bearer ${concurrentAthleteToken}` };
    const [firstConcurrentStart, secondConcurrentStart] = await Promise.all([
      request.post('http://127.0.0.1:3000/api/sessions/start', {
        headers: concurrentAthleteHeaders,
        data: { rutina_id: routineId },
      }),
      request.post('http://127.0.0.1:3000/api/sessions/start', {
        headers: concurrentAthleteHeaders,
        data: { rutina_id: routineId },
      }),
    ]);
    expect([firstConcurrentStart.status(), secondConcurrentStart.status()].filter((status) => status === 201)).toHaveLength(1);
    expect([firstConcurrentStart.status(), secondConcurrentStart.status()].filter((status) => status === 409)).toHaveLength(1);
    await navigate(page, 'Control Asistencia');
    await page.getByRole('button', { name: 'Registrar Asistencia' }).click();
    await page.locator('select').last().selectOption({ label: 'Atleta E2E (Equipo E2E TeamTrack)' });
    await page.locator('input[type="date"]').fill(new Date().toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Confirmar Asistencia' }).click();
    await expect(page.getByText(/Atleta E2E/)).toBeVisible();

    await page.getByRole('button', { name: 'Registrar Asistencia' }).click();
    await page.locator('select').last().selectOption({ label: 'Atleta E2E (Equipo E2E TeamTrack)' });
    await page.locator('input[type="date"]').fill(new Date().toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Confirmar Asistencia' }).click();
    await expect(page.getByText(/Ya existe un registro de asistencia/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await navigate(athletePage, 'Mis Rutinas');
    await expect(athletePage.getByRole('heading', { name: routineName, exact: true })).toBeVisible();
    await athletePage.getByRole('button', { name: 'Iniciar Entrenamiento con esta Rutina' }).click();
    await athletePage.getByRole('button', { name: /Comenzar a Entrenar Ahora/ }).click();
    await expect(athletePage.getByText(/0 de 1 series/)).toBeVisible();

    await athletePage.locator('input[type="number"]').nth(0).fill('40');
    await athletePage.locator('input[type="number"]').nth(1).fill('5');
    await athletePage.getByRole('button', { name: 'Completar' }).click();
    await expect(athletePage.getByText(/1 de 1 series/)).toBeVisible();

    const athleteToken = await athletePage.evaluate(() => localStorage.getItem('teamtrack_token'));
    const athleteHeaders = { Authorization: `Bearer ${athleteToken}` };
    const [firstStart, simultaneousStart] = await Promise.all([
      request.post('http://127.0.0.1:3000/api/sessions/start', {
        headers: athleteHeaders,
        data: { rutina_id: routineId },
      }),
      request.post('http://127.0.0.1:3000/api/sessions/start', {
        headers: athleteHeaders,
        data: { rutina_id: routineId },
      }),
    ]);
    expect([firstStart.status(), simultaneousStart.status()]).toEqual([409, 409]);

    expect((await request.post('http://127.0.0.1:3000/api/teams', {
      headers: athleteHeaders,
      data: { nombre: 'Equipo no autorizado' },
    })).status()).toBe(403);
    expect((await request.post('http://127.0.0.1:3000/api/routines', {
      headers: athleteHeaders,
      data: { nombre: 'Rutina no autorizada', tipo: 'INDIVIDUAL', ejercicios: [] },
    })).status()).toBe(403);
    expect((await request.patch(`http://127.0.0.1:3000/api/teams/${team.id}`, {
      headers: athleteHeaders,
      data: { nombre: 'Equipo alterado por atleta' },
    })).status()).toBe(403);
    expect((await request.delete(`http://127.0.0.1:3000/api/teams/${team.id}`, {
      headers: athleteHeaders,
    })).status()).toBe(403);
    expect((await request.patch(`http://127.0.0.1:3000/api/routines/${routineId}`, {
      headers: athleteHeaders,
      data: { nombre: 'Rutina alterada por atleta', tipo: 'GRUPAL', equipo_origen_id: team.id, ejercicios: [exercise] },
    })).status()).toBe(403);
    expect((await request.delete(`http://127.0.0.1:3000/api/routines/${routineId}`, {
      headers: athleteHeaders,
    })).status()).toBe(403);

    await navigate(page, 'Dashboard');
    await expect(page.getByText('Monitoreo en Tiempo Real (Firestore)')).toBeVisible();
    await expect(page.getByText('Atleta E2E')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText(/100% \(1\/1 series\)/)).toBeVisible();

    await athletePage.getByRole('button', { name: 'Finalizar' }).click();
    await athletePage.getByRole('button', { name: 'Confirmar y Guardar' }).click();
    await expect(athletePage.getByText(/Entrenamiento Completado/)).toBeVisible();

    await navigate(athletePage, 'Mi Asistencia');
    await expect(athletePage.getByText('1', { exact: true })).toBeVisible();
    await navigate(athletePage, 'Mi Progreso');
    await expect(athletePage.getByText('Total Series Realizadas')).toBeVisible();
    await expect(athletePage.getByText('Récord Personal (PR)')).toBeVisible();
    await expect(athletePage.locator('main').getByText('1', { exact: true }).first()).toBeVisible();

    const renamedTeam = `${teamName} editado`;
    const teamUpdate = await request.patch(`http://127.0.0.1:3000/api/teams/${team.id}`, {
      headers: coachHeaders,
      data: { nombre: renamedTeam },
    });
    expect(teamUpdate.ok()).toBeTruthy();
    expect((await teamUpdate.json()).nombre).toBe(renamedTeam);
    const renamedRoutine = `${routineName} editada`;
    const routineUpdate = await request.patch(`http://127.0.0.1:3000/api/routines/${routineId}`, {
      headers: coachHeaders,
      data: {
        nombre: renamedRoutine,
        tipo: 'GRUPAL',
        equipo_origen_id: team.id,
        ejercicios: [{ ejercicio_id: exercise.ejercicio_id, series: 1, repeticiones: 5, orden: 1 }],
      },
    });
    expect(routineUpdate.ok()).toBeTruthy();
    expect((await routineUpdate.json()).nombre).toBe(renamedRoutine);

    await navigate(page, 'Constructor Rutinas');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTitle('Eliminar rutina').click();
    await expect(page.getByText('No hay rutinas disponibles')).toBeVisible();

    await navigate(page, 'Equipos & Atletas');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTitle('Eliminar equipo').click();
    await expect(page.getByText('No hay equipos registrados')).toBeVisible();
  } finally {
    await athleteContext.close();
    await concurrentAthleteContext.close();
  }
});

test('rechaza credenciales incorrectas en el inicio de sesión', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('luciano@teamtrack.com');
  await page.locator('input[type="password"]').fill('clave-incorrecta');
  await page.getByRole('button', { name: 'Ingresar a TeamTrack' }).click();
  await expect(page.getByText(/Credenciales inv/)).toBeVisible();
});
