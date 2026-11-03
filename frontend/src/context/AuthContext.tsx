import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { Usuario, Rol } from '../types';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  isCoach: boolean;
  isAthlete: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  register: (data: { nombre: string; email: string; password: string; rol: Rol; equipo_id?: number }) => Promise<Usuario>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(() => {
    const saved = sessionStorage.getItem('teamtrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('teamtrack_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      sessionStorage.setItem('teamtrack_user', JSON.stringify(res.data));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, token: jwtToken } = res.data;
    setUser(userData);
    setToken(jwtToken);
    sessionStorage.setItem('teamtrack_token', jwtToken);
    sessionStorage.setItem('teamtrack_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (data: { nombre: string; email: string; password: string; rol: Rol; equipo_id?: number }) => {
    const res = await api.post('/auth/register', data);
    const { user: userData, token: jwtToken } = res.data;
    setUser(userData);
    setToken(jwtToken);
    sessionStorage.setItem('teamtrack_token', jwtToken);
    sessionStorage.setItem('teamtrack_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('teamtrack_token');
    sessionStorage.removeItem('teamtrack_user');
  };

  const isCoach = user?.rol === 'ENTRENADOR';
  const isAthlete = user?.rol === 'ATLETA';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isCoach,
        isAthlete,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
