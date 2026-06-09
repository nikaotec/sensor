package com.nikaotech.smartrf.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nikaotech.smartrf.dto.DashboardActionPayload;
import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryIntegrationService implements TelemetryProcessor {

    private final TelemetryRepository telemetryRepository;
    private final DeviceStatusRepository deviceStatusRepository;
    private final TelemetryParser telemetryParser;
    private final AlertEventService alertEventService; // Injeta a abstração de alertas (SOLID)
    private final DashboardActionService dashboardActionService; // Injeta serviço de ações do painel (SOLID)
    private final ObjectMapper objectMapper;

    @Override
    @ServiceActivator(inputChannel = "mqttInputChannel")
    @Transactional
    public void handleMessage(Message<String> message) {
        String payloadString = message.getPayload();
        String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        log.debug("Recebida mensagem MQTT no tópico {}: {}", topic, payloadString);

        OffsetDateTime now = OffsetDateTime.now();

        // Roteamento baseado no tópico
        if (topic != null && topic.equals("esp32c3/status/action")) {
            try {
                DashboardActionPayload actionPayload = objectMapper.readValue(payloadString, DashboardActionPayload.class);
                // Filtro para gravar log somente se vier do dashboard
                if ("dashboard".equals(actionPayload.getSource())) {
                    dashboardActionService.processAction(actionPayload, now);
                }
            } catch (Exception e) {
                log.error("Erro ao processar mensagem de ação MQTT no tópico {}: {}", topic, e.getMessage());
            }
            return;
        }

        // Processamento padrão de Telemetria
        Optional<TelemetryMqttPayload> parsedPayload = telemetryParser.parse(payloadString);
        if (parsedPayload.isEmpty()) {
            return;
        }

        TelemetryMqttPayload payload = parsedPayload.get();

        // Atualização/Criação do Status
        updateDeviceStatus(payload, now);

        // Histórico de Telemetria
        saveTelemetry(payload, now);

        // Processa eventos e alertas delegando para o serviço responsável (DIP/SRP)
        if (payload.getTipo() != null && (payload.getTipo().startsWith("ALERTA_") || "NORMALIZADA".equals(payload.getTipo()))) {
            alertEventService.processAlert(payload, now);
        }
    }

    private void updateDeviceStatus(TelemetryMqttPayload payload, OffsetDateTime now) {
        DeviceStatus deviceStatus = deviceStatusRepository.findById(payload.getIdDispositivo())
                .orElse(DeviceStatus.builder().id(payload.getIdDispositivo()).build());

        if (deviceStatus.getName() == null || deviceStatus.getName().isBlank()) {
            deviceStatus.setName(payload.getDispositivo());
        }
        
        // Atualiza o payload com o nome real (legível) para que o AlertEventService grave o evento com o nome correto
        payload.setDispositivo(deviceStatus.getName());
        
        String currentStatus = "online";
        if (payload.getTipo() != null && payload.getTipo().startsWith("ALERTA_")) {
            currentStatus = "warning";
        }
        deviceStatus.setStatus(currentStatus);
        deviceStatus.setLastSeen(now);
        deviceStatus.setTemperature(payload.getTempC());
        deviceStatus.setHumidity(payload.getUmidade());
        deviceStatus.setBattery(payload.getBateria());
        deviceStatus.setVoltage(payload.getVoltagem());
        deviceStatus.setSignal(payload.getRssi());
        deviceStatus.setDoorOpen("ABERTA".equalsIgnoreCase(payload.getPorta()));
        deviceStatus.setTempMax(payload.getTempMax());
        deviceStatus.setTempMin(payload.getTempMin());
        deviceStatus.setUpdatedAt(now);

        deviceStatusRepository.save(deviceStatus);
    }

    private void saveTelemetry(TelemetryMqttPayload payload, OffsetDateTime now) {
        java.time.ZonedDateTime localTime = now.atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo"));
        java.time.LocalDate dataReg = localTime.toLocalDate();
        java.time.LocalTime horaReg = localTime.toLocalTime().withMinute(0).withSecond(0).withNano(0);

        Telemetry telemetry = Telemetry.builder()
                .deviceId(payload.getIdDispositivo())
                .temperature(payload.getTempC())
                .tempMax(payload.getTempMax())
                .tempMin(payload.getTempMin())
                .humidity(payload.getUmidade())
                .battery(payload.getBateria())
                .voltage(payload.getVoltagem())
                .signal(payload.getRssi())
                .timestamp(now)
                .dataRegistro(dataReg)
                .horaRegistro(horaReg)
                .build();

        telemetryRepository.save(telemetry);
    }
}
