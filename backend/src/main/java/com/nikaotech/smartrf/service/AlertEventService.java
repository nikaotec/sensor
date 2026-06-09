package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import java.time.OffsetDateTime;

public interface AlertEventService {
    void processAlert(TelemetryMqttPayload payload, OffsetDateTime timestamp);
}
