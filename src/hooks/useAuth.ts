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

    // EMERGENCY FIX: 2 second timeout for ultra-fast failure detection
    timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.error('[Auth] ⚠️ TIMEOUT: Auth initialization exceeded 2s');
        console.error('[Auth] Setting loading=false immediately');
        if (mounted) setIsLoading(false);
      }
    }, 2000);

    // Check existing session and fetch user profile
    const loadUser = async () => {
      const startTime = Date.now();
      try {
        console.log('[Auth] Starting initialization...');
        
        // Quick session check with 1s timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 1000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          if (mounted) setIsLoading(false);
          return;
        }
        
        if (mounted && session?.user) {
          console.log('[Auth] ✅ Session found, fetching user profile...');
          
          try {
            // Fetch profile with 1s timeout
            const profilePromise = supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const profileTimeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Profile timeout')), 1000)
            );
            
            const { data: profile, error: profileError } = await Promise.race([
              profilePromise,
              profileTimeoutPromise
            ]) as any;
            
            if (!profileError && profile) {
              const duration = Date.now() - startTime;
              console.log(`[Auth] ✅ User profile loaded in ${duration}ms:`, profile.email, profile.role);
              const authUser = mapSupabaseUser(session.user, profile);
              console.log('[Auth] 🔐 User authenticated:', authUser.email, 'Role:', authUser.role, 'Org:', authUser.organizationId);
              setUser(authUser);
            } else {
              console.error('[Auth] ❌ Profile fetch error:', profileError);
              console.error('[Auth] Signing out due to missing profile...');
              await supabase.auth.signOut();
            }
          } catch (profileError: any) {
            console.error('[Auth] ❌ Exception fetching profile:', profileError.message);
            await supabase.auth.signOut();
          }
        } else {
          console.log('[Auth] ℹ️ No active session found');
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[Auth] Initialization error after ${duration}ms:`, error.message);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          const duration = Date.now() - startTime;
          console.log(`[Auth] Initialization complete in ${duration}ms`);
          setIsLoading(false);
        }
      }
    };
    
    loadUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('[Auth] State change:', event);
        
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
              console.error('[Auth] Profile fetch error on sign in:', profileError);
            }
          } catch (error) {
            console.error('[Auth] State change error:', error);
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
            console.error('[Auth] Token refresh error:', error);
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
    const loginStartTime = Date.now();
    try {
      setIsLoading(true);
      console.log('[Auth] 🔐 Login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('[Auth] ❌ Login error:', error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        console.log('[Auth] ✅ Login successful, fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileError || !profile) {
          console.error('[Auth] ❌ Profile fetch error:', profileError);
          setIsLoading(false);
          return { success: false, error: 'User profile not found. Please contact support.' };
        }
        
        const loginDuration = Date.now() - loginStartTime;
        console.log(`[Auth] ✅ Profile loaded in ${loginDuration}ms, setting user state...`);
        const authUser = mapSupabaseUser(data.user, profile);
        
        // CRITICAL FIX: Set user first, THEN clear loading to prevent bounce-back
        setUser(authUser);
        
        // Use requestAnimationFrame to ensure state updates are batched properly
        requestAnimationFrame(() => {
          setIsLoading(false);
          console.log('[Auth] ✅ Login complete - user authenticated, loading cleared');
        });
        
        return { success: true };
      }
      
      console.error('[Auth] ❌ Login failed - no user data');
      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const loginDuration = Date.now() - loginStartTime;
      console.error(`[Auth] ❌ Login exception after ${loginDuration}ms:`, error);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    const signupStartTime = Date.now();
    try {
      setIsLoading(true);
      console.log('[Auth] 📝 Signup attempt for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      
      if (error) {
        console.error('[Auth] ❌ Signup error:', error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        console.log('[Auth] ✅ User created, waiting for profile creation...');
        // Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileError || !profile) {
          console.error('[Auth] ❌ Profile creation error:', profileError);
          setIsLoading(false);
          return { success: false, error: 'Account created but profile setup failed. Please try logging in.' };
        }
        
        const signupDuration = Date.now() - signupStartTime;
        console.log(`[Auth] ✅ Profile created in ${signupDuration}ms, setting user state...`);
        const authUser = mapSupabaseUser(data.user, profile);
        
        // CRITICAL FIX: Set user first, THEN clear loading to prevent bounce-back
        setUser(authUser);
        
        // Use requestAnimationFrame to ensure state updates are batched properly
        requestAnimationFrame(() => {
          setIsLoading(false);
          console.log('[Auth] ✅ Signup complete - user authenticated, loading cleared');
        });
        
        return { success: true };
      }
      
      console.error('[Auth] ❌ Signup failed - no user data');
      setIsLoading(false);
      return { success: false, error: 'Signup failed' };
    } catch (error: any) {
      const signupDuration = Date.now() - signupStartTime;
      console.error(`[Auth] ❌ Signup exception after ${signupDuration}ms:`, error);
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
