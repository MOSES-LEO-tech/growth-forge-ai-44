// Lightweight API client for the local Express auth server

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  signup: (payload: { email: string; password: string; fullName?: string; }) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/me'),
};

export type ApiUser = {
  id: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'school_admin' | 'super_admin';
  full_name?: string | null;
};