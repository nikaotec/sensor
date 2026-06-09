package com.nikaotech.smartrf.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "id", columnDefinition = "text")
    private String id; // Firebase UID

    @Column(name = "name", columnDefinition = "text")
    private String name;

    @Column(name = "email", unique = true, columnDefinition = "text")
    private String email;

    @Column(name = "phone", columnDefinition = "text")
    private String phone;

    @Column(name = "role", columnDefinition = "text")
    private String role; // admin, manager, gestor, user, viewer

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "tenant_ids", columnDefinition = "text[]")
    private List<String> tenantIds;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "allowed_devices", columnDefinition = "text[]")
    private List<String> allowedDevices;

    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "provisioned_by", columnDefinition = "text")
    private String provisionedBy;

    @Column(name = "receive_notifications")
    private Boolean receiveNotifications;

    @Column(name = "daily_reports_enabled")
    private Boolean dailyReportsEnabled;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "daily_report_device_ids", columnDefinition = "text[]")
    private List<String> dailyReportDeviceIds;

    @Column(name = "daily_report_time", columnDefinition = "text")
    private String dailyReportTime;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
