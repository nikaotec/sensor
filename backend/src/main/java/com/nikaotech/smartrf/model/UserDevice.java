package com.nikaotech.smartrf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users_devices")
@IdClass(UserDeviceId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDevice {

    @Id
    @Column(name = "user_id", nullable = false, columnDefinition = "text")
    private String userId;

    @Id
    @Column(name = "device_id", columnDefinition = "text")
    private String deviceId;

    @Column(name = "phone", columnDefinition = "text")
    private String phone;

    @Column(name = "receive_notifications")
    private Boolean receiveNotifications;

}
