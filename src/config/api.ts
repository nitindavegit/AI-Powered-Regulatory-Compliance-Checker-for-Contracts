const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE = rawApiUrl ? trimTrailingSlash(rawApiUrl) : '';

export const apiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
};

export const describeApiTarget = () => (API_BASE ? API_BASE : 'same-origin / Vite proxy');
