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
    Wire.write(0xF0); // Pinos 4-7 como entrada (HIGH)
    Wire.endTransmission();
  }

  ButtonEvent checkButtons() {
    Wire.requestFrom(_address, (uint8_t)1);
    if (!Wire.available())
      return BTN_NONE;

    uint8_t currentState = Wire.read();
    // Filtra apenas os bits dos botões (4, 5, 6, 7)
    currentState &= 0xF0;

    // Detecta mudança de estado (borda de descida = botão pressionado)
    if (currentState == _lastState)
      return BTN_NONE;

    // Debounce
    if ((millis() - _lastDebounceTime) < _debounceDelay) {
      return BTN_NONE;
    }
    _lastDebounceTime = millis();

    // Bits que foram de HIGH para LOW (pressionados no PCF8574 pullup = LOW)
    uint8_t pressed = _lastState & (~currentState) & 0xF0;

    // Atualiza estado APÓS detectar
    _lastState = currentState;

    if (pressed & (1 << BTN_MENU))
      return BTN_PRESSED_MENU;
    if (pressed & (1 << BTN_UP))
      return BTN_PRESSED_UP;
    if (pressed & (1 << BTN_DOWN))
      return BTN_PRESSED_DOWN;
    if (pressed & (1 << BTN_ENTER))
      return BTN_PRESSED_ENTER;

    return BTN_NONE;
  }
};

#endif
