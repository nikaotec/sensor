package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertEventServiceImpl implements AlertEventService {

    private final EventRepository eventRepository;
    private final DeviceStatusRepository deviceStatusRepository;

    @Override
    public void processAlert(TelemetryMqttPayload payload, OffsetDateTime timestamp) {
        // Bloqueia gravação se for uma repetição (evita spam na tabela de eventos)
        if (Boolean.TRUE.equals(payload.getIsRepeat())) {
            log.debug("Alerta repetido ignorado (IS_REPEAT: true) para o sensor: {}", payload.getIdDispositivo());
            return;
        }

        String tipo = payload.getTipo();
        if (tipo == null) {
            return;
        }

        // Buscar nome amigável do dispositivo
        String deviceName = payload.getDispositivo() != null ? payload.getDispositivo() : "Dispositivo";
        if (payload.getIdDispositivo() != null) {
            Optional<DeviceStatus> deviceOpt = deviceStatusRepository.findById(payload.getIdDispositivo());
            if (deviceOpt.isPresent() && deviceOpt.get().getName() != null) {
                deviceName = deviceOpt.get().getName();
            }
        }

        String severity = determineSeverity(tipo);
        String formattedMsg = String.format("%s: %s", 
                deviceName, 
                tipo.replace("_", " ").toLowerCase());

        Map<String, Object> details = new HashMap<>();
        details.put("temp", payload.getTempC());
        details.put("volt", payload.getVoltagem());
        details.put("bat", payload.getBateria());
        details.put("porta", payload.getPorta());
        if (payload.getReles() != null) {
            details.put("reles", payload.getReles());
        }

        Event event = Event.builder()
                .deviceId(payload.getIdDispositivo())
                .tenantId(payload.getEmpresa()) // Mapeia a empresa como tenant do evento
                .type(tipo)
                .msg(formattedMsg)
                .message(formattedMsg)
                .severity(severity)
                .value(payload.getTempC() != null ? payload.getTempC().toString() : null)
                .details(details)
                .source("backend-spring")
                .timestamp(timestamp)
                .createdAt(timestamp)
                .build();

        eventRepository.save(event);
        log.info("Novo evento de alerta registrado: {} - Gravidade: {}", tipo, severity);
    }

    private String determineSeverity(String tipo) {
        if (tipo.equals("ALERTA_TEMP_ALTA") || tipo.equals("ALERTA_TEMP_BAIXA") || tipo.equals("ALERTA_FALTA_ENERGIA")) {
            return "critical";
        } else if (tipo.startsWith("ALERTA_")) {
            return "warning";
        }
        return "info"; // NORMALIZADA, etc.
    }
}
