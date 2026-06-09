package com.nikaotech.smartrf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryQueryPayload {
    private List<String> deviceIds;
    private OffsetDateTime start;
    private OffsetDateTime end;
}
