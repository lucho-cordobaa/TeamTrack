import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface SesionFirestore {
  id: string;
  atleta_id: number;
  atleta_nombre: string;
  equipo_id: number;
  rutina_id: number;
  rutina_nombre: string;
  estado: 'en_curso' | 'finalizada';
  fecha_inicio: string;
  fecha_fin: string | null;
  ejercicios: {
    ejercicio_id: number;
    nombre: string;
    series_prescriptas: number;
    repeticiones_prescriptas: number;
    series: {
      numero: number;
      peso_kg: number;
      repeticiones_realizadas: number;
      completada: boolean;
    }[];
  }[];
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firestore: admin.firestore.Firestore | null = null;
  private isConnected = false;

  // Fallback en memoria si Firebase no tiene credenciales de service account configuradas
  private inMemorySessions = new Map<string, SesionFirestore>();

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (projectId && clientEmail && privateKey && privateKey.includes('PRIVATE KEY')) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }
        this.firestore = admin.firestore();
        this.isConnected = true;
        this.logger.log('Conectado exitosamente a Firebase Firestore (Admin SDK).');
      } catch (error) {
        this.logger.warn(`No se pudo inicializar Firebase con credenciales. Usando modo emulado en memoria: ${error.message}`);
        this.isConnected = false;
      }
    } else {
      this.logger.warn('Credenciales de Firebase no detectadas en .env. Se activa el motor en memoria para desarrollo local.');
      this.isConnected = false;
    }
  }

  getFirestore() {
    return this.firestore;
  }

  async getActiveSessionForAthlete(atletaId: number): Promise<SesionFirestore | null> {
    if (this.isConnected && this.firestore) {
      const snap = await this.firestore
        .collection('sesiones_entrenamiento')
        .where('atleta_id', '==', atletaId)
        .where('estado', '==', 'en_curso')
        .limit(1)
        .get();

      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...(doc.data() as any) };
    }

    for (const session of this.inMemorySessions.values()) {
      if (session.atleta_id === atletaId && session.estado === 'en_curso') {
        return session;
      }
    }
    return null;
  }

  async getSessionById(sessionId: string): Promise<SesionFirestore | null> {
    if (this.isConnected && this.firestore) {
      const doc = await this.firestore.collection('sesiones_entrenamiento').doc(sessionId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...(doc.data() as any) };
    }
    return this.inMemorySessions.get(sessionId) || null;
  }

  async createSession(session: SesionFirestore): Promise<SesionFirestore> {
    if (this.isConnected && this.firestore) {
      const docRef = this.firestore.collection('sesiones_entrenamiento').doc(session.id);
      await docRef.set(session);
      return session;
    }
    this.inMemorySessions.set(session.id, session);
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SesionFirestore>): Promise<SesionFirestore | null> {
    if (this.isConnected && this.firestore) {
      const docRef = this.firestore.collection('sesiones_entrenamiento').doc(sessionId);
      await docRef.set(updates, { merge: true });
      const updated = await docRef.get();
      return { id: updated.id, ...(updated.data() as any) };
    }

    const current = this.inMemorySessions.get(sessionId);
    if (!current) return null;
    const merged = { ...current, ...updates };
    this.inMemorySessions.set(sessionId, merged);
    return merged;
  }

  async getActiveSessionsForTeam(atletaIds: number[]): Promise<SesionFirestore[]> {
    if (!atletaIds || atletaIds.length === 0) return [];

    if (this.isConnected && this.firestore) {
      // Firestore 'in' query allows up to 30 items
      const chunks: number[][] = [];
      for (let i = 0; i < atletaIds.length; i += 30) {
        chunks.push(atletaIds.slice(i, i + 30));
      }

      const results: SesionFirestore[] = [];
      for (const chunk of chunks) {
        const snap = await this.firestore
          .collection('sesiones_entrenamiento')
          .where('atleta_id', 'in', chunk)
          .where('estado', '==', 'en_curso')
          .get();

        snap.forEach((doc) => results.push({ id: doc.id, ...(doc.data() as any) }));
      }
      return results;
    }

    return Array.from(this.inMemorySessions.values()).filter(
      (s) => atletaIds.includes(s.atleta_id) && s.estado === 'en_curso',
    );
  }
}
