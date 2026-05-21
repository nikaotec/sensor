// ============================================================
// FirmwareRegistryService — SRP: Manage the firmware library.
// Persists firmware versions in Supabase (primary) with localStorage fallback.
// ============================================================

import { supabase } from '../supabase/config';

export interface FirmwareVersion {
    id: string;
    version: string;
    filename: string;
    hash?: string;
    description?: string;
    isLatest?: boolean;
    createdAt: number;
}

const STORAGE_KEY = 'nikaotec_firmware_registry';

export class FirmwareRegistryService {
    private versions: FirmwareVersion[] = [];

    constructor() {
        this.load();
    }

    private async load(): Promise<void> {
        try {
            // Try Supabase first
            const { data, error } = await supabase
                .from('firmware_versions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                this.versions = data.map(row => ({
                    id: row.id,
                    version: row.version,
                    filename: row.filename,
                    hash: row.hash || undefined,
                    description: row.description || undefined,
                    isLatest: row.is_latest,
                    createdAt: new Date(row.created_at).getTime()
                }));
                this.syncLocalStorage();
                return;
            }
        } catch (e) {
            console.warn('[FirmwareRegistryService] Supabase unavailable, using localStorage:', e);
        }

        // Fallback to localStorage
        this.loadFromLocalStorage();
    }

    private loadFromLocalStorage(): void {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.versions = JSON.parse(stored);
            } catch (e) {
                console.error('[FirmwareRegistryService] Error parsing localStorage:', e);
                this.versions = [];
            }
        } else {
            // Seed with initial version if empty
            this.versions = [
                {
                    id: 'v1.1.11',
                    version: '1.1.11',
                    filename: 'firmware_v1.1.11.bin',
                    isLatest: true,
                    createdAt: Date.now()
                }
            ];
            this.syncLocalStorage();
        }
    }

    private syncLocalStorage(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.versions));
    }

    getVersions(): FirmwareVersion[] {
        return [...this.versions].sort((a, b) => b.createdAt - a.createdAt);
    }

    getLatestVersion(): FirmwareVersion | undefined {
        return this.versions.find(v => v.isLatest);
    }

    async addVersion(version: Omit<FirmwareVersion, 'createdAt' | 'isLatest'>): Promise<void> {
        const newVersion: FirmwareVersion = {
            ...version,
            createdAt: Date.now(),
            isLatest: false
        };

        try {
            // Try Supabase first
            const { data, error } = await supabase
                .from('firmware_versions')
                .insert({
                    version: newVersion.version,
                    filename: newVersion.filename,
                    hash: newVersion.hash || null,
                    description: newVersion.description || null,
                    is_latest: false
                })
                .select()
                .single();

            if (error) throw error;

            this.versions.push({
                id: data.id,
                version: data.version,
                filename: data.filename,
                hash: data.hash || undefined,
                description: data.description || undefined,
                isLatest: data.is_latest,
                createdAt: new Date(data.created_at).getTime()
            });
        } catch (e) {
            console.warn('[FirmwareRegistryService] Supabase write failed, using localStorage:', e);
            // Fallback to localStorage
            this.versions.push(newVersion);
        }

        this.syncLocalStorage();
    }

    async removeVersion(id: string): Promise<void> {
        try {
            // Try Supabase first
            const { error } = await supabase
                .from('firmware_versions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (e) {
            console.warn('[FirmwareRegistryService] Supabase delete failed:', e);
        }

        // Always update local state
        this.versions = this.versions.filter(v => v.id !== id);
        this.syncLocalStorage();
    }

    async setLatest(id: string): Promise<void> {
        try {
            // Try Supabase first
            // Set all to false
            await supabase
                .from('firmware_versions')
                .update({ is_latest: false })
                .neq('id', id);

            // Set target to true
            const { error } = await supabase
                .from('firmware_versions')
                .update({ is_latest: true })
                .eq('id', id);

            if (error) throw error;
        } catch (e) {
            console.warn('[FirmwareRegistryService] Supabase update failed:', e);
        }

        // Always update local state
        this.versions = this.versions.map(v => ({
            ...v,
            isLatest: v.id === id
        }));
        this.syncLocalStorage();
    }
}

// Singleton for app-wide use
export const firmwareRegistryService = new FirmwareRegistryService();
