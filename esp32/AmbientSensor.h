#ifndef AMBIENT_SENSOR_H
#define AMBIENT_SENSOR_H

#include <Arduino.h>
#include <DHT.h>

class AmbientSensor {
private:
  DHT _dht;
  float _temperature;
  float _humidity;
  bool _valid;

public:
  AmbientSensor(int pin) : _dht(pin, DHT11) {
    _temperature = 0.0;
    _humidity = 0.0;
    _valid = false;
  }

  void begin() { _dht.begin(); }

  void read() {
    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      _temperature = t;
      _humidity = h;
      _valid = true;
    }
  }

  float getTemperature() { return _temperature; }
  float getHumidity() { return _humidity; }
  bool isValid() { return _valid; }
};

#endif
