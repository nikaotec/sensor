package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    List<Tenant> findByIdIn(List<UUID> ids);
}
