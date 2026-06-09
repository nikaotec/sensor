package com.nikaotech.smartrf.controller;

import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TelemetryController.class)
class TelemetryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeviceStatusRepository deviceStatusRepository;

    @MockBean
    private TelemetryRepository telemetryRepository;
    
    @MockBean
    private com.nikaotech.smartrf.config.MqttGateway mqttGateway;

    @Test
    @DisplayName("Deve retornar o historico ordenado de telemetrias do dispositivo")
    void testGetDeviceHistory() throws Exception {
        // Arrange
        String deviceId = "MAC123";
        Telemetry telemetry = Telemetry.builder()
                .deviceId(deviceId)
                .temperature(24.5f)
                .timestamp(OffsetDateTime.now())
                .build();
        
        List<Telemetry> history = Collections.singletonList(telemetry);
        when(telemetryRepository.findTop100ByDeviceIdOrderByTimestampDesc(deviceId)).thenReturn(history);

        // Act & Assert
        mockMvc.perform(get("/api/devices/{id}/history", deviceId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deviceId").value(deviceId))
                .andExpect(jsonPath("$[0].temperature").value(24.5))
                .andExpect(jsonPath("$.length()").value(1));
    }
}
