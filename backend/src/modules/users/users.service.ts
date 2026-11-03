import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Rol } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Atletas que el entrenador puede gestionar: los de sus equipos y los que aún no tienen equipo
  async findAllAthletes(coachId: number) {
    return this.prisma.usuario.findMany({
      where: {
        rol: Rol.ATLETA,
        OR: [{ equipo_id: null }, { equipo: { entrenador_id: coachId } }],
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        equipo_id: true,
        equipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        createdAt: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findUnassignedAthletes() {
    return this.prisma.usuario.findMany({
      where: {
        rol: Rol.ATLETA,
        equipo_id: null,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        equipo_id: true,
        equipo: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}
