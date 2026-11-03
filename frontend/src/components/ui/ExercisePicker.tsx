import React, { useMemo, useState } from 'react';
import { Search, Filter, Check } from 'lucide-react';
import { Ejercicio } from '../../types';

interface ExercisePickerProps {
  exercises: Ejercicio[];
  onSelect: (ejercicio: Ejercicio) => void;
  selectedIds?: number[];
  maxHeightClass?: string;
}

const MAX_VISIBLE = 100;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Buscador con filtro por grupo muscular para listas de ejercicios
export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  exercises,
  onSelect,
  selectedIds = [],
  maxHeightClass = 'max-h-56',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((ej) => ej.grupo_muscular))).sort((a, b) => a.localeCompare(b)),
    [exercises],
  );

  const filtered = useMemo(() => {
    // Cada palabra buscada debe aparecer en el nombre ("press banca" encuentra "Press de banca")
    const words = normalize(searchTerm).split(/\s+/).filter(Boolean);
    return exercises.filter((ej) => {
      if (selectedMuscle && ej.grupo_muscular !== selectedMuscle) return false;
      const name = normalize(ej.nombre);
      return words.every((w) => name.includes(w));
    });
  }, [exercises, searchTerm, selectedMuscle]);

  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar ejercicio por nombre..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400 hidden sm:inline" />
          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            className="w-full sm:w-40 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none"
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

      <div className={`${maxHeightClass} overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/70`}>
        {visible.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No se encontraron ejercicios con ese criterio.
          </p>
        ) : (
          visible.map((ej) => {
            const isSelected = selectedIds.includes(ej.id);
            return (
              <button
                key={ej.id}
                type="button"
                data-testid="exercise-option"
                onClick={() => onSelect(ej)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition ${
                  isSelected ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">
                  <span className="font-semibold">{ej.nombre}</span>
                  <span className="text-slate-500"> · {ej.grupo_muscular}</span>
                </span>
                {isSelected && <Check size={14} className="shrink-0 text-emerald-400" />}
              </button>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        {filtered.length > MAX_VISIBLE
          ? `Mostrando ${MAX_VISIBLE} de ${filtered.length} ejercicios. Refiná la búsqueda para ver más.`
          : `${filtered.length} ejercicio${filtered.length === 1 ? '' : 's'}`}
      </p>
    </div>
  );
};
