# Site Vision: Real-time Sensor Dashboard
**Stitch Project ID:** 18018319440039617117

## 1. Vision
A professional, high-performance dashboard for monitoring IoT sensor networks. The goal is to provide real-time visibility into device health, connectivity status, and telemetry data (temperature, voltage, signal strength) with a sleek, dark-mode interface that minimizes eye strain and maximizes data density.

## 2. Target Audience
*   Network Administrators
*   Facility Managers
*   IoT Technicians

## 3. Core Features
*   **Live Monitoring:** Real-time data visualization with minimal latency.
*   **Alerting System:** Visual warnings for anomalies (voltage drops, signal loss).
*   **Device Management:** Inventory list with status indicators.
*   **Reporting:** Historical data views and exportable reports.

## 4. Sitemap
*   [x] **Dashboard (Home)** - `Dashboard.tsx`
*   [x] **Login** - `Login.tsx`
*   [x] **Device Inventory** - `DeviceList.tsx`
*   [x] **Reports** - `Reports.tsx`
*   [x] **Settings** - `Settings.tsx`

    *   Configuration for alerts and MQTT integration.
    *   *Reference Screen:* `cae1cad32228458c8e597f4e85a7fbab` (Configurações e Integração MQTT)
*   [ ] **Onboarding** - `onboarding.html` / `Onboarding.tsx`
    *   Wizard for adding new tenants or devices.
    *   *Reference Screen:* `14a890383da34b1a96b049f6eb7838d4` (Onboarding 01: Perfil do Tenant)

## 5. Roadmap
1.  Implement **Dashboard** (High Priority)
2.  Implement **Login** (High Priority)
3.  Implement **Device Inventory**
4.  Implement **Settings**
5.  Implement **Onboarding Flow**

## 6. Creative Freedom
*   Enhance data visualizations with interactive charts (reusable components).
*   Add micro-interactions for row hover states and button clicks.
*   Implement a skeleton loading state for initial data fetch.
