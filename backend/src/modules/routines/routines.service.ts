import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { AssignRoutineDto } from './dto/assign-routine.dto';
import { coachManagesAthlete } from '../../common/utils/athlete-access';
import { assignedToAthlete } from './routine-access';
import { Rol, TipoRutina } from '@prisma/client';

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService) {}

  async create(coachId: number, dto: CreateRoutineDto) {
    // Toda rutina nace asignada: validar antes de crear para no dejarla sin destinatarios
    const isIndividual = dto.tipo === TipoRutina.INDIVIDUAL;
    const athleteIds = isIndividual ? await this.validateAthletes(coachId, dto.atleta_ids) : [];

    if (isIndividual && athleteIds.length === 0) {
      throw new BadRequestException('Debes asignar la rutina al menos a un atleta');
    }
    if (!isIndividual) {
      if (!dto.equipo_origen_id) throw new BadRequestException('Debes asignar la rutina a un equipo');
      await this.validateTeam(coachId, dto.equipo_origen_id);
    }

    const routine = await this.prisma.rutina.create({
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        creado_por: coachId,
        equipo_origen_id: dto.tipo === TipoRutina.GRUPAL ? dto.equipo_origen_id : null,
        ejercicios: {
          create: dto.ejercicios.map((item) => ({
            ejercicio_id: item.ejercicio_id,
            series: item.series,
            repeticiones: item.repeticiones,
            orden: item.orden,
          })),
        },
      },
      include: {
        ejercicios: {
          include: { ejercicio: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    await this.upsertAssignments(routine.id, athleteIds);
    if (!isIndividual) {
      await this.prisma.asignacionEquipo.create({
        data: { rutina_id: routine.id, equipo_id: dto.equipo_origen_id },
      });
    }
    return routine;
  }

  async findAllForUser(user: { id: number; rol: Rol; equipo_id?: number | null }) {
    if (user.rol === Rol.ENTRENADOR) {
      const routines = await this.prisma.rutina.findMany({
        where: { creado_por: user.id },
        include: {
          equipo_origen: {
            select: { id: true, nombre: true },
          },
          ejercicios: {
            include: { ejercicio: true },
            orderBy: { orden: 'asc' },
          },
          asignaciones: {
            select: {
              id: true,
              usuario_id: true,
              fecha_asignacion: true,
              usuario: { select: { id: true, nombre: true, email: true } },
            },
          },
          asignaciones_equipo: {
            select: {
              id: true,
              equipo_id: true,
              fecha_asignacion: true,
              equipo: {
                select: { id: true, nombre: true, atletas: { select: { id: true } } },
              },
            },
          },
          _count: {
            select: { asignaciones: true, ejercicios: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return routines.map((routine) => ({
        ...routine,
        atletas_asignados: new Set([
          ...routine.asignaciones.map((a) => a.usuario_id),
          ...routine.asignaciones_equipo.flatMap((a) => a.equipo.atletas.map((atleta) => atleta.id)),
        ]).size,
      }));
    }

    // Para atletas: rutinas asignadas individualmente o al equipo al que pertenecen ahora
    const routines = await this.prisma.rutina.findMany({
      where: assignedToAthlete(user.id, user.equipo_id),
      include: {
        entrenador: {
          select: { id: true, nombre: true },
        },
        ejercicios: {
          include: { ejercicio: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          where: { usuario_id: user.id },
          select: { fecha_asignacion: true },
        },
        asignaciones_equipo: {
          where: { equipo: { atletas: { some: { id: user.id } } } },
          select: { fecha_asignacion: true, equipo: { select: { id: true, nombre: true } } },
        },
      },
    });

    return routines
      .map(({ asignaciones, ...routine }) => ({
        ...routine,
        fecha_asignacion: [...asignaciones, ...routine.asignaciones_equipo]
          .map((a) => a.fecha_asignacion)
          .sort((a, b) => b.getTime() - a.getTime())[0],
      }))
      .sort((a, b) => b.fecha_asignacion.getTime() - a.fecha_asignacion.getTime());
  }

  async findOne(routineId: number, user: { id: number; rol: Rol; equipo_id?: number | null }) {
    const routine = await this.prisma.rutina.findUnique({
      where: { id: routineId },
      include: {
        entrenador: {
          select: { id: true, nombre: true, email: true },
        },
        equipo_origen: true,
        ejercicios: {
          include: { ejercicio: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            usuario: {
              select: { id: true, nombre: true, email: true, equipo_id: true },
            },
          },
        },
        asignaciones_equipo: {
          include: {
            equipo: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    if (!routine) {
      throw new NotFoundException('Rutina no encontrada');
    }

    if (user.rol === Rol.ENTRENADOR && routine.creado_por !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver esta rutina');
    }

    if (user.rol === Rol.ATLETA) {
      const isAssigned =
        routine.asignaciones.some((a) => a.usuario_id === user.id) ||
        routine.asignaciones_equipo.some((a) => a.equipo_id === user.equipo_id);
      if (!isAssigned) {
        throw new ForbiddenException('Esta rutina no está asignada a tu usuario');
      }
    }

    return routine;
  }

  async update(routineId: number, coachId: number, dto: CreateRoutineDto) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso para editar esta rutina');

    // Transacción: actualizar datos de rutina y recrear los ejercicios asociados
    return this.prisma.$transaction(async (tx) => {
      await tx.rutinaEjercicio.deleteMany({ where: { rutina_id: routineId } });

      return tx.rutina.update({
        where: { id: routineId },
        data: {
          nombre: dto.nombre,
          tipo: dto.tipo,
          equipo_origen_id: dto.tipo === TipoRutina.GRUPAL ? dto.equipo_origen_id : null,
          ejercicios: {
            create: dto.ejercicios.map((item) => ({
              ejercicio_id: item.ejercicio_id,
              series: item.series,
              repeticiones: item.repeticiones,
              orden: item.orden,
            })),
          },
        },
        include: {
          ejercicios: {
            include: { ejercicio: true },
            orderBy: { orden: 'asc' },
          },
        },
      });
    });
  }

  async remove(routineId: number, coachId: number) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso para eliminar esta rutina');

    return this.prisma.rutina.delete({ where: { id: routineId } });
  }

  // Asignar rutina individual o a todo el equipo
  async assign(routineId: number, coachId: number, dto: AssignRoutineDto) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso para asignar esta rutina');

    const athleteIds = await this.validateAthletes(coachId, dto.atleta_ids);
    if (!dto.equipo_id && athleteIds.length === 0) {
      throw new BadRequestException('Debes indicar al menos un atleta o un equipo para asignar');
    }

    let total = athleteIds.length;
    let alreadyAssigned = await this.prisma.asignacionRutina.count({
      where: { rutina_id: routineId, usuario_id: { in: athleteIds } },
    });

    // La asignación al equipo alcanza a sus atletas actuales y a los que se sumen después
    if (dto.equipo_id) {
      await this.validateTeam(coachId, dto.equipo_id);
      const where = { rutina_id_equipo_id: { rutina_id: routineId, equipo_id: dto.equipo_id } };

      if (await this.prisma.asignacionEquipo.findUnique({ where })) alreadyAssigned += 1;
      await this.prisma.asignacionEquipo.upsert({
        where,
        update: { fecha_asignacion: new Date() },
        create: { rutina_id: routineId, equipo_id: dto.equipo_id },
      });
      total += 1;
    }

    const assignments = await this.upsertAssignments(routineId, athleteIds);

    return {
      message: 'Rutina asignada exitosamente',
      total,
      nuevas: total - alreadyAssigned,
      assignments,
    };
  }

  async unassign(routineId: number, coachId: number, athleteId: number) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso sobre esta rutina');

    await this.prisma.asignacionRutina.deleteMany({
      where: {
        rutina_id: routineId,
        usuario_id: athleteId,
      },
    });

    return { message: 'Asignación removida con éxito' };
  }

  async unassignTeam(routineId: number, coachId: number, teamId: number) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso sobre esta rutina');

    await this.prisma.asignacionEquipo.deleteMany({
      where: {
        rutina_id: routineId,
        equipo_id: teamId,
      },
    });

    return { message: 'Asignación removida con éxito' };
  }

  private async validateTeam(coachId: number, teamId: number) {
    const team = await this.prisma.equipo.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No administras este equipo');
  }

  private async validateAthletes(coachId: number, atletaIds: number[] = []): Promise<number[]> {
    const requestedIds = [...new Set(atletaIds)];
    if (requestedIds.length === 0) return [];

    const athletes = await this.prisma.usuario.findMany({
      where: { id: { in: requestedIds } },
      select: {
        id: true,
        rol: true,
        equipo: { select: { entrenador_id: true } },
      },
    });

    if (athletes.length !== requestedIds.length || athletes.some((athlete) => athlete.rol !== Rol.ATLETA)) {
      throw new NotFoundException('Uno o más usuarios no son atletas válidos');
    }

    if (athletes.some((athlete) => !coachManagesAthlete(coachId, athlete))) {
      throw new ForbiddenException('Solo puedes asignar rutinas a atletas de tus equipos o sin equipo');
    }

    return requestedIds;
  }

  private async upsertAssignments(routineId: number, athleteIds: number[]) {
    const assignments: any[] = [];
    for (const atletaId of athleteIds) {
      // Upsert para no duplicar si ya estaba asignado
      const assignment = await this.prisma.asignacionRutina.upsert({
        where: {
          rutina_id_usuario_id: {
            rutina_id: routineId,
            usuario_id: atletaId,
          },
        },
        update: { fecha_asignacion: new Date() },
        create: {
          rutina_id: routineId,
          usuario_id: atletaId,
          fecha_asignacion: new Date(),
        },
      });
      assignments.push(assignment);
    }
    return assignments;
  }
}
