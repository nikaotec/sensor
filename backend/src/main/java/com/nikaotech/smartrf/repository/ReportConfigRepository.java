package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.ReportConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReportConfigRepository extends JpaRepository<ReportConfig, UUID> {
    List<ReportConfig> findByTenantId(UUID tenantId);
}
