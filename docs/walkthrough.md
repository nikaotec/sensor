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

## Verification Steps
1.  **Upload Firmware**: Compile and upload the new code.
2.  **Check Display**: Verify "Min" and "Max" are fully visible.
3.  **Test Command**: Send dummy command -> `CMD: teste`.
4.  **Test Calibration**: Send calibration -> `Calib. Sucesso: ...`.
5.  **Test Limits**: Send new limits -> Display shows `LIM: 2.5 - 8.0`.
6.  **Test Min Temp**: If starting fresh, Min should match current temp (not 0.0).
