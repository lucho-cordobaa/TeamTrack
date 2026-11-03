import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('teamtrack_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('teamtrack_token');
      sessionStorage.removeItem('teamtrack_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

// Las imágenes subidas se guardan con una ruta relativa al servidor de la API
export const resolveImageUrl = (url: string) =>
  url.startsWith('/') ? `${new URL(api.defaults.baseURL!, window.location.origin).origin}${url}` : url;

export default api;
