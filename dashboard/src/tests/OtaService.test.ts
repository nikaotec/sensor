// ============================================================
// OtaService TDD Tests — validates all business rules
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OtaService } from '../services/OtaService';
import type { OtaMqttProgressPayload } from '../types/ota';

const makeMockClient = (connected = true) => ({
    connected,
    publish: vi.fn(),
});

describe('OtaService', () => {
    let service: OtaService;

    beforeEach(() => {
        service = new OtaService();
        vi.clearAllMocks();
    });

    // ──────────────────────────────────────────────
    // publishOtaCommand
    // ──────────────────────────────────────────────

    describe('publishOtaCommand', () => {
        it('publishes to each device topic', () => {
            const client = makeMockClient() as any;
            service.publishOtaCommand(client, ['device-1', 'device-2'], 'https://cdn.com/fw.bin');
            expect(client.publish).toHaveBeenCalledTimes(2);
            expect(client.publish).toHaveBeenCalledWith(
                'devices/device-1/commands',
                expect.stringContaining('"otaupdate"'),
                expect.any(Object)
            );
            expect(client.publish).toHaveBeenCalledWith(
                'devices/device-2/commands',
                expect.stringContaining('"otaupdate"'),
                expect.any(Object)
            );
        });

        it('includes url and hash in payload', () => {
            const client = makeMockClient() as any;
            service.publishOtaCommand(client, ['d1'], 'https://cdn.com/fw.bin', 'abc123');
            const publishedPayload = JSON.parse(client.publish.mock.calls[0][1]);
            expect(publishedPayload.url).toBe('https://cdn.com/fw.bin');
            expect(publishedPayload.hash).toBe('abc123');
            expect(publishedPayload.is_admin).toBe(true);
        });

        it('throws when client is not connected', () => {
            const client = makeMockClient(false) as any;
            expect(() =>
                service.publishOtaCommand(client, ['d1'], 'https://cdn.com/fw.bin')
            ).toThrow('[OtaService] MQTT client not connected');
        });

        it('throws for invalid URL', () => {
            const client = makeMockClient() as any;
            expect(() =>
                service.publishOtaCommand(client, ['d1'], 'ftp://bad.url')
            ).toThrow('[OtaService] Invalid firmware URL');
        });

        it('throws when no devices selected', () => {
            const client = makeMockClient() as any;
            expect(() =>
                service.publishOtaCommand(client, [], 'https://cdn.com/fw.bin')
            ).toThrow('[OtaService] No devices selected');
        });
    });

    // ──────────────────────────────────────────────
    // parseOtaProgress
    // ──────────────────────────────────────────────

    describe('parseOtaProgress', () => {
        it('returns downloading phase for OTA_PROGRESS < 100', () => {
            const payload: OtaMqttProgressPayload = {
                TIPO: 'OTA_PROGRESS',
                ID_DISPOSITIVO: 'dev-1',
                PROGRESSO: 50,
            };
            const result = service.parseOtaProgress(payload);
            expect(result?.phase).toBe('downloading');
            expect(result?.progress).toBe(50);
        });

        it('returns installing phase for OTA_PROGRESS === 100', () => {
            const payload: OtaMqttProgressPayload = {
                TIPO: 'OTA_PROGRESS',
                ID_DISPOSITIVO: 'dev-1',
                PROGRESSO: 100,
            };
            const result = service.parseOtaProgress(payload);
            expect(result?.phase).toBe('installing');
        });

        it('returns success phase for OTA_SUCCESS', () => {
            const payload: OtaMqttProgressPayload = {
                TIPO: 'OTA_SUCCESS',
                ID_DISPOSITIVO: 'dev-1',
                VERSAO: '2.0.1',
            };
            const result = service.parseOtaProgress(payload);
            expect(result?.phase).toBe('success');
            expect(result?.version).toBe('2.0.1');
            expect(result?.progress).toBe(100);
        });

        it('returns error phase for OTA_ERROR', () => {
            const payload: OtaMqttProgressPayload = {
                TIPO: 'OTA_ERROR',
                ID_DISPOSITIVO: 'dev-1',
                ERRO: 'SHA256 mismatch',
            };
            const result = service.parseOtaProgress(payload);
            expect(result?.phase).toBe('error');
            expect(result?.errorMsg).toBe('SHA256 mismatch');
        });

        it('returns null for unrelated payload', () => {
            const payload = { TIPO: 'ALERTA_TEMP', ID_DISPOSITIVO: 'dev-1' } as any;
            expect(service.parseOtaProgress(payload)).toBeNull();
        });
    });
});
