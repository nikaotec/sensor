---
page: Settings
---
A professional "Settings & Integration" screen for the IoT Dashboard, applying the **Midnight IoT Design System**.

**DESIGN SYSTEM (REQUIRED - FOLLOW EXACTLY):**
# Design System: IoT Design System
**Project ID:** 18018319440039617117

## 1. Visual Theme & Atmosphere
The interface defines a **technical, high-contrast IoT aesthetic**. Balances "Midnight" dark mode (`#221910`).

## 2. Color Palette
*   **Primary Orange** (`#f48c25`) for actions and highlights.
*   **Background Dark** (`#221910`).
*   **Cards** (`#0f172a` / `slate-900`) with `border-slate-800`.

## 3. Typography
*   **Font:** "Inter".

**Page Structure:**
1.  **Sidebar:** Same as Dashboard (Navigation). 
    *   *Note: "Configurações" link should be active.*
2.  **Top Bar:** Title "Configurações do Sistema".
3.  **Content Grid (Tabs or Sections):**
    *   **MQTT Configuration:** Fields for Broker URL, Port, Client ID, Username, and Password (masked). Toggle for SSL/TLS.
    *   **Global Alert Thresholds:** Sliders or inputs for "Critical Temperature", "Low Voltage Warning", "Signal Strength Cutoff".
    *   **Tenant Profile:** Edit name, plan (Basic/Pro/Enterprise display only), and primary color sample.
    *   **Notification Preferences:** Checkboxes for "Email Alerts", "WhatsApp Push", "Weekly Reports".
4.  **Footer:** "Save Changes" button (Primary Orange) and "Discard" button.

**Reference:**
Maintain consistency with `Dashboard.tsx`.
Use `slate-900` for cards.
Ensure inputs look clean and professional (Material Symbols Icons).
