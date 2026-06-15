'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  resolveInitialAuthProfile,
  shouldFetchProfileOnMount,
  type AuthProfile,
} from '@/lib/auth-profile';

type UserProfile = AuthProfile;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({
  children,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialProfile?: UserProfile | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    resolveInitialAuthProfile(initialProfile),
  );
  // When the server already supplied the profile we don't need a blocking load.
  const [isLoading, setIsLoading] = useState(() => shouldFetchProfileOnMount(initialProfile));
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        setUser(currentUser);

        // The role is initialized from the server (middleware already has it);
        // only query user_profiles on the client when it was not provided.
        if (currentUser && shouldFetchProfileOnMount(initialProfile)) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, role, display_name, avatar_url')
            .eq('id', currentUser.id)
            .single();

          setProfile(userProfile as UserProfile | null);
        }
      } catch {
        // Session fetch failed — user not authenticated
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        return;
      }

      // Only fetch the profile on an actual sign-in transition — not on every
      // token refresh / initial-session replay. The role is already initialized
      // from the server for authenticated mounts.
      if (event === 'SIGNED_IN' && currentUser) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, role, display_name, avatar_url')
          .eq('id', currentUser.id)
          .single();

        setProfile(userProfile as UserProfile | null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // initialProfile is a render-stable server prop; re-running this effect on
    // it would needlessly re-subscribe to auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
