import { describe, it, expect } from 'vitest';
import { VersionService } from '../VersionService';

describe('VersionService', () => {
    describe('compare', () => {
        it('should correctly identify when v1 > v2', () => {
            expect(VersionService.compare('1.2.0', '1.1.0')).toBe(1);
            expect(VersionService.compare('v1.2.0', '1.1.0')).toBe(1);
            expect(VersionService.compare('2.0.0', '1.9.9')).toBe(1);
        });

        it('should correctly identify when v1 < v2', () => {
            expect(VersionService.compare('1.1.0', '1.2.0')).toBe(-1);
            expect(VersionService.compare('v1.1.0', 'v1.2.0')).toBe(-1);
        });

        it('should correctly identify when v1 === v2', () => {
            expect(VersionService.compare('1.2.0', '1.2.0')).toBe(0);
            expect(VersionService.compare('v1.2.0', '1.2.0')).toBe(0);
            expect(VersionService.compare(' 1.2.0 ', 'v1.2.0')).toBe(0);
        });
    });

    describe('isUpToDate', () => {
        it('should return true if current is equal to latest', () => {
            expect(VersionService.isUpToDate('v1.2.0', '1.2.0')).toBe(true);
        });

        it('should return true if current is greater than latest', () => {
            expect(VersionService.isUpToDate('v1.3.0', '1.2.0')).toBe(true);
        });

        it('should return false if current is less than latest', () => {
            expect(VersionService.isUpToDate('1.1.0', 'v1.2.0')).toBe(false);
        });

        it('should return false if current is undefined or empty', () => {
            expect(VersionService.isUpToDate(undefined, '1.2.0')).toBe(false);
            expect(VersionService.isUpToDate('', '1.2.0')).toBe(false);
        });
    });
});
