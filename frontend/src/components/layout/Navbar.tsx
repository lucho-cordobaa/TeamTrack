import React from 'react';
import { Menu, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

interface NavbarProps {
  onToggleMobile: () => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobile, title }) => {
  const { user, isCoach } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobile}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center space-x-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Dumbbell size={18} />
          </div>
          <span className="font-bold text-white">TeamTrack</span>
        </div>
        <h2 className="hidden lg:block text-lg font-bold text-white">{title}</h2>
      </div>

      <div className="flex items-center space-x-3">
        <Badge variant={isCoach ? 'emerald' : 'blue'}>
          {isCoach ? 'Entrenador' : 'Atleta'}
        </Badge>
        <span className="text-sm font-medium text-slate-300 hidden sm:inline-block">
          {user?.nombre}
        </span>
      </div>
    </header>
  );
};
