import { apiUrl } from '../config/api';

export const authFetch = async (path: string, init: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  return response;
};
