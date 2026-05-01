export interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    receive_notifications: boolean;
    role: 'gestor' | 'manager' | 'admin' | 'user';
    tenant_ids: string[];
    created_at: string;
    updated_at?: string;
    provisioned_by?: string;
}
