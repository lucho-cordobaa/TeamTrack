import assert = require('node:assert/strict');
import { test } from 'node:test';

const dataset = require('../prisma/datasets/free-exercise-db.json') as Array<{
  id: string;
  name_es: string;
  primaryMuscles_es: string[];
  primaryMuscles: string[];
  instructions_es?: string;
}>;

test('el dataset tiene 876 ejercicios con IDs únicos y nombres en español', () => {
  assert.equal(dataset.length, 876);
  assert.equal(new Set(dataset.map((exercise) => exercise.id)).size, 876);
  assert.equal(dataset.filter((exercise) => exercise.name_es?.trim()).length, 876);
  assert.equal(new Set(dataset.map((exercise) => exercise.name_es.toLocaleLowerCase('es'))).size, 876);
  assert.ok(
    dataset.every((exercise) => exercise.primaryMuscles_es.length > 0 || exercise.primaryMuscles.length > 0),
  );
});

test('las cinco fichas sin instrucciones originales conservan su nombre en español', () => {
  const withoutInstructions = dataset.filter((exercise) => !exercise.instructions_es);
  assert.equal(withoutInstructions.length, 5);
  assert.ok(withoutInstructions.every((exercise) => !exercise.id.trim() || exercise.name_es.trim()));
});
