# Task: Improve OLED Display Legibility

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
