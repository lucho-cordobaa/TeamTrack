import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarCheck,
  PlayCircle,
  TrendingUp,
  FileText,
  LogOut,
  X,
  ShieldCheck,
  User,
  LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { user, isCoach, logout } = useAuth();

  const coachNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teams', label: 'Equipos & Atletas', icon: Users },
    { id: 'exercises', label: 'Catálogo Ejercicios', icon: Dumbbell },
    { id: 'routines', label: 'Constructor Rutinas', icon: FileText },
    { id: 'attendance', label: 'Control Asistencia', icon: CalendarCheck },
    { id: 'progress', label: 'Progreso & Métricas', icon: TrendingUp },
  ];

  const athleteNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Mi Panel', icon: LayoutDashboard },
    { id: 'routines', label: 'Mis Rutinas', icon: FileText },
    { id: 'workout', label: 'Entrenar Ahora', icon: PlayCircle, highlight: true },
    { id: 'attendance', label: 'Mi Asistencia', icon: CalendarCheck },
    { id: 'progress', label: 'Mi Progreso', icon: TrendingUp },
    { id: 'exercises', label: 'Catálogo Ejercicios', icon: Dumbbell },
  ];

  const navItems = isCoach ? coachNavItems : athleteNavItems;

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="text-white transform -rotate-45" size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                Team<span className="text-emerald-400">Track</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {isCoach ? 'Panel de Entrenador' : 'Panel de Atleta'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : item.highlight
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-emerald-400' : ''} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-800/50 border border-slate-800 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
              {user?.nombre.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                {isCoach ? (
                  <>
                    <ShieldCheck size={12} className="text-emerald-400" />
                    Entrenador
                  </>
                ) : (
                  <>
                    <User size={12} className="text-blue-400" />
                    {user?.equipo?.nombre || 'Sin equipo'}
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
