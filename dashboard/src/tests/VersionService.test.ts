import { describe, it, expect } from 'vitest';
import { VersionService } from '../services/VersionService';

describe('VersionService', () => {
    describe('isUpToDate', () => {
        it('returns true when versions are identical', () => {
            expect(VersionService.isUpToDate('1.1.7', '1.1.7')).toBe(true);
        });

        it('returns false when current is older than latest', () => {
            expect(VersionService.isUpToDate('1.1.6', '1.1.7')).toBe(false);
        });

        it('returns true when current is newer than latest (forward compatibility)', () => {
            expect(VersionService.isUpToDate('1.2.0', '1.1.7')).toBe(true);
        });

        it('handles null or undefined current version gracefully', () => {
            expect(VersionService.isUpToDate(undefined, '1.1.7')).toBe(false);
            expect(VersionService.isUpToDate('', '1.1.7')).toBe(false);
        });

        it('handles semantic versioning with multiple digits', () => {
            expect(VersionService.isUpToDate('1.1.10', '1.1.9')).toBe(true);
            expect(VersionService.isUpToDate('1.1.9', '1.1.10')).toBe(false);
        });

        it('ignores leading/trailing whitespace and "v" prefix', () => {
            expect(VersionService.isUpToDate(' v1.1.7 ', '1.1.7')).toBe(true);
            expect(VersionService.isUpToDate('1.1.7', 'v1.1.7')).toBe(true);
        });
    });

    describe('compare', () => {
        it('returns 0 for equal versions', () => {
            expect(VersionService.compare('1.0.0', '1.0.0')).toBe(0);
        });

        it('returns 1 if v1 > v2', () => {
            expect(VersionService.compare('1.0.1', '1.0.0')).toBe(1);
            expect(VersionService.compare('1.1.0', '1.0.9')).toBe(1);
            expect(VersionService.compare('2.0.0', '1.9.9')).toBe(1);
        });

        it('returns -1 if v1 < v2', () => {
            expect(VersionService.compare('1.0.0', '1.0.1')).toBe(-1);
            expect(VersionService.compare('1.0.9', '1.1.0')).toBe(-1);
            expect(VersionService.compare('1.9.9', '2.0.0')).toBe(-1);
        });
    });
});
