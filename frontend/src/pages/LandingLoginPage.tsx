import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, ShieldCheck, UserCheck, Flame, ArrowRight, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { Rol } from '../types';

export const LandingLoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol>('ATLETA');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({ nombre, email, password, rol });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Ocurrió un error al procesar la solicitud. Verifica tus credenciales.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    setIsLogin(true);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Dumbbell className="text-white transform -rotate-45" size={22} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            Team<span className="text-emerald-400">Track</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Plataforma UTN FRRa 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Hero & Value Proposition */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Flame size={14} /> Gestión de Alto Rendimiento
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
            Entrenamientos <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              sincronizados en tiempo real
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
            Administra tus equipos de rugby, fútbol, crossfit o gimnasio. Diseña rutinas, asigna cargas,
            controla la asistencia diaria y supervisa en vivo las series y repeticiones de tus atletas.
          </p>

          {/* Quick test credentials cards */}
          <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ⚡ Acceso Rápido de Prueba (1 Click)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('luciano@teamtrack.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 hover:border-emerald-500/40 border border-slate-700/60 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Luciano</p>
                  <p className="text-[11px] text-emerald-400">Entrenador</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('joaquin@teamtrack.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 hover:border-blue-500/40 border border-slate-700/60 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Joaquín</p>
                  <p className="text-[11px] text-blue-400">Atleta (Halcones)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sofia@teamtrack.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 hover:border-purple-500/40 border border-slate-700/60 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sofía</p>
                  <p className="text-[11px] text-purple-400">Atleta (Halcones)</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Switch Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isLogin
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  !isLogin
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-500" size={18} />
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Luciano Córdoba"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Rol en la plataforma
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRol('ATLETA')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        rol === 'ATLETA'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <UserCheck size={20} className={rol === 'ATLETA' ? 'text-emerald-400' : ''} />
                      <span className="text-xs font-bold mt-2">Atleta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRol('ENTRENADOR')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        rol === 'ENTRENADOR'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ShieldCheck size={20} className={rol === 'ENTRENADOR' ? 'text-emerald-400' : ''} />
                      <span className="text-xs font-bold mt-2">Entrenador</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <span>{isLogin ? 'Ingresar a TeamTrack' : 'Comenzar Ahora'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer per spec #9 */}
      <footer className="border-t border-slate-900 py-6 px-6 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 TeamTrack — Programación IV | UTN FRRa</p>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
