export function saveAuth(token: string, user: { username: string; email: string; id: number; first_name?: string; last_name?: string }) {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function updateStoredUser(patch: Record<string, any>) {
  const current = getUser() || {};
  const updated = { ...current, ...patch };
  localStorage.setItem('user', JSON.stringify(updated));
  return updated;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export function isAuthenticated() {
  return !!getToken();
}