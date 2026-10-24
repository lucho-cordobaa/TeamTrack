import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ejercicio } from '../types';
import { Search, Dumbbell, Filter, Plus, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export const ExercisesPage: React.FC = () => {
  const { isCoach } = useAuth();
  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal Detalle
  const [selectedExercise, setSelectedExercise] = useState<Ejercicio | null>(null);

  // Modal Nuevo Ejercicio
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newGrupo, setNewGrupo] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newImagen, setNewImagen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedMuscle) params.muscleGroup = selectedMuscle;
      params.page = page;
      params.pageSize = pageSize;

      const exRes = await api.get('/exercises', { params });
      setExercises(exRes.data.items);
      setTotal(exRes.data.total);
      setTotalPages(exRes.data.totalPages);
    } catch (err) {
      console.error('Error cargando ejercicios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchExercises();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedMuscle, page, pageSize]);

  useEffect(() => {
    api.get('/exercises/muscle-groups')
      .then((response) => setMuscleGroups(response.data))
      .catch((err) => console.error('Error cargando grupos musculares:', err));
  }, []);

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.post('/exercises', {
        nombre: newNombre.trim(),
        grupo_muscular: newGrupo.trim(),
        descripcion: newDescripcion.trim(),
        imagen_url:
          newImagen.trim() ||
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      });
      setIsCreateOpen(false);
      setNewNombre('');
      setNewGrupo('');
      setNewDescripcion('');
      setNewImagen('');
      setPage(1);
      if (page === 1) fetchExercises();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear ejercicio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Catálogo de Ejercicios</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Explora ejercicios con técnicas de ejecución, grupos musculares e imágenes de referencia.
          </p>
        </div>

        {isCoach && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus size={16} />
            <span>Agregar Ejercicio</span>
          </button>
        )}
      </div>

      {/* RF-07: SEARCH & FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar ejercicio por nombre (ej: banca, sentadilla, curl)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 hidden sm:inline" />
          <select
            value={selectedMuscle}
            onChange={(e) => {
              setSelectedMuscle(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="">Todos los grupos</option>
            {muscleGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {exercises.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900 border border-slate-800">
          <Dumbbell className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-bold text-white">No se encontraron ejercicios</h3>
          <p className="text-xs text-slate-500 mt-1">
            Intenta con otro término de búsqueda o selecciona otro grupo muscular.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {exercises.map((ej) => (
            <div
              key={ej.id}
              onClick={() => setSelectedExercise(ej)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  <img
                    src={ej.imagen_url}
                    alt={ej.nombre}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).src =
                        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="emerald">{ej.grupo_muscular}</Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {ej.nombre}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ej.descripcion}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 mt-2">
                <span className="flex items-center gap-1 text-[11px]">
                  <Info size={13} /> Ver técnica
                </span>
                <span className="font-mono text-[10px] text-slate-400">ID #{ej.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-slate-400">
            <span>
              Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} ejercicios
            </span>
            <label className="flex items-center gap-2">
              Por página
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                aria-label="Cantidad de ejercicios por página"
              >
                {[12, 24, 48].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="min-w-20 text-center text-xs text-slate-300">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Ejercicio */}
      <Modal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        title={selectedExercise?.nombre || 'Detalle del Ejercicio'}
      >
        {selectedExercise && (
          <div className="space-y-5">
            <div className="relative h-60 rounded-xl overflow-hidden bg-slate-950">
              <img
                src={selectedExercise.imagen_url}
                alt={selectedExercise.nombre}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="emerald">{selectedExercise.grupo_muscular}</Badge>
              {selectedExercise.fuente_externa_id && (
                <span className="text-[11px] font-mono text-slate-500">
                  Ref: {selectedExercise.fuente_externa_id}
                </span>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Descripción & Ejecución Técnica
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {selectedExercise.descripcion}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Crear Ejercicio (Entrenador) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nuevo Ejercicio en Catálogo"
      >
        <form onSubmit={handleCreateExercise} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Nombre del Ejercicio
            </label>
            <input
              type="text"
              required
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Ej: Press Francés con Barra"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Grupo Muscular Principal
            </label>
            <input
              type="text"
              required
              value={newGrupo}
              onChange={(e) => setNewGrupo(e.target.value)}
              placeholder="Ej: Tríceps, Espalda, Piernas, Pecho..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Descripción & Pautas de Ejecución
            </label>
            <textarea
              required
              rows={3}
              value={newDescripcion}
              onChange={(e) => setNewDescripcion(e.target.value)}
              placeholder="Describe postura, rango de movimiento y tips de respiración..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              URL de Imagen / GIF de Referencia
            </label>
            <input
              type="url"
              value={newImagen}
              onChange={(e) => setNewImagen(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
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
              {submitting ? 'Guardando...' : 'Guardar Ejercicio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
