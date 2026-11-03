import { readFileSync } from 'fs';
import { join } from 'path';

export interface FreeExercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  instructions: string[];
  images: string[];
  name_es: string;
  primaryMuscles_es: string[];
  instructions_es?: string;
}

export function loadExerciseDataset(): FreeExercise[] {
  const content = readFileSync(join(process.cwd(), 'prisma/datasets/free-exercise-db.json'), 'utf8');
  return JSON.parse(content.replace(/^﻿/, ''));
}

export function toExerciseData(exercise: FreeExercise) {
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
