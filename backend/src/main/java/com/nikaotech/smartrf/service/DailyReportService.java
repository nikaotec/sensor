package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.model.DeviceStatus;
import com.nikaotech.smartrf.model.Telemetry;
import com.nikaotech.smartrf.model.User;
import com.nikaotech.smartrf.repository.DeviceStatusRepository;
import com.nikaotech.smartrf.repository.TelemetryRepository;
import com.nikaotech.smartrf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyReportService {

    private final UserRepository userRepository;
    private final DeviceStatusRepository deviceStatusRepository;
    private final TelemetryRepository telemetryRepository;
    private final EmailService emailService;

    private static final ZoneId ZONE_SP = ZoneId.of("America/Sao_Paulo");

    /**
     * Envia o relatório diário para um usuário específico.
     */
    public void sendDailyReport(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + userId));

        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            log.warn("Usuário {} não possui e-mail cadastrado.", user.getName());
            return;
        }

        // Obtém todos os dispositivos que o usuário tem permissão para visualizar
        List<DeviceStatus> allowedDevices = getDevicesForUser(user);
        
        // Filtra para manter apenas os dispositivos que o usuário selecionou para o relatório
        List<String> selectedDeviceIds = user.getDailyReportDeviceIds();
        List<DeviceStatus> devicesToReport = new ArrayList<>();
        
        if (selectedDeviceIds != null && !selectedDeviceIds.isEmpty()) {
            for (DeviceStatus dev : allowedDevices) {
                if (selectedDeviceIds.contains(dev.getId())) {
                    devicesToReport.add(dev);
                }
            }
        }

        if (devicesToReport.isEmpty()) {
            log.info("Nenhum dispositivo selecionado ou permitido para o relatório diário do usuário {}.", user.getName());
            return;
        }

        // Determina a data de referência (hoje ou ontem) baseado na hora local de envio
        LocalTime nowTime = LocalTime.now(ZONE_SP);
        LocalDate referenceDate = LocalDate.now(ZONE_SP);

        // Se o relatório for disparado antes das 16:05, ainda não temos o registro completo de hoje,
        // então mostramos os dados consolidados do dia anterior (ontem)
        if (nowTime.isBefore(LocalTime.of(16, 5))) {
            referenceDate = referenceDate.minusDays(1);
        }

        String reportHtml = generateReportHtml(user, devicesToReport, referenceDate);
        String subject = "Relatório Diário de Temperatura - " + referenceDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        emailService.sendHtmlEmail(user.getEmail(), subject, reportHtml);
    }

    /**
     * Retorna os dispositivos vinculados ao usuário.
     */
    public List<DeviceStatus> getDevicesForUser(User user) {
        if ("manager".equalsIgnoreCase(user.getRole()) || "gestor".equalsIgnoreCase(user.getRole())) {
            if (user.getTenantIds() != null && !user.getTenantIds().isEmpty()) {
                return deviceStatusRepository.findByTenantIdIn(user.getTenantIds());
            }
            return deviceStatusRepository.findAll();
        } else {
            if (user.getAllowedDevices() == null || user.getAllowedDevices().isEmpty()) {
                return Collections.emptyList();
            }
            return deviceStatusRepository.findByIdIn(user.getAllowedDevices());
        }
    }

    /**
     * Gera o HTML elegante para o relatório.
     */
    private String generateReportHtml(User user, List<DeviceStatus> devices, LocalDate date) {
        LocalDateTime start08 = date.atTime(8, 0, 0);
        LocalDateTime end08 = date.atTime(8, 0, 59);
        LocalDateTime start16 = date.atTime(16, 0, 0);
        LocalDateTime end16 = date.atTime(16, 0, 59);

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
        sb.append("<style>");
        sb.append("body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333; margin: 0; padding: 20px; }");
        sb.append(".container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }");
        sb.append(".header { background: #111827; color: #ffffff; padding: 30px 20px; text-align: center; }");
        sb.append(".header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }");
        sb.append(".header p { margin: 5px 0 0 0; font-size: 14px; color: #9ca3af; }");
        sb.append(".content { padding: 30px 20px; }");
        sb.append(".welcome { font-size: 16px; margin-bottom: 20px; color: #4b5563; }");
        sb.append("table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #ffffff; border-radius: 8px; overflow: hidden; }");
        sb.append("th { background-color: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 12px 15px; font-size: 13px; border-bottom: 2px solid #e5e7eb; }");
        sb.append("td { padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #4b5563; }");
        sb.append("tr:hover { background-color: #f9fafb; }");
        sb.append(".badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; }");
        sb.append(".badge-time { background-color: #dbeafe; color: #1e40af; }");
        sb.append(".footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }");
        sb.append(".temp-value { font-weight: bold; color: #111827; }");
        sb.append("</style></head><body>");

        sb.append("<div class='container'>");
        
        // Header
        sb.append("<div class='header'>");
        sb.append("<h1>Relatório Diário de Temperaturas</h1>");
        sb.append("<p>Medições referentes ao dia ").append(date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("</p>");
        sb.append("</div>");

        // Content
        sb.append("<div class='content'>");
        sb.append("<div class='welcome'>Olá, <strong>").append(user.getName()).append("</strong>. Veja abaixo as temperaturas coletadas às 08:00 e 16:00 para os seus dispositivos selecionados:</div>");

        sb.append("<table>");
        sb.append("<thead><tr>");
        sb.append("<th>Dispositivo / Local</th>");
        sb.append("<th>Horário</th>");
        sb.append("<th>Atual</th>");
        sb.append("<th>Mínima</th>");
        sb.append("<th>Máxima</th>");
        sb.append("</tr></thead>");
        sb.append("<tbody>");

        for (DeviceStatus dev : devices) {
            Optional<Telemetry> tel08 = telemetryRepository.findLatestTelemetryInLocalInterval(dev.getId(), start08, end08);
            Optional<Telemetry> tel16 = telemetryRepository.findLatestTelemetryInLocalInterval(dev.getId(), start16, end16);

            String devName = (dev.getName() != null && !dev.getName().isEmpty()) ? dev.getName() : dev.getId();
            String location = (dev.getLocation() != null && !dev.getLocation().isEmpty()) ? " (" + dev.getLocation() + ")" : "";

            // Linha das 08h
            sb.append("<tr>");
            sb.append("<td rowspan='2' style='vertical-align: middle; font-weight: 600; color: #111827;'>")
                    .append(devName).append("<span style='font-size: 12px; font-weight: normal; color: #6b7280;'>").append(location).append("</span></td>");
            sb.append("<td><span class='badge badge-time'>08:00 - 08:00:59</span></td>");
            formatTelemetryCells(sb, tel08);
            sb.append("</tr>");

            // Linha das 16h
            sb.append("<tr>");
            sb.append("<td><span class='badge badge-time'>16:00 - 16:00:59</span></td>");
            formatTelemetryCells(sb, tel16);
            sb.append("</tr>");
        }

        sb.append("</tbody>");
        sb.append("</table>");
        sb.append("</div>");

        // Footer
        sb.append("<div class='footer'>");
        sb.append("<p>Este relatório foi disparado automaticamente pelo sistema IoT SmartRF.</p>");
        sb.append("<p>Caso deseje alterar o recebimento automático ou os dispositivos incluídos, acesse as Configurações do seu painel.</p>");
        sb.append("</div>");

        sb.append("</div>");
        sb.append("</body></html>");

        return sb.toString();
    }

    private void formatTelemetryCells(StringBuilder sb, Optional<Telemetry> telOpt) {
        if (telOpt.isPresent()) {
            Telemetry t = telOpt.get();
            sb.append("<td><span class='temp-value'>").append(t.getTemperature() != null ? String.format(Locale.US, "%.1f°C", t.getTemperature()) : "-").append("</span></td>");
            sb.append("<td style='color: #2563eb;'>").append(t.getTempMin() != null ? String.format(Locale.US, "%.1f°C", t.getTempMin()) : "-").append("</td>");
            sb.append("<td style='color: #dc2626;'>").append(t.getTempMax() != null ? String.format(Locale.US, "%.1f°C", t.getTempMax()) : "-").append("</td>");
        } else {
            sb.append("<td colspan='3' style='text-align: center; color: #9ca3af; font-style: italic;'>Sem registros neste minuto</td>");
        }
    }
}
