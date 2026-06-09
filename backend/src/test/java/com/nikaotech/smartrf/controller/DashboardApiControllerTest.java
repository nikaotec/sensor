package com.nikaotech.smartrf.controller;

import com.nikaotech.smartrf.model.User;
import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.model.ReportConfig;
import com.nikaotech.smartrf.repository.EventRepository;
import com.nikaotech.smartrf.repository.UserRepository;
import com.nikaotech.smartrf.repository.ReportConfigRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Collections;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardApiController.class)
class DashboardApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventRepository eventRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ReportConfigRepository reportConfigRepository;

    @MockBean
    private com.nikaotech.smartrf.repository.TenantRepository tenantRepository;

    @MockBean
    private com.nikaotech.smartrf.repository.UserDeviceRepository userDeviceRepository;

    @MockBean
    private com.nikaotech.smartrf.repository.FirmwareVersionRepository firmwareVersionRepository;

    @Test
    @DisplayName("Deve listar eventos com sucesso")
    void testGetEvents() throws Exception {
        when(eventRepository.findTop50ByOrderByTimestampDesc()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/events")
                .param("userRole", "manager")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(eventRepository, times(1)).findTop50ByOrderByTimestampDesc();
    }

    @Test
    @DisplayName("Deve listar todos os usuários")
    void testGetUsers() throws Exception {
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(userRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Deve retornar status bad request caso o uuid do report_config seja inválido")
    void testGetReportConfigsInvalidUuid() throws Exception {
        mockMvc.perform(get("/api/reports/configs")
                .param("tenantId", "invalid-uuid")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deve retornar configs de relatórios com sucesso quando tenantId for all")
    void testGetReportConfigsAll() throws Exception {
        when(reportConfigRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/reports/configs")
                .param("tenantId", "all")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(reportConfigRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Deve excluir uma configuração de relatório com sucesso")
    void testDeleteReportConfigSuccess() throws Exception {
        UUID id = UUID.randomUUID();
        when(reportConfigRepository.existsById(id)).thenReturn(true);

        mockMvc.perform(delete("/api/reports/configs/{id}", id)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(reportConfigRepository, times(1)).deleteById(id);
    }
}
