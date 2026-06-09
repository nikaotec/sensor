package com.nikaotech.smartrf.scheduler;

import com.nikaotech.smartrf.model.User;
import com.nikaotech.smartrf.repository.UserRepository;
import com.nikaotech.smartrf.service.DailyReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyReportScheduler {

    private final UserRepository userRepository;
    private final DailyReportService dailyReportService;

    private static final ZoneId ZONE_SP = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Executa a cada minuto. Verifica qual usuário agendou o relatório para o horário atual (HH:mm) em Brasília.
     */
    @Scheduled(cron = "0 * * * * *", zone = "America/Sao_Paulo")
    public void runDailyReports() {
        String currentTime = LocalTime.now(ZONE_SP).format(TIME_FORMATTER);
        log.debug("Verificando se há relatórios diários agendados para o horário: {}", currentTime);

        List<User> users = userRepository.findByDailyReportsEnabledTrueAndDailyReportTime(currentTime);
        if (users.isEmpty()) {
            return;
        }

        log.info("Disparando relatórios diários agendados para o horário: {}. Encontrados {} usuários.", 
                currentTime, users.size());
                
        for (User user : users) {
            try {
                dailyReportService.sendDailyReport(user.getId());
            } catch (Exception e) {
                log.error("Falha ao enviar relatório diário para o usuário {} (ID: {}). Erro: {}", 
                        user.getName(), user.getId(), e.getMessage(), e);
            }
        }
    }
}
