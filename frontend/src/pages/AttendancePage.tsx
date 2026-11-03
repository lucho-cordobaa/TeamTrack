import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AsistenciaSemanal, Equipo, Usuario } from '../types';
import { addDays, formatDayLabel, formatWeekRange, mondayOf, todayKey, weekDays } from '../utils/week';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle, Plus, Users, Calendar, Minus } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const SIN_EQUIPO = 'sin-equipo';

const formatDaysCount = (days: number) => `${days} ${days === 1 ? 'día' : 'días'}`;

export const AttendancePage: React.FC = () => {
  const { user, isCoach, isAthlete } = useAuth();
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | typeof SIN_EQUIPO | ''>('');
  const [weekStart, setWeekStart] = useState<string>(mondayOf(todayKey()));
  const [weekData, setWeekData] = useState<AsistenciaSemanal | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [athleteHistory, setAthleteHistory] = useState<any>(null);
  const [athletesList, setAthletesList] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Registrar Asistencia
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [fecha, setFecha] = useState<string>(todayKey());
  const [presente, setPresente] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentWeek = mondayOf(todayKey());

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      if (isCoach) {
        const [teamsRes, athletesRes] = await Promise.all([
          api.get('/teams'),
          api.get('/users/athletes'),
        ]);
        setTeams(teamsRes.data);
        setAthletesList(athletesRes.data);
        setSelectedTeamId(teamsRes.data.length > 0 ? teamsRes.data[0].id : SIN_EQUIPO);
      } else if (isAthlete && user) {
        fetchAthleteAttendance(user.id);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAthleteAttendance = async (athleteId: number) => {
    try {
      const res = await api.get(`/attendance/athlete/${athleteId}`);
      setAthleteHistory(res.data);
    } catch (err) {
      console.error('Error cargando historial de atleta:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [isCoach, isAthlete, user]);

  useEffect(() => {
    if (!isCoach || !selectedTeamId) return;

    let isCurrent = true;
    api
      .get('/attendance/week', { params: { date: weekStart, team: selectedTeamId } })
      .then((res) => {
        if (isCurrent) setWeekData(res.data);
      })
      .catch((err) => console.error('Error cargando asistencia semanal:', err));

    return () => {
      isCurrent = false;
    };
  }, [isCoach, selectedTeamId, weekStart, refreshCount]);

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = isAthlete && user ? user.id : Number(selectedAthleteId);
    if (!targetId || !fecha) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.post('/attendance', {
        usuario_id: targetId,
        fecha,
        presente,
      });

      setSuccessMsg('¡Asistencia registrada exitosamente!');
      setIsRecordOpen(false);

      if (isCoach) {
        // Mostrar la semana y el grupo donde quedó el registro
        const athlete = athletesList.find((a) => a.id === targetId);
        setSelectedTeamId(athlete?.equipo_id ?? SIN_EQUIPO);
        setWeekStart(mondayOf(fecha));
        setRefreshCount((count) => count + 1);
      } else if (isAthlete && user) {
        fetchAthleteAttendance(user.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar asistencia');
    } finally {
      setSubmitting(false);
    }
  };

  const days = weekDays(weekStart);

  const athleteWeeks = useMemo(() => {
    const weeks = new Map<string, Map<string, boolean>>([[currentWeek, new Map()]]);
    (athleteHistory?.historial || []).forEach((h: any) => {
      const key = String(h.fecha).slice(0, 10);
      const monday = mondayOf(key);
      if (!weeks.has(monday)) weeks.set(monday, new Map());
      weeks.get(monday)!.set(key, h.presente);
    });
    return [...weeks.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [athleteHistory, currentWeek]);

  const daysThisWeek = [...(athleteWeeks.find(([monday]) => monday === currentWeek)?.[1].values() || [])].filter(
    Boolean,
  ).length;

  const weekNavigator = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setWeekStart(addDays(weekStart, -7))}
        className="p-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
        aria-label="Semana anterior"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="min-w-44 text-center text-xs font-semibold text-slate-200">
        {formatWeekRange(weekStart)}
      </span>
      <button
        type="button"
        onClick={() => setWeekStart(addDays(weekStart, 7))}
        disabled={weekStart >= currentWeek}
        className="p-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Semana siguiente"
      >
        <ChevronRight size={15} />
      </button>
      {weekStart !== currentWeek && (
        <button
          type="button"
          onClick={() => setWeekStart(currentWeek)}
          className="text-xs font-semibold text-emerald-400 hover:underline"
        >
          Hoy
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Control de Asistencia</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isCoach
              ? 'Sigue semana a semana la asistencia de tus atletas y registra su presencia en cada entrenamiento.'
              : 'Consulta tus entrenamientos de cada semana y valida tu presencia en cada sesión.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsRecordOpen(true);
            setError(null);
            setSuccessMsg(null);
            setFecha(todayKey());
            if (isAthlete && user) setSelectedAthleteId(user.id);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus size={16} />
          <span>{isCoach ? 'Registrar Asistencia' : 'Marcar Mi Asistencia'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* COACH VIEW: WEEKLY ATTENDANCE TABLE */}
      {isCoach && (
        <div className="space-y-6">
          {/* Team selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Users size={16} className="text-emerald-400" />
              <span>Seleccionar Equipo:</span>
            </div>

            <select
              value={selectedTeamId}
              onChange={(e) =>
                setSelectedTeamId(e.target.value === SIN_EQUIPO ? SIN_EQUIPO : Number(e.target.value))
              }
              className="w-full sm:w-64 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.atletas?.length || 0} atletas)
                </option>
              ))}
              <option value={SIN_EQUIPO}>
                Sin equipo ({athletesList.filter((a) => !a.equipo_id).length} atletas)
              </option>
            </select>
          </div>

          {/* Weekly attendance table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">
                Asistencia Semanal — {weekData?.equipo_nombre}
              </h3>
              {weekNavigator}
            </div>

            {(!weekData || weekData.atletas.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                {selectedTeamId === SIN_EQUIPO
                  ? 'No hay atletas sin equipo.'
                  : 'No hay atletas en este equipo aún.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl uppercase">Atleta</th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className={`py-3 px-2 text-center whitespace-nowrap ${
                            day === todayKey() ? 'text-emerald-400' : ''
                          }`}
                        >
                          {formatDayLabel(day)}
                        </th>
                      ))}
                      <th className="py-3 px-4 rounded-r-xl text-right uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {weekData.atletas.map((atleta) => (
                      <tr key={atleta.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <p className="text-white font-bold">{atleta.nombre}</p>
                          <p className="text-[11px] text-slate-400">{atleta.email}</p>
                        </td>
                        {days.map((day) => {
                          const registro = atleta.registros.find((r) => r.fecha === day);
                          return (
                            <td key={day} className="py-3 px-2 text-center">
                              {!registro ? (
                                <Minus size={14} className="inline text-slate-700" aria-label="Sin registro" />
                              ) : registro.presente ? (
                                <CheckCircle2 size={16} className="inline text-emerald-400" aria-label="Presente" />
                              ) : (
                                <XCircle size={16} className="inline text-rose-400" aria-label="Ausente" />
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                          {formatDaysCount(atleta.dias_presente)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <td className="py-3 px-4">Presentes por día</td>
                      {days.map((day) => (
                        <td key={day} className="py-3 px-2 text-center">
                          {weekData.atletas.filter((a) => a.registros.some((r) => r.fecha === day && r.presente)).length}
                        </td>
                      ))}
                      <td className="py-3 px-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATHLETE VIEW: WEEKLY ATTENDANCE LOG */}
      {isAthlete && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resumen de Asistencia
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-emerald-400">
                  {athleteHistory?.total_asistencias || 0}
                </span>
                <span className="text-sm font-semibold text-slate-300">sesiones completadas</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Esta semana entrenaste {formatDaysCount(daysThisWeek)}.
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calendar size={32} />
            </div>
          </div>

          {/* Weekly History */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Mis Semanas</h3>
            <div className="divide-y divide-slate-800/60">
              {athleteWeeks.map(([monday, records]) => (
                <div key={monday} className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      {monday === currentWeek ? 'Esta semana' : formatWeekRange(monday)}
                    </span>
                    <span className="font-bold text-emerald-400">
                      {formatDaysCount([...records.values()].filter(Boolean).length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {weekDays(monday).map((day) => {
                      const record = records.get(day);
                      return (
                        <div
                          key={day}
                          className={`rounded-lg border px-1 py-2 text-center text-[11px] font-semibold ${
                            record === true
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : record === false
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : 'bg-slate-950 border-slate-800 text-slate-600'
                          }`}
                        >
                          {formatDayLabel(day)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ASISTENCIA */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Registrar Asistencia a Entrenamiento"
      >
        <form onSubmit={handleRecordAttendance} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {isCoach && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Seleccionar Atleta
              </label>
              <select
                required
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="">-- Selecciona el atleta --</option>
                {athletesList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.equipo?.nombre || 'Sin equipo'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Fecha de Asistencia
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Solo se puede registrar una asistencia por atleta en cada fecha.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRecordOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Confirmar Asistencia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
