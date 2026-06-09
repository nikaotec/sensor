package com.nikaotech.smartrf.controller;

import com.nikaotech.smartrf.model.Event;
import com.nikaotech.smartrf.model.User;
import com.nikaotech.smartrf.model.ReportConfig;
import com.nikaotech.smartrf.model.Tenant;
import com.nikaotech.smartrf.model.UserDevice;
import com.nikaotech.smartrf.model.FirmwareVersion;
import com.nikaotech.smartrf.repository.EventRepository;
import com.nikaotech.smartrf.repository.UserRepository;
import com.nikaotech.smartrf.repository.ReportConfigRepository;
import com.nikaotech.smartrf.repository.TenantRepository;
import com.nikaotech.smartrf.repository.UserDeviceRepository;
import com.nikaotech.smartrf.repository.FirmwareVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardApiController {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final ReportConfigRepository reportConfigRepository;
    private final TenantRepository tenantRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final FirmwareVersionRepository firmwareVersionRepository;
    private final com.nikaotech.smartrf.service.DailyReportService dailyReportService;

    @GetMapping("/tenants")
    public ResponseEntity<List<Tenant>> getTenants(@RequestParam(required = false) List<String> ids) {
        if (ids != null && !ids.isEmpty()) {
            List<UUID> uuids = ids.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(tenantRepository.findByIdIn(uuids));
        }
        return ResponseEntity.ok(tenantRepository.findAll());
    }

    @GetMapping("/events")
    public ResponseEntity<List<Event>> getEvents(
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String userRole,
            @RequestParam(required = false) List<String> availableTenantIds) {

        boolean isManager = "manager".equalsIgnoreCase(userRole) || "gestor".equalsIgnoreCase(userRole);

        if (deviceId != null && !deviceId.trim().isEmpty()) {
            return ResponseEntity.ok(eventRepository.findTop50ByDeviceIdOrderByTimestampDesc(deviceId));
        } else if (tenantId != null && !tenantId.trim().isEmpty() && !tenantId.equalsIgnoreCase("all")) {
            return ResponseEntity.ok(eventRepository.findTop50ByTenantIdOrderByTimestampDesc(tenantId));
        } else if (isManager) {
            return ResponseEntity.ok(eventRepository.findTop50ByOrderByTimestampDesc());
        } else if (availableTenantIds != null && !availableTenantIds.isEmpty()) {
            return ResponseEntity.ok(eventRepository.findTop50ByTenantIdInOrderByTimestampDesc(availableTenantIds));
        } else {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/reports/configs")
    public ResponseEntity<List<ReportConfig>> getReportConfigs(@RequestParam String tenantId) {
        if (tenantId.equalsIgnoreCase("all")) {
            return ResponseEntity.ok(reportConfigRepository.findAll());
        } else {
            try {
                return ResponseEntity.ok(reportConfigRepository.findByTenantId(UUID.fromString(tenantId)));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
    }

    @PostMapping("/reports/configs")
    public ResponseEntity<ReportConfig> saveReportConfig(@RequestBody ReportConfig config) {
        return ResponseEntity.ok(reportConfigRepository.save(config));
    }

    @DeleteMapping("/reports/configs/{id}")
    public ResponseEntity<Void> deleteReportConfig(@PathVariable UUID id) {
        if (!reportConfigRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        reportConfigRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- CRUD de Empresas (Tenants) ---
    @PostMapping("/tenants")
    public ResponseEntity<Tenant> saveTenant(@RequestBody Tenant tenant) {
        return ResponseEntity.ok(tenantRepository.save(tenant));
    }

    @PutMapping("/tenants/{id}")
    public ResponseEntity<Tenant> updateTenant(@PathVariable UUID id, @RequestBody Tenant tenantDetails) {
        return tenantRepository.findById(id)
                .map(tenant -> {
                    tenant.setName(tenantDetails.getName());
                    if (tenantDetails.getStatus() != null) tenant.setStatus(tenantDetails.getStatus());
                    if (tenantDetails.getPlan() != null) tenant.setPlan(tenantDetails.getPlan());
                    if (tenantDetails.getColors() != null) tenant.setColors(tenantDetails.getColors());
                    return ResponseEntity.ok(tenantRepository.save(tenant));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tenants/{id}")
    public ResponseEntity<Void> deleteTenant(@PathVariable UUID id) {
        if (!tenantRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        tenantRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- CRUD de Usuários (Users) ---
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/users/by-email/{email}")
    public ResponseEntity<User> getUserByEmail(@PathVariable String email) {
        return userRepository.findAll().stream()
                .filter(u -> email.equalsIgnoreCase(u.getEmail()))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users")
    public ResponseEntity<User> saveUser(@RequestBody User user) {
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(OffsetDateTime.now());
        }
        user.setUpdatedAt(OffsetDateTime.now());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User userDetails) {
        return userRepository.findById(id)
                .map(user -> {
                    if (userDetails.getName() != null) user.setName(userDetails.getName());
                    if (userDetails.getEmail() != null) user.setEmail(userDetails.getEmail());
                    if (userDetails.getPhone() != null) {
                        if (userDetails.getPhone().isEmpty() || userDetails.getPhone().equals("null")) {
                            user.setPhone(null);
                        } else {
                            user.setPhone(userDetails.getPhone());
                        }
                    }
                    if (userDetails.getRole() != null) user.setRole(userDetails.getRole());
                    if (userDetails.getTenantIds() != null) user.setTenantIds(userDetails.getTenantIds());
                    if (userDetails.getAllowedDevices() != null) user.setAllowedDevices(userDetails.getAllowedDevices());
                    if (userDetails.getAvatarUrl() != null) user.setAvatarUrl(userDetails.getAvatarUrl());
                    if (userDetails.getReceiveNotifications() != null) user.setReceiveNotifications(userDetails.getReceiveNotifications());
                    if (userDetails.getDailyReportsEnabled() != null) user.setDailyReportsEnabled(userDetails.getDailyReportsEnabled());
                    if (userDetails.getDailyReportDeviceIds() != null) user.setDailyReportDeviceIds(userDetails.getDailyReportDeviceIds());
                    if (userDetails.getDailyReportTime() != null) user.setDailyReportTime(userDetails.getDailyReportTime());
                    user.setUpdatedAt(OffsetDateTime.now());
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/send-daily-report")
    public ResponseEntity<Void> triggerDailyReport(@PathVariable String id) {
        try {
            dailyReportService.sendDailyReport(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- Endpoints de Alertas WhatsApp (UserDevice / users_devices) ---
    @PostMapping("/users-devices")
    public ResponseEntity<UserDevice> saveUserDevice(@RequestBody UserDevice userDevice) {
        // No-op because users_devices is a PostgreSQL view joining users and devices.
        // The frontend already updates the underlying User entity before calling this.
        return ResponseEntity.ok(userDevice);
    }

    @DeleteMapping("/users-devices/user/{userId}")
    public ResponseEntity<Void> deleteUserDevices(@PathVariable String userId) {
        // No-op because users_devices is a view.
        return ResponseEntity.ok().build();
    }

    // --- CRUD de Biblioteca de Firmware (FirmwareVersion) ---
    @GetMapping("/firmwares")
    public ResponseEntity<List<FirmwareVersion>> getFirmwares() {
        return ResponseEntity.ok(firmwareVersionRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/firmwares/latest")
    public ResponseEntity<FirmwareVersion> getLatestFirmware() {
        return firmwareVersionRepository.findByIsLatestTrue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/firmwares")
    public ResponseEntity<FirmwareVersion> saveFirmware(@RequestBody FirmwareVersion firmware) {
        return ResponseEntity.ok(firmwareVersionRepository.save(firmware));
    }

    @PutMapping("/firmwares/{id}/latest")
    @Transactional
    public ResponseEntity<FirmwareVersion> setLatestFirmware(@PathVariable UUID id) {
        return firmwareVersionRepository.findById(id)
                .map(fw -> {
                    List<FirmwareVersion> others = firmwareVersionRepository.findByIsLatest(true);
                    for (FirmwareVersion other : others) {
                        other.setIsLatest(false);
                        firmwareVersionRepository.save(other);
                    }
                    fw.setIsLatest(true);
                    fw.setUpdatedAt(OffsetDateTime.now());
                    return ResponseEntity.ok(firmwareVersionRepository.save(fw));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/firmwares/{id}")
    public ResponseEntity<Void> deleteFirmware(@PathVariable UUID id) {
        if (!firmwareVersionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        firmwareVersionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- Confirmação de Evento/Alerta ---
    @PutMapping("/events/{id}/confirm")
    public ResponseEntity<Event> confirmEvent(@PathVariable UUID id) {
        return eventRepository.findById(id)
                .map(event -> {
                    event.setSeverity("info");
                    return ResponseEntity.ok(eventRepository.save(event));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
