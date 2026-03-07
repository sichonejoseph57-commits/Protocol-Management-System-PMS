import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  organizationId: string;
  role: 'super_admin' | 'admin' | 'hr' | 'pending';
  is_active: boolean;
}

function mapSupabaseUser(user: User, userProfile?: any): AuthUser {
  // CRITICAL: organizationId must be a valid UUID or the string 'none'
  // Empty string '' causes "invalid input syntax for uuid" errors
  const orgId = userProfile?.organization_id;
  
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    organizationId: orgId || 'none', // Use 'none' as placeholder instead of empty string
    role: userProfile?.role || 'pending',
    is_active: userProfile?.is_active || false,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Safety timeout - ensure loading state clears even if queries fail
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout - clearing loading state');
        setIsLoading(false);
      }
    }, 5000); // 5 second maximum loading time

    // Check existing session and fetch user profile
    const loadUser = async () => {
      try {
        console.log('Starting auth initialization...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) setIsLoading(false);
          return;
        }
        
        if (mounted && session?.user) {
          console.log('Session found, fetching user profile...');
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!profileError && profile) {
            console.log('User profile loaded:', profile.email);
            setUser(mapSupabaseUser(session.user, profile));
          } else {
            console.error('Profile fetch error:', profileError);
            // If profile doesn't exist, sign out
            await supabase.auth.signOut();
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          console.log('Auth initialization complete');
          setIsLoading(false);
        }
      }
    };
    
    loadUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (!profileError && profile) {
              setUser(mapSupabaseUser(session.user, profile));
            } else {
              console.error('Profile fetch error on sign in:', profileError);
            }
          } catch (error) {
            console.error('Auth state change error:', error);
          } finally {
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              setUser(mapSupabaseUser(session.user, profile));
            }
          } catch (error) {
            console.error('Token refresh error:', error);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileError || !profile) {
          setIsLoading(false);
          return { success: false, error: 'User profile not found. Please contact support.' };
        }
        
        setUser(mapSupabaseUser(data.user, profile));
        // Don't set loading to false here - let navigation happen
        return { success: true };
      }
      
      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      
      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        // Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileError || !profile) {
          setIsLoading(false);
          return { success: false, error: 'Account created but profile setup failed. Please try logging in.' };
        }
        
        setUser(mapSupabaseUser(data.user, profile));
        // Don't set loading to false here - let navigation happen
        return { success: true };
      }
      
      setIsLoading(false);
      return { success: false, error: 'Signup failed' };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
  };
}
