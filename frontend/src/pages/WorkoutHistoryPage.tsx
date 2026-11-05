import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Usuario } from '../types';
import { Clock, Dumbbell, History } from 'lucide-react';

interface WorkoutHistoryEntry {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_segundos: number;
  rutina_nombre: string;
  rutina: { id: number; nombre: string } | null;
  series: {
    id: number;
    ejercicio_id: number;
    numero_serie: number;
    peso_kg: number | string;
    repeticiones_realizadas: number;
    ejercicio: { id: number; nombre: string; grupo_muscular: string };
  }[];
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${remainingSeconds} s`;
};

export const WorkoutHistoryPage: React.FC = () => {
  const { isCoach } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [athletes, setAthletes] = useState<Usuario[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCoach) return;
    api.get('/users/athletes')
      .then((response) => {
        setAthletes(response.data);
        setSelectedAthleteId(response.data[0]?.id ?? '');
        if (response.data.length === 0) setLoading(false);
      })
      .catch((error) => {
        console.error('Error cargando atletas:', error);
        setLoading(false);
      });
  }, [isCoach]);

  useEffect(() => {
    if (isCoach && !selectedAthleteId) return;
    setLoading(true);
    api.get('/sessions/history', isCoach ? { params: { athleteId: selectedAthleteId } } : undefined)
      .then((response) => setWorkouts(response.data))
      .catch((error) => console.error('Error cargando historial de entrenamientos:', error))
      .finally(() => setLoading(false));
  }, [isCoach, selectedAthleteId]);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Cargando historial...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Historial de Entrenamientos</h1>
        <p className="mt-1 text-sm text-slate-400">{isCoach ? 'Consulta las sesiones finalizadas y las series registradas por tus atletas.' : 'Consulta las sesiones finalizadas y cada serie que registraste.'}</p>
      </div>

      {isCoach && (
        <label className="flex items-center gap-3 text-sm text-slate-400">
          Atleta
          <select value={selectedAthleteId} onChange={(event) => setSelectedAthleteId(Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200">
            {athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.nombre}</option>)}
          </select>
        </label>
      )}

      {workouts.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 px-5 py-16 text-center">
          <History className="mx-auto mb-3 text-slate-600" size={38} />
          <h2 className="font-bold text-white">Todavía no hay entrenamientos guardados</h2>
          <p className="mt-1 text-sm text-slate-500">Cuando finalice una sesión, aparecerá acá con sus series y duración.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const exercises = new Map<number, WorkoutHistoryEntry['series']>();
            for (const set of workout.series) {
              exercises.set(set.ejercicio_id, [...(exercises.get(set.ejercicio_id) ?? []), set]);
            }
            const orderedExercises = Array.from(exercises.values());

            return (
              <article key={workout.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{workout.rutina_nombre}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(workout.fecha_inicio).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                    <span className="inline-flex items-center gap-1.5"><Clock size={15} className="text-emerald-400" />{formatDuration(workout.duracion_segundos)}</span>
                    <span>{workout.series.length} {workout.series.length === 1 ? 'serie' : 'series'}</span>
                  </div>
                </header>

                {orderedExercises.length === 0 ? (
                  <p className="text-sm italic text-slate-500">No se registraron series en esta sesión.</p>
                ) : (
                  <div className="space-y-3">
                    {orderedExercises.map((sets) => {
                      const exercise = sets[0].ejercicio;
                      return (
                        <section key={exercise.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Dumbbell size={15} className="text-emerald-400" />
                            <h3 className="text-sm font-bold text-white">{exercise.nombre}</h3>
                            <span className="text-xs text-slate-500">{exercise.grupo_muscular}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sets.map((set) => (
                              <span key={set.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                                Serie {set.numero_serie}: <strong className="text-emerald-400">{Number(set.peso_kg)} kg</strong> × {set.repeticiones_realizadas} reps
                              </span>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
