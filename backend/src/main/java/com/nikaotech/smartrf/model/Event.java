package com.nikaotech.smartrf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "device_id", columnDefinition = "text")
    private String deviceId;

    @Column(name = "tenant_id", columnDefinition = "text")
    private String tenantId;

    @Column(name = "type", columnDefinition = "text")
    private String type;

    @Column(name = "msg", columnDefinition = "text")
    private String msg;

    @Column(name = "message", columnDefinition = "text")
    private String message;

    @Column(name = "severity", columnDefinition = "text")
    private String severity; // critical, warning, info

    @Column(name = "value", columnDefinition = "text")
    private String value;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details;

    @Column(name = "user_name", columnDefinition = "text")
    private String userName;

    @Column(name = "user_email", columnDefinition = "text")
    private String userEmail;

    @Column(name = "source", columnDefinition = "text")
    private String source;

    @Column(name = "timestamp")
    private OffsetDateTime timestamp;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = OffsetDateTime.now();
        }
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }
}
