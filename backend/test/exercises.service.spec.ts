import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExercisesService } from '../src/modules/exercises/exercises.service';

test('devuelve solamente la página solicitada y conserva búsqueda y filtro', async () => {
  let countWhere: any;
  let findManyArgs: any;
  const prisma = {
    ejercicio: {
      count: async ({ where }: any) => {
        countWhere = where;
        return 25;
      },
      findMany: async (args: any) => {
        findManyArgs = args;
        return [{ id: 13, nombre: 'Press de banca' }];
      },
    },
  };

  const result = await new ExercisesService(prisma as any).findAll('press', 'pecho', 2, 12);

  assert.deepEqual(countWhere, {
    nombre: { contains: 'press' },
    grupo_muscular: 'pecho',
  });
  assert.equal(findManyArgs.skip, 12);
  assert.equal(findManyArgs.take, 12);
  assert.deepEqual(result, {
    items: [{ id: 13, nombre: 'Press de banca' }],
    page: 2,
    pageSize: 12,
    total: 25,
    totalPages: 3,
  });
});

test('limita el tamaño de página y conserva la respuesta completa para consumidores internos', async () => {
  let findManyArgs: any;
  const prisma = {
    ejercicio: {
      count: async () => 90,
      findMany: async (args: any) => {
        findManyArgs = args;
        return [{ id: 1 }];
      },
    },
  };
  const service = new ExercisesService(prisma as any);

  const paginated = await service.findAll(undefined, undefined, 1, 500);
  assert.equal(findManyArgs.take, 48);
  assert.equal((paginated as any).pageSize, 48);

  const unpaginated = await service.findAll();
  assert.deepEqual(unpaginated, [{ id: 1 }]);
  assert.equal(findManyArgs.skip, undefined);
  assert.equal(findManyArgs.take, undefined);
});

function makeRemovalService(usage: { rutinas: number; series: number }, exists = true) {
  const deleted: number[] = [];
  const prisma = {
    ejercicio: {
      findUnique: async ({ where }: any) => (exists ? { id: where.id } : null),
      delete: async ({ where }: any) => deleted.push(where.id),
    },
    rutinaEjercicio: { count: async () => usage.rutinas },
    serieRealizada: { count: async () => usage.series },
  };
  return { service: new ExercisesService(prisma as any), deleted };
}

test('elimina un ejercicio que no se usa en rutinas ni historiales', async () => {
  const { service, deleted } = makeRemovalService({ rutinas: 0, series: 0 });

  await service.remove(3);

  assert.deepEqual(deleted, [3]);
});

test('no elimina un ejercicio en uso para conservar rutinas e historiales', async () => {
  for (const usage of [{ rutinas: 1, series: 0 }, { rutinas: 0, series: 4 }]) {
    const { service, deleted } = makeRemovalService(usage);

    await assert.rejects(service.remove(3), ConflictException);
    assert.deepEqual(deleted, []);
  }
});

test('rechaza eliminar un ejercicio inexistente', async () => {
  const { service } = makeRemovalService({ rutinas: 0, series: 0 }, false);

  await assert.rejects(service.remove(3), NotFoundException);
});

function makeDatasetService(existing: string[]) {
  const created: any[] = [];
  let reads = 0;
  const prisma = {
    ejercicio: {
      findMany: async () => {
        reads += 1;
        return existing.map((fuente_externa_id) => ({ fuente_externa_id }));
      },
      createMany: async ({ data }: any) => created.push(...data),
    },
  };
  return { service: new ExercisesService(prisma as any), created, reads: () => reads };
}

const datasetIds = (require('../prisma/datasets/free-exercise-db.json') as { id: string }[]).map((e) => e.id);

test('restaura los ejercicios del dataset que fueron eliminados', async () => {
  const { service, created } = makeDatasetService(datasetIds.slice(2));

  await service.restoreDataset();

  assert.deepEqual(created.map((e) => e.fuente_externa_id), datasetIds.slice(0, 2));
});

test('no toca el catálogo si el dataset está completo', async () => {
  const { service, created } = makeDatasetService(datasetIds);

  await service.restoreDataset();

  assert.equal(created.length, 0);
});

test('los ingresos simultáneos restauran el dataset una sola vez', async () => {
  const { service, created, reads } = makeDatasetService([]);

  await Promise.all([service.restoreDataset(), service.restoreDataset()]);

  assert.equal(reads(), 1);
  assert.equal(created.length, datasetIds.length);
});
