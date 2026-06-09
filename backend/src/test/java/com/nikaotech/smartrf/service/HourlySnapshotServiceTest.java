package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HourlySnapshotServiceTest {

    @Mock
    private DeviceStatusRepository deviceStatusRepository;

    @Mock
    private TelemetryRepository telemetryRepository;

    @InjectMocks
    private HourlySnapshotService hourlySnapshotService;

    @Test
    @DisplayName("Deve ler todos os dispositivos do status e salvar como snapshots de telemetria")
    void testTakeSnapshotSuccess() {
        // Arrange
        DeviceStatus device = DeviceStatus.builder()
                .id("MAC123")
                .name("Sensor Teste")
                .temperature(23.4f)
                .humidity(60.0f)
                .voltage(220.0f)
                .battery(12.6f)
                .signal(-70)
                .tempMax(25.0f)
                .tempMin(15.0f)
                .build();

        when(deviceStatusRepository.findAll()).thenReturn(Collections.singletonList(device));

        // Act
        hourlySnapshotService.takeSnapshot();

        // Assert
        verify(deviceStatusRepository, times(1)).findAll();
        
        ArgumentCaptor<Telemetry> telemetryCaptor = ArgumentCaptor.forClass(Telemetry.class);
        verify(telemetryRepository, times(1)).save(telemetryCaptor.capture());

        Telemetry saved = telemetryCaptor.getValue();
        assertEquals("MAC123", saved.getDeviceId());
        assertEquals(23.4f, saved.getTemperature());
        assertEquals(60.0f, saved.getHumidity());
        assertEquals(220.0f, saved.getVoltage());
        assertEquals(12.6f, saved.getBattery());
        assertEquals(-70, saved.getSignal());
        assertEquals(25.0f, saved.getTempMax());
        assertEquals(15.0f, saved.getTempMin());
        
        // Valida se as strings de fuso horário local estão preenchidas
        assertNotNull(saved.getDataRegistro());
        assertNotNull(saved.getHoraRegistro());
        assertTrue(saved.getDataRegistro().toString().matches("\\d{4}-\\d{2}-\\d{2}"));
        assertTrue(saved.getHoraRegistro().toString().matches("\\d{2}:00(:00)?"));
    }
}
