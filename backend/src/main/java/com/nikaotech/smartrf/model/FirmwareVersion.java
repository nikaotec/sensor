package com.nikaotech.smartrf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "firmware_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirmwareVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "version", nullable = false, length = 20)
    private String version;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Column(name = "hash", length = 64)
    private String hash;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "is_latest")
    private Boolean isLatest;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = OffsetDateTime.now();
        }
        if (this.isLatest == null) {
            this.isLatest = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
