
import { createClient } from '@supabase/supabase-js'
import { User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.");
}

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
