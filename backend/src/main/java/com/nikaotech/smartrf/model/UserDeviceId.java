package com.nikaotech.smartrf.model;

import java.io.Serializable;
import java.util.Objects;

public class UserDeviceId implements Serializable {
    private String userId;
    private String deviceId;

    public UserDeviceId() {
    }

    public UserDeviceId(String userId, String deviceId) {
        this.userId = userId;
        this.deviceId = deviceId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDeviceId that = (UserDeviceId) o;
        return Objects.equals(userId, that.userId) &&
               Objects.equals(deviceId, that.deviceId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, deviceId);
    }
}
