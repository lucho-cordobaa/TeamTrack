import assert = require('node:assert/strict');
import { test } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { RoutinesService } from '../src/modules/routines/routines.service';
import { assignedToAthlete } from '../src/modules/routines/routine-access';

function makeService(athletes: any[]) {
  const upserts: any[] = [];
  const teamAssignments: any[] = [];
  const prisma: any = {
    rutina: {
      findUnique: async () => ({ id: 5, creado_por: 10 }),
    },
    usuario: {
      findMany: async () => athletes,
    },
    equipo: {
      findUnique: async () => ({ id: 3, entrenador_id: 10 }),
    },
    asignacionEquipo: {
      findUnique: async () => null,
      create: async (args: any) => teamAssignments.push(args.data),
      upsert: async (args: any) => teamAssignments.push(args.create),
    },
    asignacionRutina: {
      count: async () => 0,
      upsert: async (args: any) => {
        upserts.push(args);
        return args;
      },
    },
  };
  return { service: new RoutinesService(prisma), prisma, upserts, teamAssignments };
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

test('permite asignar individualmente a un atleta sin equipo', async () => {
  const { service, upserts } = makeService([{ id: 24, rol: Rol.ATLETA, equipo: null }]);

  const result = await service.assign(5, 10, { atleta_ids: [24] });

  assert.equal(result.total, 1);
  assert.equal(upserts[0].create.usuario_id, 24);
});

test('informa cuántas asignaciones son nuevas si el atleta ya la tenía por su equipo', async () => {
  const { service, prisma } = makeService([
    { id: 21, rol: Rol.ATLETA, equipo: { entrenador_id: 10 } },
  ]);
  prisma.asignacionRutina.count = async () => 1;

  const result = await service.assign(5, 10, { atleta_ids: [21] });

  assert.equal(result.total, 1);
  assert.equal(result.nuevas, 0);
});

test('crea una rutina individual y la asigna a los atletas elegidos', async () => {
  const { service, prisma, upserts } = makeService([{ id: 21, rol: Rol.ATLETA, equipo: null }]);
  prisma.rutina.create = async () => ({ id: 7 });

  await service.create(10, {
    nombre: 'Fuerza',
    tipo: 'INDIVIDUAL',
    ejercicios: [],
    atleta_ids: [21],
  } as any);

  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].create.rutina_id, 7);
});

test('no crea la rutina si un atleta elegido es de otro entrenador', async () => {
  const { service, prisma } = makeService([
    { id: 22, rol: Rol.ATLETA, equipo: { entrenador_id: 99 } },
  ]);
  let created = false;
  prisma.rutina.create = async () => {
    created = true;
    return { id: 7 };
  };

  await assert.rejects(
    service.create(10, { nombre: 'Fuerza', tipo: 'INDIVIDUAL', ejercicios: [], atleta_ids: [22] } as any),
    ForbiddenException,
  );
  assert.equal(created, false);
});

test('crea una rutina grupal asignada al equipo aunque aún no tenga atletas', async () => {
  const { service, prisma, teamAssignments } = makeService([]);
  prisma.rutina.create = async () => ({ id: 7 });

  await service.create(10, { nombre: 'Fuerza', tipo: 'GRUPAL', ejercicios: [], equipo_origen_id: 3 } as any);

  assert.deepEqual(teamAssignments, [{ rutina_id: 7, equipo_id: 3 }]);
});

test('no permite crear una rutina sin destinatarios', async () => {
  const { service, prisma } = makeService([]);
  prisma.rutina.create = async () => assert.fail('no debería crear la rutina');

  await assert.rejects(
    service.create(10, { nombre: 'Fuerza', tipo: 'INDIVIDUAL', ejercicios: [] } as any),
    BadRequestException,
  );
  await assert.rejects(
    service.create(10, { nombre: 'Fuerza', tipo: 'GRUPAL', ejercicios: [] } as any),
    BadRequestException,
  );
});

test('asignar a un equipo no crea filas individuales', async () => {
  const { service, upserts, teamAssignments } = makeService([]);

  const result = await service.assign(5, 10, { equipo_id: 3 });

  assert.equal(result.nuevas, 1);
  assert.equal(upserts.length, 0);
  assert.deepEqual(teamAssignments, [{ rutina_id: 5, equipo_id: 3 }]);
});

test('reasignar un equipo que ya la tenía no cuenta como nueva', async () => {
  const { service, prisma } = makeService([]);
  prisma.asignacionEquipo.findUnique = async () => ({ id: 1 });

  const result = await service.assign(5, 10, { equipo_id: 3 });

  assert.equal(result.nuevas, 0);
});

test('rechaza asignar a un equipo de otro entrenador', async () => {
  const { service, prisma } = makeService([]);
  prisma.equipo.findUnique = async () => ({ id: 3, entrenador_id: 99 });

  await assert.rejects(service.assign(5, 10, { equipo_id: 3 }), ForbiddenException);
});

test('el atleta ve las rutinas de su equipo actual además de las individuales', () => {
  assert.deepEqual(assignedToAthlete(21, 3), {
    OR: [
      { asignaciones: { some: { usuario_id: 21 } } },
      { asignaciones_equipo: { some: { equipo_id: 3 } } },
    ],
  });
});

test('un atleta sin equipo solo ve sus rutinas individuales', () => {
  assert.deepEqual(assignedToAthlete(21, null), {
    OR: [{ asignaciones: { some: { usuario_id: 21 } } }],
  });
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
