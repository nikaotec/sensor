#ifndef BUTTON_MANAGER_H
#define BUTTON_MANAGER_H

#include "../config/Config.h"
#include <Arduino.h>
#include <Wire.h>

enum ButtonEvent {
  BTN_NONE,
  BTN_PRESSED_MENU,
  BTN_PRESSED_UP,
  BTN_PRESSED_DOWN,
  BTN_PRESSED_ENTER
};

class ButtonManager {
private:
  uint8_t _address;
  uint8_t _lastState;
  unsigned long _lastDebounceTime;
  const unsigned long _debounceDelay = 50;

public:
  ButtonManager(uint8_t address = PCF8574_ADDR) {
    _address = address;
    _lastState = 0xFF; // Todos em HIGH (pullup)
    _lastDebounceTime = 0;
  }

  void begin() {
    // Escrita inicial para garantir pullups no PCF8574
    Wire.beginTransmission(_address);
    Wire.write(0xFF); // Todos como entrada (HIGH)
    uint8_t status = Wire.endTransmission();
    Serial.printf("[BTN] PCF8574 init: addr=0x%02X status=%d\n", _address, status);
    
    // Atualiza _lastState com o estado real inicial
    Wire.requestFrom(_address, (uint8_t)1);
    if (Wire.available()) {
      uint8_t val = Wire.read();
      _lastState = val & 0x0F;
      Serial.printf("[BTN] PCF8574 initial: raw=0x%02X masked=0x%02X\n", val, _lastState);
    }
  }

  ButtonEvent checkButtons() {
    static unsigned long lastDebug = 0;
    
    uint8_t available = Wire.requestFrom(_address, (uint8_t)1);
    if (!available) {
      static unsigned long lastWarn = 0;
      if (millis() - lastWarn > 5000) {
        Serial.printf("[BTN] PCF8574 not responding!\n");
        lastWarn = millis();
      }
      return BTN_NONE;
    }

    uint8_t currentState = Wire.read() & 0x0F;
    
    // Debug a cada 3 segundos
    if (millis() - lastDebug > 3000) {
      Serial.printf("[BTN] last=0x%02X curr=0x%02X\n", _lastState, currentState);
      lastDebug = millis();
    }
    
    // Detecta mudança de estado
    if (currentState == _lastState)
      return BTN_NONE;

    // Debounce
    if ((millis() - _lastDebounceTime) < _debounceDelay) {
      return BTN_NONE;
    }
    _lastDebounceTime = millis();

    // Bits que foram de HIGH para LOW
    uint8_t pressed = (_lastState & (~currentState)) & 0x0F;
    Serial.printf("[BTN] CHANGE: last=0x%02X curr=0x%02X pressed=0x%02X\n", _lastState, currentState, pressed);

    // Atualiza estado APÓS detectar
    _lastState = currentState;

    if (pressed & (1 << BTN_MENU)) {
      Serial.println("[BTN] MENU pressed");
      return BTN_PRESSED_MENU;
    }
    if (pressed & (1 << BTN_UP)) {
      Serial.println("[BTN] UP pressed");
      return BTN_PRESSED_UP;
    }
    if (pressed & (1 << BTN_DOWN)) {
      Serial.println("[BTN] DOWN pressed");
      return BTN_PRESSED_DOWN;
    }
    if (pressed & (1 << BTN_ENTER)) {
      Serial.println("[BTN] ENTER pressed");
      return BTN_PRESSED_ENTER;
    }

    return BTN_NONE;
  }
};

#endif
