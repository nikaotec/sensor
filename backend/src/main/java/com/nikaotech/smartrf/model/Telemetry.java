package com.nikaotech.smartrf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "telemetry")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Telemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "device_id", nullable = false, columnDefinition = "text")
    private String deviceId;

    @Column(name = "temperature")
    private Float temperature;

    @Column(name = "temp_max")
    private Float tempMax;

    @Column(name = "temp_min")
    private Float tempMin;

    @Column(name = "humidity")
    private Float humidity;

    @Column(name = "battery")
    private Float battery;

    @Column(name = "voltage")
    private Float voltage;

    @Column(name = "signal")
    private Integer signal;

    @Column(name = "timestamp")
    private OffsetDateTime timestamp;

    @Column(name = "data_registro")
    private java.time.LocalDate dataRegistro;

    @Column(name = "hora_registro")
    private java.time.LocalTime horaRegistro;
}
