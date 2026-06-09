package com.nikaotech.smartrf.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Entity
@Table(name = "devices_status")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceStatus {

    @Id
    @Column(name = "id", columnDefinition = "text")
    private String id; // MAC Address

    @Column(name = "name", columnDefinition = "text")
    private String name;

    @Column(name = "tenant_id", columnDefinition = "text")
    private String tenantId;

    @Column(name = "status", columnDefinition = "text")
    private String status; // online, offline, warning, error

    @Column(name = "location", columnDefinition = "text")
    private String location;

    @Column(name = "last_seen")
    private OffsetDateTime lastSeen;

    @Column(name = "temperature")
    private Float temperature;

    @Column(name = "humidity")
    private Float humidity;

    @Column(name = "battery")
    private Float battery;

    @Column(name = "voltage")
    private Float voltage;

    @Column(name = "signal")
    private Integer signal;

    @Column(name = "door_open")
    private Boolean doorOpen;

    @Column(name = "temp_max")
    private Float tempMax;

    @Column(name = "temp_min")
    private Float tempMin;

    @Column(name = "temp_ext")
    private Float tempExt;

    @Column(name = "alerts_paused")
    private Boolean alertsPaused;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
