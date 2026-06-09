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
@Table(name = "tenants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "name", nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "status", columnDefinition = "text")
    private String status; // active, inactive

    @Column(name = "plan", columnDefinition = "text")
    private String plan; // pro, basic

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "colors", columnDefinition = "jsonb")
    private Map<String, Object> colors;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = "active";
        }
        if (this.plan == null) {
            this.plan = "pro";
        }
    }
}
