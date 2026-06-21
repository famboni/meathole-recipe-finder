import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgxdlblohrnsityebmne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneGRsYmxvaHJuc2l0eWVibW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDM3MzQsImV4cCI6MjA5NzU3OTczNH0.bUsKUoPJEuDeEF3fpg9dxipq1p_kd3F5psshmFv90gM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);