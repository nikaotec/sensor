# Task: Standardize Alerts
- [x] Standardize Timezone to America/Sao_Paulo (Across all workflows) <!-- id: 56 -->
- [x] Add Device Name to Dashboard Alerts <!-- id: 57 -->
    - [x] Update Firestore Logger (`n8n_events_logger.json`) <!-- id: 58 -->
    - [x] Update Supabase Actions Logger (`n8n_dashboard_actions_supabase.json`) (Skip, following strict user request for telemetry alerts only) <!-- id: 59 -->


- [x] Implement Static Paging Logic <!-- id: 0 -->
    - [x] Update `DisplayManager.h` with paging variables <!-- id: 1 -->
    - [x] Update `DisplayManager.cpp` to replace scrolling with paging <!-- id: 2 -->
- [x] Verification <!-- id: 3 -->
    - [x] Verify code logic for page switching <!-- id: 4 -->

# Task: Fix Display & Logic Bugs

- [x] Fix Min Temp Display Layout <!-- id: 5 -->
    - [x] Move "Min" labels to X=95 to prevent clipping <!-- id: 6 -->
- [x] Improve Command Feedback <!-- id: 7 -->
    - [x] Add generic feedback for unknown commands in `processarMensagemMqtt` <!-- id: 8 -->
    - [x] Ensure specific commands show confirmation on display <!-- id: 9 -->
- [x] Fix Voltage Calibration <!-- id: 10 -->
    - [x] Add debug prints for voltage factor <!-- id: 11 -->
    - [x] Verify `calibrar_tensao` logic in `esp32.ino` <!-- id: 12 -->

# Task: Debugging Min Temp & Feedback

- [x] Fix Min Temp 0.0 Issue <!-- id: 13 -->
    - [x] Update `StorageManager.cpp` to treat 0.0 as invalid/reset default <!-- id: 14 -->
- [x] Improve Limit Update Feedback <!-- id: 15 -->
    - [x] Show new Min/Max values in `showMessage` when limits change <!-- id: 16 -->

# Task: Calibration by Reference

- [x] Implement Calibration Logic <!-- id: 17 -->
    - [x] Update `esp32.ino` to accept `nova_tensao` <!-- id: 18 -->
    - [x] Implement calculation: `NewFactor = CurrentFactor * (Target / Measured)` <!-- id: 19 -->
    - [x] Update display messages for feedback <!-- id: 20 -->

# Task: Active Voltage Alarm

- [x] Implement Voltage Alarm Logic <!-- id: 21 -->
    - [x] Add repetition timers (`lastMqttVoltAlert`) <!-- id: 22 -->
    - [x] Send specific alerts: `TENSAO_ALTA` / `TENSAO_BAIXA` <!-- id: 23 -->
    - [x] Send `TENSAO_NORMALIZADA` on recovery <!-- id: 24 -->

# Task: Flexible Range Updates

- [x] Implement Partial JSON Updates <!-- id: 25 -->
    - [x] Update `configurar_limites` in `esp32.ino` to support partial keys <!-- id: 26 -->
    - [x] Add specific feedback for partial updates <!-- id: 27 -->

# Task: AI Integration Updates

- [x] Update n8n Workflow (`mqtt receive.json`) <!-- id: 28 -->
    - [x] Update AI Agent Prompt (Add `nova_tensao`, fix `temp_max/min`) <!-- id: 29 -->
    - [x] Update JS Code Nodes to pass new keys <!-- id: 30 -->

# Task: Calibration Validation

- [x] Implement Validation Logic in n8n <!-- id: 31 -->
    - [x] Update `Code in JavaScript1` to return `destination: mqtt` or `whatsapp` <!-- id: 32 -->
    - [x] Add Switch/Reply Logic for missing values <!-- id: 33 -->
# Task: Hourly Logging to Firestore

- [x] Implement Hourly Logging <!-- id: 34 -->
    - [x] Update `esp32.ino` to send hourly periodic data <!-- id: 35 -->
    - [x] Create and fix `n8n_hourly_telemetry.json` for periodic logging and TTL <!-- id: 36 -->
    - [x] Standardize and fix `n8n_mqtt_to_firestore.json` node types and logic <!-- id: 38 -->
    - [/] Verification of TTL logic and workflow imports <!-- id: 37 -->

# Task: Resolve Firebase OAuth2 Error

- [x] Fix n8n Firebase OAuth2 Authorization <!-- id: 39 -->
    - [x] Configure n8n to use Service Account instead of OAuth2 <!-- id: 40 -->
    - [x] Verify Google Cloud Console redirect URIs are no longer a blocker <!-- id: 41 -->

# Task: Fix Environment Errors

- [x] Resolve 'Arduino.h' not found error <!-- id: 42 -->
    - [x] Explain environment configuration to user <!-- id: 43 -->
    - [x] Optimize header includes in `Config.h` <!-- id: 44 -->

# Task: Fix Hourly Telemetry Logging (Supabase)

- [x] Fix n8n_hourly_telemetry_supabase field mapping <!-- id: 45 -->
    - [x] Change TEMP_ATUAL to TEMP_C (correct ESP32 field name) <!-- id: 46 -->
    - [x] Add temp_max and temp_min fields to telemetry insert <!-- id: 47 -->
- [x] Update Supabase schema for temp_max/temp_min <!-- id: 48 -->
    - [x] Add columns to telemetry table in supabase_schema.sql <!-- id: 49 -->
    - [x] Create add_telemetry_columns.sql for existing databases <!-- id: 50 -->
- [x] Fix n8n_mqtt_to_supabase field mapping <!-- id: 51 -->
    - [x] Update devices_status upsert to use TEMP_C, TEMP_MAX, TEMP_MIN <!-- id: 52 -->
    - [x] Update telemetry insert to use correct field names <!-- id: 53 -->
- [x] Verify ESP32 sends correct field names <!-- id: 54 -->
    - [x] ESP32 sends TEMP_C, TEMP_MAX, TEMP_MIN in periodico events <!-- id: 55 -->
