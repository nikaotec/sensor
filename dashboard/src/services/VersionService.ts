/**
 * VersionService — SOLID: Logic for firmware version comparison.
 * Handles semantic versioning strings (e.g., "1.1.7", "v1.2.0").
 */
export class VersionService {
    /**
     * Compares two version strings.
     * @returns 0 if equal, 1 if v1 > v2, -1 if v1 < v2
     */
    static compare(v1: string | undefined, v2: string | undefined): number {
        const cleanV1 = this.cleanVersion(v1);
        const cleanV2 = this.cleanVersion(v2);

        if (!cleanV1 && !cleanV2) return 0;
        if (!cleanV1) return -1;
        if (!cleanV2) return 1;

        const parts1 = cleanV1.split('.').map(Number);
        const parts2 = cleanV2.split('.').map(Number);

        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;

            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }

        return 0;
    }

    /**
     * Checks if a device's current version is up to date relative to the latest.
     * We consider it up to date if current >= latest.
     */
    static isUpToDate(current: string | undefined, latest: string | undefined): boolean {
        if (!current) return false;
        return this.compare(current, latest) >= 0;
    }

    /**
     * Cleans version string (removes 'v', whitespace).
     */
    private static cleanVersion(v: string | undefined): string | null {
        if (!v) return null;
        return v.trim().replace(/^v/i, '');
    }
}
