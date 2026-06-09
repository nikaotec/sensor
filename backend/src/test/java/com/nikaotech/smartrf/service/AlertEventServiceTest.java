package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.repository.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertEventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private AlertEventServiceImpl alertEventService;

    private TelemetryMqttPayload payload;
    private OffsetDateTime now;

    @BeforeEach
    void setUp() {
        now = OffsetDateTime.now();
        payload = new TelemetryMqttPayload();
        payload.setIdDispositivo("MAC123");
        payload.setDispositivo("Sensor Teste");
        payload.setEmpresa("Nikaotec");
        payload.setTempC(25.5f);
        payload.setVoltagem(220.0f);
        payload.setBateria(12.5f);
        payload.setPorta("FECHADA");
    }

    @Test
    @DisplayName("Deve salvar evento quando for um alerta válido e IS_REPEAT for false")
    void testProcessAlertNotRepeat() {
        // Arrange
        payload.setTipo("ALERTA_TEMP_ALTA");
        payload.setIsRepeat(false);

        // Act
        alertEventService.processAlert(payload, now);

        // Assert
        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertEquals("MAC123", event.getDeviceId());
        assertEquals("ALERTA_TEMP_ALTA", event.getType());
        assertEquals("critical", event.getSeverity());
        assertFalse(event.getMsg().contains("null"));
    }

    @Test
    @DisplayName("Deve ignorar e não salvar o evento se IS_REPEAT for true para evitar spam")
    void testIgnoreAlertWhenRepeatIsTrue() {
        // Arrange
        payload.setTipo("ALERTA_TEMP_ALTA");
        payload.setIsRepeat(true);

        // Act
        alertEventService.processAlert(payload, now);

        // Assert
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    @DisplayName("Deve processar evento com gravidade correspondente ao tipo de alerta")
    void testCorrectSeverityForAlerts() {
        // Arrange & Act (Critical Alerts)
        payload.setTipo("ALERTA_TEMP_ALTA");
        payload.setIsRepeat(false);
        alertEventService.processAlert(payload, now);

        // Assert Critical
        ArgumentCaptor<Event> criticalCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(criticalCaptor.capture());
        assertEquals("critical", criticalCaptor.getValue().getSeverity());

        // Reset Mock
        reset(eventRepository);

        // Arrange & Act (Warning Alerts)
        payload.setTipo("ALERTA_PORTA_ABERTA");
        payload.setIsRepeat(false);
        alertEventService.processAlert(payload, now);

        // Assert Warning
        ArgumentCaptor<Event> warningCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(warningCaptor.capture());
        assertEquals("warning", warningCaptor.getValue().getSeverity());
    }

    @Test
    @DisplayName("Deve salvar evento com gravidade info quando o status for NORMALIZADA")
    void testNormalizedEvent() {
        // Arrange
        payload.setTipo("NORMALIZADA");
        payload.setIsRepeat(false);

        // Act
        alertEventService.processAlert(payload, now);

        // Assert
        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        assertEquals("info", eventCaptor.getValue().getSeverity());
    }
}
