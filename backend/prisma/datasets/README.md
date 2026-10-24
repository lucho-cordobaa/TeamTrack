# Dataset de ejercicios

`free-exercise-db.json` es una copia local del dataset publicado por [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db), bajo licencia [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE).

Los campos en español (`name_es`, `primaryMuscles_es`, `instructions_es`) se tomaron de la [base traducida de Pan y Hierro](https://panyhierro.com/datos/), que declara como fuente el mismo dataset de yuhonas y publica la traducción bajo Unlicense. El CSV fuente está guardado como `free-exercise-db-es.csv`.

El seed adapta sus campos al modelo `Ejercicio` de TeamTrack:

- `id` → `fuente_externa_id`
- `name_es` → `nombre` (con `name` en inglés como respaldo)
- `primaryMuscles_es` → `grupo_muscular` (con `primaryMuscles` como respaldo)
- `instructions_es` → `descripcion` (5 fichas no incluyen instrucciones en la fuente y se indican como no disponibles)
- primera imagen → `imagen_url` (alojada en el repositorio de origen)

Para conservar la relación con las rutinas de demostración, el seed busca ejercicios por el ID de origen y no por su posición en el dataset.

El comando `npm run prisma:sync-exercises` actualiza las traducciones y agrega ejercicios faltantes sin borrar datos de usuarios. También consolida los 16 ejercicios del catálogo de prueba anterior con sus equivalentes del dataset, redirigiendo las relaciones de rutinas e historial antes de quitarlos.
