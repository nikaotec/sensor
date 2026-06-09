package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.FirmwareVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FirmwareVersionRepository extends JpaRepository<FirmwareVersion, UUID> {
    List<FirmwareVersion> findAllByOrderByCreatedAtDesc();
    Optional<FirmwareVersion> findByIsLatestTrue();
    List<FirmwareVersion> findByIsLatest(Boolean isLatest);
}
