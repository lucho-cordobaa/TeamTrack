import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Rutina, SesionEntrenamiento } from '../types';
import {
  Play,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  RotateCcw,
  Square,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface ActiveWorkoutPageProps {
  initialRoutineId?: number | null;
  onFinishWorkout: () => void;
}

export const ActiveWorkoutPage: React.FC<ActiveWorkoutPageProps> = ({
  initialRoutineId,
  onFinishWorkout,
}) => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Rutina[]>([]);
  const [activeSession, setActiveSession] = useState<SesionEntrenamiento | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | ''>(
    initialRoutineId || '',
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workout duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Modal: Confirmación de finalización
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishSuccess, setFinishSuccess] = useState<any | null>(null);

  // Cargar sesión activa o rutinas asignadas
  const loadWorkoutState = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Verificar si el atleta ya tiene una sesión activa (RB-06)
      const activeRes = await api.get('/sessions/active').catch(() => ({ data: null }));
      if (activeRes.data && activeRes.data.estado === 'en_curso') {
        setActiveSession(activeRes.data);
      } else {
        setActiveSession(null);
        // Cargar rutinas para que pueda iniciar una
        const routinesRes = await api.get('/routines');
        setRoutines(routinesRes.data);
        if (routinesRes.data.length > 0 && !selectedRoutineId) {
          setSelectedRoutineId(routinesRes.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error cargando estado de entrenamiento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkoutState();
  }, [initialRoutineId]);

  // Timer tick
  useEffect(() => {
    let timer: any = null;
    if (activeSession && activeSession.estado === 'en_curso') {
      const startTime = new Date(activeSession.fecha_inicio).getTime();
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSession]);

  // RF-12, RB-06: Iniciar Sesión de Entrenamiento en tiempo real
  const handleStartSession = async () => {
    if (!selectedRoutineId) {
      setError('Por favor selecciona una rutina para iniciar');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await api.post('/sessions/start', {
        rutina_id: Number(selectedRoutineId),
      });
      setActiveSession(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No se pudo iniciar el entrenamiento. Verifica si ya tienes una sesión activa (RB-06).',
      );
    } finally {
      setActionLoading(false);
    }
  };

  // RF-13: Actualizar serie en tiempo real (peso y repeticiones)
  const handleUpdateSet = async (
    ejercicioId: number,
    numeroSerie: number,
    pesoKg: number,
    reps: number,
    completada: boolean,
  ) => {
    if (!activeSession) return;

    // Actualización optimista inmediata en UI
    const updatedEjercicios = activeSession.ejercicios.map((ej) => {
      if (ej.ejercicio_id === ejercicioId) {
        return {
          ...ej,
          series: ej.series.map((s) => {
            if (s.numero === numeroSerie) {
              return {
                ...s,
                peso_kg: Math.max(0, pesoKg),
                repeticiones_realizadas: Math.max(0, reps),
                completada,
              };
            }
            return s;
          }),
        };
      }
      return ej;
    });

    setActiveSession({
      ...activeSession,
      ejercicios: updatedEjercicios,
    });

    // Enviar a backend / Firestore en tiempo real (RF-13)
    try {
      await api.patch(`/sessions/${activeSession.id}/set`, {
        ejercicio_id: ejercicioId,
        numero_serie: numeroSerie,
        peso_kg: Math.max(0, pesoKg),
        repeticiones_realizadas: Math.max(0, reps),
        completada,
      });
    } catch (err) {
      console.error('Error sincronizando serie en tiempo real:', err);
    }
  };

  // RF-14, RB-08, RB-09: Finalizar sesión y persistir en MySQL
  const handleConfirmFinishSession = async () => {
    if (!activeSession) return;

    try {
      setActionLoading(true);
      setError(null);

      // Recopilar todas las series completadas
      const completedSetsList: any[] = [];
      for (const ej of activeSession.ejercicios) {
        for (const s of ej.series) {
          if (s.completada) {
            completedSetsList.push({
              ejercicio_id: ej.ejercicio_id,
              numero_serie: s.numero,
              peso_kg: s.peso_kg,
              repeticiones_realizadas: s.repeticiones_realizadas,
              completada: true,
            });
          }
        }
      }

      const res = await api.post(`/sessions/${activeSession.id}/finish`, {
        series_completadas: completedSetsList,
      });

      setFinishSuccess(res.data);
      setIsFinishModalOpen(false);
      setActiveSession(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al finalizar sesión');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Sincronizando sesión de entrenamiento...</p>
      </div>
    );
  }

  // PANTALLA: FINALIZACIÓN EXITOSA
  if (finishSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 size={44} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">¡Entrenamiento Completado!</h2>
          <p className="text-slate-400 text-sm mt-1">
            {finishSuccess.message} Se guardaron {finishSuccess.series_guardadas} series en MySQL y la sesión de Firestore pasó a estado finalizada (RB-09).
          </p>
        </div>

        <button
          onClick={() => {
            setFinishSuccess(null);
            onFinishWorkout();
          }}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition"
        >
          Volver a Mi Panel
        </button>
      </div>
    );
  }

  // PANTALLA: SELECCIÓN DE RUTINA PARA INICIAR (SI NO HAY SESIÓN ACTIVA)
  if (!activeSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Dumbbell size={24} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Iniciar Sesión de Entrenamiento</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Selecciona una de tus rutinas asignadas. El cronómetro y la sincronización con Firestore se activarán de inmediato.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {routines.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <p className="text-slate-300 font-semibold text-sm">No tienes rutinas asignadas actualmente.</p>
            <p className="text-xs text-slate-500">
              Pide a tu entrenador que te asigne una rutina desde el panel de control.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Selecciona la Rutina a Realizar
              </label>
              <div className="space-y-3">
                {routines.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoutineId(r.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      selectedRoutineId === r.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold">{r.nombre}</h4>
                        <Badge variant={r.tipo === 'GRUPAL' ? 'purple' : 'blue'}>
                          {r.tipo}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {r.ejercicios?.length || 0} ejercicios programados
                      </p>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                        selectedRoutineId === r.id
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-700'
                      }`}
                    >
                      {selectedRoutineId === r.id && <Check size={14} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={actionLoading || !selectedRoutineId}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Play size={18} />
              <span>{actionLoading ? 'Iniciando en Firestore...' : '¡Comenzar a Entrenar Ahora!'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // PANTALLA: ENTRENAMIENTO ACTIVO EN TIEMPO REAL (RF-13, RF-14, RNF-02)
  const totalSets = activeSession.ejercicios.reduce((acc, ej) => acc + ej.series.length, 0);
  const completedSets = activeSession.ejercicios.reduce(
    (acc, ej) => acc + ej.series.filter((s) => s.completada).length,
    0,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Sticky Top Workout Control Bar */}
      <div className="sticky top-20 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              En Vivo (Firestore)
            </span>
          </div>
          <h2 className="text-base font-black text-white truncate">{activeSession.rutina_nombre}</h2>
        </div>

        <div className="flex items-center space-x-3">
          {/* Timer */}
          <div className="flex items-center space-x-1.5 font-mono text-xs sm:text-sm font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-white">
            <Clock size={15} className="text-emerald-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Finish Button */}
          <button
            onClick={() => setIsFinishModalOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
          >
            <Square size={13} className="fill-white" />
            <span>Finalizar</span>
          </button>
        </div>
      </div>

      {/* Progress pill */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Progreso de la sesión</span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {completedSets} de {totalSets} series ({totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%)
        </span>
      </div>

      {/* EXERCISES & TACTILE SETS LIST */}
      <div className="space-y-6">
        {activeSession.ejercicios.map((ej) => (
          <div
            key={ej.ejercicio_id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">{ej.nombre}</h3>
                <p className="text-xs text-slate-400">
                  Prescripción: {ej.series_prescriptas} series × {ej.repeticiones_prescriptas} reps
                </p>
              </div>
              <Badge variant="slate">
                {ej.series.filter((s) => s.completada).length}/{ej.series_prescriptas} listas
              </Badge>
            </div>

            {/* Sets list */}
            <div className="space-y-3">
              {ej.series.map((serie) => (
                <div
                  key={serie.numero}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    serie.completada
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950 border-slate-800/90'
                  }`}
                >
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                        serie.completada
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {serie.numero}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Serie {serie.numero}
                    </span>
                  </div>

                  {/* Input Controls (Weight & Reps) */}
                  <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Weight (kg) */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSet(
                            ej.ejercicio_id,
                            serie.numero,
                            Math.max(0, serie.peso_kg - 2.5),
                            serie.repeticiones_realizadas,
                            serie.completada,
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                      >
                        <Minus size={12} />
                      </button>

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={serie.peso_kg}
                          onChange={(e) =>
                            handleUpdateSet(
                              ej.ejercicio_id,
                              serie.numero,
                              parseFloat(e.target.value) || 0,
                              serie.repeticiones_realizadas,
                              serie.completada,
                            )
                          }
                          className="w-14 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">kg</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSet(
                            ej.ejercicio_id,
                            serie.numero,
                            serie.peso_kg + 2.5,
                            serie.repeticiones_realizadas,
                            serie.completada,
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Repetitions */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSet(
                            ej.ejercicio_id,
                            serie.numero,
                            serie.peso_kg,
                            Math.max(0, serie.repeticiones_realizadas - 1),
                            serie.completada,
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                      >
                        <Minus size={12} />
                      </button>

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          value={serie.repeticiones_realizadas}
                          onChange={(e) =>
                            handleUpdateSet(
                              ej.ejercicio_id,
                              serie.numero,
                              serie.peso_kg,
                              parseInt(e.target.value) || 0,
                              serie.completada,
                            )
                          }
                          className="w-10 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">reps</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSet(
                            ej.ejercicio_id,
                            serie.numero,
                            serie.peso_kg,
                            serie.repeticiones_realizadas + 1,
                            serie.completada,
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Set Complete Checkmark Button */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSet(
                          ej.ejercicio_id,
                          serie.numero,
                          serie.peso_kg,
                          serie.repeticiones_realizadas,
                          !serie.completada,
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        serie.completada
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Check size={14} />
                      <span>{serie.completada ? 'Hecha' : 'Completar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: FINALIZAR ENTRENAMIENTO */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="¿Finalizar Sesión de Entrenamiento?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Al finalizar, todas las series completadas se guardarán de forma permanente en la base de datos MySQL (
            <code className="text-emerald-400">SerieRealizada</code>), asegurando tu asistencia del día y actualizando el documento en Firestore a estado <span className="text-emerald-400 font-bold">finalizada</span>.
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Tiempo total entrenando:</span>
              <span className="font-mono text-white font-bold">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Series completadas:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {completedSets} de {totalSets}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsFinishModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Seguir Entrenando
            </button>
            <button
              type="button"
              onClick={handleConfirmFinishSession}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {actionLoading ? 'Guardando en MySQL...' : 'Confirmar y Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
