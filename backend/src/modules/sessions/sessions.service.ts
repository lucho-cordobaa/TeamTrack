import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService, SesionFirestore } from '../../firebase/firebase.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { FinishSessionDto } from './dto/finish-session.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionsService {
  private readonly sessionStartLocks = new Map<number, Promise<void>>();

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  // RF-12, RB-06: Iniciar sesión de entrenamiento en tiempo real
  async start(athleteId: number, dto: StartSessionDto): Promise<SesionFirestore> {
    const previousStart = this.sessionStartLocks.get(athleteId);
    let releaseLock!: () => void;
    const currentStart = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.sessionStartLocks.set(athleteId, currentStart);

    try {
      if (previousStart) await previousStart;
      return await this.startExclusive(athleteId, dto);
    } finally {
      releaseLock();
      if (this.sessionStartLocks.get(athleteId) === currentStart) {
        this.sessionStartLocks.delete(athleteId);
      }
    }
  }

  private async startExclusive(athleteId: number, dto: StartSessionDto): Promise<SesionFirestore> {
    // RB-06: Un Atleta no puede tener dos sesiones activas a la vez
    const active = await this.firebaseService.getActiveSessionForAthlete(athleteId);
    if (active) {
      throw new ConflictException(
        'Ya tienes una sesión de entrenamiento activa en curso. Finalízala antes de iniciar otra (RB-06).',
      );
    }

    const athlete = await this.prisma.usuario.findUnique({
      where: { id: athleteId },
      include: { equipo: true },
    });
    if (!athlete) throw new NotFoundException('Atleta no encontrado');

    // Verificar que la rutina esté asignada
    const assignment = await this.prisma.asignacionRutina.findUnique({
      where: {
        rutina_id_usuario_id: {
          rutina_id: dto.rutina_id,
          usuario_id: athleteId,
        },
      },
      include: {
        rutina: {
          include: {
            ejercicios: {
              include: { ejercicio: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Esta rutina no está asignada a tu usuario');
    }

    const rutina = assignment.rutina;
    const sessionId = randomUUID();

    const sessionDoc: SesionFirestore = {
      id: sessionId,
      atleta_id: athleteId,
      atleta_nombre: athlete.nombre,
      equipo_id: athlete.equipo_id || 0,
      rutina_id: rutina.id,
      rutina_nombre: rutina.nombre,
      estado: 'en_curso',
      fecha_inicio: new Date().toISOString(),
      fecha_fin: null,
      ejercicios: rutina.ejercicios.map((re) => {
        const seriesList = [];
        for (let i = 1; i <= re.series; i++) {
          seriesList.push({
            numero: i,
            peso_kg: 0,
            repeticiones_realizadas: re.repeticiones,
            completada: false,
          });
        }
        return {
          ejercicio_id: re.ejercicio_id,
          nombre: re.ejercicio.nombre,
          series_prescriptas: re.series,
          repeticiones_prescriptas: re.repeticiones,
          series: seriesList,
        };
      }),
    };

    return this.firebaseService.createSession(sessionDoc);
  }

  async getActive(athleteId: number): Promise<SesionFirestore | null> {
    return this.firebaseService.getActiveSessionForAthlete(athleteId);
  }

  // RF-13: Registro en tiempo real del peso levantado y reps en cada serie
  async updateSet(athleteId: number, sessionId: string, dto: UpdateSetDto): Promise<SesionFirestore> {
    const session = await this.firebaseService.getSessionById(sessionId);
    if (!session) throw new NotFoundException('Sesión no encontrada');

    if (session.atleta_id !== athleteId) {
      throw new ForbiddenException('No tienes acceso a esta sesión de entrenamiento');
    }

    if (session.estado !== 'en_curso') {
      throw new BadRequestException('Esta sesión ya ha sido finalizada');
    }

    const ejIndex = session.ejercicios.findIndex((e) => e.ejercicio_id === dto.ejercicio_id);
    if (ejIndex === -1) {
      throw new NotFoundException('Ejercicio no perteneciente a esta sesión');
    }

    const serieIndex = session.ejercicios[ejIndex].series.findIndex(
      (s) => s.numero === dto.numero_serie,
    );

    if (serieIndex === -1) {
      session.ejercicios[ejIndex].series.push({
        numero: dto.numero_serie,
        peso_kg: dto.peso_kg,
        repeticiones_realizadas: dto.repeticiones_realizadas,
        completada: dto.completada,
      });
    } else {
      session.ejercicios[ejIndex].series[serieIndex] = {
        numero: dto.numero_serie,
        peso_kg: dto.peso_kg,
        repeticiones_realizadas: dto.repeticiones_realizadas,
        completada: dto.completada,
      };
    }

    const updated = await this.firebaseService.updateSession(sessionId, {
      ejercicios: session.ejercicios,
    });

    return updated!;
  }

  // RF-14, RB-08, RB-09: Finalizar sesión y persistir datos en MySQL
  async finish(athleteId: number, sessionId: string, dto?: FinishSessionDto) {
    const session = await this.firebaseService.getSessionById(sessionId);
    if (!session) throw new NotFoundException('Sesión no encontrada');

    if (session.atleta_id !== athleteId) {
      throw new ForbiddenException('No tienes acceso a esta sesión');
    }

    if (session.estado !== 'en_curso') {
      throw new BadRequestException('Esta sesión ya se encuentra finalizada');
    }

    // Recopilar series completadas
    const seriesToPersist: {
      usuario_id: number;
      ejercicio_id: number;
      rutina_id: number;
      numero_serie: number;
      peso_kg: number;
      repeticiones_realizadas: number;
      fecha: Date;
    }[] = [];

    const now = new Date();

    if (dto?.series_completadas && dto.series_completadas.length > 0) {
      for (const s of dto.series_completadas) {
        if (s.completada) {
          seriesToPersist.push({
            usuario_id: athleteId,
            ejercicio_id: s.ejercicio_id,
            rutina_id: session.rutina_id,
            numero_serie: s.numero_serie,
            peso_kg: s.peso_kg,
            repeticiones_realizadas: s.repeticiones_realizadas,
            fecha: now,
          });
        }
      }
    } else {
      for (const ej of session.ejercicios) {
        for (const serie of ej.series) {
          if (serie.completada) {
            seriesToPersist.push({
              usuario_id: athleteId,
              ejercicio_id: ej.ejercicio_id,
              rutina_id: session.rutina_id,
              numero_serie: serie.numero,
              peso_kg: serie.peso_kg,
              repeticiones_realizadas: serie.repeticiones_realizadas,
              fecha: now,
            });
          }
        }
      }
    }

    // Persistir en MySQL dentro de una transacción Prisma
    await this.prisma.$transaction(async (tx) => {
      if (seriesToPersist.length > 0) {
        await tx.serieRealizada.createMany({
          data: seriesToPersist,
        });
      }

      // Asegurar asistencia para hoy si no estaba registrada aún
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const asistenciaExistente = await tx.asistencia.findUnique({
        where: {
          usuario_id_fecha: {
            usuario_id: athleteId,
            fecha: today,
          },
        },
      });

      if (!asistenciaExistente) {
        await tx.asistencia.create({
          data: {
            usuario_id: athleteId,
            fecha: today,
            presente: true,
          },
        });
      }
    });

    // Actualizar estado en Firestore a 'finalizada' (RB-09)
    await this.firebaseService.updateSession(sessionId, {
      estado: 'finalizada',
      fecha_fin: now.toISOString(),
    });

    return {
      message: 'Sesión finalizada y series persistidas con éxito en MySQL.',
      series_guardadas: seriesToPersist.length,
      sessionId,
    };
  }

  // RF-15: Monitoreo en tiempo real de sesiones activas del equipo para el entrenador
  async getActiveTeamSessions(coachId: number, teamId: number): Promise<SesionFirestore[]> {
    const team = await this.prisma.equipo.findUnique({
      where: { id: teamId },
      include: { atletas: true },
    });

    if (!team) throw new NotFoundException('Equipo no encontrado');
    if (team.entrenador_id !== coachId) throw new ForbiddenException('No administras este equipo');

    const athleteIds = team.atletas.map((a) => a.id);
    return this.firebaseService.getActiveSessionsForTeam(athleteIds);
  }
}
