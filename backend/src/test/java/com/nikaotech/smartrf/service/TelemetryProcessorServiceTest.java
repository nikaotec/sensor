package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.EventRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.GenericMessage;
import java.util.Optional;
import java.time.OffsetDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TelemetryProcessorServiceTest {

    @Mock
    private TelemetryRepository telemetryRepository;

    @Mock
    private DeviceStatusRepository deviceStatusRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private TelemetryParser telemetryParser;

    @Mock
    private AlertEventService alertEventService;

    @Mock
    private DashboardActionService dashboardActionService;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private TelemetryIntegrationService telemetryIntegrationService;

    private String validPayloadJson;
    private TelemetryMqttPayload validPayloadDto;

    @BeforeEach
    void setUp() {
        validPayloadJson = "{\"TIPO\":\"REALTIME\",\"ID_DISPOSITIVO\":\"TESTMAC123\",\"DISPOSITIVO\":\"Sensor Teste\",\"TEMP_C\":24.5}";
        
        validPayloadDto = new TelemetryMqttPayload();
        validPayloadDto.setTipo("REALTIME");
        validPayloadDto.setIdDispositivo("TESTMAC123");
        validPayloadDto.setDispositivo("Sensor Teste");
        validPayloadDto.setTempC(24.5f);
    }

    @Test
    @DisplayName("Deve processar telemetria válida, salvar histórico e atualizar status do dispositivo")
    void testProcessValidTelemetry() {
        // Arrange
        Message<String> message = new GenericMessage<>(validPayloadJson);
        when(telemetryParser.parse(validPayloadJson)).thenReturn(Optional.of(validPayloadDto));
        when(deviceStatusRepository.findById("TESTMAC123")).thenReturn(Optional.empty());

        // Act
        telemetryIntegrationService.handleMessage(message);

        // Assert
        verify(telemetryRepository, times(1)).save(any(Telemetry.class));
        
        ArgumentCaptor<DeviceStatus> deviceStatusCaptor = ArgumentCaptor.forClass(DeviceStatus.class);
        verify(deviceStatusRepository, times(1)).save(deviceStatusCaptor.capture());
        
        DeviceStatus capturedStatus = deviceStatusCaptor.getValue();
        assertEquals("TESTMAC123", capturedStatus.getId());
        assertEquals("Sensor Teste", capturedStatus.getName());
        assertEquals("online", capturedStatus.getStatus());
        assertEquals(24.5f, capturedStatus.getTemperature());

        // Não deve gerar eventos para telemetria comum
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Deve ignorar e não salvar dados se o payload for inválido ou ilegível")
    void testProcessInvalidTelemetry() {
        // Arrange
        String invalidJson = "invalid-json";
        Message<String> message = new GenericMessage<>(invalidJson);
        when(telemetryParser.parse(invalidJson)).thenReturn(Optional.empty());

        // Act
        telemetryIntegrationService.handleMessage(message);

        // Assert
        verify(telemetryRepository, never()).save(any(Telemetry.class));
        verify(deviceStatusRepository, never()).save(any(DeviceStatus.class));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Deve gerar um evento de alerta crítico se o tipo indicar anomalia de temperatura")
    void testProcessAlertTelemetry() {
        // Arrange
        validPayloadDto.setTipo("ALERTA_TEMP_ALTA");
        validPayloadDto.setTempC(29.5f);
        Message<String> message = new GenericMessage<>(validPayloadJson);
        
        when(telemetryParser.parse(validPayloadJson)).thenReturn(Optional.of(validPayloadDto));
        when(deviceStatusRepository.findById("TESTMAC123")).thenReturn(Optional.empty());

        // Act
        telemetryIntegrationService.handleMessage(message);

        // Assert
        verify(telemetryRepository, times(1)).save(any(Telemetry.class));
        verify(deviceStatusRepository, times(1)).save(any(DeviceStatus.class));
        verify(alertEventService, times(1)).processAlert(eq(validPayloadDto), any(OffsetDateTime.class));
    }
}
