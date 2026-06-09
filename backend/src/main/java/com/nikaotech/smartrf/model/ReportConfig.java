package com.nikaotech.smartrf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "report_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "device_id", columnDefinition = "text")
    private String deviceId;

    @Column(name = "type", columnDefinition = "text")
    private String type; // device, company

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "schedule_type", columnDefinition = "text")
    private String scheduleType; // daily, weekly, monthly

    @Column(name = "schedule_time", nullable = false)
    private LocalTime scheduleTime;

    @Column(name = "schedule_day")
    private Integer scheduleDay;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "channels", columnDefinition = "text[]")
    private List<String> channels; // email, whatsapp

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recipients", columnDefinition = "jsonb")
    private Map<String, Object> recipients; // {"emails": [], "phones": []}

    @Column(name = "enabled")
    private Boolean enabled;

    @Column(name = "last_run")
    private OffsetDateTime lastRun;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "created_by", columnDefinition = "text")
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.enabled == null) {
            this.enabled = true;
        }
    }
}
