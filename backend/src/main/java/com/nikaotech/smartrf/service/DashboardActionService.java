package com.nikaotech.smartrf.service;

import com.nikaotech.smartrf.dto.DashboardActionPayload;
import java.time.OffsetDateTime;

public interface DashboardActionService {
    void processAction(DashboardActionPayload payload, OffsetDateTime timestamp);
}
