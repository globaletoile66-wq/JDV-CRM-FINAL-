'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

interface SignUpMetadata {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  country?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;

  signUp: (
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ) => Promise<{
    user: User | null;
    session: Session | null;
  }>;

  signIn: (
    email: string,
    password: string
  ) => Promise<{
    user: User | null;
    session: Session | null;
  }>;

  signOut: () => Promise<void>;

  getCurrentUser: () => Promise<User | null>;

  isEmailVerified: () => boolean;

  getUserProfile: () => Promise<Record<string, unknown> | null>;

  getUserOrganizations: () => Promise<Record<string, unknown>[]>;

  getBusinessMembership: () => Promise<Record<string, unknown> | null>;

  isBusinessAdmin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  /*
   * Initialisation de la session + écoute des changements
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error(
          '[AuthProvider] Erreur lors de la récupération de la session:',
          error
        );

        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: import('@supabase/supabase-js').AuthChangeEvent, nextSession: import('@supabase/supabase-js').Session | null) => {
        if (!mounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  /*
   * INSCRIPTION
   *
   * Les métadonnées sont volontairement compatibles
   * avec le trigger public.handle_new_user().
   */
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata: SignUpMetadata = {}
    ) => {
      const firstName =
        metadata.firstName?.trim() ?? '';

      const lastName =
        metadata.lastName?.trim() ?? '';

      const displayName =
        metadata.displayName?.trim() ||
        metadata.fullName?.trim() ||
        [firstName, lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              full_name: metadata.fullName?.trim() || displayName,
              phone: metadata.phone?.trim() || '',
              country: metadata.country?.trim() || 'Bénin',
              avatar_url: metadata.avatarUrl?.trim() || '',
            },
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });

      if (error) {
        throw error;
      }

      return {
        user: data.user,
        session: data.session,
      };
    },
    [supabase]
  );

  /*
   * CONNEXION
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (error) {
        throw error;
      }

      setUser(data.user);
      setSession(data.session);

      return {
        user: data.user,
        session: data.session,
      };
    },
    [supabase]
  );

  /*
   * DÉCONNEXION
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setSession(null);
  }, [supabase]);

  /*
   * UTILISATEUR ACTUEL
   */
  const getCurrentUser =
    useCallback(async (): Promise<User | null> => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    }, [supabase]);

  /*
   * EMAIL VÉRIFIÉ
   */
  const isEmailVerified = useCallback(() => {
    return Boolean(user?.email_confirmed_at);
  }, [user]);

  /*
   * PROFIL UTILISATEUR
   *
   * IMPORTANT :
   * L'ancienne table public.users n'existe plus.
   * La nouvelle table est public.profiles.
   */
  const getUserProfile =
    useCallback(async (): Promise<Record<string, unknown> | null> => {
      const currentUser =
        user ??
        (await getCurrentUser());

      if (!currentUser) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as Record<string, unknown> | null;
    }, [supabase, user, getCurrentUser]);

  /*
   * ORGANISATIONS DE L'UTILISATEUR
   *
   * Architecture :
   * organization_members
   *        ↓
   * organizations
   */
  const getUserOrganizations =
    useCallback(async (): Promise<Record<string, unknown>[]> => {
      const currentUser =
        user ??
        (await getCurrentUser());

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          status,
          joined_at,
          organizations (
            id,
            name,
            legal_name,
            email,
            phone,
            whatsapp,
            country,
            currency,
            timezone,
            language,
            address,
            city,
            logo_url,
            status,
            subscription_status
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      return (data ?? []) as Record<string, unknown>[];
    }, [supabase, user, getCurrentUser]);

  /*
   * MEMBRE ADMINISTRATEUR ENTREPRISE
   */
  const getBusinessMembership =
    useCallback(async (): Promise<Record<string, unknown> | null> => {
      const currentUser =
        user ??
        (await getCurrentUser());

      if (!currentUser) {
        return null;
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          status,
          joined_at
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .eq('role', 'business_admin')
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as Record<string, unknown> | null;
    }, [supabase, user, getCurrentUser]);

  /*
   * VÉRIFICATION ADMIN ENTREPRISE
   */
  const isBusinessAdmin =
    useCallback(async (): Promise<boolean> => {
      const membership =
        await getBusinessMembership();

      return Boolean(membership);
    }, [getBusinessMembership]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,

      signUp,
      signIn,
      signOut,

      getCurrentUser,
      isEmailVerified,
      getUserProfile,

      getUserOrganizations,
      getBusinessMembership,
      isBusinessAdmin,
    }),
    [
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      getCurrentUser,
      isEmailVerified,
      getUserProfile,
      getUserOrganizations,
      getBusinessMembership,
      isBusinessAdmin,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
