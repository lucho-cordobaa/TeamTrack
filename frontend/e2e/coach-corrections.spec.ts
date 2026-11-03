import { expect, test, type Page } from '@playwright/test';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function register(page: Page, name: string, email: string, role: 'Atleta' | 'Entrenador') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear Cuenta' }).click();
  await page.getByPlaceholder(/Luciano/).fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('secreto123');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar Ahora' }).click();
  await expect(page.getByRole('complementary').getByText(name, { exact: true })).toBeVisible();
}

const navigate = (page: Page, label: string) =>
  page.getByRole('button', { name: label, exact: true }).click();

async function addExerciseToRoutine(page: Page, exerciseName: string) {
  await page.locator('form').getByPlaceholder(/Buscar/).fill(exerciseName);
  await page.locator('form').getByRole('button', { name: new RegExp(exerciseName) }).click();
}

async function reloadAthleteRoutines(page: Page) {
  await navigate(page, 'Mi Asistencia');
  await navigate(page, 'Mis Rutinas');
}

test('correcciones del entrenador: imagen, edición, asignación y asistencia sin equipo', async ({ page, browser }) => {
  const suffix = Date.now();
  const exerciseName = `Ejercicio E2E ${suffix}`;
  const routineName = `Rutina Individual E2E ${suffix}`;
  const teamName = `Equipo Correcciones ${suffix}`;
  const athleteEmail = `teamtrack-e2e-solo-${suffix}@teamtrack.test`;
  const coachEmail = `teamtrack-e2e-coach2-${suffix}@teamtrack.test`;

  const athleteContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' });
  const athletePage = await athleteContext.newPage();

  try {
    await register(athletePage, 'Atleta Sin Equipo E2E', athleteEmail, 'Atleta');
    await register(page, 'Entrenador Correcciones E2E', coachEmail, 'Entrenador');

    // Crear un ejercicio subiendo una imagen desde el explorador de archivos
    await navigate(page, 'Catálogo Ejercicios');
    await page.getByRole('button', { name: 'Agregar Ejercicio' }).click();
    await page.getByPlaceholder(/Press Francés/).fill(exerciseName);
    await page.getByPlaceholder(/Tríceps, Espalda/).fill('Pruebas E2E');
    await page.getByPlaceholder(/Describe postura/).fill('Descripción original');

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Seleccionar imagen/ }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'referencia.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(page.getByAltText('Vista previa')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar Ejercicio' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Ejercicio en Catálogo' })).toBeHidden();

    await page.getByPlaceholder(/Buscar ejercicio/).fill(exerciseName);
    const card = page.getByRole('heading', { name: exerciseName }).locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 1);

    // Editar el ejercicio conserva la imagen subida
    await card.getByTitle('Editar ejercicio').click();
    await page.getByPlaceholder(/Describe postura/).fill('Descripción editada');
    await page.getByRole('button', { name: 'Guardar Ejercicio' }).click();
    await expect(card.getByText('Descripción editada')).toBeVisible();
    await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 1);

    // Crear una rutina individual y asignarla directamente a un atleta sin equipo
    await navigate(page, 'Constructor Rutinas');
    await page.getByRole('button', { name: 'Crear Rutina' }).click();
    await page.getByPlaceholder(/Fuerza Máxima Piernas/).fill(routineName);
    await addExerciseToRoutine(page, exerciseName);

    // Una rutina no se puede crear sin destinatarios
    await page.getByRole('button', { name: 'Crear Rutina Completa' }).click();
    await expect(page.getByText('Debes asignar la rutina al menos a un atleta.')).toBeVisible();

    await page.getByRole('button', { name: /Atleta Sin Equipo E2E/ }).click();
    await page.getByRole('button', { name: 'Crear Rutina Completa' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Rutina creada y asignada');
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await navigate(athletePage, 'Mis Rutinas');
    await expect(athletePage.getByRole('heading', { name: routineName, exact: true })).toBeVisible();

    // Un ejercicio usado en una rutina no se puede eliminar
    await navigate(page, 'Catálogo Ejercicios');
    await page.getByPlaceholder(/Buscar ejercicio/).fill(exerciseName);
    await card.getByTitle('Eliminar ejercicio').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('ya se usa en rutinas');
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // Tras asignar a un grupo se puede seguir asignando a un atleta individual
    await navigate(page, 'Equipos & Atletas');
    await page.getByRole('button', { name: 'Nuevo Equipo' }).click();
    await page.getByPlaceholder('Ej: Jaguares Rugby Club').fill(teamName);
    await page.getByRole('button', { name: 'Crear Equipo' }).click();
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();

    await navigate(page, 'Constructor Rutinas');
    await page.getByRole('button', { name: 'Asignar', exact: true }).click();
    await page.getByRole('button', { name: 'Atletas Específicos' }).click();
    await expect(page.getByRole('button', { name: /Atleta Sin Equipo E2E.*Ya asignada/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // La asistencia de un atleta sin equipo queda visible en la semana
    await navigate(page, 'Control Asistencia');
    await page.getByRole('button', { name: 'Registrar Asistencia' }).click();
    await page.locator('select').last().selectOption({ label: 'Atleta Sin Equipo E2E (Sin equipo)' });
    await page.getByRole('button', { name: 'Confirmar Asistencia' }).click();
    await expect(page.getByRole('heading', { name: /Asistencia Semanal — Sin equipo/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Atleta Sin Equipo E2E/ }).getByText('1 día')).toBeVisible();

    await page.getByRole('button', { name: 'Semana anterior' }).click();
    await expect(page.getByRole('row', { name: /Atleta Sin Equipo E2E/ }).getByText('0 días')).toBeVisible();

    await navigate(athletePage, 'Mi Asistencia');
    await expect(athletePage.getByText('Esta semana entrenaste 1 día.')).toBeVisible();

    // Una rutina grupal alcanza a quien entra al equipo y deja de verse al salir
    const groupRoutineName = `Rutina Grupal E2E ${suffix}`;
    await navigate(page, 'Constructor Rutinas');
    await page.getByRole('button', { name: 'Crear Rutina' }).click();
    await page.getByPlaceholder(/Fuerza Máxima Piernas/).fill(groupRoutineName);
    const routineForm = page.locator('form');
    await routineForm.locator('select').nth(0).selectOption('GRUPAL');
    await routineForm.locator('select').nth(1).selectOption({ label: teamName });
    await addExerciseToRoutine(page, exerciseName);
    await page.getByRole('button', { name: 'Crear Rutina Completa' }).click();
    await expect(page.getByRole('alertdialog')).toContainText(teamName);
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await reloadAthleteRoutines(athletePage);
    await expect(athletePage.getByRole('heading', { name: routineName, exact: true })).toBeVisible();
    await expect(athletePage.getByRole('heading', { name: groupRoutineName, exact: true })).toBeHidden();

    await navigate(page, 'Equipos & Atletas');
    await page.getByRole('button', { name: 'Asociar atleta' }).click();
    await page.locator('form select').selectOption({ label: `Atleta Sin Equipo E2E (${athleteEmail})` });
    await page.getByRole('button', { name: 'Asociar al Equipo' }).click();
    await expect(page.getByText(athleteEmail)).toBeVisible();

    await reloadAthleteRoutines(athletePage);
    await expect(athletePage.getByRole('heading', { name: groupRoutineName, exact: true })).toBeVisible();

    await page.getByTitle('Quitar del equipo').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByText(athleteEmail)).toBeHidden();

    await reloadAthleteRoutines(athletePage);
    await expect(athletePage.getByRole('heading', { name: groupRoutineName, exact: true })).toBeHidden();
    await expect(athletePage.getByRole('heading', { name: routineName, exact: true })).toBeVisible();

    // Después de crearla se puede cambiar a quién está asignada
    await navigate(page, 'Constructor Rutinas');
    const routineCard = page.getByRole('heading', { name: routineName, exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-3xl")]');
    await routineCard.getByRole('button', { name: 'Asignar', exact: true }).click();
    await page.getByRole('button', { name: 'Quitar Atleta Sin Equipo E2E' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByText('Esta rutina no está asignada a nadie.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await reloadAthleteRoutines(athletePage);
    await expect(athletePage.getByText('Aún no tienes rutinas asignadas')).toBeVisible();

    await routineCard.getByRole('button', { name: 'Asignar', exact: true }).click();
    await page.locator('form select').selectOption({ label: `${teamName} (0 atletas)` });
    await page.getByRole('button', { name: /Confirmar Asignaci/ }).click();
    await expect(page.getByRole('alertdialog')).toContainText(teamName);
    await page.getByRole('button', { name: 'Aceptar' }).click();
    await expect(routineCard.getByText(`(${teamName})`)).toBeVisible();

    // Eliminar pide confirmación con un cartel propio y se puede cancelar
    await navigate(page, 'Equipos & Atletas');
    await page.getByTitle('Eliminar equipo').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();
    await page.getByTitle('Eliminar equipo').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('heading', { name: teamName })).toBeHidden();

    // Sin rutinas que lo usen, el ejercicio ya se puede eliminar
    await navigate(page, 'Constructor Rutinas');
    for (const name of [routineName, groupRoutineName]) {
      await page.getByRole('heading', { name, exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-3xl")]').getByTitle('Eliminar rutina').click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByRole('heading', { name, exact: true })).toBeHidden();
    }
    await expect(page.getByText('No hay rutinas disponibles')).toBeVisible();

    await navigate(page, 'Catálogo Ejercicios');
    await page.getByPlaceholder(/Buscar ejercicio/).fill(exerciseName);
    await card.getByTitle('Eliminar ejercicio').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('No se encontraron ejercicios')).toBeVisible();

    // Un ejercicio del dataset eliminado vuelve a aparecer en el próximo ingreso
    await page.getByPlaceholder(/Buscar ejercicio/).fill('');
    const firstCard = page.locator('div.cursor-pointer').first();
    const datasetExercise = (await firstCard.locator('h3').textContent())!;
    await firstCard.getByTitle('Eliminar ejercicio').click();
    await expect(page.getByRole('alertdialog')).toContainText('volverá a estar disponible');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
    await page.getByPlaceholder(/Buscar ejercicio/).fill(datasetExercise);
    await expect(page.getByText('No se encontraron ejercicios')).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.locator('input[type="email"]').fill(coachEmail);
    await page.locator('input[type="password"]').fill('secreto123');
    await page.getByRole('button', { name: 'Ingresar a TeamTrack' }).click();
    await navigate(page, 'Catálogo Ejercicios');
    await page.getByPlaceholder(/Buscar ejercicio/).fill(datasetExercise);
    await expect(page.getByRole('heading', { name: datasetExercise, exact: true })).toBeVisible();
  } finally {
    await athleteContext.close();
  }
});
