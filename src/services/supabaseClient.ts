import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://spuscfciwwjncmylddqp.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable__0PEP322opuhO-Dj9aXRCw_BhdEAxPE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
