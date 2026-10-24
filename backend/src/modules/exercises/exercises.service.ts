import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, muscleGroup?: string, requestedPage?: number, requestedPageSize?: number) {
    const where: any = {};

    if (search && search.trim()) {
      where.nombre = { contains: search.trim() };
    }
    if (muscleGroup && muscleGroup.trim()) {
      where.grupo_muscular = muscleGroup.trim();
    }

    if (requestedPage === undefined && requestedPageSize === undefined) {
      return this.prisma.ejercicio.findMany({
        where,
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      });
    }

    const requestedSize = Number.isFinite(requestedPageSize) ? requestedPageSize! : 12;
    const requestedNumber = Number.isFinite(requestedPage) ? requestedPage! : 1;
    const pageSize = Math.min(Math.max(Math.trunc(requestedSize), 1), 48);
    const total = await this.prisma.ejercicio.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(Math.trunc(requestedNumber), 1), pageCount);
    const items = await this.prisma.ejercicio.findMany({
      where,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: number) {
    const exercise = await this.prisma.ejercicio.findUnique({
      where: { id },
    });
    if (!exercise) {
      throw new NotFoundException('Ejercicio no encontrado');
    }
    return exercise;
  }

  async getMuscleGroups(): Promise<string[]> {
    const groups = await this.prisma.ejercicio.findMany({
      select: { grupo_muscular: true },
      distinct: ['grupo_muscular'],
      orderBy: { grupo_muscular: 'asc' },
    });
    return groups.map((g) => g.grupo_muscular);
  }

  async create(dto: CreateExerciseDto) {
    return this.prisma.ejercicio.create({
      data: dto,
    });
  }

  // RF-08: Importación de catálogo desde dataset externo
  async importDataset(items: CreateExerciseDto[]) {
    const created: any[] = [];
    for (const item of items) {
      const existing = await this.prisma.ejercicio.findFirst({
        where: { nombre: item.nombre },
      });
      if (!existing) {
        const itemCreated = await this.prisma.ejercicio.create({ data: item });
        created.push(itemCreated);
      }
    }
    return {
      message: `Catálogo sincronizado. Se importaron ${created.length} nuevos ejercicios.`,
      importados: created.length,
    };
  }
}
