import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LandingLoginPage } from './pages/LandingLoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CoachDashboard } from './pages/CoachDashboard';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { TeamsPage } from './pages/TeamsPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { AttendancePage } from './pages/AttendancePage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { ProgressPage } from './pages/ProgressPage';

export const App: React.FC = () => {
  const { user, token, isLoading, isCoach } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [selectedRoutineForWorkout, setSelectedRoutineForWorkout] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold tracking-tight text-slate-300">Cargando TeamTrack...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <LandingLoginPage />;
  }

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return isCoach ? 'Panel del Entrenador' : 'Mi Panel de Atleta';
      case 'teams':
        return 'Gestión de Equipos & Atletas';
      case 'exercises':
        return 'Catálogo de Ejercicios';
      case 'routines':
        return isCoach ? 'Constructor & Asignación de Rutinas' : 'Mis Rutinas';
      case 'attendance':
        return 'Control de Asistencia';
      case 'workout':
        return 'Sesión de Entrenamiento Activa';
      case 'progress':
        return 'Historial de Cargas & Progreso';
      default:
        return 'TeamTrack';
    }
  };

  const handleStartWorkoutFromAnywhere = (routineId?: number) => {
    if (routineId) {
      setSelectedRoutineForWorkout(routineId);
    }
    setCurrentTab('workout');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Responsive */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'workout') setSelectedRoutineForWorkout(null);
        }}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Sticky Header with Hamburger Button */}
        <Navbar
          title={getPageTitle()}
          onToggleMobile={() => setIsOpenMobile((prev) => !prev)}
        />

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            isCoach ? (
              <CoachDashboard onNavigate={(tab) => setCurrentTab(tab)} />
            ) : (
              <AthleteDashboard
                onNavigate={(tab, routineId) => {
                  if (tab === 'workout') {
                    handleStartWorkoutFromAnywhere(routineId);
                  } else {
                    setCurrentTab(tab);
                  }
                }}
              />
            )
          )}

          {currentTab === 'teams' && <TeamsPage />}
          {currentTab === 'exercises' && <ExercisesPage />}
          {currentTab === 'routines' && (
            <RoutinesPage onStartWorkout={(id) => handleStartWorkoutFromAnywhere(id)} />
          )}
          {currentTab === 'attendance' && <AttendancePage />}
          {currentTab === 'workout' && (
            <ActiveWorkoutPage
              initialRoutineId={selectedRoutineForWorkout}
              onFinishWorkout={() => {
                setSelectedRoutineForWorkout(null);
                setCurrentTab('dashboard');
              }}
            />
          )}
          {currentTab === 'progress' && <ProgressPage />}
        </main>
      </div>
    </div>
  );
};
export default App;
