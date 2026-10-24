import { PrismaClient } from '@prisma/client';

interface FreeExercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
  name_es: string;
  primaryMuscles_es: string[];
  instructions_es?: string;
}

const prisma = new PrismaClient();
const dataset = require('./datasets/free-exercise-db.json') as FreeExercise[];
const legacyExerciseTargets: Record<string, string> = {
  exdb_bench_press_01: 'Barbell_Bench_Press_-_Medium_Grip',
  exdb_squat_02: 'Barbell_Squat',
  exdb_deadlift_03: 'Barbell_Deadlift',
  exdb_ohp_04: 'Standing_Military_Press',
  exdb_pullups_05: 'Pullups',
  exdb_barbell_row_06: 'Bent_Over_Barbell_Row',
  exdb_incline_db_07: 'Incline_Dumbbell_Press',
  exdb_lunges_08: 'Dumbbell_Lunges',
  exdb_dips_09: 'Dips_-_Triceps_Version',
  exdb_biceps_curl_10: 'Barbell_Curl',
  exdb_lateral_raise_11: 'Side_Lateral_Raise',
  exdb_hip_thrust_12: 'Barbell_Hip_Thrust',
  exdb_triceps_pushdown_13: 'Triceps_Pushdown',
  exdb_leg_press_14: 'Leg_Press',
  exdb_plank_15: 'Plank',
  exdb_lat_pulldown_16: 'Wide-Grip_Lat_Pulldown',
};

function toExerciseData(exercise: FreeExercise) {
  return {
    nombre: exercise.name_es || exercise.name,
    grupo_muscular: (exercise.primaryMuscles_es?.length
      ? exercise.primaryMuscles_es
      : exercise.primaryMuscles
    ).join(', '),
    descripcion:
      exercise.instructions_es || exercise.instructions.join('\n') || 'Sin instrucciones disponibles.',
    imagen_url: exercise.images[0]
      ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exercise.images[0]}`
      : '',
    fuente_externa_id: exercise.id,
  };
}

async function main() {
  const datasetIds = dataset.map((exercise) => exercise.id);
  const existing = await prisma.ejercicio.findMany({
    where: { fuente_externa_id: { in: datasetIds } },
    select: {
      id: true,
      fuente_externa_id: true,
      nombre: true,
      grupo_muscular: true,
      descripcion: true,
      imagen_url: true,
    },
  });
  const existingBySourceId = new Map<string | null, (typeof existing)[number]>();
  for (const exercise of existing) {
    existingBySourceId.set(exercise.fuente_externa_id, exercise);
  }
  const missing = dataset.filter((exercise) => !existingBySourceId.has(exercise.id));

  if (missing.length > 0) {
    await prisma.ejercicio.createMany({
      data: missing.map(toExerciseData),
    });
  }

  const changed = dataset.filter((exercise) => {
    const current = existingBySourceId.get(exercise.id);
    if (!current) return false;
    const next = toExerciseData(exercise);
    return (
      current.nombre !== next.nombre ||
      current.grupo_muscular !== next.grupo_muscular ||
      current.descripcion !== next.descripcion ||
      current.imagen_url !== next.imagen_url
    );
  });
  if (changed.length > 0) {
    await prisma.$transaction(
      changed.map((exercise) =>
        prisma.ejercicio.update({
          where: { id: existingBySourceId.get(exercise.id)!.id },
          data: toExerciseData(exercise),
        }),
      ),
    );
  }

  const sourceIdToDatabaseId = new Map<string, number>();
  const allDatasetExercises = await prisma.ejercicio.findMany({
    where: { fuente_externa_id: { in: datasetIds } },
    select: { id: true, fuente_externa_id: true },
  });
  for (const exercise of allDatasetExercises) {
    if (exercise.fuente_externa_id) sourceIdToDatabaseId.set(exercise.fuente_externa_id, exercise.id);
  }

  let legacyRemoved = 0;
  await prisma.$transaction(async (tx) => {
    for (const [legacySourceId, targetSourceId] of Object.entries(legacyExerciseTargets)) {
      const legacy = await tx.ejercicio.findFirst({
        where: { fuente_externa_id: legacySourceId },
        select: { id: true },
      });
      const targetId = sourceIdToDatabaseId.get(targetSourceId);
      if (!legacy || !targetId) continue;

      const routineLinks = await tx.rutinaEjercicio.findMany({
        where: { ejercicio_id: legacy.id },
        select: { id: true, rutina_id: true },
      });
      for (const link of routineLinks) {
        const duplicateLink = await tx.rutinaEjercicio.findUnique({
          where: { rutina_id_ejercicio_id: { rutina_id: link.rutina_id, ejercicio_id: targetId } },
          select: { id: true },
        });
        if (duplicateLink) {
          await tx.rutinaEjercicio.delete({ where: { id: link.id } });
        } else {
          await tx.rutinaEjercicio.update({
            where: { id: link.id },
            data: { ejercicio_id: targetId },
          });
        }
      }

      await tx.serieRealizada.updateMany({
        where: { ejercicio_id: legacy.id },
        data: { ejercicio_id: targetId },
      });
      await tx.ejercicio.delete({ where: { id: legacy.id } });
      legacyRemoved += 1;
    }
  });

  const total = await prisma.ejercicio.count();
  console.log(
    `Dataset sincronizado: ${missing.length} agregados, ${changed.length} traducidos, ${legacyRemoved} duplicados anteriores consolidados. Total en MySQL: ${total}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
