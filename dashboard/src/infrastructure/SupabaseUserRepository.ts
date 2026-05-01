import { supabase } from '../supabase/config';
import type { User } from '../domain/entities/User';
import type { IUserRepository } from '../domain/repositories';

export class SupabaseUserRepository implements IUserRepository {
    async listAll(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return data || [];
    }

    async getById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return data;
    }

    async save(user: User): Promise<void> {
        const { error } = await supabase
            .from('users')
            .upsert(user);

        if (error) throw error;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async updateRole(id: string, role: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    }
}
