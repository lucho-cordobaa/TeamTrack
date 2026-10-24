export type Rol = 'ENTRENADOR' | 'ATLETA';
export type TipoRutina = 'INDIVIDUAL' | 'GRUPAL';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  equipo_id?: number | null;
  equipo?: {
    id: number;
    nombre: string;
  } | null;
  createdAt?: string;
}

export interface Equipo {
  id: number;
  nombre: string;
  entrenador_id: number;
  entrenador?: {
    id: number;
    nombre: string;
    email: string;
  };
  atletas?: Usuario[];
  rutinas_grupales?: Rutina[];
  _count?: {
    atletas: number;
    rutinas_grupales: number;
  };
  createdAt?: string;
}

export interface Ejercicio {
  id: number;
  nombre: string;
  grupo_muscular: string;
  descripcion: string;
  imagen_url: string;
  fuente_externa_id?: string | null;
}

export interface RutinaEjercicio {
  id: number;
  rutina_id: number;
  ejercicio_id: number;
  series: number;
  repeticiones: number;
  orden: number;
  ejercicio: Ejercicio;
}

export interface Rutina {
  id: number;
  nombre: string;
  tipo: TipoRutina;
  creado_por: number;
  equipo_origen_id?: number | null;
  equipo_origen?: {
    id: number;
    nombre: string;
  } | null;
  ejercicios: RutinaEjercicio[];
  asignaciones?: {
    id: number;
    usuario_id: number;
    fecha_asignacion: string;
    usuario?: {
      id: number;
      nombre: string;
      email: string;
    };
  }[];
  _count?: {
    asignaciones: number;
    ejercicios: number;
  };
  fecha_asignacion?: string;
}

export interface Asistencia {
  id: number;
  usuario_id: number;
  fecha: string;
  presente: boolean;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
  };
}

export interface SerieRealizada {
  id: number;
  usuario_id: number;
  ejercicio_id: number;
  rutina_id: number;
  numero_serie: number;
  peso_kg: number;
  repeticiones_realizadas: number;
  fecha: string;
}

export interface SesionEntrenamiento {
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

export interface PuntoProgreso {
  fecha: string;
  peso_maximo: number;
  repeticiones_totales: number;
  series_realizadas: number;
}
