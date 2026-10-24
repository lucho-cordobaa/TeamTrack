import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Equipo, Usuario } from '../types';
import { Users, Plus, Trash2, UserPlus, UserMinus, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export const TeamsPage: React.FC = () => {
  const { isCoach } = useAuth();
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [unassignedAthletes, setUnassignedAthletes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState<Equipo | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamsAndAthletes = async () => {
    try {
      setLoading(true);
      const teamsRes = await api.get('/teams');
      setTeams(teamsRes.data);

      if (isCoach) {
        const unassignedRes = await api.get('/users/athletes/unassigned');
        setUnassignedAthletes(unassignedRes.data);
      }
    } catch (err) {
      console.error('Error cargando equipos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndAthletes();
  }, [isCoach]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.post('/teams', { nombre: newTeamName.trim() });
      setNewTeamName('');
      setIsCreateOpen(false);
      fetchTeamsAndAthletes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear equipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamForAdd || !selectedAthleteId) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.post(`/teams/${selectedTeamForAdd.id}/athletes`, {
        atleta_id: Number(selectedAthleteId),
      });
      setSelectedAthleteId('');
      setSelectedTeamForAdd(null);
      fetchTeamsAndAthletes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al agregar atleta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAthlete = async (teamId: number, athleteId: number) => {
    if (!confirm('¿Deseas desvincular a este atleta del equipo?')) return;
    try {
      await api.delete(`/teams/${teamId}/athletes/${athleteId}`);
      fetchTeamsAndAthletes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al desvincular atleta');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('¿Estás seguro de eliminar este equipo? Los atletas quedarán sin equipo asignado.')) return;
    try {
      await api.delete(`/teams/${teamId}`);
      fetchTeamsAndAthletes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar equipo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestión de Equipos</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isCoach
              ? 'Crea equipos deportivos y asocia atletas para organizar entrenamientos y rutinas grupales.'
              : 'Información del equipo y plantel al que perteneces.'}
          </p>
        </div>

        {isCoach && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus size={16} />
            <span>Nuevo Equipo</span>
          </button>
        )}
      </div>

      {/* Team Cards */}
      {teams.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900 border border-slate-800">
          <Users className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-bold text-white">No hay equipos registrados</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isCoach
              ? 'Haz clic en "Nuevo Equipo" para crear el primer grupo de entrenamiento.'
              : 'Aún no perteneces a ningún equipo deportivo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">{team.nombre}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Entrenador: <span className="text-slate-200 font-semibold">{team.entrenador?.nombre}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="blue">{team.atletas?.length || 0} Atletas</Badge>
                    {isCoach && (
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Eliminar equipo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Athletes list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                    <span>Plantel de Atletas</span>
                    {isCoach && (
                      <button
                        onClick={() => {
                          setSelectedTeamForAdd(team);
                          setError(null);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold lowercase first-letter:uppercase"
                      >
                        <UserPlus size={14} />
                        <span>Asociar atleta</span>
                      </button>
                    )}
                  </div>

                  {(!team.atletas || team.atletas.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">
                      No hay atletas vinculados a este equipo aún.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto pr-1">
                      {team.atletas.map((atleta) => (
                        <div
                          key={atleta.id}
                          className="py-2.5 flex items-center justify-between group text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px]">
                              {atleta.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{atleta.nombre}</p>
                              <p className="text-[11px] text-slate-400">{atleta.email}</p>
                            </div>
                          </div>

                          {isCoach && (
                            <button
                              onClick={() => handleRemoveAthlete(team.id, atleta.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                              title="Quitar del equipo"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Equipo */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear Nuevo Equipo"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nombre del Equipo
            </label>
            <input
              type="text"
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Ej: Jaguares Rugby Club"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Asociar Atleta a Equipo (RB-03) */}
      <Modal
        isOpen={!!selectedTeamForAdd}
        onClose={() => setSelectedTeamForAdd(null)}
        title={`Asociar Atleta a ${selectedTeamForAdd?.nombre}`}
      >
        <form onSubmit={handleAddAthlete} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Selecciona un atleta sin equipo asignado para incorporarlo a <strong className="text-white">{selectedTeamForAdd?.nombre}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Atleta Disponible
            </label>
            {unassignedAthletes.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                No hay atletas sin equipo actualmente. Puedes registrar nuevos atletas desde la pantalla de registro.
              </p>
            ) : (
              <select
                required
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              >
                <option value="">-- Selecciona un atleta --</option>
                {unassignedAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedTeamForAdd(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || unassignedAthletes.length === 0 || !selectedAthleteId}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {submitting ? 'Asociando...' : 'Asociar al Equipo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
