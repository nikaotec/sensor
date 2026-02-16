# Walkthrough: OLED Display & Logic Fixes

I have addressed the reported issues regarding the minimum temperature display, command feedback, and voltage calibration.

## Changes Made

### 1. Fixed "Min Temp" Visibility
- **Problem**: The minimum temperature value was likely being clipped off the screen edge (X=105).
- **Solution**: Adjusted the layout in `DisplayManager.cpp`.
    - Moved labels "Max" and "Min" to **X=75**.
    - Moved values to **X=98** (giving ~30px of space, enough for "-10.5").
    - This ensures the text stays within the 128px limit.

### 2. Improved Command Feedback
- **Problem**: The user wasn't sure if commands were received.
- **Solution**: Added a **Generic Feedback** mechanism in `esp32.ino`.
    - If a command is received via MQTT but doesn't match a specific "known" command (like `ligar_rele`), the display now shows: `CMD: [nome_do_comando]`.
    - This confirms the ESP32 received *something*, even if logic elsewhere failed.

### 3. Fixed Voltage Calibration
- **Problem**: Changing the voltage factor wasn't working.
- **Solution**: Enhanced the parsing logic in `esp32.ino`.
    - Now accepts `novo_fator` as both a **Number** (JSON float) and a **String** (to handle potential serialization differences from n8n).
    - Added Serial Debug prints (`DEBUG: Tentativa Calibracao Fator: ...`) to help diagnosis if it fails again.
    - Added explicit success (`Calib. Sucesso`) and error (`Erro Calib`) messages to the OLED.

### 4. Fixed Min Temp stuck at 0.0
- **Problem**: New or blank EEPROM often reads `0.0` for floats. Since the logic was `current < min`, and `25 < 0` is false, the minimum never updated.
- **Solution**: Updated `StorageManager.cpp`.
    - Added check: `if (data.tempMinRec == 0.0) data.tempMinRec = 100.0;`
    - This forces the system to treat `0.0` as "not set", allowing the first valid reading (e.g., 25°C) to become the new minimum.

### 5. Improved Alarm Limit Feedback
- **Problem**: User wanted to see the new limits when updated via MQTT.
- **Solution**: Updated `esp32.ino` logic.
    - Old: `display.showMessage("Limites Temp Atualizados", ...)`
    - New: `display.showMessage("LIM: " + min + " - " + max, ...)`
    - Example Output: `LIM: 2.5 - 8.0`

### 6. Implemented Reference Calibration (Option A)
- **Problem**: User found it hard to guess the correct "factor" for voltage calibration.
- **Solution**: Added logic to `esp32.ino` to accept `nova_tensao` (Target Voltage).
    - **Logic**: `NewFactor = CurrentFactor * (TargetVoltage / MeasuredVoltage)`
    - **Example**: If reading is 200V but real is 220V, sending `220` will increase the factor by 10%.
    - **Backwards Compatibility**: The old `novo_fator` command still works.

### 7. Implemented Active Voltage Alarm (Option A)
- **Problem**: Voltage out of range (e.g., >245V) was not sending alerts, only internal flags.
- **Solution**: Replicated the Temperature Alarm logic for Voltage in `esp32.ino`.
    - **Trigger**: Voltage >= Max OR Voltage <= Min.
    - **Messages**: `TENSAO_ALTA` or `TENSAO_BAIXA`.
    - **Repetition**: Repeats alert every 2 mins (first 5 times), then every 10 mins.
    - **Recovery**: Sends `TENSAO_NORMALIZADA` when back in range.

## Verification Steps
1.  **Upload Firmware**: Compile and upload.
2.  **Check Display**: Verify "Min/Max" layout is correct.
3.  **Test Limits**: Send limit update -> `LIM: ...`.
4.  **Test Reference Calibration**:
    - Measure real voltage (e.g., 220V).
    - Send MQTT: `{"intencao": "calibrar_tensao", "nova_tensao": 220}`
    - **Display Should Show**: `Calib: 220V (F: 258.5)` (or similar calculated factor).
