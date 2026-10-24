import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Rutina, Ejercicio, Equipo, Usuario, TipoRutina } from '../types';
import { FileText, Plus, Trash2, UserPlus, Play, Check, ChevronDown, Dumbbell, Users } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

interface RoutinesPageProps {
  onStartWorkout: (routineId: number) => void;
}

export const RoutinesPage: React.FC<RoutinesPageProps> = ({ onStartWorkout }) => {
  const { isCoach, isAthlete } = useAuth();
  const [routines, setRoutines] = useState<Rutina[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Ejercicio[]>([]);
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [athletes, setAthletes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Crear Rutina (RF-05, RF-06)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoRutina>('INDIVIDUAL');
  const [equipoOrigenId, setEquipoOrigenId] = useState<number | ''>('');
  const [selectedExercises, setSelectedExercises] = useState<
    { ejercicio_id: number; series: number; repeticiones: number; orden: number }[]
  >([]);

  // Modal: Asignar Rutina (RF-09, RB-04, RB-05)
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [routineToAssign, setRoutineToAssign] = useState<Rutina | null>(null);
  const [assignTarget, setAssignTarget] = useState<'TEAM' | 'ATHLETES'>('TEAM');
  const [targetTeamId, setTargetTeamId] = useState<number | ''>('');
  const [targetAthleteIds, setTargetAthleteIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routinesRes, exRes] = await Promise.all([
        api.get('/routines'),
        api.get('/exercises'),
      ]);
      setRoutines(routinesRes.data);
      setExercisesCatalog(exRes.data);

      if (isCoach) {
        const [teamsRes, athletesRes] = await Promise.all([
          api.get('/teams'),
          api.get('/users/athletes'),
        ]);
        setTeams(teamsRes.data);
        setAthletes(athletesRes.data);
      }
    } catch (err) {
      console.error('Error cargando rutinas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isCoach]);

  const handleAddExerciseToRoutine = (ejercicioId: number) => {
    const existing = selectedExercises.find((e) => e.ejercicio_id === ejercicioId);
    if (existing) return;

    setSelectedExercises([
      ...selectedExercises,
      {
        ejercicio_id: ejercicioId,
        series: 3,
        repeticiones: 10,
        orden: selectedExercises.length + 1,
      },
    ]);
  };

  const handleRemoveExerciseFromRoutine = (ejercicioId: number) => {
    const filtered = selectedExercises
      .filter((e) => e.ejercicio_id !== ejercicioId)
      .map((item, idx) => ({ ...item, orden: idx + 1 }));
    setSelectedExercises(filtered);
  };

  const handleUpdateExerciseRow = (
    ejercicioId: number,
    field: 'series' | 'repeticiones',
    value: number,
  ) => {
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.ejercicio_id === ejercicioId ? { ...e, [field]: Math.max(1, value) } : e,
      ),
    );
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (selectedExercises.length === 0) {
      setError('Debes agregar al menos un ejercicio a la rutina.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.post('/routines', {
        nombre: nombre.trim(),
        tipo,
        equipo_origen_id: tipo === 'GRUPAL' && equipoOrigenId ? Number(equipoOrigenId) : undefined,
        ejercicios: selectedExercises,
      });

      setIsCreateOpen(false);
      setNombre('');
      setTipo('INDIVIDUAL');
      setEquipoOrigenId('');
      setSelectedExercises([]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear rutina');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoutine = async (routineId: number) => {
    if (!confirm('¿Deseas eliminar esta rutina?')) return;
    try {
      await api.delete(`/routines/${routineId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar rutina');
    }
  };

  const handleAssignRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineToAssign) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {};
      if (assignTarget === 'TEAM' && targetTeamId) {
        payload.equipo_id = Number(targetTeamId);
      } else if (assignTarget === 'ATHLETES' && targetAthleteIds.length > 0) {
        payload.atleta_ids = targetAthleteIds;
      } else {
        setError('Selecciona un equipo o al menos un atleta');
        setSubmitting(false);
        return;
      }

      await api.post(`/routines/${routineToAssign.id}/assign`, payload);
      setIsAssignOpen(false);
      setRoutineToAssign(null);
      setTargetTeamId('');
      setTargetAthleteIds([]);
      alert('¡Rutina asignada exitosamente!');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al asignar rutina');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAthleteSelection = (id: number) => {
    setTargetAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isCoach ? 'Constructor & Asignación de Rutinas' : 'Mis Rutinas de Entrenamiento'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isCoach
              ? 'Diseña planes de entrenamiento, personaliza series y repeticiones, y asígnalas a atletas o equipos completos.'
              : 'Selecciona una rutina para comenzar tu sesión guiada en tiempo real.'}
          </p>
        </div>

        {isCoach && (
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setError(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus size={16} />
            <span>Crear Rutina</span>
          </button>
        )}
      </div>

      {/* Routine Cards Grid */}
      {routines.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900 border border-slate-800">
          <FileText className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-bold text-white">No hay rutinas disponibles</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isCoach
              ? 'Crea tu primera rutina de entrenamiento con los ejercicios del catálogo.'
              : 'Aún no tienes rutinas asignadas por tu entrenador.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={routine.tipo === 'GRUPAL' ? 'purple' : 'blue'}>
                        {routine.tipo === 'GRUPAL' ? 'Grupal' : 'Individual'}
                      </Badge>
                      {routine.equipo_origen && (
                        <span className="text-xs text-slate-400">
                          ({routine.equipo_origen.nombre})
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white mt-1.5">{routine.nombre}</h3>
                  </div>

                  {isCoach && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          setRoutineToAssign(routine);
                          setIsAssignOpen(true);
                          setError(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Asignar a atletas o equipo"
                      >
                        <UserPlus size={14} />
                        <span>Asignar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Eliminar rutina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Exercises in routine */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ejercicios ({routine.ejercicios?.length || 0})
                  </p>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {routine.ejercicios?.map((re, idx) => (
                      <div
                        key={re.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                            {re.orden || idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-white">{re.ejercicio.nombre}</p>
                            <p className="text-[11px] text-slate-500">{re.ejercicio.grupo_muscular}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {re.series} series × {re.repeticiones} reps
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div className="pt-2 border-t border-slate-800">
                {isAthlete && (
                  <button
                    onClick={() => onStartWorkout(routine.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                  >
                    <Play size={15} />
                    <span>Iniciar Entrenamiento con esta Rutina</span>
                  </button>
                )}

                {isCoach && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {routine.asignaciones?.length || routine._count?.asignaciones || 0} Atletas asignados
                    </span>
                    <button
                      onClick={() => {
                        setRoutineToAssign(routine);
                        setIsAssignOpen(true);
                      }}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Gestionar asignaciones →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CONSTRUCTOR DE RUTINAS (RF-05, RF-06) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Constructor de Rutina"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateRoutine} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Nombre de la Rutina
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Fuerza Máxima Piernas"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Tipo de Rutina
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoRutina)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="INDIVIDUAL">Individual (personalizada)</option>
                <option value="GRUPAL">Grupal (para todo el equipo)</option>
              </select>
            </div>
          </div>

          {tipo === 'GRUPAL' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Equipo de Origen
              </label>
              <select
                value={equipoOrigenId}
                onChange={(e) => setEquipoOrigenId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="">-- Selecciona equipo destinatario --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exercises selector & configurator */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Agregar Ejercicios del Catálogo
            </label>

            <div className="flex gap-2">
              <select
                id="exercisePicker"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddExerciseToRoutine(Number(e.target.value));
                    e.target.value = '';
                  }
                }}
              >
                <option value="" disabled>
                  -- Selecciona un ejercicio para agregarlo a la lista --
                </option>
                {exercisesCatalog.map((ej) => (
                  <option key={ej.id} value={ej.id}>
                    {ej.nombre} ({ej.grupo_muscular})
                  </option>
                ))}
              </select>
            </div>

            {/* List of configured exercises */}
            {selectedExercises.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center border border-dashed border-slate-800 rounded-xl">
                Aún no agregaste ejercicios. Selecciona uno en el menú superior.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedExercises.map((item) => {
                  const ejObj = exercisesCatalog.find((x) => x.id === item.ejercicio_id);
                  return (
                    <div
                      key={item.ejercicio_id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{ejObj?.nombre}</p>
                        <p className="text-[11px] text-slate-500">{ejObj?.grupo_muscular}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-slate-400 uppercase">Series</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={item.series}
                            onChange={(e) =>
                              handleUpdateExerciseRow(
                                item.ejercicio_id,
                                'series',
                                Number(e.target.value),
                              )
                            }
                            className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-white focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-slate-400 uppercase">Reps</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={item.repeticiones}
                            onChange={(e) =>
                              handleUpdateExerciseRow(
                                item.ejercicio_id,
                                'repeticiones',
                                Number(e.target.value),
                              )
                            }
                            className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-white focus:border-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseFromRoutine(item.ejercicio_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Crear Rutina Completa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASIGNAR RUTINA (RF-09, RB-04, RB-05) */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Asignar Rutina: ${routineToAssign?.nombre}`}
      >
        <form onSubmit={handleAssignRoutine} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setAssignTarget('TEAM')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                assignTarget === 'TEAM'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todo un Equipo (RB-05)
            </button>
            <button
              type="button"
              onClick={() => setAssignTarget('ATHLETES')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                assignTarget === 'ATHLETES'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Atletas Específicos
            </button>
          </div>

          {assignTarget === 'TEAM' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Seleccionar Equipo
              </label>
              <select
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="">-- Selecciona el equipo --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.atletas?.length || 0} atletas)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                RB-05: Al asignar a un equipo, se creará automáticamente un registro en <code>AsignacionRutina</code> para cada atleta del equipo.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Seleccionar Atletas
              </label>
              <div className="max-h-52 overflow-y-auto space-y-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {athletes.map((a) => {
                  const isChecked = targetAthleteIds.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => toggleAthleteSelection(a.id)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs transition ${
                        isChecked
                          ? 'bg-emerald-500/20 text-white border border-emerald-500/40 font-bold'
                          : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>{a.nombre}</span>
                      {isChecked && <Check size={16} className="text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? 'Asignando...' : 'Confirmar Asignación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
