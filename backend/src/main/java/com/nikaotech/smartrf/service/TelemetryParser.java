package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.TelemetryMqttPayload;
import java.util.Optional;

public interface TelemetryParser {
    Optional<TelemetryMqttPayload> parse(String rawPayload);
}
