import { ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { FreeExercise, loadExerciseDataset, toExerciseData } from './exercise-dataset';

@Injectable()
export class ExercisesService implements OnApplicationBootstrap {
  private dataset: FreeExercise[] | null = null;
  private restoring: Promise<void> | null = null;

  constructor(private prisma: PrismaService) {}

  onApplicationBootstrap() {
    return this.restoreDataset();
  }

  // El dataset debe estar siempre disponible: se vuelven a crear los ejercicios que falten,
  // sin pisar los que un entrenador haya editado. Un fallo acá no debe impedir el ingreso.
  restoreDataset(): Promise<void> {
    if (!this.restoring) {
      this.restoring = this.insertMissingDatasetExercises()
        .catch((err) => console.error('No se pudo restaurar el dataset de ejercicios:', err))
        .finally(() => {
          this.restoring = null;
        });
    }
    return this.restoring;
  }

  private async insertMissingDatasetExercises() {
    this.dataset = this.dataset ?? loadExerciseDataset();

    const existing = await this.prisma.ejercicio.findMany({
      where: { fuente_externa_id: { not: null } },
      select: { fuente_externa_id: true },
    });
    const existingIds = new Set(existing.map((exercise) => exercise.fuente_externa_id));
    const missing = this.dataset.filter((exercise) => !existingIds.has(exercise.id));

    if (missing.length > 0) {
      await this.prisma.ejercicio.createMany({ data: missing.map(toExerciseData) });
    }
  }

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

  async update(id: number, dto: CreateExerciseDto) {
    await this.findOne(id);
    return this.prisma.ejercicio.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // Las relaciones borran en cascada: eliminar un ejercicio en uso alteraría rutinas e historiales
    const [rutinas, series] = await Promise.all([
      this.prisma.rutinaEjercicio.count({ where: { ejercicio_id: id } }),
      this.prisma.serieRealizada.count({ where: { ejercicio_id: id } }),
    ]);
    if (rutinas > 0 || series > 0) {
      throw new ConflictException(
        'No se puede eliminar este ejercicio porque ya se usa en rutinas o en el historial de los atletas. Puedes editarlo.',
      );
    }

    await this.prisma.ejercicio.delete({ where: { id } });
    return { message: 'Ejercicio eliminado con éxito' };
  }

  // Importación de catálogo desde dataset externo
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
