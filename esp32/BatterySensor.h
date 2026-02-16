#ifndef BATTERY_SENSOR_H
#define BATTERY_SENSOR_H

#include <Arduino.h>

class BatterySensor {
private:
  int _pin;
  float _calibrationFactor;
  float _voltage;

public:
  BatterySensor(int pin, float calibrationFactor = 1.0) {
    _pin = pin;
    _calibrationFactor = calibrationFactor;
    _voltage = 0.0;
  }

  void begin() { pinMode(_pin, INPUT); }

  float getVoltage() {
    // Simple averaging filter
    long sum = 0;
    int samples = 10;
    for (int i = 0; i < samples; i++) {
      sum += analogRead(_pin);
      delay(2);
    }
    float average = (float)sum / samples;

    // Convert ADC to Voltage (3.3V / 4095) * Calibration
    _voltage = (average * 3.3 / 4095.0) * _calibrationFactor;

    return _voltage;
  }

  void setCalibration(float newFactor) { _calibrationFactor = newFactor; }
};

#endif
