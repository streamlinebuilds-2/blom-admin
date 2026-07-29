import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();
const ADMIN_ROLES = new Set(['owner', 'staff']);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const validateSession = useCallback(async (session) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', session.user.id)
      .maybeSingle();

    const role = String(profile?.app_role || '');
    if (error || !ADMIN_ROLES.has(role)) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'admin_required',
        message: error
          ? 'We could not verify your Admin access. Please try again.'
          : 'This account does not have BLOM Admin access.',
      });
      setIsLoadingAuth(false);
      return false;
    }

    setUser({ ...session.user, app_role: role });
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    return true;
  }, []);

  const checkAppState = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setAuthError({ type: 'auth_error', message: error.message });
      setIsLoadingAuth(false);
      return;
    }
    await validateSession(data.session);
  }, [validateSession]);

  useEffect(() => {
    checkAppState();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => validateSession(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [checkAppState, validateSession]);

  const signIn = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: 'auth_error', message: error.message });
      throw error;
    }
    const allowed = await validateSession(data.session);
    if (!allowed) {
      await supabase.auth.signOut();
      throw new Error('This account does not have BLOM Admin access.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      signIn,
      logout,
      navigateToLogin: () => {},
      checkAppState,
    }}>
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
