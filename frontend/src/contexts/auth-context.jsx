import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
const Context = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser((await api.get('/auth/me')).data);
    } catch (e) {
      setUser(null);
      if (e.status !== 401) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const expire = () => setUser(null),
      change = () => setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
    window.addEventListener('auth:expired', expire);
    window.addEventListener('auth:password-required', change);
    return () => {
      window.removeEventListener('auth:expired', expire);
      window.removeEventListener('auth:password-required', change);
    };
  }, [load]);
  async function login(email, password) {
    await api.csrf();
    await api.post('/auth/login', { email, password });
    api.clearCsrf();
    await api.csrf();
    await load();
  }
  async function logout() {
    await api.post('/auth/logout');
    api.clearCsrf();
    setUser(null);
  }
  return (
    <Context.Provider value={{ user, loading, error, load, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
