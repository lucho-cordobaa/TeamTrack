import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { coachManagesAthlete } from '../../common/utils/athlete-access';
import { Rol } from '@prisma/client';

const SIN_EQUIPO = 'sin-equipo';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Registrar asistencia evitando duplicados en la misma fecha
  async record(user: { id: number; rol: Rol; equipo_id?: number | null }, dto: RecordAttendanceDto) {
    if (user.rol === Rol.ATLETA && dto.usuario_id !== user.id) {
      throw new ForbiddenException('Solo puedes registrar tu propia asistencia');
    }

    const athlete = await this.prisma.usuario.findUnique({
      where: { id: dto.usuario_id },
      include: { equipo: true },
    });

    if (!athlete || athlete.rol !== Rol.ATLETA) {
      throw new NotFoundException('Atleta no encontrado');
    }

    if (user.rol === Rol.ENTRENADOR && !coachManagesAthlete(user.id, athlete)) {
      throw new ForbiddenException('No tienes permiso sobre este atleta');
    }

    // Normalizar fecha a medianoche UTC
    const dateObj = new Date(dto.fecha);
    dateObj.setUTCHours(0, 0, 0, 0);

    const existing = await this.prisma.asistencia.findUnique({
      where: {
        usuario_id_fecha: {
          usuario_id: dto.usuario_id,
          fecha: dateObj,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un registro de asistencia para este atleta en esta fecha');
    }

    const created = await this.prisma.asistencia.create({
      data: {
        usuario_id: dto.usuario_id,
        fecha: dateObj,
        presente: dto.presente !== undefined ? dto.presente : true,
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    return {
      asistencia: created,
    };
  }

  // Consulta de historial por atleta
  async getAthleteHistory(athleteId: number, user: { id: number; rol: Rol; equipo_id?: number | null }) {
    if (user.rol === Rol.ATLETA && athleteId !== user.id) {
      throw new ForbiddenException('No puedes ver la asistencia de otro atleta');
    }

    const athlete = await this.prisma.usuario.findUnique({
      where: { id: athleteId },
      include: { equipo: true },
    });

    if (!athlete) throw new NotFoundException('Atleta no encontrado');

    if (user.rol === Rol.ENTRENADOR && !coachManagesAthlete(user.id, athlete)) {
      throw new ForbiddenException('No administras al equipo de este atleta');
    }

    const records = await this.prisma.asistencia.findMany({
      where: { usuario_id: athleteId },
      orderBy: { fecha: 'desc' },
    });

    return {
      atleta_id: athleteId,
      nombre: athlete.nombre,
      total_asistencias: records.filter((r) => r.presente).length,
      historial: records,
    };
  }

  // Consulta de historial por equipo
  async getTeamHistory(teamId: number, user: { id: number; rol: Rol; equipo_id?: number | null }) {
    const team = await this.prisma.equipo.findUnique({
      where: { id: teamId },
      include: { atletas: true },
    });

    if (!team) throw new NotFoundException('Equipo no encontrado');

    if (user.rol === Rol.ENTRENADOR && team.entrenador_id !== user.id) {
      throw new ForbiddenException('No administras este equipo');
    }

    if (user.rol === Rol.ATLETA && team.id !== user.equipo_id) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    const athleteIds = team.atletas.map((a) => a.id);

    const records = await this.prisma.asistencia.findMany({
      where: { usuario_id: { in: athleteIds } },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      equipo_id: teamId,
      equipo_nombre: team.nombre,
      atletas_total: team.atletas.length,
      asistencias: records,
    };
  }

  // Asistencia semanal (lunes a domingo) de un equipo o de los atletas sin equipo
  async getWeek(coachId: number, weekDate: string, team: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate ?? '') || Number.isNaN(Date.parse(weekDate))) {
      throw new BadRequestException('La semana debe indicarse con una fecha válida (YYYY-MM-DD)');
    }

    const monday = new Date(weekDate);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    let equipoNombre = 'Sin equipo';
    let equipoId: number | null = null;

    if (team !== SIN_EQUIPO) {
      equipoId = Number(team);
      const equipo = Number.isInteger(equipoId)
        ? await this.prisma.equipo.findUnique({ where: { id: equipoId } })
        : null;
      if (!equipo) throw new NotFoundException('Equipo no encontrado');
      if (equipo.entrenador_id !== coachId) throw new ForbiddenException('No administras este equipo');
      equipoNombre = equipo.nombre;
    }

    const atletas = await this.prisma.usuario.findMany({
      where: { rol: Rol.ATLETA, equipo_id: equipoId },
      select: {
        id: true,
        nombre: true,
        email: true,
        asistencias: {
          where: { fecha: { gte: monday, lte: sunday } },
          select: { id: true, fecha: true, presente: true },
          orderBy: { fecha: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return {
      semana_inicio: monday.toISOString().slice(0, 10),
      semana_fin: sunday.toISOString().slice(0, 10),
      equipo_nombre: equipoNombre,
      atletas: atletas.map(({ asistencias, ...atleta }) => ({
        ...atleta,
        dias_presente: asistencias.filter((a) => a.presente).length,
        registros: asistencias.map((a) => ({
          id: a.id,
          fecha: a.fecha.toISOString().slice(0, 10),
          presente: a.presente,
        })),
      })),
    };
  }
}
