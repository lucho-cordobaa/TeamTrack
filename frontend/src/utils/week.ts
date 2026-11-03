// Las fechas de asistencia son días calendario (YYYY-MM-DD). Se operan en UTC para que
// la zona horaria del navegador no las corra un día.

const fromKey = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (date: Date) => date.toISOString().slice(0, 10);

export const todayKey = () => {
  const now = new Date();
  return toKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
};

export const addDays = (key: string, days: number) => {
  const date = fromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
};

export const mondayOf = (key: string) => addDays(key, -((fromKey(key).getUTCDay() + 6) % 7));

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

const format = (key: string, options: Intl.DateTimeFormatOptions) =>
  fromKey(key).toLocaleDateString('es-AR', { timeZone: 'UTC', ...options }).replace('.', '');

export const formatDayLabel = (key: string) => {
  const weekday = format(key, { weekday: 'short' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${format(key, { day: 'numeric' })}`;
};

export const formatWeekRange = (monday: string) =>
  `${format(monday, { day: 'numeric', month: 'short' })} – ${format(addDays(monday, 6), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
