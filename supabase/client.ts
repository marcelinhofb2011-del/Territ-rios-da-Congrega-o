
import { createClient } from '@supabase/supabase-js'
import { User } from '../types';

// Credenciais integradas com sucesso
const supabaseUrl = 'https://maaxznrwsrlazzsxkczc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYXh6bnJ3c3JsYXp6c3hrY3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzEzMTUsImV4cCI6MjA4MjU0NzMxNX0.GYHh9HZ0zku04EZNekVOn3R8T8EKqD0dty1ulrWwK_U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para buscar o perfil do usuário da tabela 'users'
export const getUserProfile = async (authUserId: string): Promise<Omit<User, 'id'> | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('name, email, role')
        .eq('auth_id', authUserId)
        .single();
    
    if (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
    return data;
};
