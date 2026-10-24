import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Equipo, Rutina, SesionEntrenamiento } from '../types';
import { Users, Dumbbell, CalendarCheck, Flame, Play, Activity, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

interface CoachDashboardProps {
  onNavigate: (tab: string) => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [routines, setRoutines] = useState<Rutina[]>([]);
  const [activeSessions, setActiveSessions] = useState<SesionEntrenamiento[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [teamsRes, routinesRes] = await Promise.all([
        api.get('/teams'),
        api.get('/routines'),
      ]);
      setTeams(teamsRes.data);
      setRoutines(routinesRes.data);

      if (teamsRes.data.length > 0) {
        setSelectedTeamId(teamsRes.data[0].id);
        fetchLiveSessions(teamsRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSessions = async (teamId: number) => {
    try {
      setIsRefreshingLive(true);
      const res = await api.get(`/sessions/team/${teamId}/live`);
      setActiveSessions(res.data);
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchLiveSessions(selectedTeamId);
      // Intervalo de sondeo en tiempo real para supervisión del entrenador (RF-15)
      const interval = setInterval(() => {
        fetchLiveSessions(selectedTeamId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedTeamId]);

  const totalAthletes = teams.reduce((acc, t) => acc + (t.atletas?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
            <Flame size={14} /> Panel del Entrenador
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            ¡Hola, {user?.nombre}!
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Supervisa los entrenamientos de tus atletas en tiempo real, administra los planteles y diseña rutinas personalizadas.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipos a Cargo</p>
            <h3 className="text-2xl font-black text-white mt-1">{teams.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Atletas</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalAthletes}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Flame size={24} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rutinas Creadas</p>
            <h3 className="text-2xl font-black text-white mt-1">{routines.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Dumbbell size={24} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sesiones en Vivo</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
              {activeSessions.length}
              {activeSessions.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* RF-15: LIVE TRAINING MONITOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Monitoreo en Tiempo Real (Firestore)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sesiones de entrenamiento actualmente activas en el gimnasio o campo.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {teams.length > 0 && (
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.atletas?.length || 0} atletas)
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => selectedTeamId && fetchLiveSessions(selectedTeamId)}
              disabled={isRefreshingLive}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Actualizar ahora"
            >
              <RefreshCw size={16} className={isRefreshingLive ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Live sessions cards */}
        {activeSessions.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
            <Activity className="mx-auto text-slate-600 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-300">
              No hay atletas con sesiones activas en este equipo en este momento
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Cuando un atleta inicie una rutina desde su móvil, aparecerá aquí al instante con sus series y pesos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => {
              const totalSeries = session.ejercicios.reduce((acc, ej) => acc + ej.series.length, 0);
              const completedSeries = session.ejercicios.reduce(
                (acc, ej) => acc + ej.series.filter((s) => s.completada).length,
                0,
              );
              const progressPct = totalSeries > 0 ? Math.round((completedSeries / totalSeries) * 100) : 0;

              return (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-lg space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{session.atleta_nombre}</h4>
                        <Badge variant="emerald" className="animate-pulse">En curso</Badge>
                      </div>
                      <p className="text-xs text-emerald-400 font-medium mt-0.5">
                        {session.rutina_nombre}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {progressPct}% ({completedSeries}/{totalSeries} series)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Exercise live series overview */}
                  <div className="space-y-2 pt-1">
                    {session.ejercicios.map((ej) => (
                      <div
                        key={ej.ejercicio_id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span>{ej.nombre}</span>
                          <span className="text-slate-400">
                            {ej.series.filter((s) => s.completada).length} / {ej.series_prescriptas}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ej.series.map((s) => (
                            <span
                              key={s.numero}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                s.completada
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              S{s.numero}: {s.peso_kg}kg × {s.repeticiones_realizadas}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick navigation and teams overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams summary */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Mis Equipos</h3>
            <button
              onClick={() => onNavigate('teams')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Gestionar <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => onNavigate('teams')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{team.nombre}</h4>
                  <Badge variant="blue">{team.atletas?.length || 0} Atletas</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {team.rutinas_grupales?.length || 0} rutinas grupales activas
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-white">Acciones Rápidas</h3>
          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('routines')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <div className="flex items-center space-x-3">
                <Dumbbell className="text-emerald-400" size={18} />
                <span className="text-sm font-semibold text-white">Constructor de Rutinas</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('attendance')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <div className="flex items-center space-x-3">
                <CalendarCheck className="text-blue-400" size={18} />
                <span className="text-sm font-semibold text-white">Control de Asistencia</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('progress')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <div className="flex items-center space-x-3">
                <Flame className="text-purple-400" size={18} />
                <span className="text-sm font-semibold text-white">Métricas y Gráficos</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
