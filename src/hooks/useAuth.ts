import { useState, useEffect, useCallback } from 'react';
import {
  signInWithGoogle,
  signOut,
  onAuthStateChanged,
  type User
} from '@/lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged((user) => {
      setState({
        user,
        loading: false,
        error: null
      });
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGoogle();
      // Auth state change will update the user
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      }));
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signOut();
      // Auth state change will update the user
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }));
    }
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    signIn: handleSignIn,
    signOut: handleSignOut
  };
}
