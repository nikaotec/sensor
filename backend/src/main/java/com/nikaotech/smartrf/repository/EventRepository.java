package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findTop50ByOrderByTimestampDesc();
    List<Event> findTop50ByDeviceIdOrderByTimestampDesc(String deviceId);
    List<Event> findTop50ByTenantIdOrderByTimestampDesc(String tenantId);
    List<Event> findTop50ByTenantIdInOrderByTimestampDesc(List<String> tenantIds);
}
