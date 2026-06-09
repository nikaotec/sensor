package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceStatusRepository extends JpaRepository<DeviceStatus, String> {
    List<DeviceStatus> findByIdIn(List<String> ids);
    List<DeviceStatus> findByTenantIdIn(List<String> tenantIds);
}
