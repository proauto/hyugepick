'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContextType, UserProfile } from '@/types/auth';
import { User, Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const mapUserToProfile = (user: User): UserProfile => {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    provider: user.app_metadata?.provider || 'email',
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        if (session?.user) {
          setUser(mapUserToProfile(session.user));
        }
        setLoading(false);
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(mapUserToProfile(session.user));
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};