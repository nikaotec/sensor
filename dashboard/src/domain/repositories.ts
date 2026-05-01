import type { Device } from './entities/Device';
import type { Telemetry } from './entities/Telemetry';
import type { DeviceEvent } from './entities/Event';
import type { User } from './entities/User';
import type { ReportConfig } from './entities/ReportConfig';

export interface IDeviceRepository {
    getById(id: string): Promise<Device | null>;
    listAll(filter?: any): Promise<Device[]>;
    listByTenant(tenantId: string): Promise<Device[]>;
    updateStatus(id: string, status: string): Promise<void>;
}

export interface ITelemetryRepository {
    listByDevice(deviceId: string, startDate: string, endDate: string): Promise<Telemetry[]>;
    save(telemetry: Telemetry): Promise<void>;
}

export interface IEventRepository {
    listAll(limit?: number): Promise<DeviceEvent[]>;
    listByTenant(tenantId: string, limit?: number): Promise<DeviceEvent[]>;
    save(event: DeviceEvent): Promise<void>;
    listByDevice(deviceId: string): Promise<DeviceEvent[]>;
}

export interface IUserRepository {
    listAll(): Promise<User[]>;
    getById(id: string): Promise<User | null>;
    save(user: User): Promise<void>;
    delete(id: string): Promise<void>;
    updateRole(id: string, role: string): Promise<void>;
}

export interface IReportConfigRepository {
    listByTenant(tenantId: string): Promise<ReportConfig[]>;
    save(config: ReportConfig): Promise<void>;
    delete(id: string): Promise<void>;
}
