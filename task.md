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
