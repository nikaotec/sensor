package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.Telemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TelemetryRepository extends JpaRepository<Telemetry, UUID> {
    // Busca as ultimas 100 telemetrias ordenadas por tempo decrescente (mais recentes primeiro)
    List<Telemetry> findTop100ByDeviceIdOrderByTimestampDesc(String deviceId);

    // Consulta telemetria de múltiplos dispositivos dentro de um intervalo de tempo para relatórios
    List<Telemetry> findByDeviceIdInAndTimestampBetweenOrderByTimestampAsc(
        List<String> deviceIds,
        java.time.OffsetDateTime start,
        java.time.OffsetDateTime end
    );

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM telemetry t WHERE t.device_id = :deviceId " +
           "AND t.timestamp AT TIME ZONE 'America/Sao_Paulo' >= :startInterval " +
           "AND t.timestamp AT TIME ZONE 'America/Sao_Paulo' <= :endInterval " +
           "ORDER BY t.timestamp DESC LIMIT 1", nativeQuery = true)
    java.util.Optional<Telemetry> findLatestTelemetryInLocalInterval(
        @org.springframework.data.repository.query.Param("deviceId") String deviceId,
        @org.springframework.data.repository.query.Param("startInterval") java.time.LocalDateTime startInterval,
        @org.springframework.data.repository.query.Param("endInterval") java.time.LocalDateTime endInterval
    );
}
