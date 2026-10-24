import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { Rol } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(coachId: number, dto: CreateTeamDto) {
    return this.prisma.equipo.create({
      data: {
        nombre: dto.nombre,
        entrenador_id: coachId,
      },
      include: {
        entrenador: {
          select: { id: true, nombre: true, email: true },
        },
        atletas: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });
  }

  async findAllForUser(user: { id: number; rol: Rol; equipo_id?: number | null }) {
    if (user.rol === Rol.ENTRENADOR) {
      return this.prisma.equipo.findMany({
        where: { entrenador_id: user.id },
        include: {
          entrenador: {
            select: { id: true, nombre: true, email: true },
          },
          atletas: {
            select: { id: true, nombre: true, email: true },
          },
          _count: {
            select: { atletas: true, rutinas_grupales: true },
          },
        },
        orderBy: { nombre: 'asc' },
      });
    }

    // Si es atleta, devuelve el equipo al que pertenece
    if (!user.equipo_id) return [];
    return this.prisma.equipo.findMany({
      where: { id: user.equipo_id },
      include: {
        entrenador: {
          select: { id: true, nombre: true, email: true },
        },
        atletas: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });
  }

  async findOne(teamId: number, user: { id: number; rol: Rol; equipo_id?: number | null }) {
    const team = await this.prisma.equipo.findUnique({
      where: { id: teamId },
      include: {
        entrenador: {
          select: { id: true, nombre: true, email: true },
        },
        atletas: {
          select: { id: true, nombre: true, email: true, createdAt: true },
        },
        rutinas_grupales: {
          include: {
            ejercicios: {
              include: { ejercicio: true },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    if (user.rol === Rol.ENTRENADOR && team.entrenador_id !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver este equipo');
    }

    if (user.rol === Rol.ATLETA && team.id !== user.equipo_id) {
      throw new ForbiddenException('No perteneces a este equipo');
    }

    return team;
  }

  async update(teamId: number, coachId: number, dto: CreateTeamDto) {
    const team = await this.prisma.equipo.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No tienes permiso para modificar este equipo');

    return this.prisma.equipo.update({
      where: { id: teamId },
      data: { nombre: dto.nombre },
    });
  }

  async remove(teamId: number, coachId: number) {
    const team = await this.prisma.equipo.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No tienes permiso para eliminar este equipo');

    return this.prisma.equipo.delete({ where: { id: teamId } });
  }

  async addAthlete(teamId: number, coachId: number, atletaId: number) {
    const team = await this.prisma.equipo.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No tienes permiso sobre este equipo');

    const athlete = await this.prisma.usuario.findUnique({ where: { id: atletaId } });
    if (!athlete || athlete.rol !== Rol.ATLETA) {
      throw new NotFoundException('Atleta no encontrado o inválido');
    }

    return this.prisma.usuario.update({
      where: { id: atletaId },
      data: { equipo_id: teamId },
      select: {
        id: true,
        nombre: true,
        email: true,
        equipo_id: true,
      },
    });
  }

  async removeAthlete(teamId: number, coachId: number, atletaId: number) {
    const team = await this.prisma.equipo.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No tienes permiso sobre este equipo');

    return this.prisma.usuario.update({
      where: { id: atletaId },
      data: { equipo_id: null },
      select: {
        id: true,
        nombre: true,
        email: true,
        equipo_id: true,
      },
    });
  }
}
