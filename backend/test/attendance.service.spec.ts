import assert = require('node:assert/strict');
import { test } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { AttendanceService } from '../src/modules/attendance/attendance.service';

function makeService(overrides: { atleta?: any; equipo?: any; atletas?: any[] } = {}) {
  const calls: any = {};
  const prisma = {
    usuario: {
      findUnique: async () => overrides.atleta,
      findMany: async (args: any) => {
        calls.findMany = args;
        return overrides.atletas ?? [];
      },
    },
    equipo: { findUnique: async () => overrides.equipo ?? null },
    asistencia: {
      findUnique: async () => null,
      create: async (args: any) => {
        calls.create = args;
        return args.data;
      },
    },
  };
  return { service: new AttendanceService(prisma as any), calls };
}

const coach = { id: 10, rol: Rol.ENTRENADOR };

test('un entrenador puede registrar la asistencia de un atleta sin equipo', async () => {
  const { service, calls } = makeService({ atleta: { id: 21, rol: Rol.ATLETA, equipo: null } });

  await service.record(coach, { usuario_id: 21, fecha: '2026-11-03' });

  assert.equal(calls.create.data.usuario_id, 21);
});

test('un entrenador no puede registrar la asistencia de un atleta de otro entrenador', async () => {
  const { service } = makeService({
    atleta: { id: 21, rol: Rol.ATLETA, equipo: { entrenador_id: 99 } },
  });

  await assert.rejects(service.record(coach, { usuario_id: 21, fecha: '2026-11-03' }), ForbiddenException);
});

test('la semana va de lunes a domingo sin importar el día consultado', async () => {
  const { service, calls } = makeService();

  // 2026-11-08 es domingo y 2026-11-02 es lunes
  const result = await service.getWeek(10, '2026-11-08', 'sin-equipo');

  assert.equal(result.semana_inicio, '2026-11-02');
  assert.equal(result.semana_fin, '2026-11-08');
  assert.equal(calls.findMany.where.equipo_id, null);
  assert.equal(result.equipo_nombre, 'Sin equipo');
});

test('resume los días presentes de cada atleta en la semana', async () => {
  const { service } = makeService({
    equipo: { id: 1, nombre: 'Halcones', entrenador_id: 10 },
    atletas: [
      {
        id: 21,
        nombre: 'Ana',
        email: 'ana@test.com',
        asistencias: [
          { id: 1, fecha: new Date('2026-11-02'), presente: true },
          { id: 2, fecha: new Date('2026-11-04'), presente: false },
        ],
      },
    ],
  });

  const result = await service.getWeek(10, '2026-11-03', '1');

  assert.equal(result.atletas[0].dias_presente, 1);
  assert.deepEqual(result.atletas[0].registros[1], { id: 2, fecha: '2026-11-04', presente: false });
});

test('rechaza consultar la semana de un equipo ajeno, inexistente o con fecha inválida', async () => {
  const ajeno = makeService({ equipo: { id: 1, entrenador_id: 99 } });
  await assert.rejects(ajeno.service.getWeek(10, '2026-11-03', '1'), ForbiddenException);

  const inexistente = makeService();
  await assert.rejects(inexistente.service.getWeek(10, '2026-11-03', 'abc'), NotFoundException);
  await assert.rejects(inexistente.service.getWeek(10, 'ayer', 'sin-equipo'), BadRequestException);
});
