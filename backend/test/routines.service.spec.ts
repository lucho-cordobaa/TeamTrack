import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { RoutinesService } from '../src/modules/routines/routines.service';

function makeService(athletes: any[]) {
  const upserts: any[] = [];
  const prisma = {
    rutina: {
      findUnique: async () => ({ id: 5, creado_por: 10 }),
    },
    usuario: {
      findMany: async () => athletes,
    },
    asignacionRutina: {
      upsert: async (args: any) => {
        upserts.push(args);
        return args;
      },
    },
  };
  return { service: new RoutinesService(prisma as any), upserts };
}

test('permite asignar individualmente a un atleta de un equipo del entrenador', async () => {
  const { service, upserts } = makeService([
    { id: 21, rol: Rol.ATLETA, equipo: { entrenador_id: 10 } },
  ]);

  const result = await service.assign(5, 10, { atleta_ids: [21] });

  assert.equal(result.total, 1);
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].create.usuario_id, 21);
});

test('rechaza atletas que pertenecen a equipos de otro entrenador', async () => {
  const { service, upserts } = makeService([
    { id: 22, rol: Rol.ATLETA, equipo: { entrenador_id: 99 } },
  ]);

  await assert.rejects(
    service.assign(5, 10, { atleta_ids: [22] }),
    ForbiddenException,
  );
  assert.equal(upserts.length, 0);
});

test('rechaza IDs inexistentes o que no correspondan a atletas', async () => {
  const { service, upserts } = makeService([
    { id: 23, rol: Rol.ENTRENADOR, equipo: null },
  ]);

  await assert.rejects(
    service.assign(5, 10, { atleta_ids: [23] }),
    NotFoundException,
  );
  assert.equal(upserts.length, 0);
});
