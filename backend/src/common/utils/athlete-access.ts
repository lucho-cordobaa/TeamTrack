// Un atleta sin equipo todavía no depende de ningún entrenador, por lo que cualquiera puede gestionarlo.
export function coachManagesAthlete(
  coachId: number,
  athlete: { equipo?: { entrenador_id: number } | null },
): boolean {
  return !athlete.equipo || athlete.equipo.entrenador_id === coachId;
}
