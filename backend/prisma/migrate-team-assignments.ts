import { PrismaClient, TipoRutina } from '@prisma/client';

const prisma = new PrismaClient();

// Antes, asignar a un equipo creaba una fila individual por atleta. Convierte en asignación de
// equipo las rutinas grupales que tiene todo su equipo; las demás quedan como individuales para
// que nadie pierda una rutina. Se puede ejecutar más de una vez.
async function main() {
  const routines = await prisma.rutina.findMany({
    where: { tipo: TipoRutina.GRUPAL, equipo_origen_id: { not: null } },
    select: {
      id: true,
      nombre: true,
      equipo_origen_id: true,
      asignaciones: { select: { usuario_id: true } },
      equipo_origen: { select: { atletas: { select: { id: true } } } },
    },
  });

  let migrated = 0;
  for (const routine of routines) {
    const members = routine.equipo_origen?.atletas.map((a) => a.id) ?? [];
    const assigned = new Set(routine.asignaciones.map((a) => a.usuario_id));
    if (members.length === 0 || !members.every((id) => assigned.has(id))) continue;

    await prisma.$transaction([
      prisma.asignacionEquipo.upsert({
        where: {
          rutina_id_equipo_id: { rutina_id: routine.id, equipo_id: routine.equipo_origen_id! },
        },
        update: {},
        create: { rutina_id: routine.id, equipo_id: routine.equipo_origen_id! },
      }),
      prisma.asignacionRutina.deleteMany({
        where: { rutina_id: routine.id, usuario_id: { in: members } },
      }),
    ]);
    migrated += 1;
    console.log(`Rutina asignada al equipo: ${routine.nombre}`);
  }

  console.log(`${migrated} de ${routines.length} rutinas grupales migradas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
