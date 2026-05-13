import { describe, it, expect } from 'vitest';
import { validateReportSelection } from './reportValidation';

describe('reportValidation', () => {
    describe('validateReportSelection', () => {
        it('should fail if privileged and no tenant or device is selected', () => {
            const result = validateReportSelection('', '', true);
            expect(result.isValid).toBe(false);
            expect(result.errors.tenant).toContain('necessário');
            expect(result.errors.device).toContain('Selecione a Empresa');
        });

        it('should fail if privileged, tenant is selected but device is missing', () => {
            const result = validateReportSelection('tenant-1', '', true);
            expect(result.isValid).toBe(false);
            expect(result.errors.tenant).toBeUndefined();
            expect(result.errors.device).toContain('necessário selecionar um Dispositivo');
        });

        it('should fail if not privileged and device is missing', () => {
            const result = validateReportSelection('some-tenant', '', false);
            expect(result.isValid).toBe(false);
            expect(result.errors.tenant).toBeUndefined();
            expect(result.errors.device).toContain('necessário selecionar um Dispositivo');
        });

        it('should be valid if privileged and both are selected', () => {
            const result = validateReportSelection('tenant-1', 'device-1', true);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should be valid if not privileged and device is selected', () => {
            const result = validateReportSelection('', 'device-1', false);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });
    });
});
