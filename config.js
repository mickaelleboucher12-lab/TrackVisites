// Configurer ici vos accès Supabase
const SUPABASE_URL = 'https://rxulxpeiqmuunnlspmvd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWx4cGVpcW11dW5ubHNwbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTQxNzQsImV4cCI6MjA5MTI5MDE3NH0.yAk6IBuIF3PkrRug8OncwLlFFNxK0cNG9hT5uKfmMc4';

const supabase = lib.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
