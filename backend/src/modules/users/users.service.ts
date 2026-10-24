import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Rol } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllAthletes() {
    return this.prisma.usuario.findMany({
      where: { rol: Rol.ATLETA },
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
