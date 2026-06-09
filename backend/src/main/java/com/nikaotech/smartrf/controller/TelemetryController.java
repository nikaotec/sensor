package com.nikaotech.smartrf.controller;

import com.nikaotech.smartrf.config.MqttGateway;
import com.nikaotech.smartrf.dto.DashboardActionPayload;
import com.nikaotech.smartrf.dto.TelemetryQueryPayload;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Permite acesso do seu dashboard React
public class TelemetryController {

    private final DeviceStatusRepository deviceStatusRepository;
    private final TelemetryRepository telemetryRepository; // Injetado para prover o histórico (SOLID)
    private final MqttGateway mqttGateway; // Injetado para permitir envio de mensagens MQTT (outbound)
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    // Lista todos os dispositivos cadastrados e seu status atual
    @GetMapping("/devices")
    public ResponseEntity<List<DeviceStatus>> getAllDevices() {
        return ResponseEntity.ok(deviceStatusRepository.findAll());
    }

    // Detalhes de um dispositivo específico por MAC Address
    @GetMapping("/devices/{id}")
    public ResponseEntity<DeviceStatus> getDeviceById(@PathVariable String id) {
        return deviceStatusRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Historico das ultimas 100 telemetrias de um dispositivo para alimentar o grafico
    @GetMapping("/devices/{id}/history")
    public ResponseEntity<List<Telemetry>> getDeviceHistory(@PathVariable String id) {
        List<Telemetry> history = telemetryRepository.findTop100ByDeviceIdOrderByTimestampDesc(id);
        return ResponseEntity.ok(history);
    }

    // Envia uma ação de controle para o dispositivo via MQTT
    @PostMapping("/devices/{id}/action")
    public ResponseEntity<Void> postDeviceAction(@PathVariable String id, @RequestBody DashboardActionPayload actionPayload) {
        // Valida se o dispositivo existe na base de status
        Optional<DeviceStatus> deviceOpt = deviceStatusRepository.findById(id);
        if (deviceOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Garante que o ID do payload está correto
        actionPayload.setId(id);
        actionPayload.setDispositivoId(id);

        try {
            String jsonPayload = objectMapper.writeValueAsString(actionPayload);
            mqttGateway.sendToMqtt("esp32c3/status/action", jsonPayload);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- CRUD de Dispositivos (DeviceStatus) ---
    @PostMapping("/devices")
    public ResponseEntity<DeviceStatus> saveDevice(@RequestBody DeviceStatus device) {
        if (device.getUpdatedAt() == null) {
            device.setUpdatedAt(OffsetDateTime.now());
        }
        return ResponseEntity.ok(deviceStatusRepository.save(device));
    }

    @PutMapping("/devices/{id}")
    public ResponseEntity<DeviceStatus> updateDevice(@PathVariable String id, @RequestBody DeviceStatus deviceDetails) {
        DeviceStatus device = deviceStatusRepository.findById(id)
                .orElseGet(() -> {
                    DeviceStatus d = new DeviceStatus();
                    d.setId(id);
                    d.setStatus("online");
                    return d;
                });

        if (deviceDetails.getName() != null) device.setName(deviceDetails.getName());
        // Permite definir tenant_id como null (para desvincular dispositivo)
        if (deviceDetails.getTenantId() != null) {
            if (deviceDetails.getTenantId().equalsIgnoreCase("null") || deviceDetails.getTenantId().trim().isEmpty()) {
                device.setTenantId(null);
            } else {
                device.setTenantId(deviceDetails.getTenantId());
            }
        }
        if (deviceDetails.getStatus() != null) device.setStatus(deviceDetails.getStatus());
        if (deviceDetails.getLocation() != null) device.setLocation(deviceDetails.getLocation());
        if (deviceDetails.getAlertsPaused() != null) device.setAlertsPaused(deviceDetails.getAlertsPaused());
        if (deviceDetails.getTempMax() != null) device.setTempMax(deviceDetails.getTempMax());
        if (deviceDetails.getTempMin() != null) device.setTempMin(deviceDetails.getTempMin());
        device.setUpdatedAt(OffsetDateTime.now());
        return ResponseEntity.ok(deviceStatusRepository.save(device));
    }

    @DeleteMapping("/devices/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable String id) {
        if (!deviceStatusRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        deviceStatusRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- Consulta Histórica de Telemetria Avançada ---
    @PostMapping("/telemetry/query")
    public ResponseEntity<List<Telemetry>> queryTelemetry(@RequestBody TelemetryQueryPayload payload) {
        if (payload.getDeviceIds() == null || payload.getDeviceIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<Telemetry> list = telemetryRepository.findByDeviceIdInAndTimestampBetweenOrderByTimestampAsc(
                payload.getDeviceIds(), payload.getStart(), payload.getEnd());
        return ResponseEntity.ok(list);
    }
}
