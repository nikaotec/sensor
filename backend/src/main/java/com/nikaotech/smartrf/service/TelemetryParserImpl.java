package com.nikaotech.smartrf.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelemetryParserImpl implements TelemetryParser {

    private final ObjectMapper objectMapper;

    @Override
    public Optional<TelemetryMqttPayload> parse(String rawPayload) {
        try {
            TelemetryMqttPayload payload = objectMapper.readValue(rawPayload, TelemetryMqttPayload.class);
            if (payload.getIdDispositivo() == null || payload.getIdDispositivo().trim().isEmpty()) {
                log.warn("Payload MQTT inválido: ID_DISPOSITIVO é obrigatório.");
                return Optional.empty();
            }
            return Optional.of(payload);
        } catch (Exception e) {
            log.warn("Erro ao fazer parse do payload MQTT: {} - JSON: {}", e.getMessage(), rawPayload);
            return Optional.empty();
        }
    }
}
