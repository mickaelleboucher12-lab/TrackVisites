// Configurer ici vos accès Supabase
const SUPABASE_URL = 'https://gbtomeykpoxcqprsgkfa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidG9tZXlrcG94Y3FwcnNna2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODgwNjgsImV4cCI6MjA4ODE2NDA2OH0.ta-eHx4FLWV6kcT_K1p0t6zPQ7dwiLpzXo3S3qqcWr4';

const supabase = lib.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
