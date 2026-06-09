package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.DashboardActionPayload;
import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardActionServiceImpl implements DashboardActionService {

    private final EventRepository eventRepository;
    private final DeviceStatusRepository deviceStatusRepository;

    @Override
    public void processAction(DashboardActionPayload payload, OffsetDateTime timestamp) {
        String intencao = payload.getIntencao() != null ? payload.getIntencao() : "comando_desconhecido";
        String deviceId = payload.getId() != null ? payload.getId() : (payload.getDispositivoId() != null ? payload.getDispositivoId() : "desconhecido");

        String userName = "Usuário Web";
        String userEmail = "";
        if (payload.getUser() != null) {
            if (payload.getUser().getName() != null && !payload.getUser().getName().trim().isEmpty()) {
                userName = payload.getUser().getName();
            }
            if (payload.getUser().getEmail() != null) {
                userEmail = payload.getUser().getEmail();
            }
        }

        String message = "";
        switch (intencao) {
            case "ligar_rele":
                message = "Relé ligado manualmente";
                break;
            case "desligar_rele":
                message = "Relé desligado manualmente";
                break;
            case "modo_manutencao":
                message = "Modo de Manutenção ATIVADO";
                break;
            case "modo_operacional":
                message = "Modo Operacional ATIVADO";
                break;
            case "configurar_limites":
                message = String.format("Limites atualizados: T.Max(%s), T.Min(%s), V.Max(%s), V.Min(%s), Bat.Min(%s)",
                        payload.getTempMax() != null ? payload.getTempMax().toString() : "-",
                        payload.getTempMin() != null ? payload.getTempMin().toString() : "-",
                        payload.getVoltMax() != null ? payload.getVoltMax().toString() : "-",
                        payload.getVoltMin() != null ? payload.getVoltMin().toString() : "-",
                        payload.getBatMin() != null ? payload.getBatMin().toString() : "-");
                break;
            case "silenciar_alarme":
                message = "Alarme silenciado";
                break;
            case "calibrar_tensao":
                message = String.format("Tensão principal calibrada para %sV",
                        payload.getNovaTensao() != null ? payload.getNovaTensao().toString() : "-");
                break;
            case "calibrar_bateria":
                message = String.format("Bateria calibrada para %sV",
                        payload.getNovaTensao() != null ? payload.getNovaTensao().toString() : "-");
                break;
            default:
                message = String.format("Comando executado: %s", intencao);
        }

        if (userEmail != null && !userEmail.trim().isEmpty()) {
            message += String.format(" (via painel web por %s - %s)", userName, userEmail);
        } else {
            message += String.format(" (via painel web por %s)", userName);
        }

        // Buscar tenant_id do dispositivo se possível
        String tenantId = null;
        try {
            tenantId = deviceStatusRepository.findById(deviceId)
                    .map(DeviceStatus::getTenantId)
                    .orElse(null);
        } catch (Exception e) {
            log.error("Erro ao buscar tenant do dispositivo: {}", deviceId, e);
        }

        Map<String, Object> details = new HashMap<>();
        details.put("intencao", intencao);
        details.put("payload", payload);

        Event event = Event.builder()
                .deviceId(deviceId)
                .tenantId(tenantId)
                .type("info")
                .msg(message)
                .message(message)
                .severity("info")
                .source("dashboard")
                .userName(userName)
                .userEmail(userEmail)
                .details(details)
                .timestamp(timestamp)
                .createdAt(timestamp)
                .build();

        eventRepository.save(event);
        log.info("Novo evento de ação registrado via MQTT para dispositivo: {}. Intencao: {}", deviceId, intencao);
    }
}
