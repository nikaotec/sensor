package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.DashboardActionPayload;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardActionServiceTest {

    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private DashboardActionServiceImpl dashboardActionService;

    private DashboardActionPayload payload;
    private OffsetDateTime now;

    @BeforeEach
    void setUp() {
        now = OffsetDateTime.now();
        payload = new DashboardActionPayload();
        payload.setId("MAC123");
        payload.setSource("dashboard");
        
        DashboardActionPayload.User user = new DashboardActionPayload.User();
        user.setName("Antonio Venancio");
        user.setEmail("antonio@example.com");
        payload.setUser(user);
    }

    @Test
    @DisplayName("Deve formatar corretamente a mensagem para ligar_rele")
    void testLigarReleFormat() {
        payload.setIntencao("ligar_rele");

        dashboardActionService.processAction(payload, now);

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertEquals("MAC123", event.getDeviceId());
        assertEquals("info", event.getType());
        assertEquals("info", event.getSeverity());
        assertEquals("dashboard", event.getSource());
        assertEquals("Antonio Venancio", event.getUserName());
        assertEquals("antonio@example.com", event.getUserEmail());
        assertEquals("Relé ligado manualmente (via painel web por Antonio Venancio - antonio@example.com)", event.getMessage());
    }

    @Test
    @DisplayName("Deve formatar corretamente a mensagem para desligar_rele")
    void testDesligarReleFormat() {
        payload.setIntencao("desligar_rele");

        dashboardActionService.processAction(payload, now);

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertTrue(event.getMessage().startsWith("Relé desligado manualmente"));
    }

    @Test
    @DisplayName("Deve formatar corretamente a mensagem para configurar_limites")
    void testConfigurarLimitesFormat() {
        payload.setIntencao("configurar_limites");
        payload.setTempMax(25.5f);
        payload.setTempMin(10.0f);
        payload.setVoltMax(240.0f);
        payload.setVoltMin(200.0f);
        payload.setBatMin(11.5f);

        dashboardActionService.processAction(payload, now);

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertEquals("Limites atualizados: T.Max(25.5), T.Min(10.0), V.Max(240.0), V.Min(200.0), Bat.Min(11.5) (via painel web por Antonio Venancio - antonio@example.com)", event.getMessage());
    }

    @Test
    @DisplayName("Deve formatar corretamente a mensagem para configurar_limites com campos nulos")
    void testConfigurarLimitesFormatWithNulls() {
        payload.setIntencao("configurar_limites");

        dashboardActionService.processAction(payload, now);

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertEquals("Limites atualizados: T.Max(-), T.Min(-), V.Max(-), V.Min(-), Bat.Min(-) (via painel web por Antonio Venancio - antonio@example.com)", event.getMessage());
    }

    @Test
    @DisplayName("Deve formatar corretamente a mensagem para calibrar_tensao")
    void testCalibrarTensaoFormat() {
        payload.setIntencao("calibrar_tensao");
        payload.setNovaTensao(220.0f);

        dashboardActionService.processAction(payload, now);

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        
        Event event = eventCaptor.getValue();
        assertEquals("Tensão principal calibrada para 220.0V (via painel web por Antonio Venancio - antonio@example.com)", event.getMessage());
    }
}
