package com.nikaotech.smartrf.service;

import org.springframework.messaging.Message;

public interface TelemetryProcessor {
    void handleMessage(Message<String> message);
}
