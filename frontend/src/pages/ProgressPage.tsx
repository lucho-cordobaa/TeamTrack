import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ejercicio, Equipo, Usuario, PuntoProgreso } from '../types';
import {
  TrendingUp,
  Trophy,
  Activity,
  Dumbbell,
  Users,
  Calendar,
  Flame,
  LineChart as ChartIcon,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const ProgressPage: React.FC = () => {
  const { user, isCoach, isAthlete } = useAuth();
  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | ''>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('');
  const [athletesList, setAthletesList] = useState<Usuario[]>([]);
  const [teams, setTeams] = useState<Equipo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  const [progressData, setProgressData] = useState<any | null>(null);
  const [athleteSummary, setAthleteSummary] = useState<any | null>(null);
  const [teamProgress, setTeamProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar listas
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const exRes = await api.get('/exercises');
        setExercises(exRes.data);
        if (exRes.data.length > 0) {
          setSelectedExerciseId(exRes.data[0].id);
        }

        if (isCoach) {
          const [teamsRes, athletesRes] = await Promise.all([
            api.get('/teams'),
            api.get('/users/athletes'),
          ]);
          setTeams(teamsRes.data);
          setAthletesList(athletesRes.data);

          if (athletesRes.data.length > 0) {
            setSelectedAthleteId(athletesRes.data[0].id);
          }
          if (teamsRes.data.length > 0) {
            setSelectedTeamId(teamsRes.data[0].id);
            fetchTeamProgress(teamsRes.data[0].id);
          }
        } else if (isAthlete && user) {
          setSelectedAthleteId(user.id);
        }
      } catch (err) {
        console.error('Error cargando ejercicios para progreso:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isCoach, isAthlete, user]);

  // Cargar progreso del atleta cuando cambie el ejercicio o el atleta seleccionado
  const fetchProgress = async () => {
    if (!selectedAthleteId || !selectedExerciseId) return;
    try {
      const [progRes, sumRes] = await Promise.all([
        api.get(`/progress/athlete/${selectedAthleteId}/exercise/${selectedExerciseId}`),
        api.get(`/progress/athlete/${selectedAthleteId}/summary`),
      ]);
      setProgressData(progRes.data);
      setAthleteSummary(sumRes.data);
    } catch (err) {
      console.error('Error cargando datos de progreso:', err);
    }
  };

  const fetchTeamProgress = async (teamId: number) => {
    try {
      const res = await api.get(`/progress/team/${teamId}`);
      setTeamProgress(res.data);
    } catch (err) {
      console.error('Error cargando progreso del equipo:', err);
    }
  };

  useEffect(() => {
    if (selectedAthleteId && selectedExerciseId) {
      fetchProgress();
    }
  }, [selectedAthleteId, selectedExerciseId]);

  // Configuración de Chart.js
  const chartLabels = progressData?.puntos_progreso?.map((p: PuntoProgreso) => p.fecha) || [];
  const chartValues = progressData?.puntos_progreso?.map((p: PuntoProgreso) => p.peso_maximo) || [];

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['Sin registros'],
    datasets: [
      {
        label: 'Carga Máxima (kg)',
        data: chartValues.length > 0 ? chartValues : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#10b981',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} kg levantados`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
        },
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (val: any) => `${val} kg`,
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Evolución & Progreso</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {isCoach
              ? 'Analiza el incremento de fuerza de tus atletas y las métricas de rendimiento por ejercicio.'
              : 'Visualiza tus avances de fuerza y récords personales a lo largo del tiempo.'}
          </p>
        </div>

        {/* Coach controls: Select athlete */}
        {isCoach && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400">Atleta:</span>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              {athletesList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Récord Personal (PR)
            </p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {progressData?.peso_record || 0} kg
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{progressData?.ejercicio?.nombre}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Trophy size={24} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Series Realizadas
            </p>
            <h3 className="text-2xl font-black text-white mt-1">
              {athleteSummary?.total_series_registradas || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Persistidas en MySQL</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Dumbbell size={24} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Asistencias Confirmadas
            </p>
            <h3 className="text-2xl font-black text-white mt-1">
              {athleteSummary?.total_asistencias || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sesiones presenciales</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* RF-15, RF-17: EVOLUTION CHART BY EXERCISE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={20} />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Curva de Progresión de Carga (kg)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historial de peso máximo levantado por sesión para el ejercicio seleccionado.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-400">Ejercicio:</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500 max-w-xs"
            >
              {exercises.map((ej) => (
                <option key={ej.id} value={ej.id}>
                  {ej.nombre} ({ej.grupo_muscular})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2">
          {chartValues.length === 0 || chartValues[0] === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              <ChartIcon size={32} className="text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Sin registros históricos para este ejercicio</p>
              <p className="mt-1">Completa series en este ejercicio para generar los puntos de progresión.</p>
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* COACH VIEW: GROUP TEAM METRICS */}
      {isCoach && teamProgress && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Métricas Grupales — {teamProgress.equipo_nombre}
              </h3>
              <p className="text-xs text-slate-400">
                Resumen de asistencia y volumen total acumulado por el equipo.
              </p>
            </div>

            <select
              value={selectedTeamId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedTeamId(id);
                fetchTeamProgress(id);
              }}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Atletas en Equipo</p>
              <p className="text-xl font-black text-white mt-1">{teamProgress.total_atletas}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Asistencias</p>
              <p className="text-xl font-black text-white mt-1">{teamProgress.total_asistencias}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Series Levantadas</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{teamProgress.total_series}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Promedio Asistencia</p>
              <p className="text-xl font-black text-white mt-1">
                {teamProgress.promedio_asistencia_por_atleta} / atleta
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
