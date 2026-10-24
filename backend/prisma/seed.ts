import { PrismaClient, Rol, TipoRutina } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

const ejerciciosData = require('./datasets/free-exercise-db.json') as FreeExercise[];

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de TeamTrack...');

  // Limpiar base de datos en orden inverso para evitar conflictos de claves foráneas
  await prisma.serieRealizada.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.asignacionRutina.deleteMany();
  await prisma.rutinaEjercicio.deleteMany();
  await prisma.rutina.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.ejercicio.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Crear Entrenadores
  const coach1 = await prisma.usuario.create({
    data: {
      nombre: 'Luciano Córdoba',
      email: 'luciano@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ENTRENADOR,
    },
  });

  const coach2 = await prisma.usuario.create({
    data: {
      nombre: 'Marcos Díaz',
      email: 'marcos@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ENTRENADOR,
    },
  });

  // 2. Crear Equipos
  const team1 = await prisma.equipo.create({
    data: {
      nombre: 'Halcones Rugby',
      entrenador_id: coach1.id,
    },
  });

  const team2 = await prisma.equipo.create({
    data: {
      nombre: 'Panteras Hockey',
      entrenador_id: coach1.id,
    },
  });

  const team3 = await prisma.equipo.create({
    data: {
      nombre: 'Titanes Crossfit',
      entrenador_id: coach2.id,
    },
  });

  // 3. Crear Atletas
  const atleta1 = await prisma.usuario.create({
    data: {
      nombre: 'Joaquín Carballo',
      email: 'joaquin@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: team1.id,
    },
  });

  const atleta2 = await prisma.usuario.create({
    data: {
      nombre: 'Sofía Benítez',
      email: 'sofia@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: team1.id,
    },
  });

  const atleta3 = await prisma.usuario.create({
    data: {
      nombre: 'Mateo Rossi',
      email: 'mateo@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: team1.id,
    },
  });

  const atleta4 = await prisma.usuario.create({
    data: {
      nombre: 'Valentina López',
      email: 'valentina@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: team2.id,
    },
  });

  const atleta5 = await prisma.usuario.create({
    data: {
      nombre: 'Lucas Fernández',
      email: 'lucas@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: team2.id,
    },
  });

  const atleta6 = await prisma.usuario.create({
    data: {
      nombre: 'Camila Ruiz',
      email: 'camila@teamtrack.com',
      password_hash: passwordHash,
      rol: Rol.ATLETA,
      equipo_id: null, // Sin equipo asignado inicialmente
    },
  });

  // 4. Catálogo de Ejercicios
  await prisma.ejercicio.createMany({
    data: ejerciciosData.map((ej) => ({
      nombre: ej.name_es || ej.name,
      grupo_muscular: (ej.primaryMuscles_es?.length ? ej.primaryMuscles_es : ej.primaryMuscles).join(', '),
      descripcion: ej.instructions_es || ej.instructions.join('\n') || 'Sin instrucciones disponibles.',
      imagen_url: ej.images[0]
        ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ej.images[0]}`
        : '',
      fuente_externa_id: ej.id,
    })),
  });

  const ejerciciosCreados = await prisma.ejercicio.findMany({
    select: { id: true, fuente_externa_id: true },
  });
  const ejercicioIdPorFuente = new Map<string | null, number>();
  for (const ejercicio of ejerciciosCreados) {
    ejercicioIdPorFuente.set(ejercicio.fuente_externa_id, ejercicio.id);
  }
  const ejercicioId = (fuenteId: string) => {
    const id = ejercicioIdPorFuente.get(fuenteId);
    if (!id) throw new Error(`No se encontró el ejercicio del dataset: ${fuenteId}`);
    return id;
  };

  // 5. Crear Rutinas
  // Rutina Grupal 1 para Halcones Rugby
  const rutinaGrupal = await prisma.rutina.create({
    data: {
      nombre: 'Fuerza Máxima - Pretemporada',
      tipo: TipoRutina.GRUPAL,
      creado_por: coach1.id,
      equipo_origen_id: team1.id,
      ejercicios: {
        create: [
          { ejercicio_id: ejercicioId('Barbell_Bench_Press_-_Medium_Grip'), series: 4, repeticiones: 8, orden: 1 }, // Press banca
          { ejercicio_id: ejercicioId('Barbell_Squat'), series: 4, repeticiones: 6, orden: 2 }, // Sentadilla
          { ejercicio_id: ejercicioId('Barbell_Deadlift'), series: 3, repeticiones: 5, orden: 3 }, // Peso muerto
          { ejercicio_id: ejercicioId('Standing_Military_Press'), series: 3, repeticiones: 8, orden: 4 }, // Press militar
        ],
      },
    },
  });

  // Rutina Grupal 2 para Halcones Rugby
  const rutinaHipertrofia = await prisma.rutina.create({
    data: {
      nombre: 'Hipertrofia y Resistencia Tren Superior',
      tipo: TipoRutina.GRUPAL,
      creado_por: coach1.id,
      equipo_origen_id: team1.id,
      ejercicios: {
        create: [
          { ejercicio_id: ejercicioId('Incline_Dumbbell_Press'), series: 4, repeticiones: 10, orden: 1 }, // Press inclinado
          { ejercicio_id: ejercicioId('Pullups'), series: 4, repeticiones: 8, orden: 2 },  // Dominadas
          { ejercicio_id: ejercicioId('Bent_Over_Barbell_Row'), series: 3, repeticiones: 12, orden: 3 }, // Remo con barra
          { ejercicio_id: ejercicioId('Side_Lateral_Raise'), series: 3, repeticiones: 15, orden: 4 },// Elevaciones lat
          { ejercicio_id: ejercicioId('Barbell_Curl'), series: 3, repeticiones: 12, orden: 5 }, // Curl bíceps
        ],
      },
    },
  });

  // Rutina Individual para Atleta 1 (Joaquín)
  const rutinaIndividual = await prisma.rutina.create({
    data: {
      nombre: 'Refuerzo de Piernas y Core',
      tipo: TipoRutina.INDIVIDUAL,
      creado_por: coach1.id,
      ejercicios: {
        create: [
          { ejercicio_id: ejercicioId('Barbell_Squat'), series: 4, repeticiones: 8, orden: 1 },  // Sentadilla
          { ejercicio_id: ejercicioId('Dumbbell_Lunges'), series: 3, repeticiones: 12, orden: 2 }, // Zancadas
          { ejercicio_id: ejercicioId('Barbell_Hip_Thrust'), series: 3, repeticiones: 10, orden: 3 },// Hip Thrust
          { ejercicio_id: ejercicioId('Plank'), series: 3, repeticiones: 60, orden: 4 },// Plancha
        ],
      },
    },
  });

  // 6. Asignaciones de Rutina (RB-04, RB-05)
  // Al asignar rutina grupal al equipo Halcones Rugby, asignamos a Joaquín, Sofía y Mateo:
  await prisma.asignacionRutina.createMany({
    data: [
      { rutina_id: rutinaGrupal.id, usuario_id: atleta1.id },
      { rutina_id: rutinaGrupal.id, usuario_id: atleta2.id },
      { rutina_id: rutinaGrupal.id, usuario_id: atleta3.id },
      { rutina_id: rutinaHipertrofia.id, usuario_id: atleta1.id },
      { rutina_id: rutinaHipertrofia.id, usuario_id: atleta2.id },
      { rutina_id: rutinaIndividual.id, usuario_id: atleta1.id },
    ],
  });

  // 7. Registro de Asistencias (para calcular rachas y estadísticas históricas)
  // Joaquín tiene asistencia en los últimos 4 días consecutivos
  const today = new Date();
  const getPastDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const asistenciasJoaquin = [0, 1, 2, 3, 5, 7, 9].map((daysAgo) => ({
    usuario_id: atleta1.id,
    fecha: getPastDate(daysAgo),
    presente: true,
  }));

  const asistenciasSofia = [0, 1, 3, 4, 8].map((daysAgo) => ({
    usuario_id: atleta2.id,
    fecha: getPastDate(daysAgo),
    presente: true,
  }));

  const asistenciasMateo = [0, 2, 6].map((daysAgo) => ({
    usuario_id: atleta3.id,
    fecha: getPastDate(daysAgo),
    presente: true,
  }));

  await prisma.asistencia.createMany({
    data: [...asistenciasJoaquin, ...asistenciasSofia, ...asistenciasMateo],
  });

  // 8. Series Realizadas Históricas (Persistidas en MySQL tras finalizar sesiones de entrenamiento)
  // Progreso de peso en Press de Banca para Joaquín (ejercicio 0)
  const benchPress = ejercicioId('Barbell_Bench_Press_-_Medium_Grip');
  const squat = ejercicioId('Barbell_Squat');

  await prisma.serieRealizada.createMany({
    data: [
      // Hace 3 semanas
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 60.0, repeticiones_realizadas: 8, fecha: getPastDate(21) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 60.0, repeticiones_realizadas: 8, fecha: getPastDate(21) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 3, peso_kg: 62.5, repeticiones_realizadas: 7, fecha: getPastDate(21) },

      // Hace 2 semanas
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 65.0, repeticiones_realizadas: 8, fecha: getPastDate(14) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 65.0, repeticiones_realizadas: 8, fecha: getPastDate(14) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 3, peso_kg: 67.5, repeticiones_realizadas: 6, fecha: getPastDate(14) },

      // Hace 1 semana
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 70.0, repeticiones_realizadas: 8, fecha: getPastDate(7) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 70.0, repeticiones_realizadas: 8, fecha: getPastDate(7) },
      { usuario_id: atleta1.id, ejercicio_id: benchPress, rutina_id: rutinaGrupal.id, numero_serie: 3, peso_kg: 72.5, repeticiones_realizadas: 6, fecha: getPastDate(7) },

      // Sentadillas Joaquín
      { usuario_id: atleta1.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 80.0, repeticiones_realizadas: 6, fecha: getPastDate(14) },
      { usuario_id: atleta1.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 85.0, repeticiones_realizadas: 6, fecha: getPastDate(14) },
      { usuario_id: atleta1.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 90.0, repeticiones_realizadas: 6, fecha: getPastDate(7) },
      { usuario_id: atleta1.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 95.0, repeticiones_realizadas: 5, fecha: getPastDate(7) },

      // Sentadillas Sofía
      { usuario_id: atleta2.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 50.0, repeticiones_realizadas: 8, fecha: getPastDate(8) },
      { usuario_id: atleta2.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 55.0, repeticiones_realizadas: 8, fecha: getPastDate(8) },
      { usuario_id: atleta2.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 1, peso_kg: 57.5, repeticiones_realizadas: 8, fecha: getPastDate(1) },
      { usuario_id: atleta2.id, ejercicio_id: squat, rutina_id: rutinaGrupal.id, numero_serie: 2, peso_kg: 60.0, repeticiones_realizadas: 7, fecha: getPastDate(1) },
    ],
  });

  console.log('Seed completado con éxito.');
  console.log('--- Credenciales de Prueba ---');
  console.log('Entrenador: luciano@teamtrack.com / password123');
  console.log('Entrenador: marcos@teamtrack.com / password123');
  console.log('Atleta: joaquin@teamtrack.com / password123');
  console.log('Atleta: sofia@teamtrack.com / password123');
  console.log('Atleta: mateo@teamtrack.com / password123');
  console.log('Atleta (sin equipo): camila@teamtrack.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
