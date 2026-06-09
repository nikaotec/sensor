package com.nikaotech.smartrf.repository;

import com.nikaotech.smartrf.model.UserDevice;
import com.nikaotech.smartrf.model.UserDeviceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDevice, UserDeviceId> {
    Optional<UserDevice> findByUserIdAndDeviceId(String userId, String deviceId);
    List<UserDevice> findByUserId(String userId);
    void deleteByUserId(String userId);
}
