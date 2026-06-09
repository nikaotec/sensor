package com.nikaotech.smartrf.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nikaotech.smartrf.config.MqttGateway;
import com.nikaotech.smartrf.dto.DashboardActionPayload;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TelemetryController.class)
class TelemetryControllerActionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DeviceStatusRepository deviceStatusRepository;

    @MockBean
    private MqttGateway mqttGateway;

    @MockBean
    private com.nikaotech.smartrf.repository.TelemetryRepository telemetryRepository;

    @Test
    @DisplayName("Deve aceitar e encaminhar a ação para o MQTT se o dispositivo existir")
    void testPostActionSuccess() throws Exception {
        String deviceId = "MAC123";
        DashboardActionPayload payload = new DashboardActionPayload();
        payload.setIntencao("ligar_rele");
        payload.setSource("dashboard");

        DeviceStatus device = new DeviceStatus();
        device.setId(deviceId);
        
        when(deviceStatusRepository.findById(deviceId)).thenReturn(Optional.of(device));

        mockMvc.perform(post("/api/devices/{id}/action", deviceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        verify(mqttGateway, times(1)).sendToMqtt(eq("esp32c3/status/action"), anyString());
    }

    @Test
    @DisplayName("Deve retornar 404 se o dispositivo não existir na base de dados de status")
    void testPostActionNotFound() throws Exception {
        String deviceId = "MAC_INEXISTENTE";
        DashboardActionPayload payload = new DashboardActionPayload();
        payload.setIntencao("ligar_rele");

        when(deviceStatusRepository.findById(deviceId)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/devices/{id}/action", deviceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isNotFound());

        verify(mqttGateway, never()).sendToMqtt(anyString(), anyString());
    }
}
