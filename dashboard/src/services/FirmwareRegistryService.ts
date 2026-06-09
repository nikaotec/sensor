// ============================================================
// FirmwareRegistryService — SRP: Manage the firmware library.
// Persists firmware versions in Java REST API with localStorage fallback.
// ============================================================

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
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

export class FirmwareRegistryService {
    private versions: FirmwareVersion[] = [];

    constructor() {
        this.load();
    }

    private async load(): Promise<void> {
        try {
            // Try Java API first
            const response = await fetch(`${API_BASE_URL}/firmwares`);
            if (!response.ok) throw new Error('Falha ao buscar firmwares na API');
            
            const data = await response.json();

            if (data && data.length > 0) {
                this.versions = data.map((row: any) => ({
                    id: row.id,
                    version: row.version,
                    filename: row.filename,
                    hash: row.hash || undefined,
                    description: row.description || undefined,
                    isLatest: row.isLatest || row.is_latest || false,
                    createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now()
                }));
                this.syncLocalStorage();
                return;
            }
        } catch (e) {
            console.warn('[FirmwareRegistryService] Java API unavailable, using localStorage:', e);
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
            // Try Java API first
            const response = await fetch(`${API_BASE_URL}/firmwares`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: newVersion.version,
                    filename: newVersion.filename,
                    hash: newVersion.hash || null,
                    description: newVersion.description || null,
                    isLatest: false
                })
            });

            if (!response.ok) throw new Error('Falha ao registrar firmware na API');

            const data = await response.json();

            this.versions.push({
                id: data.id,
                version: data.version,
                filename: data.filename,
                hash: data.hash || undefined,
                description: data.description || undefined,
                isLatest: data.isLatest || data.is_latest || false,
                createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now()
            });
        } catch (e) {
            console.warn('[FirmwareRegistryService] Java API write failed, using localStorage:', e);
            // Fallback to localStorage
            this.versions.push(newVersion);
        }

        this.syncLocalStorage();
    }

    async removeVersion(id: string): Promise<void> {
        try {
            // Try Java API first
            const response = await fetch(`${API_BASE_URL}/firmwares/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Falha ao excluir firmware na API');
        } catch (e) {
            console.warn('[FirmwareRegistryService] Java API delete failed:', e);
        }

        // Always update local state
        this.versions = this.versions.filter(v => v.id !== id);
        this.syncLocalStorage();
    }

    async setLatest(id: string): Promise<void> {
        try {
            // Try Java API first
            const response = await fetch(`${API_BASE_URL}/firmwares/${id}/latest`, {
                method: 'PUT'
            });
            if (!response.ok) throw new Error('Falha ao definir firmware latest na API');
        } catch (e) {
            console.warn('[FirmwareRegistryService] Java API update failed:', e);
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
