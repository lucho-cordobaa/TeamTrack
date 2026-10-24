import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { AssignRoutineDto } from './dto/assign-routine.dto';
import { Rol, TipoRutina } from '@prisma/client';

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService) {}

  async create(coachId: number, dto: CreateRoutineDto) {
    return this.prisma.rutina.create({
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
  }

  async findAllForUser(user: { id: number; rol: Rol; equipo_id?: number | null }) {
    if (user.rol === Rol.ENTRENADOR) {
      return this.prisma.rutina.findMany({
        where: { creado_por: user.id },
        include: {
          equipo_origen: {
            select: { id: true, nombre: true },
          },
          ejercicios: {
            include: { ejercicio: true },
            orderBy: { orden: 'asc' },
          },
          _count: {
            select: { asignaciones: true, ejercicios: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Para atletas: buscar rutinas asignadas mediante AsignacionRutina (RB-04)
    const asignaciones = await this.prisma.asignacionRutina.findMany({
      where: { usuario_id: user.id },
      include: {
        rutina: {
          include: {
            entrenador: {
              select: { id: true, nombre: true },
            },
            equipo_origen: {
              select: { id: true, nombre: true },
            },
            ejercicios: {
              include: { ejercicio: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
      orderBy: { fecha_asignacion: 'desc' },
    });

    return asignaciones.map((a) => ({
      ...a.rutina,
      fecha_asignacion: a.fecha_asignacion,
    }));
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
      },
    });

    if (!routine) {
      throw new NotFoundException('Rutina no encontrada');
    }

    if (user.rol === Rol.ENTRENADOR && routine.creado_por !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver esta rutina');
    }

    if (user.rol === Rol.ATLETA) {
      const isAssigned = routine.asignaciones.some((a) => a.usuario_id === user.id);
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

  // RF-09, RB-04, RB-05: Asignar rutina individual o a todo el equipo
  async assign(routineId: number, coachId: number, dto: AssignRoutineDto) {
    const routine = await this.prisma.rutina.findUnique({ where: { id: routineId } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.creado_por !== coachId) throw new ForbiddenException('No tienes permiso para asignar esta rutina');

    const athleteIdsToAssign = new Set<number>();

    // 1. Si se pasó un equipo_id (asignación grupal, RB-05)
    if (dto.equipo_id) {
      const team = await this.prisma.equipo.findUnique({
        where: { id: dto.equipo_id },
        include: { atletas: true },
      });
      if (!team) throw new NotFoundException('Equipo no encontrado');
      if (team.entrenador_id !== coachId) throw new ForbiddenException('No administras este equipo');

      team.atletas.forEach((a) => athleteIdsToAssign.add(a.id));
    }

    // 2. Si se pasaron IDs específicos de atletas
    if (dto.atleta_ids && dto.atleta_ids.length > 0) {
      const requestedIds = [...new Set(dto.atleta_ids)];
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

      const hasAthleteFromAnotherTeam = athletes.some(
        (athlete) => athlete.equipo?.entrenador_id !== coachId,
      );
      if (hasAthleteFromAnotherTeam) {
        throw new ForbiddenException('Solo puedes asignar rutinas a atletas de tus equipos');
      }

      requestedIds.forEach((id) => athleteIdsToAssign.add(id));
    }

    if (athleteIdsToAssign.size === 0) {
      throw new BadRequestException('Debes indicar al menos un atleta o un equipo con atletas para asignar');
    }

    const createdAssignments: any[] = [];
    for (const atletaId of athleteIdsToAssign) {
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
      createdAssignments.push(assignment);
    }

    return {
      message: `Rutina asignada exitosamente a ${createdAssignments.length} atleta(s)`,
      total: createdAssignments.length,
      assignments: createdAssignments,
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
}