5.  **Test Manual Calibration**: Send `{"intencao": "calibrar_tensao", "novo_fator": 235}` -> `Calib. Sucesso: 235.0`.
6.  **Test Voltage Alarm**:
    - Simpler way: Set voltage limits very tight (e.g., Min 230V if reading 220V).
    - Observe MQTT: Should receive `TENSAO_BAIXA`.
    - Wait 2 mins: Should receive `ALERTA_REPETITIVO_TENSAO_BAIXA`.
    - Restore limits: Should receive `TENSAO_NORMALIZADA` (and display clears "!!!").

### 8. Flexible Range Updates (Option A + AI Support)
- **Problem**: AI-generated commands might only include one parameter (e.g., just `temp_max`), causing other values to reset if not handled.
- **Solution**: Updated `configurar_limites` to check for the existence of each key (`containsKey`).
- **Feedback**:
    - If only Temp changed: Display shows `LIM T: Min - Max`.
    - If only Volt changed: Display shows `LIM V: Min - Max`.
    - If both changed: Display shows `Limites Atualizados`.

## Verification Steps
1.  **Partial Temp Update**: Send `{"intencao": "configurar_limites", "temp_max": 9.0}`.
    - Verify OLED: `LIM T: 2.5 - 9.0` (assuming Min was 2.5).
    - Verify Voltage settings remained unchanged.
2.  **Partial Volt Update**: Send `{"intencao": "configurar_limites", "volt_min": 200}`.
    - Verify OLED: `LIM V: 200 - 245`.

### 9. AI Integration (n8n Workflow Updated)
- **Problem**: AI Agent was using old keys (`valor_max`) and didn't know about `nova_tensao`.
- **Solution**: Updated `mqtt receive.json` workflow.
    - **AI Prompt**: Added `temp_max`, `volt_min`, `nova_tensao`.
    - **JS Code**: Updated to pass these keys to MQTT.

## Verification Steps
1.  **Test AI via WhatsApp**:
    - **Command**: "Ajuste a temperatura máxima para 9 graus"
    - **Expected**: ESP32 receives `{"temp_max": 9}`, OLED shows `LIM T: ... - 9.0`.
2.  **Test Voltage via WhatsApp**:
    - **Command**: "Mude a tensão mínima para 195"
    - **Expected**: ESP32 receives `{"volt_min": 195}`, OLED shows `LIM V: 195 - ...`.
3.  **Test Calibration via WhatsApp**:
    - **Command**: "Calibrar tensão para 220v"
    - **Expected**: ESP32 receives `{"nova_tensao": 220}`, OLED shows `Calib: 220V (F: ...`.

### 10. Calibration Validation (Interactive Error Handling)
- **Problem**: Typo "calibre a tesao" resulted in `Erro Calib 0.0` because the value was missing.
- **Solution**: Implemented a validation gate in n8n (`Code in JavaScript1` + `Switch`).
    - **Logic**: If intent is `calibrar_tensao` AND value is missing -> Ask user for the value.
    - **Route**: Redirects to WhatsApp (Evolution API) instead of MQTT.

## Verification Steps
1.  **Test Typo/Missing Value**:
    - **Command**: "Calibrar a tesao" (or just "Calibrar tensão")
    - **Expected WhatsApp**: "Entendi que você quer calibrar a tensão, mas qual é o valor de referência? (Ex: 220)"
    - **Expected ESP32**: SILENCE (No "Erro Calib 0.0" on display).
2.  **Test Recovery**:
    - **Command**: "220" (The user replies to the AI - *Note: This requires AI context memory, currently user must re-send full command like "Calibrar para 220")*.
    - **Command (Corrected)**: "Calibrar tesao para 220"
    - **Expected**: Normal calibration success.
