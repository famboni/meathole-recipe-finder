import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export const signInWithOtp = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return error;
};

export const signOut = async () => supabase.auth.signOut();