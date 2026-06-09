package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class HourlySnapshotService {

    private final DeviceStatusRepository deviceStatusRepository;
    private final TelemetryRepository telemetryRepository;

    /**
     * Executa a cada hora cheia no fuso horário de São Paulo.
     * Expressão cron: segundo minuto hora dia-mes mes dia-semana
     */
    @Scheduled(cron = "0 0 * * * *", zone = "America/Sao_Paulo")
    @Transactional
    public void takeSnapshot() {
        log.info("Iniciando execução agendada do snapshot de telemetria...");
        OffsetDateTime now = OffsetDateTime.now();
        ZonedDateTime localTime = now.atZoneSameInstant(ZoneId.of("America/Sao_Paulo"));
        java.time.LocalDate dataReg = localTime.toLocalDate();
        java.time.LocalTime horaReg = localTime.toLocalTime().withMinute(0).withSecond(0).withNano(0);

        List<DeviceStatus> devices = deviceStatusRepository.findAll();
        if (devices.isEmpty()) {
            log.info("Nenhum dispositivo encontrado para gerar snapshot.");
            return;
        }

        for (DeviceStatus device : devices) {
            try {
                Telemetry telemetry = Telemetry.builder()
                        .deviceId(device.getId())
                        .temperature(device.getTemperature() != null ? device.getTemperature() : 0.0f)
                        .tempMax(device.getTempMax() != null ? device.getTempMax() : (device.getTemperature() != null ? device.getTemperature() : 0.0f))
                        .tempMin(device.getTempMin() != null ? device.getTempMin() : (device.getTemperature() != null ? device.getTemperature() : 0.0f))
                        .humidity(device.getHumidity() != null ? device.getHumidity() : 0.0f)
                        .voltage(device.getVoltage() != null ? device.getVoltage() : 0.0f)
                        .battery(device.getBattery() != null ? device.getBattery() : 0.0f)
                        .signal(device.getSignal() != null ? device.getSignal() : 0)
                        .timestamp(now)
                        .dataRegistro(dataReg)
                        .horaRegistro(horaReg)
                        .build();

                telemetryRepository.save(telemetry);
                log.debug("Snapshot de telemetria gravado para o dispositivo: {}", device.getId());
            } catch (Exception e) {
                log.error("Erro ao gerar snapshot de telemetria para o dispositivo {}: {}", device.getId(), e.getMessage());
            }
        }
        log.info("Execução agendada do snapshot finalizada. {} snapshots gerados.", devices.size());
    }
}
