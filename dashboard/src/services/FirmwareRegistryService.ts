// ============================================================
// FirmwareRegistryService — SRP: Manage the firmware library.
// Persists known firmware versions in localStorage.
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

export class FirmwareRegistryService {
    private versions: FirmwareVersion[] = [];

    constructor() {
        this.load();
    }

    private load(): void {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.versions = JSON.parse(stored);
            } catch (e) {
                console.error('[FirmwareRegistryService] Error parsing storage:', e);
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
            this.save();
        }
    }

    private save(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.versions));
    }

    getVersions(): FirmwareVersion[] {
        return [...this.versions].sort((a, b) => b.createdAt - a.createdAt);
    }

    getLatestVersion(): FirmwareVersion | undefined {
        return this.versions.find(v => v.isLatest);
    }

    addVersion(version: Omit<FirmwareVersion, 'createdAt' | 'isLatest'>): void {
        const newVersion: FirmwareVersion = {
            ...version,
            createdAt: Date.now(),
            isLatest: false
        };
        this.versions.push(newVersion);
        this.save();
    }

    removeVersion(id: string): void {
        this.versions = this.versions.filter(v => v.id !== id);
        this.save();
    }

    setLatest(id: string): void {
        this.versions = this.versions.map(v => ({
            ...v,
            isLatest: v.id === id
        }));
        this.save();
    }
}

// Singleton for app-wide use
export const firmwareRegistryService = new FirmwareRegistryService();
