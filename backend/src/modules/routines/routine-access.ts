import { Prisma } from '@prisma/client';

// Un atleta accede a una rutina por una asignación individual o por el equipo al que pertenece ahora
export function assignedToAthlete(athleteId: number, equipoId?: number | null): Prisma.RutinaWhereInput {
  return {
    OR: [
      { asignaciones: { some: { usuario_id: athleteId } } },
      ...(equipoId ? [{ asignaciones_equipo: { some: { equipo_id: equipoId } } }] : []),
    ],
  };
}
