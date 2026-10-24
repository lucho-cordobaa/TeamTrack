import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Equipo, Asistencia, Usuario } from '../types';
import { CalendarCheck, CheckCircle2, XCircle, Plus, Users, Calendar } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const AttendancePage: React.FC = () => {
  const { user, isCoach, isAthlete } = useAuth();
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [teamHistory, setTeamHistory] = useState<any>(null);
  const [athleteHistory, setAthleteHistory] = useState<any>(null);
  const [athletesList, setAthletesList] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Registrar Asistencia (RF-10, RB-07)
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presente, setPresente] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        if (teamsRes.data.length > 0) {
          setSelectedTeamId(teamsRes.data[0].id);
          fetchTeamAttendance(teamsRes.data[0].id);
        }
      } else if (isAthlete && user) {
        fetchAthleteAttendance(user.id);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAttendance = async (teamId: number) => {
    try {
      const res = await api.get(`/attendance/team/${teamId}`);
      setTeamHistory(res.data);
    } catch (err) {
      console.error('Error cargando historial de equipo:', err);
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

      if (isCoach && selectedTeamId) {
        fetchTeamAttendance(Number(selectedTeamId));
      } else if (isAthlete && user) {
        fetchAthleteAttendance(user.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar asistencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Control de Asistencia</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isCoach
              ? 'Supervisa la asistencia de tus atletas y registra su presencia en cada entrenamiento.'
              : 'Consulta tu historial de entrenamientos y valida tu presencia en cada sesión.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsRecordOpen(true);
            setError(null);
            setSuccessMsg(null);
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

      {/* COACH VIEW: TEAM ATTENDANCE TABLE */}
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
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedTeamId(val);
                fetchTeamAttendance(val);
              }}
              className="w-full sm:w-64 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.atletas?.length || 0} atletas)
                </option>
              ))}
            </select>
          </div>

          {/* Attendance History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Historial de Asistencias — {teamHistory?.equipo_nombre}
            </h3>

            {(!teamHistory?.asistencias || teamHistory.asistencias.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                No hay registros de asistencia en este equipo aún.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 uppercase text-[11px] font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Fecha</th>
                      <th className="py-3 px-4">Atleta</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4 rounded-r-xl text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {teamHistory.asistencias.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(item.fecha).toISOString().split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-white font-bold">{item.usuario?.nombre}</td>
                        <td className="py-3 px-4 text-slate-400">{item.usuario?.email}</td>
                        <td className="py-3 px-4 text-right">
                          {item.presente ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 size={14} /> Presente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                              <XCircle size={14} /> Ausente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATHLETE VIEW: PERSONAL ATTENDANCE LOG */}
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
                Registro histórico persistido en base de datos.
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calendar size={32} />
            </div>
          </div>

          {/* Athlete Attendance History */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Mis Días Entrenados</h3>
            {(!athleteHistory?.historial || athleteHistory.historial.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Aún no tienes asistencias registradas.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {athleteHistory.historial.map((h: any) => (
                  <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">
                      {new Date(h.fecha).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={14} /> Presente
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ASISTENCIA (RB-07) */}
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
              RB-07: No se permite registrar asistencia duplicada para el mismo atleta en la misma fecha.
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
