// Configurer ici vos accès Supabase
const SUPABASE_URL = 'https://VOTRE_PROJET.supabase.co';
const SUPABASE_KEY = 'VOTRE_CLE_ANON_PUBLIC';

const supabase = lib.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
