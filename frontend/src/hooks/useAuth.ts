import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { login as apiLogin, logout as apiLogout, fetchCurrentUser, isAuthenticated, getStoredUser } from '../services/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
}

const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: getStoredUser(),
    loading: true,
    error: null,
    isLoggedIn: isAuthenticated(),
  });

  // Sprawdź sesję przy starcie
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const user = await fetchCurrentUser();
          localStorage.setItem('user', JSON.stringify(user));
          setState({
            user,
            loading: false,
            error: null,
            isLoggedIn: true,
          });
        } catch (error) {
          // Token nieważny
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setState({
            user: null,
            loading: false,
            error: null,
            isLoggedIn: false,
          });
        }
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
          isLoggedIn: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { user } = await apiLogin(username, password);
      setState({
        user,
        loading: false,
        error: null,
        isLoggedIn: true,
      });
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Błąd logowania';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await apiLogout();
    setState({
      user: null,
      loading: false,
      error: null,
      isLoggedIn: false,
    });
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isLoggedIn: state.isLoggedIn,
    login,
    logout,
  };
};

export default useAuth;