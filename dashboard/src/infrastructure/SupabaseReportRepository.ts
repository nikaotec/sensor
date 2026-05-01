import { supabase } from '../supabase/config';
import type { ReportConfig } from '../domain/entities/ReportConfig';
import type { IReportConfigRepository } from '../domain/repositories';

export class SupabaseReportRepository implements IReportConfigRepository {
    async listByTenant(tenantId: string): Promise<ReportConfig[]> {
        let query = supabase.from('report_configs').select('*');

        if (tenantId !== 'all') {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async save(config: ReportConfig): Promise<void> {
        const { error } = await supabase
            .from('report_configs')
            .upsert({
                ...config,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('report_configs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
