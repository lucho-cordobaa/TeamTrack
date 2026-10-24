import assert = require('node:assert/strict');
import { test } from 'node:test';
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
