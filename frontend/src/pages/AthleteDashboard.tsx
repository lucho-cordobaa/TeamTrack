import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Rutina, SesionEntrenamiento } from '../types';
import { Play, CheckCircle2, CalendarCheck, Dumbbell, ArrowRight, Trophy } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

interface AthleteDashboardProps {
  onNavigate: (tab: string, routineIdToStart?: number) => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Rutina[]>([]);
  const [totalAttendances, setTotalAttendances] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<SesionEntrenamiento | null>(null);
  const [hasAttendanceToday, setHasAttendanceToday] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  const fetchAthleteData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [routinesRes, attendanceRes, sessionRes] = await Promise.all([
        api.get('/routines'),
        api.get(`/attendance/athlete/${user.id}`),
        api.get('/sessions/active').catch(() => ({ data: null })),
      ]);

      setRoutines(routinesRes.data);
      setTotalAttendances(attendanceRes.data.total_asistencias || 0);
      setActiveSession(sessionRes.data);

      const todayStr = new Date().toISOString().split('T')[0];
      const attendedToday = attendanceRes.data.historial?.some((h: any) => {
        const d = new Date(h.fecha).toISOString().split('T')[0];
        return d === todayStr && h.presente;
      });
      setHasAttendanceToday(!!attendedToday);
    } catch (err) {
      console.error('Error cargando panel de atleta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthleteData();
  }, [user]);

  const handleMarkAttendanceToday = async () => {
    if (!user) return;
    try {
      setMarkingAttendance(true);
      const todayStr = new Date().toISOString().split('T')[0];
      await api.post('/attendance', {
        usuario_id: user.id,
        fecha: todayStr,
        presente: true,
      });
      setHasAttendanceToday(true);
      setAttendanceMsg('¡Asistencia confirmada para hoy!');
      setTotalAttendances((prev) => prev + 1);
    } catch (err: any) {
      setAttendanceMsg(err.response?.data?.message || 'Error al registrar asistencia');
    } finally {
      setMarkingAttendance(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner / Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="blue">{user?.equipo?.nombre || 'Atleta Individual'}</Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            ¡Hola, {user?.nombre}!
          </h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Consulta tus rutinas asignadas, marca tu asistencia a los entrenamientos y registra tus pesos serie por serie en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CalendarCheck size={24} />
          </div>
          <div>
            <span className="text-2xl font-black text-white">{totalAttendances}</span>
            <p className="text-xs font-semibold text-slate-400">Asistencias acumuladas</p>
          </div>
        </div>
      </div>

      {/* ACTIVE WORKOUT NOTIFICATION IF IN PROGRESS (RB-06) */}
      {activeSession && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
              <Play size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Tienes una sesión activa: {activeSession.rutina_nombre}
              </h4>
              <p className="text-xs text-slate-400">
                Iniciada el {new Date(activeSession.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('workout')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
          >
            <span>Continuar Entrenamiento</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* QUICK ATTENDANCE & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Asistencia de Hoy
              </span>
              <CalendarCheck size={18} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-2">
              {hasAttendanceToday ? '¡Presente registrado!' : 'Aún no registraste tu presencia'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              El registro diario valida tu asistencia a la sesión del día.
            </p>
          </div>

          <div>
            {attendanceMsg && (
              <p className="text-xs text-emerald-400 font-medium mb-3">{attendanceMsg}</p>
            )}
            {hasAttendanceToday ? (
              <div className="flex items-center space-x-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 size={18} />
                <span>Asistencia confirmada para hoy</span>
              </div>
            ) : (
              <button
                onClick={handleMarkAttendanceToday}
                disabled={markingAttendance}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 hover:border-emerald-500/40 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>{markingAttendance ? 'Registrando...' : 'Marcar Asistencia Hoy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Motivational / PR highlight */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Progreso Personal
              </span>
              <Trophy size={18} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Historial de Cargas</h3>
            <p className="text-xs text-slate-400 mt-1">
              Consulta tu evolución de peso en cada ejercicio y supera tus marcas personales.
            </p>
          </div>

          <button
            onClick={() => onNavigate('progress')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <span>Ver Gráficos de Evolución</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ASSIGNED ROUTINES SECTION (RF-05, RF-09, RF-12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Mis Rutinas Asignadas</h3>
            <p className="text-xs text-slate-400">
              Rutinas prescritas por tu entrenador para ejecutar en el entrenamiento.
            </p>
          </div>
          <Badge variant="emerald">{routines.length} Disponibles</Badge>
        </div>

        {routines.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
            <Dumbbell className="mx-auto text-slate-600 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-300">No tienes rutinas asignadas aún</p>
            <p className="text-xs text-slate-500 mt-1">
              Tu entrenador te asignará una rutina grupal o individual pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      {routine.tipo === 'GRUPAL' ? 'Rutina de Equipo' : 'Rutina Individual'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {routine.ejercicios?.length || 0} ejercicios
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{routine.nombre}</h4>

                  {/* Exercises list preview */}
                  <div className="space-y-1 pt-1">
                    {routine.ejercicios?.slice(0, 3).map((re) => (
                      <div
                        key={re.id}
                        className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg"
                      >
                        <span className="truncate">{re.ejercicio.nombre}</span>
                        <span className="font-mono text-[11px] text-slate-300">
                          {re.series} × {re.repeticiones}
                        </span>
                      </div>
                    ))}
                    {(routine.ejercicios?.length || 0) > 3 && (
                      <p className="text-[11px] text-slate-500 pl-1">
                        + {(routine.ejercicios?.length || 0) - 3} ejercicios más...
                      </p>
                    )}
                  </div>
                </div>

                {/* Start workout button */}
                <button
                  onClick={() => onNavigate('workout', routine.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
                >
                  <Play size={15} />
                  <span>Iniciar Entrenamiento</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
