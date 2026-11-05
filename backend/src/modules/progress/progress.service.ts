import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { coachManagesAthlete } from '../../common/utils/athlete-access';
import { Rol } from '@prisma/client';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  // Historial de peso por ejercicio a lo largo del tiempo
  async getExerciseWeightHistory(
    athleteId: number,
    exerciseId: number,
    user: { id: number; rol: Rol; equipo_id?: number | null },
  ) {
    if (user.rol === Rol.ATLETA && athleteId !== user.id) {
      throw new ForbiddenException('No tienes acceso a los datos de este atleta');
    }

    const athlete = await this.prisma.usuario.findUnique({
      where: { id: athleteId },
      include: { equipo: true },
    });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');

    if (user.rol === Rol.ENTRENADOR && !coachManagesAthlete(user.id, athlete)) {
      throw new ForbiddenException('No administras al equipo de este atleta');
    }

    const exercise = await this.prisma.ejercicio.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');

    const series = await this.prisma.serieRealizada.findMany({
      where: {
        usuario_id: athleteId,
        ejercicio_id: exerciseId,
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupar por fecha para obtener el peso máximo y el volumen levantado en cada día
    const dateMap = new Map<string, { maxPeso: number; totalReps: number; seriesCount: number }>();

    for (const s of series) {
      const d = s.fecha.toISOString().split('T')[0];
      const current = dateMap.get(d) || { maxPeso: 0, totalReps: 0, seriesCount: 0 };
      const peso = Number(s.peso_kg);
      if (peso > current.maxPeso) {
        current.maxPeso = peso;
      }
      current.totalReps += s.repeticiones_realizadas;
      current.seriesCount += 1;
      dateMap.set(d, current);
    }

    const timeline = Array.from(dateMap.entries()).map(([fecha, data]) => ({
      fecha,
      peso_maximo: data.maxPeso,
      repeticiones_totales: data.totalReps,
      series_realizadas: data.seriesCount,
    }));

    return {
      atleta_id: athleteId,
      atleta_nombre: athlete.nombre,
      ejercicio: {
        id: exercise.id,
        nombre: exercise.nombre,
        grupo_muscular: exercise.grupo_muscular,
      },
      puntos_progreso: timeline,
      peso_record: timeline.length > 0 ? Math.max(...timeline.map((p) => p.peso_maximo)) : 0,
    };
  }

  // Resumen del atleta: total de series, ejercicios entrenados y asistencias
  async getAthleteSummary(athleteId: number, user: { id: number; rol: Rol; equipo_id?: number | null }) {
    if (user.rol === Rol.ATLETA && athleteId !== user.id) {
      throw new ForbiddenException('No tienes acceso a los datos de este atleta');
    }

    const athlete = await this.prisma.usuario.findUnique({
      where: { id: athleteId },
      include: {
        equipo: true,
        asistencias: true,
        series_realizadas: {
          include: { ejercicio: true },
        },
      },
    });

    if (!athlete) throw new NotFoundException('Atleta no encontrado');

    // Ejercicios únicos realizados
    const exerciseMap = new Map<number, { id: number; nombre: string; grupo: string; maxWeight: number }>();

    for (const s of athlete.series_realizadas) {
      const peso = Number(s.peso_kg);
      const existing = exerciseMap.get(s.ejercicio_id);
      if (!existing) {
        exerciseMap.set(s.ejercicio_id, {
          id: s.ejercicio.id,
          nombre: s.ejercicio.nombre,
          grupo: s.ejercicio.grupo_muscular,
          maxWeight: peso,
        });
      } else if (peso > existing.maxWeight) {
        existing.maxWeight = peso;
      }
    }

    return {
      atleta: {
        id: athlete.id,
        nombre: athlete.nombre,
        email: athlete.email,
        equipo: athlete.equipo?.nombre || 'Sin equipo',
      },
      total_asistencias: athlete.asistencias.filter((a) => a.presente).length,
      total_series_registradas: athlete.series_realizadas.length,
      ejercicios_registrados: Array.from(exerciseMap.values()),
    };
  }

  // Progreso grupal para entrenador
  async getTeamProgress(teamId: number, coachId: number) {
    const team = await this.prisma.equipo.findUnique({
      where: { id: teamId },
      include: {
        atletas: {
          include: {
            asistencias: true,
            series_realizadas: true,
          },
        },
      },
    });

    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No administras este equipo');

    const totalAtletas = team.atletas.length;
    const totalAsistencias = team.atletas.reduce(
      (sum, a) => sum + a.asistencias.filter((asist) => asist.presente).length,
      0,
    );
    const totalSeries = team.atletas.reduce((sum, a) => sum + a.series_realizadas.length, 0);

    return {
      equipo_id: team.id,
      equipo_nombre: team.nombre,
      total_atletas: totalAtletas,
      total_asistencias: totalAsistencias,
      total_series: totalSeries,
      promedio_asistencia_por_atleta: totalAtletas > 0 ? (totalAsistencias / totalAtletas).toFixed(1) : 0,
      atletas: team.atletas.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        email: a.email,
        asistencias: a.asistencias.filter((asist) => asist.presente).length,
        series_totales: a.series_realizadas.length,
      })),
    };
  }

  async getTeamExerciseRanking(
    teamId: number,
    exerciseId: number,
    user: { id: number; rol: Rol; equipo_id?: number | null },
  ) {
    const team = await this.prisma.equipo.findUnique({
      where: { id: teamId },
      include: { atletas: { select: { id: true, nombre: true } } },
    });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (user.rol === Rol.ENTRENADOR && team.entrenador_id !== user.id) {
      throw new ForbiddenException('No administras este equipo');
    }
    if (user.rol === Rol.ATLETA && (user.equipo_id !== teamId || !team.atletas.some((athlete) => athlete.id === user.id))) {
      throw new ForbiddenException('No perteneces a este equipo');
    }
    const exercise = await this.prisma.ejercicio.findUnique({ where: { id: exerciseId }, select: { id: true, nombre: true } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');

    const records = await this.prisma.serieRealizada.findMany({
      where: { ejercicio_id: exerciseId, usuario_id: { in: team.atletas.map((athlete) => athlete.id) } },
      select: { usuario_id: true, peso_kg: true, repeticiones_realizadas: true, fecha: true },
    });
    const bestByAthlete = new Map<number, { peso_kg: number; repeticiones: number; fecha: Date }>();
    for (const record of records) {
      const candidate = { peso_kg: Number(record.peso_kg), repeticiones: record.repeticiones_realizadas, fecha: record.fecha };
      const current = bestByAthlete.get(record.usuario_id);
      if (!current || candidate.peso_kg > current.peso_kg || (candidate.peso_kg === current.peso_kg && candidate.repeticiones > current.repeticiones)) {
        bestByAthlete.set(record.usuario_id, candidate);
      }
    }

    const athletesById = new Map(team.atletas.map((athlete) => [athlete.id, athlete]));
    const ranking = Array.from(bestByAthlete.entries())
      .map(([athleteId, record]) => ({ atleta_id: athleteId, nombre: athletesById.get(athleteId)!.nombre, ...record }))
      .sort((a, b) => b.peso_kg - a.peso_kg || b.repeticiones - a.repeticiones || a.nombre.localeCompare(b.nombre))
      .map((entry, index) => ({ puesto: index + 1, ...entry }));

    return { equipo_id: team.id, equipo_nombre: team.nombre, ejercicio: exercise, ranking };
  }
}
