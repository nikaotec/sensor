#ifndef AMBIENT_SENSOR_H
#define AMBIENT_SENSOR_H

#include "../config/Config.h"
#include <Arduino.h>
#include <Wire.h>

class AmbientSensor {
private:
  float _temperature;
  float _humidity;
  bool _valid;
  uint8_t _address;

public:
  AmbientSensor(uint8_t address = AHT10_ADDR) {
    _address = address;
    _temperature = 0.0;
    _humidity = 0.0;
    _valid = false;
  }

  void begin() {
    Wire.beginTransmission(_address);
    Wire.write(0xE1); // Comando de inicialização
    Wire.write(0x08);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(20);
  }

  void read() {
    // Gatilho de medição
    Wire.beginTransmission(_address);
    Wire.write(0xAC);
    Wire.write(0x33);
    Wire.write(0x00);
    Wire.endTransmission();

    delay(80); // Aguarda medição

    Wire.requestFrom(_address, (uint8_t)6);
    if (Wire.available() >= 6) {
      uint8_t data[6];
      for (int i = 0; i < 6; i++) {
        data[i] = Wire.read();
      }

      if (!(data[0] & 0x80)) { // Verifica bit de ocupado (0 = pronto)
        uint32_t humRaw = ((uint32_t)data[1] << 12) | ((uint32_t)data[2] << 4) |
                          (data[3] >> 4);
        _humidity = (float)humRaw * 100.0 / 1048576.0;

        uint32_t tempRaw = ((uint32_t)(data[3] & 0x0F) << 16) |
                           ((uint32_t)data[4] << 8) | data[5];
        _temperature = ((float)tempRaw * 200.0 / 1048576.0) - 50.0;

        _valid = (_temperature > -40 && _temperature < 85);
      }
    }
  }

  float getTemperature() { return _temperature; }
  float getHumidity() { return _humidity; }
  bool isValid() { return _valid; }
};

#endif
